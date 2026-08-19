"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { changePasswordSchema, type ChangePasswordInput, type ChangePasswordValues } from "@/lib/validations/auth";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminSession } from "@/types";

export function ProfileClient({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [name, setName] = useState(session.name);
  const [savingProfile, setSavingProfile] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput, unknown, ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await apiClient.put("/api/admin/profile", { name });
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(values: ChangePasswordValues) {
    try {
      await apiClient.post("/api/admin/profile", values);
      toast.success("Password changed. Other sessions have been signed out.");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your password");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="My profile" description="Your account details and password." />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            {session.email} · <Badge variant="navy">{session.roleName}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Full name" htmlFor="profileName">
            <Input id="profileName" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>

          <div className="flex justify-end">
            <Button loading={savingProfile} onClick={() => void saveProfile()}>
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Changing your password signs out every other device immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(changePassword)} className="space-y-4" noValidate>
            <Field
              label="Current password"
              htmlFor="currentPassword"
              error={errors.currentPassword?.message}
              required
            >
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
            </Field>

            <Field
              label="New password"
              htmlFor="newPassword"
              error={errors.password?.message}
              hint="At least 8 characters with an uppercase letter and a number"
              required
            >
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
            </Field>

            <Field
              label="Confirm new password"
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

            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Change password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
