/**
 * Billing Cancel Page
 *
 * Displayed when user cancels Stripe Checkout.
 * Provides options to retry or return to credits page.
 */

import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/src/auth/current-user";

export default async function BillingCancelPage() {
  // Require authentication
  await requireCurrentUser();

  return (
    <div className="container mx-auto max-w-2xl py-16 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">Paiement annulé</CardTitle>
          <CardDescription className="text-base">
            Vous avez annulé le processus de paiement
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Information */}
          <div className="space-y-3 text-sm text-muted-foreground text-center">
            <p>Aucun montant n&apos;a été débité de votre compte.</p>
            <p>
              Vous pouvez réessayer à tout moment ou revenir plus tard pour acheter des crédits.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild variant="default" className="flex-1">
              <Link href="/credits">
                <RotateCcw className="mr-2 h-4 w-4" />
                Réessayer
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tableau de bord
              </Link>
            </Button>
          </div>

          {/* Help text */}
          <div className="rounded-lg border bg-muted/50 p-4 mt-6">
            <p className="text-xs text-muted-foreground text-center">
              Vous rencontrez un problème ? Contactez notre support pour obtenir de l&apos;aide.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
