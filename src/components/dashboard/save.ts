"use client";

import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";

/** Saves one store section and reports the outcome; resolves to whether it worked. */
export async function saveSection(payload: { section: string } & Record<string, unknown>, message = "Saved") {
  try {
    await apiClient.patch("/api/owner/store", payload);
    toast.success(message);
    return true;
  } catch (error) {
    toast.error(error instanceof ApiClientError ? firstProblem(error) : "Could not save. Please try again.");
    return false;
  }
}

function firstProblem(error: ApiClientError) {
  const detail = error.details && Object.values(error.details)[0]?.[0];
  return detail ? `${error.message}: ${detail}` : error.message;
}
