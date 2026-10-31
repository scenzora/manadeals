"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Browsers offer "Save as PDF" in the print dialog, so this doubles as PDF download. */
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer />
      Print / Save as PDF
    </Button>
  );
}
