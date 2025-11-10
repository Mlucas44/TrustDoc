"use client";

/**
 * OnboardingBanner Component
 *
 * Shows a welcome banner to new users with:
 * - Welcome message
 * - Free credits information
 * - Quick start guide
 * - Dismissible with localStorage persistence
 */

import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const ONBOARDING_STORAGE_KEY = "trustdoc_onboarding_dismissed";

interface OnboardingBannerProps {
  userName?: string | null;
  userCredits: number;
}

export function OnboardingBanner({ userName, userCredits }: OnboardingBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    // Initialize from localStorage on mount
    if (typeof window !== "undefined") {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    }
    return true;
  });

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Alert className="bg-primary/10 border-primary relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
        aria-label="Fermer le message de bienvenue"
      >
        <X className="h-4 w-4" />
      </Button>

      <AlertDescription className="space-y-3 pr-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">
            Bienvenue sur TrustDoc{userName ? `, ${userName}` : ""} !
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <strong>Vous avez reçu {userCredits} crédits offerts</strong> pour commencer à analyser
            vos contrats.
          </p>

          <div className="space-y-1">
            <p className="font-medium">Commencez en 3 étapes :</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Glissez-déposez un contrat PDF ci-dessous</li>
              <li>Confirmez l&apos;analyse (1 crédit)</li>
              <li>Consultez les résultats et points d&apos;attention</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Astuce : Vos crédits n&apos;expirent jamais ! Achetez-en plus quand vous en avez
            besoin.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
