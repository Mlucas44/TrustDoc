/**
 * Credits Page
 *
 * Protected page for managing credits.
 * Displays:
 * - Current credit balance with refresh
 * - Success banner after purchase (from query params)
 * - Available credit packs for purchase
 * - Complete purchase history with filters and pagination
 */

import { PageHeader } from "@/components/page-header";
import { requireCurrentUser } from "@/src/auth/current-user";
import { CreditPacksGrid } from "@/src/components/credits/CreditPacksGrid";
import { CreditsBalance } from "@/src/components/credits/CreditsBalance";
import { PaymentSuccessBanner } from "@/src/components/credits/PaymentSuccessBanner";
import { PurchaseHistoryTable } from "@/src/components/credits/PurchaseHistoryTable";

export default async function CreditsPage() {
  // Require authentication
  await requireCurrentUser();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Mes crédits"
        description="Gérez votre solde de crédits et consultez vos achats"
      />

      {/* Success Banner (shown after successful payment) */}
      <PaymentSuccessBanner />

      {/* Current Balance */}
      <CreditsBalance />

      {/* Available Packs */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Acheter des crédits</h2>
        <CreditPacksGrid />
      </section>

      {/* Purchase History */}
      <section>
        <PurchaseHistoryTable />
      </section>
    </div>
  );
}
