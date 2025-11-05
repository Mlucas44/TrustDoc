/**
 * Payment Success Banner Component
 *
 * Displays a success banner after returning from Stripe Checkout.
 * Shows when URL contains ?success=true query parameter.
 * Auto-dismissible and disappears after user closes it.
 */

"use client";

import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PaymentSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams.get("success");
  const [visible, setVisible] = useState(success === "true");

  const handleClose = () => {
    setVisible(false);
    // Remove success param from URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  if (!visible) {
    return null;
  }

  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-800 dark:text-green-200">Paiement réussi</AlertTitle>
      <AlertDescription className="text-green-700 dark:text-green-300">
        Votre paiement a été reçu avec succès. Vos crédits seront crédités sous quelques secondes.
        Rafraîchissez la page pour voir votre nouveau solde.
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        onClick={handleClose}
        aria-label="Fermer la notification"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
