import { z } from "zod";

import { slugSchema } from "./common";

export const WIKI_SECTIONS = [
  { value: "getting-started", label: "Getting started" },
  { value: "catalogue", label: "Catalogue" },
  { value: "offers", label: "Deals & coupons" },
  { value: "analytics", label: "Analytics" },
  { value: "content", label: "Content & SEO" },
  { value: "administration", label: "Administration" },
  { value: "operations", label: "Operations" },
  { value: "troubleshooting", label: "Troubleshooting" },
] as const;

export const wikiSectionSchema = z.enum([
  "getting-started",
  "catalogue",
  "offers",
  "analytics",
  "content",
  "administration",
  "operations",
  "troubleshooting",
]);

export const wikiPageSchema = z.object({
  title: z.string().min(3, "Title is required").max(160),
  slug: slugSchema,
  section: wikiSectionSchema.default("getting-started"),
  excerpt: z.string().max(300).default(""),
  content: z.string().max(100000).default(""),
  tags: z.array(z.string().max(40)).max(20).default([]),
  order: z.coerce.number().int().min(0).max(999).default(0),
  isPinned: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("published"),
});

export type WikiPageInput = z.input<typeof wikiPageSchema>;
export type WikiPageValues = z.output<typeof wikiPageSchema>;
