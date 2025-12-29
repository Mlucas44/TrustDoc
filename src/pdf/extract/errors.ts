/**
 * PDF Extraction Error Types
 *
 * Normalized error types for PDF extraction across different engines (pdf-parse, pdfjs-dist).
 * Provides consistent error handling and user-facing messages.
 */

// Only import server-only in Next.js context (not standalone scripts)
if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== undefined) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

/**
 * Error codes for PDF extraction
 */
export enum PdfErrorCode {
  /** PDF requires password (encrypted) */
  PASSWORD_REQUIRED = "PASSWORD_REQUIRED",

  /** Password provided but incorrect */
  PASSWORD_INVALID = "PASSWORD_INVALID",

  /** Page extraction timed out */
  PAGE_TIMEOUT = "PAGE_TIMEOUT",

  /** PDF parsing failed (corrupted, unsupported format) */
  PARSE_FAILED = "PARSE_FAILED",

  /** File too large (bytes) */
  FILE_TOO_LARGE = "FILE_TOO_LARGE",

  /** PDF has too many pages */
  TOO_MANY_PAGES = "TOO_MANY_PAGES",

  /** Text extraction resulted in empty or minimal text */
  TEXT_EMPTY = "TEXT_EMPTY",
}

/**
 * Base class for PDF extraction errors
 */
export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: PdfErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

/**
 * PDF requires password
 */
export class PdfPasswordRequiredError extends PdfExtractionError {
  constructor(message = "Ce PDF est protégé par mot de passe") {
    super(message, PdfErrorCode.PASSWORD_REQUIRED);
    this.name = "PdfPasswordRequiredError";
  }
}

/**
 * Password provided but incorrect
 */
export class PdfPasswordInvalidError extends PdfExtractionError {
  constructor(message = "Le mot de passe fourni est incorrect") {
    super(message, PdfErrorCode.PASSWORD_INVALID);
    this.name = "PdfPasswordInvalidError";
  }
}

/**
 * Page extraction timed out
 */
export class PdfPageTimeoutError extends PdfExtractionError {
  constructor(
    public readonly pageNumber: number,
    public readonly timeoutMs: number,
    message = `Extraction de la page ${pageNumber} a dépassé le timeout (${timeoutMs}ms)`
  ) {
    super(message, PdfErrorCode.PAGE_TIMEOUT);
    this.name = "PdfPageTimeoutError";
  }
}

/**
 * PDF parsing failed (corrupted, unsupported format)
 */
export class PdfParseFailedError extends PdfExtractionError {
  constructor(
    message = "Échec de l'analyse du PDF. Le fichier est peut-être corrompu.",
    cause?: unknown
  ) {
    super(message, PdfErrorCode.PARSE_FAILED, cause);
    this.name = "PdfParseFailedError";
  }
}

/**
 * File too large
 */
export class PdfFileTooLargeError extends PdfExtractionError {
  constructor(
    public readonly sizeBytes: number,
    public readonly maxSizeBytes: number,
    message = `PDF trop volumineux: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB (max: ${maxSizeBytes / 1024 / 1024} MB)`
  ) {
    super(message, PdfErrorCode.FILE_TOO_LARGE);
    this.name = "PdfFileTooLargeError";
  }
}

/**
 * PDF has too many pages
 */
export class PdfTooManyPagesError extends PdfExtractionError {
  constructor(
    public readonly pageCount: number,
    public readonly maxPages: number,
    message = `PDF a trop de pages: ${pageCount} pages (max: ${maxPages})`
  ) {
    super(message, PdfErrorCode.TOO_MANY_PAGES);
    this.name = "PdfTooManyPagesError";
  }
}

/**
 * Text extraction resulted in empty or minimal text (scanned PDF)
 */
export class PdfTextEmptyError extends PdfExtractionError {
  constructor(
    public readonly textLength: number,
    message = `PDF semble scanné ou sans texte extractible (${textLength} caractères)`
  ) {
    super(message, PdfErrorCode.TEXT_EMPTY);
    this.name = "PdfTextEmptyError";
  }
}

/**
 * Check if error is password-related
 */
export function isPasswordError(error: unknown): boolean {
  if (error instanceof PdfExtractionError) {
    return (
      error.code === PdfErrorCode.PASSWORD_REQUIRED || error.code === PdfErrorCode.PASSWORD_INVALID
    );
  }
  return false;
}

/**
 * Check if error is recoverable (can retry with different params)
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof PdfExtractionError) {
    return (
      error.code === PdfErrorCode.PASSWORD_REQUIRED ||
      error.code === PdfErrorCode.PASSWORD_INVALID ||
      error.code === PdfErrorCode.PAGE_TIMEOUT
    );
  }
  return false;
}

/**
 * Get user-facing error message
 */
export function getUserFacingMessage(error: unknown): string {
  if (error instanceof PdfExtractionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `Erreur lors de l'extraction du PDF: ${error.message}`;
  }

  return "Une erreur inattendue s'est produite lors de l'extraction du PDF";
}
