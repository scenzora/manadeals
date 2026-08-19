import type { Metadata } from "next";

import connectToDatabase from "@/lib/mongodb";
import { guardPage } from "@/lib/page-guard";
import { loadSettings } from "@/services/settings.service";
import { hasPermission } from "@/lib/permissions";
import Product from "@/models/Product";
import Category from "@/models/Category";
import BlogPost from "@/models/BlogPost";
import { SeoClient } from "./seo-client";

export const metadata: Metadata = { title: "SEO" };
export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const { session, denied } = await guardPage(["seo.view"]);
  if (denied) return denied;

  await connectToDatabase();

  // Coverage counters show how much of the catalogue still needs metadata.
  const [settings, products, productsWithSeo, categories, categoriesWithSeo, posts, postsWithSeo] =
    await Promise.all([
      loadSettings(),
      Product.countDocuments({}),
      Product.countDocuments({ "seo.title": { $nin: ["", null] } }),
      Category.countDocuments({}),
      Category.countDocuments({ "seo.title": { $nin: ["", null] } }),
      BlogPost.countDocuments({}),
      BlogPost.countDocuments({ "seo.title": { $nin: ["", null] } }),
    ]);

  return (
    <SeoClient
      seo={JSON.parse(JSON.stringify(settings.seo))}
      canManage={hasPermission(session, "seo.manage")}
      coverage={{
        products: { total: products, withSeo: productsWithSeo },
        categories: { total: categories, withSeo: categoriesWithSeo },
        posts: { total: posts, withSeo: postsWithSeo },
      }}
    />
  );
}
