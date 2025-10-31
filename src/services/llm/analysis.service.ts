/**
 * LLM Analysis Service
 *
 * Unified service for contract analysis using LLM providers (OpenAI, Ollama).
 * Handles provider selection, validation, retry logic, and observability.
 */

import "server-only";

import { env } from "@/src/env";
import { AnalysisInvalidError, AnalysisSchema } from "@/src/schemas/analysis";

import { analysisPrompt, getSystemPrompt, repairPrompt } from "./prompts";
import { OllamaProvider } from "./providers/ollama";
import { OpenAIProvider } from "./providers/openai";

import type { ILLMProvider, LLMProvider } from "./types";
import type { AnalysisResult } from "@/src/schemas/analysis";
import type { ContractType } from "@/src/schemas/detect";

/**
 * Maximum retry attempts for repair prompts
 */
const MAX_RETRY_ATTEMPTS = 2;

/**
 * Input for analyzeContract function
 */
export interface AnalyzeContractInput {
  textClean: string;
  contractType: ContractType;
  modelHint?: LLMProvider;
}

/**
 * Select LLM provider based on feature flags and hints
 *
 * @param modelHint - Optional hint to use specific provider
 * @returns LLM provider instance
 */
function selectProvider(modelHint?: LLMProvider): ILLMProvider {
  // 1. Feature flag: USE_OLLAMA=true → always use Ollama
  if (env.server.USE_OLLAMA === "true") {
    console.log("[selectProvider] USE_OLLAMA=true, using Ollama");
    return new OllamaProvider();
  }

  // 2. Model hint: prefer hinted provider
  if (modelHint === "ollama") {
    console.log("[selectProvider] modelHint=ollama, using Ollama");
    return new OllamaProvider();
  }

  // 3. Default: use OpenAI
  console.log("[selectProvider] Using OpenAI (default)");
  return new OpenAIProvider();
}

/**
 * Parse and validate LLM JSON output
 *
 * @param rawOutput - Raw JSON string from LLM
 * @returns Validation result with data or errors
 */
function parseAndValidate(rawOutput: string): {
  success: boolean;
  data?: AnalysisResult;
  errors?: string[];
} {
  try {
    // 1. Parse JSON
    const parsed = JSON.parse(rawOutput);

    // 2. Validate with Zod schema
    const validation = AnalysisSchema.safeParse(parsed);

    if (validation.success) {
      return { success: true, data: validation.data };
    }

    // 3. Collect validation errors
    const errors = validation.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);

    return { success: false, errors };
  } catch (error) {
    // JSON parsing failed
    return {
      success: false,
      errors: [`JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Analyze contract using LLM with validation & retry logic
 *
 * @param input - Contract text, type, and optional model hint
 * @returns Validated analysis result
 * @throws {AnalysisInvalidError} If LLM output cannot be validated after retries
 * @throws {LLMRateLimitError} If provider rate limit exceeded
 * @throws {LLMTransientError} If provider encounters transient error
 * @throws {LLMUnavailableError} If provider is unavailable
 *
 * @example
 * ```ts
 * const analysis = await analyzeContract({
 *   textClean: "Le Prestataire s'engage à...",
 *   contractType: "FREELANCE",
 *   modelHint: "openai" // optional
 * });
 * ```
 */
export async function analyzeContract(input: AnalyzeContractInput): Promise<AnalysisResult> {
  const { textClean, contractType, modelHint } = input;
  const startTime = performance.now();

  // 1. Select provider
  const provider = selectProvider(modelHint);
  console.log(`[analyzeContract] Using provider: ${provider.name}`);

  // 2. Build prompts
  const systemPrompt = getSystemPrompt();
  const userPrompt = analysisPrompt(contractType, textClean);

  // 3. Initial LLM call
  let retryCount = 0;
  let rawOutput: string;

  try {
    const response = await provider.call({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    rawOutput = response.content;
    console.log(
      `[analyzeContract] Initial call: ${response.content.length} chars, ${response.tokensUsed || "?"} tokens`
    );
  } catch (error) {
    // Provider errors (rate limit, transient, unavailable) bubble up
    const duration = performance.now() - startTime;
    console.error(`[analyzeContract] Provider call failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }

  // 4. Validate initial output
  let validation = parseAndValidate(rawOutput);

  if (validation.success && validation.data) {
    const duration = performance.now() - startTime;
    console.log(
      `[analyzeContract] Success on first attempt (${duration.toFixed(2)}ms) - provider: ${provider.name}, retries: ${retryCount}`
    );
    return validation.data;
  }

  // 5. Retry with repair prompt (max MAX_RETRY_ATTEMPTS)
  console.warn(
    `[analyzeContract] Initial output invalid, retrying with repair prompt. Errors:`,
    validation.errors
  );

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    retryCount++;

    const repairUserPrompt = repairPrompt(rawOutput, validation.errors || []);

    try {
      const response = await provider.call({
        systemPrompt,
        userPrompt: repairUserPrompt,
        temperature: 0.3,
      });

      rawOutput = response.content;
      console.log(
        `[analyzeContract] Repair attempt ${attempt}: ${response.content.length} chars, ${response.tokensUsed || "?"} tokens`
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `[analyzeContract] Repair attempt ${attempt} failed after ${duration.toFixed(2)}ms:`,
        error
      );
      throw error;
    }

    validation = parseAndValidate(rawOutput);

    if (validation.success && validation.data) {
      const duration = performance.now() - startTime;
      console.log(
        `[analyzeContract] Success after ${retryCount} repair attempts (${duration.toFixed(2)}ms) - provider: ${provider.name}`
      );
      return validation.data;
    }

    console.warn(
      `[analyzeContract] Repair attempt ${attempt} still invalid. Errors:`,
      validation.errors
    );
  }

  // 6. Max retries exceeded - throw error
  const duration = performance.now() - startTime;
  console.error(
    `[analyzeContract] Failed after ${retryCount} repair attempts (${duration.toFixed(2)}ms) - provider: ${provider.name}`
  );

  throw new AnalysisInvalidError(
    `LLM output invalid after ${MAX_RETRY_ATTEMPTS} repair attempts`,
    validation.errors || []
  );
}
