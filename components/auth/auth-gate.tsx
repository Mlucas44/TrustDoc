"use client";

/**
 * AuthGate Component
 *
 * Conditionally renders children based on authentication status.
 * Shows a sign-in CTA if the user is not authenticated.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSessionClient } from "@/src/auth/use-session";

interface AuthGateProps {
  children: ReactNode;
  /**
   * Custom fallback to show when not authenticated
   */
  fallback?: ReactNode;
  /**
   * Whether to show loading state
   */
  showLoading?: boolean;
  /**
   * Loading fallback component
   */
  loadingFallback?: ReactNode;
}

/**
 * Gate component that requires authentication
 *
 * @example
 * ```tsx
 * <AuthGate>
 *   <ProtectedContent />
 * </AuthGate>
 * ```
 */
export function AuthGate({
  children,
  fallback,
  showLoading = true,
  loadingFallback,
}: AuthGateProps) {
  const { data: session, status } = useSessionClient();
  const pathname = usePathname();

  const callbackUrl = encodeURIComponent(pathname);
  const signInUrl = `/auth/signin?callbackUrl=${callbackUrl}`;

  if (status === "loading") {
    if (!showLoading) return null;

    if (loadingFallback) return <>{loadingFallback}</>;

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h2 className="mb-2 text-xl font-semibold">Authentification requise</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Vous devez être connecté pour accéder à cette ressource.
          </p>

          <Button asChild className="w-full">
            <Link href={signInUrl}>Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
