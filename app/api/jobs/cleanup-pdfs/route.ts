/**
 * POST /api/jobs/cleanup-pdfs
 *
 * CRON job to cleanup orphaned PDF files from storage.
 * Deletes files older than PDF_TTL_MINUTES (default: 30 minutes).
 *
 * This acts as a safety net for PDFs that weren't deleted after processing
 * (e.g., due to errors or crashes). PDFs should be deleted immediately after
 * processing in /api/prepare route.
 *
 * Security:
 * - Protected by CRON_SECRET header (x-cron-secret)
 * - Only accessible by Vercel Cron or authorized services
 *
 * Schedule: Hourly (configured in vercel.json)
 */

import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/src/env";
import { logger } from "@/src/lib/logger";
import { validateCronRequest } from "@/src/middleware/cron-auth";
import { getRequestId } from "@/src/middleware/request-id";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for cleanup job

const BUCKET_NAME = "contracts-temp";
const MOCK_STORAGE = env.server.MOCK_STORAGE === "true";

/**
 * Get Supabase client with service role
 */
function getSupabaseClient() {
  const supabaseUrl = env.client.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.server.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cleanup orphaned PDFs from Supabase Storage
 */
async function cleanupPDFsProduction(ttlMinutes: number): Promise<{ deleted: number }> {
  const supabase = getSupabaseClient();
  const cutoffTime = Date.now() - ttlMinutes * 60 * 1000;

  let totalDeleted = 0;

  // List all folders (user-* and guest-*)
  const { data: folders, error: foldersError } = await supabase.storage.from(BUCKET_NAME).list();

  if (foldersError) {
    throw new Error(`Failed to list folders: ${foldersError.message}`);
  }

  if (!folders || folders.length === 0) {
    return { deleted: 0 };
  }

  // Process each folder
  for (const folder of folders) {
    if (!folder.name.startsWith("user-") && !folder.name.startsWith("guest-")) {
      continue;
    }

    // List files in folder
    const { data: files, error: filesError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder.name);

    if (filesError) {
      logger.error("cleanup-pdfs.list-files-failed", {
        folder: folder.name,
        error: filesError.message,
      });
      continue;
    }

    if (!files || files.length === 0) {
      continue;
    }

    // Filter files older than TTL
    const oldFiles = files.filter((file) => {
      if (!file.created_at) return false;
      const createdAt = new Date(file.created_at).getTime();
      return createdAt < cutoffTime;
    });

    if (oldFiles.length === 0) {
      continue;
    }

    // Delete old files
    const filePaths = oldFiles.map((file) => `${folder.name}/${file.name}`);
    const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

    if (deleteError) {
      logger.error("cleanup-pdfs.delete-failed", {
        folder: folder.name,
        count: filePaths.length,
        error: deleteError.message,
      });
      continue;
    }

    totalDeleted += filePaths.length;

    logger.info("cleanup-pdfs.folder-cleaned", {
      folder: folder.name,
      deletedCount: filePaths.length,
    });
  }

  return { deleted: totalDeleted };
}

/**
 * Cleanup orphaned PDFs from mock storage (local filesystem)
 */
async function cleanupPDFsMock(_ttlMinutes: number): Promise<{ deleted: number }> {
  // In mock mode, we don't have file metadata, so we skip cleanup
  // PDFs are deleted immediately after processing in /api/prepare
  logger.info("cleanup-pdfs.skipped-mock-mode", {
    reason: "Mock storage does not support TTL cleanup",
  });
  return { deleted: 0 };
}

/**
 * POST /api/jobs/cleanup-pdfs
 *
 * Cleanup orphaned PDFs from storage
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);
  const jobLogger = logger.child({ requestId, job: "cleanup-pdfs" });

  // 1. Validate CRON authentication
  const authError = validateCronRequest(request);
  if (authError) {
    jobLogger.warn("cleanup-pdfs.unauthorized", {
      durationMs: Math.round(performance.now() - t0),
    });
    return authError;
  }

  try {
    const ttlMinutes = env.server.PDF_TTL_MINUTES;

    jobLogger.info("cleanup-pdfs.started", {
      ttlMinutes,
      cutoffTime: new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString(),
    });

    // 2. Cleanup PDFs (mock or production)
    let result: { deleted: number };

    if (MOCK_STORAGE) {
      result = await cleanupPDFsMock(ttlMinutes);
    } else {
      result = await cleanupPDFsProduction(ttlMinutes);
    }

    // 3. Log completion
    const durationMs = Math.round(performance.now() - t0);
    jobLogger.info("cleanup-pdfs.completed", {
      deletedCount: result.deleted,
      durationMs,
    });

    return NextResponse.json(
      {
        success: true,
        deleted: result.deleted,
        ttlMinutes,
        durationMs,
      },
      { status: 200 }
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    jobLogger.error("cleanup-pdfs.failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });

    return NextResponse.json(
      {
        error: "PDF cleanup failed",
        code: "CLEANUP_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
