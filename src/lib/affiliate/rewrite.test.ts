import { describe, expect, it } from "vitest";

import Tenant from "@/models/Tenant";
import {
  detectRetailer,
  EMPTY_AFFILIATE,
  rewriteForTenant,
  type TenantAffiliate,
} from "@/lib/affiliate/rewrite";

const john: TenantAffiliate = {
  amazonAssociateTag: "john-21",
  flipkartAffiliateId: "johnfk",
  generic: [{ network: "cuelinks", id: "12345" }],
};
const mary: TenantAffiliate = { ...john, amazonAssociateTag: "mary-21", flipkartAffiliateId: "maryfk" };

const run = (url: string, affiliate = john, fallbackToPlatform = true, externalProductId?: string) =>
  rewriteForTenant({ url, affiliate, fallbackToPlatform, externalProductId });

describe("detectRetailer", () => {
  it("recognises retailers by hostname, not by substring", () => {
    expect(detectRetailer("https://www.amazon.in/dp/B000000001")).toBe("amazon");
    expect(detectRetailer("https://amzn.to/abc")).toBe("amazon");
    expect(detectRetailer("https://dl.flipkart.com/s/x")).toBe("flipkart");
    expect(detectRetailer("https://evil.com/?u=amazon.in")).toBe("other");
    expect(detectRetailer("https://notamazon.in/x")).toBe("other");
    expect(detectRetailer("not a url")).toBe("other");
  });
});

describe("rewriteForTenant", () => {
  it("replaces the platform's Amazon tag with the store's", () => {
    const result = run("https://www.amazon.in/dp/B000000001?tag=manadeals-21&th=1&linkCode=ll1");
    expect(result.source).toBe("tenant");
    const url = new URL(result.url!);
    expect(url.searchParams.get("tag")).toBe("john-21");
    expect(url.searchParams.getAll("tag")).toHaveLength(1);
    expect(url.searchParams.get("th")).toBe("1");
    expect(url.searchParams.has("linkCode")).toBe(false);
    expect(result.url).not.toContain("manadeals-21");
  });

  it("rebuilds short Amazon links from the ASIN, or falls back when it cannot", () => {
    const rebuilt = run("https://amzn.to/3xyz", john, true, "B012345678");
    expect(rebuilt.url).toBe("https://www.amazon.in/dp/B012345678?tag=john-21");
    expect(run("https://amzn.to/3xyz").source).toBe("platform");
  });

  it("sets the Flipkart affid and drops any previous one", () => {
    const result = run("https://www.flipkart.com/p/item?pid=X1&affid=manadeals");
    expect(result.source).toBe("tenant");
    const url = new URL(result.url!);
    expect(url.searchParams.getAll("affid")).toEqual(["johnfk"]);
    expect(url.searchParams.get("pid")).toBe("X1");
  });

  it("wraps other retailers with a generic network and encodes the target", () => {
    const result = run("https://www.myntra.com/shoes?a=1&b=2");
    expect(result.source).toBe("tenant");
    expect(result.url).toBe(
      "https://linksredirect.com/?cid=12345&source=linkkit&url=" +
        encodeURIComponent("https://www.myntra.com/shoes?a=1&b=2"),
    );
  });

  it("falls back to the platform when the store has no tag for that retailer", () => {
    expect(run("https://www.amazon.in/dp/B000000001", EMPTY_AFFILIATE)).toEqual({
      retailer: "amazon",
      source: "platform",
      url: null,
    });
    expect(run("https://www.myntra.com/x", { ...john, generic: [] }).source).toBe("platform");
  });

  it("ignores malformed ids instead of embedding them", () => {
    const bad = { ...john, amazonAssociateTag: "x&tag=evil-21", generic: [{ network: "cuelinks", id: "a&b" }] };
    expect(run("https://www.amazon.in/dp/B000000001", bad).source).toBe("platform");
    expect(run("https://www.myntra.com/x", bad).source).toBe("platform");
  });

  it("with fallback off, sends the visitor out without ManaDeals' tag", () => {
    const result = run("https://www.amazon.in/dp/B000000001?tag=manadeals-21", EMPTY_AFFILIATE, false);
    expect(result.source).toBe("none");
    expect(result.url).toBe("https://www.amazon.in/dp/B000000001");
  });

  it("never leaks one store's tags into another store's links", () => {
    const urls = [
      "https://www.amazon.in/dp/B000000001",
      "https://www.flipkart.com/p/item?pid=X1",
      "https://www.myntra.com/x",
    ];
    for (const url of urls) {
      const forMary = run(url, mary).url!;
      expect(forMary).not.toContain("john-21");
      expect(forMary).not.toContain("johnfk");
    }
  });
});

describe("Tenant model", () => {
  it("keeps affiliate ids out of queries unless explicitly selected", () => {
    for (const path of ["amazonAssociateTag", "flipkartAffiliateId", "generic"]) {
      expect(Tenant.schema.path(`affiliate.${path}`).options.select).toBe(false);
    }
  });
});

describe("custom rules", () => {
  const rule = { name: "Myntra", domain: "myntra.com", mode: "param", param: "affid", value: "abc123", template: "" } as const;
  const withRules = (...custom: TenantAffiliate["custom"] & object) => ({ ...john, custom });

  it("adds the parameter on the matching retailer, overriding any existing one", () => {
    const result = run("https://www.myntra.com/shoes?affid=someone-else&a=1", withRules(rule));
    expect(result.source).toBe("tenant");
    expect(new URL(result.url!).searchParams.get("affid")).toBe("abc123");
    expect(new URL(result.url!).hostname).toBe("www.myntra.com");
  });

  it("does not match look-alike hosts", () => {
    expect(run("https://notmyntra.com/x", withRules(rule), true).source).toBe("tenant"); // falls to generic
    expect(run("https://notmyntra.com/x", { ...withRules(rule), generic: [] }).source).toBe("platform");
  });

  it("prefers an exact-domain rule over the catch-all wrapper", () => {
    const wrapper = { name: "Net", domain: "*", mode: "template", param: "", value: "id9", template: "https://net.example/go?i={id}&u={url}" } as const;
    expect(run("https://www.myntra.com/x", withRules(wrapper, rule)).url).toContain("affid=abc123");
    expect(run("https://ajio.com/x", withRules(wrapper, rule)).url).toBe(
      "https://net.example/go?i=id9&u=" + encodeURIComponent("https://ajio.com/x"),
    );
  });

  it("ignores unsafe templates", () => {
    const bad = { ...rule, domain: "*", mode: "template", template: "http://127.0.0.1/?u={url}" } as const;
    expect(run("https://ajio.com/x", { ...john, generic: [], custom: [bad] }).source).toBe("platform");
  });
});
