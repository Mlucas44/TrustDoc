/**
 * PDF Parsing Service
 *
 * Extracts text from PDF files with multi-page support and metadata extraction.
 * Uses pdf-parse library with custom page separators for clause extraction.
 */

import "server-only";

import { downloadFile } from "@/src/services/storage";

// pdf-parse doesn't have proper ESM support, use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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
 * Custom page render function that adds page separators
 */
function pageRenderFunction(pageData: { pageNumber: number }) {
  // Add page separator before each page (except first)
  if (pageData.pageNumber > 1) {
    return `\n\n--- PAGE ${pageData.pageNumber} ---\n\n`;
  }
  return "";
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

  // 2. Parse PDF with custom page render
  let pdfData;
  try {
    pdfData = await pdfParse(buffer, {
      // Custom page render function to add separators
      pagerender: pageRenderFunction,
      // Limit maximum pages for safety (adjust if needed)
      max: 1000,
    });
  } catch (error) {
    console.error("[parsePdfBuffer] pdf-parse error:", error);
    throw new PdfParseError("Failed to parse PDF file", error);
  }

  // 3. Extract text and validate
  const textRaw = pdfData.text || "";
  validateTextContent(textRaw);

  // 4. Extract metadata
  const meta = {
    title: pdfData.info?.Title,
    author: pdfData.info?.Author,
    producer: pdfData.info?.Producer,
    creator: pdfData.info?.Creator,
    creationDate: pdfData.info?.CreationDate,
  };

  // 5. Return result
  return {
    textRaw,
    pages: pdfData.numpages,
    textLength: textRaw.length,
    meta,
  };
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
