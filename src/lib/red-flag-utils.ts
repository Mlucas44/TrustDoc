/**
 * Red Flag Utilities
 *
 * Helper functions for working with red flags.
 */

import { nanoid } from "nanoid";

import type { RedFlag, UiRedFlag } from "@/src/types/red-flag";

/**
 * Convert API red flag to UI red flag with generated ID
 *
 * @param redFlag - Red flag from API
 * @returns UI red flag with ID
 *
 * @example
 * ```ts
 * const uiRedFlag = toUiRedFlag({
 *   title: "Unlimited Liability",
 *   severity: "high",
 *   why: "This exposes you to unlimited financial risk",
 *   clause_excerpt: "Section 7.3: ..."
 * });
 * // { id: "abc123", title: "...", severity: "high", ... }
 * ```
 */
export function toUiRedFlag(redFlag: RedFlag): UiRedFlag {
  return {
    ...redFlag,
    id: nanoid(),
  };
}

/**
 * Convert array of API red flags to UI red flags
 */
export function toUiRedFlags(redFlags: RedFlag[]): UiRedFlag[] {
  return redFlags.map(toUiRedFlag);
}
