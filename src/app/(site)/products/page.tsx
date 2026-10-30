import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ProductsView } from "@/components/site/products-view";

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q;

  return buildMetadata({
    title: query ? `Search results for "${query}"` : "All products",
    description: query
      ? `Deals and prices for "${query}" across Amazon, Flipkart and more.`
      : "Browse every product we track, with live prices and real discounts.",
    path: "/products",
    // Filtered and paginated permutations are not worth indexing.
    noIndex: Object.keys(params).length > 0,
  });
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return <ProductsView params={await searchParams} />;
}
