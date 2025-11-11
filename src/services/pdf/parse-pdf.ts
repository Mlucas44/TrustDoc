/**
 * PDF Parsing Service
 *
 * Extracts text from PDF files with multi-page support and metadata extraction.
 * Uses pdf-parse library with custom page separators for clause extraction.
 */

import "server-only";

import { downloadFile } from "@/src/services/storage";

/**
 * Load pdf-parse v2 class dynamically
 *
 * IMPORTANT: pdf-parse v2.4.5 uses a CLASS-BASED API, not a function!
 * v1: pdfParse(buffer, options) → v2: new PDFParse({ data: buffer })
 *
 * @see https://www.npmjs.com/package/pdf-parse (v2 migration guide)
 */
async function loadPDFParseClass() {
  // pdf-parse is a CommonJS module that needs special handling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParseModule = require("pdf-parse");

  // pdf-parse v2.4.5 exports PDFParse as a CLASS constructor
  const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;

  if (typeof PDFParseClass !== "function") {
    console.error("[loadPDFParseClass] Invalid module structure:", {
      type: typeof PDFParseClass,
      keys: Object.keys(pdfParseModule),
      hasPDFParse: !!pdfParseModule.PDFParse,
      hasDefault: !!pdfParseModule.default,
    });
    throw new Error(`pdf-parse PDFParse is not a constructor. Type: ${typeof PDFParseClass}`);
  }

  return PDFParseClass;
}

/**
 * PDF parsing result
 */
export interface PdfParseResult {
  /**
   * Raw extracted text (with page separators)
   */
  textRaw: string;
  /**
   * Number of pages in the PDF
   */
  pages: number;
  /**
   * Length of extracted text
   */
  textLength: number;
  /**
   * PDF metadata
   */
  meta: {
    title?: string;
    author?: string;
    producer?: string;
    creator?: string;
    creationDate?: string;
  };
}

/**
 * Custom errors
 */
export class PdfParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PdfParseError";
  }
}

export class PdfTextEmptyError extends Error {
  constructor(public readonly textLength: number) {
    super(`PDF appears to be scanned or has no extractable text (${textLength} characters)`);
    this.name = "PdfTextEmptyError";
  }
}

export class PdfFileTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly maxSize: number
  ) {
    super(`PDF file too large: ${(size / 1024 / 1024).toFixed(2)} MB (max: ${maxSize} MB)`);
    this.name = "PdfFileTooLargeError";
  }
}

/**
 * Maximum PDF size for parsing (10 MB)
 */
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Minimum text length to consider PDF as having text (not scanned)
 */
const MIN_TEXT_LENGTH = 50;

/**
 * Add page separators to text pages array (pdf-parse v2)
 * Replaces the old pagerender option from v1
 */
function addPageSeparators(pages: Array<string | { text: string }>): string {
  return pages
    .map((page, index) => {
      const pageText = typeof page === "string" ? page : page.text || "";
      const separator = index > 0 ? `\n\n--- PAGE ${index + 1} ---\n\n` : "";
      return separator + pageText;
    })
    .join("");
}

/**
 * Validate PDF buffer size
 */
