/**
 * RiskScoreBadge Component
 *
 * Displays a risk score as a colored badge with risk level label.
 * Provides immediate visual feedback on contract risk level.
 */

import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
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

  return (
    <Badge
      className={cn(
        badgeSizeVariants({ size }),
        colors.badge,
        "border-transparent font-semibold",
        className
      )}
      aria-label={`Risk score: ${label} (${score}%)`}
    >
      {displayText}
    </Badge>
  );
}
