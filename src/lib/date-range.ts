import type { DateRangePreset } from "@/types";

export type DateRange = { from: Date; to: Date; label: string };

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
  { value: "custom", label: "Custom range" },
];

/** Resolves a preset (or explicit from/to) into a concrete, inclusive range. */
export function resolveDateRange(
  preset: DateRangePreset = "last-7-days",
  from?: string | null,
  to?: string | null,
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday), label: "Yesterday" };
    }
    case "last-30-days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return { from: startOfDay(start), to: endOfDay(now), label: "Last 30 days" };
    }
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(start), to: endOfDay(now), label: "This month" };
    }
    case "custom": {
      const parsedFrom = from ? new Date(from) : null;
      const parsedTo = to ? new Date(to) : null;
      if (parsedFrom && parsedTo && !Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
        return { from: startOfDay(parsedFrom), to: endOfDay(parsedTo), label: "Custom range" };
      }
      break;
    }
    default:
      break;
  }

  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  return { from: startOfDay(start), to: endOfDay(now), label: "Last 7 days" };
}

/** The previous window of the same length, used for period-over-period deltas. */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span - 1),
    to: new Date(range.from.getTime() - 1),
    label: "Previous period",
  };
}

/** Day / week / month bucket size that keeps a chart readable for the range. */
export function bucketFor(range: DateRange): "hour" | "day" | "week" {
  const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  if (days <= 1.5) return "hour";
  if (days <= 62) return "day";
  return "week";
}

export function mongoDateFormat(bucket: "hour" | "day" | "week") {
  if (bucket === "hour") return "%Y-%m-%dT%H:00";
  if (bucket === "week") return "%G-W%V";
  return "%Y-%m-%d";
}
