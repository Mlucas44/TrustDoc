"use client";

/**
 * RiskGauge Component
 *
 * Displays a risk score as a visual progress bar/gauge with animated fill.
 * Shows numeric value, risk level label, and optional justification text.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { RISK_COLORS, RISK_LABELS, getRiskLevel, type RiskLevel } from "@/src/constants/risk";

import { RiskScoreBadge } from "./RiskScoreBadge";

export interface RiskGaugeProps {
  /**
   * Risk score (0-100)
   */
  score: number;

  /**
   * Optional justification text explaining the score
   */
  justification?: string;

  /**
   * Show animation on mount
   * @default true
   */
  animate?: boolean;

  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * RiskGauge Component
 *
 * @example
 * ```tsx
 * <RiskGauge
 *   score={57}
 *   justification="Multiple unclear clauses regarding termination rights"
 * />
 * ```
 */
export function RiskGauge({ score, justification, animate = true, className }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const level: RiskLevel = getRiskLevel(score);
  const label = RISK_LABELS[level];
  const colors = RISK_COLORS[level];

  // Animate score on mount
  useEffect(() => {
    if (!animate) return;

    const duration = 1000; // 1 second animation
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animate]);

  return (
    <div className={cn("space-y-4", className)} role="region" aria-label="Risk score gauge">
      {/* Header: Score and Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn("text-4xl font-bold tabular-nums", colors.text)}
            aria-live="polite"
            aria-atomic="true"
          >
            {displayScore}
          </span>
          <span className="text-muted-foreground text-2xl font-light">/100</span>
        </div>
        <RiskScoreBadge score={score} size="lg" />
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div
          className="relative h-4 w-full overflow-hidden rounded-full bg-opacity-20"
          style={{ backgroundColor: colors.progress.replace(/bg-\w+-\d+/, "") }}
        >
          <div
            className={cn("h-full transition-all duration-300 ease-in-out", colors.progress)}
            style={{ width: `${displayScore}%` }}
            role="progressbar"
            aria-label={`Risk score: ${label} (${score}%)`}
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Risk Level Text */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Risk Level:</span>
        <span className={cn("font-semibold", colors.text)}>{label} Risk</span>
      </div>

      {/* Justification (if provided) */}
      {justification && (
        <div className={cn("rounded-lg p-4 text-sm", colors.bg)}>
          <p className={cn("font-medium mb-1", colors.text)}>Risk Assessment:</p>
          <p className="text-muted-foreground leading-relaxed">{justification}</p>
        </div>
      )}
    </div>
  );
}
