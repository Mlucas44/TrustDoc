/**
 * POST /api/upload
 *
 * Secure file upload endpoint for PDF contracts.
 * - Validates authentication (user or guest with quota)
 * - Validates credits (user) or quota (guest)
 * - Validates file type (PDF only) and size (≤10 MB)
 * - Uploads to Supabase Storage (private bucket)
 * - Returns file metadata for analysis
 */

import { type NextRequest, NextResponse } from "next/server";

import { getSession } from "@/src/auth/session";
import { logUploadStarted, logUploadCompleted, logUploadFailed } from "@/src/lib/logger-events";
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimitForRoute, getRateLimitHeaders } from "@/src/middleware/rate-limit";
import { getRequestId } from "@/src/middleware/request-id";
import { getOrCreateGuestId } from "@/src/services/guest-quota";
import {
  uploadFile,
  validateFile,
  FileTooLargeError,
  UnsupportedFileTypeError,
  StorageUploadError,
} from "@/src/services/storage";

export const runtime = "nodejs";

/**
 * POST /api/upload
 *
 * Upload a PDF file to Supabase Storage
 *
 * @body FormData with "file" field (PDF, ≤10 MB)
 * @returns { fileId, filename, size, mimeType, path }
 *
 * @errors
 * - 400 Bad Request: Missing file or invalid FormData
 * - 401 Unauthorized: Not authenticated (guest or user)
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 413 Payload Too Large: File size exceeds 10 MB
 * - 415 Unsupported Media Type: File is not a PDF
 * - 429 Too Many Requests: Rate limit exceeded (5 uploads/min)
 * - 500 Internal Server Error: Upload failed
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);

  try {
    // 1. Check rate limit FIRST (before any processing)
    const rateLimit = checkRateLimitForRoute(request, "/api/upload");

    if (rateLimit && !rateLimit.allowed) {
      logUploadFailed({
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

    // 2. Check quota/credits BEFORE accepting file upload
    const quotaCheck = await requireQuotaOrUserCredit("/api/upload");

    if (!quotaCheck.allowed) {
      logUploadFailed({
        requestId,
        reason: quotaCheck.errorCode || "QUOTA_CHECK_FAILED",
        durationMs: Math.round(performance.now() - t0),
      });
      // Determine status code based on error
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

    // 3. Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      logUploadFailed({
        requestId,
        reason: "INVALID_FORM_DATA",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        { error: "Invalid request body. Expected multipart/form-data" },
        { status: 400 }
      );
    }

    // 4. Extract file from FormData
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      logUploadFailed({
        requestId,
        reason: "MISSING_FILE",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Missing or invalid file. Expected a file in the 'file' field",
          code: "MISSING_FILE",
        },
        { status: 400 }
      );
    }

    // 5. Validate file (throws on error)
    try {
      validateFile(file);
    } catch (error) {
      if (error instanceof FileTooLargeError) {
        logUploadFailed({
          requestId,
          reason: "FILE_TOO_LARGE",
          fileSize: file.size,
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: error.message,
            code: "FILE_TOO_LARGE",
          },
          { status: 413 }
        );
      }

      if (error instanceof UnsupportedFileTypeError) {
        logUploadFailed({
          requestId,
          reason: "UNSUPPORTED_FILE_TYPE",
          fileType: file.type,
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: error.message,
            code: "UNSUPPORTED_FILE_TYPE",
          },
          { status: 415 }
        );
      }

      // Unknown validation error
      logUploadFailed({
        requestId,
        reason: "VALIDATION_FAILED",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "File validation failed",
          code: "VALIDATION_FAILED",
        },
        { status: 400 }
      );
    }

    // 6. Determine user ID (authenticated user or guest)
    const session = await getSession();
    let userId: string;
    let isGuest: boolean;

    if (session?.user?.id) {
      // Authenticated user
      userId = session.user.id;
      isGuest = false;
    } else {
      // Guest user
      userId = await getOrCreateGuestId();
      isGuest = true;
    }

    // Log upload started
    logUploadStarted({
      requestId,
      userType: isGuest ? "guest" : "user",
      userId: isGuest ? undefined : userId,
      guestId: isGuest ? userId : undefined,
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // 7. Upload file to Supabase Storage
    let uploadResult;
    try {
      uploadResult = await uploadFile(file, userId, isGuest);
    } catch (error) {
      if (error instanceof StorageUploadError) {
        logUploadFailed({
          requestId,
          reason: "UPLOAD_FAILED",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: "Failed to upload file to storage",
            code: "UPLOAD_FAILED",
            details: error.message,
          },
          { status: 500 }
        );
      }

      // Unknown upload error
      logUploadFailed({
        requestId,
        reason: "UPLOAD_ERROR",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Upload failed due to an unexpected error",
          code: "UPLOAD_ERROR",
        },
        { status: 500 }
      );
    }

    // 8. Log upload completed
    logUploadCompleted({
      requestId,
      fileId: uploadResult.fileId,
      filename: uploadResult.filename,
      fileSize: uploadResult.size,
      storagePath: uploadResult.path,
      durationMs: Math.round(performance.now() - t0),
    });

    // 9. Return success response
    return NextResponse.json(
      {
        fileId: uploadResult.fileId,
        filename: uploadResult.filename,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        path: uploadResult.path,
      },
      { status: 200 }
    );
  } catch (error) {
    // Catch-all error handler
    logUploadFailed({
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
