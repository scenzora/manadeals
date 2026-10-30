"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";

export function OwnerAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await apiClient.post(`/api/owner/auth/${mode}`, signup ? values : { email: values.email, password: values.password });
          router.replace("/dashboard");
          router.refresh();
        } catch (failure) {
          setError(
            failure instanceof ApiClientError
              ? (Object.values(failure.details ?? {})[0]?.[0] ?? failure.message)
              : "Something went wrong. Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{signup ? "Launch your deals store" : "Welcome back"}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {signup ? "Your own branding, your own affiliate IDs, ManaDeals' catalogue." : "Sign in to manage your store."}
        </p>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-[var(--destructive)]" role="alert">{error}</p> : null}

      {signup ? (
        <Field label="Your name" htmlFor="o-name">
          <Input id="o-name" autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="o-email">
        <Input id="o-email" type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} required />
      </Field>
      <Field label="Password" htmlFor="o-pass" hint={signup ? "At least 8 characters" : undefined}>
        <Input
          id="o-pass"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {signup ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {signup ? "Already have a store?" : "New here?"}{" "}
        <Link href={signup ? "/dashboard/login" : "/dashboard/signup"} className="font-medium text-[var(--primary)] underline">
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
