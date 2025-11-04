/**
 * Credit Packs Grid Component
 *
 * Displays available credit packs as cards with purchase buttons.
 */

"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getAllPacks, type PackType } from "@/src/constants/billing";

export function CreditPacksGrid() {
  const [loadingPack, setLoadingPack] = useState<PackType | null>(null);
  const { toast } = useToast();
  const packs = getAllPacks();

  const handlePurchase = async (pack: PackType) => {
    setLoadingPack(pack);

    try {
      // Call checkout API
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pack }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Erreur lors de la création de la session de paiement");
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la création de la session de paiement",
        variant: "destructive",
      });
      setLoadingPack(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {packs.map((pack) => (
        <Card
          key={pack.id}
          className={`relative ${pack.popular ? "border-primary shadow-lg" : ""}`}
        >
          {pack.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                <Sparkles className="h-3 w-3" />
                Populaire
              </div>
            </div>
          )}

          <CardHeader>
            <CardTitle>{pack.name}</CardTitle>
            <CardDescription>{pack.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Price */}
            <div>
              <div className="text-4xl font-bold">{pack.priceFormatted}</div>
              <div className="text-sm text-muted-foreground mt-1">Paiement unique</div>
            </div>

            {/* Credits */}
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Check className="h-5 w-5 text-primary" />
              {pack.credits} crédits
            </div>

            {/* Features */}
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Analyses de documents
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Pas d&apos;expiration
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Paiement sécurisé
              </li>
            </ul>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={() => handlePurchase(pack.id)}
              disabled={loadingPack !== null}
              variant={pack.popular ? "default" : "outline"}
            >
              {loadingPack === pack.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirection...
                </>
              ) : (
                "Acheter"
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
