/**
 * HTTP Error Utilities
 *
 * Centralized error mapping for API responses.
 * Converts domain errors to standardized HTTP responses.
 */

import { NextResponse } from "next/server";

import { InsufficientCreditsError } from "@/src/db/user.repo";
import { AnalysisInvalidError } from "@/src/schemas/analysis";
import { GuestQuotaExceededError } from "@/src/services/guest-quota";
import {
  LLMRateLimitError,
  LLMTransientError,
  LLMUnavailableError,
} from "@/src/services/llm/errors";

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Convert domain errors to standardized JSON error responses
 *
 * Maps known error types to appropriate HTTP status codes and error payloads.
 * Provides centralized error handling for consistent API responses.
 *
 * @param error - The error to convert
 * @param fallbackMessage - Optional fallback message if error is unknown (default: "Internal server error")
 * @returns NextResponse with appropriate status code and error payload
 *
 * @example
 * ```ts
 * // In API route handler:
 * try {
 *   await analyzeContract(...);
 * } catch (error) {
 *   return toJsonError(error);
 * }
 * ```
 */
export function toJsonError(
  error: unknown,
  fallbackMessage = "Internal server error"
): NextResponse<ErrorResponse> {
  // 1. InsufficientCreditsError → 402 Payment Required
  if (error instanceof InsufficientCreditsError) {
    console.warn(`[toJsonError] Insufficient credits for user ${error.userId}:`, {
      required: error.required,
      available: error.available,
    });

    return NextResponse.json(
      {
        error: error.message,
        code: "INSUFFICIENT_CREDITS",
        details: {
          userId: error.userId,
          required: error.required,
          available: error.available,
        },
      },
      { status: 402 }
    );
  }

  // 2. GuestQuotaExceededError → 402 Payment Required
  if (error instanceof GuestQuotaExceededError) {
    console.warn(`[toJsonError] Guest quota exceeded:`, error.message);

    return NextResponse.json(
      {
        error: error.message,
        code: "GUEST_QUOTA_EXCEEDED",
      },
      { status: 402 }
    );
  }

  // 3. LLMRateLimitError → 429 Too Many Requests
  if (error instanceof LLMRateLimitError) {
    console.warn(`[toJsonError] LLM rate limit exceeded for provider ${error.provider}:`, {
      retryAfter: error.retryAfter,
    });

    return NextResponse.json(
      {
        error: `Rate limit exceeded for ${error.provider}. Please try again later.`,
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          provider: error.provider,
          retryAfter: error.retryAfter,
        },
      },
      { status: 429 }
    );
  }

  // 4. LLMTransientError → 503 Service Unavailable
  if (error instanceof LLMTransientError) {
    console.warn(`[toJsonError] LLM transient error for provider ${error.provider}`);

    return NextResponse.json(
      {
        error: `Temporary error from ${error.provider}. Please try again.`,
        code: "LLM_TRANSIENT_ERROR",
        details: {
          provider: error.provider,
        },
      },
      { status: 503 }
    );
  }

  // 5. LLMUnavailableError → 503 Service Unavailable
  if (error instanceof LLMUnavailableError) {
    console.warn(`[toJsonError] LLM provider ${error.provider} unavailable`);

    return NextResponse.json(
      {
        error: `LLM provider ${error.provider} is unavailable. Please try again later.`,
        code: "LLM_UNAVAILABLE",
        details: {
          provider: error.provider,
        },
      },
      { status: 503 }
    );
  }

  // 6. AnalysisInvalidError → 422 Unprocessable Entity
  if (error instanceof AnalysisInvalidError) {
    console.warn(`[toJsonError] Analysis output invalid after retries:`, {
      validationErrors: error.validationErrors,
    });

    return NextResponse.json(
      {
        error: "Analysis failed: LLM output could not be validated",
        code: "ANALYSIS_INVALID_OUTPUT",
        details: {
          validationErrors: error.validationErrors,
        },
      },
      { status: 422 }
    );
  }

  // 7. Unknown error → 500 Internal Server Error
  console.error("[toJsonError] Unknown error:", error);

  return NextResponse.json(
    {
      error: fallbackMessage,
      code: "INTERNAL_ERROR",
      details:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : undefined,
    },
    { status: 500 }
  );
}

/**
 * Helper to create a standardized error response
 *
 * @param code - Error code (e.g., "INSUFFICIENT_CREDITS")
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional details
 * @returns NextResponse with error payload
 *
 * @example
 * ```ts
 * return createErrorResponse(
 *   "UNAUTHENTICATED",
 *   "Please sign in to continue",
 *   401
 * );
 * ```
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
    },
    { status }
  );
}
