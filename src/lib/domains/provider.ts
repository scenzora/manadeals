import "server-only";

import type { ProviderReading } from "@/lib/domains/state";

export type VerificationRecord = { type: string; domain: string; value: string };

export type ProviderDomainStatus = ProviderReading & { verification: VerificationRecord[] };

export class DomainProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

/** What the app needs from a hosting provider. Vercel today; Cloudflare/Caddy could implement the same. */
export interface DomainProvider {
  add(hostname: string, options?: { redirectTo?: string }): Promise<ProviderDomainStatus>;
  status(hostname: string): Promise<ProviderDomainStatus>;
  /** Ask the provider to re-run ownership verification. */
  verify(hostname: string): Promise<ProviderDomainStatus>;
  remove(hostname: string): Promise<void>;
}

const API = "https://api.vercel.com";

/**
 * Vercel Domains API client (project domains).
 * Docs: https://vercel.com/docs/rest-api/reference/endpoints/projects
 */
class VercelProvider implements DomainProvider {
  constructor(
    private readonly token: string,
    private readonly projectId: string,
    private readonly teamId?: string,
  ) {}

  private url(path: string) {
    const url = new URL(`${API}${path}`);
    if (this.teamId) url.searchParams.set("teamId", this.teamId);
    return url.toString();
  }

  private async call<T>(method: string, path: string, body?: unknown, tolerate: number[] = []): Promise<T | null> {
    const response = await fetch(this.url(path), {
      method,
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (tolerate.includes(response.status)) return null;
    const json = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & T;
    if (!response.ok) {
      const code = json.error?.code;
      const message =
        code === "domain_already_in_use" || code === "domain_taken"
          ? "That domain is already connected to another project"
          : (json.error?.message ?? `Vercel API error (${response.status})`);
      throw new DomainProviderError(message, response.status === 409 ? 409 : 502);
    }
    return json;
  }

  async status(hostname: string): Promise<ProviderDomainStatus> {
    const [project, config] = await Promise.all([
      this.call<{ verified?: boolean; verification?: VerificationRecord[] }>(
        "GET",
        `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`,
      ),
      this.call<{ misconfigured?: boolean }>("GET", `/v6/domains/${encodeURIComponent(hostname)}/config`),
    ]);
    return {
      verified: Boolean(project?.verified),
      verification: project?.verification ?? [],
      misconfigured: config?.misconfigured !== false,
    };
  }

  async add(hostname: string, options: { redirectTo?: string } = {}) {
    const added = await this.call<{ verified?: boolean; verification?: VerificationRecord[] }>(
      "POST",
      `/v10/projects/${this.projectId}/domains`,
      { name: hostname, ...(options.redirectTo ? { redirect: options.redirectTo, redirectStatusCode: 308 } : {}) },
    );
    // Adding returns ownership info, but not DNS health, so read both.
    const current = await this.status(hostname);
    return { ...current, verification: added?.verification?.length ? added.verification : current.verification };
  }

  async verify(hostname: string) {
    await this.call("POST", `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}/verify`);
    return this.status(hostname);
  }

  async remove(hostname: string) {
    // 404 means it is already gone, which is the outcome we want.
    await this.call("DELETE", `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`, undefined, [404]);
  }
}

/** Null when Vercel credentials are not configured; callers report "custom domains unavailable". */
export function getDomainProvider(): DomainProvider | null {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return new VercelProvider(token, projectId, process.env.VERCEL_TEAM_ID || undefined);
}
