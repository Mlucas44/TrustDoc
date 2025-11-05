/**
 * POST /api/analyze
 *
 * Analyze contract using LLM with strict JSON validation.
 * - Validates rate limit (3 requests/5min per IP)
 * - Validates input (textClean, contractType)
 * - Checks credits/quota before analysis
 * - Calls LLM with retry logic
 * - Returns structured analysis result
 */

import { type NextRequest, NextResponse } from "next/server";

import {
  logAnalysisStarted,
  logAnalysisCompleted,
  logAnalysisFailed,
} from "@/src/lib/logger-events";
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
import { checkRateLimitForRoute, getRateLimitHeaders } from "@/src/middleware/rate-limit";
import { getRequestId } from "@/src/middleware/request-id";
import { AnalysisInvalidError } from "@/src/schemas/analysis";
import { ContractTypeEnum } from "@/src/schemas/detect";
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
 * Analyze contract text with LLM
 *
 * @body { textClean: string, contractType: ContractType }
 * @returns { analysis: AnalysisResult }
 *
 * @errors
 * - 400 Bad Request: Missing or invalid input
 * - 401 Unauthorized: Not authenticated
 * - 402 Payment Required: Insufficient credits or quota exceeded
 * - 422 Unprocessable Entity: LLM output invalid after retries
 * - 429 Too Many Requests: Rate limit exceeded (3 requests/5min)
 * - 500 Internal Server Error: LLM call failed
 */
export async function POST(request: NextRequest) {
  const t0 = performance.now();
  const requestId = getRequestId(request);

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

    // 3. Parse request body
    let body: { textClean?: string; contractType?: string };
    try {
      body = await request.json();
    } catch (error) {
      logAnalysisFailed({
        requestId,
        reason: "INVALID_JSON",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with textClean and contractType",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 4. Validate textClean
    const { textClean, contractType } = body;

    if (!textClean || typeof textClean !== "string") {
      logAnalysisFailed({
        requestId,
        reason: "MISSING_TEXT_CLEAN",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error: "Missing or invalid textClean. Expected string",
          code: "MISSING_TEXT_CLEAN",
        },
        { status: 400 }
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
        },
        { status: 422 }
      );
    }

    // 5. Validate contractType
    if (!contractType || typeof contractType !== "string") {
      logAnalysisFailed({
        requestId,
        reason: "MISSING_CONTRACT_TYPE",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error:
            "Missing or invalid contractType. Expected one of: CGU, FREELANCE, EMPLOI, NDA, DEVIS, PARTENARIAT, AUTRE",
          code: "MISSING_CONTRACT_TYPE",
        },
        { status: 400 }
      );
    }

    const contractTypeValidation = ContractTypeEnum.safeParse(contractType);
    if (!contractTypeValidation.success) {
      logAnalysisFailed({
        requestId,
        reason: "INVALID_CONTRACT_TYPE",
        durationMs: Math.round(performance.now() - t0),
      });
      return NextResponse.json(
        {
          error:
            "Invalid contractType. Must be one of: CGU, FREELANCE, EMPLOI, NDA, DEVIS, PARTENARIAT, AUTRE",
          code: "INVALID_CONTRACT_TYPE",
          received: contractType,
        },
        { status: 400 }
      );
    }

    // Log analysis started
    logAnalysisStarted({
      requestId,
      userType: quotaCheck.isGuest ? "guest" : "user",
      userId: quotaCheck.userId,
      guestId: quotaCheck.guestId,
      fileId: "inline-text", // No fileId for direct text analysis
      contractType: contractTypeValidation.data,
      textLength: textClean.length,
    });

    // 6. Call LLM analysis
    let analysis;
    try {
      analysis = await analyzeContract({
        textClean,
        contractType: contractTypeValidation.data,
        // modelHint can be added here if needed (e.g., from query params)
      });
    } catch (error) {
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
          },
          { status: 422 }
        );
      }

      // Handle other LLM errors
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
        },
        { status: 500 }
      );
    }

    // 7. Log analysis completed
    logAnalysisCompleted({
      requestId,
      riskScore: analysis.riskScore,
      redFlagsCount: analysis.redFlags.length,
      clausesCount: analysis.clauses.length,
      durationMs: Math.round(performance.now() - t0),
    });

    // 8. Return success response
    return NextResponse.json(
      {
        analysis,
      },
      { status: 200 }
    );
  } catch (error) {
    // Catch-all error handler
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
