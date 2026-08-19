/**
 * Small in-memory fixed-window limiter for auth endpoints. Good enough for a
 * single Node instance; swap the store for Redis when running multi-region.
 */
type Bucket = { count: number; resetAt: number };

const globalWithBuckets = globalThis as typeof globalThis & {
  __manadealsRateLimit?: Map<string, Bucket>;
};

const buckets = globalWithBuckets.__manadealsRateLimit ?? new Map<string, Bucket>();
globalWithBuckets.__manadealsRateLimit = buckets;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Periodically drop expired buckets so the map cannot grow unbounded. */
if (!globalWithBuckets.__manadealsRateLimit || buckets.size === 0) {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}
