import { z } from "zod";

import { objectId, optionalObjectId, seoSchema, slugSchema, statusSchema, urlSchema } from "./common";

/* ------------------------------------------------------------------ Category */

export const categorySchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  slug: slugSchema,
  description: z.string().max(600).default(""),
  image: urlSchema,
  icon: z.string().max(60).default(""),
  parent: optionalObjectId,
  order: z.coerce.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  status: statusSchema.default("active"),
  seo: seoSchema,
});

export const categoryReorderSchema = z.object({
  items: z.array(z.object({ id: objectId, order: z.number().int().min(0) })).min(1),
});

/* --------------------------------------------------------------------- Brand */

export const brandSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  slug: slugSchema,
  logo: urlSchema,
  description: z.string().max(600).default(""),
  website: urlSchema,
  status: statusSchema.default("active"),
  seo: seoSchema,
});

/* --------------------------------------------------------- Affiliate network */

export const affiliateNetworkSchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  logo: urlSchema,
  trackingId: z.string().max(120).default(""),
  apiKey: z.string().max(200).default(""),
  apiSecret: z.string().max(200).default(""),
  baseUrl: urlSchema,
  affiliateUrlPattern: z.string().max(300).default(""),
  commissionPercentage: z.coerce.number().min(0).max(100).default(0),
  status: statusSchema.default("active"),
});

/* ------------------------------------------------------------------- Product */

export const affiliateLinkSchema = z.object({
  network: objectId,
  affiliateUrl: z.string().url("Enter a valid affiliate URL"),
  trackingUrl: urlSchema,
  externalProductId: z.string().max(60).default(""),
  price: z.coerce.number().min(0).nullable().default(null),
  isPrimary: z.boolean().default(false),
});

export const productSchema = z
  .object({
    name: z.string().min(3, "Name is required").max(200),
    slug: slugSchema,
    shortDescription: z.string().max(300).default(""),
    description: z.string().max(20000).default(""),

    category: objectId,
    subcategory: optionalObjectId,
    brand: optionalObjectId,

    thumbnail: urlSchema,
    images: z.array(z.string().url()).max(12).default([]),

    originalPrice: z.coerce.number().min(0, "Original price is required"),
    salePrice: z.coerce.number().min(0, "Sale price is required"),
    currency: z.string().length(3).default("INR"),

    affiliateLinks: z.array(affiliateLinkSchema).min(1, "Add at least one affiliate link"),
    sku: z.string().max(60).default(""),

    rating: z.coerce.number().min(0).max(5).default(0),
    reviewCount: z.coerce.number().int().min(0).default(0),
    availability: z.enum(["in-stock", "out-of-stock", "limited", "pre-order"]).default("in-stock"),

    isFeatured: z.boolean().default(false),
    isTrending: z.boolean().default(false),
    isDealOfTheDay: z.boolean().default(false),
    status: z.enum(["active", "inactive", "draft"]).default("active"),

    seo: seoSchema,
  })
  .refine((values) => values.salePrice <= values.originalPrice, {
    message: "Sale price cannot be higher than the original price",
    path: ["salePrice"],
  })
  .refine((values) => values.affiliateLinks.filter((link) => link.isPrimary).length <= 1, {
    message: "Only one affiliate link can be marked as primary",
    path: ["affiliateLinks"],
  });

export const productBulkActionSchema = z.object({
  ids: z.array(objectId).min(1, "Select at least one product"),
  action: z.enum(["activate", "deactivate", "delete", "feature", "unfeature", "trending"]),
});

/** One row of a CSV import, after header mapping. */
export const productImportRowSchema = z.object({
  name: z.string().min(3),
  description: z.string().default(""),
  category: z.string().min(1),
  brand: z.string().default(""),
  originalPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  affiliateNetwork: z.string().min(1),
  affiliateUrl: z.string().url(),
  imageUrl: z.string().default(""),
  rating: z.coerce.number().min(0).max(5).default(0),
  reviewCount: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
});

export const productImportSchema = z.object({
  rows: z.array(productImportRowSchema).min(1).max(2000),
  skipDuplicates: z.boolean().default(true),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type BrandInput = z.input<typeof brandSchema>;
export type AffiliateNetworkInput = z.input<typeof affiliateNetworkSchema>;
export type ProductInput = z.input<typeof productSchema>;
export type ProductImportRow = z.infer<typeof productImportRowSchema>;
