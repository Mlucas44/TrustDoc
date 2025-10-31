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
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimit } from "@/src/middleware/rate-limit";
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
 * Rate limit configuration for uploads
 * 5 uploads per minute per IP
 */
const UPLOAD_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
};

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
  try {
    // 1. Check rate limit FIRST (before any processing)
    const rateLimit = checkRateLimit(request, UPLOAD_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de requêtes. Veuillez réessayer dans ${Math.ceil(rateLimit.resetIn / 1000)} secondes.`,
          code: "RATE_LIMIT_EXCEEDED",
          resetIn: rateLimit.resetIn,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetIn / 1000).toString(),
          },
        }
      );
    }

    // 2. Check quota/credits BEFORE accepting file upload
    const quotaCheck = await requireQuotaOrUserCredit("/api/upload");

    if (!quotaCheck.allowed) {
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

    // 2. Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[POST /api/upload] Failed to parse FormData:", error);
      return NextResponse.json(
        { error: "Invalid request body. Expected multipart/form-data" },
        { status: 400 }
      );
    }

    // 3. Extract file from FormData
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Missing or invalid file. Expected a file in the 'file' field",
          code: "MISSING_FILE",
        },
        { status: 400 }
      );
    }

    // 4. Validate file (throws on error)
    try {
      validateFile(file);
    } catch (error) {
      if (error instanceof FileTooLargeError) {
        return NextResponse.json(
          {
            error: error.message,
            code: "FILE_TOO_LARGE",
          },
          { status: 413 }
        );
      }

      if (error instanceof UnsupportedFileTypeError) {
        return NextResponse.json(
          {
            error: error.message,
            code: "UNSUPPORTED_FILE_TYPE",
          },
          { status: 415 }
        );
      }

      // Unknown validation error
      console.error("[POST /api/upload] File validation error:", error);
      return NextResponse.json(
        {
          error: "File validation failed",
          code: "VALIDATION_FAILED",
        },
        { status: 400 }
      );
    }

    // 5. Determine user ID (authenticated user or guest)
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

    // 6. Upload file to Supabase Storage
    let uploadResult;
    try {
      uploadResult = await uploadFile(file, userId, isGuest);
    } catch (error) {
      if (error instanceof StorageUploadError) {
        console.error("[POST /api/upload] Storage upload error:", error);
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
      console.error("[POST /api/upload] Unknown upload error:", error);
      return NextResponse.json(
        {
          error: "Upload failed due to an unexpected error",
          code: "UPLOAD_ERROR",
        },
        { status: 500 }
      );
    }

    // 7. Log upload (for monitoring/debugging)
    // eslint-disable-next-line no-console
    console.log(`[POST /api/upload] File uploaded successfully:`, {
      fileId: uploadResult.fileId,
      userId: isGuest ? `guest-${userId}` : userId,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
    });

    // 8. Return success response
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
    console.error("[POST /api/upload] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
