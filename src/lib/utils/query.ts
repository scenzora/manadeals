import { escapeRegex } from "./slug";

export type ListQuery = {
  page: number;
  limit: number;
  search: string;
  sort: string;
  order: 1 | -1;
};

const MAX_LIMIT = 100;

export function parseListQuery(
  searchParams: URLSearchParams,
  defaults: { sort?: string; limit?: number } = {},
): ListQuery {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit")) || defaults.limit || 20),
  );
  return {
    page,
    limit,
    search: (searchParams.get("search") ?? "").trim().slice(0, 120),
    sort: searchParams.get("sort") || defaults.sort || "createdAt",
    order: searchParams.get("order") === "asc" ? 1 : -1,
  };
}

/** Builds a case-insensitive "contains" filter across the given fields. */
export function searchFilter(search: string, fields: string[]) {
  if (!search) return {};
  const regex = new RegExp(escapeRegex(search), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

/**
 * Strips Mongo operator keys from client-supplied objects so they can never be
 * interpolated into a query (NoSQL injection guard).
 */
export function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sanitize) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      output[key] = sanitize(val);
    }
    return output as T;
  }
  return value;
}

/**
 * Filters are assembled dynamically from query strings, so their keys are only
 * known at runtime. `sanitize()` has already stripped Mongo operators; this
 * helper is the single place where that runtime shape is handed to Mongoose.
 */
// Mongoose's strict filter types cannot describe a runtime-built filter, so the
// escape hatch is contained to this one function.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asFilter(filter: Record<string, unknown>): any {
  return filter;
}
