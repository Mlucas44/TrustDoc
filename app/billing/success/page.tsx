/**
 * Billing Success Page
 *
 * Displayed after successful Stripe Checkout redirect.
 * Shows payment confirmation message.
 * Credits will be added by webhook (not here).
 */

import { CheckCircle2, Coins, History } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/src/auth/current-user";

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export default async function BillingSuccessPage(props: SuccessPageProps) {
  // Require authentication
  await requireCurrentUser();

  const searchParams = await props.searchParams;
  const sessionId = searchParams.session_id;

  return (
    <div className="container mx-auto max-w-2xl py-16 px-4">
      <Card className="border-primary">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl">Paiement en cours de validation</CardTitle>
          <CardDescription className="text-base">
            Votre paiement a été reçu et est en cours de traitement
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Session ID (for debugging/support) */}
          {sessionId && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">Identifiant de session</p>
              <p className="text-xs font-mono text-muted-foreground break-all">{sessionId}</p>
            </div>
          )}

          {/* Information */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Vos crédits seront ajoutés à votre compte dans quelques instants, dès que le paiement
              sera confirmé par notre système.
            </p>
            <p>Vous recevrez une confirmation par email une fois le traitement terminé.</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild variant="default" className="flex-1">
              <Link href="/credits?success=true">
                <Coins className="mr-2 h-4 w-4" />
                Voir mes crédits
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <History className="mr-2 h-4 w-4" />
                Tableau de bord
              </Link>
            </Button>
          </div>

          {/* Help text */}
          <div className="rounded-lg border bg-muted/50 p-4 mt-6">
            <p className="text-xs text-muted-foreground text-center">
              Si vos crédits n&apos;apparaissent pas dans les 5 minutes, veuillez contacter le
              support en fournissant l&apos;identifiant de session ci-dessus.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
