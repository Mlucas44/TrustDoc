/**
 * POST /api/jobs/retention-analyses
 *
 * CRON job to enforce analysis data retention policy.
 * Soft-deletes analyses older than ANALYSIS_RETENTION_DAYS (default: 365 days).
 *
 * Soft-delete means setting `deletedAt` timestamp without physical removal.
 * Soft-deleted analyses are hidden from user views but remain in database
 * for ANALYSIS_PURGE_DAYS before being physically removed (see purge-analyses job).
 *
 * Security:
 * - Protected by CRON_SECRET header (x-cron-secret)
 * - Only accessible by Vercel Cron or authorized services
 *
 * Schedule: Hourly (configured in vercel.json)
 */

import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/src/env";
import { logger } from "@/src/lib/logger";
import { validateCronRequest } from "@/src/middleware/cron-auth";
import { getRequestId } from "@/src/middleware/request-id";

import { prisma } from "@/src/server/db";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for retention job

/**
 * Soft-delete old analyses
 */
async function softDeleteOldAnalyses(retentionDays: number): Promise<{ deleted: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Soft-delete analyses created before cutoff date
  // Only delete analyses that are not already deleted
  const result = await prisma.analysis.updateMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      deletedAt: null, // Only update non-deleted analyses
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return { deleted: result.count };
}

/**
 * POST /api/jobs/retention-analyses
 *
 * Soft-delete old analyses based on retention policy
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);
  const jobLogger = logger.child({ requestId, job: "retention-analyses" });

  // 1. Validate CRON authentication
  const authError = validateCronRequest(request);
  if (authError) {
    jobLogger.warn("retention-analyses.unauthorized", {
      durationMs: Math.round(performance.now() - t0),
    });
    return authError;
  }

  try {
    const retentionDays = env.server.ANALYSIS_RETENTION_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    jobLogger.info("retention-analyses.started", {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    // 2. Soft-delete old analyses
    const result = await softDeleteOldAnalyses(retentionDays);

    // 3. Log completion
    const durationMs = Math.round(performance.now() - t0);
    jobLogger.info("retention-analyses.completed", {
      deletedCount: result.deleted,
      durationMs,
    });

    return NextResponse.json(
      {
        success: true,
        deleted: result.deleted,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        durationMs,
      },
      { status: 200 }
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    jobLogger.error("retention-analyses.failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });

    return NextResponse.json(
      {
        error: "Analysis retention job failed",
        code: "RETENTION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
