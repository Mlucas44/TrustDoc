/**
 * Rate Limiting Middleware - Token Bucket Algorithm
 *
 * Implements token bucket with burst support for precise rate limiting.
 * Uses in-memory storage (Map) in development. Can be extended to use Redis/KV in production.
 *
 * Features:
 * - Token bucket algorithm with burst tolerance
 * - IP-based identification with proper proxy header handling
 * - Route-specific policies with environment variable overrides
 * - Observable metrics for monitoring (429 count by route)
 * - Automatic cleanup of expired buckets
 * - Standard X-RateLimit-* headers
 *
 * Security:
 * - No PII stored (IP addresses in memory only, not persisted)
 * - Admin bypass support (future)
 * - Configurable via environment variables
 */

import "server-only";

import { type NextRequest } from "next/server";

import { getRateLimitPolicy, shouldBypassRateLimit } from "@/src/constants/rate";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional burst tolerance (extra tokens allowed) */
  burst?: number;
  /** Custom identifier function (defaults to IP address) */
  identifier?: (request: NextRequest) => string | null;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Total limit */
  limit: number;
  /** Time until window resets (milliseconds) */
  resetIn: number;
}

/**
 * Token bucket state
 */
interface TokenBucket {
  /** Number of tokens remaining */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Number of requests made (for metrics) */
  requestCount: number;
}

/**
 * In-memory token bucket storage
 * Key format: "ip:route" or custom identifier
 */
const buckets = new Map<string, TokenBucket>();

/**
 * Metrics for observability
 */
const metrics = {
  totalBlocked: 0,
  blockedByRoute: new Map<string, number>(),
};

/**
 * Cleanup interval for expired buckets (every 5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start cleanup timer
 */
function startCleanupTimer() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, bucket] of buckets.entries()) {
      // Remove buckets that haven't been accessed in 10 minutes
      if (now - bucket.lastRefill > 10 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      buckets.delete(key);
    }

    if (process.env.NODE_ENV === "development" && expiredKeys.length > 0) {
      console.info(`[RateLimit] Cleaned up ${expiredKeys.length} expired buckets`);
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent process from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Get client IP address from request
 *
 * Priority order:
 * 1. x-forwarded-for (Vercel, most proxies) - first IP in the list
 * 2. x-real-ip (Nginx, some proxies)
 * 3. cf-connecting-ip (Cloudflare)
 * 4. Fallback: "127.0.0.1" (dev) or "0.0.0.0" (prod)
 */
export function getClientIp(request: NextRequest): string {
  // Try x-forwarded-for (Vercel standard)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the list (client IP)
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    const clientIp = ips[0];
    if (clientIp && isValidIp(clientIp)) {
      return normalizeIp(clientIp);
    }
  }

  // Try x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp)) {
    return normalizeIp(realIp);
  }

  // Try Cloudflare connecting IP
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp)) {
    return normalizeIp(cfIp);
  }

  // Fallback
  if (process.env.NODE_ENV === "development") {
    return "127.0.0.1"; // localhost for dev
  }

  return "0.0.0.0"; // fallback for production
}

/**
 * Validate IP address format (basic validation)
 */
function isValidIp(ip: string): boolean {
  if (!ip) return false;
  ip = ip.trim();

  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 validation (simple)
  if (ip.includes(":")) {
    return true; // Accept any colon-containing address as IPv6
  }

  return false;
}

/**
 * Normalize IP address (compress IPv6)
 */
function normalizeIp(ip: string): string {
  ip = ip.trim();

  // IPv4: return as-is
  if (ip.includes(".") && !ip.includes(":")) {
    return ip;
  }

  // IPv6: simple normalization (remove leading zeros)
  return ip
    .split(":")
    .map((group) => {
      const trimmed = group.replace(/^0+/, "");
      return trimmed || "0";
    })
    .join(":");
}

/**
 * Get or create a token bucket
 */
function getBucket(key: string, limit: number, burst: number = 0): TokenBucket {
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: limit + burst,
      lastRefill: Date.now(),
      requestCount: 0,
    };
    buckets.set(key, bucket);

    // Start cleanup timer on first bucket creation
    startCleanupTimer();
  }

  return bucket;
}

