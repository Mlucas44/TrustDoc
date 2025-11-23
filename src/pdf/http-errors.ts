/**
 * PDF HTTP Error Mapper
 *
 * Centralized error mapping for PDF parsing API responses.
 * Provides standardized error payloads with consistent structure:
 * - error: Human-readable message
 * - code: Machine-readable error code
 * - hint: Optional actionable suggestion for the user
 * - engineUsed: PDF engine that encountered the error (if applicable)
 * - Additional error-specific metadata
 *
 * @see src/pdf/extract/errors.ts for PDF extraction error types
 * @see src/middleware/httpErrors.ts for generic HTTP error handling
 */

import { type NextResponse, NextResponse as Response } from "next/server";

import {
  PdfPasswordRequiredError,
  PdfPasswordInvalidError,
  PdfPageTimeoutError,
  PdfParseFailedError,
  PdfFileTooLargeError,
  PdfTooManyPagesError,
  PdfTextEmptyError,
  type PdfExtractionError,
} from "@/src/pdf/extract/errors";

/**
 * Standardized PDF error response structure
 */
export interface PdfErrorResponse {
  /** Human-readable error message */
  error: string;

  /** Machine-readable error code (matches PdfErrorCode enum) */
  code: string;

  /** Optional actionable hint for the user */
  hint?: string;

  /** PDF engine that encountered the error */
  engineUsed?: "pdfjs" | "pdf-parse";

  /** Additional error-specific metadata */
  [key: string]: unknown;
}

/**
 * Telemetry payload for PDF parsing events
 */
interface PdfTelemetryPayload {
  prefix: string;
  event: "parse_success" | "parse_failed";
  errorCode?: string;
  encrypted?: boolean;
  pages?: number;
  textLength?: number;
  totalMs: number;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Map PDF extraction errors to standardized HTTP responses with telemetry
 *
 * @param error - PDF extraction error
 * @param startTime - Request start time for telemetry
 * @param engineUsed - PDF engine used ("pdfjs" or "pdf-parse")
 * @returns NextResponse with appropriate status code and standardized error payload
 *
 * @example
 * ```ts
 * // In API route:
 * try {
 *   result = await extractTextWithPdfJs(buffer, { password });
 * } catch (error) {
 *   return mapPdfErrorToResponse(error, startTime, "pdfjs");
 * }
 * ```
 */
export function mapPdfErrorToResponse(
  error: unknown,
  startTime: number,
  engineUsed: "pdfjs" | "pdf-parse" = "pdfjs"
): NextResponse<PdfErrorResponse> {
  const totalMs = Math.round(performance.now() - startTime);

  // Helper to log telemetry and return response
  const respondWithError = (
    status: number,
    payload: PdfErrorResponse,
    telemetryExtras: Record<string, unknown> = {}
  ): NextResponse<PdfErrorResponse> => {
    // Log telemetry (structured JSON)
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        prefix: "[pdf-parse-v2]",
        event: "parse_failed",
        errorCode: payload.code,
        engineUsed,
        totalMs,
        timestamp: new Date().toISOString(),
        ...telemetryExtras,
      } satisfies PdfTelemetryPayload)
    );

    return Response.json(payload, { status });
  };

  // 401: Password required
  if (error instanceof PdfPasswordRequiredError) {
    return respondWithError(
      401,
      {
        error: error.message,
        code: error.code,
        hint: "Ce PDF est protégé par mot de passe. Veuillez fournir le mot de passe dans le champ pdfPassword.",
        engineUsed,
        requiresPassword: true,
      },
      { encrypted: true }
    );
  }

  // 401: Invalid password
  if (error instanceof PdfPasswordInvalidError) {
    return respondWithError(
      401,
      {
        error: error.message,
        code: error.code,
        hint: "Le mot de passe fourni est incorrect. Veuillez vérifier et réessayer.",
        engineUsed,
      },
      { encrypted: true }
    );
  }

  // 422: PDF is scanned or has no extractable text
  if (error instanceof PdfTextEmptyError) {
    return respondWithError(
      422,
      {
        error: error.message,
        code: error.code,
        hint: "Ce PDF semble être une image scannée. Veuillez fournir un PDF avec du texte sélectionnable.",
        engineUsed,
        textLength: error.textLength,
      },
      { textLength: error.textLength }
    );
  }

  // 413: File too large
  if (error instanceof PdfFileTooLargeError) {
    return respondWithError(
      413,
      {
        error: error.message,
        code: error.code,
        hint: `La taille maximale autorisée est de ${(error.maxSizeBytes / (1024 * 1024)).toFixed(0)} MB.`,
        engineUsed,
        sizeBytes: error.sizeBytes,
        maxSizeBytes: error.maxSizeBytes,
        sizeMB: +(error.sizeBytes / (1024 * 1024)).toFixed(2),
      },
      { sizeBytes: error.sizeBytes }
    );
  }

  // 422: Too many pages
  if (error instanceof PdfTooManyPagesError) {
    return respondWithError(
      422,
      {
        error: error.message,
        code: error.code,
        hint: `Veuillez diviser votre PDF en documents plus petits (max: ${error.maxPages} pages).`,
        engineUsed,
        pageCount: error.pageCount,
        maxPages: error.maxPages,
      },
      { pageCount: error.pageCount }
    );
  }

  // 504: Page timeout (gateway timeout)
  if (error instanceof PdfPageTimeoutError) {
    return respondWithError(
      504,
      {
        error: error.message,
        code: error.code,
        hint: "La page est trop complexe à extraire. Essayez de simplifier le PDF ou contactez le support.",
        engineUsed,
        pageNumber: error.pageNumber,
        timeoutMs: error.timeoutMs,
      },
      { pageNumber: error.pageNumber }
    );
  }

  // 500: Parse failed (corrupted PDF, unsupported format, etc.)
  if (error instanceof PdfParseFailedError) {
    return respondWithError(500, {
      error: error.message,
      code: error.code,
      hint: "Le PDF est peut-être corrompu ou dans un format non supporté. Essayez de le régénérer.",
      engineUsed,
    });
  }

  // Unknown error → 500 Internal Server Error
  console.error("[mapPdfErrorToResponse] Unknown error:", error);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      prefix: "[pdf-parse-v2]",
      event: "parse_failed",
      errorCode: "PARSE_ERROR",
      engineUsed,
      errorMessage: error instanceof Error ? error.message : String(error),
      totalMs,
      timestamp: new Date().toISOString(),
    } satisfies PdfTelemetryPayload)
  );

  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Une erreur inattendue s'est produite lors de l'extraction du PDF",
      code: "PARSE_ERROR",
      hint: "Veuillez réessayer. Si le problème persiste, contactez le support.",
      engineUsed,
    } satisfies PdfErrorResponse,
    { status: 500 }
  );
}

