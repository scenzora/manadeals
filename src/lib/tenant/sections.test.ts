import { describe, expect, it } from "vitest";

import { limitsFor } from "@/lib/plans";
import { defaultSections, HOME_SECTIONS, normaliseSections } from "@/lib/tenant/sections";

describe("sections", () => {
  it("keeps saved order, drops unknown keys and appends missing ones", () => {
    const result = normaliseSections([
      { key: "trending", enabled: true },
      { key: "bogus", enabled: true },
    ]);
    expect(result[0]).toEqual({ key: "trending", enabled: true });
    expect(result.some((entry) => (entry.key as string) === "bogus")).toBe(false);
    expect(result).toHaveLength(HOME_SECTIONS.length);
  });

  it("falls back to defaults when nothing is saved", () => {
    expect(normaliseSections(undefined)).toEqual(defaultSections());
  });

  it("default sections fit within the free plan", () => {
    const enabled = defaultSections().filter((section) => section.enabled).length;
    expect(enabled).toBeLessThanOrEqual(limitsFor("free").homeSections);
  });
});
