/**
 * POST /api/prepare
 *
 * Complete text preparation pipeline: Parse PDF + Normalize text + Persist to DB
 * - Validates rate limit (5 requests/min per IP)
 * - Validates filePath format with Zod
 * - Parses PDF and extracts text
 * - Normalizes and cleans text
 * - Persists result to analysis_jobs table for stateless /api/analyze
 * - Returns jobId for subsequent analysis
 */

import { type NextRequest, NextResponse } from "next/server";

import { logAnalysisPrepared, logAnalysisFailed } from "@/src/lib/logger-events";
import { Trace } from "@/src/lib/timing";
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimitForRoute, getRateLimitHeaders } from "@/src/middleware/rate-limit";
import { getRequestId } from "@/src/middleware/request-id";
import {
  PdfTextEmptyError,
  PdfFileTooLargeError,
  PdfParseFailedError as PdfParseError,
} from "@/src/pdf/extract/errors";
import { PrepareRequestSchema } from "@/src/schemas/analysis-job";
import { createAnalysisJob, AnalysisJobDBError } from "@/src/services/db/analysis-job.service";
import { prepareTextFromStorage } from "@/src/services/pipeline/prepare-text";
import { StorageUploadError, deleteFile } from "@/src/services/storage";
import { TextTooShortError } from "@/src/services/text/normalize";

export const runtime = "nodejs";

