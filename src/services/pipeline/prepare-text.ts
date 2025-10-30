/**
 * Text Preparation Pipeline
 *
 * Orchestrates PDF parsing and text normalization.
 * Combines parsePdfFromStorage → normalizeContractText → ready for LLM
 */

import "server-only";

import { detectContractType } from "@/src/services/detect/contract-type";
import { parsePdfFromStorageWithTimeout } from "@/src/services/pdf/parse-pdf";
import { normalizeContractText } from "@/src/services/text/normalize";

import type { DetectionResult } from "@/src/schemas/detect";

/**
 * Prepared text payload (ready for LLM)
 */
export interface PreparedTextPayload {
  /**
   * Clean, normalized text ready for AI processing
   */
  textClean: string;
  /**
   * Approximate token count (heuristic)
   */
  textTokensApprox: number;
  /**
   * Normalization statistics
   */
  stats: {
    pages: number;
    textLengthRaw: number;
    textLengthClean: number;
    removedHeaderFooterRatio: number;
    hyphenJoins: number;
    linesMerged: number;
    truncated?: boolean;
  };
  /**
   * Document metadata
   */
  meta?: {
    title?: string;
    author?: string;
    producer?: string;
    creator?: string;
    creationDate?: string;
  };
  /**
   * Document sections (headings)
   */
  sections?: {
    title?: string;
    headings: Array<{ level: 1 | 2 | 3; text: string; index: number }>;
  };
  /**
   * Contract type detection result
   */
  contractType?: DetectionResult;
}

/**
 * Prepare text from PDF storage
 *
 * Complete pipeline:
 * 1. Parse PDF from Supabase Storage
 * 2. Normalize and clean text
 * 3. Return ready-to-use payload for LLM
 *
 * @param filePath - Path to PDF in storage (e.g., "user-abc123/file.pdf")
 * @param timeoutMs - Parsing timeout (default: 20000ms)
 * @returns Prepared text payload ready for AI analysis
 *
 * @throws {StorageUploadError} If file not found
 * @throws {PdfTextEmptyError} If PDF has no text (scanned)
 * @throws {PdfFileTooLargeError} If PDF exceeds size limit
 * @throws {PdfParseError} If parsing fails
 * @throws {TextTooShortError} If text too short after cleanup
 * @throws {Error} If parsing times out
 *
 * @example
 * ```ts
 * const payload = await prepareTextFromStorage("user-abc123/file.pdf");
 * console.log(`Ready: ${payload.textTokensApprox} tokens`);
 * // Send payload.textClean to LLM for analysis
 * ```
 */
export async function prepareTextFromStorage(
  filePath: string,
  timeoutMs = 20000,
  detectType = true
): Promise<PreparedTextPayload> {
  // 1. Parse PDF (errors are thrown directly)
  const pdfData = await parsePdfFromStorageWithTimeout(filePath, timeoutMs);

  // 2. Normalize text
  const normalizeResult = normalizeContractText({
    textRaw: pdfData.textRaw,
    pages: pdfData.pages,
    meta: pdfData.meta as Record<string, string>,
  });

  // 3. Detect contract type (optional, can be disabled for performance)
  let contractTypeResult: DetectionResult | undefined;
  if (detectType) {
    try {
      contractTypeResult = await detectContractType(normalizeResult.textClean);
    } catch (error) {
      console.error("[prepareTextFromStorage] Contract type detection failed:", error);
      // Don't fail the whole pipeline if detection fails
      contractTypeResult = undefined;
    }
  }

  // 4. Combine into final payload
  return {
    textClean: normalizeResult.textClean,
    textTokensApprox: normalizeResult.textTokensApprox,
    stats: normalizeResult.stats,
    meta: pdfData.meta,
    sections: normalizeResult.sections,
    contractType: contractTypeResult,
  };
}

/**
 * Debug mode: write raw and clean text to local files
 * Only enabled when TEXT_DEBUG=1 environment variable is set
 */
export async function debugWriteTexts(
  filePath: string,
  textRaw: string,
  textClean: string
): Promise<void> {
  if (process.env.TEXT_DEBUG !== "1") {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn("[debugWriteTexts] TEXT_DEBUG is enabled in production - this is not recommended");
    return;
  }

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const debugDir = path.join(process.cwd(), "temp", "text-debug");
    await fs.mkdir(debugDir, { recursive: true });

    const fileId = path.basename(filePath, ".pdf");
    const rawPath = path.join(debugDir, `${fileId}-raw.txt`);
    const cleanPath = path.join(debugDir, `${fileId}-clean.txt`);

    await fs.writeFile(rawPath, textRaw, "utf-8");
    await fs.writeFile(cleanPath, textClean, "utf-8");

    // eslint-disable-next-line no-console
    console.log(`[TEXT_DEBUG] Wrote debug files:\n  - ${rawPath}\n  - ${cleanPath}`);
  } catch (error) {
    console.error("[debugWriteTexts] Failed to write debug files:", error);
  }
}
