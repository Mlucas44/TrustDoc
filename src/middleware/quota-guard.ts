/**
 * Quota Guard Middleware
 *
 * Checks if user has available quota (credits or guest quota) before allowing analysis.
 * Server-side middleware for protecting analysis endpoints.
 */

import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { getSession } from "@/src/auth/session";
import {
  getOrCreateGuestId,
  checkGuestQuota,
  GuestQuotaExceededError,
} from "@/src/services/guest-quota";

export interface QuotaCheckResult {
  allowed: boolean;
  isGuest: boolean;
  userId?: string;
  guestId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Check if user or guest has available quota
 *
 * Priority:
 * 1. If authenticated user → check credits (handled by credit system)
 * 2. If guest → check guest quota (max 3 analyses)
 *
 * @returns QuotaCheckResult with allowed status and user/guest info
 *
 * @example
 * ```ts
 * const result = await requireQuotaOrUserCredit();
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: result.error, code: result.errorCode },
 *     { status: 402 }
 *   );
 * }
 * ```
 */
export async function requireQuotaOrUserCredit(): Promise<QuotaCheckResult> {
  // Check if user is authenticated
  const session = await getSession();

  if (session?.user?.id) {
    // User is authenticated - check credits
    const user = await getCurrentUser();

    if (!user) {
      return {
        allowed: false,
        isGuest: false,
        error: "User not found",
        errorCode: "USER_NOT_FOUND",
      };
    }

    // Check if user has credits
    if (user.credits <= 0) {
      return {
        allowed: false,
        isGuest: false,
        userId: user.id,
        error: "Insufficient credits. Please purchase more credits to continue.",
        errorCode: "INSUFFICIENT_CREDITS",
      };
    }

    return {
      allowed: true,
      isGuest: false,
      userId: user.id,
    };
  }

  // User is NOT authenticated - check guest quota
  try {
    const guestId = await getOrCreateGuestId();
    await checkGuestQuota(guestId);

    return {
      allowed: true,
      isGuest: true,
      guestId,
    };
  } catch (error) {
    if (error instanceof GuestQuotaExceededError) {
      return {
        allowed: false,
        isGuest: true,
        error: error.message,
        errorCode: "GUEST_QUOTA_EXCEEDED",
      };
    }

    // Unknown error
    console.error("[requireQuotaOrUserCredit] Error:", error);
    return {
      allowed: false,
      isGuest: true,
      error: "Failed to check quota",
      errorCode: "QUOTA_CHECK_FAILED",
    };
  }
}
