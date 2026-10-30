"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { OwnerStore } from "@/lib/owner-page";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import { AffiliateForm, BrandingForm, CatalogForm, ThemeForm } from "@/components/dashboard/store-forms";

const STEPS = ["Name", "Theme", "Logo", "Affiliate IDs", "Categories", "Publish"];

function slugFrom(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function OnboardingWizard({ store, rootDomain }: { store: OwnerStore | null; rootDomain: string }) {
  const router = useRouter();
  const [step, setStep] = useState(store ? 1 : 0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<{ available: boolean; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Debounced availability check as the owner types an address.
  useEffect(() => {
    if (slug.length < 3) return;
    const timer = setTimeout(() => {
      apiClient
        .get<{ available: boolean; reason: string }>(`/api/owner/store/slug?slug=${encodeURIComponent(slug)}`)
        .then(setSlugState)
        .catch(() => setSlugState(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [slug]);

  const next = () => {
    router.refresh();
    setStep((current) => current + 1);
  };

  async function createStore() {
    setBusy(true);
    try {
      await apiClient.post("/api/owner/store", { name, slug });
      next();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? (Object.values(error.details ?? {})[0]?.[0] ?? error.message) : "Could not create the store");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    try {
      await apiClient.post("/api/owner/store/publish");
      toast.success("Your store is live!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
              index === step ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            {index < step ? <Check className="size-3" /> : null}
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-5 p-6">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">Name your store</h2>
              <Field label="Store name" htmlFor="w-name">
                <Input
                  id="w-name"
                  value={name}
                  maxLength={60}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) setSlug(slugFrom(event.target.value));
                  }}
                />
              </Field>
              <Field
                label="Store address"
                htmlFor="w-slug"
                error={slugState && !slugState.available ? slugState.reason : undefined}
                hint={slugState?.available ? "Available" : "You can connect your own domain later on Pro"}
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="w-slug"
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(event.target.value.toLowerCase());
                    }}
                  />
                  <span className="shrink-0 text-sm text-[var(--muted-foreground)]">.{rootDomain}</span>
                </div>
              </Field>
              <Button disabled={busy || name.trim().length < 3 || !slugState?.available} onClick={createStore}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Continue
              </Button>
            </>
          )}

          {step === 1 && store && (
            <>
              <h2 className="text-lg font-semibold">Pick your look</h2>
              <ThemeForm store={store} onSaved={next} submitLabel="Save and continue" />
            </>
          )}
          {step === 2 && store && (
            <>
              <h2 className="text-lg font-semibold">Add your logo</h2>
              <BrandingForm store={store} only="logo" onSaved={next} submitLabel="Save and continue" />
              <Button variant="ghost" onClick={next}>
                Skip for now
              </Button>
            </>
          )}
          {step === 3 && store && (
            <>
              <h2 className="text-lg font-semibold">Your affiliate IDs</h2>
              <AffiliateForm store={store} onSaved={next} submitLabel="Save and continue" />
              <Button variant="ghost" onClick={next}>
                Skip for now
              </Button>
            </>
          )}
          {step === 4 && store && (
            <>
              <h2 className="text-lg font-semibold">Choose what to sell</h2>
              <CatalogForm store={store} onSaved={next} submitLabel="Save and continue" />
            </>
          )}
          {step === 5 && store && (
            <>
              <h2 className="text-lg font-semibold">Ready to launch</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Your store will go live at <strong>{store.url}</strong>. You can change anything later from the dashboard.
              </p>
              <Button disabled={busy} onClick={publish}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Publish my store
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
