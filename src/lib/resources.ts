import Banner from "@/models/Banner";
import BlogPost from "@/models/BlogPost";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import Coupon from "@/models/Coupon";
import Deal from "@/models/Deal";
import ProductReview from "@/models/ProductReview";
import WikiPage from "@/models/WikiPage";
import {
  affiliateNetworkSchema,
  brandSchema,
  categorySchema,
} from "@/lib/validations/catalogue";
import {
  bannerSchema,
  blogPostSchema,
  couponSchema,
  dealSchema,
  productReviewSchema,
} from "@/lib/validations/marketing";
import { wikiPageSchema } from "@/lib/validations/wiki";
import type { CrudConfig } from "@/lib/crud";

/**
 * Declarative CRUD configuration per resource. Route files stay one-liners and
 * every module gets identical pagination, filtering, validation and auditing.
 */

export const categoryResource: CrudConfig<typeof categorySchema> = {
  model: Category,
  module: "categories",
  label: "category",
  schema: categorySchema,
  searchFields: ["name", "slug"],
  filterFields: ["status", "parent", "isFeatured"],
  populate: [{ path: "parent", select: "name slug" }],
  defaultSort: "order",
};

export const brandResource: CrudConfig<typeof brandSchema> = {
  model: Brand,
  module: "brands",
  label: "brand",
  schema: brandSchema,
  searchFields: ["name", "slug"],
  filterFields: ["status"],
  defaultSort: "name",
};

export const affiliateNetworkResource: CrudConfig<typeof affiliateNetworkSchema> = {
  model: AffiliateNetwork,
  module: "affiliate-networks",
  label: "affiliate network",
  schema: affiliateNetworkSchema,
  searchFields: ["name", "code"],
  filterFields: ["status"],
  // Credentials are never sent to the browser.
  hiddenFields: ["apiKey", "apiSecret"],
  keepOnEmpty: ["apiKey", "apiSecret"],
  defaultSort: "name",
};

export const dealResource: CrudConfig<typeof dealSchema> = {
  model: Deal,
  module: "deals",
  label: "deal",
  schema: dealSchema,
  searchFields: ["title", "slug", "couponCode"],
  filterFields: ["status", "dealType", "affiliateNetwork", "isFeatured"],
  populate: [
    { path: "product", select: "name slug thumbnail" },
    { path: "affiliateNetwork", select: "name code" },
  ],
  titleField: "title",
  onCreate: (session) => ({ createdBy: session.id }),
};

export const couponResource: CrudConfig<typeof couponSchema> = {
  model: Coupon,
  module: "coupons",
  label: "coupon",
  schema: couponSchema,
  searchFields: ["code", "title"],
  filterFields: ["status", "affiliateNetwork", "discountType", "isVerified"],
  populate: [{ path: "affiliateNetwork", select: "name code" }],
  titleField: "code",
};

export const bannerResource: CrudConfig<typeof bannerSchema> = {
  model: Banner,
  module: "banners",
  label: "banner",
  schema: bannerSchema,
  searchFields: ["title", "subtitle"],
  filterFields: ["status", "position"],
  defaultSort: "priority",
  titleField: "title",
  onCreate: (session) => ({ createdBy: session.id }),
};

export const blogResource: CrudConfig<typeof blogPostSchema> = {
  model: BlogPost,
  module: "blog",
  label: "article",
  schema: blogPostSchema,
  searchFields: ["title", "slug", "excerpt", "tags"],
  filterFields: ["status"],
  populate: [{ path: "author", select: "name email" }],
  titleField: "title",
  onCreate: (session) => ({ author: session.id }),
};

export const reviewResource: CrudConfig<typeof productReviewSchema> = {
  model: ProductReview,
  module: "products",
  label: "review",
  schema: productReviewSchema,
  searchFields: ["title", "comment", "authorName"],
  filterFields: ["status", "product", "rating", "source"],
  populate: [{ path: "product", select: "name slug thumbnail" }],
  titleField: "title",
};

export const wikiResource: CrudConfig<typeof wikiPageSchema> = {
  model: WikiPage,
  module: "wiki",
  label: "wiki page",
  schema: wikiPageSchema,
  searchFields: ["title", "excerpt", "content", "tags"],
  filterFields: ["status", "section", "isPinned"],
  populate: [{ path: "author", select: "name email" }],
  defaultSort: "order",
  titleField: "title",
  onCreate: (session) => ({ author: session.id, updatedBy: session.id }),
  onUpdate: (session) => ({ updatedBy: session.id }),
};
