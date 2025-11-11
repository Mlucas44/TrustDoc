/**
 * POST /api/analyze
 *
 * Analyze contract using LLM with strict JSON validation.
 * - Validates rate limit (3 requests/5min per IP)
 * - Validates jobId with Zod
 * - Retrieves text_clean from analysis_jobs table (stateless)
 * - Checks credits/quota before analysis
 * - Calls LLM with retry logic
 * - Updates analysis_jobs with result
 * - Returns structured analysis result
 */

import { type NextRequest, NextResponse } from "next/server";

import {
  logAnalysisStarted,
  logAnalysisCompleted,
  logAnalysisFailed,
} from "@/src/lib/logger-events";
import { Trace } from "@/src/lib/timing";
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimitForRoute, getRateLimitHeaders } from "@/src/middleware/rate-limit";
import { getRequestId } from "@/src/middleware/request-id";
import { AnalysisInvalidError } from "@/src/schemas/analysis";
import { AnalyzeRequestSchema } from "@/src/schemas/analysis-job";
import {
  getAnalysisJob,
  updateAnalysisJob,
  AnalysisJobNotFoundError,
  AnalysisJobAccessDeniedError,
  AnalysisJobDBError,
} from "@/src/services/db/analysis-job.service";
import { analyzeContract } from "@/src/services/llm/analysis.service";
import {
  LLMRateLimitError,
  LLMTransientError,
  LLMUnavailableError,
} from "@/src/services/llm/errors";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for LLM analysis

