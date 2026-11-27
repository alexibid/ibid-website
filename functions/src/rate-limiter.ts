export interface RateLimiterOptions {
  readonly maxRequests?: number;
  readonly windowMs?: number;
  readonly maxKeys?: number;
  readonly now?: () => number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export interface SlidingWindowRateLimiter {
  consume(key: string): RateLimitResult;
  reset(): void;
}

const DEFAULT_MAX_REQUESTS = 5;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_KEYS = 10_000;

function pruneExpiredEntries(entries: Map<string, number[]>, cutoff: number): void {
  for (const [entryKey, timestamps] of entries) {
    const active = timestamps.filter((timestamp) => timestamp > cutoff);
    if (active.length === 0) {
      entries.delete(entryKey);
    } else if (active.length !== timestamps.length) {
      entries.set(entryKey, active);
    }
  }
}

function evictOverflowEntries(entries: Map<string, number[]>, maxKeys: number): void {
  while (entries.size >= maxKeys) {
    const oldest = entries.keys().next();
    if (oldest.done) {
      break;
    }
    entries.delete(oldest.value);
  }
}

export function createSlidingWindowRateLimiter(
  options: RateLimiterOptions = {},
): SlidingWindowRateLimiter {
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const now = options.now ?? (() => Date.now());

  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new Error('maxRequests must be a positive integer');
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be a positive number');
  }
  if (!Number.isInteger(maxKeys) || maxKeys < 1) {
    throw new Error('maxKeys must be a positive integer');
  }

  const entries = new Map<string, number[]>();

  return {
    consume(rawKey: string): RateLimitResult {
      const key = rawKey.trim() || 'unknown';
      const currentTime = now();
      const cutoff = currentTime - windowMs;

      const existing = entries.get(key) ?? [];
      const active = existing.filter((timestamp) => timestamp > cutoff);
      if (active.length === 0 && entries.has(key)) {
        entries.delete(key);
      }

      if (!entries.has(key) && entries.size >= maxKeys) {
        pruneExpiredEntries(entries, cutoff);
        evictOverflowEntries(entries, maxKeys);
      }

      if (active.length >= maxRequests) {
        entries.delete(key);
        entries.set(key, active);
        const retryAfterMs = Math.max(1, active[0] + windowMs - currentTime);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        };
      }

      active.push(currentTime);
      entries.delete(key);
      entries.set(key, active);

      return {
        allowed: true,
        remaining: maxRequests - active.length,
        retryAfterSeconds: 0,
      };
    },

    reset(): void {
      entries.clear();
    },
  };
}
