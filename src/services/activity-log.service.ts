import type { NextRequest } from "next/server";

import ActivityLog from "@/models/ActivityLog";
import { clientIp } from "@/lib/api";
import type { AdminSession } from "@/types";

type LogInput = {
  session: Pick<AdminSession, "id" | "name" | "email"> | null;
  action: "create" | "update" | "delete" | "login" | "logout" | "login-failed" | "import" | "export";
  module: string;
  recordId?: string;
  description?: string;
  request?: NextRequest;
  before?: unknown;
  after?: unknown;
};

/** Strips fields that must never end up in an audit trail. */
function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value ?? null;
  const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of ["passwordHash", "password", "apiKey", "apiSecret", "smtpPassword", "resetTokenHash"]) {
    if (key in clone) clone[key] = "[redacted]";
  }
  return clone;
}

/**
 * Audit trail writer. Never throws: a logging failure must not break the action
 * the admin just performed.
 */
export async function logActivity(input: LogInput) {
  try {
    await ActivityLog.create({
      admin: input.session?.id ?? null,
      adminName: input.session?.name ?? "System",
      adminEmail: input.session?.email ?? "",
      action: input.action,
      module: input.module,
      recordId: input.recordId ?? "",
      description: input.description ?? "",
      ipAddress: input.request ? clientIp(input.request) : "",
      userAgent: input.request?.headers.get("user-agent") ?? "",
      beforeValue: redact(input.before),
      afterValue: redact(input.after),
    });
  } catch (error) {
    console.error("[activity-log] failed to write entry", error);
  }
}
