"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function ProductGallery({
  images,
  alt,
  discountPercentage,
}: {
  images: string[];
  alt: string;
  discountPercentage: number;
}) {
  const [active, setActive] = useState(0);
  const gallery = images.filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {gallery[active] ? (
          <Image
            src={gallery[active]!}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-contain p-6"
            priority
            unoptimized
          />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-10 text-[var(--muted-foreground)]" />
        )}

        {discountPercentage > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--primary)] px-3 py-1 text-sm font-semibold text-white">
            {discountPercentage}% off
          </span>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {gallery.map((image, index) => (
            <button
              key={image}
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border bg-white",
                index === active ? "border-[var(--primary)]" : "border-[var(--border)]",
              )}
            >
              <Image src={image} alt="" fill sizes="64px" className="object-contain p-1" unoptimized />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
