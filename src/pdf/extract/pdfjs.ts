/**
 * PDF.js Text Extractor
 *
 * REVERTED: Using pdf-parse instead of pdfjs-dist due to worker bundling issues
 * - pdfjs-dist has unresolvable worker configuration problems in Node.js/Next.js
 * - pdf-parse v1.1.4 works reliably without worker complexity
 * - Trade-off: No password-protected PDF support (users must remove encryption first)
 *
 * @see https://www.npmjs.com/package/pdf-parse
 */

// Only import server-only in Next.js context (not standalone scripts)
// @ts-expect-error - conditional import
if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== undefined) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

import pdfParse from "pdf-parse";

import {
  PdfPasswordRequiredError,
  PdfParseFailedError,
  PdfFileTooLargeError,
  PdfTooManyPagesError,
  PdfTextEmptyError,
} from "./errors";

/**
 * PDF extraction options
 */
export interface PdfJsExtractionOptions {
  /**
   * Password for encrypted PDFs (optional)
   * NOTE: pdf-parse does NOT support passwords - will throw error if PDF is encrypted
   */
  password?: string;

  /**
   * Maximum number of pages to extract concurrently (default: 4)
   * NOTE: Not used by pdf-parse (single-threaded)
   */
  maxConcurrency?: number;

  /**
   * Timeout per page in milliseconds (default: 800ms)
   * NOTE: Not used by pdf-parse (global timeout only)
   */
  pageTimeoutMs?: number;

  /**
   * Maximum PDF size in bytes (default: 10 MB)
   */
  maxSizeBytes?: number;

  /**
   * Maximum number of pages allowed (default: 500)
   * Large PDFs (300+ pages) can cause memory/timeout issues
   */
  maxPages?: number;

  /**
   * Minimum text length to consider PDF valid (default: 50)
   */
  minTextLength?: number;
}

/**
 * PDF metadata
 */
export interface PdfMetadata {
  title?: string;
  author?: string;
  producer?: string;
  creator?: string;
  creationDate?: string;
}

/**
 * PDF extraction result
 */
export interface PdfJsExtractionResult {
  /**
   * Raw extracted text (with page separators)
   */
  textRaw: string;

  /**
   * Number of pages
   */
  pages: number;

  /**
   * Length of extracted text
   */
  textLength: number;

  /**
   * PDF metadata
   */
  meta: PdfMetadata;

  /**
   * Extraction engine used
   */
  engineUsed: "pdf-parse";

  /**
   * Extraction statistics
   */
  stats: {
    /**
     * Total extraction time (ms)
     */
    totalTimeMs: number;

    /**
     * Average time per page (ms)
     */
    avgPageTimeMs: number;

    /**
     * Pages that timed out (if any)
     */
    timedOutPages: number[];

    /**
     * Memory usage statistics
     */
    memory: {
      /**
       * Input buffer size (bytes)
       */
      inputBufferBytes: number;

      /**
       * Total extracted text size (bytes)
       */
      extractedTextBytes: number;

      /**
       * Estimated peak memory usage (bytes)
       */
      estimatedPeakBytes: number;
    };
  };
}

/**
 * Get default options
 */
function getDefaultOptions(): Required<PdfJsExtractionOptions> {
  return {
    password: "",
    maxConcurrency: 4, // Not used by pdf-parse
    pageTimeoutMs: 800, // Not used by pdf-parse
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxPages: 500,
    minTextLength: 50,
  };
}

/**
 * Count alphanumeric characters in text
 */
function countAlphanumeric(text: string): number {
  return (text.match(/[a-zA-Z0-9]/g) || []).length;
}

/**
 * Validate extracted text is not empty/scanned
 */
function validateTextContent(text: string, minLength: number): void {
  const alphanumericCount = countAlphanumeric(text);

  if (text.length < minLength || alphanumericCount < minLength) {
    throw new PdfTextEmptyError(text.length);
  }
}

/**
 * Extract text from PDF buffer using pdf-parse
 *
 * @param buffer - PDF file buffer
 * @param options - Extraction options
 * @returns Extraction result with text, metadata, and stats
 *
 * @throws {PdfFileTooLargeError} If buffer exceeds maxSizeBytes
 * @throws {PdfPasswordRequiredError} If PDF is encrypted and no password provided
 * @throws {PdfTextEmptyError} If extracted text is too short (scanned PDF)
 * @throws {PdfParseFailedError} If parsing fails for other reasons
 *
 * @example
 * ```ts
 * import { extractTextWithPdfJs } from "@/src/pdf/extract/pdfjs";
 *
 * const buffer = await downloadFile("contract.pdf");
 * const result = await extractTextWithPdfJs(buffer);
 *
 * console.log(`Extracted ${result.textLength} chars from ${result.pages} pages`);
 * console.log(`Engine: ${result.engineUsed}`);
 * console.log(`Time: ${result.stats.totalTimeMs}ms`);
 * ```
 */
