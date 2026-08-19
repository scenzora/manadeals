"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { loginSchema, type LoginInput, type LoginValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox, Field, Label } from "@/components/ui/form-field";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await apiClient.post("/api/admin/auth/login", values);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Unable to sign in. Please try again.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Image
          src="/logo.png"
          alt="ManaDeals.online"
          width={720}
          height={239}
          priority
          className="mb-2 h-10 w-auto object-contain lg:hidden"
        />
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to the admin panel</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Use your ManaDeals administrator credentials to continue.
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[#fef3f2] px-4 py-3 text-sm text-[var(--destructive)]"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@manadeals.online"
            {...register("email")}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={watch("remember")}
              onCheckedChange={(checked) => setValue("remember", checked === true)}
            />
            <Label htmlFor="remember" className="cursor-pointer font-normal">
              Remember me
            </Label>
          </div>
          <Link
            href="/admin/forgot-password"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Protected area. All sign-in attempts are logged.
      </p>
    </div>
  );
}
