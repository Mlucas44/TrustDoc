/**
 * Clause Types
 *
 * Type definitions for contract clauses (key terms and sections).
 */

/**
 * Clause categories for filtering
 */
export type ClauseCategory =
  | "parties"
  | "object"
  | "duration"
  | "termination"
  | "payment"
  | "liability"
  | "ip"
  | "confidentiality"
  | "gdpr"
  | "jurisdiction"
  | "non_compete"
  | "assignment"
  | "other";

/**
 * Base clause from LLM analysis
 */
export interface Clause {
  /**
   * Type/category of the clause
   */
  type: string;

  /**
   * Full text of the clause
   */
  text: string;
}

/**
 * UI clause with generated ID and preview
 */
export interface UiClause extends Clause {
  /**
   * Unique identifier (generated client-side)
   */
  id: string;

  /**
   * Normalized category for filtering
   */
  category: ClauseCategory;

  /**
   * Preview text (first 240-320 chars, clean cut)
   */
  preview: string;
}