/**
 * POST /api/analyze
 *
 * Analyze contract text with LLM (stateless - reads from DB)
 *
 * @body { jobId: string } - Analysis job ID from /api/prepare
 * @returns { analysis: AnalysisResult, analysisId: string }
 *
 * @errors
 * - 400 Bad Request: Missing or invalid jobId (Zod validation)
 * - 401 Unauthorized: Not authenticated
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 403 Forbidden: Access denied to job (not owned by user)
 * - 404 Not Found: Job not found in database
 * - 422 Unprocessable Entity: LLM output invalid after retries OR text_clean missing/too short
 * - 429 Too Many Requests: Rate limit exceeded (3 requests/5min)
 * - 500 Internal Server Error: LLM call failed OR DB read/write failed
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);
  const trace = new Trace(requestId);

  try {
    // 1. Check rate limit FIRST (before any processing)
    const rateLimit = checkRateLimitForRoute(request, "/api/analyze");

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
    const quotaCheck = await requireQuotaOrUserCredit("/api/analyze");

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
      body = AnalyzeRequestSchema.parse(rawBody);
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
          error: "Invalid request body. Expected JSON with jobId",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const { jobId } = body;

    // 4. Retrieve analysis job from database (with access control)
    let job;
    try {
      const endDbRead = trace.start("db-read");
      job = await getAnalysisJob(jobId, quotaCheck.userId || quotaCheck.guestId || "");
      endDbRead();

      console.log(
        `[POST /api/analyze] [${requestId}] Retrieved job: ${jobId} (status: ${job.status})`
      );
    } catch (error) {
      if (error instanceof AnalysisJobNotFoundError) {
        logAnalysisFailed({
          requestId,
          reason: "JOB_NOT_FOUND",
          durationMs: Math.round(performance.now() - t0),
        });

        return NextResponse.json(
          {
            error: "Analysis job not found",
            code: "JOB_NOT_FOUND",
            jobId,
          },
          { status: 404 }
        );
      }

      if (error instanceof AnalysisJobAccessDeniedError) {
        logAnalysisFailed({
          requestId,
          reason: "ACCESS_DENIED",
          durationMs: Math.round(performance.now() - t0),
        });

        return NextResponse.json(
          {
            error: "Access denied to this analysis job",
            code: "ACCESS_DENIED",
            jobId,
          },
          { status: 403 }
        );
      }

      if (error instanceof AnalysisJobDBError) {
        console.error(
          `[POST /api/analyze] [${requestId}] Database read failed:`,
          error.message,
          error.cause
        );

        logAnalysisFailed({
          requestId,
          reason: "DB_READ_FAILED",
          durationMs: Math.round(performance.now() - t0),
        });

        return NextResponse.json(
          {
            error: "Failed to retrieve analysis job from database",
            code: "DB_READ_FAILED",
          },
          { status: 500 }
        );
      }

      throw error; // Rethrow unexpected errors
    }

    // 5. Check if job already analyzed (idempotence)
    if (job.status === "analyzed" && job.result) {
      console.log(`[POST /api/analyze] [${requestId}] Job already analyzed, returning cached result`);

      logAnalysisCompleted({
        requestId,
        riskScore: (job.result as any).riskScore || 0,
        redFlagsCount: (job.result as any).redFlags?.length || 0,
        clausesCount: (job.result as any).clauses?.length || 0,
        durationMs: Math.round(performance.now() - t0),
      });

      return NextResponse.json(
        {
          analysis: job.result,
          analysisId: jobId, // Return jobId as analysisId for compatibility
        },
        { status: 200 }
      );
    }

    // 6. Validate text_clean exists and is not empty
    const textClean = job.textClean;

    if (!textClean || typeof textClean !== "string") {
      logAnalysisFailed({
        requestId,
        reason: "MISSING_TEXT_CLEAN",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Missing or invalid text_clean in analysis job. Please re-run /api/prepare",
          code: "MISSING_TEXT_CLEAN",
          jobId,
        },
        { status: 422 }
      );
    }

    // Validate minimum length
    if (textClean.length < 200) {
      logAnalysisFailed({
        requestId,
        reason: "TEXT_TOO_SHORT",
        textLength: textClean.length,
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Text too short for analysis (min 200 chars)",
          code: "TEXT_TOO_SHORT",
          length: textClean.length,
          jobId,
        },
        { status: 422 }
      );
    }

    // Validate maximum length (to prevent excessive LLM costs)
    if (textClean.length > 200000) {
      logAnalysisFailed({
        requestId,
        reason: "TEXT_TOO_LONG",
        textLength: textClean.length,
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Text too long for analysis (max 200k chars)",
          code: "TEXT_TOO_LONG",
          length: textClean.length,
          jobId,
        },
        { status: 422 }
      );
    }

    // 7. Validate contract type
    const contractType = job.contractType;

    if (!contractType) {
      logAnalysisFailed({
        requestId,
        reason: "MISSING_CONTRACT_TYPE",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error:
            "Missing contract_type in analysis job. Expected one of: CGU, FREELANCE, EMPLOI, NDA, DEVIS, PARTENARIAT, AUTRE",
          code: "MISSING_CONTRACT_TYPE",
          jobId,
        },
        { status: 422 }
      );
    }

    // Log analysis started
    logAnalysisStarted({
      requestId,
      userType: quotaCheck.isGuest ? "guest" : "user",
      userId: quotaCheck.userId,
      guestId: quotaCheck.guestId,
      fileId: jobId, // Use jobId as fileId for logging
      contractType: contractType as any,
      textLength: textClean.length,
    });

    // 8. Call LLM analysis
    let analysis;
    try {
      const endLlm = trace.start("llm-analysis");
      analysis = await analyzeContract({
        textClean,
        contractType: contractType as any,
        trace,
      });
      endLlm();
    } catch (error) {
      // Mark job as failed in DB
      try {
        await updateAnalysisJob(
          jobId,
          "failed",
          undefined,
          error instanceof Error ? error.name : "UNKNOWN_ERROR",
          error instanceof Error ? error.message : String(error)
        );
      } catch (dbError) {
        console.error(
          `[POST /api/analyze] [${requestId}] Failed to update job status to failed:`,
          dbError
        );
      }

      // Handle rate limit errors (429)
      if (error instanceof LLMRateLimitError) {
        logAnalysisFailed({
          requestId,
          reason: "LLM_RATE_LIMIT_EXCEEDED",
          provider: error.provider,
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: `Rate limit exceeded for ${error.provider}. Please try again later.`,
            code: "RATE_LIMIT_EXCEEDED",
            provider: error.provider,
            retryAfter: error.retryAfter,
            jobId,
          },
          { status: 429 }
        );
      }

      // Handle transient errors (5xx from provider)
      if (error instanceof LLMTransientError) {
        logAnalysisFailed({
          requestId,
          reason: "LLM_TRANSIENT_ERROR",
          provider: error.provider,
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: `Temporary error from ${error.provider}. Please try again.`,
            code: "LLM_TRANSIENT_ERROR",
            provider: error.provider,
            jobId,
          },
          { status: 503 }
        );
      }

      // Handle provider unavailable errors
      if (error instanceof LLMUnavailableError) {
        logAnalysisFailed({
          requestId,
          reason: "LLM_UNAVAILABLE",
          provider: error.provider,
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: `LLM provider ${error.provider} is unavailable. Please try again later.`,
            code: "LLM_UNAVAILABLE",
            provider: error.provider,
            jobId,
          },
          { status: 503 }
        );
      }

      // Handle invalid LLM output (after retries)
      if (error instanceof AnalysisInvalidError) {
        logAnalysisFailed({
          requestId,
          reason: "ANALYSIS_INVALID_OUTPUT",
          durationMs: Math.round(performance.now() - t0),
        });
        return NextResponse.json(
          {
            error: "Analysis failed: LLM output could not be validated",
            code: "ANALYSIS_INVALID_OUTPUT",
            validationErrors: error.validationErrors,
            jobId,
          },
          { status: 422 }
        );
      }

      // Handle other LLM errors
      console.error(`[POST /api/analyze] [${requestId}] LLM analysis failed:`, error);

      logAnalysisFailed({
        requestId,
        reason: "ANALYSIS_FAILED",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Analysis failed: LLM service error",
          code: "ANALYSIS_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          jobId,
        },
        { status: 500 }
      );
    }

    // 9. Update job status to 'analyzed' and persist result
    try {
      const endDbWrite = trace.start("db-write");
      await updateAnalysisJob(jobId, "analyzed", analysis as any);
      endDbWrite();

      console.log(`[POST /api/analyze] [${requestId}] Updated job ${jobId} to analyzed`);
    } catch (error) {
      console.error(
        `[POST /api/analyze] [${requestId}] Failed to update job with result:`,
        error
      );
      // Don't fail the request if DB update fails - analysis succeeded
    }

    // 10. Log analysis completed
    logAnalysisCompleted({
      requestId,
      riskScore: analysis.riskScore,
      redFlagsCount: analysis.redFlags.length,
      clausesCount: analysis.clauses.length,
      durationMs: Math.round(performance.now() - t0),
    });

    // 11. Return success response
    const responseHeaders = new Headers();
    if (process.env.NODE_ENV === "development") {
      const headers = trace.toHeaders("x-td-latency-");
      Object.entries(headers).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
    }

    return NextResponse.json(
      {
        analysis,
        analysisId: jobId, // Return jobId as analysisId for compatibility
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    // Catch-all error handler
    console.error(`[POST /api/analyze] [${requestId}] Internal error:`, error);

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
