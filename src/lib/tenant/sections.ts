/** Home page sections a store can switch on, off and reorder. Safe for client and server. */
export const HOME_SECTIONS = [
  { key: "dealOfTheDay", label: "Deal of the day", defaultEnabled: true },
  { key: "featured", label: "Featured products", defaultEnabled: true },
  { key: "trending", label: "Trending now", defaultEnabled: true },
  { key: "deals", label: "Live deals", defaultEnabled: true },
  { key: "biggestDiscounts", label: "Biggest discounts", defaultEnabled: false },
  { key: "coupons", label: "Coupons", defaultEnabled: false },
  { key: "posts", label: "From the blog", defaultEnabled: false },
] as const;

export type SectionKey = (typeof HOME_SECTIONS)[number]["key"];
export const SECTION_KEYS = HOME_SECTIONS.map((section) => section.key) as [SectionKey, ...SectionKey[]];

export type SectionConfig = { key: SectionKey; enabled: boolean };

export const defaultSections = (): SectionConfig[] =>
  HOME_SECTIONS.map((section) => ({ key: section.key, enabled: section.defaultEnabled }));

/** Fills in any section missing from saved config, so new sections appear without a migration. */
export function normaliseSections(saved: { key: string; enabled: boolean }[] | undefined): SectionConfig[] {
  const known = new Set<string>(SECTION_KEYS);
  const result = (saved ?? []).filter((entry) => known.has(entry.key)) as SectionConfig[];
  for (const fallback of defaultSections()) {
    if (!result.some((entry) => entry.key === fallback.key)) result.push(fallback);
  }
  return result;
}
