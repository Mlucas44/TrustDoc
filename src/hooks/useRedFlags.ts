/**
 * useRedFlags Hook
 *
 * Hook for filtering, searching, and sorting red flags.
 */

import { useMemo, useState } from "react";

import {
  RED_FLAG_SEVERITY_ORDER,
  type RedFlagSeverity,
  type UiRedFlag,
} from "@/src/types/red-flag";

export interface UseRedFlagsOptions {
  /**
   * Initial severity filter
   * @default "all"
   */
  defaultSeverity?: RedFlagSeverity | "all";

  /**
   * Initial search query
   * @default ""
   */
  defaultSearch?: string;
}

export interface UseRedFlagsResult {
  /**
   * Filtered and sorted red flags
   */
  filteredItems: UiRedFlag[];

  /**
   * Current search query
   */
  searchQuery: string;

  /**
   * Set search query
   */
  setSearchQuery: (query: string) => void;

  /**
   * Current severity filter
   */
  severityFilter: RedFlagSeverity | "all";

  /**
   * Set severity filter
   */
  setSeverityFilter: (severity: RedFlagSeverity | "all") => void;

  /**
   * Total number of items (before filtering)
   */
  totalCount: number;

  /**
   * Number of filtered items
   */
  filteredCount: number;
}

/**
 * Hook for managing red flags list state
 *
 * @param items - Array of red flags to manage
 * @param options - Configuration options
 * @returns Red flags state and actions
 *
 * @example
 * ```tsx
 * const { filteredItems, searchQuery, setSearchQuery } = useRedFlags(redFlags);
 *
 * return (
 *   <>
 *     <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
 *     {filteredItems.map((flag) => <RedFlagItem key={flag.id} flag={flag} />)}
 *   </>
 * );
 * ```
 */
export function useRedFlags(
  items: UiRedFlag[],
  options: UseRedFlagsOptions = {}
): UseRedFlagsResult {
  const { defaultSeverity = "all", defaultSearch = "" } = options;

  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [severityFilter, setSeverityFilter] = useState<RedFlagSeverity | "all">(defaultSeverity);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply severity filter
    if (severityFilter !== "all") {
      result = result.filter((item) => item.severity === severityFilter);
    }

    // Apply search filter (title + why)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) => item.title.toLowerCase().includes(query) || item.why.toLowerCase().includes(query)
      );
    }

    // Sort: high → medium → low, then alphabetically by title
    result.sort((a, b) => {
      const severityDiff =
        RED_FLAG_SEVERITY_ORDER[a.severity] - RED_FLAG_SEVERITY_ORDER[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [items, searchQuery, severityFilter]);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,
    totalCount: items.length,
    filteredCount: filteredItems.length,
  };
}
