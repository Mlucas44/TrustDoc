/**
 * POST /api/prepare
 *
 * Complete text preparation pipeline: Parse PDF + Normalize text
 * - Validates filePath format
 * - Parses PDF and extracts text
 * - Normalizes and cleans text
 * - Returns ready-to-use payload for LLM analysis
 */

import { type NextRequest, NextResponse } from "next/server";

import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import {
  PdfTextEmptyError,
  PdfFileTooLargeError,
  PdfParseError,
} from "@/src/services/pdf/parse-pdf";
import { prepareTextFromStorage } from "@/src/services/pipeline/prepare-text";
import { StorageUploadError, deleteFile } from "@/src/services/storage";
import { TextTooShortError } from "@/src/services/text/normalize";

export const runtime = "nodejs";

/**
 * Validate file path format to prevent path traversal
 */
function validateFilePath(filePath: string): boolean {
  const pathPattern = /^(user-[a-z0-9-]+|guest-[a-z0-9-]+)\/[a-z0-9-]+\.pdf$/i;
  return pathPattern.test(filePath);
}

/**
 * POST /api/prepare
 *
 * Prepare text from PDF (parse + normalize)
 *
 * @body { filePath: string } - Full path to PDF in storage
 * @returns { textClean, textTokensApprox, stats, meta, sections }
 *
 * @errors
 * - 400 Bad Request: Missing or invalid filePath
 * - 401 Unauthorized: Not authenticated (guest or user)
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 404 Not Found: File not found in storage
 * - 413 Payload Too Large: PDF exceeds 10 MB
 * - 422 Unprocessable Entity: PDF has no text OR text too short after cleanup
 * - 500 Internal Server Error: Parsing/normalization failed
 * - 504 Gateway Timeout: Processing took too long (>20s)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check quota/credits
    const quotaCheck = await requireQuotaOrUserCredit("/api/prepare");

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

    // 2. Parse request body
    let body: { filePath?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error("[POST /api/prepare] Failed to parse JSON:", error);
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with filePath",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 3. Validate filePath
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

    // 4. Prepare text (parse + normalize) with timeout
    let preparedText;
    try {
      preparedText = await prepareTextFromStorage(filePath, 20000);

      // Debug mode: write raw and clean text to files
      if (process.env.TEXT_DEBUG === "1") {
        // Note: We don't have textRaw here directly, but we could modify prepareTextFromStorage
        // to return it if needed. For now, skip debug output.
      }
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

      if (error instanceof TextTooShortError) {
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
            error: "Text preparation took too long (>20s). Please try a smaller or simpler PDF.",
            code: "PREPARE_TIMEOUT",
          },
          { status: 504 }
        );
      }

      if (error instanceof PdfParseError) {
        console.error("[POST /api/prepare] PDF parse error:", error);
        return NextResponse.json(
          {
            error: "Failed to parse PDF. The file may be corrupted or password-protected.",
            code: "PARSE_FAILED",
          },
          { status: 500 }
        );
      }

      // Unknown error
      console.error("[POST /api/prepare] Unknown error:", error);
      return NextResponse.json(
        {
          error: "An unexpected error occurred while preparing the text",
          code: "PREPARE_ERROR",
        },
        { status: 500 }
      );
    }

    // 5. Delete source file after successful preparation
    try {
      await deleteFile(filePath);
    } catch (error) {
      // Log but don't fail the request if deletion fails
      console.error("[POST /api/prepare] Failed to delete source file:", error);
    }

    // 6. Log success (dev only)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[POST /api/prepare] Success:`, {
        filePath,
        pages: preparedText.stats.pages,
        textLengthRaw: preparedText.stats.textLengthRaw,
        textLengthClean: preparedText.stats.textLengthClean,
        textTokensApprox: preparedText.textTokensApprox,
        headings: preparedText.sections?.headings.length || 0,
      });
    }

    // 7. Return success response (including contract type if detected)
    return NextResponse.json(
      {
        textClean: preparedText.textClean,
        textTokensApprox: preparedText.textTokensApprox,
        stats: preparedText.stats,
        meta: preparedText.meta,
        sections: preparedText.sections,
        contractType: preparedText.contractType,
      },
      { status: 200 }
    );
  } catch (error) {
    // Catch-all error handler
    console.error("[POST /api/prepare] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
