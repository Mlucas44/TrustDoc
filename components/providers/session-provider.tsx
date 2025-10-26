"use client";

/**
 * NextAuth Session Provider
 *
 * Wraps the app to provide session context to all client components.
 * Must be used in the root layout.
 *
 * Usage in layout.tsx:
 * ```tsx
 * import { SessionProvider } from "@/components/providers/session-provider"
 *
 * <SessionProvider>
 *   {children}
 * </SessionProvider>
 * ```
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
