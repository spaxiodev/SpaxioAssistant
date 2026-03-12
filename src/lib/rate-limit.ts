type Counter = {
  count: number;
  resetAt: number;
};

// Use a global map so it survives hot reloads in dev
const globalAny = globalThis as typeof globalThis & { __spaxioRateLimit?: Map<string, Counter> };

if (!globalAny.__spaxioRateLimit) {
  globalAny.__spaxioRateLimit = new Map<string, Counter>();
}

const store = globalAny.__spaxioRateLimit;

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = Math.max(1000, options.windowMs);
  const limit = Math.max(1, options.limit);
  const key = options.key;

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

