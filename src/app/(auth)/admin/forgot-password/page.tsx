"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { forgotPasswordSchema, type ForgotPasswordInput, type ForgotPasswordValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput, unknown, ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    try {
      await apiClient.post("/api/admin/auth/forgot-password", values);
      setSent(true);
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : "Something went wrong.");
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
          <MailCheck className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Check your inbox</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            If that email belongs to an admin account, a password reset link is on its way. The link
            expires in 30 minutes.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/admin/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enter your admin email and we will send you a reset link.
        </p>
      </div>

      {formError ? (
        <p role="alert" className="rounded-lg bg-[#fef3f2] px-4 py-3 text-sm text-[var(--destructive)]">
          {formError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <Link
        href="/admin/login"
        className="flex items-center justify-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
