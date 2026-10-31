import connectToDatabase from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Deal from "@/models/Deal";
import Coupon from "@/models/Coupon";
import Banner from "@/models/Banner";
import BlogPost from "@/models/BlogPost";
import StoreBlogPost from "@/models/StoreBlogPost";
import { scoped } from "@/lib/tenant/scope";
import ProductReview from "@/models/ProductReview";
import PriceHistory from "@/models/PriceHistory";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import { asFilter } from "@/lib/utils/query";
import { escapeRegex } from "@/lib/utils/slug";
import { expireStaleOffers } from "@/services/expiry.service";
import type { Json } from "@/types/json";

/**
 * Read-only queries for the public storefront. Everything here returns plain
 * JSON-safe objects and only ever exposes `status: "active"` records — the
 * storefront must never leak drafts or inactive catalogue entries.
 */

/** A reference after `populate()` — an object, not an id. */
export type Ref = { _id: string; name: string; slug: string };

export type PublicAffiliateLink = {
  network: { _id: string; name: string; code: string; logo?: string; commissionPercentage?: number } | null;
  affiliateUrl: string;
  trackingUrl: string;
  externalProductId: string;
  price: number | null;
  isPrimary: boolean;
};

export type PublicProductDetail = {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  images: string[];
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  currency: string;
  rating: number;
  reviewCount: number;
  availability: string;
  updatedAt: string;
  seo?: { title: string; description: string; keywords: string[] } | null;
  category: Ref | null;
  subcategory: Ref | null;
  brand: (Ref & { logo?: string }) | null;
  affiliateLinks: PublicAffiliateLink[];
};

export type PublicReview = {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  authorName: string;
  createdAt: string;
};

export type PublicPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  tags: string[];
  publishedAt: string | null;
  readingMinutes: number;
  seo?: { title: string; description: string; keywords: string[]; ogImage?: string } | null;
  author: { _id: string; name: string } | null;
};

export type PublicCategory = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  seo?: { title: string; description: string; keywords: string[] } | null;
  parent: Ref | null;
};

export type PublicProduct = {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  thumbnail: string;
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  currency: string;
  rating: number;
  reviewCount: number;
  availability: string;
  isFeatured: boolean;
  isTrending: boolean;
  isDealOfTheDay: boolean;
  category?: { name: string; slug: string } | null;
  brand?: { name: string; slug: string } | null;
  networks: { name: string; code: string }[];
};

/** Shared catalogue plus the viewing store's own products; main site (no tenant) sees the shared catalogue only. */
const visibleTo = (tenantId?: string) => (tenantId ? { tenant: { $in: [null, tenantId] } } : {});

const PRODUCT_CARD_FIELDS =
  "name slug shortDescription thumbnail originalPrice salePrice discountPercentage currency rating reviewCount availability isFeatured isTrending isDealOfTheDay category brand affiliateLinks";

