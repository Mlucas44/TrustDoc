/**
 * Red Flag Types
 *
 * Type definitions for contract red flags (risky clauses).
 */

import { AlertCircle, AlertTriangle, Info } from "lucide-react";

/**
 * Severity levels for red flags
 */
export type RedFlagSeverity = "low" | "medium" | "high";

/**
 * Base red flag from LLM analysis
 */
export interface RedFlag {
  /**
   * Title/summary of the issue
   */
  title: string;

  /**
   * Severity level
   */
  severity: RedFlagSeverity;

  /**
   * Explanation of why this is problematic
   */
  why: string;

  /**
   * Excerpt from the contract clause
   */
  clause_excerpt: string;
}

/**
 * UI red flag with generated ID for React keys
 */
export interface UiRedFlag extends RedFlag {
  /**
   * Unique identifier (generated client-side)
   */
  id: string;
}

/**
 * Severity labels for display
 */
export const RED_FLAG_SEVERITY_LABELS: Record<RedFlagSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

/**
 * Severity order for sorting (high first)
 */
export const RED_FLAG_SEVERITY_ORDER: Record<RedFlagSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

/**
 * Severity colors (aligned with risk score colors)
 */
export const RED_FLAG_SEVERITY_COLORS: Record<
  RedFlagSeverity,
  {
    badge: string;
    text: string;
    bg: string;
    icon: string;
  }
> = {
  low: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    text: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950",
    icon: "text-green-600 dark:text-green-400",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    text: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
  high: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
    icon: "text-red-600 dark:text-red-400",
  },
} as const;

/**
 * Severity icons (lucide-react components)
 */
export const RED_FLAG_SEVERITY_ICONS: Record<RedFlagSeverity, typeof Info> = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
} as const;
