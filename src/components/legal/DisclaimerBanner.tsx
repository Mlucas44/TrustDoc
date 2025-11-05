/**
 * Disclaimer Banner Component
 *
 * Displays a legal disclaimer informing users that TrustDoc is an assistance tool
 * and does not provide legal advice. Supports internationalization (FR/EN),
 * dismissal with cookie persistence, and multiple display variants.
 *
 * Features:
 * - Two variants: "page" (full width) and "inline" (discrete under content)
 * - i18n support: French (default) and English
 * - Optional dismissal with 365-day cookie (td_disclaimer_ack=1)
 * - WCAG AA compliant: contrast, focus, dark mode support
 * - Screen reader friendly: role="status" + aria-live="polite"
 */

"use client";

import { Scale, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useDisclaimer } from "./useDisclaimer";

export interface DisclaimerBannerProps {
  /**
   * Display variant
   * - "page": Full width banner, more prominent
   * - "inline": Discrete banner below content blocks
   */
  variant?: "page" | "inline";

  /**
   * Locale for text display
   * - "fr": French (default)
   * - "en": English
   */
  locale?: "fr" | "en";

  /**
   * Allow user to dismiss the banner
   * - true: Show "Compris" button and persist dismissal in cookie
   * - false: Always visible
   */
  dismissible?: boolean;
}

const DISCLAIMER_TEXT = {
  fr: {
    title: "Information importante",
    description:
      "TrustDoc est un outil d'assistance. Les résultats fournis ne constituent pas un avis juridique. Pour toute décision, consultez un professionnel du droit.",
    learnMore: "En savoir plus",
    dismiss: "Compris",
  },
  en: {
    title: "Important Notice",
    description:
      "TrustDoc is an assistance tool. Results are not legal advice. Consult a qualified attorney for decisions.",
    learnMore: "Learn more",
    dismiss: "Got it",
  },
} as const;

export function DisclaimerBanner({
  variant = "inline",
  locale = "fr",
  dismissible = true,
}: DisclaimerBannerProps) {
  const { isDismissed, dismiss } = useDisclaimer();
  const [isVisible, setIsVisible] = useState(!isDismissed);

  // Don't render if dismissed
  if (!isVisible) {
    return null;
  }

  const text = DISCLAIMER_TEXT[locale] || DISCLAIMER_TEXT.fr;

  const handleDismiss = () => {
    setIsVisible(false);
    dismiss();
  };

  return (
    <Alert
      role="status"
      aria-live="polite"
      className={`
        border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950
        ${variant === "page" ? "w-full" : ""}
      `}
    >
      <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-200">{text.title}</AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300">
        {text.description}{" "}
        <Link
          href="/legal"
          className="underline hover:text-blue-900 dark:hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-blue-950"
        >
          {text.learnMore}
        </Link>
      </AlertDescription>

      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-300 dark:hover:text-blue-100 dark:hover:bg-blue-900"
          onClick={handleDismiss}
          aria-label={text.dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}

/**
 * Get disclaimer text for server-side rendering or static exports
 */
export function getDisclaimerText(locale: "fr" | "en" = "fr"): string {
  const text = DISCLAIMER_TEXT[locale] || DISCLAIMER_TEXT.fr;
  return text.description;
}
