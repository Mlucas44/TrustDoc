/**
 * 401 Unauthorized Page
 *
 * Displayed when a user tries to access a protected resource without authentication.
 */

import { type Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Non autorisé - TrustDoc",
  description: "Vous devez être connecté pour accéder à cette ressource",
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";
  const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-8 w-8 text-orange-600"
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

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Accès non autorisé</h1>

          {/* Message */}
          <p className="mb-6 text-gray-600">
            Vous devez être connecté pour accéder à cette ressource.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href={signInUrl}>Se connecter</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
