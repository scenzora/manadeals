"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function PublishButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiClient.post("/api/owner/store/publish");
          toast.success("Your store is live!");
          router.refresh();
        } catch (error) {
          toast.error(error instanceof ApiClientError ? error.message : "Could not publish");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : null}
      Publish store
    </Button>
  );
}
