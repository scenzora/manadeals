import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { BlogClient } from "./blog-client";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { session, denied } = await guardPage(["blog.view"]);
  if (denied) return denied;

  return <BlogClient session={session} />;
}
