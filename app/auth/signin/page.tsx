/**
 * Sign-In Page
 *
 * Provides two authentication methods:
 * 1. Google OAuth (one-click sign-in)
 * 2. Email magic link (passwordless)
 */

import { type Metadata } from "next";

import { SignInForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Se connecter - TrustDoc",
  description: "Connectez-vous pour analyser vos contrats en toute sécurité",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">TrustDoc</h1>
          <p className="mt-2 text-gray-600">Analysez vos contrats en toute confiance</p>
        </div>

        {/* Sign-in form */}
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Se connecter</h2>
          <SignInForm />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-600">
          En vous connectant, vous acceptez nos{" "}
          <a href="/legal/terms" className="text-blue-600 hover:underline">
            Conditions d&apos;utilisation
          </a>{" "}
          et notre{" "}
          <a href="/legal/privacy" className="text-blue-600 hover:underline">
            Politique de confidentialité
          </a>
        </p>
      </div>
    </div>
  );
}
