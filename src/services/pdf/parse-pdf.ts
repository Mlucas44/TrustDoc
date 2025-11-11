/**
 * PDF Parsing Service
 *
 * Extracts text from PDF files with multi-page support and metadata extraction.
 * Uses pdf-parse v1.1.1 - Simple and reliable PDF text extraction.
 *
 * IMPORTANT: Does NOT support password-protected/encrypted PDFs.
 * Users must remove password protection before uploading.
 */

import "server-only";

import pdfParse from "pdf-parse";

import { downloadFile } from "@/src/services/storage";

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
 * Parse PDF buffer and extract text using pdf-parse v1.1.1
 *
 * @param buffer - PDF file buffer
 * @returns Parsed PDF data with text and metadata
 * @throws {PdfParseError} If PDF is encrypted/password-protected or parsing fails
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  // 1. Validate buffer size
  validatePdfSize(buffer);

  // 2. Parse PDF with pdf-parse
  let data;
  try {
    data = await pdfParse(buffer);
  } catch (error) {
    // Check if error is due to encryption
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error);

    if (
      errorMessage.includes("crypt") ||
      errorMessage.includes("encrypted") ||
      errorMessage.includes("password")
    ) {
      throw new PdfParseError(
        "Ce PDF est protégé par mot de passe. Veuillez supprimer la protection et réessayer.",
        error
      );
    }

    throw new PdfParseError("Échec de l'analyse du PDF. Le fichier est peut-être corrompu.", error);
  }

  // 3. Extract raw text
  const textRaw = data.text;

  // 4. Validate extracted text
  validateTextContent(textRaw);

  // 5. Extract metadata
  const meta = {
    title: data.info?.Title,
    author: data.info?.Author,
    producer: data.info?.Producer,
    creator: data.info?.Creator,
    creationDate: data.info?.CreationDate,
  };

  // 6. Return result
  return {
    textRaw,
    pages: data.numpages,
    textLength: textRaw.length,
    meta,
  };
}

/**
 * Parse PDF from Supabase Storage by file path
 *
 * @param filePath - Full path in Supabase Storage (e.g. "user-abc/file-xyz.pdf")
 * @returns Parsed PDF data with text and metadata
 *
 * @example
 * ```ts
 * const result = await parsePdfFromStorage("user-abc123/document-xyz.pdf");
 * console.log(`Extracted ${result.textLength} characters from ${result.pages} pages`);
 * ```
 */
export async function parsePdfFromStorage(filePath: string): Promise<PdfParseResult> {
  // 1. Download PDF from storage
  const buffer = await downloadFile(filePath);

  // 2. Parse buffer
  return parsePdfBuffer(buffer);
}

/**
 * Parse PDF from storage with timeout
 *
 * @param filePath - Full path in storage
 * @param timeoutMs - Timeout in milliseconds (default: 20000)
 * @returns Parsed PDF data
 *
 * @throws {Error} If parsing times out
 */
export async function parsePdfFromStorageWithTimeout(
  filePath: string,
  timeoutMs: number = 20000
): Promise<PdfParseResult> {
  return Promise.race([
    parsePdfFromStorage(filePath),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF parsing timed out")), timeoutMs)
    ),
  ]);
}
