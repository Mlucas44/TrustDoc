/**
 * Contract Type Detection - LLM Approach
 *
 * Lightweight LLM validation for uncertain cases.
 * Target performance: < 1.5s (p99 local).
 * Budget: ≤ 300 tokens input.
 */

import "server-only";

import OpenAI from "openai";

import { env } from "@/src/env";
import { LLMResultSchema } from "@/src/schemas/detect";

import type { ContractType, LLMResult } from "@/src/schemas/detect";

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: env.server.OPENAI_API_KEY,
  });
}

/**
 * Extract relevant text excerpt for LLM analysis
 * Budget: ≤ 300 tokens (~1200 chars)
 */
function extractRelevantExcerpt(text: string, hint?: ContractType): string {
  const lines = text.split("\n");

  // Extract first 2 pages (assume ~40 lines per page)
  const firstPages = lines.slice(0, 80).join("\n");

  // Extract lines with discriminant keywords based on hint
  const keywordLines: string[] = [];
  const keywords = getHintKeywords(hint);

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const keyword of keywords) {
      if (lowerLine.includes(keyword)) {
        keywordLines.push(line);
        break;
      }
    }
    if (keywordLines.length >= 10) break;
  }

  // Combine excerpts (limit to ~1200 chars)
  const combined = `${firstPages}\n\n--- KEY SECTIONS ---\n${keywordLines.join("\n")}`;
  return combined.substring(0, 1200);
}

/**
 * Get discriminant keywords based on hint type
 */
function getHintKeywords(hint?: ContractType): string[] {
  switch (hint) {
    case "CGU":
      return ["utilisateur", "service", "plateforme", "cookies", "user", "platform"];
    case "FREELANCE":
      return ["prestation", "mission", "facturation", "freelance", "contractor", "deliverable"];
    case "EMPLOI":
      return ["cdi", "cdd", "salaire", "congés", "employment", "salary"];
    case "NDA":
      return ["confidentiel", "divulgation", "confidential", "disclosure", "nda"];
    case "DEVIS":
      return ["devis", "quote", "estimation", "prix", "price"];
    case "PARTENARIAT":
      return ["partenariat", "coopération", "partnership", "collaboration"];
    default:
      return ["contrat", "contract", "accord", "agreement"];
  }
}

/**
 * System prompt for contract type detection
 */
const SYSTEM_PROMPT = `You are a legal document classifier. Your task is to identify the type of contract from a text excerpt.

**Contract Types:**
1. **CGU** (Terms of Service / General Terms) - User agreements for online services/platforms
2. **FREELANCE** - Independent contractor or freelance service agreements
3. **EMPLOI** (Employment Contract) - CDI/CDD employment contracts
4. **NDA** (Non-Disclosure Agreement) - Confidentiality agreements
5. **DEVIS** (Quote/Estimate) - Price quotes or estimates
6. **PARTENARIAT** (Partnership) - Collaboration or partnership agreements
7. **AUTRE** (Other) - Documents that don't fit above categories

**Instructions:**
- Analyze the provided excerpt
- Consider the hint if provided (but don't blindly trust it)
- Respond ONLY with valid JSON matching this schema:
{
  "type": "CGU" | "FREELANCE" | "EMPLOI" | "NDA" | "DEVIS" | "PARTENARIAT" | "AUTRE",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation (1-2 sentences)"
}

**Rules:**
- If confidence < 0.5, use "AUTRE"
- Be concise in your reason
- Focus on discriminant features (specific clauses, terminology)`;

/**
 * Detect contract type using LLM
 *
 * @param text - Normalized contract text
 * @param hint - Optional hint from heuristic detection
 * @returns LLM detection result with type, confidence, and reason
 *
 * @example
 * ```ts
 * const result = await detectTypeLLM(contractText, "FREELANCE");
 * // { type: "FREELANCE", confidence: 0.9, reason: "Contains specific freelance clauses..." }
 * ```
 */
export async function detectTypeLLM(text: string, hint?: ContractType): Promise<LLMResult> {
  const startTime = performance.now();

  try {
    // Extract relevant excerpt (budget: ≤ 300 tokens)
    const excerpt = extractRelevantExcerpt(text, hint);

    // Prepare user prompt
    const userPrompt = hint
      ? `Heuristic suggests type: ${hint}\n\nDocument excerpt:\n${excerpt}`
      : `Document excerpt:\n${excerpt}`;

    // Call OpenAI API
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast, cheap model
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistency
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse and validate response
    const parsed = JSON.parse(content);
    const validated = LLMResultSchema.parse(parsed);

    const duration = performance.now() - startTime;
    console.info(
      `[detectTypeLLM] Detected ${validated.type} with confidence ${validated.confidence.toFixed(2)} (${duration.toFixed(2)}ms)`
    );

    return validated;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[detectTypeLLM] Error after ${duration.toFixed(2)}ms:`, error);

    // Fallback to AUTRE with low confidence
    return {
      type: "AUTRE",
      confidence: 0.3,
      reason: "LLM detection failed, using fallback",
    };
  }
}
