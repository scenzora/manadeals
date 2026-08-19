/**
 * Values shared between server queries and client components. Kept out of
 * storefront.service.ts so importing them never pulls Mongoose into the
 * browser bundle.
 */
export const PRODUCT_SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "discount", label: "Biggest discount" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest first" },
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number]["value"];
