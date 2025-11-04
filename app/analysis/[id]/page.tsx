/**
 * Analysis Detail Page
 *
 * Server component that fetches and displays a specific analysis.
 * Verifies ownership and handles 404 cases.
 */

import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/src/auth/current-user";
import { AnalysisDetailClient } from "@/src/components/analysis/AnalysisDetailClient";
import { AnalysisRepo } from "@/src/db/analysis.repo";
import { getActiveTabFromUrl } from "@/src/lib/tab-utils";

import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

/**
 * Generate metadata for the analysis page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const analysis = await AnalysisRepo.getById(id);

    if (!analysis) {
      return {
        title: "Analyse introuvable | TrustDoc",
      };
    }

    return {
      title: `${analysis.filename} | TrustDoc`,
      description: `Analyse de contrat - Score de risque: ${analysis.riskScore}/100`,
    };
  } catch {
    return {
      title: "Analyse | TrustDoc",
    };
  }
}

/**
 * Analysis Detail Page
 *
 * Displays full analysis details with tabbed interface.
 *
 * Security:
 * - Requires authentication
 * - Verifies ownership (analysis.userId === current user)
 * - Returns 404 if not found or unauthorized
 *
 * Features:
 * - Deep linking with ?tab= or #hash
 * - Server-side rendering for SEO
 * - Client-side tab navigation
 */
export default async function AnalysisPage({ params, searchParams }: PageProps) {
  // 1. Require authentication
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // 2. Fetch analysis
  const { id } = await params;
  const analysis = await AnalysisRepo.getById(id);

  // 3. Handle not found
  if (!analysis || analysis.deletedAt) {
    notFound();
  }

  // 4. Verify ownership
  if (analysis.userId !== user.id) {
    notFound(); // Don't reveal existence to unauthorized users
  }

  // 5. Determine initial tab from URL
  const { tab: queryTab } = await searchParams;
  const initialTab = getActiveTabFromUrl(null, queryTab); // hash is client-side only

  return <AnalysisDetailClient analysis={analysis} initialTab={initialTab} />;
}
