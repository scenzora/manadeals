import { z } from "zod";

import { objectId } from "@/lib/validations/common";
import { THEME_FONTS } from "@/lib/tenant/theme";
import {
  GENERIC_NETWORKS,
  MAX_CUSTOM_RULES,
  isValidAmazonTag,
  isValidFlipkartId,
  isValidGenericId,
  isValidRuleDomain,
  isValidRuleParam,
  isValidRuleTemplate,
  isValidRuleValue,
} from "@/lib/affiliate/rewrite";
import { SECTION_KEYS } from "@/lib/tenant/sections";
import { validateStoreName, validateStoreSlug } from "@/lib/tenant/identity";

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(120);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb colour");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const ownerLoginSchema = z.object({ email, password: z.string().min(1).max(128) });

const storeName = z.string().superRefine((value, ctx) => {
  const result = validateStoreName(value);
  if (!result.ok) ctx.addIssue({ code: "custom", message: result.reason });
});

export const createStoreSchema = z.object({
  name: storeName,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((value, ctx) => {
      const result = validateStoreSlug(value);
      if (!result.ok) ctx.addIssue({ code: "custom", message: result.reason });
    }),
});

const optionalUrl = z.union([z.string().trim().url().max(300), z.literal("")]).default("");

export const brandingSchema = z.object({
  section: z.literal("branding"),
  name: storeName,
  tagline: z.string().trim().max(160).default(""),
  footerText: z.string().trim().max(500).default(""),
  contactEmail: z.union([email, z.literal("")]).default(""),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  showPoweredBy: z.boolean().default(true),
  social: z
    .object({
      facebook: optionalUrl,
      instagram: optionalUrl,
      x: optionalUrl,
      youtube: optionalUrl,
      telegram: optionalUrl,
      whatsapp: optionalUrl,
    })
    .default({ facebook: "", instagram: "", x: "", youtube: "", telegram: "", whatsapp: "" }),
});

export const themeSchema = z.object({
  section: z.literal("theme"),
  primary: hex,
  accent: hex,
  background: hex,
  text: hex,
  fontFamily: z.enum(Object.keys(THEME_FONTS) as [string, ...string[]]),
  radius: z.number().int().min(0).max(24),
  mode: z.enum(["light", "dark", "auto"]),
});

const customRuleSchema = z
  .object({
    name: z.string().trim().min(1, "Name the network").max(40),
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .transform((value) => value.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
      .refine(isValidRuleDomain, "Use a domain like myntra.com, or * for all other retailers"),
    mode: z.enum(["param", "template"]),
    param: z.string().trim().default(""),
    value: z.string().trim().refine(isValidRuleValue, "Letters, numbers, dots, dashes and underscores only"),
    template: z.string().trim().default(""),
  })
  .superRefine((rule, ctx) => {
    if (rule.mode === "param" && !isValidRuleParam(rule.param)) {
      ctx.addIssue({ code: "custom", path: ["param"], message: "Enter the parameter name, e.g. affid" });
    }
    if (rule.mode === "template" && !isValidRuleTemplate(rule.template)) {
      ctx.addIssue({ code: "custom", path: ["template"], message: "Use an https link that contains {url}" });
    }
  });

export const affiliateSchema = z.object({
  section: z.literal("affiliate"),
  amazonAssociateTag: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidAmazonTag(v), "Should look like yourname-21"),
  flipkartAffiliateId: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidFlipkartId(v), "Letters, numbers, dots, dashes and underscores only"),
  generic: z
    .array(
      z.object({
        network: z.enum(Object.keys(GENERIC_NETWORKS) as [string, ...string[]]),
        id: z.string().trim().refine(isValidGenericId, "Letters, numbers, dots, dashes and underscores only"),
      }),
    )
    .max(Object.keys(GENERIC_NETWORKS).length)
    .refine((list) => new Set(list.map((entry) => entry.network)).size === list.length, "Use each network once"),
  custom: z
    .array(customRuleSchema)
    .max(MAX_CUSTOM_RULES)
    .refine((list) => new Set(list.map((rule) => rule.domain)).size === list.length, "One rule per retailer domain")
    .default([]),
});

export const catalogSchema = z.object({
  section: z.literal("catalog"),
  categories: z.array(objectId).max(100),
  dealOfTheDay: objectId.nullable(),
  sections: z
    .array(z.object({ key: z.enum(SECTION_KEYS), enabled: z.boolean() }))
    .max(SECTION_KEYS.length)
    .refine((list) => new Set(list.map((entry) => entry.key)).size === list.length, "Duplicate section"),
});

const httpUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full link starting with https://");

export const ownProductSchema = z
  .object({
    name: z.string().trim().min(3, "Add a product name").max(120),
    shortDescription: z.string().trim().max(200).default(""),
    category: objectId,
    originalPrice: z.coerce.number().min(0).max(10_000_000),
    salePrice: z.coerce.number().min(0).max(10_000_000),
    image: z.union([z.literal(""), httpUrl]).default(""),
    affiliateUrl: httpUrl,
    availability: z.enum(["in-stock", "out-of-stock", "limited", "pre-order"]).default("in-stock"),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .transform((value) => ({ ...value, originalPrice: Math.max(value.originalPrice, value.salePrice) }));

export const MAX_COLLECTIONS = 20;
export const MAX_COLLECTION_PRODUCTS = 100;

export const collectionsSchema = z.object({
  section: z.literal("collections"),
  collections: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Name every category").max(40),
        products: z.array(objectId).max(MAX_COLLECTION_PRODUCTS),
      }),
    )
    .max(MAX_COLLECTIONS),
});

export const updateStoreSchema = z.discriminatedUnion("section", [
  brandingSchema,
  themeSchema,
  affiliateSchema,
  catalogSchema,
  collectionsSchema,
]);

export const blogPostSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(140),
  excerpt: z.string().trim().max(300).default(""),
  content: z.string().max(50_000).default(""),
  featuredImage: optionalUrl,
  status: z.enum(["draft", "published"]),
});
