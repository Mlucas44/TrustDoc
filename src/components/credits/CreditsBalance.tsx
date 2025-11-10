/**
 * Credits Balance Component
 *
 * Displays the user's current credit balance.
 * Fetches data from /api/credits endpoint.
 */

"use client";

import { AlertTriangle, Coins, Loader2, RefreshCw } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CreditsResponse {
  credits: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CreditsBalance() {
  const { data, error, isLoading, mutate } = useSWR<CreditsResponse>("/api/credits", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Erreur de chargement
          </CardTitle>
          <CardDescription>Impossible de charger votre solde de crédits</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => mutate()} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Solde actuel
        </CardTitle>
        <CardDescription>Vos crédits disponibles pour l&apos;analyse de documents</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Chargement...</span>
          </div>
        ) : (
          <div className="text-4xl font-bold">
            {data?.credits ?? 0}
            <span className="text-xl font-normal text-muted-foreground ml-2">crédits</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
