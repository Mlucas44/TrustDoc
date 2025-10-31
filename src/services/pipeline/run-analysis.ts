/**
 * Analysis Pipeline Orchestration
 *
 * Runs the complete analysis pipeline with credit consumption and idempotency:
 * 1. Check idempotency (replay detection)
 * 2. Run LLM analysis
 * 3. Persist analysis to database
 * 4. Consume credits (only on success)
 * 5. Mark idempotency as succeeded
 *
 * All steps are wrapped in a transaction to ensure atomicity.
 */

import "server-only";

import { Prisma, type ContractType } from "@prisma/client";

import { AnalysisRepo, type CreateAnalysisInput } from "@/src/db/analysis.repo";
import { prisma } from "@/src/lib/prisma";
import { type AnalysisResult } from "@/src/schemas/analysis";
import { consumeGuestQuota } from "@/src/services/guest-quota";
import {
  withIdempotency,
  createFingerprint,
  type IdempotencyResult,
} from "@/src/services/idempotency";
import { analyzeContract } from "@/src/services/llm/analysis.service";

/**
 * Input for runAnalysis pipeline
 */
export interface RunAnalysisInput {
  /**
   * User ID (authenticated) or guest ID
   */
  userId: string;

  /**
   * Whether this is a guest user
   */
  isGuest: boolean;

  /**
   * Cleaned contract text
   */
  textClean: string;

  /**
   * Detected contract type
   */
  contractType: ContractType;

  /**
   * Contract type detection confidence (0-1)
   */
  typeConfidence?: number;

  /**
   * Original filename
   */
  filename: string;

  /**
   * Idempotency key (client-provided)
   */
  idempotencyKey: string;
}

/**
 * Output from runAnalysis pipeline
 */
export interface RunAnalysisOutput {
  /**
   * Analysis ID (persisted in database)
   */
  analysisId: string;

  /**
   * Analysis result (for display)
   */
  analysis: AnalysisResult;

  /**
   * Whether this was a replay (no credit charged)
   */
  isReplay: boolean;

  /**
   * Credits remaining (for authenticated users)
   */
  creditsRemaining?: number;
}

/**
 * Run the complete analysis pipeline
 *
 * This function orchestrates:
 * 1. Idempotency checking (prevents double-charging)
 * 2. LLM analysis
 * 3. Database persistence
 * 4. Credit consumption (atomic with persistence)
 *
 * @param input - Analysis input parameters
 * @returns Analysis result with metadata
 *
 * @example
 * ```ts
 * const result = await runAnalysis({
 *   userId: "clx...",
 *   isGuest: false,
 *   textClean: "Le Prestataire s'engage...",
 *   contractType: "FREELANCE",
 *   typeConfidence: 0.95,
 *   filename: "contrat.pdf",
 *   idempotencyKey: "idem_xyz123",
 * });
 *
 * console.log(`Analysis ${result.analysisId} created`);
 * console.log(`Credits remaining: ${result.creditsRemaining}`);
 * console.log(`Was replay: ${result.isReplay}`);
 * ```
 */
export async function runAnalysis(input: RunAnalysisInput): Promise<RunAnalysisOutput> {
  const { userId, isGuest, textClean, contractType, typeConfidence, filename, idempotencyKey } =
    input;

  const startTime = performance.now();

  // 1. Create fingerprint for idempotency checking
  const fingerprint = createFingerprint({
    userId,
    textClean: textClean.slice(0, 1000), // Use first 1000 chars for fingerprint
    contractType,
    filename,
  });

  // 2. Execute pipeline with idempotency protection
  const idempotencyResult: IdempotencyResult<RunAnalysisOutput> = await withIdempotency(
    idempotencyKey,
    fingerprint,
    async () => {
      // 3. Run LLM analysis
      console.log(`[runAnalysis] Running LLM analysis for ${filename}`);
      const llmStartTime = performance.now();

      const analysis = await analyzeContract({
        textClean,
        contractType,
      });

      const llmDuration = performance.now() - llmStartTime;
      console.log(
        `[runAnalysis] LLM analysis completed in ${llmDuration.toFixed(2)}ms, riskScore: ${analysis.riskScore}`
      );

      // 4. Persist analysis + consume credits in a single transaction
      console.log(`[runAnalysis] Persisting analysis and consuming credits`);
      const persistStartTime = performance.now();

      const result = await persistAndConsumeCredits({
        userId,
        isGuest,
        filename,
        contractType,
        typeConfidence,
        textLength: textClean.length,
        analysis,
      });

      const persistDuration = performance.now() - persistStartTime;
      console.log(
        `[runAnalysis] Persisted analysis ${result.analysisId} and consumed credits in ${persistDuration.toFixed(2)}ms`
      );

      const totalDuration = performance.now() - startTime;
      console.log(`[runAnalysis] Total pipeline duration: ${totalDuration.toFixed(2)}ms`);

      return result;
    }
  );

  // 5. Handle replay vs. new execution
  if (idempotencyResult.isReplay) {
    // Replay - fetch existing analysis
    console.warn(`[runAnalysis] Idempotency replay for key ${idempotencyKey}`, {
      status: idempotencyResult.status,
      resultId: idempotencyResult.resultId,
    });

    if (idempotencyResult.status === "SUCCEEDED" && idempotencyResult.resultId) {
      // Fetch existing analysis
      const existing = await AnalysisRepo.getById(idempotencyResult.resultId);

      if (!existing) {
        throw new Error(`Analysis ${idempotencyResult.resultId} not found (replay)`);
      }

      // Return cached result (no credit charge)
      return {
        analysisId: existing.id,
        analysis: {
          summary: existing.summary ? [existing.summary] : [],
          riskScore: existing.riskScore,
          riskJustification: existing.summary || "No justification available",
          redFlags: (existing.redFlags as any[]) || [],
          clauses: (existing.clauses as any[]) || [],
        },
        isReplay: true,
      };
    } else if (idempotencyResult.status === "FAILED") {
      // Previous attempt failed - rethrow error
      throw new Error(
        `Previous analysis attempt failed: ${idempotencyResult.errorCode} - ${idempotencyResult.errorMessage}`
      );
    }
  }

  // 6. New execution - return result
  const duration = performance.now() - startTime;
  console.log(
    `[runAnalysis] Analysis pipeline completed successfully in ${duration.toFixed(2)}ms`,
    {
      analysisId: idempotencyResult.result!.analysisId,
      isReplay: false,
      creditsRemaining: idempotencyResult.result!.creditsRemaining,
    }
  );

  return idempotencyResult.result!;
}

