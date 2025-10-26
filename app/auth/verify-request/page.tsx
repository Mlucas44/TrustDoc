/**
 * Email Verification Request Page
 *
 * Shown after user requests a magic link sign-in.
 * Informs them to check their email.
 */

import { type Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Vérifiez votre email - TrustDoc",
  description: "Un lien de connexion a été envoyé à votre adresse email",
};

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Vérifiez votre email</h1>

          {/* Description */}
          <p className="mb-6 text-gray-600">
            Un lien de connexion sécurisé a été envoyé à votre adresse email.
            <br />
            Cliquez sur le lien pour vous connecter.
          </p>

          {/* Tips */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4 text-left">
            <p className="mb-2 text-sm font-medium text-gray-900">Conseils :</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Le lien expire dans 24 heures</li>
              <li>• Vérifiez vos spams si vous ne voyez rien</li>
              <li>• Vous pouvez fermer cette page</li>
            </ul>
          </div>

          {/* Back button */}
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signin">Retour à la connexion</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
