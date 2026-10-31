import crypto from "node:crypto";

import { slugify } from "@/lib/utils/slug";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import Category from "@/models/Category";
import Product from "@/models/Product";

/**
 * Products a store owner adds themselves. They live in the Product collection
 * with `tenant` set; the model's query hooks keep them off the main site.
 * (No `server-only` import so the seed scripts can use this too.)
 */

const OWN_NETWORK_CODE = "store-link";

/** One shared "network" that stands for "the owner's own link", created on first use. */
async function ownNetworkId() {
  const existing = await AffiliateNetwork.findOne({ code: OWN_NETWORK_CODE }).select("_id").lean();
  if (existing) return existing._id;
  const created = await AffiliateNetwork.findOneAndUpdate(
    { code: OWN_NETWORK_CODE },
    { $setOnInsert: { name: "Store link", code: OWN_NETWORK_CODE, commissionPercentage: 0, status: "active" } },
    { upsert: true, returnDocument: "after" },
  );
  return created._id;
}

const uniqueSlug = (name: string) => `${slugify(name) || "product"}-${crypto.randomBytes(3).toString("hex")}`;

export type OwnProductInput = {
  name: string;
  shortDescription: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  image: string;
  affiliateUrl: string;
  availability: "in-stock" | "out-of-stock" | "limited" | "pre-order";
  status: "active" | "inactive";
};

export async function buildOwnProductFields(input: OwnProductInput) {
  return {
    name: input.name,
    shortDescription: input.shortDescription,
    category: input.category,
    originalPrice: input.originalPrice,
    salePrice: input.salePrice,
    thumbnail: input.image,
    images: input.image ? [input.image] : [],
    availability: input.availability,
    status: input.status,
    affiliateLinks: [{ network: await ownNetworkId(), affiliateUrl: input.affiliateUrl, isPrimary: true }],
  };
}

export async function createOwnProduct(tenantId: string, input: OwnProductInput, extra: { isSample?: boolean } = {}) {
  return Product.create({
    ...(await buildOwnProductFields(input)),
    slug: uniqueSlug(input.name),
    tenant: tenantId,
    isSample: extra.isSample ?? false,
  });
}

const SAMPLES = [
  { name: "Sample: Wireless Bluetooth Headphones", price: [2999, 1499], note: "Replace with your own product" },
  { name: "Sample: Smart Fitness Band", price: [3499, 1799], note: "Replace with your own product" },
  { name: "Sample: Stainless Steel Water Bottle", price: [999, 549], note: "Replace with your own product" },
  { name: "Sample: Ergonomic Laptop Stand", price: [1999, 999], note: "Replace with your own product" },
  { name: "Sample: Portable Power Bank 20000mAh", price: [2499, 1299], note: "Replace with your own product" },
  { name: "Sample: LED Desk Lamp", price: [1499, 799], note: "Replace with your own product" },
];

/** Gives a brand-new store a few dummy products so it never looks empty. Safe to call more than once. */
export async function seedSampleProducts(tenantId: string) {
  if (await Product.exists({ tenant: tenantId })) return 0;

  let category = await Category.findOne({ status: "active" }).sort({ order: 1 }).select("_id").lean();
  if (!category) {
    category = await Category.findOneAndUpdate(
      { slug: "general" },
      { $setOnInsert: { name: "General", slug: "general", status: "active" } },
      { upsert: true, returnDocument: "after" },
    );
  }

  for (const [index, sample] of SAMPLES.entries()) {
    await createOwnProduct(
      tenantId,
      {
        name: sample.name,
        shortDescription: sample.note,
        category: String(category!._id),
        originalPrice: sample.price[0]!,
        salePrice: sample.price[1]!,
        image: `https://picsum.photos/seed/${tenantId.slice(-6)}-${index}/600/600`,
        affiliateUrl: "https://example.com/replace-with-your-affiliate-link",
        availability: "in-stock",
        status: "active",
      },
      { isSample: true },
    );
  }
  return SAMPLES.length;
}
