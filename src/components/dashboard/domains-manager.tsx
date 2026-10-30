"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type DnsRecord = { type: string; name: string; value: string; purpose: string };
type DomainInfo = {
  hostname: string;
  primaryHostname: string;
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "pending" | "active" | "failed";
  lastCheckedAt: string | null;
  lastError: string;
  records: DnsRecord[];
};
type DnsCheck = { host: string; ok: boolean; message: string };
type Overview = { allowed: boolean; domain: DomainInfo | null };

const STATUS_VARIANT = { pending: "warning", verified: "success", failed: "danger" } as const;
const SSL_VARIANT = { pending: "warning", active: "success", failed: "danger" } as const;

function CopyButton({ value }: { value: string }) {
  return (
    <button
      type="button"
      aria-label={`Copy ${value}`}
      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copied"))}
    >
      <Copy className="size-3.5" />
    </button>
  );
}

export function DomainsManager() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState<"connect" | "check" | "remove" | null>(null);
  const [dnsChecks, setDnsChecks] = useState<DnsCheck[]>([]);

  const load = useCallback(() => {
    apiClient.get<Overview>("/api/owner/domains").then(setOverview).catch(() => toast.error("Could not load domains"));
  }, []);
  useEffect(load, [load]);

  async function run<T>(kind: "connect" | "check" | "remove", action: () => Promise<T>, onDone?: (result: T) => void) {
    setBusy(kind);
    try {
      onDone?.(await action());
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (!overview) return <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>;

  if (!overview.allowed) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="space-y-2 p-6 text-sm">
          <p className="font-medium">Custom domains are part of the Pro plan.</p>
          <p className="text-[var(--muted-foreground)]">
            Your store stays available on its free address.{" "}
            <Link href="/dashboard/plan" className="font-medium text-[var(--primary)] underline">
              See plans
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  const domain = overview.domain;

  if (!domain) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="space-y-4 p-6">
          <Field label="Your domain" htmlFor="d-host" hint="For example johndeals.in. We recommend www as the main address.">
            <Input id="d-host" placeholder="johndeals.in" value={hostname} onChange={(e) => setHostname(e.target.value)} />
          </Field>
          <Button
            disabled={busy !== null || hostname.trim().length < 4}
            onClick={() =>
              run("connect", () => apiClient.post("/api/owner/domains", { hostname }), () => {
                setHostname("");
                load();
              })
            }
          >
            {busy === "connect" ? <Loader2 className="animate-spin" /> : null}
            Connect domain
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-medium">{domain.primaryHostname}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {domain.lastCheckedAt ? `Last checked ${new Date(domain.lastCheckedAt).toLocaleString("en-IN")}` : "Not checked yet"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            Domain <Badge variant={STATUS_VARIANT[domain.verificationStatus]}>{domain.verificationStatus}</Badge>
            SSL <Badge variant={SSL_VARIANT[domain.sslStatus]}>{domain.sslStatus}</Badge>
          </div>
        </CardContent>
      </Card>

      {domain.verificationStatus !== "verified" ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Add these records at your domain registrar</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.records.map((record) => (
                    <tr key={`${record.type}-${record.name}`} className="border-b border-[var(--border)] last:border-0 align-top">
                      <td className="py-2 pr-3 font-mono">{record.type}</td>
                      <td className="py-2 pr-3 font-mono">
                        <span className="inline-flex items-center gap-2">
                          {record.name} <CopyButton value={record.name} />
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono">
                        <span className="inline-flex items-center gap-2 break-all">
                          {record.value} <CopyButton value={record.value} />
                        </span>
                        <span className="block font-sans text-xs text-[var(--muted-foreground)]">{record.purpose}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Many Indian registrars can&apos;t point the bare domain with a CNAME, which is why <strong>www</strong> is the main
              address and the bare domain redirects to it. DNS changes can take up to a few hours.
            </p>
            {domain.verificationStatus === "failed" ? (
              <p className="text-sm font-medium text-[var(--destructive)]">
                We couldn&apos;t verify this domain. Fix the records above and check again, or remove and reconnect it.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-[var(--success)]">
          Your store is live at{" "}
          <a className="underline" href={`https://${domain.primaryHostname}`} target="_blank" rel="noopener noreferrer">
            {domain.primaryHostname}
          </a>
          .
        </p>
      )}

      {dnsChecks.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {dnsChecks.map((check) => (
            <li key={check.host} className="flex items-start gap-2">
              {check.ok ? <Check className="mt-0.5 size-4 text-[var(--success)]" /> : <X className="mt-0.5 size-4 text-[var(--destructive)]" />}
              <span>
                <span className="font-mono">{check.host}</span> — {check.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Button
          disabled={busy !== null}
          onClick={() =>
            run(
              "check",
              () => apiClient.post<{ dns: DnsCheck[] }>("/api/owner/domains/check"),
              (result) => {
                setDnsChecks(result.dns);
                load();
              },
            )
          }
        >
          {busy === "check" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Check DNS
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm("Remove this domain? Your store stays available on its free address.")) return;
            run("remove", () => apiClient.delete("/api/owner/domains"), () => {
              setDnsChecks([]);
              load();
            });
          }}
        >
          <Trash2 /> Remove
        </Button>
      </div>
    </div>
  );
}
