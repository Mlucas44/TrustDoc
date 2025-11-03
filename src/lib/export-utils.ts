/**
 * Export Utilities
 *
 * Helper functions for exporting analysis data.
 */

import { EXPORT_VERSION } from "@/src/types/export";

import type { Clause } from "@/src/types/clause";
import type { ExportAnalysis, ExportRedFlag } from "@/src/types/export";

/**
 * Slugify filename for use in Content-Disposition header
 *
 * Removes special characters and spaces, keeps only alphanumeric, hyphens, and underscores.
 *
 * @param filename - Original filename
 * @returns Slugified filename safe for HTTP headers
 *
 * @example
 * ```ts
 * slugifyFilename("Contrat de Vente 2024.pdf")
 * // => "contrat-de-vente-2024"
 *
 * slugifyFilename("Accord_Confidentiel (v2).docx")
 * // => "accord-confidentiel-v2"
 * ```
 */
export function slugifyFilename(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  return (
    nameWithoutExt
      .toLowerCase()
      .normalize("NFD") // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      // Limit length
      .slice(0, 50)
  );
}

/**
 * Convert database analysis to export format
 *
 * @param analysis - Analysis data from database
 * @returns Export-ready analysis object
 */
export function toExportAnalysis(analysis: {
  id: string;
  filename: string;
  createdAt: Date;
  type: string | null;
  riskScore: number;
  summary: string | null;
  redFlags: unknown;
  clauses: unknown;
}): ExportAnalysis {
  // Parse JSON fields
  let redFlags: ExportRedFlag[] = [];
  let clauses: Clause[] = [];

  // Parse redFlags (already parsed from Prisma.JsonValue)
  try {
    if (analysis.redFlags && typeof analysis.redFlags === "object") {
      if (Array.isArray(analysis.redFlags)) {
        redFlags = analysis.redFlags as ExportRedFlag[];
      } else {
        // Single object, wrap in array
        redFlags = [analysis.redFlags as ExportRedFlag];
      }
    }
  } catch {
    redFlags = [];
  }

  // Parse clauses (already parsed from Prisma.JsonValue)
  try {
    if (analysis.clauses && typeof analysis.clauses === "object") {
      if (Array.isArray(analysis.clauses)) {
        clauses = analysis.clauses as Clause[];
      } else {
        // Single object, wrap in array
        clauses = [analysis.clauses as Clause];
      }
    }
  } catch {
    clauses = [];
  }

  return {
    id: analysis.id,
    filename: analysis.filename,
    createdAt: analysis.createdAt.toISOString(),
    typeContrat: analysis.type || "Non spécifié",
    riskScore: analysis.riskScore,
    riskJustification: "", // Not available in current schema
    summary: analysis.summary || "",
    redFlags,
    clauses,
    version: EXPORT_VERSION,
  };
}
