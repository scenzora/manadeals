/**
 * Verification state machine for custom domains. Pure, so every transition is
 * covered by tests.
 *
 *   pending  – waiting for the owner's DNS / ownership proof
 *   verified – serving traffic; SSL is issued by the host automatically
 *   failed   – gave up waiting (pending too long) or a live domain broke
 *
 * A live domain is only demoted after several consecutive bad checks, so one
 * transient DNS or API blip does not take a store offline.
 */
export type VerificationStatus = "pending" | "verified" | "failed";
export type SslStatus = "pending" | "active" | "failed";

export const PENDING_GIVE_UP_MS = 7 * 24 * 60 * 60 * 1000;
export const FAILED_CHECKS_BEFORE_DEMOTION = 3;

export type DomainState = {
  verificationStatus: VerificationStatus;
  sslStatus: SslStatus;
  failedChecks: number;
};

export type ProviderReading = {
  /** Ownership proven with the hosting provider. */
  verified: boolean;
  /** DNS does not point at us (yet, or any more). */
  misconfigured: boolean;
};

export function nextDomainState(
  previous: DomainState,
  reading: ProviderReading,
  context: { createdAt: Date; now: Date },
): DomainState {
  const healthy = reading.verified && !reading.misconfigured;

  if (healthy) {
    return { verificationStatus: "verified", sslStatus: "active", failedChecks: 0 };
  }

  // A domain that was serving: tolerate a few bad readings before demoting it.
  if (previous.verificationStatus === "verified") {
    const failedChecks = previous.failedChecks + 1;
    return failedChecks >= FAILED_CHECKS_BEFORE_DEMOTION
      ? { verificationStatus: "failed", sslStatus: "failed", failedChecks }
      : { ...previous, failedChecks };
  }

  // Never verified (or already failed): keep waiting until the give-up window closes.
  const age = context.now.getTime() - context.createdAt.getTime();
  if (age > PENDING_GIVE_UP_MS) {
    return { verificationStatus: "failed", sslStatus: "failed", failedChecks: previous.failedChecks + 1 };
  }
  return { verificationStatus: "pending", sslStatus: "pending", failedChecks: previous.failedChecks };
}
