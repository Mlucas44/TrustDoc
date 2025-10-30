/**
 * Contract Type Detection - Orchestrator
 *
 * Hybrid approach combining heuristic and LLM detection.
 * Strategy:
 * 1. Fast heuristic detection (< 200ms)
 * 2. If confidence ≥ 0.8 → return heuristic result
 * 3. Otherwise, validate with LLM (< 1.5s)
 * 4. Combine results using confidence scores
 */

import "server-only";

import { detectTypeHeuristic } from "./type-heuristic";
import { detectTypeLLM } from "./type-llm";

import type { DetectionResult } from "@/src/schemas/detect";

/**
 * Simple token bucket for rate limiting LLM calls
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token
   * @returns true if token was consumed, false if bucket is empty
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Rate limiter: max 5 LLM calls, refill at 0.5 calls/second (1 every 2 seconds)
const rateLimiter = new TokenBucket(5, 0.5);

/**
 * Detect contract type using hybrid approach
 *
 * @param textClean - Normalized contract text
 * @returns Detection result with type, confidence, source, evidence, and reason
 *
 * @example
 * ```ts
 * const result = await detectContractType(contractText);
 * // {
 * //   type: "FREELANCE",
 * //   confidence: 0.92,
 * //   source: "hybrid",
 * //   evidence: ["Contains 'prestation' and 'facturation'", ...],
 * //   reason: "LLM confirmed freelance agreement with high confidence"
 * // }
 * ```
 */
export async function detectContractType(textClean: string): Promise<DetectionResult> {
  const startTime = performance.now();

  // 1. Heuristic detection (fast)
  const heuristicResult = detectTypeHeuristic(textClean);

  // 2. If heuristic is very confident (≥ 0.8), return immediately
  if (heuristicResult.confidence >= 0.8) {
    const duration = performance.now() - startTime;
    console.log(
      `[detectContractType] Using heuristic only: ${heuristicResult.type} (confidence: ${heuristicResult.confidence.toFixed(2)}, ${duration.toFixed(2)}ms)`
    );

    return {
      type: heuristicResult.type,
      confidence: heuristicResult.confidence,
      source: "heuristic",
      evidence: heuristicResult.evidence,
    };
  }

  // 3. Check rate limit before calling LLM
  if (!rateLimiter.tryConsume()) {
    console.warn(
      `[detectContractType] Rate limit exceeded, using heuristic fallback: ${heuristicResult.type}`
    );
    return {
      type: heuristicResult.type,
      confidence: heuristicResult.confidence,
      source: "heuristic",
      evidence: heuristicResult.evidence,
      reason: "Rate limit exceeded, LLM not called",
    };
  }

  // 4. Call LLM for validation (slower but more accurate)
  try {
    const llmResult = await detectTypeLLM(textClean, heuristicResult.type);

    const duration = performance.now() - startTime;

    // 5. If LLM is very confident (≥ 0.7), trust it
    if (llmResult.confidence >= 0.7) {
      console.log(
        `[detectContractType] Using LLM: ${llmResult.type} (confidence: ${llmResult.confidence.toFixed(2)}, ${duration.toFixed(2)}ms)`
      );

      return {
        type: llmResult.type,
        confidence: llmResult.confidence,
        source: "llm",
        evidence: heuristicResult.evidence, // Keep heuristic evidence for context
        reason: llmResult.reason,
      };
    }

    // 6. Combine results (hybrid approach)
    // If both agree → boost confidence
    // If they disagree → take weighted average
    if (heuristicResult.type === llmResult.type) {
      const combinedConfidence = heuristicResult.confidence * 0.4 + llmResult.confidence * 0.6;

      console.log(
        `[detectContractType] Hybrid (agreement): ${heuristicResult.type} (confidence: ${combinedConfidence.toFixed(2)}, ${duration.toFixed(2)}ms)`
      );

      return {
        type: heuristicResult.type,
        confidence: combinedConfidence,
        source: "hybrid",
        evidence: heuristicResult.evidence,
        reason: `Both heuristic and LLM agree: ${llmResult.reason}`,
      };
    } else {
      // Disagreement: take the one with higher confidence
      const finalType =
        heuristicResult.confidence >= llmResult.confidence ? heuristicResult.type : llmResult.type;
      const finalConfidence = Math.max(heuristicResult.confidence, llmResult.confidence);

      console.log(
        `[detectContractType] Hybrid (disagreement): ${finalType} (confidence: ${finalConfidence.toFixed(2)}, ${duration.toFixed(2)}ms)`
      );

      return {
        type: finalType,
        confidence: finalConfidence,
        source: "hybrid",
        evidence: heuristicResult.evidence,
        reason: `Heuristic suggested ${heuristicResult.type}, LLM suggested ${llmResult.type}. ${llmResult.reason}`,
      };
    }
  } catch (error) {
    // LLM call failed, fallback to heuristic
    console.error("[detectContractType] LLM call failed, using heuristic fallback:", error);

    return {
      type: heuristicResult.type,
      confidence: heuristicResult.confidence,
      source: "heuristic",
      evidence: heuristicResult.evidence,
      reason: "LLM call failed, using heuristic only",
    };
  }
}
