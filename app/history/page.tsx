/**
 * History Page
 *
 * Displays user's analysis history with filters and pagination.
 * Server component that fetches data and passes to client components.
 */

import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/src/auth/current-user";
import { HistoryTable } from "@/src/components/history/HistoryTable";
import { AnalysisRepo } from "@/src/db/analysis.repo";

import type { ContractType } from "@prisma/client";

const HISTORY_PAGE_SIZE = 10;

interface HistoryPageProps {
  searchParams: Promise<{
    cursor?: string;
    type?: string;
    riskMin?: string;
    riskMax?: string;
    q?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  // Get authenticated user
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  // Parse search params
  const params = await searchParams;
  const cursor = params.cursor;
  const type = params.type as ContractType | undefined;
  const riskMin = params.riskMin ? parseInt(params.riskMin, 10) : undefined;
  const riskMax = params.riskMax ? parseInt(params.riskMax, 10) : undefined;
  const q = params.q;

  // Fetch analyses with filters
  const items = await AnalysisRepo.listByUser(user.id, {
    limit: HISTORY_PAGE_SIZE + 1, // Fetch one extra to check if there's a next page
    cursor,
    type,
    riskMin,
    riskMax,
    q,
  });

  // Determine pagination cursors
  const hasNextPage = items.length > HISTORY_PAGE_SIZE;
  const itemsToReturn = hasNextPage ? items.slice(0, HISTORY_PAGE_SIZE) : items;

  const historyItems = itemsToReturn.map((item) => ({
    id: item.id,
    filename: item.filename,
    type: item.type,
    riskScore: item.riskScore,
    createdAt: item.createdAt,
  }));

  const nextCursor = hasNextPage ? itemsToReturn[itemsToReturn.length - 1]?.id : undefined;
  const prevCursor = cursor ? "prev" : undefined; // Simplified previous navigation

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        title="Historique des analyses"
        description="Retrouvez toutes vos analyses de contrats passées"
      />

      <div className="mt-8">
        <HistoryTable items={historyItems} nextCursor={nextCursor} prevCursor={prevCursor} />
      </div>
    </div>
  );
}
