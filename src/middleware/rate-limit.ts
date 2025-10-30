/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiting based on IP address.
 * Uses a sliding window algorithm to track requests.
 *
 * NOTE: This is a basic implementation suitable for single-server deployments.
 * For production multi-server setups, use Redis or a distributed rate limiter.
 */

import "server-only";

import { type NextRequest } from "next/server";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Custom identifier function (defaults to IP address)
   */
  identifier?: (request: NextRequest) => string | null;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  /**
   * Number of requests remaining in current window
   */
  remaining: number;
  /**
   * Total limit
   */
  limit: number;
  /**
   * Time until window resets (milliseconds)
   */
  resetIn: number;
}

/**
 * Request tracking entry
 */
interface RequestEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory store for rate limiting
 */
const store = new Map<string, RequestEntry>();

/**
 * Cleanup interval (every 60 seconds)
 */
const CLEANUP_INTERVAL_MS = 60 * 1000;

/**
 * Periodic cleanup of expired entries
 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      store.delete(key);
    }

    if (keysToDelete.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[RateLimit] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
if (typeof window === "undefined") {
  startCleanup();
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string | null {
  // Check headers in order of preference
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to localhost (not reliable in production, but works for development)
  return "127.0.0.1";
}

/**
 * Check rate limit for a request
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Rate limit result
 *
 * @example
 * ```ts
 * const result = checkRateLimit(request, {
 *   maxRequests: 5,
 *   windowMs: 60 * 1000, // 1 minute
 * });
 *
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: "Too many requests", resetIn: result.resetIn },
 *     { status: 429 }
 *   );
 * }
 * ```
 */
export function checkRateLimit(request: NextRequest, config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowMs, identifier } = config;

  // Get identifier (IP address or custom)
  const id = identifier ? identifier(request) : getClientIp(request);

  if (!id) {
    // Cannot identify client - allow by default (log warning)
    console.warn("[RateLimit] Cannot identify client, allowing request");
    return {
      allowed: true,
      remaining: maxRequests,
      limit: maxRequests,
      resetIn: windowMs,
    };
  }

  const now = Date.now();
  const entry = store.get(id);

  // No entry or expired window - create new entry
  if (!entry || entry.resetAt <= now) {
    store.set(id, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      limit: maxRequests,
      resetIn: windowMs,
    };
  }

  // Entry exists and window is active
  const count = entry.count + 1;

  // Check if limit exceeded
  if (count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      limit: maxRequests,
      resetIn: entry.resetAt - now,
    };
  }

  // Update count
  entry.count = count;

  return {
    allowed: true,
    remaining: maxRequests - count,
    limit: maxRequests,
    resetIn: entry.resetAt - now,
  };
}

/**
 * Rate limit guard - throws error if limit exceeded
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @throws {RateLimitExceededError} If rate limit exceeded
 *
 * @example
 * ```ts
 * try {
 *   await requireRateLimit(request, {
 *     maxRequests: 5,
 *     windowMs: 60 * 1000,
 *   });
 *   // Proceed with request
 * } catch (error) {
 *   if (error instanceof RateLimitExceededError) {
 *     return NextResponse.json(
 *       { error: error.message, resetIn: error.resetIn },
 *       { status: 429 }
 *     );
 *   }
 * }
 * ```
 */
export async function requireRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const result = checkRateLimit(request, config);

  if (!result.allowed) {
    throw new RateLimitExceededError(result);
  }

  return result;
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends Error {
  constructor(public readonly rateLimit: RateLimitResult) {
    super(`Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`);
    this.name = "RateLimitExceededError";
  }
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore() {
  store.clear();
}

/**
 * Get store size (for debugging)
 */
export function getRateLimitStoreSize(): number {
  return store.size;
}