/**
 * POST /api/prepare
 *
 * Prepare text from PDF (parse + normalize + persist to DB)
 *
 * @body { filePath: string } - Full path to PDF in storage
 * @returns { jobId: string } - Analysis job ID for /api/analyze
 *
 * @errors
 * - 400 Bad Request: Missing or invalid filePath (Zod validation)
 * - 401 Unauthorized: Not authenticated (guest or user)
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 404 Not Found: File not found in storage
 * - 413 Payload Too Large: PDF exceeds 10 MB
 * - 422 Unprocessable Entity: PDF has no text OR text too short after cleanup
 * - 429 Too Many Requests: Rate limit exceeded (5 requests/min)
 * - 500 Internal Server Error: Parsing/normalization/DB write failed
 * - 504 Gateway Timeout: Processing took too long (>20s)
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);
  const trace = new Trace(requestId);

  try {
    // 1. Check rate limit FIRST (before any processing)
    const rateLimit = checkRateLimitForRoute(request, "/api/prepare");

    if (rateLimit && !rateLimit.allowed) {
      logAnalysisFailed({
        requestId,
        reason: "RATE_LIMIT_EXCEEDED",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: `Trop de requêtes. Veuillez réessayer dans ${Math.ceil(rateLimit.resetIn / 1000)} secondes.`,
          code: "RATE_LIMIT_EXCEEDED",
          resetIn: rateLimit.resetIn,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // 2. Check quota/credits
    const quotaCheck = await requireQuotaOrUserCredit("/api/prepare");

    if (!quotaCheck.allowed) {
      logAnalysisFailed({
        requestId,
        reason: quotaCheck.errorCode || "QUOTA_CHECK_FAILED",
        durationMs: Math.round(performance.now() - t0),
      });
      const status =
        quotaCheck.errorCode === "INSUFFICIENT_CREDITS" ||
        quotaCheck.errorCode === "GUEST_QUOTA_EXCEEDED"
          ? 402
          : 401;

      return NextResponse.json(
        {
          error: quotaCheck.error,
          code: quotaCheck.errorCode,
        },
        { status }
      );
    }

    // 3. Parse and validate request body with Zod
    let body;
    try {
      const rawBody = await request.json();
      body = PrepareRequestSchema.parse(rawBody);
    } catch (error) {
      logAnalysisFailed({
        requestId,
        reason: "INVALID_REQUEST_BODY",
        durationMs: Math.round(performance.now() - t0),
      });

      if (error instanceof Error && "issues" in error) {
        // Zod validation error
        return NextResponse.json(
          {
            error: "Invalid request body",
            code: "INVALID_REQUEST_BODY",
            details: (error as any).issues,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with filePath",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const { filePath } = body;

    // 4. Prepare text (parse + normalize) with timeout
    let preparedText;
    try {
      preparedText = await prepareTextFromStorage(filePath, 20000, true, trace);
    } catch (error) {
      // Handle specific errors
      if (error instanceof PdfTextEmptyError) {
        logAnalysisFailed({
          requestId,
          reason: "PDF_TEXT_EMPTY_OR_SCANNED",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error:
              "PDF appears to be scanned or has no extractable text. Please provide a text-based PDF.",
            code: "PDF_TEXT_EMPTY_OR_SCANNED",
            textLength: error.textLength,
          },
          { status: 422 }
        );
      }

      if (error instanceof TextTooShortError) {
        logAnalysisFailed({
          requestId,
          reason: "TEXT_TOO_SHORT_AFTER_CLEANUP",
          textLength: error.length,
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error:
              "Text too short after cleanup. PDF may be scanned or contain mostly non-text content.",
            code: "TEXT_TOO_SHORT_AFTER_CLEANUP",
            length: error.length,
          },
          { status: 422 }
        );
      }

      if (error instanceof PdfFileTooLargeError) {
        logAnalysisFailed({
          requestId,
          reason: "PDF_TOO_LARGE",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: error.message,
            code: "PDF_TOO_LARGE",
            size: error.sizeBytes,
            maxSize: error.maxSizeBytes,
          },
          { status: 413 }
        );
      }

      if (error instanceof StorageUploadError) {
        logAnalysisFailed({
          requestId,
          reason: "FILE_NOT_FOUND",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: "File not found in storage",
            code: "FILE_NOT_FOUND",
            filePath,
          },
          { status: 404 }
        );
      }

      if (error instanceof Error && error.message.includes("timed out")) {
        logAnalysisFailed({
          requestId,
          reason: "PREPARE_TIMEOUT",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: "Text preparation took too long (>20s). Please try a smaller or simpler PDF.",
            code: "PREPARE_TIMEOUT",
          },
          { status: 504 }
        );
      }

      if (error instanceof PdfParseError) {
        console.error(
          `[POST /api/prepare] [${requestId}] PDF parsing error:`,
          error.message,
          error.cause
        );

        // Check if it's a password-protected PDF
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("password") ||
          errorMessage.includes("protégé") ||
          errorMessage.includes("encrypted") ||
          errorMessage.includes("crypt")
        ) {
          logAnalysisFailed({
            requestId,
            reason: "PASSWORD_REQUIRED",
            durationMs: Math.round(performance.now() - t0),
          });
          return NextResponse.json(
            {
              error: "Ce PDF est protégé par mot de passe",
              code: "PASSWORD_REQUIRED",
              requiresPassword: true,
            },
            { status: 401 }
          );
        }

        logAnalysisFailed({
          requestId,
          reason: "PARSE_FAILED",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: error.message, // Use the French error message from PdfParseError
            code: "PARSE_FAILED",
          },
          { status: 500 }
        );
      }

      // Unknown error
      console.error(`[POST /api/prepare] [${requestId}] Unexpected error:`, error);
      logAnalysisFailed({
        requestId,
        reason: "PREPARE_ERROR",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "An unexpected error occurred while preparing the text",
          code: "PREPARE_ERROR",
        },
        { status: 500 }
      );
    }

    // 5. Validate textClean minimum length (additional safety check)
    if (!preparedText.textClean || preparedText.textClean.length < 10) {
      logAnalysisFailed({
        requestId,
        reason: "EMPTY_TEXT_CLEAN",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Extracted text is too short or empty after cleanup",
          code: "EMPTY_TEXT_CLEAN",
          length: preparedText.textClean?.length || 0,
        },
        { status: 422 }
      );
    }

    // 6. Persist to database for stateless /api/analyze
    let jobId: string;
    try {
      const endDbWrite = trace.start("db-write");

      jobId = await createAnalysisJob({
        userId: quotaCheck.userId || quotaCheck.guestId || "anonymous",
        guestId: quotaCheck.guestId,
        filePath,
        filename: filePath.split("/").pop() || undefined,
        contractType: preparedText.contractType?.type,
        textClean: preparedText.textClean,
        textLengthRaw: preparedText.stats.textLengthRaw,
        textLengthClean: preparedText.stats.textLengthClean,
        textTokensApprox: preparedText.textTokensApprox,
        pages: preparedText.stats.pages,
        meta: preparedText.meta as Record<string, unknown>,
        sections: (preparedText.sections?.headings || []) as unknown[],
      });

      endDbWrite();

      console.log(`[POST /api/prepare] [${requestId}] Created job: ${jobId}`);
    } catch (error) {
      if (error instanceof AnalysisJobDBError) {
        console.error(
          `[POST /api/prepare] [${requestId}] Database write failed:`,
          error.message,
          error.cause
        );

        logAnalysisFailed({
          requestId,
          reason: "DB_WRITE_FAILED",
          durationMs: Math.round(performance.now() - t0),
        });

        return NextResponse.json(
          {
            error: "Failed to save analysis job to database",
            code: "DB_WRITE_FAILED",
          },
          { status: 500 }
        );
      }

      throw error; // Rethrow unexpected errors
    }

    // 7. Delete source file after successful preparation and DB persistence
    const endCleanup = trace.start("cleanup");
    try {
      await deleteFile(filePath);
      endCleanup();
    } catch (error) {
      endCleanup();
      // Log but don't fail the request if deletion fails
      console.error(`[POST /api/prepare] [${requestId}] Failed to delete source file:`, error);
    }

    // 8. Log text preparation completed
    logAnalysisPrepared({
      requestId,
      pages: preparedText.stats.pages,
      textLengthRaw: preparedText.stats.textLengthRaw,
      textLengthClean: preparedText.stats.textLengthClean,
      textTokensApprox: preparedText.textTokensApprox,
      durationMs: Math.round(performance.now() - t0),
    });

    // 9. Return jobId for /api/analyze
    const responseHeaders = new Headers();
    if (process.env.NODE_ENV === "development") {
      const headers = trace.toHeaders("x-td-latency-");
      Object.entries(headers).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
    }

    return NextResponse.json(
      {
        jobId,
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    // Catch-all error handler
    console.error(`[POST /api/prepare] [${requestId}] Internal error:`, error);

    logAnalysisFailed({
      requestId,
      reason: "INTERNAL_ERROR",
      durationMs: Math.round(performance.now() - t0),
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
