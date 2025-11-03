/**
 * Export Types
 *
 * Type definitions for analysis export formats (JSON/Markdown).
 */

import type { Clause } from "./clause";

/**
 * Red flag from analysis
 */
export interface ExportRedFlag {
  /**
   * Category of the red flag
   */
  category: string;

  /**
   * Description of the issue
   */
  description: string;

  /**
   * Severity level (1-3)
   */
  severity: number;
}

/**
 * Analysis data for export
 */
export interface ExportAnalysis {
  /**
   * Analysis ID
   */
  id: string;

  /**
   * Original filename
   */
  filename: string;

  /**
   * Analysis creation date (ISO string)
   */
  createdAt: string;

  /**
   * Contract type
   */
  typeContrat: string;

  /**
   * Risk score (0-100)
   */
  riskScore: number;

  /**
   * Risk justification text
   */
  riskJustification: string;

  /**
   * Summary text
   */
  summary: string;

  /**
   * Red flags detected
   */
  redFlags: ExportRedFlag[];

  /**
   * Key clauses extracted
   */
  clauses: Clause[];

  /**
   * Export format version
   */
  version: string;
}

/**
 * Export format version
 */
export const EXPORT_VERSION = "1.0.0";