/**
 * Persist analysis and consume credits in a single transaction
 *
 * This ensures atomicity:
 * - If persistence fails → no credit charge
 * - If credit consumption fails → analysis is rolled back
 *
 * @param params - Analysis and user data
 * @returns Analysis ID and remaining credits
 */
async function persistAndConsumeCredits(params: {
  userId: string;
  isGuest: boolean;
  filename: string;
  contractType: ContractType;
  typeConfidence?: number;
  textLength: number;
  analysis: AnalysisResult;
}): Promise<RunAnalysisOutput> {
  const { userId, isGuest, filename, contractType, typeConfidence, textLength, analysis } = params;

  // For guests: persist analysis but use guest quota instead of credits
  if (isGuest) {
    // 1. Persist analysis (no transaction needed for guests)
    const persistedAnalysis = await AnalysisRepo.create({
      userId,
      filename,
      type: contractType,
      textLength,
      summary: analysis.summary.join("\n"),
      riskScore: analysis.riskScore,
      redFlags: analysis.redFlags as any,
      clauses: analysis.clauses as any,
      aiResponse: analysis as any,
    });

    // 2. Consume guest quota (separate operation)
    await consumeGuestQuota(userId); // userId is actually guestId for guests

    console.log(`[persistAndConsumeCredits] Guest analysis ${persistedAnalysis.id} created`, {
      guestId: userId,
    });

    return {
      analysisId: persistedAnalysis.id,
      analysis,
      isReplay: false,
    };
  }

  // For authenticated users: use Prisma transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify credits before creating analysis
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.credits < 1) {
      throw new Error(`User ${userId} has insufficient credits (${user.credits})`);
    }

    // 2. Create analysis
    const analysisInput: CreateAnalysisInput = {
      userId,
      filename,
      type: contractType,
      textLength,
      summary: analysis.summary.join("\n"),
      riskScore: analysis.riskScore,
      redFlags: analysis.redFlags as any,
      clauses: analysis.clauses as any,
      aiResponse: analysis as any,
    };

    const persistedAnalysis = await tx.analysis.create({
      data: {
        userId: analysisInput.userId,
        filename: analysisInput.filename,
        type: analysisInput.type,
        typeConfidence,
        textLength: analysisInput.textLength,
        summary: analysisInput.summary,
        riskScore: analysisInput.riskScore,
        redFlags: analysisInput.redFlags ?? Prisma.JsonNull,
        clauses: analysisInput.clauses ?? Prisma.JsonNull,
        aiResponse: analysisInput.aiResponse ?? Prisma.JsonNull,
      },
      select: {
        id: true,
        userId: true,
        filename: true,
        type: true,
        textLength: true,
        summary: true,
        riskScore: true,
        redFlags: true,
        clauses: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    // 3. Consume credits (decrement by 1)
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: 1,
        },
      },
      select: {
        credits: true,
      },
    });

    console.log(`[persistAndConsumeCredits] Analysis ${persistedAnalysis.id} created`, {
      userId,
      debit: 1,
      remaining: updatedUser.credits,
    });

    return {
      analysisId: persistedAnalysis.id,
      creditsRemaining: updatedUser.credits,
    };
  });

  return {
    analysisId: result.analysisId,
    analysis,
    isReplay: false,
    creditsRemaining: result.creditsRemaining,
  };
}
