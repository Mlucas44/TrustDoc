/**
 * OpenAI LLM Provider
 *
 * OpenAI GPT integration with error handling and timeout.
 */

import "server-only";

import OpenAI from "openai";

import { env } from "@/src/env";

import { LLMRateLimitError, LLMTransientError, LLMUnavailableError } from "../errors";

import type { ILLMProvider, LLMRequest, LLMResponse } from "../types";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements ILLMProvider {
  readonly name = "openai" as const;
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.server.OPENAI_API_KEY,
      timeout: DEFAULT_TIMEOUT,
    });
    this.model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  }

  /**
   * Check if OpenAI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple check: list models
      await this.client.models.list();
      return true;
    } catch (error) {
      console.warn("[OpenAIProvider] Availability check failed:", error);
      return false;
    }
  }

  /**
   * Call OpenAI API
   */
  async call(request: LLMRequest): Promise<LLMResponse> {
    const startTime = performance.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const duration = performance.now() - startTime;

      return {
        content,
        model: response.model,
        tokensUsed: response.usage?.total_tokens,
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      // Handle OpenAI-specific errors
      if (error instanceof OpenAI.APIError) {
        // Rate limit (429)
        if (error.status === 429) {
          const retryAfter = error.headers?.["retry-after"]
            ? parseInt(error.headers["retry-after"], 10)
            : undefined;

          throw new LLMRateLimitError(
            `OpenAI rate limit exceeded (${duration.toFixed(2)}ms)`,
            "openai",
            retryAfter
          );
        }

        // Transient errors (5xx)
        if (error.status && error.status >= 500) {
          throw new LLMTransientError(
            `OpenAI service error: ${error.message} (${duration.toFixed(2)}ms)`,
            "openai",
            error
          );
        }

        // Connection errors
        if (error.status === 0 || error.code === "ECONNREFUSED") {
          throw new LLMUnavailableError(
            `Cannot connect to OpenAI (${duration.toFixed(2)}ms)`,
            "openai",
            error
          );
        }

        // Other API errors (4xx)
        throw new Error(`OpenAI API error: ${error.message} (status: ${error.status})`);
      }

      // Unknown errors
      throw new Error(
        `OpenAI call failed: ${error instanceof Error ? error.message : "Unknown error"} (${duration.toFixed(2)}ms)`
      );
    }
  }
}
