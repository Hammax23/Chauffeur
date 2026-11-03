import "server-only";
import { getRedis, redisKey } from "@/lib/redis";

/**
 * Shared rate limiting — Redis when available, otherwise in-process Map.
 * Never fail-open (unlimited); Redis errors degrade to memory, not skip.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

function memoryCheck(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetIn: Math.ceil(options.windowMs / 1000),
    };
  }

  if (entry.count >= options.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: options.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/** Atomic INCR + PEXPIRE on first hit (avoids orphan keys without TTL). */
const INCR_EXPIRE_LUA = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {n, ttl}
`;

async function redisCheck(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const redis = getRedis();
  if (!redis) return null;

  const key = redisKey("rl", identifier);
  try {
    const raw = (await redis.eval(
      INCR_EXPIRE_LUA,
      1,
      key,
      String(options.windowMs)
    )) as [number, number];
    const count = Number(raw[0]);
    const pttl = Number(raw[1]);
    const resetIn = Math.max(
      1,
      Math.ceil((pttl > 0 ? pttl : options.windowMs) / 1000)
    );

    if (count > options.maxRequests) {
      return { success: false, remaining: 0, resetIn };
    }
    return {
      success: true,
      remaining: Math.max(0, options.maxRequests - count),
      resetIn,
    };
  } catch (err) {
    console.warn("[rate-limit] redis error, memory fallback:", err);
    return null;
  }
}

/**
 * Check if a request from the given identifier is within rate limits.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 60 * 1000 }
): Promise<RateLimitResult> {
  const fromRedis = await redisCheck(identifier, options);
  if (fromRedis) return fromRedis;
  return memoryCheck(identifier, options);
}

/** Extract client IP from request headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
