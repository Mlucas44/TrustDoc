/**
 * Analysis Not Found Page
 *
 * Custom 404 page for analysis routes
 */

import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Analysis Not Found Page
 *
 * Displayed when:
 * - Analysis ID doesn't exist
 * - Analysis has been deleted
 * - User doesn't own the analysis (security: don't reveal existence)
 */
export default function AnalysisNotFound() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight mb-4">Analyse introuvable</h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Cette analyse n&apos;existe pas ou vous n&apos;avez pas les autorisations nécessaires pour
          y accéder.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/history">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l&apos;historique
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>

        {/* Help text */}
        <div className="mt-8 p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, vérifiez que l&apos;URL est
            correcte ou contactez le support.
          </p>
        </div>
      </div>
    </div>
  );
}
