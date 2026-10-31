import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "@/lib/utils/csv";
import { normaliseRow, parseAvailability, parsePrice, parseStatus, PRODUCT_CSV_HEADERS } from "@/lib/product-csv";

describe("product csv", () => {
  it("round-trips commas, quotes and newlines", () => {
    const csv = toCsv(PRODUCT_CSV_HEADERS, [["Say \"hi\", ok", "line1\nline2", "Toys", 10, 5, "", "https://x.com", "in-stock", "active"]]);
    const [row] = parseCsv(csv);
    expect(row!.name).toBe('Say "hi", ok');
    expect(row!.short_description).toBe("line1\nline2");
  });

  it("neutralises spreadsheet formulas but keeps negative numbers", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"], [-5]])).toBe("a\r\n'=HYPERLINK(1)\r\n-5");
  });

  it("reads loose headers and prices", () => {
    expect(normaliseRow({ "Sale Price": " ₹1,499 " }).sale_price).toBe("₹1,499");
    expect(parsePrice("₹1,499")).toBe(1499);
    expect(parsePrice("")).toBeNaN();
    expect(parseAvailability("Out of Stock")).toBe("out-of-stock");
    expect(parseAvailability("nonsense")).toBe("in-stock");
    expect(parseStatus("Hidden")).toBe("inactive");
    expect(parseStatus("")).toBe("active");
  });
});
