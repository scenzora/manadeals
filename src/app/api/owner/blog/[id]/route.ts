import { ApiException, assertObjectId, fail, ok, readJson } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { keyFromPublicUrl } from "@/lib/r2";
import { scoped } from "@/lib/tenant/scope";
import { readingMinutes } from "@/lib/utils/markdown";
import { blogPostSchema } from "@/lib/validations/store";
import StoreBlogPost from "@/models/StoreBlogPost";

export const runtime = "nodejs";

type Params = { id: string };

export const GET = ownerRoute<Params>(async (_request, { owner, params }) => {
  const id = assertObjectId((await params).id);
  const post = await scoped(StoreBlogPost, tenantIdOf(owner)).findOne({ _id: id }).lean();
  if (!post) return fail("Post not found", 404);
  return ok(JSON.parse(JSON.stringify(post)));
});

export const PUT = ownerRoute<Params>(async (request, { owner, params }) => {
  const id = assertObjectId((await params).id);
  const input = blogPostSchema.parse(await readJson(request));
  if (input.featuredImage && !keyFromPublicUrl(input.featuredImage)) {
    throw new ApiException("Images must be uploaded through the dashboard", 422);
  }

  const posts = scoped(StoreBlogPost, tenantIdOf(owner));
  const existing = await posts.findOne({ _id: id }).select("publishedAt").lean();
  if (!existing) return fail("Post not found", 404);

  await posts.updateOne(
    { _id: id },
    {
      $set: {
        ...input,
        readingMinutes: readingMinutes(input.content),
        // Keep the original publish date across edits.
        publishedAt: input.status === "published" ? (existing.publishedAt ?? new Date()) : null,
      },
    },
  );
  return ok({ id });
});

export const DELETE = ownerRoute<Params>(async (_request, { owner, params }) => {
  const id = assertObjectId((await params).id);
  const result = await scoped(StoreBlogPost, tenantIdOf(owner)).deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail("Post not found", 404);
  return ok({ id });
});
