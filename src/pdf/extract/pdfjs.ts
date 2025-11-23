/**
 * PDF.js Text Extractor
 *
 * Modern PDF text extraction using Mozilla's pdf.js library.
 * Features:
 * - Password-protected PDF support
 * - Page-level concurrency control
 * - Per-page timeout
 * - Metadata extraction
 * - Robust error handling
 *
 * @see https://github.com/mozilla/pdf.js
 */

// Only import server-only in Next.js context (not standalone scripts)
// @ts-ignore - conditional import
if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== undefined) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  PdfPasswordRequiredError,
  PdfPasswordInvalidError,
  PdfPageTimeoutError,
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
   */
  password?: string;

  /**
   * Maximum number of pages to extract concurrently (default: 4)
   */
  maxConcurrency?: number;

  /**
   * Timeout per page in milliseconds (default: 800ms)
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
  engineUsed: "pdfjs";

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
 * Clamp a numeric value between min and max bounds
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Read configuration from environment variables with safe bounds
 *
 * Environment variables:
 * - PDF_MAX_CONCURRENCY: Number of pages to extract concurrently (1-8, default: 4)
 * - PDF_PAGE_TIMEOUT_MS: Timeout per page in milliseconds (200-3000, default: 800)
 *
 * @returns Configuration with validated and clamped values
 */
function getConfigFromEnv(): {
  maxConcurrency: number;
  pageTimeoutMs: number;
} {
  // Read from environment with fallback to defaults
  const concurrencyEnv = process.env.PDF_MAX_CONCURRENCY;
  const timeoutEnv = process.env.PDF_PAGE_TIMEOUT_MS;

  // Parse values (default to 4 and 800 if not set or invalid)
  const concurrencyRaw = concurrencyEnv ? parseInt(concurrencyEnv, 10) : 4;
  const timeoutRaw = timeoutEnv ? parseInt(timeoutEnv, 10) : 800;

  // Apply safe bounds
  const maxConcurrency = clamp(isNaN(concurrencyRaw) ? 4 : concurrencyRaw, 1, 8);
  const pageTimeoutMs = clamp(isNaN(timeoutRaw) ? 800 : timeoutRaw, 200, 3000);

  return {
    maxConcurrency,
    pageTimeoutMs,
  };
}

/**
 * Get default options with environment-based configuration
 *
 * This function is called lazily to ensure environment variables
 * are read at runtime, not at module load time.
 */
function getDefaultOptions(): Required<PdfJsExtractionOptions> {
  const envConfig = getConfigFromEnv();

  return {
    password: "",
    maxConcurrency: envConfig.maxConcurrency,
    pageTimeoutMs: envConfig.pageTimeoutMs,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxPages: 500, // Limit to prevent memory exhaustion
    minTextLength: 50,
  };
}

/**
 * Extract text from a single page with timeout
 */
async function extractPageText(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number,
  timeoutMs: number
): Promise<string> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new PdfPageTimeoutError(pageNumber, timeoutMs));
    }, timeoutMs);
  });

  try {
    const textContent = await Promise.race([page.getTextContent(), timeoutPromise]);

    // Concatenate text items with spaces
    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ");

    return pageText;
  } catch (error) {
    if (error instanceof PdfPageTimeoutError) {
      throw error;
    }
    throw new PdfParseFailedError(`Failed to extract text from page ${pageNumber}`, error);
  }
}

/**
 * Extract text from multiple pages with concurrency control
 */
async function extractAllPagesText(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  maxConcurrency: number,
  pageTimeoutMs: number
): Promise<{ texts: string[]; timedOutPages: number[] }> {
  const numPages = pdfDocument.numPages;
  const texts: string[] = new Array(numPages).fill("");
  const timedOutPages: number[] = [];

  // Create array of page numbers [1, 2, 3, ..., numPages]
  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

  // Process pages in batches with limited concurrency
  for (let i = 0; i < pageNumbers.length; i += maxConcurrency) {
    const batch = pageNumbers.slice(i, i + maxConcurrency);

    const batchPromises = batch.map(async (pageNum) => {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const pageText = await extractPageText(page, pageNum, pageTimeoutMs);
        texts[pageNum - 1] = pageText;
      } catch (error) {
        if (error instanceof PdfPageTimeoutError) {
          console.warn(`[pdfjs] Page ${pageNum} extraction timed out (${pageTimeoutMs}ms)`);
          timedOutPages.push(pageNum);
          texts[pageNum - 1] = `[Page ${pageNum} - extraction timed out]`;
        } else {
          throw error;
        }
      }
    });

    await Promise.all(batchPromises);
  }

  return { texts, timedOutPages };
}

/**
 * Extract metadata from PDF
 */
