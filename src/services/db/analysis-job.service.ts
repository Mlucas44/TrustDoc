/**
 * Analysis Job Database Service
 *
 * Provides durable storage for analysis pipeline state between /api/prepare and /api/analyze.
 * Ensures stateless execution and proper error handling.
 */

import "server-only";

import { createId } from "@paralleldrive/cuid2";

import { prisma } from "@/src/lib/db";

import type { AnalysisJobStatus } from "@/src/schemas/analysis-job";

/**
 * Custom errors
 */
export class AnalysisJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Analysis job not found: ${jobId}`);
    this.name = "AnalysisJobNotFoundError";
  }
}

export class AnalysisJobAccessDeniedError extends Error {
  constructor(jobId: string, userId: string) {
    super(`Access denied to analysis job ${jobId} for user ${userId}`);
    this.name = "AnalysisJobAccessDeniedError";
  }
}

export class AnalysisJobDBError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AnalysisJobDBError";
  }
}

/**
 * Analysis job insert data
 */
export interface AnalysisJobInsertData {
  userId: string;
  guestId?: string;
  filePath?: string;
  filename?: string;
  contractType?: string;
  textRaw?: string;
  textClean?: string;
  textLengthRaw?: number;
  textLengthClean?: number;
  textTokensApprox?: number;
  pages?: number;
  meta?: Record<string, unknown>;
  sections?: unknown[];
}

/**
 * Create a new analysis job
 *
 * @param data - Job data to insert
 * @returns Created job ID
 */
export async function createAnalysisJob(data: AnalysisJobInsertData): Promise<string> {
  try {
    const jobId = createId();

    const job = await prisma.analysisJob.create({
      data: {
        id: jobId,
        userId: data.userId,
        guestId: data.guestId,
        status: "prepared",
        filePath: data.filePath,
        filename: data.filename,
        contractType: data.contractType as never,
        textRaw: data.textRaw,
        textClean: data.textClean,
        textLengthRaw: data.textLengthRaw,
        textLengthClean: data.textLengthClean,
        textTokensApprox: data.textTokensApprox,
        pages: data.pages,
        meta: data.meta as never,
        sections: data.sections as never,
      },
    });

    return job.id;
  } catch (error) {
    console.error("[createAnalysisJob] Database error:", error);
    throw new AnalysisJobDBError("Failed to create analysis job in database", error);
  }
}

/**
 * Get analysis job by ID with user access check
 *
 * @param jobId - Job ID
 * @param userId - User ID (can be user-xxx or guest-xxx)
 * @returns Analysis job data
 * @throws {AnalysisJobNotFoundError} If job not found
 * @throws {AnalysisJobAccessDeniedError} If user doesn't own the job
 */
export async function getAnalysisJob(jobId: string, userId: string) {
  try {
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new AnalysisJobNotFoundError(jobId);
    }

    // Check access: userId must match either userId or guestId
    const hasAccess = job.userId === userId || job.guestId === userId;

    if (!hasAccess) {
      throw new AnalysisJobAccessDeniedError(jobId, userId);
    }

    return job;
  } catch (error) {
    if (
      error instanceof AnalysisJobNotFoundError ||
      error instanceof AnalysisJobAccessDeniedError
    ) {
      throw error;
    }
    console.error("[getAnalysisJob] Database error:", error);
    throw new AnalysisJobDBError("Failed to retrieve analysis job from database", error);
  }
}

/**
 * Update analysis job status and result
 *
 * @param jobId - Job ID
 * @param status - New status
 * @param result - Analysis result (for analyzed status)
 * @param errorCode - Error code (for failed status)
 * @param errorMessage - Error message (for failed status)
 */
export async function updateAnalysisJob(
  jobId: string,
  status: AnalysisJobStatus,
  result?: Record<string, unknown>,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status,
        result: result as never,
        errorCode,
        errorMessage,
      },
    });
  } catch (error) {
    console.error("[updateAnalysisJob] Database error:", error);
    throw new AnalysisJobDBError("Failed to update analysis job in database", error);
  }
}

/**
 * Delete expired analysis jobs (cleanup utility)
 *
 * @returns Number of jobs deleted
 */
export async function deleteExpiredAnalysisJobs(): Promise<number> {
  try {
    const result = await prisma.analysisJob.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error("[deleteExpiredAnalysisJobs] Database error:", error);
    throw new AnalysisJobDBError("Failed to delete expired analysis jobs", error);
  }
}