function validatePdfSize(buffer: Buffer): void {
  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    throw new PdfFileTooLargeError(buffer.length, MAX_PDF_SIZE_BYTES / 1024 / 1024);
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
function validateTextContent(text: string): void {
  const alphanumericCount = countAlphanumeric(text);

  if (text.length < MIN_TEXT_LENGTH || alphanumericCount < MIN_TEXT_LENGTH) {
    throw new PdfTextEmptyError(text.length);
  }
}

/**
 * Parse PDF buffer and extract text
 *
 * @param buffer - PDF file buffer
 * @returns Parsed PDF data with text and metadata
 *
 * @example
 * ```ts
 * const buffer = await downloadFile(filePath);
 * const result = await parsePdfBuffer(buffer);
 * console.log(`Extracted ${result.textLength} characters from ${result.pages} pages`);
 * ```
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  // 1. Validate buffer size
  validatePdfSize(buffer);

  // 2. Load PDFParse class (v2 API)
  const PDFParseClass = await loadPDFParseClass();

  // 3. Create parser instance with buffer
  let parser;
  try {
    parser = new PDFParseClass({ data: buffer });
  } catch (error) {
    console.error("[parsePdfBuffer] Failed to create PDFParse instance:", error);
    throw new PdfParseError("Failed to initialize PDF parser", error);
  }

  try {
    // 4. Extract text using v2 API
    const result = await parser.getText();

    // 5. Process pages and add separators
    // v2 API returns { text, pages, ... } where pages is an array of page content
    let textRaw: string;
    if (result.pages && Array.isArray(result.pages)) {
      // Add page separators like the old pagerender function
      textRaw = addPageSeparators(result.pages);
    } else {
      // Fallback to plain text if pages array not available
      textRaw = result.text || "";
    }

    // 6. Validate extracted text
    validateTextContent(textRaw);

    // 7. Get metadata using getInfo()
    let meta: PdfParseResult["meta"] = {};
    try {
      const info = await parser.getInfo();
      meta = {
        title: info?.Title,
        author: info?.Author,
        producer: info?.Producer,
        creator: info?.Creator,
        creationDate: info?.CreationDate,
      };
    } catch (metaError) {
      // Metadata extraction is not critical, continue without it
      console.warn("[parsePdfBuffer] Failed to extract metadata:", metaError);
    }

    // 8. Return result
    return {
      textRaw,
      pages: result.pages?.length || 1,
      textLength: textRaw.length,
      meta,
    };
  } catch (error) {
    console.error("[parsePdfBuffer] pdf-parse getText() error:", error);
    throw new PdfParseError("Failed to extract text from PDF", error);
  } finally {
    // 9. Clean up parser instance (v2 best practice)
    try {
      await parser.destroy();
    } catch (destroyError) {
      console.warn("[parsePdfBuffer] Failed to destroy parser:", destroyError);
    }
  }
}

/**
 * Parse PDF from Supabase Storage by file path
 *
 * @param filePath - Path to PDF in storage (e.g., "user-abc123/file.pdf")
 * @returns Parsed PDF data
 *
 * @throws {StorageUploadError} If file not found in storage
 * @throws {PdfFileTooLargeError} If PDF exceeds size limit
 * @throws {PdfTextEmptyError} If PDF has no extractable text
 * @throws {PdfParseError} If parsing fails
 *
 * @example
 * ```ts
 * const result = await parsePdfFromStorage("user-abc123/cm4x5y6z7-1699123456789.pdf");
 * console.log(`Extracted ${result.textLength} characters`);
 * ```
 */
export async function parsePdfFromStorage(filePath: string): Promise<PdfParseResult> {
  // 1. Download file from storage
  let buffer: Buffer;
  try {
    buffer = await downloadFile(filePath);
  } catch (error) {
    console.error(`[parsePdfFromStorage] Failed to download file ${filePath}:`, error);
    throw error; // Re-throw StorageUploadError
  }

  // 2. Parse buffer
  return await parsePdfBuffer(buffer);
}

/**
 * Parse PDF from Supabase Storage with timeout protection
 *
 * @param filePath - Path to PDF in storage
 * @param timeoutMs - Timeout in milliseconds (default: 20000ms = 20s)
 * @returns Parsed PDF data
 *
 * @throws {Error} If parsing times out
 *
 * @example
 * ```ts
 * const result = await parsePdfFromStorageWithTimeout("user-abc123/file.pdf", 20000);
 * ```
 */
export async function parsePdfFromStorageWithTimeout(
  filePath: string,
  timeoutMs = 20000
): Promise<PdfParseResult> {
  return await Promise.race([
    parsePdfFromStorage(filePath),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`PDF parsing timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}
