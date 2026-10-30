import { describe, expect, it } from "vitest";

import { buildThemeCss, contrastRatio, DEFAULT_THEME, sanitizeTheme } from "@/lib/tenant/theme";

describe("theme", () => {
  it("falls back to defaults for invalid input and blocks CSS injection", () => {
    const theme = sanitizeTheme({ primary: "red;} body{display:none", fontFamily: "Comic Sans", radius: 999 });
    expect(theme.primary).toBe(DEFAULT_THEME.primary);
    expect(theme.fontFamily).toBe(DEFAULT_THEME.fontFamily);
    expect(theme.radius).toBe(24);
    expect(buildThemeCss({ accent: "url(javascript:x)" })).not.toContain("javascript");
  });

  it("replaces unreadable text colours", () => {
    const theme = sanitizeTheme({ background: "#ffffff", text: "#fefefe" });
    expect(contrastRatio(theme.text, theme.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("emits light, dark and auto variants", () => {
    expect(buildThemeCss({ mode: "light" })).not.toContain("prefers-color-scheme");
    expect(buildThemeCss({ mode: "auto" })).toContain("prefers-color-scheme:dark");
    expect(buildThemeCss({ mode: "dark" })).toContain("color-scheme:dark");
    expect(buildThemeCss({ primary: "#123456" })).toContain("--primary:#123456");
  });
});
