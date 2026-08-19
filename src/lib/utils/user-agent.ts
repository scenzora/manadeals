export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

/**
 * Small UA classifier for analytics. Deliberately coarse: we only need enough
 * to answer "mobile vs desktop" and "which browser", not device fingerprinting.
 */
export function parseUserAgent(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();

  let device: DeviceType = "unknown";
  if (/ipad|tablet|playbook|silk/.test(ua)) device = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) device = "mobile";
  else if (/android/.test(ua)) device = "tablet";
  else if (ua) device = "desktop";

  let browser = "";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\/|opera/.test(ua)) browser = "Opera";
  else if (/samsungbrowser/.test(ua)) browser = "Samsung Internet";
  else if (/chrome|crios/.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/.test(ua)) browser = "Firefox";
  else if (/safari/.test(ua)) browser = "Safari";

  let os = "";
  if (/windows/.test(ua)) os = "Windows";
  else if (/android/.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod|ios/.test(ua)) os = "iOS";
  else if (/mac os/.test(ua)) os = "macOS";
  else if (/linux/.test(ua)) os = "Linux";

  return { device, browser, os };
}

/** Reduces a referrer URL to its hostname; "direct" when there is none. */
export function normaliseReferrer(referrer: string | null, ownHost?: string) {
  if (!referrer) return "direct";
  try {
    const { hostname } = new URL(referrer);
    if (ownHost && hostname === ownHost) return "internal";
    return hostname.replace(/^www\./, "");
  } catch {
    return "direct";
  }
}

/** Known bots are not counted as views or clicks. */
export function isBot(userAgent: string | null) {
  return /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|lighthouse|headlesschrome/i.test(
    userAgent ?? "",
  );
}
