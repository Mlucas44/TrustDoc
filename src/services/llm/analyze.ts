/**
 * LLM Analysis Service
 *
 * Calls LLM (OpenAI or Ollama) to analyze contracts with strict JSON validation.
 * Implements retry logic with repair prompts for invalid outputs.
 */

import "server-only";

import OpenAI from "openai";

import { env } from "@/src/env";
import { AnalysisInvalidError, AnalysisSchema, type AnalysisResult } from "@/src/schemas/analysis";

import { analysisPrompt, getSystemPrompt, repairPrompt } from "./prompts";

import type { ContractType } from "@/src/schemas/detect";

const MAX_RETRY_ATTEMPTS = 2;
const USE_OLLAMA = process.env.USE_OLLAMA === "true";

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: env.server.OPENAI_API_KEY,
  });
}

/**
 * Initialize Ollama client (compatible with OpenAI SDK)
 */
function getOllamaClient(): OpenAI {
  const ollamaBaseUrl = env.server.OLLAMA_BASE_URL || "http://localhost:11434/v1";

  return new OpenAI({
    apiKey: "ollama", // Ollama doesn't require a real API key
    baseURL: ollamaBaseUrl,
  });
}

/**
 * Call LLM (OpenAI or Ollama) with a prompt
 *
 * @param systemPrompt - System instructions
 * @param userPrompt - User prompt with contract text
 * @returns Raw LLM response text
 */
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = USE_OLLAMA ? getOllamaClient() : getOpenAIClient();
  const model = USE_OLLAMA ? "mistral" : "gpt-4o-mini";

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistency
      response_format: USE_OLLAMA ? undefined : { type: "json_object" }, // OpenAI only
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from LLM");
    }

    return content;
  } catch (error) {
    console.error("[callLLM] LLM API error:", error);
    throw new Error(`LLM call failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Parse and validate LLM output
 *
 * @param rawOutput - Raw LLM response
 * @returns Validated analysis result
 * @throws Error if JSON parsing fails
 */
function parseAndValidate(rawOutput: string): {
  success: boolean;
  data?: AnalysisResult;
  errors?: string[];
} {
  try {
    // 1. Parse JSON
    const parsed = JSON.parse(rawOutput);

    // 2. Validate with Zod
    const validation = AnalysisSchema.safeParse(parsed);

    if (validation.success) {
      return { success: true, data: validation.data };
    } else {
      // Extract readable error messages
      const errors = validation.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`JSON parse error: ${error instanceof Error ? error.message : "Invalid JSON"}`],
    };
  }
}

/**
 * Analyze contract using LLM with validation and retry
 *
 * @param textClean - Normalized contract text
 * @param contractType - Detected contract type
 * @returns Validated analysis result
 * @throws {AnalysisInvalidError} If LLM output is invalid after max retries
 * @throws {Error} If LLM call fails
 *
 * @example
 * ```ts
 * const analysis = await callAnalysisLLM(contractText, "FREELANCE");
 * console.log(`Risk score: ${analysis.riskScore}`);
 * console.log(`Red flags: ${analysis.redFlags.length}`);
 * ```
 */
export async function callAnalysisLLM(
  textClean: string,
  contractType: ContractType
): Promise<AnalysisResult> {
  const startTime = performance.now();
  const systemPrompt = getSystemPrompt();
  const userPrompt = analysisPrompt(contractType, textClean);

  console.log(
    `[callAnalysisLLM] Starting analysis for ${contractType} (${textClean.length} chars, ${USE_OLLAMA ? "Ollama" : "OpenAI"})`
  );

  // 1. Initial LLM call
  let rawOutput = await callLLM(systemPrompt, userPrompt);
  let validation = parseAndValidate(rawOutput);

  // 2. If valid, return immediately
  if (validation.success && validation.data) {
    const duration = performance.now() - startTime;
    console.log(
      `[callAnalysisLLM] Success on first try (${duration.toFixed(2)}ms, risk: ${validation.data.riskScore})`
    );
    return validation.data;
  }

  // 3. Retry with repair prompt (max 2 attempts)
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    console.warn(
      `[callAnalysisLLM] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} - Invalid output, retrying with repair prompt`
    );
    console.warn(`[callAnalysisLLM] Validation errors:`, validation.errors);

    // Call LLM with repair prompt
    const repairUserPrompt = repairPrompt(rawOutput, validation.errors || []);
    rawOutput = await callLLM(systemPrompt, repairUserPrompt);
    validation = parseAndValidate(rawOutput);

    if (validation.success && validation.data) {
      const duration = performance.now() - startTime;
      console.log(
        `[callAnalysisLLM] Success after ${attempt} repair(s) (${duration.toFixed(2)}ms, risk: ${validation.data.riskScore})`
      );
      return validation.data;
    }
  }

  // 4. Max retries exceeded - throw error
  const duration = performance.now() - startTime;
  console.error(
    `[callAnalysisLLM] Failed after ${MAX_RETRY_ATTEMPTS} retries (${duration.toFixed(2)}ms)`
  );
  console.error(`[callAnalysisLLM] Final invalid output:`, rawOutput);

  throw new AnalysisInvalidError(
    `LLM output invalid after ${MAX_RETRY_ATTEMPTS} repair attempts`,
    validation.errors || []
  );
}
