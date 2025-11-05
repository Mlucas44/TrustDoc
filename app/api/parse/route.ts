/**
 * POST /api/parse
 *
 * Parse PDF file and extract text.
 * - Validates rate limit (10 requests/min per IP)
 * - Validates fileId format
 * - Downloads PDF from storage
 * - Extracts text with page separators
 * - Detects scanned PDFs (no text)
 * - Returns text, metadata, and page count
 */

import { type NextRequest, NextResponse } from "next/server";

import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimitForRoute, getRateLimitHeaders } from "@/src/middleware/rate-limit";
import {
  parsePdfFromStorageWithTimeout,
  PdfTextEmptyError,
  PdfFileTooLargeError,
  PdfParseError,
} from "@/src/services/pdf/parse-pdf";
import { StorageUploadError, deleteFile } from "@/src/services/storage";

export const runtime = "nodejs";

/**
 * Validate file path format to prevent path traversal
 * Format: {user-userId|guest-guestId}/{fileId}.pdf
 */
function validateFilePath(filePath: string): boolean {
  // Validate path format to prevent path traversal
  // Format: {user-userId|guest-guestId}/{fileId}.pdf
  const pathPattern = /^(user-[a-z0-9-]+|guest-[a-z0-9-]+)\/[a-z0-9-]+\.pdf$/i;
  return pathPattern.test(filePath);
}

/**
 * POST /api/parse
 *
 * Parse a PDF file and extract text
 *
 * @body { filePath: string } - Full path to PDF in storage
 * @returns { pages, textLength, textRaw, meta }
 *
 * @errors
 * - 400 Bad Request: Missing or invalid filePath
 * - 401 Unauthorized: Not authenticated (guest or user)
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 404 Not Found: File not found in storage
 * - 413 Payload Too Large: PDF exceeds 10 MB
 * - 422 Unprocessable Entity: PDF has no text (scanned)
 * - 429 Too Many Requests: Rate limit exceeded (10 requests/min)
 * - 500 Internal Server Error: Parsing failed
 * - 504 Gateway Timeout: Parsing took too long (>20s)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check rate limit FIRST (before any processing)
    const rateLimit = checkRateLimitForRoute(request, "/api/parse");

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
    const quotaCheck = await requireQuotaOrUserCredit("/api/parse");

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
    let body: { filePath?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error("[POST /api/parse] Failed to parse JSON:", error);
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with filePath",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 4. Validate filePath
    const { filePath } = body;

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

    // 5. Parse PDF with timeout (20s)
    let parseResult;
    try {
      parseResult = await parsePdfFromStorageWithTimeout(filePath, 20000);
    } catch (error) {
      // Handle specific errors
      if (error instanceof PdfTextEmptyError) {
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

      if (error instanceof PdfFileTooLargeError) {
        return NextResponse.json(
          {
            error: error.message,
            code: "PDF_TOO_LARGE",
            size: error.size,
            maxSize: error.maxSize,
          },
          { status: 413 }
        );
      }

      if (error instanceof StorageUploadError) {
        // File not found in storage
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
        return NextResponse.json(
          {
            error: "PDF parsing took too long (>20s). Please try a smaller or simpler PDF.",
            code: "PARSE_TIMEOUT",
          },
          { status: 504 }
        );
      }

      if (error instanceof PdfParseError) {
        console.error("[POST /api/parse] PDF parse error:", error);
        return NextResponse.json(
          {
            error: "Failed to parse PDF. The file may be corrupted or password-protected.",
            code: "PARSE_FAILED",
          },
          { status: 500 }
        );
      }

      // Unknown error
      console.error("[POST /api/parse] Unknown error:", error);
      return NextResponse.json(
        {
          error: "An unexpected error occurred while parsing the PDF",
          code: "PARSE_ERROR",
        },
        { status: 500 }
      );
    }

    // 6. Delete source file after successful parsing
    try {
      await deleteFile(filePath);
    } catch (error) {
      // Log but don't fail the request if deletion fails
      console.error("[POST /api/parse] Failed to delete source file:", error);
    }

    // 7. Log success (dev only)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[POST /api/parse] Success:`, {
        filePath,
        pages: parseResult.pages,
        textLength: parseResult.textLength,
      });
    }

    // 8. Return success response
    return NextResponse.json(
      {
        pages: parseResult.pages,
        textLength: parseResult.textLength,
        textRaw: parseResult.textRaw,
        meta: parseResult.meta,
      },
      { status: 200 }
    );
  } catch (error) {
    // Catch-all error handler
    console.error("[POST /api/parse] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
