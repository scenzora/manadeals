import crypto from "node:crypto";

import { ApiException, fail, ok, readJson } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { keyFromPublicUrl } from "@/lib/r2";
import { limitsFor } from "@/lib/plans";
import { scoped } from "@/lib/tenant/scope";
import { readingMinutes } from "@/lib/utils/markdown";
import { slugify } from "@/lib/utils/slug";
import { blogPostSchema } from "@/lib/validations/store";
import StoreBlogPost from "@/models/StoreBlogPost";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

export const GET = ownerRoute(async (_request, { owner }) => {
  const posts = await scoped(StoreBlogPost, tenantIdOf(owner))
    .find()
    .select("title slug status publishedAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
  return ok(JSON.parse(JSON.stringify(posts)));
});

export const POST = ownerRoute(async (request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const input = blogPostSchema.parse(await readJson(request));
  if (input.featuredImage && !keyFromPublicUrl(input.featuredImage)) {
    throw new ApiException("Images must be uploaded through the dashboard", 422);
  }

  const posts = scoped(StoreBlogPost, tenantId);
  const tenant = await Tenant.findById(tenantId).select("plan");
  const allowed = limitsFor(tenant?.plan ?? "free").blogPosts;
  if ((await posts.countDocuments()) >= allowed) {
    return fail(`Your plan allows ${allowed} blog posts. Upgrade to Pro for more.`, 403);
  }

  const base = slugify(input.title) || "post";
  const slug = (await posts.findOne({ slug: base }).select("_id").lean())
    ? `${base}-${crypto.randomBytes(2).toString("hex")}`
    : base;

  const post = await posts.create({
    ...input,
    slug,
    readingMinutes: readingMinutes(input.content),
    publishedAt: input.status === "published" ? new Date() : null,
  });
  return ok({ id: String(post._id), slug }, 201);
});
