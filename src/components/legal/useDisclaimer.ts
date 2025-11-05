/**
 * useDisclaimer Hook
 *
 * Manages disclaimer banner dismissal state with cookie persistence.
 * Cookie: td_disclaimer_ack=1, expires in 365 days, sameSite=lax.
 *
 * Usage:
 * ```tsx
 * const { isDismissed, dismiss } = useDisclaimer();
 * ```
 */

"use client";

import { useState } from "react";

const COOKIE_NAME = "td_disclaimer_ack";
const COOKIE_VALUE = "1";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }

  return undefined;
}

/**
 * Set cookie with secure defaults
 */
function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;

  const cookieString = `${name}=${value}; max-age=${maxAge}; path=/; samesite=lax`;
  document.cookie = cookieString;
}

/**
 * Check if disclaimer has been dismissed
 */
export function isDisclaimerDismissed(): boolean {
  return getCookie(COOKIE_NAME) === COOKIE_VALUE;
}

/**
 * Hook to manage disclaimer state
 */
export function useDisclaimer() {
  // Initialize with lazy initialization to avoid SSR issues
  const [isDismissed, setIsDismissed] = useState(() => {
    // During SSR, always return false
    if (typeof window === "undefined") {
      return false;
    }
    return isDisclaimerDismissed();
  });

  /**
   * Dismiss the disclaimer and persist to cookie
   */
  const dismiss = () => {
    setCookie(COOKIE_NAME, COOKIE_VALUE, COOKIE_MAX_AGE);
    setIsDismissed(true);
  };

  return {
    isDismissed,
    dismiss,
  };
}
