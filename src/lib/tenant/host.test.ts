import { describe, expect, it } from "vitest";

import { parseHost, normaliseHost } from "@/lib/tenant/host";

const ROOT = "manadeals.online";

describe("parseHost", () => {
  it("treats the apex and www as the main site", () => {
    expect(parseHost("manadeals.online", ROOT)).toEqual({ kind: "main" });
    expect(parseHost("www.manadeals.online", ROOT)).toEqual({ kind: "main" });
  });

  it("resolves single-label subdomains to a store slug and ignores the port", () => {
    expect(parseHost("Acme.manadeals.online:443", ROOT)).toEqual({
      kind: "subdomain",
      slug: "acme",
      hostname: "acme.manadeals.online",
    });
  });

  it("supports *.localhost in development", () => {
    expect(parseHost("acme.localhost:3000", ROOT)).toMatchObject({ kind: "subdomain", slug: "acme" });
    expect(parseHost("localhost:3000", ROOT)).toEqual({ kind: "main" });
  });

  it("never treats reserved or malformed labels as stores", () => {
    for (const host of [
      "admin.manadeals.online",
      "stores.manadeals.online",
      "a.b.manadeals.online",
      "-x-.manadeals.online",
    ]) {
      expect(parseHost(host, ROOT)).toEqual({ kind: "main" });
    }
  });

  it("classifies any other host as a custom domain, stripping www", () => {
    expect(parseHost("www.johndeals.in", ROOT)).toEqual({ kind: "custom", hostname: "johndeals.in" });
    expect(parseHost("evilmanadeals.online", ROOT)).toMatchObject({ kind: "custom" });
  });

  it("keeps Vercel preview hosts on the main site", () => {
    expect(parseHost("manadeals-git-x.vercel.app", ROOT)).toEqual({ kind: "main" });
  });

  it("normalises empty values", () => {
    expect(normaliseHost(null)).toBe("");
    expect(parseHost("", ROOT)).toEqual({ kind: "main" });
  });
});
