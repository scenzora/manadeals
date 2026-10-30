import { describe, expect, it } from "vitest";

import {
  APEX_IP,
  checkDns,
  CNAME_TARGET,
  dnsRecordsFor,
  isApexDomain,
  managedHostnames,
  type DnsLookup,
} from "@/lib/domains/dns";
import {
  FAILED_CHECKS_BEFORE_DEMOTION,
  nextDomainState,
  PENDING_GIVE_UP_MS,
  type DomainState,
} from "@/lib/domains/state";

describe("domain classification", () => {
  it("tells apex domains from subdomains, including Indian second-level TLDs", () => {
    expect(isApexDomain("johndeals.in")).toBe(true);
    expect(isApexDomain("johndeals.co.in")).toBe(true);
    expect(isApexDomain("deals.johndeals.in")).toBe(false);
    expect(isApexDomain("shop.johndeals.co.in")).toBe(false);
  });

  it("makes www the primary host and redirects the bare domain", () => {
    expect(managedHostnames("johndeals.in")).toEqual({ primary: "www.johndeals.in", redirect: "johndeals.in" });
    expect(managedHostnames("deals.johndeals.in")).toEqual({ primary: "deals.johndeals.in", redirect: null });
  });
});

describe("dnsRecordsFor", () => {
  it("asks for a www CNAME and an apex A record", () => {
    const records = dnsRecordsFor("johndeals.in");
    expect(records).toContainEqual(expect.objectContaining({ type: "CNAME", name: "www", value: CNAME_TARGET }));
    expect(records).toContainEqual(expect.objectContaining({ type: "A", name: "@", value: APEX_IP }));
  });

  it("asks only for a CNAME on subdomains and includes ownership TXT records", () => {
    const records = dnsRecordsFor("deals.johndeals.in", [
      { type: "TXT", domain: "_vercel.johndeals.in", value: "vc-domain-verify=abc" },
    ]);
    expect(records.filter((record) => record.type === "A")).toHaveLength(0);
    expect(records[0]).toMatchObject({ type: "CNAME", name: "deals" });
    expect(records).toContainEqual(expect.objectContaining({ type: "TXT", value: "vc-domain-verify=abc" }));
  });
});

describe("checkDns", () => {
  const lookup = (cnames: Record<string, string[]>, a: Record<string, string[]>): DnsLookup => ({
    resolveCname: async (host) => cnames[host] ?? Promise.reject(new Error("ENODATA")),
    resolve4: async (host) => a[host] ?? Promise.reject(new Error("ENODATA")),
  });

  it("passes when records match, ignoring case and trailing dots", async () => {
    const checks = await checkDns(
      "johndeals.in",
      lookup({ "www.johndeals.in": [`${CNAME_TARGET.toUpperCase()}.`] }, { "johndeals.in": [APEX_IP] }),
    );
    expect(checks.every((check) => check.ok)).toBe(true);
  });

  it("explains what is wrong", async () => {
    const checks = await checkDns("johndeals.in", lookup({ "www.johndeals.in": ["other.example.com"] }, { "johndeals.in": ["1.2.3.4"] }));
    expect(checks[0]).toMatchObject({ ok: false });
    expect(checks[0]!.message).toContain("other.example.com");
    expect(checks[1]!.message).toContain("1.2.3.4");
  });

  it("reports missing records", async () => {
    const checks = await checkDns("deals.johndeals.in", lookup({}, {}));
    expect(checks).toEqual([expect.objectContaining({ ok: false, message: expect.stringContaining("No CNAME") })]);
  });
});

describe("nextDomainState", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  const created = (ageMs: number) => ({ createdAt: new Date(now.getTime() - ageMs), now });
  const pending: DomainState = { verificationStatus: "pending", sslStatus: "pending", failedChecks: 0 };
  const verified: DomainState = { verificationStatus: "verified", sslStatus: "active", failedChecks: 0 };

  it("verifies once the provider confirms ownership and DNS", () => {
    expect(nextDomainState(pending, { verified: true, misconfigured: false }, created(1000))).toEqual(verified);
  });

  it("stays pending while DNS is wrong and the window is open", () => {
    expect(nextDomainState(pending, { verified: false, misconfigured: true }, created(60_000))).toEqual(pending);
    // Ownership proven but DNS not pointing yet is still not live.
    expect(nextDomainState(pending, { verified: true, misconfigured: true }, created(60_000)).verificationStatus).toBe("pending");
  });

  it("fails a domain that never verifies within the window", () => {
    const state = nextDomainState(pending, { verified: false, misconfigured: true }, created(PENDING_GIVE_UP_MS + 1));
    expect(state).toMatchObject({ verificationStatus: "failed", sslStatus: "failed" });
  });

  it("recovers a failed domain when DNS is fixed later", () => {
    const failed: DomainState = { verificationStatus: "failed", sslStatus: "failed", failedChecks: 4 };
    expect(nextDomainState(failed, { verified: true, misconfigured: false }, created(PENDING_GIVE_UP_MS * 2))).toEqual(verified);
  });

  it("tolerates transient problems on a live domain, then demotes it", () => {
    let state = verified;
    for (let i = 1; i < FAILED_CHECKS_BEFORE_DEMOTION; i++) {
      state = nextDomainState(state, { verified: true, misconfigured: true }, created(PENDING_GIVE_UP_MS * 5));
      expect(state.verificationStatus).toBe("verified");
      expect(state.failedChecks).toBe(i);
    }
    state = nextDomainState(state, { verified: true, misconfigured: true }, created(PENDING_GIVE_UP_MS * 5));
    expect(state).toMatchObject({ verificationStatus: "failed", sslStatus: "failed" });
  });

  it("resets the failure count after a good check", () => {
    const wobbling: DomainState = { ...verified, failedChecks: 2 };
    expect(nextDomainState(wobbling, { verified: true, misconfigured: false }, created(1000)).failedChecks).toBe(0);
  });
});
