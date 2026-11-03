import "server-only";
import Redis from "ioredis";

/**
 * Shared Redis client for abuse protection + short-TTL caches.
 * REDIS_URL unset or unreachable → callers use in-memory fallback (never skip limits).
 */

const globalForRedis = globalThis as typeof globalThis & {
  __sarjRedis?: Redis | null;
  __sarjRedisDisabledLogged?: boolean;
};

function redisUrl(): string {
  return (process.env.REDIS_URL || "").trim();
}

export function isRedisConfigured(): boolean {
  return redisUrl().length > 0;
}

/** Lazy singleton. Returns null when Redis is not configured. */
export function getRedis(): Redis | null {
  const url = redisUrl();
  if (!url) return null;

  if (globalForRedis.__sarjRedis !== undefined) {
    return globalForRedis.__sarjRedis;
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 2_000,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1_000);
      },
    });

    client.on("error", (err) => {
      if (!globalForRedis.__sarjRedisDisabledLogged) {
        globalForRedis.__sarjRedisDisabledLogged = true;
        console.warn("[redis] connection error — using memory fallback:", err.message);
      }
    });

    // If Redis never becomes ready, callers still catch command errors and
    // fall back to memory — never skip limits / fail-open.
    globalForRedis.__sarjRedis = client;
    return client;
  } catch (err) {
    console.warn("[redis] init failed — memory fallback:", err);
    globalForRedis.__sarjRedis = null;
    return null;
  }
}

/** Key namespace so a shared Redis instance does not collide with other apps. */
export function redisKey(...parts: string[]): string {
  return ["sarj", ...parts.map((p) => String(p).replace(/:/g, "_"))].join(":");
}
