import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { next } = await searchParams;
  // Only allow same-site relative redirects.
  const safeNext = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";

  return <LoginForm nextPath={safeNext} />;
}
