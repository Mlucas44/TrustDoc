/**
 * POST /api/jobs/purge-analyses
 *
 * CRON job to physically purge soft-deleted analyses from database.
 * Permanently deletes analyses where deletedAt is older than ANALYSIS_PURGE_DAYS (default: 30 days).
 *
 * This is the final cleanup step after soft-delete. Soft-deleted analyses are
 * kept for a grace period before being physically removed.
 *
 * Security:
 * - Protected by CRON_SECRET header (x-cron-secret)
 * - Only accessible by Vercel Cron or authorized services
 *
 * Schedule: Daily (configured in vercel.json)
 */

import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/src/env";
import { logger } from "@/src/lib/logger";
import { prisma } from "@/src/lib/prisma";
import { validateCronRequest } from "@/src/middleware/cron-auth";
import { getRequestId } from "@/src/middleware/request-id";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for purge job

/**
 * Physically purge soft-deleted analyses
 */
async function purgeDeletedAnalyses(purgeDays: number): Promise<{ purged: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - purgeDays);

  // Permanently delete analyses that were soft-deleted before cutoff date
  const result = await prisma.analysis.deleteMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
    },
  });

  return { purged: result.count };
}

/**
 * POST /api/jobs/purge-analyses
 *
 * Physically purge soft-deleted analyses
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);
  const jobLogger = logger.child({ requestId });

  // 1. Validate CRON authentication
  const authError = validateCronRequest(request);
  if (authError) {
    jobLogger.warn("purge-analyses.unauthorized", {
      durationMs: Math.round(performance.now() - t0),
    });
    return authError;
  }

  try {
    const purgeDays = env.server.ANALYSIS_PURGE_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - purgeDays);

    jobLogger.info("purge-analyses.started", {
      purgeDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    // 2. Purge soft-deleted analyses
    const result = await purgeDeletedAnalyses(purgeDays);

    // 3. Log completion
    const durationMs = Math.round(performance.now() - t0);
    jobLogger.info("purge-analyses.completed", {
      purgedCount: result.purged,
      durationMs,
    });

    return NextResponse.json(
      {
        success: true,
        purged: result.purged,
        purgeDays,
        cutoffDate: cutoffDate.toISOString(),
        durationMs,
      },
      { status: 200 }
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    jobLogger.error("purge-analyses.failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });

    return NextResponse.json(
      {
        error: "Analysis purge job failed",
        code: "PURGE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
