/**
 * Rate Limiting Policies
 *
 * Defines rate limits for API routes to prevent abuse and protect resources.
 * All limits are per IP address.
 */

/**
 * Rate limit policy definition
 */
export interface RateLimitPolicy {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional burst tolerance (extra tokens allowed) */
  burst?: number;
  /** Policy description for logging */
  description: string;
}

/**
 * Rate limit policies by route
 *
 * Limits are intentionally strict to:
 * - Prevent spam and abuse
 * - Protect LLM API costs
 * - Stabilize response times
 * - Reduce load on infrastructure
 */
export const RATE_LIMITS: Record<string, RateLimitPolicy> = {
  /**
   * File upload endpoint
   * 5 requests per minute per IP
   * Burst: +2 for legitimate quick retries
   */
  "/api/upload": {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
    burst: 2,
    description: "Upload file",
  },

  /**
   * LLM analysis endpoint
   * 3 requests per 5 minutes per IP
   * Very strict due to high LLM costs
   */
  "/api/analyze": {
    limit: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    burst: 1,
    description: "LLM analysis",
  },

  /**
   * Text preparation endpoint (parse + normalize)
   * 5 requests per minute per IP
   */
  "/api/prepare": {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
    burst: 2,
    description: "Prepare text",
  },
} as const;

/**
 * Environment variable overrides for rate limits
 * Allows customization without code changes
 */
export function getRateLimitPolicy(route: string): RateLimitPolicy | null {
  const policy = RATE_LIMITS[route];
  if (!policy) return null;

  // Check for environment variable overrides
  const envKey = route.replace(/\//g, "_").replace(/^_/, "").toUpperCase();

  return {
    ...policy,
    limit: parseInt(process.env[`RATE_${envKey}_LIMIT`] || String(policy.limit), 10),
    windowMs: parseInt(process.env[`RATE_${envKey}_WINDOW_MS`] || String(policy.windowMs), 10),
  };
}

/**
 * Check if rate limiting should be bypassed for admin users
 * Future feature: bypass rate limits for admin role
 */
export function shouldBypassRateLimit(): boolean {
  return process.env.BYPASS_RATE_LIMIT_FOR_ADMIN === "true";
}