/** Serialises a lean Mongo document tree into plain JSON for the client. */
function plain<T>(value: T): Json<T> {
  return JSON.parse(JSON.stringify(value)) as Json<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCard(product: any): PublicProduct {
  return plain({
    ...product,
    _id: String(product._id),
    networks: (product.affiliateLinks ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((link: any) => link.network)
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((network: any) => ({ name: network.name, code: network.code })),
    affiliateLinks: undefined,
  });
}

/** Active products by id, returned in the order of `ids` (owner-chosen order). */
export async function getProductsInOrder(ids: string[], tenantId?: string) {
  if (ids.length === 0) return [];
  await connectToDatabase();
  const items = await Product.find({ _id: { $in: ids }, status: "active", ...visibleTo(tenantId) })
    .select(PRODUCT_CARD_FIELDS)
    .populate({ path: "category", select: "name slug" })
    .populate({ path: "brand", select: "name slug" })
    .populate({ path: "affiliateLinks.network", select: "name code" })
    .lean();
  const byId = new Map(items.map((item) => [String(item._id), item]));
  return ids.flatMap((id) => (byId.has(id) ? [toCard(byId.get(id))] : []));
}

export type ProductQuery = {
  q?: string;
  category?: string;
  brand?: string;
  network?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  sort?: string;
  page?: number;
  limit?: number;
  /** White-label stores: restrict to these categories (already expanded to children). */
  categoryIds?: string[];
  /** White-label stores: also show this store's own products. */
  tenantId?: string;
};

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  popular: { clickCount: -1, viewCount: -1 },
  discount: { discountPercentage: -1 },
  "price-low": { salePrice: 1 },
  "price-high": { salePrice: -1 },
  rating: { rating: -1, reviewCount: -1 },
  newest: { createdAt: -1 },
};

/** Paginated, filterable product search used by /products and /category/[slug]. */
export async function listProducts(query: ProductQuery) {
  await connectToDatabase();

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(48, Math.max(1, query.limit ?? 24));

  const filter: Record<string, unknown> = { status: "active", ...visibleTo(query.tenantId) };

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: regex }, { shortDescription: regex }, { sku: regex }];
  }

  if (query.category) {
    const category = await Category.findOne({ slug: query.category, status: "active" })
      .select("_id")
      .lean();
    if (!category) return { items: [], total: 0, page, limit, totalPages: 1 };

    // Include products filed under any child of this category.
    const children = await Category.find({ parent: category._id }).select("_id").lean();
    const ids = [category._id, ...children.map((child) => child._id)];
    filter.$and = [{ $or: [{ category: { $in: ids } }, { subcategory: { $in: ids } }] }];
  }

  if (query.categoryIds?.length) {
    // The store's own products are always in scope, whatever category they sit in.
    const scope = {
      $or: [
        { category: { $in: query.categoryIds } },
        { subcategory: { $in: query.categoryIds } },
        ...(query.tenantId ? [{ tenant: query.tenantId }] : []),
      ],
    };
    filter.$and = [...((filter.$and as unknown[]) ?? []), scope];
  }

  if (query.brand) {
    const brand = await Brand.findOne({ slug: query.brand, status: "active" }).select("_id").lean();
    if (!brand) return { items: [], total: 0, page, limit, totalPages: 1 };
    filter.brand = brand._id;
  }

  if (query.network) {
    const network = await AffiliateNetwork.findOne({ code: query.network, status: "active" })
      .select("_id")
      .lean();
    if (network) filter["affiliateLinks.network"] = network._id;
  }

  if (query.minPrice || query.maxPrice) {
    filter.salePrice = {
      ...(query.minPrice ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice ? { $lte: query.maxPrice } : {}),
    };
  }

  if (query.minDiscount) filter.discountPercentage = { $gte: query.minDiscount };

  const sort = SORT_MAP[query.sort ?? "popular"] ?? SORT_MAP.popular!;

  const [items, total] = await Promise.all([
    Product.find(asFilter(filter))
      .select(PRODUCT_CARD_FIELDS)
      .populate({ path: "category", select: "name slug" })
      .populate({ path: "brand", select: "name slug" })
      .populate({ path: "affiliateLinks.network", select: "name code" })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(asFilter(filter)),
  ]);

  return {
    items: items.map(toCard),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProductBySlug(slug: string, tenantId?: string) {
  await connectToDatabase();

  const product = await Product.findOne({ slug, status: "active", ...visibleTo(tenantId) })
    .populate({ path: "category", select: "name slug" })
    .populate({ path: "subcategory", select: "name slug" })
    .populate({ path: "brand", select: "name slug logo" })
    .populate({ path: "affiliateLinks.network", select: "name code logo commissionPercentage" })
    .lean();

  if (!product) return null;

  const [history, reviews, related] = await Promise.all([
    PriceHistory.find({ product: product._id })
      .sort({ recordedAt: 1 })
      .limit(120)
      .select("currentPrice recordedAt")
      .lean(),
    ProductReview.find({ product: product._id, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: "active",
      ...visibleTo(tenantId),
    })
      .select(PRODUCT_CARD_FIELDS)
      .populate({ path: "category", select: "name slug" })
      .populate({ path: "brand", select: "name slug" })
      .populate({ path: "affiliateLinks.network", select: "name code" })
      .sort({ clickCount: -1 })
      .limit(8)
      .lean(),
  ]);

  return {
    product: plain({ ...product, _id: String(product._id) }) as unknown as PublicProductDetail,
    history: plain(history) as unknown as { currentPrice: number; recordedAt: string }[],
    reviews: plain(reviews) as unknown as PublicReview[],
    related: related.map(toCard),
  };
}

export async function getHomeData() {
  await connectToDatabase();
  await expireStaleOffers();

  const now = new Date();

  const [banners, categories, dealOfTheDay, featured, trending, biggestDiscounts, deals, coupons, posts] =
    await Promise.all([
      Banner.find({
        status: "active",
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      })
        .sort({ priority: -1 })
        .limit(5)
        .lean(),
      Category.find({ parent: null, status: "active" }).sort({ order: 1 }).limit(12).lean(),
      Product.findOne({ status: "active", isDealOfTheDay: true })
        .select(PRODUCT_CARD_FIELDS)
        .populate({ path: "category", select: "name slug" })
        .populate({ path: "brand", select: "name slug" })
        .populate({ path: "affiliateLinks.network", select: "name code" })
        .sort({ discountPercentage: -1 })
        .lean(),
      Product.find({ status: "active", isFeatured: true })
        .select(PRODUCT_CARD_FIELDS)
        .populate({ path: "category", select: "name slug" })
        .populate({ path: "brand", select: "name slug" })
        .populate({ path: "affiliateLinks.network", select: "name code" })
        .sort({ clickCount: -1 })
        .limit(8)
        .lean(),
      Product.find({ status: "active", isTrending: true })
        .select(PRODUCT_CARD_FIELDS)
        .populate({ path: "category", select: "name slug" })
        .populate({ path: "brand", select: "name slug" })
        .populate({ path: "affiliateLinks.network", select: "name code" })
        .sort({ viewCount: -1 })
        .limit(8)
        .lean(),
      Product.find({ status: "active", discountPercentage: { $gte: 30 } })
        .select(PRODUCT_CARD_FIELDS)
        .populate({ path: "category", select: "name slug" })
        .populate({ path: "brand", select: "name slug" })
        .populate({ path: "affiliateLinks.network", select: "name code" })
        .sort({ discountPercentage: -1 })
        .limit(8)
        .lean(),
      Deal.find({ status: "active", endDate: { $gte: now } })
        .populate({ path: "product", select: "slug thumbnail name" })
        .populate({ path: "affiliateNetwork", select: "name code" })
        .sort({ isFeatured: -1, endDate: 1 })
        .limit(6)
        .lean(),
      Coupon.find({ status: "active", expiryDate: { $gte: now } })
        .populate({ path: "affiliateNetwork", select: "name code" })
        .sort({ isVerified: -1, expiryDate: 1 })
        .limit(6)
        .lean(),
      BlogPost.find({ status: "published" })
        .select("title slug excerpt featuredImage publishedAt readingMinutes")
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean(),
    ]);

  return {
    banners: plain(banners),
    categories: plain(categories),
    dealOfTheDay: dealOfTheDay ? toCard(dealOfTheDay) : null,
    featured: featured.map(toCard),
    trending: trending.map(toCard),
    biggestDiscounts: biggestDiscounts.map(toCard),
    deals: plain(deals),
    coupons: plain(coupons),
    posts: plain(posts),
  };
}

export async function getCategoryBySlug(slug: string) {
  await connectToDatabase();
  const category = await Category.findOne({ slug, status: "active" })
    .populate({ path: "parent", select: "name slug" })
    .lean();
  if (!category) return null;

  const children = await Category.find({ parent: category._id, status: "active" })
    .sort({ order: 1 })
    .lean();

  return {
    category: plain(category) as unknown as PublicCategory,
    children: plain(children) as unknown as PublicCategory[],
  };
}

export async function getBrandBySlug(slug: string) {
  await connectToDatabase();
  const brand = await Brand.findOne({ slug, status: "active" }).lean();
  return brand ? plain(brand) : null;
}

export async function listDeals(page = 1, limit = 24) {
  await connectToDatabase();
  await expireStaleOffers();

  const filter = { status: "active", endDate: { $gte: new Date() } };
  const [items, total] = await Promise.all([
    Deal.find(asFilter(filter))
      .populate({ path: "product", select: "slug thumbnail name salePrice" })
      .populate({ path: "affiliateNetwork", select: "name code" })
      .sort({ isFeatured: -1, endDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Deal.countDocuments(asFilter(filter)),
  ]);

  return {
    items: plain(items),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listCoupons(page = 1, limit = 24) {
  await connectToDatabase();
  await expireStaleOffers();

  const filter = { status: "active", expiryDate: { $gte: new Date() } };
  const [items, total] = await Promise.all([
    Coupon.find(asFilter(filter))
      .populate({ path: "affiliateNetwork", select: "name code" })
      .sort({ isVerified: -1, expiryDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Coupon.countDocuments(asFilter(filter)),
  ]);

  return { items: plain(items), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listPosts(page = 1, limit = 12) {
  await connectToDatabase();

  const filter = { status: "published" };
  const [items, total] = await Promise.all([
    BlogPost.find(asFilter(filter))
      .select("title slug excerpt featuredImage publishedAt readingMinutes tags")
      .populate({ path: "author", select: "name" })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BlogPost.countDocuments(asFilter(filter)),
  ]);

  return { items: plain(items), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getPostBySlug(slug: string) {
  await connectToDatabase();
  const post = await BlogPost.findOne({ slug, status: "published" })
    .populate({ path: "author", select: "name" })
    .lean();
  if (!post) return null;

  const related = await BlogPost.find({ _id: { $ne: post._id }, status: "published" })
    .select("title slug excerpt featuredImage publishedAt readingMinutes")
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean();

  return {
    post: plain(post) as unknown as PublicPost,
    related: plain(related) as unknown as PublicPost[],
  };
}

/** Header navigation: parent categories with their children. */
export async function getNavigation() {
  await connectToDatabase();

  const categories = await Category.find({ status: "active" }).sort({ order: 1 }).lean();
  const parents = categories.filter((category) => !category.parent);

  return plain(
    parents.map((parent) => ({
      _id: String(parent._id),
      name: parent.name,
      slug: parent.slug,
      children: categories
        .filter((category) => String(category.parent) === String(parent._id))
        .map((child) => ({ _id: String(child._id), name: child.name, slug: child.slug })),
    })),
  );
}

/** Slugs for the sitemap. */
export async function getSitemapEntries() {
  await connectToDatabase();

  const [products, categories, brands, posts] = await Promise.all([
    Product.find({ status: "active" }).select("slug updatedAt").lean(),
    Category.find({ status: "active" }).select("slug updatedAt").lean(),
    Brand.find({ status: "active" }).select("slug updatedAt").lean(),
    BlogPost.find({ status: "published" }).select("slug updatedAt").lean(),
  ]);

  return plain({ products, categories, brands, posts });
}

/** A category id plus all of its children; used to turn a store's picks into a product filter. */
export async function expandCategoryIds(ids: string[]) {
  if (ids.length === 0) return [];
  await connectToDatabase();
  const children = await Category.find({ parent: { $in: ids } }).select("_id").lean();
  return [...new Set([...ids, ...children.map((child) => String(child._id))])];
}

export type StoreHomeScope = {
  /** Expanded category ids; empty means the whole catalogue. */
  categoryIds: string[];
  dealOfTheDayId: string | null;
  enabled: string[];
  tenantId: string;
};

/** Home page data for a white-label store, loading only the sections it has switched on. */
export async function getStoreHomeData(scope: StoreHomeScope) {
  await connectToDatabase();
  await expireStaleOffers();

  const now = new Date();
  const wants = (key: string) => scope.enabled.includes(key);
  const inScope = scope.categoryIds.length
    ? {
        $or: [
          { category: { $in: scope.categoryIds } },
          { subcategory: { $in: scope.categoryIds } },
          { tenant: scope.tenantId },
        ],
      }
    : {};

  const cards = (filter: Record<string, unknown>, sort: Record<string, 1 | -1>, limit = 8) =>
    Product.find(asFilter({ status: "active", ...visibleTo(scope.tenantId), ...inScope, ...filter }))
      .select(PRODUCT_CARD_FIELDS)
      .populate({ path: "category", select: "name slug" })
      .populate({ path: "brand", select: "name slug" })
      .populate({ path: "affiliateLinks.network", select: "name code" })
      .sort(sort)
      .limit(limit)
      .lean();

  const none = Promise.resolve([]);

  const [pinned, fallbackDeal, featured, trending, biggest, deals, coupons, posts] = await Promise.all([
    wants("dealOfTheDay") && scope.dealOfTheDayId ? cards({ _id: scope.dealOfTheDayId }, {}, 1) : none,
    // No pinned product: fall back to the best-discounted flagged deal in the store's categories.
    wants("dealOfTheDay") && !scope.dealOfTheDayId ? cards({ isDealOfTheDay: true }, { discountPercentage: -1 }, 1) : none,
    wants("featured") ? cards({ isFeatured: true }, { clickCount: -1 }) : none,
    wants("trending") ? cards({ isTrending: true }, { viewCount: -1 }) : none,
    wants("biggestDiscounts") ? cards({ discountPercentage: { $gte: 30 } }, { discountPercentage: -1 }) : none,
    wants("deals")
      ? Deal.find({ status: "active", endDate: { $gte: now } })
          .populate({ path: "product", select: "slug thumbnail name" })
          .populate({ path: "affiliateNetwork", select: "name code" })
          .sort({ isFeatured: -1, endDate: 1 })
          .limit(6)
          .lean()
      : none,
    wants("coupons")
      ? Coupon.find({ status: "active", expiryDate: { $gte: now } })
          .populate({ path: "affiliateNetwork", select: "name code" })
          .sort({ isVerified: -1, expiryDate: 1 })
          .limit(6)
          .lean()
      : none,
    wants("posts")
      ? scoped(StoreBlogPost, scope.tenantId).find({ status: "published" })
          .select("title slug excerpt featuredImage publishedAt readingMinutes")
          .sort({ publishedAt: -1 })
          .limit(3)
          .lean()
      : none,
  ]);

  const dealProduct = pinned[0] ?? fallbackDeal[0];

  return {
    dealOfTheDay: dealProduct ? toCard(dealProduct) : null,
    featured: featured.map(toCard),
    trending: trending.map(toCard),
    biggestDiscounts: biggest.map(toCard),
    deals: plain(deals),
    coupons: plain(coupons),
    posts: plain(posts),
  };
}

export async function listStorePosts(tenantId: string, page = 1, limit = 12) {
  await connectToDatabase();
  const posts = scoped(StoreBlogPost, tenantId);
  const filter = { status: "published" as const };
  const [items, total] = await Promise.all([
    posts
      .find(filter)
      .select("title slug excerpt featuredImage publishedAt readingMinutes")
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    posts.countDocuments(filter),
  ]);
  return { items: plain(items), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getStorePost(tenantId: string, slug: string) {
  await connectToDatabase();
  const post = await scoped(StoreBlogPost, tenantId).findOne({ slug, status: "published" }).lean();
  return post ? plain(post) : null;
}

/** Whether a product belongs to the store's chosen categories (always true when none are chosen). */
export async function isProductInScope(slug: string, categoryIds: string[], tenantId?: string) {
  await connectToDatabase();
  const product = await Product.findOne({
    slug,
    status: "active",
    ...visibleTo(tenantId),
    ...(categoryIds.length
      ? {
          $or: [
            { category: { $in: categoryIds } },
            { subcategory: { $in: categoryIds } },
            ...(tenantId ? [{ tenant: tenantId }] : []),
          ],
        }
      : {}),
  })
    .select("_id")
    .lean();
  return Boolean(product);
}

/** URLs a white-label store can put in its sitemap; products only when the SEO policy allows them. */
export async function getStoreSitemapEntries(tenantId: string, categoryIds: string[], includeProducts: boolean) {
  await connectToDatabase();
  const inScope = categoryIds.length
    ? { $or: [{ category: { $in: categoryIds } }, { subcategory: { $in: categoryIds } }, { tenant: tenantId }] }
    : {};

  const [products, categories, posts] = await Promise.all([
    includeProducts
      ? Product.find(asFilter({ status: "active", ...visibleTo(tenantId), ...inScope })).select("slug updatedAt").limit(5000).lean()
      : Promise.resolve([]),
    Category.find(asFilter({ status: "active", ...(categoryIds.length ? { _id: { $in: categoryIds } } : {}) }))
      .select("slug updatedAt")
      .lean(),
    scoped(StoreBlogPost, tenantId).find({ status: "published" }).select("slug updatedAt").lean(),
  ]);

  return plain({ products, categories, posts });
}
