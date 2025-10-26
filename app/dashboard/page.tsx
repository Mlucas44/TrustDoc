/**
 * Dashboard Page
 *
 * Protected page that shows user info and credits after successful authentication.
 */

import { redirect } from "next/navigation";

import { requireAuth } from "@/src/lib/auth-helpers";

export default async function DashboardPage() {
  // Require authentication
  const session = await requireAuth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto max-w-4xl py-12">
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold">Tableau de bord</h1>

        <div className="space-y-6">
          {/* User Info */}
          <div className="rounded-lg bg-muted p-6">
            <h2 className="mb-4 text-xl font-semibold">Informations utilisateur</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Email:</dt>
                <dd className="font-mono">{session.user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">ID:</dt>
                <dd className="font-mono text-sm">{session.user.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Crédits:</dt>
                <dd className="text-2xl font-bold text-primary">{session.user.credits}</dd>
              </div>
            </dl>
          </div>

          {/* Success Message */}
          <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 dark:bg-green-950">
            <h3 className="mb-2 text-lg font-semibold text-green-900 dark:text-green-100">
              ✅ Authentification réussie!
            </h3>
            <p className="text-green-800 dark:text-green-200">
              Vous êtes maintenant connecté avec NextAuth + Google OAuth.
              <br />
              Vous avez <strong>{session.user.credits} crédits</strong> disponibles pour analyser
              des documents.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Analyser un document</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Utilisez vos crédits pour analyser vos contrats
              </p>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Commencer une analyse
              </button>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Acheter des crédits</h3>
              <p className="mb-4 text-sm text-muted-foreground">Rechargez votre compte</p>
              <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
                Voir les offres
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