/**
 * Log successful PDF parsing telemetry
 *
 * @param options - Telemetry options
 * @param options.engineUsed - PDF engine used
 * @param options.pages - Number of pages extracted
 * @param options.textLength - Total text length
 * @param options.encrypted - Whether PDF was encrypted
 * @param options.startTime - Request start time
 * @param options.filePathPattern - Anonymized file path pattern (e.g., "user-xxx")
 *
 * @example
 * ```ts
 * logPdfParseSuccess({
 *   engineUsed: "pdfjs",
 *   pages: result.pages,
 *   textLength: result.textLength,
 *   encrypted: !!pdfPassword,
 *   startTime,
 *   filePathPattern: filePath.split("/")[0],
 * });
 * ```
 */
export function logPdfParseSuccess(options: {
  engineUsed: "pdfjs" | "pdf-parse";
  pages: number;
  textLength: number;
  encrypted: boolean;
  startTime: number;
  filePathPattern?: string;
}): void {
  const totalMs = Math.round(performance.now() - options.startTime);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      prefix: "[pdf-parse-v2]",
      event: "parse_success",
      engineUsed: options.engineUsed,
      pages: options.pages,
      textLength: options.textLength,
      encrypted: options.encrypted,
      totalMs,
      filePathPattern: options.filePathPattern,
      timestamp: new Date().toISOString(),
    } satisfies PdfTelemetryPayload)
  );
}

/**
 * Helper to create standardized success response for PDF parsing
 *
 * @param result - PDF extraction result
 * @returns Success payload
 *
 * @example
 * ```ts
 * return NextResponse.json(
 *   createPdfSuccessResponse(result),
 *   { status: 200 }
 * );
 * ```
 */
export function createPdfSuccessResponse(result: {
  pages: number;
  textLength: number;
  textRaw: string;
  meta: Record<string, unknown> | unknown;
  engineUsed: string;
  stats: {
    totalTimeMs: number;
    avgPageTimeMs: number;
    timedOutPages: number[];
    memory?: {
      inputBufferBytes: number;
      extractedTextBytes: number;
      estimatedPeakBytes: number;
    };
  };
}) {
  return {
    success: true,
    data: {
      pages: result.pages,
      textLength: result.textLength,
      textRaw: result.textRaw,
      meta: result.meta,
      engineUsed: result.engineUsed,
      stats: {
        totalTimeMs: result.stats.totalTimeMs,
        avgPageTimeMs: result.stats.avgPageTimeMs,
        timedOutPages: result.stats.timedOutPages,
        ...(result.stats.memory && {
          memory: {
            inputSizeMB: +(result.stats.memory.inputBufferBytes / (1024 * 1024)).toFixed(2),
            textSizeKB: +(result.stats.memory.extractedTextBytes / 1024).toFixed(2),
            estimatedPeakMB: +(result.stats.memory.estimatedPeakBytes / (1024 * 1024)).toFixed(2),
          },
        }),
      },
    },
  };
}
