/**
 * PDF Parsing Service
 *
 * Extracts text from PDF files with multi-page support and metadata extraction.
 * Uses pdfjs-dist (Mozilla PDF.js) - supports encrypted PDFs, robust text extraction.
 */

import "server-only";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

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
 * Parse PDF buffer and extract text using pdfjs-dist (Mozilla PDF.js)
 *
 * @param buffer - PDF file buffer
 * @returns Parsed PDF data with text and metadata
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  // 1. Validate buffer size
  validatePdfSize(buffer);

  // 2. Convert buffer to Uint8Array (required by pdfjs-dist)
  const data = new Uint8Array(buffer);

  // 3. Load PDF document
  let pdfDocument;
  try {
    const loadingTask = getDocument({
      data,
      useSystemFonts: true,
      standardFontDataUrl: undefined, // Disable font loading for server-side
    });
    pdfDocument = await loadingTask.promise;
  } catch (error) {
    throw new PdfParseError("Failed to load PDF document", error);
  }

  // 4. Extract text from all pages
  const pageCount = pdfDocument.numPages;
  const pages: string[] = [];

  try {
    for (let i = 1; i <= pageCount; i++) {
      // Get page (pages are 1-indexed in pdfjs-dist)
      const page = await pdfDocument.getPage(i);

      // Extract text content
      const textContent = await page.getTextContent();

      // Combine text items into a single string
      const pageText = textContent.items
        .map((item: any) => {
          // Each item has a 'str' property containing the text
          return item.str || "";
        })
        .join(" ");

      pages.push(pageText);
    }
  } catch (error) {
    throw new PdfParseError("Failed to extract text from PDF pages", error);
  }

  // 5. Join pages with separators
  const textRaw = pages
    .map((pageText, index) => {
      const separator = index > 0 ? `\n\n--- PAGE ${index + 1} ---\n\n` : "";
      return separator + pageText;
    })
    .join("");

  // 6. Validate extracted text
  validateTextContent(textRaw);

  // 7. Extract metadata
  let metadata: any;
  try {
    metadata = await pdfDocument.getMetadata();
  } catch (error) {
    // Metadata extraction is non-critical, use empty object if fails
    metadata = { info: {}, metadata: null };
  }

  const meta = {
    title: metadata.info?.Title as string | undefined,
    author: metadata.info?.Author as string | undefined,
    producer: metadata.info?.Producer as string | undefined,
    creator: metadata.info?.Creator as string | undefined,
    creationDate: metadata.info?.CreationDate as string | undefined,
  };

  // 8. Cleanup
  await pdfDocument.destroy();

  // 9. Return result
  return {
    textRaw,
    pages: pageCount,
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
