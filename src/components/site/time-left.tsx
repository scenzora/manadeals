"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils/cn";

function format(ms: number) {
  if (ms <= 0) return "Ended";

  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min left`;
  if (hours < 24) return `${hours}h left`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} left`;
}

/**
 * Rendered on the client because it depends on the current time: computing it
 * during a server render would bake in a stale value and mismatch on hydration.
 */
export function TimeLeft({ endDate }: { endDate: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endDate).getTime();
    const tick = () => setRemaining(end - Date.now());

    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [endDate]);

  // Nothing is rendered until the first client tick, so server and client agree.
  if (remaining === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
        <Clock className="size-3.5" />
        Limited time
      </span>
    );
  }

  const ending = remaining < 48 * 3_600_000;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs",
        ending ? "font-medium text-[var(--destructive)]" : "text-[var(--muted-foreground)]",
      )}
    >
      <Clock className="size-3.5" />
      {format(remaining)}
    </span>
  );
}
