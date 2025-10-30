"use client";

/**
 * Client-side session hook
 *
 * Provides access to the session state in client components.
 */

import { useSession } from "next-auth/react";

/**
 * Get the current session on the client
 *
 * @returns Session state with loading/authenticated/unauthenticated status
 *
 * @example
 * ```tsx
 * "use client";
 * import { useSessionClient } from "@/src/auth/use-session";
 *
 * export function MyComponent() {
 *   const { data: session, status } = useSessionClient();
 *
 *   if (status === "loading") return <p>Loading...</p>;
 *   if (status === "unauthenticated") return <p>Please sign in</p>;
 *
 *   return <p>Welcome {session.user.email}</p>;
 * }
 * ```
 */
export function useSessionClient() {
  return useSession();
}
