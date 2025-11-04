/**
 * Credits Balance Component
 *
 * Displays the user's current credit balance.
 * Fetches data from /api/credits endpoint.
 */

"use client";

import { Coins, Loader2 } from "lucide-react";
import useSWR from "swr";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CreditsResponse {
  credits: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CreditsBalance() {
  const { data, error, isLoading } = useSWR<CreditsResponse>("/api/credits", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erreur</CardTitle>
          <CardDescription>Impossible de charger votre solde de crédits</CardDescription>
        </CardHeader>
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
