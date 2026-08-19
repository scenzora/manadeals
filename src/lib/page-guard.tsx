import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { getSession } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/states";
import type { AdminSession } from "@/types";

/**
 * Server-side guard for admin pages. Returns the session when the admin holds
 * any of the required permissions, otherwise renders a friendly 403 panel.
 * API routes are guarded independently, so this is purely about the UI.
 */
export async function guardPage(permissions: string[]): Promise<
  { session: AdminSession; denied: null } | { session: null; denied: React.ReactElement }
> {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  if (permissions.length > 0 && !hasAnyPermission(session, permissions)) {
    return {
      session: null,
      denied: (
        <EmptyState
          icon={<ShieldAlert className="size-6" />}
          title="You do not have access to this module"
          description="Ask a super admin to grant your role the required permission."
        />
      ),
    };
  }

  return { session, denied: null };
}