/**
 * Refill tokens based on elapsed time (token bucket algorithm)
 */
function refillTokens(bucket: TokenBucket, config: RateLimitConfig, now: number): void {
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor((elapsed / config.windowMs) * config.maxRequests);

  if (tokensToAdd > 0) {
    const maxTokens = config.maxRequests + (config.burst || 0);
    bucket.tokens = Math.min(bucket.tokens + tokensToAdd, maxTokens);
    bucket.lastRefill = now;
  }
}

/**
 * Check rate limit for a request
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(request: NextRequest, config: RateLimitConfig): RateLimitResult {
  // Check if rate limiting should be bypassed
  if (shouldBypassRateLimit()) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetIn: config.windowMs,
    };
  }

  const { maxRequests, windowMs, identifier, burst = 0 } = config;

  // Get identifier (IP address or custom)
  const id = identifier ? identifier(request) : getClientIp(request);

  if (!id || id === "0.0.0.0") {
    // Cannot identify client - log warning and allow
    console.warn("[RateLimit] Cannot identify client, allowing request");
    return {
      allowed: true,
      remaining: maxRequests,
      limit: maxRequests,
      resetIn: windowMs,
    };
  }

  const now = Date.now();
  const bucket = getBucket(id, maxRequests, burst);

  // Refill tokens based on elapsed time
  refillTokens(bucket, config, now);

  // Calculate reset time
  const resetAt = bucket.lastRefill + windowMs;
  const resetIn = resetAt - now;

  // Check if request is allowed
  const allowed = bucket.tokens >= 1;

  if (allowed) {
    bucket.tokens -= 1;
    bucket.requestCount += 1;
  }

  return {
    allowed,
    remaining: Math.max(0, Math.floor(bucket.tokens)),
    limit: maxRequests,
    resetIn: Math.max(0, resetIn),
  };
}

/**
 * Check rate limit with route-based policy
 *
 * Automatically loads policy from src/constants/rate.ts
 *
 * @param request - Next.js request object
 * @param route - Route path (e.g., "/api/upload")
 * @returns Rate limit result
 */
export function checkRateLimitForRoute(
  request: NextRequest,
  route: string
): RateLimitResult | null {
  const policy = getRateLimitPolicy(route);

  if (!policy) {
    // No policy defined for this route - allow
    return null;
  }

  // Build unique key: "ip:route"
  const ip = getClientIp(request);
  const identifier = () => `${ip}:${route}`;

  const result = checkRateLimit(request, {
    maxRequests: policy.limit,
    windowMs: policy.windowMs,
    burst: policy.burst,
    identifier,
  });

  // Update metrics if blocked
  if (!result.allowed) {
    metrics.totalBlocked += 1;
    const routeBlocked = metrics.blockedByRoute.get(route) || 0;
    metrics.blockedByRoute.set(route, routeBlocked + 1);

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.warn(`[RateLimit] Blocked: ${route}`, {
        ip,
        remaining: result.remaining,
        resetIn: `${Math.ceil(result.resetIn / 1000)}s`,
        limit: result.limit,
      });
    }
  }

  return result;
}

/**
 * Rate limit guard - throws error if limit exceeded
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @throws {RateLimitExceededError} If rate limit exceeded
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
 * Get rate limit headers for response
 *
 * Standard rate limit headers:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests remaining
 * - X-RateLimit-Reset: Unix epoch timestamp when limit resets
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor((Date.now() + result.resetIn) / 1000)),
  };
}

/**
 * Get current metrics (for debugging/monitoring)
 */
export function getRateLimitMetrics() {
  return {
    totalBlocked: metrics.totalBlocked,
    blockedByRoute: Object.fromEntries(metrics.blockedByRoute),
    activeBuckets: buckets.size,
  };
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore() {
  buckets.clear();
  metrics.totalBlocked = 0;
  metrics.blockedByRoute.clear();
}

/**
 * Get store size (for debugging)
 */
export function getRateLimitStoreSize(): number {
  return buckets.size;
}
