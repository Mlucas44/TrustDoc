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
  credits?: number;
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
 * @param route - Optional route name for telemetry logging
 * @returns QuotaCheckResult with allowed status and user/guest info
 *
 * @example
 * ```ts
 * const result = await requireQuotaOrUserCredit("/api/analyze");
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: result.error, code: result.errorCode },
 *     { status: 402 }
 *   );
 * }
 * ```
 */
export async function requireQuotaOrUserCredit(route?: string): Promise<QuotaCheckResult> {
  const startTime = performance.now();
  const session = await getSession();

  if (session?.user?.id) {
    const user = await getCurrentUser();

    if (!user) {
      const duration = performance.now() - startTime;
      console.warn(`[requireQuotaOrUserCredit] User not found`, {
        userId: session.user.id,
        route,
        duration: `${duration.toFixed(2)}ms`,
      });

      return {
        allowed: false,
        isGuest: false,
        error: "User not found",
        errorCode: "USER_NOT_FOUND",
      };
    }

    if (user.credits <= 0) {
      const duration = performance.now() - startTime;

      // Telemetry: Log 402 refusal for authenticated users
      console.warn(`[requireQuotaOrUserCredit] Insufficient credits (402)`, {
        userId: user.id,
        credits: user.credits,
        route: route || "unknown",
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        allowed: false,
        isGuest: false,
        userId: user.id,
        error: "Insufficient credits. Please purchase more credits to continue.",
        errorCode: "INSUFFICIENT_CREDITS",
      };
    }

    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV === "development") {
      console.info(`[requireQuotaOrUserCredit] Quota check passed`, {
        userId: user.id,
        credits: user.credits,
        route: route || "unknown",
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    return {
      allowed: true,
      isGuest: false,
      userId: user.id,
      credits: user.credits,
    };
  }

  try {
    const guestId = await getOrCreateGuestId();
    await checkGuestQuota(guestId);

    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV === "development") {
      console.info(`[requireQuotaOrUserCredit] Guest quota check passed`, {
        guestId,
        route: route || "unknown",
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    return {
      allowed: true,
      isGuest: true,
      guestId,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    if (error instanceof GuestQuotaExceededError) {
      // Telemetry: Log 402 refusal for guests
      console.warn(`[requireQuotaOrUserCredit] Guest quota exceeded (402)`, {
        route: route || "unknown",
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        allowed: false,
        isGuest: true,
        error: error.message,
        errorCode: "GUEST_QUOTA_EXCEEDED",
      };
    }

    // Unknown error
    console.error("[requireQuotaOrUserCredit] Error:", error, {
      route: route || "unknown",
      duration: `${duration.toFixed(2)}ms`,
    });

    return {
      allowed: false,
      isGuest: true,
      error: "Failed to check quota",
      errorCode: "QUOTA_CHECK_FAILED",
    };
  }
}
