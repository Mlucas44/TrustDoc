/**
 * Clause Utilities
 *
 * Helper functions for working with contract clauses.
 */

import { nanoid } from "nanoid";

import { createClausePreview, normalizeClauseCategory } from "@/src/constants/clauses";

import type { Clause, UiClause } from "@/src/types/clause";

/**
 * Convert API clause to UI clause with generated ID, category, and preview
 *
 * @param clause - Clause from API
 * @returns UI clause with additional fields
 *
 * @example
 * ```ts
 * const uiClause = toUiClause({
 *   type: "Résiliation",
 *   text: "Either party may terminate..."
 * });
 * // { id: "abc123", type: "Résiliation", category: "termination", text: "...", preview: "..." }
 * ```
 */
export function toUiClause(clause: Clause): UiClause {
  return {
    ...clause,
    id: nanoid(),
    category: normalizeClauseCategory(clause.type),
    preview: createClausePreview(clause.text),
  };
}

/**
 * Convert array of API clauses to UI clauses
 */
export function toUiClauses(clauses: Clause[]): UiClause[] {
  return clauses.map(toUiClause);
}
