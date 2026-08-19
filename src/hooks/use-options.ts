"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

export type Option = { value: string; label: string };

/**
 * Loads lightweight {value,label} lists used to populate select inputs
 * (categories, brands, networks, roles) without pulling full documents.
 */
export function useOptions(resource: "categories" | "brands" | "affiliate-networks" | "roles" | "products") {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Fetching on mount/params change is the intended use of an effect here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiClient
      .get<Option[]>(`/api/admin/${resource}/options`)
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource]);

  return { options, loading };
}
