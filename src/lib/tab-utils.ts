/**
 * Tab Management Utilities
 *
 * Utilities for managing tab state via URL (hash and query parameters)
 */

export type AnalysisTab = "overview" | "red-flags" | "clauses" | "summary" | "json";

const TAB_HASH_MAP: Record<string, AnalysisTab> = {
  "#overview": "overview",
  "#red-flags": "red-flags",
  "#clauses": "clauses",
  "#summary": "summary",
  "#json": "json",
};

const TAB_QUERY_MAP: Record<string, AnalysisTab> = {
  overview: "overview",
  "red-flags": "red-flags",
  redflags: "red-flags", // Alternative
  clauses: "clauses",
  summary: "summary",
  json: "json",
};

/**
 * Get active tab from URL hash or query parameter
 *
 * Priority: hash > query > default
 *
 * @param hash - window.location.hash (client) or null (server)
 * @param queryTab - ?tab= query parameter value
 * @param defaultTab - Default tab if none specified
 * @returns Active tab key
 *
 * @example
 * ```ts
 * // Client component
 * const hash = window.location.hash;
 * const searchParams = useSearchParams();
 * const tab = getActiveTabFromUrl(hash, searchParams.get("tab"));
 * ```
 */
export function getActiveTabFromUrl(
  hash: string | null,
  queryTab: string | null | undefined,
  defaultTab: AnalysisTab = "overview"
): AnalysisTab {
  // 1. Try hash first (#red-flags)
  if (hash && TAB_HASH_MAP[hash]) {
    return TAB_HASH_MAP[hash];
  }

  // 2. Try query parameter (?tab=red-flags)
  if (queryTab && TAB_QUERY_MAP[queryTab]) {
    return TAB_QUERY_MAP[queryTab];
  }

  // 3. Default
  return defaultTab;
}

/**
 * Get hash string for a tab
 *
 * @param tab - Tab key
 * @returns Hash string (e.g., "#red-flags")
 */
export function getTabHash(tab: AnalysisTab): string {
  return `#${tab}`;
}

/**
 * Get human-readable label for a tab
 *
 * @param tab - Tab key
 * @returns Display label
 */
export function getTabLabel(tab: AnalysisTab): string {
  const labels: Record<AnalysisTab, string> = {
    overview: "Vue d'ensemble",
    "red-flags": "Points d'attention",
    clauses: "Clauses clés",
    summary: "Résumé",
    json: "Export JSON",
  };

  return labels[tab];
}

/**
 * Get tab icon name (for UI)
 *
 * @param tab - Tab key
 * @returns Icon name compatible with lucide-react
 */
export function getTabIcon(tab: AnalysisTab): string {
  const icons: Record<AnalysisTab, string> = {
    overview: "home",
    "red-flags": "alert-triangle",
    clauses: "file-text",
    summary: "list",
    json: "code",
  };

  return icons[tab];
}
