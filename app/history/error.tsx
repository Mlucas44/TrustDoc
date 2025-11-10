"use client";

/**
 * Error Boundary for History Page
 *
 * Catches and displays errors that occur during data fetching
 * with a retry button for better UX.
 */

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HistoryError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("History page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="border-destructive">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="font-semibold text-lg mb-2">Erreur de chargement</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Une erreur est survenue lors du chargement de votre historique. Veuillez réessayer.
          </p>
          {error.message && (
            <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted px-3 py-2 rounded">
              {error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>Réessayer</Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Retour au dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
