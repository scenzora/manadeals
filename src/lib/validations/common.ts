import { z } from "zod";

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid id");

export const optionalObjectId = z
  .union([objectId, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only");

export const statusSchema = z.enum(["active", "inactive"]);

export const urlSchema = z.union([z.string().url("Enter a valid URL"), z.literal("")]).default("");

export const seoSchema = z
  .object({
    title: z.string().max(160).default(""),
    description: z.string().max(320).default(""),
    keywords: z.array(z.string().max(60)).max(30).default([]),
  })
  .default({ title: "", description: "", keywords: [] });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeSchema = z.object({
  preset: z
    .enum(["today", "yesterday", "last-7-days", "last-30-days", "this-month", "custom"])
    .default("last-7-days"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
