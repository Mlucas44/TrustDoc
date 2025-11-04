/**
 * Analysis Detail Loading State
 *
 * Skeleton UI shown while analysis is loading
 */

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Analysis Detail Loading Skeleton
 *
 * Displays placeholder content while the analysis page loads.
 * Matches the layout of the actual AnalysisDetailClient component.
 */
export default function AnalysisLoading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-9 w-3/4 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24 flex-shrink-0" />
        </div>

        {/* Export buttons skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-6">
        {/* Tab list */}
        <div className="grid w-full grid-cols-5 gap-2 rounded-lg bg-muted p-1">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>

        {/* Risk gauge skeleton */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-8 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-32 w-full max-w-2xl" />
        </div>

        {/* Quick stats skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>

        {/* Summary skeleton */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
