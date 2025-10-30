"use client";

/**
 * GuestProgress Component
 *
 * Displays guest quota progress (X/3 analyses used).
 * Shows a progress bar and badge with remaining analyses.
 */

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface GuestProgressProps {
  /**
   * Whether to show the progress bar
   */
  showProgress?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
}

interface GuestStatus {
  used: number;
  remaining: number;
  limit: number;
}

/**
 * Guest progress indicator component
 *
 * @example
 * ```tsx
 * <GuestProgress showProgress />
 * ```
 */
export function GuestProgress({ showProgress = true, className }: GuestProgressProps) {
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch guest status
    fetch("/api/guest/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus({
          used: data.used,
          remaining: data.remaining,
          limit: data.limit,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("[GuestProgress] Failed to fetch status:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={`space-y-2 ${className || ""}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Analyses invité</span>
          <Badge variant="secondary" className="animate-pulse">
            ...
          </Badge>
        </div>
        {showProgress && <Progress value={0} className="h-2" />}
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const percentage = (status.used / status.limit) * 100;
  const isLow = status.remaining <= 1;
  const isExceeded = status.remaining === 0;

  return (
    <div className={`space-y-2 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Analyses invité</span>
        <Badge variant={isExceeded ? "destructive" : isLow ? "outline" : "secondary"}>
          {status.used}/{status.limit}
        </Badge>
      </div>

      {showProgress && (
        <>
          <Progress
            value={percentage}
            className={`h-2 ${isExceeded ? "bg-destructive/20" : isLow ? "bg-yellow-500/20" : ""}`}
          />
          <p className="text-xs text-muted-foreground">
            {isExceeded ? (
              <span className="text-destructive">Quota épuisé. Connectez-vous pour continuer.</span>
            ) : isLow ? (
              <span className="text-yellow-600 dark:text-yellow-500">
                Il vous reste {status.remaining} analyse{status.remaining > 1 ? "s" : ""} gratuite
                {status.remaining > 1 ? "s" : ""}.
              </span>
            ) : (
              <>
                Il vous reste {status.remaining} analyse{status.remaining > 1 ? "s" : ""} gratuite
                {status.remaining > 1 ? "s" : ""}.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
