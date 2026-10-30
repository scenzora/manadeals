import "server-only";

import dns from "node:dns/promises";

import connectToDatabase from "@/lib/mongodb";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";
import { checkDns, dnsRecordsFor, managedHostnames, type DnsCheck } from "@/lib/domains/dns";
import { getDomainProvider, DomainProviderError, type ProviderDomainStatus } from "@/lib/domains/provider";
import { nextDomainState, type DomainState } from "@/lib/domains/state";
import { limitsFor } from "@/lib/plans";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { validateCustomHostname } from "@/lib/tenant/identity";
import { refreshStore } from "@/lib/tenant/store.server";
import { ApiException } from "@/lib/api";

export const normaliseDomainInput = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");

function requireProvider() {
  const provider = getDomainProvider();
  if (!provider) throw new ApiException("Custom domains are not available right now. Please contact support.", 503);
  return provider;
}

/** Combines the readings for every hostname we serve for this domain (www + apex). */
async function readProvider(hostname: string, action: "status" | "verify"): Promise<ProviderDomainStatus> {
  const provider = requireProvider();
  const { primary, redirect } = managedHostnames(hostname);
  const hosts = [primary, ...(redirect ? [redirect] : [])];
  const readings = await Promise.all(hosts.map((host) => provider[action](host)));

  return {
    verified: readings.every((reading) => reading.verified),
    misconfigured: readings.some((reading) => reading.misconfigured),
    verification: readings.flatMap((reading) => reading.verification),
  };
}

type DomainDoc = NonNullable<Awaited<ReturnType<typeof TenantDomain.findOne>>>;

/** Reads the provider, advances the state machine, saves, and refreshes caches on a change. */
export async function refreshDomain(domain: DomainDoc, options: { verify?: boolean } = {}) {
  const reading = await readProvider(domain.hostname, options.verify && domain.verificationStatus !== "verified" ? "verify" : "status");

  const previous: DomainState = {
    verificationStatus: domain.verificationStatus,
    sslStatus: domain.sslStatus,
    failedChecks: domain.failedChecks ?? 0,
  };
  const next = nextDomainState(previous, reading, { createdAt: domain.get("createdAt") as Date, now: new Date() });

  domain.verificationStatus = next.verificationStatus;
  domain.sslStatus = next.sslStatus;
  domain.failedChecks = next.failedChecks;
  domain.lastCheckedAt = new Date();
  domain.verifiedAt = next.verificationStatus === "verified" ? (domain.verifiedAt ?? new Date()) : null;
  domain.lastError = reading.misconfigured && next.verificationStatus !== "verified" ? "DNS is not pointing at ManaDeals yet" : "";
  if (reading.verification.length) domain.set("verificationRecords", reading.verification);
  await domain.save();

  if (next.verificationStatus !== previous.verificationStatus) {
    const tenant = await Tenant.findById(domain.tenant).select("slug").lean();
    if (tenant) refreshStore(String(domain.tenant), tenant.slug, [domain.hostname, `www.${domain.hostname}`]);
  }
  return domain;
}

export async function connectDomain(tenantId: string, rawHostname: string) {
  await connectToDatabase();
  const tenant = await Tenant.findById(tenantId).select("plan slug").lean();
  if (!tenant) throw new ApiException("Store not found", 404);
  if (!limitsFor(tenant.plan).customDomain) {
    throw new ApiException("Custom domains are part of the Pro plan", 403);
  }

  const hostname = normaliseDomainInput(rawHostname);
  const verdict = validateCustomHostname(hostname, ROOT_DOMAIN);
  if (!verdict.ok) throw new ApiException(verdict.reason, 422);

  if (await TenantDomain.exists({ tenant: tenantId })) {
    throw new ApiException("Remove your current domain before connecting another", 409);
  }
  if (await TenantDomain.exists({ hostname })) throw new ApiException("That domain is already connected to a store", 409);

  const provider = requireProvider();
  const { primary, redirect } = managedHostnames(hostname);
  try {
    // Add the canonical host first; the bare domain redirects to it.
    await provider.add(primary);
    if (redirect) await provider.add(redirect, { redirectTo: primary });
  } catch (error) {
    if (error instanceof DomainProviderError) throw new ApiException(error.message, error.status === 409 ? 409 : 502);
    throw error;
  }

  const domain = await TenantDomain.create({ tenant: tenantId, hostname, isPrimary: true });
  return refreshDomain(domain);
}

export async function removeDomain(tenantId: string) {
  await connectToDatabase();
  const domain = await TenantDomain.findOne({ tenant: tenantId });
  if (!domain) return;

  const provider = requireProvider();
  const { primary, redirect } = managedHostnames(domain.hostname);
  for (const host of [primary, ...(redirect ? [redirect] : [])]) await provider.remove(host);

  await TenantDomain.deleteOne({ _id: domain._id });
  const tenant = await Tenant.findById(tenantId).select("slug").lean();
  if (tenant) refreshStore(tenantId, tenant.slug, [domain.hostname, `www.${domain.hostname}`]);
}

export function describeDomain(domain: DomainDoc) {
  return {
    hostname: domain.hostname,
    primaryHostname: managedHostnames(domain.hostname).primary,
    verificationStatus: domain.verificationStatus,
    sslStatus: domain.sslStatus,
    verifiedAt: domain.verifiedAt ? domain.verifiedAt.toISOString() : null,
    lastCheckedAt: domain.lastCheckedAt ? domain.lastCheckedAt.toISOString() : null,
    lastError: domain.lastError,
    records: dnsRecordsFor(
      domain.hostname,
      (domain.verificationRecords ?? []).map((record) => ({ type: record.type ?? "", domain: record.domain ?? "", value: record.value ?? "" })),
    ),
  };
}

/** "Check DNS": live DNS diagnostics plus a provider verification attempt. */
export async function checkDomainNow(tenantId: string) {
  await connectToDatabase();
  const domain = await TenantDomain.findOne({ tenant: tenantId });
  if (!domain) throw new ApiException("No domain connected", 404);

  const dnsChecks: DnsCheck[] = await checkDns(domain.hostname, dns);
  await refreshDomain(domain, { verify: true });
  return { domain: describeDomain(domain), dns: dnsChecks };
}

/**
 * Background job: re-checks pending domains and re-validates live ones. Oldest
 * check first, in small batches, so one slow provider call cannot stall the run.
 */
export async function recheckDueDomains(limit = 40) {
  await connectToDatabase();
  const staleBefore = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const due = await TenantDomain.find({
    $or: [
      { verificationStatus: "pending" },
      { lastCheckedAt: null },
      { lastCheckedAt: { $lt: staleBefore } },
    ],
  })
    .sort({ lastCheckedAt: 1 })
    .limit(limit);

  let changed = 0;
  let errors = 0;
  for (const domain of due) {
    const before = domain.verificationStatus;
    try {
      await refreshDomain(domain, { verify: domain.verificationStatus === "pending" });
      if (domain.verificationStatus !== before) changed += 1;
    } catch (error) {
      errors += 1;
      console.error(`[domains] recheck failed for ${domain.hostname}`, error);
    }
  }
  return { checked: due.length, changed, errors };
}
