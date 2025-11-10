"use client";

/**
 * RedFlagList Component
 *
 * Displays a filterable, searchable list of red flags with severity filtering.
 * Automatically sorts by severity (high → medium → low) then alphabetically.
 */

import { AlertCircle, HelpCircle, Search } from "lucide-react";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRedFlags, type UseRedFlagsOptions } from "@/src/hooks/useRedFlags";
import {
  RED_FLAG_SEVERITY_LABELS,
  type RedFlagSeverity,
  type UiRedFlag,
} from "@/src/types/red-flag";

import { RedFlagItem } from "./RedFlagItem";

export interface RedFlagListProps {
  /**
   * Array of red flags to display
   */
  items: UiRedFlag[];

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

  /**
   * Show count of filtered items
   * @default true
   */
  showCount?: boolean;

  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * RedFlagList Component
 *
 * @example
 * ```tsx
 * <RedFlagList
 *   items={redFlags}
 *   defaultSeverity="all"
 *   showCount
 * />
 * ```
 */
export function RedFlagList({
  items,
  defaultSeverity = "all",
  defaultSearch = "",
  showCount = true,
  className,
}: RedFlagListProps) {
  const options: UseRedFlagsOptions = useMemo(
    () => ({ defaultSeverity, defaultSearch }),
    [defaultSeverity, defaultSearch]
  );

  const {
    filteredItems,
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,
    totalCount,
    filteredCount,
  } = useRedFlags(items, options);

  return (
    <div className={cn("space-y-6", className)} role="region" aria-label="Red flags list">
      {/* Filters Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Search Input */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="red-flag-search" className="text-sm font-medium">
              Search red flags
            </Label>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Les points d&apos;attention (red flags) sont des clauses ou conditions qui
                    méritent une attention particulière avant la signature du contrat.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="red-flag-search"
              type="search"
              placeholder="Search by title or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search red flags by title or reason"
            />
          </div>
        </div>

        {/* Severity Filter */}
        <div className="space-y-2 sm:w-48">
          <Label htmlFor="severity-filter" className="text-sm font-medium">
            Filter by severity
          </Label>
          <select
            id="severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as RedFlagSeverity | "all")}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Filter red flags by severity"
            role="combobox"
          >
            <option value="all">All severities</option>
            <option value="high">{RED_FLAG_SEVERITY_LABELS.high}</option>
            <option value="medium">{RED_FLAG_SEVERITY_LABELS.medium}</option>
            <option value="low">{RED_FLAG_SEVERITY_LABELS.low}</option>
          </select>
        </div>
      </div>

      {/* Count Display */}
      {showCount && (
        <div
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Showing {filteredCount} of {totalCount} red flag{totalCount !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
          {severityFilter !== "all" && ` with ${RED_FLAG_SEVERITY_LABELS[severityFilter]} severity`}
        </div>
      )}

      {/* Red Flags List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-4" role="list">
          {filteredItems.map((flag) => (
            <RedFlagItem key={flag.id} flag={flag} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
          role="status"
        >
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mb-2 text-lg font-semibold">No red flags found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {searchQuery || severityFilter !== "all"
              ? "Try adjusting your search or filter criteria to see more results."
              : "No red flags have been identified in this analysis."}
          </p>
        </div>
      )}
    </div>
  );
}
