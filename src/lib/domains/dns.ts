/**
 * Pure DNS helpers for custom domains: which records a store owner must add,
 * and how to judge what a resolver actually returned.
 */

export const CNAME_TARGET = (process.env.NEXT_PUBLIC_STORES_CNAME_TARGET || "stores.manadeals.online").toLowerCase();
export const APEX_IP = process.env.NEXT_PUBLIC_STORES_APEX_IP || "76.76.21.21";

/** Registry-style suffixes where the registrable domain has three labels. */
const SECOND_LEVEL_SUFFIXES = ["co.in", "org.in", "net.in", "gen.in", "firm.in", "ind.in", "ac.in", "co.uk", "com.au"];

/** `johndeals.in` / `johndeals.co.in` are apex domains; `deals.johndeals.in` is a subdomain. */
export function isApexDomain(hostname: string) {
  const labels = hostname.split(".");
  if (labels.length <= 2) return true;
  return labels.length === 3 && SECOND_LEVEL_SUFFIXES.some((suffix) => hostname.endsWith(`.${suffix}`));
}

/** The hostnames the hosting provider must serve for this domain. www is the canonical one. */
export function managedHostnames(hostname: string) {
  return isApexDomain(hostname) ? { primary: `www.${hostname}`, redirect: hostname } : { primary: hostname, redirect: null };
}

export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string; purpose: string };

/** Records the owner adds at their registrar (names are relative to their zone). */
export function dnsRecordsFor(hostname: string, verification: { type: string; domain: string; value: string }[] = []): DnsRecord[] {
  const records: DnsRecord[] = [];

  if (isApexDomain(hostname)) {
    records.push({ type: "CNAME", name: "www", value: CNAME_TARGET, purpose: "Your store (recommended primary address)" });
    records.push({ type: "A", name: "@", value: APEX_IP, purpose: "Redirects the bare domain to www" });
  } else {
    const label = hostname.split(".")[0]!;
    records.push({ type: "CNAME", name: label, value: CNAME_TARGET, purpose: "Your store" });
  }

  for (const entry of verification) {
    if (entry.type.toUpperCase() === "TXT") {
      records.push({ type: "TXT", name: entry.domain, value: entry.value, purpose: "Proves you own the domain" });
    }
  }
  return records;
}

export type DnsLookup = {
  resolveCname(host: string): Promise<string[]>;
  resolve4(host: string): Promise<string[]>;
};

export type DnsCheck = { host: string; ok: boolean; message: string };

const clean = (value: string) => value.toLowerCase().replace(/\.$/, "");

/** Compares live DNS with what we asked for, so the dashboard can say exactly what is wrong. */
export async function checkDns(hostname: string, dns: DnsLookup): Promise<DnsCheck[]> {
  const checks: DnsCheck[] = [];

  const cname = async (host: string) => {
    const found = await dns.resolveCname(host).catch(() => [] as string[]);
    const ok = found.map(clean).includes(CNAME_TARGET);
    checks.push({
      host,
      ok,
      message: ok
        ? "CNAME is correct"
        : found.length
          ? `CNAME points to ${clean(found[0]!)}, expected ${CNAME_TARGET}`
          : `No CNAME found. Add a CNAME to ${CNAME_TARGET}`,
    });
  };

  if (isApexDomain(hostname)) {
    await cname(`www.${hostname}`);
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const ok = addresses.includes(APEX_IP);
    checks.push({
      host: hostname,
      ok,
      message: ok
        ? "A record is correct"
        : addresses.length
          ? `A record is ${addresses.join(", ")}, expected ${APEX_IP}`
          : `No A record found. Add an A record to ${APEX_IP}`,
    });
  } else {
    await cname(hostname);
  }
  return checks;
}
