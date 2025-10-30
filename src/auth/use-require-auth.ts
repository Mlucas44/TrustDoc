"use client";

/**
 * Client-side authentication requirement hook
 *
 * Redirects to sign-in if the user is not authenticated.
 */

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

import { useSessionClient } from "./use-session";

/**
 * Require authentication on the client or redirect to sign-in
 *
 * @param options - Configuration options
 * @param options.redirectTo - URL to redirect to if not authenticated (default: /auth/signin)
 * @param options.preserveCallbackUrl - Whether to preserve current page as callback URL (default: true)
 *
 * @example
 * ```tsx
 * "use client";
 * import { useRequireAuth } from "@/src/auth/use-require-auth";
 *
 * export function ProtectedComponent() {
 *   const { session, loading } = useRequireAuth();
 *
 *   if (loading) return <p>Loading...</p>;
 *
 *   return <p>Welcome {session.user.email}</p>;
 * }
 * ```
 */
export function useRequireAuth(options?: { redirectTo?: string; preserveCallbackUrl?: boolean }) {
  const { data: session, status } = useSessionClient();
  const router = useRouter();
  const pathname = usePathname();

  const redirectTo = options?.redirectTo || "/auth/signin";
  const preserveCallbackUrl = options?.preserveCallbackUrl ?? true;

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      const callbackUrl = preserveCallbackUrl ? pathname : undefined;
      const url = callbackUrl
        ? `${redirectTo}?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : redirectTo;

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(`[useRequireAuth] Redirecting unauthenticated user to ${url}`);
      }

      router.push(url);
    }
  }, [status, router, redirectTo, pathname, preserveCallbackUrl]);

  return {
    session,
    loading: status === "loading",
    authenticated: status === "authenticated",
  };
}
