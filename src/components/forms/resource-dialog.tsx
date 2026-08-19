"use client";

import { useEffect } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ZodType } from "zod";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shared create/edit dialog: owns the form instance, validation, submission and
 * success/error toasts. Modules only supply their own fields.
 */
export function ResourceDialog<TInput extends FieldValues, TValues extends FieldValues>({
  open,
  onClose,
  onSaved,
  title,
  description,
  endpoint,
  recordId,
  schema,
  defaultValues,
  values,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  title: string;
  description?: string;
  /** Collection endpoint, e.g. "/api/admin/brands". */
  endpoint: string;
  /** When set the dialog issues a PUT to `${endpoint}/${recordId}`. */
  recordId?: string | null;
  /** Zod schema for TInput → TValues; typed loosely because the dialog is generic. */
  schema: ZodType<TValues, TInput>;
  defaultValues: DefaultValues<TInput>;
  /** Values to load when editing an existing record. */
  values?: DefaultValues<TInput> | null;
  className?: string;
  children: (form: UseFormReturn<TInput, unknown, TValues>) => React.ReactNode;
}) {
  const form = useForm<TInput, unknown, TValues>({
    resolver: zodResolver(schema) as Resolver<TInput, unknown, TValues>,
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(values ?? defaultValues);
    // `form` is stable; re-running on every render would wipe user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, values]);

  async function onSubmit(payload: TValues) {
    try {
      if (recordId) await apiClient.put(`${endpoint}/${recordId}`, payload);
      else await apiClient.post(endpoint, payload);
      toast.success(recordId ? "Changes saved" : "Created successfully");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your changes");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {children(form)}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {recordId ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
