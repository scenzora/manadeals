import { Types } from "mongoose";

import Product from "@/models/Product";
import PriceHistory from "@/models/PriceHistory";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import { slugify } from "@/lib/utils/slug";
import { calculateDiscountPercentage } from "@/lib/utils/format";
import type { ProductImportRow } from "@/lib/validations/catalogue";

/** Ensures a slug is unique by appending -2, -3 … when needed. */
export async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base);
  let candidate = root;
  let suffix = 1;

  while (true) {
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
    const exists = await Product.exists(filter);
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

/**
 * Records a price change and keeps the product's lowest/highest markers in
 * sync. Called by the price-tracking module and, later, by the automated
 * price-update service.
 */
export async function recordPriceChange(input: {
  productId: string;
  currentPrice: number;
  affiliateNetwork?: string | null;
  source?: "manual" | "api" | "scraper";
}) {
  const product = await Product.findById(input.productId);
  if (!product) return null;

  const previousPrice = product.salePrice;
  const priceChange = input.currentPrice - previousPrice;

  product.salePrice = input.currentPrice;
  product.discountPercentage = calculateDiscountPercentage(product.originalPrice, input.currentPrice);
  product.lowestPrice =
    product.lowestPrice == null ? input.currentPrice : Math.min(product.lowestPrice, input.currentPrice);
  product.highestPrice =
    product.highestPrice == null ? input.currentPrice : Math.max(product.highestPrice, input.currentPrice);
  await product.save();

  const entry = await PriceHistory.create({
    product: product._id,
    affiliateNetwork: input.affiliateNetwork || null,
    previousPrice,
    currentPrice: input.currentPrice,
    priceChange,
    changePercentage: previousPrice
      ? Number(((priceChange / previousPrice) * 100).toFixed(2))
      : 0,
    currency: product.currency,
    source: input.source ?? "manual",
  });

  return { product, entry };
}

export type ImportPreviewRow = {
  index: number;
  name: string;
  status: "new" | "duplicate" | "invalid";
  message?: string;
  categoryResolved?: string;
  brandResolved?: string;
  networkResolved?: string;
  discountPercentage?: number;
};

/**
 * Dry-run of a CSV import: resolves category/brand/network names to ids and
 * flags duplicates so the admin can review before anything is written.
 */
export async function previewImport(rows: ProductImportRow[]): Promise<ImportPreviewRow[]> {
  const [categories, brands, networks] = await Promise.all([
    Category.find({}).select("name slug").lean(),
    Brand.find({}).select("name slug").lean(),
    AffiliateNetwork.find({}).select("name code").lean(),
  ]);

  const categoryByKey = new Map(categories.flatMap((c) => [[c.name.toLowerCase(), c], [c.slug, c]] as const));
  const brandByKey = new Map(brands.flatMap((b) => [[b.name.toLowerCase(), b], [b.slug, b]] as const));
  const networkByKey = new Map(
    networks.flatMap((n) => [[n.name.toLowerCase(), n], [n.code, n]] as const),
  );

  const slugs = rows.map((row) => slugify(row.name));
  const existing = await Product.find({ slug: { $in: slugs } }).select("slug").lean();
  const existingSlugs = new Set(existing.map((product) => product.slug));

  return rows.map((row, index) => {
    const category = categoryByKey.get(row.category.toLowerCase().trim());
    const brand = row.brand ? brandByKey.get(row.brand.toLowerCase().trim()) : undefined;
    const network = networkByKey.get(row.affiliateNetwork.toLowerCase().trim());
    const slug = slugify(row.name);

    if (!category) {
      return { index, name: row.name, status: "invalid", message: `Unknown category "${row.category}"` };
    }
    if (!network) {
      return {
        index,
        name: row.name,
        status: "invalid",
        message: `Unknown affiliate network "${row.affiliateNetwork}"`,
      };
    }
    if (row.salePrice > row.originalPrice) {
      return { index, name: row.name, status: "invalid", message: "Sale price exceeds original price" };
    }

    return {
      index,
      name: row.name,
      status: existingSlugs.has(slug) ? "duplicate" : "new",
      message: existingSlugs.has(slug) ? "A product with this slug already exists" : undefined,
      categoryResolved: category.name,
      brandResolved: brand?.name,
      networkResolved: network.name,
      discountPercentage: calculateDiscountPercentage(row.originalPrice, row.salePrice),
    };
  });
}

/** Commits an import, skipping duplicates and invalid rows. */
export async function runImport(
  rows: ProductImportRow[],
  options: { skipDuplicates: boolean; adminId: string },
) {
  const preview = await previewImport(rows);
  const [categories, brands, networks] = await Promise.all([
    Category.find({}).select("name slug").lean(),
    Brand.find({}).select("name slug").lean(),
    AffiliateNetwork.find({}).select("name code").lean(),
  ]);

  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b]));
  const networkByName = new Map(networks.map((n) => [n.name.toLowerCase(), n]));

  let created = 0;
  let skipped = 0;
  const errors: { index: number; message: string }[] = [];

  for (const entry of preview) {
    const row = rows[entry.index]!;

    if (entry.status === "invalid") {
      errors.push({ index: entry.index, message: entry.message ?? "Invalid row" });
      continue;
    }
    if (entry.status === "duplicate" && options.skipDuplicates) {
      skipped += 1;
      continue;
    }

    const category = categoryByName.get((entry.categoryResolved ?? "").toLowerCase());
    const brand = entry.brandResolved ? brandByName.get(entry.brandResolved.toLowerCase()) : null;
    const network = networkByName.get((entry.networkResolved ?? "").toLowerCase());
    if (!category || !network) {
      errors.push({ index: entry.index, message: "Could not resolve category or network" });
      continue;
    }

    try {
      await Product.create({
        name: row.name,
        slug: await uniqueSlug(row.name),
        shortDescription: row.description.slice(0, 300),
        description: row.description,
        category: category._id,
        brand: brand?._id ?? null,
        thumbnail: row.imageUrl,
        images: row.imageUrl ? [row.imageUrl] : [],
        originalPrice: row.originalPrice,
        salePrice: row.salePrice,
        currency: "INR",
        affiliateLinks: [
          { network: network._id, affiliateUrl: row.affiliateUrl, isPrimary: true, price: row.salePrice },
        ],
        rating: row.rating,
        reviewCount: row.reviewCount,
        status: row.status,
        createdBy: options.adminId,
        updatedBy: options.adminId,
      });
      created += 1;
    } catch (error) {
      errors.push({
        index: entry.index,
        message: error instanceof Error ? error.message : "Failed to insert",
      });
    }
  }

  return { created, skipped, errors, total: rows.length };
}
