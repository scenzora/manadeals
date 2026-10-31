/** Columns shared by the owner product export, import and template. */
export const PRODUCT_CSV_HEADERS = [
  "name",
  "short_description",
  "category",
  "original_price",
  "sale_price",
  "image_url",
  "affiliate_url",
  "availability",
  "status",
];

export const PRODUCT_CSV_TEMPLATE = [
  PRODUCT_CSV_HEADERS.join(","),
  'Wireless Earbuds,"Great sound, 24h battery",Electronics,2999,1499,https://example.com/earbuds.jpg,https://example.com/buy/earbuds,in-stock,active',
].join("\r\n");

export const MAX_IMPORT_ROWS = 500;

const normaliseKey = (key: string) => key.trim().toLowerCase().replace(/[\s-]+/g, "_");

/** Lenient header matching so "Sale Price" or "sale-price" both work. */
export function normaliseRow(row: Record<string, string>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normaliseKey(key), String(value ?? "").trim()]));
}

/** "₹1,499" -> 1499; anything unparseable becomes NaN so validation rejects the row. */
export function parsePrice(value: string | undefined) {
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  return cleaned === "" ? Number.NaN : Number(cleaned);
}

const AVAILABILITY = ["in-stock", "out-of-stock", "limited", "pre-order"];

export const parseAvailability = (value: string | undefined) => {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return AVAILABILITY.includes(key) ? key : "in-stock";
};

export const parseStatus = (value: string | undefined) => ((value ?? "").trim().toLowerCase() === "hidden" || (value ?? "").trim().toLowerCase() === "inactive" ? "inactive" : "active");
