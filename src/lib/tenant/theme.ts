/**
 * Tenant theming: validates owner-supplied values and renders them as CSS
 * variables. Everything that reaches the <style> tag passes through here, so a
 * store owner can never inject arbitrary CSS.
 */

export const THEME_FONTS = {
  inter: { label: "Inter" },
  poppins: { label: "Poppins" },
  lora: { label: "Lora (serif)" },
  "dm-sans": { label: "DM Sans" },
} as const;

export type ThemeFont = keyof typeof THEME_FONTS;
export type ThemeMode = "light" | "dark" | "auto";

export type TenantTheme = {
  primary: string;
  accent: string;
  background: string;
  text: string;
  fontFamily: ThemeFont;
  radius: number; // px
  mode: ThemeMode;
};

export const DEFAULT_THEME: TenantTheme = {
  primary: "#ff6b00",
  accent: "#fff1e6",
  background: "#f4f6f8",
  text: "#102a43",
  fontFamily: "inter",
  radius: 10,
  mode: "light",
};

const HEX_RE = /^#[0-9a-f]{6}$/i;
export const isHexColor = (value: unknown): value is string => typeof value === "string" && HEX_RE.test(value);

function luminance(hex: string) {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #rrggbb colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on `background`. */
export function readableOn(background: string) {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#000000") ? "#ffffff" : "#000000";
}

/**
 * Coerces untrusted input into a safe theme. Invalid fields fall back to the
 * defaults, and text that is unreadable on its background is replaced.
 */
export function sanitizeTheme(input: Partial<Record<keyof TenantTheme, unknown>> | null | undefined): TenantTheme {
  const source = input ?? {};
  const pick = (value: unknown, fallback: string) => (isHexColor(value) ? value.toLowerCase() : fallback);

  const theme: TenantTheme = {
    primary: pick(source.primary, DEFAULT_THEME.primary),
    accent: pick(source.accent, DEFAULT_THEME.accent),
    background: pick(source.background, DEFAULT_THEME.background),
    text: pick(source.text, DEFAULT_THEME.text),
    fontFamily:
      typeof source.fontFamily === "string" && source.fontFamily in THEME_FONTS
        ? (source.fontFamily as ThemeFont)
        : DEFAULT_THEME.fontFamily,
    radius: Math.min(24, Math.max(0, Math.round(Number(source.radius ?? DEFAULT_THEME.radius)) || 0)),
    mode: source.mode === "dark" || source.mode === "auto" ? source.mode : "light",
  };

  if (contrastRatio(theme.text, theme.background) < 4.5) {
    theme.text = readableOn(theme.background);
  }
  return theme;
}

function lightVars(theme: TenantTheme) {
  return [
    `--background:${theme.background}`,
    `--foreground:${theme.text}`,
    `--card:#ffffff`,
    `--card-foreground:${theme.text}`,
    `--popover:#ffffff`,
    `--popover-foreground:${theme.text}`,
    `--primary:${theme.primary}`,
    `--primary-foreground:${readableOn(theme.primary)}`,
    `--secondary:${theme.text}`,
    `--secondary-foreground:${theme.background}`,
    `--muted:color-mix(in srgb,${theme.background},${theme.text} 6%)`,
    `--muted-foreground:color-mix(in srgb,${theme.text},${theme.background} 40%)`,
    `--accent:${theme.accent}`,
    `--accent-foreground:color-mix(in srgb,${theme.primary} 65%,#000)`,
    `--border:color-mix(in srgb,${theme.background},${theme.text} 12%)`,
    `--input:color-mix(in srgb,${theme.background},${theme.text} 12%)`,
    `--ring:${theme.primary}`,
  ];
}

/** Dark palette: neutral surfaces, with the tenant's primary kept as the brand colour. */
function darkVars(theme: TenantTheme) {
  const text = "#e6edf3";
  const background = "#0b1220";
  return [
    `--background:${background}`,
    `--foreground:${text}`,
    `--card:#111a2b`,
    `--card-foreground:${text}`,
    `--popover:#111a2b`,
    `--popover-foreground:${text}`,
    `--primary:${theme.primary}`,
    `--primary-foreground:${readableOn(theme.primary)}`,
    `--secondary:#060b14`,
    `--secondary-foreground:${text}`,
    `--muted:#162033`,
    `--muted-foreground:#9fb3c8`,
    `--accent:color-mix(in srgb,${theme.primary} 18%,#0b1220)`,
    `--accent-foreground:color-mix(in srgb,${theme.primary} 70%,#fff)`,
    `--border:#22304a`,
    `--input:#22304a`,
    `--ring:${theme.primary}`,
  ];
}

/** Renders the theme as a <style> body. Values are pre-validated, so this is injection-safe. */
export function buildThemeCss(rawTheme: Partial<Record<keyof TenantTheme, unknown>> | null | undefined) {
  const theme = sanitizeTheme(rawTheme);
  const shared = [
    `--radius:${theme.radius}px`,
    `--sidebar-active:${theme.primary}`,
  ];
  const rule = (vars: string[]) => vars.join(";");

  // `html:root` outranks the plain `:root` block in globals.css regardless of order.
  if (theme.mode === "dark") {
    return `html:root{${rule([...darkVars(theme), ...shared])};color-scheme:dark}`;
  }
  if (theme.mode === "auto") {
    return (
      `html:root{${rule([...lightVars(theme), ...shared])}}` +
      `@media (prefers-color-scheme:dark){html:root{${rule(darkVars(theme))};color-scheme:dark}}`
    );
  }
  return `html:root{${rule([...lightVars(theme), ...shared])}}`;
}

/** The theme as inline CSS variables, for scoped live previews in the dashboard. */
export function previewVariables(
  rawTheme: Partial<Record<keyof TenantTheme, unknown>> | null | undefined,
  dark = false,
): Record<string, string> {
  const theme = sanitizeTheme(rawTheme);
  const entries = (dark ? darkVars(theme) : lightVars(theme)).map((line) => {
    const index = line.indexOf(":");
    return [line.slice(0, index), line.slice(index + 1)] as const;
  });
  return { ...Object.fromEntries(entries), "--radius": `${theme.radius}px` };
}
