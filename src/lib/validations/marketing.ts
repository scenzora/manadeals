import { z } from "zod";

import { objectId, optionalObjectId, seoSchema, slugSchema, statusSchema, urlSchema } from "./common";

/** Date inputs submit "" when cleared; treat that as "no date" rather than invalid. */
const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.date().nullable(),
);

/* ---------------------------------------------------------------------- Deal */

export const dealSchema = z
  .object({
    title: z.string().min(3, "Title is required").max(160),
    slug: slugSchema,
    description: z.string().max(2000).default(""),
    image: urlSchema,

    product: optionalObjectId,
    category: optionalObjectId,
    affiliateNetwork: optionalObjectId,

    dealType: z.enum(["standard", "flash", "deal-of-the-day", "featured"]).default("standard"),
    originalPrice: z.coerce.number().min(0).default(0),
    dealPrice: z.coerce.number().min(0).default(0),
    couponCode: z.string().max(40).default(""),
    affiliateUrl: urlSchema,

    startDate: z.coerce.date(),
    endDate: z.coerce.date(),

    isFeatured: z.boolean().default(false),
    status: z.enum(["active", "inactive", "expired"]).default("active"),
  })
  .refine((values) => values.endDate > values.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  })
  .refine((values) => values.dealPrice <= values.originalPrice || values.originalPrice === 0, {
    message: "Deal price cannot be higher than the original price",
    path: ["dealPrice"],
  });

/* -------------------------------------------------------------------- Coupon */

export const couponSchema = z
  .object({
    code: z.string().min(2, "Coupon code is required").max(40),
    title: z.string().min(3, "Title is required").max(160),
    description: z.string().max(1000).default(""),
    affiliateNetwork: optionalObjectId,
    category: optionalObjectId,

    discountType: z.enum(["percentage", "flat"]).default("percentage"),
    discountValue: z.coerce.number().min(0).default(0),
    minimumOrderValue: z.coerce.number().min(0).default(0),
    maximumDiscount: z.coerce.number().min(0).default(0),

    startDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    affiliateUrl: urlSchema,

    isVerified: z.boolean().default(false),
    status: z.enum(["active", "inactive", "expired"]).default("active"),
  })
  .refine((values) => values.expiryDate > values.startDate, {
    message: "Expiry date must be after the start date",
    path: ["expiryDate"],
  })
  .refine(
    (values) => values.discountType !== "percentage" || values.discountValue <= 100,
    { message: "Percentage discount cannot exceed 100", path: ["discountValue"] },
  );

/* -------------------------------------------------------------------- Banner */

export const bannerSchema = z
  .object({
    title: z.string().min(2, "Title is required").max(120),
    subtitle: z.string().max(200).default(""),
    desktopImage: urlSchema,
    mobileImage: urlSchema,
    ctaText: z.string().max(40).default(""),
    ctaUrl: urlSchema,
    position: z
      .enum(["home-hero", "home-middle", "category-top", "sidebar", "footer"])
      .default("home-hero"),
    priority: z.coerce.number().int().min(0).max(999).default(0),
    startDate: optionalDate.default(null),
    endDate: optionalDate.default(null),
    status: statusSchema.default("active"),
  })
  .refine(
    (values) => !values.startDate || !values.endDate || values.endDate > values.startDate,
    { message: "End date must be after the start date", path: ["endDate"] },
  );

/* ------------------------------------------------------------------ Blog post */

export const blogPostSchema = z
  .object({
    title: z.string().min(3, "Title is required").max(200),
    slug: slugSchema,
    excerpt: z.string().max(400).default(""),
    content: z.string().max(100000).default(""),
    featuredImage: urlSchema,
    categories: z.array(objectId).max(6).default([]),
    tags: z.array(z.string().max(40)).max(20).default([]),
    status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
    publishedAt: optionalDate.default(null),
    seo: seoSchema.and(z.object({ ogImage: z.string().default("") }).partial()),
  })
  .refine((values) => values.status !== "scheduled" || Boolean(values.publishedAt), {
    message: "Scheduled posts need a publish date",
    path: ["publishedAt"],
  });

/* ------------------------------------------------------------ Product review */

export const productReviewSchema = z.object({
  product: objectId,
  authorName: z.string().max(80).default(""),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(160).default(""),
  comment: z.string().max(4000).default(""),
  images: z.array(z.string().url()).max(6).default([]),
  source: z.enum(["site", "amazon", "flipkart", "imported"]).default("site"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export type DealInput = z.input<typeof dealSchema>;
export type CouponInput = z.input<typeof couponSchema>;
export type BannerInput = z.input<typeof bannerSchema>;
export type BlogPostInput = z.input<typeof blogPostSchema>;
export type ProductReviewInput = z.input<typeof productReviewSchema>;
