/**
 * Risk Score Constants
 *
 * Defines thresholds and configurations for risk level classification.
 */

/**
 * Risk level thresholds
 *
 * - Low: 0-33
 * - Medium: 34-66
 * - High: 67-100
 */
export const RISK_THRESHOLDS = {
  low: 33,
  medium: 66,
} as const;

/**
 * Risk level type
 */
export type RiskLevel = "low" | "medium" | "high";

/**
 * Get risk level from score
 *
 * @param score - Risk score (0-100)
 * @returns Risk level classification
 *
 * @example
 * ```ts
 * getRiskLevel(25) // "low"
 * getRiskLevel(50) // "medium"
 * getRiskLevel(85) // "high"
 * ```
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.low) return "low";
  if (score <= RISK_THRESHOLDS.medium) return "medium";
  return "high";
}

/**
 * Risk level display labels
 */
export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

/**
 * Risk level color variants for badges and UI elements
 */
export const RISK_COLORS: Record<
  RiskLevel,
  {
    badge: string;
    text: string;
    bg: string;
    progress: string;
  }
> = {
  low: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    text: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950",
    progress: "bg-green-500 dark:bg-green-600",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    text: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    progress: "bg-yellow-500 dark:bg-yellow-600",
  },
  high: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
    progress: "bg-red-500 dark:bg-red-600",
  },
} as const;
