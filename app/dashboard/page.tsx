/**
 * Dashboard Page
 *
 * Protected page that shows user info, credits, and upload functionality.
 */

import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/src/auth/current-user";
import { DashboardUploadSection } from "@/src/components/dashboard/DashboardUploadSection";

export default async function DashboardPage() {
  // Require authentication - will throw UnauthorizedError if not authenticated
  const user = await requireCurrentUser();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={`Bienvenue, ${user.name || "utilisateur"}`}
        description="Analysez vos contrats en toute confiance"
      />

      {/* Credits Info Banner */}
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">Crédits disponibles: {user.credits}</span>
            <span className="ml-2 text-sm text-muted-foreground">
              • Chaque analyse coûte 1 crédit
            </span>
          </div>
          {user.credits === 0 && (
            <Button asChild size="sm">
              <Link href="/credits">Acheter des crédits</Link>
            </Button>
          )}
        </AlertDescription>
      </Alert>

      {/* Upload Section */}
      <DashboardUploadSection userCredits={user.credits} />

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mes analyses</CardTitle>
            <CardDescription>Consultez l&apos;historique de vos analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/history">Voir l&apos;historique</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acheter des crédits</CardTitle>
            <CardDescription>Rechargez votre compte pour plus d&apos;analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/credits">Voir les offres</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
