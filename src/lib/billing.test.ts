import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  addMonths,
  formatInvoiceNumber,
  nextTerm,
  splitTax,
  subscriptionState,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./billing";

const d = (iso: string) => new Date(iso);

describe("nextTerm", () => {
  const now = d("2026-06-01T00:00:00Z");

  it("starts now for a first purchase or a lapsed plan", () => {
    expect(nextTerm(null, now).start).toEqual(now);
    expect(nextTerm(d("2026-05-01T00:00:00Z"), now).end).toEqual(d("2027-06-01T00:00:00Z"));
  });

  it("stacks an early renewal after the current expiry", () => {
    const term = nextTerm(d("2026-07-10T00:00:00Z"), now);
    expect(term.start).toEqual(d("2026-07-10T00:00:00Z"));
    expect(term.end).toEqual(d("2027-07-10T00:00:00Z"));
  });
});

describe("addMonths", () => {
  it("clamps to the end of a shorter month", () => {
    expect(addMonths(d("2026-01-31T00:00:00Z"), 1)).toEqual(d("2026-02-28T00:00:00Z"));
    expect(addMonths(d("2027-02-28T00:00:00Z"), 12)).toEqual(d("2028-02-28T00:00:00Z"));
  });
});

describe("subscriptionState", () => {
  const now = d("2026-06-01T00:00:00Z");
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

  it("walks through the lifecycle", () => {
    expect(subscriptionState("free", null, now).state).toBe("free");
    expect(subscriptionState("pro", null, now).state).toBe("manual");
    expect(subscriptionState("pro", days(60), now).state).toBe("active");
    expect(subscriptionState("pro", days(10), now).state).toBe("expiring");
    expect(subscriptionState("pro", days(-3), now).state).toBe("grace");
    expect(subscriptionState("pro", days(-8), now).state).toBe("expired");
  });
});

describe("splitTax", () => {
  it("leaves the total untouched without GST", () => {
    expect(splitTax(99_900, 0)).toEqual({ subtotal: 99_900, tax: 0, total: 99_900 });
  });

  it("extracts GST from a tax-inclusive price", () => {
    const result = splitTax(99_900, 18);
    expect(result.subtotal + result.tax).toBe(99_900);
    expect(result.subtotal).toBe(84_661);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads the sequence", () => expect(formatInvoiceNumber(2026, 7)).toBe("MD-2026-00007"));
});

describe("signatures", () => {
  const sign = (secret: string, payload: string) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

  it("accepts a genuine checkout signature and rejects tampering", () => {
    const signature = sign("secret", "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_1", signature, "secret")).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", signature, "secret")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", signature, "")).toBe(false);
  });

  it("verifies webhook bodies", () => {
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(body, sign("hook", body), "hook")).toBe(true);
    expect(verifyWebhookSignature(`${body} `, sign("hook", body), "hook")).toBe(false);
  });
});