export async function extractTextWithPdfJs(
  buffer: Buffer,
  options: PdfJsExtractionOptions = {}
): Promise<PdfJsExtractionResult> {
  const opts = { ...getDefaultOptions(), ...options };
  const startTime = performance.now();

  // Log effective configuration
  console.info(
    `[pdf-parse] Extraction config: maxSize=${opts.maxSizeBytes / (1024 * 1024)}MB, maxPages=${opts.maxPages}`
  );

  // 1. Validate buffer size
  if (buffer.length > opts.maxSizeBytes) {
    throw new PdfFileTooLargeError(buffer.length, opts.maxSizeBytes);
  }

  // 2. Parse PDF with pdf-parse
  let data;
  try {
    data = await pdfParse(buffer);
  } catch (error) {
    // Handle password/encryption errors
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error);

    if (
      errorMessage.includes("crypt") ||
      errorMessage.includes("encrypted") ||
      errorMessage.includes("password")
    ) {
      throw new PdfPasswordRequiredError(
        "Ce PDF est protégé par mot de passe. Veuillez supprimer la protection et réessayer."
      );
    }

    if (errorMessage.includes("invalid") || errorMessage.includes("corrupted")) {
      throw new PdfParseFailedError("Le PDF est corrompu ou invalide", error);
    }

    throw new PdfParseFailedError(undefined, error);
  }

  // 3. Validate page count
  const numPages = data.numpages;
  const bufferSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

  if (numPages > opts.maxPages) {
    console.warn(
      `[pdf-parse] PDF exceeds page limit: ${numPages} pages (max: ${opts.maxPages}), size: ${bufferSizeMB}MB`
    );
    throw new PdfTooManyPagesError(numPages, opts.maxPages);
  }

  // Log warning for large PDFs
  if (numPages > 300) {
    console.warn(
      `[pdf-parse] Processing large PDF: ${numPages} pages, size: ${bufferSizeMB}MB (may consume significant memory and time)`
    );
  }

  // 4. Extract text and metadata
  const textRaw = data.text;

  // 5. Validate text content
  validateTextContent(textRaw, opts.minTextLength);

  // 6. Extract metadata
  const meta: PdfMetadata = {
    title: data.info?.Title,
    author: data.info?.Author,
    producer: data.info?.Producer,
    creator: data.info?.Creator,
    creationDate: data.info?.CreationDate,
  };

  // 7. Calculate stats
  const totalTimeMs = performance.now() - startTime;
  const avgPageTimeMs = totalTimeMs / numPages;
  const extractedTextBytes = Buffer.byteLength(textRaw, "utf8");
  const estimatedPeakBytes = buffer.length + extractedTextBytes + numPages * 1024;

  // Log final statistics
  console.info(
    `[pdf-parse] Extraction complete: ${numPages} pages, ${(extractedTextBytes / 1024).toFixed(1)}KB text extracted, ${totalTimeMs.toFixed(0)}ms total`
  );

  if (extractedTextBytes > 5 * 1024 * 1024) {
    console.warn(
      `[pdf-parse] Large text extraction: ${(extractedTextBytes / (1024 * 1024)).toFixed(2)}MB (may impact downstream processing)`
    );
  }

  // 8. Return result
  return {
    textRaw,
    pages: numPages,
    textLength: textRaw.length,
    meta,
    engineUsed: "pdf-parse",
    stats: {
      totalTimeMs: Math.round(totalTimeMs),
      avgPageTimeMs: Math.round(avgPageTimeMs),
      timedOutPages: [], // pdf-parse doesn't have per-page timeouts
      memory: {
        inputBufferBytes: buffer.length,
        extractedTextBytes,
        estimatedPeakBytes,
      },
    },
  };
}

/**
 * Check if a PDF is password-protected without extracting text
 *
 * @param buffer - PDF file buffer
 * @returns true if PDF requires password
 *
 * @example
 * ```ts
 * const isEncrypted = await isPdfPasswordProtected(buffer);
 * if (isEncrypted) {
 *   console.log("This PDF requires a password");
 * }
 * ```
 */
export async function isPdfPasswordProtected(buffer: Buffer): Promise<boolean> {
  try {
    await pdfParse(buffer);
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error);
    if (
      errorMessage.includes("crypt") ||
      errorMessage.includes("encrypted") ||
      errorMessage.includes("password")
    ) {
      return true;
    }
    return false;
  }
}

/**
 * Get PDF page count without extracting text
 *
 * @param buffer - PDF file buffer
 * @param password - Optional password (NOT SUPPORTED by pdf-parse)
 * @returns Number of pages
 *
 * @example
 * ```ts
 * const pageCount = await getPdfPageCount(buffer);
 * console.log(`PDF has ${pageCount} pages`);
 * ```
 */
export async function getPdfPageCount(buffer: Buffer, password?: string): Promise<number> {
  if (password) {
    throw new Error("pdf-parse does not support password-protected PDFs");
  }

  const data = await pdfParse(buffer);
  return data.numpages;
}
