/**
 * POST /api/analyze
 *
 * Analyze contract using LLM with strict JSON validation.
 * - Validates input (textClean, contractType)
 * - Checks credits/quota before analysis
 * - Calls LLM with retry logic
 * - Returns structured analysis result
 */

import { type NextRequest, NextResponse } from "next/server";

import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";
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
 * - 500 Internal Server Error: LLM call failed
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check quota/credits
    const quotaCheck = await requireQuotaOrUserCredit("/api/analyze");

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
    let body: { textClean?: string; contractType?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error("[POST /api/analyze] Failed to parse JSON:", error);
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with textClean and contractType",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 3. Validate textClean
    const { textClean, contractType } = body;

    if (!textClean || typeof textClean !== "string") {
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
      return NextResponse.json(
        {
          error: "Text too long for analysis (max 200k chars)",
          code: "TEXT_TOO_LONG",
          length: textClean.length,
        },
        { status: 422 }
      );
    }

    // 4. Validate contractType
    if (!contractType || typeof contractType !== "string") {
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

    // 5. Call LLM analysis
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
        console.error("[POST /api/analyze] LLM rate limit exceeded:", error);
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
        console.error("[POST /api/analyze] LLM transient error:", error);
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
        console.error("[POST /api/analyze] LLM provider unavailable:", error);
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
        console.error("[POST /api/analyze] LLM output invalid after retries:", error);
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
      console.error("[POST /api/analyze] LLM call failed:", error);
      return NextResponse.json(
        {
          error: "Analysis failed: LLM service error",
          code: "ANALYSIS_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // 6. Log success (dev only)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[POST /api/analyze] Success:`, {
        contractType: contractTypeValidation.data,
        textLength: textClean.length,
        riskScore: analysis.riskScore,
        redFlags: analysis.redFlags.length,
        clauses: analysis.clauses.length,
      });
    }

    // 7. Return success response
    return NextResponse.json(
      {
        analysis,
      },
      { status: 200 }
    );
  } catch (error) {
    // Catch-all error handler
    console.error("[POST /api/analyze] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
