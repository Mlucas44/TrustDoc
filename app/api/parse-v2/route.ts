/**
 * POST /api/parse-v2
 *
 * Parse PDF file using the new pdf.js extractor (v2).
 * - Supports password-protected PDFs
 * - Better error handling with specific error codes
 * - Page-level concurrency control
 * - Configurable timeout per page
 *
 * Feature flag: PDF_PARSE_V2=true to enable (otherwise 404)
 *
 * @see src/pdf/extract/pdfjs.ts
 */

import { type NextRequest, NextResponse } from "next/server";

// Only import server-only in Next.js context (not standalone scripts)
if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== undefined) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimitForRoute, getRateLimitHeaders } from "@/src/middleware/rate-limit";
import { extractTextWithPdfJs } from "@/src/pdf/extract/pdfjs";
import {
  mapPdfErrorToResponse,
  logPdfParseSuccess,
  createPdfSuccessResponse,
} from "@/src/pdf/http-errors";
import { downloadFile, StorageUploadError, deleteFile } from "@/src/services/storage";
import {
  isDevMockEnabled,
  devDownloadFromFixtures,
  devDeleteFile,
} from "@/src/services/storage/dev-mock";

export const runtime = "nodejs";

/**
 * Validate file path format to prevent path traversal
 * Format: {user-userId|guest-guestId}/{fileId}.pdf
 */
function validateFilePath(filePath: string): boolean {
  const pathPattern = /^(user-[a-z0-9-]+|guest-[a-z0-9-]+)\/[a-z0-9-]+\.pdf$/i;
  return pathPattern.test(filePath);
}

/**
 * POST /api/parse-v2
 *
 * Parse a PDF file using the new pdf.js extractor
 *
 * @body { filePath: string, pdfPassword?: string } - Full path to PDF in storage and optional password
 * @returns { pages, textLength, textRaw, meta, engineUsed, stats }
 *
 * @errors
 * - 400 Bad Request: Missing or invalid filePath
 * - 401 Unauthorized: Not authenticated OR password required/invalid
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 404 Not Found: File not found in storage OR feature flag disabled
 * - 413 Payload Too Large: PDF exceeds 10 MB
 * - 422 Unprocessable Entity: PDF has no text (scanned)
 * - 429 Too Many Requests: Rate limit exceeded (10 requests/min)
 * - 500 Internal Server Error: Parsing failed
 * - 504 Gateway Timeout: Page extraction timed out
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Check rate limit FIRST (before any processing)
    const rateLimit = checkRateLimitForRoute(request, "/api/parse-v2");

    if (rateLimit && !rateLimit.allowed) {
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
    const quotaCheck = await requireQuotaOrUserCredit("/api/parse-v2");

    if (!quotaCheck.allowed) {
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

    // 3. Parse request body
    let body: { filePath?: string; pdfPassword?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error("[POST /api/parse-v2] Failed to parse JSON:", error);
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with filePath and optional pdfPassword",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 4. Validate filePath
    const { filePath, pdfPassword } = body;

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        {
          error: "Missing or invalid filePath. Expected string",
          code: "MISSING_FILE_PATH",
        },
        { status: 400 }
      );
    }

    if (!validateFilePath(filePath)) {
      return NextResponse.json(
        {
          error:
            "Invalid filePath format. Expected format: {user-userId|guest-guestId}/{fileId}.pdf",
          code: "INVALID_FILE_PATH_FORMAT",
        },
        { status: 400 }
      );
    }

    // 5. Validate pdfPassword if provided
    if (pdfPassword !== undefined && typeof pdfPassword !== "string") {
      return NextResponse.json(
        {
          error: "Invalid pdfPassword. Expected string or omit if not encrypted",
          code: "INVALID_PASSWORD_TYPE",
        },
        { status: 400 }
      );
    }

    // 6. Download PDF from storage (or fixtures in dev mode)
    let buffer: Buffer;
    try {
      if (isDevMockEnabled()) {
        buffer = await devDownloadFromFixtures(filePath);
      } else {
        buffer = await downloadFile(filePath);
      }
    } catch (error) {
      if (error instanceof StorageUploadError) {
        return NextResponse.json(
          {
            error: "File not found in storage",
            code: "FILE_NOT_FOUND",
            filePath,
          },
          { status: 404 }
        );
      }

      console.error("[POST /api/parse-v2] Failed to download file:", error);
      return NextResponse.json(
        {
          error: "Failed to download file from storage",
          code: "DOWNLOAD_FAILED",
        },
        { status: 500 }
      );
    }

    // 7. Extract text with pdf.js
    let result;
    try {
      result = await extractTextWithPdfJs(buffer, {
        password: pdfPassword,
        // Use environment-configured defaults
        // maxConcurrency and pageTimeoutMs are read from env vars
      });
    } catch (error) {
      // Use centralized error mapper (handles all PDF errors + telemetry)
      return mapPdfErrorToResponse(error, startTime, "pdfjs");
    }

    // 8. Delete source file after successful parsing (skip in dev mock mode)
    try {
      if (isDevMockEnabled()) {
        await devDeleteFile(filePath);
      } else {
        await deleteFile(filePath);
      }
    } catch (error) {
      // Log but don't fail the request if deletion fails
      console.error("[pdf-parse-v2] Failed to delete source file:", error);
    }

    // 9. Log telemetry (structured, no sensitive data)
    logPdfParseSuccess({
      engineUsed: result.engineUsed as "pdfjs" | "pdf-parse",
      pages: result.pages,
      textLength: result.textLength,
      encrypted: pdfPassword !== undefined && pdfPassword !== "",
      startTime,
      filePathPattern: filePath.split("/")[0], // Only show user-xxx or guest-xxx prefix
    });

    // 10. Return success response
    return NextResponse.json(createPdfSuccessResponse(result), { status: 200 });
  } catch (error) {
    // Catch-all error handler
    console.error("[POST /api/parse-v2] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
