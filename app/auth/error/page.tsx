/**
 * Authentication Error Page
 *
 * Displays user-friendly error messages when authentication fails.
 */

import { type Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Erreur de connexion - TrustDoc",
  description: "Une erreur est survenue lors de la connexion",
};

const errorMessages: Record<string, string> = {
  Configuration: "Un problème de configuration serveur est survenu.",
  AccessDenied: "Vous n'avez pas l'autorisation d'accéder à cette ressource.",
  Verification: "Le lien de vérification a expiré ou est invalide.",
  Default: "Une erreur inattendue est survenue lors de la connexion.",
};

export default function AuthErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error || "Default";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Erreur de connexion</h1>

          {/* Error message */}
          <p className="mb-6 text-gray-600">{message}</p>

          {/* Actions */}
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">Réessayer</Link>
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
