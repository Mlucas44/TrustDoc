/**
 * RiskScoreBadge Component
 *
 * Displays a risk score as a colored badge with risk level label.
 * Provides immediate visual feedback on contract risk level.
 */

"use client";

import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RISK_COLORS, RISK_LABELS, getRiskLevel, type RiskLevel } from "@/src/constants/risk";

const badgeSizeVariants = cva("", {
  variants: {
    size: {
      sm: "text-xs px-2 py-0.5",
      md: "text-sm px-2.5 py-0.5",
      lg: "text-base px-3 py-1",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface RiskScoreBadgeProps extends VariantProps<typeof badgeSizeVariants> {
  /**
   * Risk score (0-100)
   */
  score: number;

  /**
   * Show numeric score alongside label
   * @default false
   */
  showScore?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * RiskScoreBadge Component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <RiskScoreBadge score={25} />
 * // Output: "Low" (green badge)
 *
 * // With score display
 * <RiskScoreBadge score={57} showScore />
 * // Output: "Medium (57)" (yellow badge)
 *
 * // Large size
 * <RiskScoreBadge score={85} size="lg" />
 * // Output: "High" (red badge, larger)
 * ```
 */
export function RiskScoreBadge({
  score,
  size = "md",
  showScore = false,
  className,
}: RiskScoreBadgeProps) {
  const level: RiskLevel = getRiskLevel(score);
  const label = RISK_LABELS[level];
  const colors = RISK_COLORS[level];

  const displayText = showScore ? `${label} (${score})` : label;

  const tooltipContent: Record<RiskLevel, string> = {
    low: "Risque faible (0-33) : Le contrat présente peu de clauses potentiellement problématiques.",
    medium: "Risque modéré (34-66) : Certaines clauses méritent votre attention avant signature.",
    high: "Risque élevé (67-100) : Plusieurs points d'attention importants détectés. Consultation d'un professionnel recommandée.",
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              badgeSizeVariants({ size }),
              colors.badge,
              "border-transparent font-semibold cursor-help",
              className
            )}
            aria-label={`Risk score: ${label} (${score}%)`}
          >
            {displayText}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltipContent[level]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
