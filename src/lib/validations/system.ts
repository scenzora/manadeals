import { z } from "zod";

import { ALL_PERMISSIONS } from "@/lib/permissions";
import { passwordSchema } from "./auth";
import { objectId, optionalObjectId, urlSchema } from "./common";

/* ---------------------------------------------------------------- Admin user */

export const adminUserCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
  phone: z.string().max(20).default(""),
  avatar: urlSchema,
  role: objectId,
  status: z.enum(["active", "inactive"]).default("active"),
});

/**
 * Edit form: an empty password field means "keep the current password", so ""
 * is accepted here and stripped before the update reaches MongoDB.
 */
export const adminUserFormSchema = adminUserCreateSchema.extend({
  password: z.union([passwordSchema, z.literal("")]).default(""),
});

export const adminUserUpdateSchema = adminUserCreateSchema
  .omit({ password: true })
  .partial()
  .extend({ password: z.union([passwordSchema, z.literal("")]).optional() });

export const adminResetPasswordSchema = z.object({ password: passwordSchema });

/* ---------------------------------------------------------------------- Role */

const permissionSchema = z.string().refine((value) => ALL_PERMISSIONS.includes(value), {
  message: "Unknown permission",
});

export const roleSchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  description: z.string().max(300).default(""),
  permissions: z.array(permissionSchema).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
});

/* -------------------------------------------------------------- Public users */

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
});

/* ------------------------------------------------------------- Price history */

export const priceUpdateSchema = z.object({
  product: objectId,
  currentPrice: z.coerce.number().min(0),
  affiliateNetwork: optionalObjectId,
  source: z.enum(["manual", "api", "scraper"]).default("manual"),
});

/* ------------------------------------------------------------------ Settings */

export const settingsSchema = z.object({
  general: z
    .object({
      siteName: z.string().min(1).max(80),
      tagline: z.string().max(160).default(""),
      logo: z.string().max(300).default(""),
      favicon: z.string().max(300).default(""),
      contactEmail: z.union([z.string().email(), z.literal("")]).default(""),
      supportPhone: z.string().max(20).default(""),
      address: z.string().max(300).default(""),
      social: z
        .object({
          facebook: urlSchema,
          instagram: urlSchema,
          twitter: urlSchema,
          youtube: urlSchema,
          telegram: urlSchema,
          whatsapp: urlSchema,
        })
        .partial(),
    })
    .partial(),
  affiliate: z
    .object({
      defaultNetwork: z.string().max(60).default(""),
      redirectDelaySeconds: z.coerce.number().int().min(0).max(30).default(0),
      openInNewTab: z.boolean().default(true),
      nofollow: z.boolean().default(true),
      disclosureText: z.string().max(500).default(""),
      trackClicks: z.boolean().default(true),
    })
    .partial(),
  seo: z
    .object({
      title: z.string().max(160).default(""),
      description: z.string().max(320).default(""),
      keywords: z.array(z.string().max(60)).max(40).default([]),
      ogImage: z.string().max(300).default(""),
      twitterHandle: z.string().max(40).default(""),
      twitterCard: z.string().max(40).default("summary_large_image"),
      canonicalUrl: z.string().max(300).default(""),
      robots: z.string().max(120).default("index, follow"),
      sitemapEnabled: z.boolean().default(true),
      googleAnalyticsId: z.string().max(40).default(""),
      googleSiteVerification: z.string().max(120).default(""),
    })
    .partial(),
  email: z
    .object({
      smtpHost: z.string().max(160).default(""),
      smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
      smtpUser: z.string().max(160).default(""),
      smtpPassword: z.string().max(200).default(""),
      fromName: z.string().max(80).default(""),
      fromEmail: z.union([z.string().email(), z.literal("")]).default(""),
      secure: z.boolean().default(false),
    })
    .partial(),
  system: z
    .object({
      maintenanceMode: z.boolean().default(false),
      maintenanceMessage: z.string().max(300).default(""),
      cacheEnabled: z.boolean().default(true),
      cacheTtlSeconds: z.coerce.number().int().min(0).max(86400).default(300),
      paginationSize: z.coerce.number().int().min(5).max(100).default(20),
    })
    .partial(),
});

/* ------------------------------------------------------------- Notifications */

export const notificationSchema = z.object({
  title: z.string().min(2).max(160),
  message: z.string().max(1000).default(""),
  type: z.enum(["info", "success", "warning", "error", "price-drop", "system"]).default("info"),
  channel: z.enum(["in-app", "email", "telegram", "whatsapp"]).default("in-app"),
  recipient: optionalObjectId,
  link: z.string().max(300).default(""),
});

export type AdminUserCreateInput = z.input<typeof adminUserCreateSchema>;
export type RoleInput = z.input<typeof roleSchema>;
export type SettingsInput = z.input<typeof settingsSchema>;
export type PriceUpdateInput = z.input<typeof priceUpdateSchema>;
export type NotificationInput = z.input<typeof notificationSchema>;
