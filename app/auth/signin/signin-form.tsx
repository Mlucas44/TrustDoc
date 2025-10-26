"use client";

/**
 * Sign-In Form Component
 *
 * Client component that handles:
 * - Google OAuth sign-in
 * - Email magic link sign-in
 * - Loading states
 * - Error handling
 */

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle Google OAuth sign-in
   */
  async function handleGoogleSignIn() {
    try {
      setIsGoogleLoading(true);
      setError(null);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      setError("Une erreur est survenue lors de la connexion avec Google");
      setIsGoogleLoading(false);
    }
  }

  /**
   * Handle email magic link sign-in
   */
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      setError("Veuillez entrer votre adresse email");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn("nodemailer", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Une erreur est survenue lors de l'envoi de l'email");
        setIsLoading(false);
      } else {
        setEmailSent(true);
        setIsLoading(false);
      }
    } catch (err) {
      setError("Une erreur est survenue");
      setIsLoading(false);
    }
  }

  // Show success message after email sent
  if (emailSent) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <AlertDescription className="text-green-800">
          <strong>Email envoyé !</strong>
          <br />
          Vérifiez votre boîte de réception et cliquez sur le lien de connexion.
          <br />
          <span className="text-sm text-green-700">
            (Pensez à vérifier vos spams si vous ne voyez rien)
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Google sign-in */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
      >
        {isGoogleLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connexion en cours...
          </>
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Ou par email</span>
        </div>
      </div>

      {/* Email sign-in */}
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || isGoogleLoading}
            required
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Recevoir un lien de connexion"
          )}
        </Button>
      </form>

      {/* Info text */}
      <p className="text-center text-sm text-gray-600">
        Pas de mot de passe nécessaire - nous vous enverrons un lien sécurisé par email
      </p>
    </div>
  );
}
