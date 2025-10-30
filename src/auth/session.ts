/**
 * Server-side session helpers
 *
 * Provides utilities for reading and requiring authentication sessions
 * in React Server Components (RSC).
 */

import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/src/auth";

/**
 * Get the current session from NextAuth
 *
 * @returns The session object or null if not authenticated
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { getSession } from "@/src/auth/session";
 *
 * export default async function MyPage() {
 *   const session = await getSession();
 *   if (!session) return <p>Please sign in</p>;
 *   return <p>Welcome {session.user.email}</p>;
 * }
 * ```
 */
export async function getSession() {
  return await auth();
}

/**
 * Require authentication or redirect to sign-in
 *
 * @param options - Configuration options
 * @param options.redirectTo - URL to redirect to if not authenticated (default: /auth/signin)
 * @param options.callbackUrl - URL to return to after sign-in (default: current page)
 * @returns The authenticated session
 * @throws Redirects to sign-in page if not authenticated
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { requireSession } from "@/src/auth/session";
 *
 * export default async function ProtectedPage() {
 *   const session = await requireSession();
 *   return <p>Welcome {session.user.email}</p>;
 * }
 * ```
 */
export async function requireSession(options?: { redirectTo?: string; callbackUrl?: string }) {
  const session = await auth();

  if (!session || !session.user) {
    const redirectTo = options?.redirectTo || "/auth/signin";
    const callbackUrl = options?.callbackUrl;

    if (callbackUrl) {
      redirect(`${redirectTo}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    redirect(redirectTo);
  }

  return session;
}
