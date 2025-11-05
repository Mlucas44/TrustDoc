"use client";

/**
 * Analysis Detail Client Component
 *
 * Client-side component for displaying analysis details with tab navigation.
 * Manages tab state via URL (hash and query parameters) and browser history.
 */

import { AlertTriangle, Code, FileText, Home, List } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClausesTable } from "@/src/components/analysis/ClausesTable";
import { ExportButtons } from "@/src/components/analysis/ExportButtons";
import { RedFlagList } from "@/src/components/analysis/RedFlagList";
import { RiskGauge } from "@/src/components/analysis/RiskGauge";
import { RiskScoreBadge } from "@/src/components/analysis/RiskScoreBadge";
import { DisclaimerBanner } from "@/src/components/legal/DisclaimerBanner";
import { toUiClause } from "@/src/lib/clause-utils";
import { toUiRedFlag } from "@/src/lib/red-flag-utils";
import { type AnalysisTab, getActiveTabFromUrl, getTabHash } from "@/src/lib/tab-utils";

import type { AppAnalysis } from "@/src/db/analysis.repo";
import type { Clause } from "@/src/types/clause";
import type { RedFlag } from "@/src/types/red-flag";

interface AnalysisDetailClientProps {
  analysis: AppAnalysis;
  initialTab?: AnalysisTab;
}

/**
 * Analysis Detail Client Component
 *
 * Displays full analysis with tabbed interface for overview, red flags, clauses, summary, and JSON export.
 *
 * Features:
 * - Tab state synced with URL (hash and query parameters)
 * - Browser history management (pushState on tab change)
 * - Accessible focus management
 * - Responsive layout
 */
export function AnalysisDetailClient({
  analysis,
  initialTab = "overview",
}: AnalysisDetailClientProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AnalysisTab>(initialTab);

  // Parse red flags and clauses from JSON
  const redFlags = (Array.isArray(analysis.redFlags)
    ? analysis.redFlags
    : []) as unknown as RedFlag[];
  const clauses = (Array.isArray(analysis.clauses) ? analysis.clauses : []) as unknown as Clause[];

  const uiRedFlags = redFlags.map(toUiRedFlag);
  const uiClauses = clauses.map(toUiClause);

  // Sync active tab with URL on mount and hash change
  useEffect(() => {
    const updateTabFromUrl = () => {
      const hash = window.location.hash;
      const queryTab = searchParams.get("tab");
      const newTab = getActiveTabFromUrl(hash, queryTab, initialTab);

      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    };

    // Initial sync
    updateTabFromUrl();

    // Listen for hash changes (browser back/forward)
    window.addEventListener("hashchange", updateTabFromUrl);

    return () => {
      window.removeEventListener("hashchange", updateTabFromUrl);
    };
  }, [searchParams, initialTab, activeTab]);

  // Handle tab change
  const handleTabChange = useCallback((newTab: string) => {
    const tab = newTab as AnalysisTab;
    setActiveTab(tab);

    // Update URL hash without triggering navigation
    const newHash = getTabHash(tab);

    // Use pushState to update hash without full page reload
    if (window.location.hash !== newHash) {
      window.history.pushState(null, "", newHash);
    }

    // Focus management: focus the tab content for accessibility
    setTimeout(() => {
      const tabContent = document.querySelector(`[data-state="active"][role="tabpanel"]`);
      if (tabContent) {
        (tabContent as HTMLElement).focus();
      }
    }, 100);
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight mb-2 break-words" tabIndex={-1}>
              {analysis.filename}
            </h1>
            <p className="text-sm text-muted-foreground">
              Analysé le {new Date(analysis.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <RiskScoreBadge score={analysis.riskScore} showScore />
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <ExportButtons analysisId={analysis.id} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d&apos;ensemble</span>
            <span className="sm:hidden">Vue</span>
          </TabsTrigger>
          <TabsTrigger value="red-flags" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Points d&apos;attention</span>
            <span className="sm:hidden">Alertes</span>
          </TabsTrigger>
          <TabsTrigger value="clauses" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Clauses</span>
            <span className="sm:hidden">Clauses</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Résumé</span>
            <span className="sm:hidden">Résumé</span>
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">JSON</span>
            <span className="sm:hidden">JSON</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6" tabIndex={-1}>
          <DisclaimerBanner variant="inline" locale="fr" dismissible={true} />
          <RiskGauge score={analysis.riskScore} />

          {/* Quick stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Points d&apos;attention</p>
              <p className="text-2xl font-bold">{redFlags.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Clauses clés</p>
              <p className="text-2xl font-bold">{clauses.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Type de contrat</p>
              <p className="text-lg font-semibold">{analysis.type ?? "Non spécifié"}</p>
            </div>
          </div>

          {/* Summary preview */}
          {analysis.summary && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Résumé</h2>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{analysis.summary}</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Red Flags Tab */}
        <TabsContent value="red-flags" tabIndex={-1}>
          <RedFlagList items={uiRedFlags} />
        </TabsContent>

        {/* Clauses Tab */}
        <TabsContent value="clauses" tabIndex={-1}>
          <ClausesTable clauses={uiClauses} />
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4" tabIndex={-1}>
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Résumé détaillé</h2>
            {analysis.summary ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{analysis.summary}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun résumé disponible pour cette analyse.</p>
            )}
          </div>
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" tabIndex={-1}>
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Export JSON</h2>
              <ExportButtons analysisId={analysis.id} size="sm" />
            </div>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>
                {JSON.stringify(
                  {
                    id: analysis.id,
                    filename: analysis.filename,
                    type: analysis.type,
                    riskScore: analysis.riskScore,
                    summary: analysis.summary,
                    redFlags: redFlags,
                    clauses: clauses,
                    createdAt: analysis.createdAt,
                  },
                  null,
                  2
                )}
              </code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
