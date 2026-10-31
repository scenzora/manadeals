/**
 * Pure affiliate link rewriting for white-label stores. No database access, so
 * every rule here is unit-tested.
 *
 * The caller decides what to do with the three outcomes:
 *   tenant   – `url` carries the store owner's own tag
 *   platform – the store has no tag for this retailer; use ManaDeals' normal
 *              pipeline (network URL pattern + tracking id)
 *   none     – no tag available and platform fallback is switched off; `url`
 *              is the destination with ManaDeals' tag stripped out
 */

export type Retailer = "amazon" | "flipkart" | "other";
export type TagSource = "tenant" | "platform" | "none";

/**
 * A rule an owner defines for any retailer or affiliate network we do not know:
 *  - `param`    appends `?param=value` to links on `domain` (most affiliate programmes)
 *  - `template` wraps the link in the network's own redirect URL, using {url} and {id}
 * `domain` is a hostname such as `myntra.com`, or `*` to cover every other retailer.
 */
export type CustomRule = {
  name: string;
  domain: string;
  mode: "param" | "template";
  param: string;
  value: string;
  template: string;
};

export type TenantAffiliate = {
  amazonAssociateTag: string;
  flipkartAffiliateId: string;
  generic: { network: string; id: string }[];
  custom?: CustomRule[];
};

export type RewriteResult =
  | { retailer: Retailer; source: "tenant" | "none"; url: string }
  | { retailer: Retailer; source: "platform"; url: null };

export const EMPTY_AFFILIATE: TenantAffiliate = { amazonAssociateTag: "", flipkartAffiliateId: "", generic: [] };

/**
 * Generic networks a store may use for retailers we have no native tag for.
 * Patterns are fixed in code on purpose: if owners could supply their own URL
 * pattern, our /go endpoint would become an open redirector.
 */
export const GENERIC_NETWORKS: Record<string, { label: string; pattern: string | undefined }> = {
  cuelinks: {
    label: "Cuelinks",
    pattern: "https://linksredirect.com/?cid={id}&source=linkkit&url={url}",
  },
  // EarnKaro has no public deep-link format we can rely on; set it once known.
  earnkaro: { label: "EarnKaro", pattern: process.env.EARNKARO_URL_PATTERN || undefined },
};

export const isValidAmazonTag = (value: string) => /^[a-z0-9][a-z0-9-]{1,38}-\d{2}$/i.test(value);
export const isValidFlipkartId = (value: string) => /^[A-Za-z0-9._-]{2,60}$/.test(value);
export const isValidGenericId = (value: string) => /^[A-Za-z0-9._-]{1,80}$/.test(value);
export const MAX_CUSTOM_RULES = 30;
export const isValidRuleDomain = (value: string) =>
  value === "*" || /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,24}$/i.test(value);
export const isValidRuleParam = (value: string) => /^[A-Za-z][A-Za-z0-9_.-]{0,29}$/.test(value);
export const isValidRuleValue = (value: string) => /^[A-Za-z0-9._~-]{1,80}$/.test(value);

/**
 * A wrapper URL must be https, carry the {url} placeholder and point at a real
 * public hostname (no IP literals or localhost), so a rule cannot aim visitors
 * at internal addresses.
 */
export function isValidRuleTemplate(template: string) {
  if (template.length > 300 || !template.includes("{url}")) return false;
  try {
    const parsed = new URL(template.replaceAll("{url}", "x").replaceAll("{id}", "x"));
    const host = parsed.hostname;
    return (
      parsed.protocol === "https:" &&
      host.includes(".") &&
      !/^[\d.]+$/.test(host) &&
      !host.includes(":") &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal")
    );
  } catch {
    return false;
  }
}

const normaliseDomain = (value: string) => value.trim().toLowerCase().replace(/^www\./, "");

function applyCustomRule(rule: CustomRule, target: URL) {
  if (!isValidRuleValue(rule.value)) return null;
  if (rule.mode === "param") {
    if (!isValidRuleParam(rule.param)) return null;
    const tagged = new URL(target.toString());
    tagged.searchParams.set(rule.param, rule.value);
    return tagged.toString();
  }
  if (!isValidRuleTemplate(rule.template)) return null;
  return rule.template
    .replaceAll("{id}", encodeURIComponent(rule.value))
    .replaceAll("{url}", encodeURIComponent(target.toString()));
}

