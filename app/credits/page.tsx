/**
 * Credits Page
 *
 * Protected page for purchasing credit packs.
 * Displays current credit balance and available packs.
 */

import { PageHeader } from "@/components/page-header";
import { requireCurrentUser } from "@/src/auth/current-user";
import { CreditPacksGrid } from "@/src/components/credits/CreditPacksGrid";
import { CreditsBalance } from "@/src/components/credits/CreditsBalance";

export default async function CreditsPage() {
  // Require authentication
  await requireCurrentUser();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Mes crédits"
        description="Achetez des crédits pour analyser vos documents"
      />

      {/* Current Balance */}
      <CreditsBalance />

      {/* Available Packs */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Acheter des crédits</h2>
        <CreditPacksGrid />
      </section>
    </div>
  );
}
