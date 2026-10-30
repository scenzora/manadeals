import { ok } from "@/lib/api";
import { clearOwnerCookie } from "@/lib/owner-auth";

export const runtime = "nodejs";

export async function POST() {
  await clearOwnerCookie();
  return ok({ loggedOut: true });
}