const isAsin = (value: string) => /^[A-Z0-9]{10}$/.test(value);

const AMAZON_SHORT = ["amzn.to", "a.co", "amzn.in", "amzn.eu"];

const hostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function detectRetailer(rawUrl: string): Retailer {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (hostMatches(host, "amazon.in") || hostMatches(host, "amazon.com") || AMAZON_SHORT.some((d) => hostMatches(host, d))) {
      return "amazon";
    }
    if (hostMatches(host, "flipkart.com") || hostMatches(host, "fkrt.it")) return "flipkart";
  } catch {
    // fall through
  }
  return "other";
}

function parseHttp(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Query params that carry someone else's attribution. */
const AMAZON_TAG_PARAMS = ["tag", "linkCode", "linkId", "ascsubtag", "creative", "creativeASIN"];

function amazonUrl(rawUrl: string, asin: string | undefined) {
  const parsed = parseHttp(rawUrl);
  if (!parsed) return null;

  let url = parsed;
  if (AMAZON_SHORT.some((domain) => hostMatches(url.hostname.toLowerCase(), domain))) {
    // Short links hide the product and cannot be re-tagged; rebuild from the ASIN.
    if (!asin || !isAsin(asin)) return null;
    url = new URL(`https://www.amazon.in/dp/${asin}`);
  }
  AMAZON_TAG_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url;
}

function flipkartUrl(rawUrl: string) {
  const parsed = parseHttp(rawUrl);
  if (!parsed || hostMatches(parsed.hostname.toLowerCase(), "fkrt.it")) return null; // short link
  ["affid", "affExtParam1", "affExtParam2"].forEach((param) => parsed.searchParams.delete(param));
  return parsed;
}

export function rewriteForTenant(input: {
  url: string;
  externalProductId?: string;
  affiliate: TenantAffiliate;
  fallbackToPlatform: boolean;
}): RewriteResult {
  const { affiliate } = input;
  const retailer = detectRetailer(input.url);
  let cleaned: URL | null = null;

  if (retailer === "amazon") {
    cleaned = amazonUrl(input.url, input.externalProductId);
    if (cleaned && isValidAmazonTag(affiliate.amazonAssociateTag)) {
      cleaned.searchParams.set("tag", affiliate.amazonAssociateTag);
      return { retailer, source: "tenant", url: cleaned.toString() };
    }
  } else if (retailer === "flipkart") {
    cleaned = flipkartUrl(input.url);
    if (cleaned && isValidFlipkartId(affiliate.flipkartAffiliateId)) {
      cleaned.searchParams.set("affid", affiliate.flipkartAffiliateId);
      return { retailer, source: "tenant", url: cleaned.toString() };
    }
  } else {
    cleaned = parseHttp(input.url);
    if (cleaned) {
      const host = normaliseDomain(cleaned.hostname);
      const rules = affiliate.custom ?? [];
      // A rule for this exact retailer beats the catch-all.
      const ordered = [...rules.filter((r) => r.domain !== "*"), ...rules.filter((r) => r.domain === "*")];
      for (const rule of ordered) {
        if (rule.domain !== "*" && !hostMatches(host, normaliseDomain(rule.domain))) continue;
        const url = applyCustomRule(rule, cleaned);
        if (url) return { retailer, source: "tenant", url };
      }
    }
    for (const entry of affiliate.generic) {
      const pattern = GENERIC_NETWORKS[entry.network]?.pattern;
      if (!cleaned || !pattern || !isValidGenericId(entry.id)) continue;
      return {
        retailer,
        source: "tenant",
        url: pattern.replace("{id}", encodeURIComponent(entry.id)).replace("{url}", encodeURIComponent(cleaned.toString())),
      };
    }
  }

  if (input.fallbackToPlatform) return { retailer, source: "platform", url: null };
  // No tag and no fallback: send the visitor out clean, without ManaDeals' tag either.
  return { retailer, source: "none", url: (cleaned ?? parseHttp(input.url))?.toString() ?? input.url };
}
