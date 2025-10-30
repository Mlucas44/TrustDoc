/**
 * Credits Guard Middleware
 *
 * Validates that authenticated user has sufficient credits before allowing analysis.
 * Server-side middleware for protecting analysis endpoints.
 */

import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { InsufficientCreditsError, UserRepo } from "@/src/db/user.repo";

export interface CreditsCheckResult {
  allowed: boolean;
  userId?: string;
  credits?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Ensure user has sufficient credits
 *
 * Validates that the authenticated user has at least `count` credits available.
 * Returns detailed result indicating whether operation is allowed.
 *
 * @param count - Number of credits required (default: 1)
 * @returns CreditsCheckResult with allowed status and user info
 *
 * @example
 * ```ts
 * // In API route handler:
 * const result = await ensureHasCredits(1);
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: result.error, code: result.errorCode },
 *     { status: result.errorCode === "UNAUTHENTICATED" ? 401 : 402 }
 *   );
 * }
 * ```
 */
export async function ensureHasCredits(count = 1): Promise<CreditsCheckResult> {
  try {
    // 1. Check authentication
    const user = await getCurrentUser();

    if (!user) {
      return {
        allowed: false,
        error: "Authentication required. Please sign in to continue.",
        errorCode: "UNAUTHENTICATED",
      };
    }

    // 2. Get current credits
    const credits = await UserRepo.getCredits(user.id);

    // 3. Validate sufficient credits
    if (credits < count) {
      return {
        allowed: false,
        userId: user.id,
        credits,
        error: `Insufficient credits. You have ${credits} credit${credits !== 1 ? "s" : ""}, but ${count} ${count !== 1 ? "are" : "is"} required.`,
        errorCode: "INSUFFICIENT_CREDITS",
      };
    }

    // 4. All checks passed
    return {
      allowed: true,
      userId: user.id,
      credits,
    };
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return {
        allowed: false,
        userId: error.userId,
        credits: error.available,
        error: error.message,
        errorCode: "INSUFFICIENT_CREDITS",
      };
    }

    // Unknown error
    console.error("[ensureHasCredits] Error:", error);
    return {
      allowed: false,
      error: "Failed to check credits",
      errorCode: "CREDITS_CHECK_FAILED",
    };
  }
}
