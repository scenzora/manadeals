"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { resetPasswordSchema, type ResetPasswordInput, type ResetPasswordValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput, unknown, ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    try {
      await apiClient.post("/api/admin/auth/reset-password", values);
      toast.success("Password updated. Please sign in.");
      router.replace("/admin/login");
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Invalid reset link</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          This link is missing its token. Request a new one to continue.
        </p>
        <Button asChild className="w-full">
          <Link href="/admin/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Use at least 8 characters with an uppercase letter and a number.
        </p>
      </div>

      {formError ? (
        <p role="alert" className="rounded-lg bg-[#fef3f2] px-4 py-3 text-sm text-[var(--destructive)]">
          {formError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <input type="hidden" {...register("token")} />
        <Field label="New password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted-foreground)]">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
