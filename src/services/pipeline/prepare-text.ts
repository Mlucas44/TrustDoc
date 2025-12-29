/**
 * Text Preparation Pipeline
 *
 * Orchestrates PDF parsing and text normalization.
 * Combines parsePdfFromStorage → normalizeContractText → ready for LLM
 */

import "server-only";

import { type Trace } from "@/src/lib/timing";
import { extractTextWithPdfJs } from "@/src/pdf/extract/pdfjs";
import { detectContractType } from "@/src/services/detect/contract-type";
import { downloadFile } from "@/src/services/storage";
import {
  analyzeLayoutFromBuffer,
  computeCerfaLikelihood,
  type LayoutInfo,
} from "@/src/services/text/layout-pass";
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
  /**
   * Layout analysis result (optional, for form detection)
   */
  layoutInfo?: LayoutInfo;
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
 * @param detectType - Whether to detect contract type (default: true)
 * @param trace - Optional trace instance for performance monitoring
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
  detectType = true,
  trace?: Trace
): Promise<PreparedTextPayload> {
  // 1. Download PDF from storage
  const endDownload = trace?.start("download", { filePath });
  const pdfBuffer = await downloadFile(filePath);
  endDownload?.();

  // 2. Layout pass BEFORE text extraction (for form detection)
  let layoutInfo: LayoutInfo | undefined;
  if (detectType) {
    const endLayout = trace?.start("layout_pass");
    try {
      layoutInfo = await analyzeLayoutFromBuffer(pdfBuffer);
      endLayout?.();
    } catch (error) {
      endLayout?.();
      console.error("[prepareTextFromStorage] Layout analysis failed:", error);
      // Don't fail the whole pipeline if layout analysis fails
      layoutInfo = undefined;
    }
  }

  // 3. Parse PDF with pdfjs (errors are thrown directly)
  const endParse = trace?.start("parse_pdf", { filePath });
  const pdfData = await extractTextWithPdfJs(pdfBuffer, {
    pageTimeoutMs: Math.min(timeoutMs / 10, 3000), // Per-page timeout (max 3s)
  });
  endParse?.();

  // 4. Normalize text
  const endNormalize = trace?.start("normalize");
  const normalizeResult = normalizeContractText({
    textRaw: pdfData.textRaw,
    pages: pdfData.pages,
    meta: pdfData.meta as Record<string, string>,
  });
  endNormalize?.();

  // 5. Detect contract type (optional, can be disabled for performance)
  let contractTypeResult: DetectionResult | undefined;
  if (detectType) {
    const endDetect = trace?.start("detect_type");
    try {
      // Check if layout analysis suggests a Cerfa form
      let forcedType: "FORM_CERFA" | undefined;
      if (layoutInfo) {
        const cerfaScore = computeCerfaLikelihood(layoutInfo);
        // Lowered threshold to 0.44 to catch borderline cases (cerfa.pdf at 0.450)
        if (cerfaScore >= 0.44) {
          console.info(
            `[prepareTextFromStorage] Layout analysis suggests FORM_CERFA (score: ${cerfaScore.toFixed(2)})`
          );
          forcedType = "FORM_CERFA";
        }
      }

      // If layout forced FORM_CERFA, use that
      if (forcedType === "FORM_CERFA") {
        contractTypeResult = {
          type: "FORM_CERFA",
          confidence: 0.85, // High confidence from layout analysis
          source: "heuristic",
          evidence: ["Layout analysis detected form structure with labels and fields"],
        };
      } else {
        // Otherwise, run normal detection
        contractTypeResult = await detectContractType(normalizeResult.textClean);
      }
      endDetect?.();
    } catch (error) {
      endDetect?.();
      console.error("[prepareTextFromStorage] Contract type detection failed:", error);
      // Don't fail the whole pipeline if detection fails
      contractTypeResult = undefined;
    }
  }

  // 6. Combine into final payload
  return {
    textClean: normalizeResult.textClean,
    textTokensApprox: normalizeResult.textTokensApprox,
    stats: normalizeResult.stats,
    meta: pdfData.meta,
    sections: normalizeResult.sections,
    contractType: contractTypeResult,
    layoutInfo,
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