async function extractMetadata(pdfDocument: pdfjsLib.PDFDocumentProxy): Promise<PdfMetadata> {
  try {
    const metadata = await pdfDocument.getMetadata();
    const info = metadata.info as Record<string, unknown>;

    return {
      title: typeof info?.Title === "string" ? info.Title : undefined,
      author: typeof info?.Author === "string" ? info.Author : undefined,
      producer: typeof info?.Producer === "string" ? info.Producer : undefined,
      creator: typeof info?.Creator === "string" ? info.Creator : undefined,
      creationDate: typeof info?.CreationDate === "string" ? info.CreationDate : undefined,
    };
  } catch (error) {
    console.warn("[pdfjs] Failed to extract metadata:", error);
    return {};
  }
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
 * Extract text from PDF buffer using pdf.js
 *
 * @param buffer - PDF file buffer
 * @param options - Extraction options
 * @returns Extraction result with text, metadata, and stats
 *
 * @throws {PdfFileTooLargeError} If buffer exceeds maxSizeBytes
 * @throws {PdfPasswordRequiredError} If PDF is encrypted and no password provided
 * @throws {PdfPasswordInvalidError} If password is incorrect
 * @throws {PdfTextEmptyError} If extracted text is too short (scanned PDF)
 * @throws {PdfParseFailedError} If parsing fails for other reasons
 *
 * @example
 * ```ts
 * import { extractTextWithPdfJs } from "@/src/pdf/extract/pdfjs";
 *
 * const buffer = await downloadFile("contract.pdf");
 * const result = await extractTextWithPdfJs(buffer, {
 *   password: "secret",
 *   maxConcurrency: 4,
 *   pageTimeoutMs: 800,
 * });
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
  const defaultOptions = getDefaultOptions();
  const opts = { ...defaultOptions, ...options };
  const startTime = performance.now();

  // Log effective configuration
  console.info(
    `[pdfjs] Extraction config: concurrency=${opts.maxConcurrency}, timeout=${opts.pageTimeoutMs}ms, maxSize=${opts.maxSizeBytes / (1024 * 1024)}MB`
  );

  // 1. Validate buffer size
  if (buffer.length > opts.maxSizeBytes) {
    throw new PdfFileTooLargeError(buffer.length, opts.maxSizeBytes);
  }

  // 2. Load PDF document
  let pdfDocument: pdfjsLib.PDFDocumentProxy;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      password: opts.password || undefined,
      // Disable worker for server-side (Node.js)
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    pdfDocument = await loadingTask.promise;
  } catch (error) {
    // Handle password errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("password")) {
        if (opts.password) {
          throw new PdfPasswordInvalidError();
        } else {
          throw new PdfPasswordRequiredError();
        }
      }

      if (errorMessage.includes("invalid") || errorMessage.includes("corrupted")) {
        throw new PdfParseFailedError("Le PDF est corrompu ou invalide", error);
      }
    }

    throw new PdfParseFailedError(undefined, error);
  }

  try {
    // 2.5. Validate page count
    const numPages = pdfDocument.numPages;
    const bufferSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

    if (numPages > opts.maxPages) {
      console.warn(
        `[pdfjs] PDF exceeds page limit: ${numPages} pages (max: ${opts.maxPages}), size: ${bufferSizeMB}MB`
      );
      throw new PdfTooManyPagesError(numPages, opts.maxPages);
    }

    // Log warning for large PDFs that are still within limit
    if (numPages > 300) {
      console.warn(
        `[pdfjs] Processing large PDF: ${numPages} pages, size: ${bufferSizeMB}MB (may consume significant memory and time)`
      );
    }

    // Log memory estimate
    const estimatedMemoryMB = (numPages * 2).toFixed(1); // Rough estimate: 2MB per page
    console.info(
      `[pdfjs] Starting extraction: ${numPages} pages, ${bufferSizeMB}MB input, ~${estimatedMemoryMB}MB estimated memory`
    );

    // 3. Extract metadata
    const meta = await extractMetadata(pdfDocument);

    // 4. Extract text from all pages
    const { texts, timedOutPages } = await extractAllPagesText(
      pdfDocument,
      opts.maxConcurrency,
      opts.pageTimeoutMs
    );

    // 5. Combine page texts with separators
    const textRaw = texts.map((text, index) => `\n--- Page ${index + 1} ---\n${text}`).join("\n");

    // 6. Validate text content
    validateTextContent(textRaw, opts.minTextLength);

    // 7. Calculate stats
    const totalTimeMs = performance.now() - startTime;
    const avgPageTimeMs = totalTimeMs / pdfDocument.numPages;
    const extractedTextBytes = Buffer.byteLength(textRaw, "utf8");
    const estimatedPeakBytes = buffer.length + extractedTextBytes + pdfDocument.numPages * 1024; // Input + text + overhead

    // Log final memory statistics
    console.info(
      `[pdfjs] Extraction complete: ${pdfDocument.numPages} pages, ${(extractedTextBytes / 1024).toFixed(1)}KB text extracted, ${totalTimeMs.toFixed(0)}ms total`
    );

    if (extractedTextBytes > 5 * 1024 * 1024) {
      // Warn if extracted text > 5MB
      console.warn(
        `[pdfjs] Large text extraction: ${(extractedTextBytes / (1024 * 1024)).toFixed(2)}MB (may impact downstream processing)`
      );
    }

    // 8. Return result
    return {
      textRaw,
      pages: pdfDocument.numPages,
      textLength: textRaw.length,
      meta,
      engineUsed: "pdfjs",
      stats: {
        totalTimeMs: Math.round(totalTimeMs),
        avgPageTimeMs: Math.round(avgPageTimeMs),
        timedOutPages,
        memory: {
          inputBufferBytes: buffer.length,
          extractedTextBytes,
          estimatedPeakBytes,
        },
      },
    };
  } finally {
    // Always cleanup
    await pdfDocument.destroy();
  }
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
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
    });

    const pdfDocument = await loadingTask.promise;
    await pdfDocument.destroy();
    return false;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("password")) {
      return true;
    }
    return false;
  }
}

/**
 * Get PDF page count without extracting text
 *
 * @param buffer - PDF file buffer
 * @param password - Optional password
 * @returns Number of pages
 *
 * @example
 * ```ts
 * const pageCount = await getPdfPageCount(buffer);
 * console.log(`PDF has ${pageCount} pages`);
 * ```
 */
export async function getPdfPageCount(buffer: Buffer, password?: string): Promise<number> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password || undefined,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  await pdfDocument.destroy();

  return numPages;
}
