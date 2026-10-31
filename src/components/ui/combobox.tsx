"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type ComboboxOption = { value: string; label: string };

/**
 * A dropdown you can type into: the list filters as you type, arrow keys move,
 * Enter picks, Escape closes. Drop-in replacement for a native select.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  function pick(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(Math.max(0, options.findIndex((option) => option.value === value)));
        }
      }}
    >
      <Popover.Trigger
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-[var(--muted-foreground)]")}>{selected?.label ?? placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-[var(--muted-foreground)]" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-56 rounded-md border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
        >
          <input
            autoFocus
            value={query}
            placeholder={searchPlaceholder}
            aria-label="Search options"
            className="mb-1 h-9 w-full rounded border border-[var(--border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--primary)]"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, filtered.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const option = filtered[active];
                if (option) pick(option);
              }
            }}
          />
          <ul role="listbox" className="max-h-60 overflow-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-sm text-[var(--muted-foreground)]">No matches</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  ref={(node) => {
                    if (node && index === active) node.scrollIntoView({ block: "nearest" });
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm",
                    index === active && "bg-[var(--muted)]",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(option)}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value ? <Check className="size-4 shrink-0 text-[var(--primary)]" /> : null}
                </li>
              ))
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
