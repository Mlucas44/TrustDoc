/**
 * Ollama LLM Provider
 *
 * Local Ollama integration (compatible with OpenAI SDK).
 */

import "server-only";

import OpenAI from "openai";

import { env } from "@/src/env";

import { LLMTransientError, LLMUnavailableError } from "../errors";

import type { ILLMProvider, LLMRequest, LLMResponse } from "../types";

const DEFAULT_MODEL = "mistral";
const DEFAULT_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_TIMEOUT = 60000; // 60 seconds (local models are slower)

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements ILLMProvider {
  readonly name = "ollama" as const;
  private client: OpenAI;
  private model: string;
  private baseURL: string;

  constructor() {
    this.baseURL = env.server.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
    this.model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

    this.client = new OpenAI({
      apiKey: "ollama", // Ollama doesn't require a real API key
      baseURL: this.baseURL,
      timeout: DEFAULT_TIMEOUT,
    });
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple check: list models
      await this.client.models.list();
      return true;
    } catch (error) {
      console.warn("[OllamaProvider] Availability check failed:", error);
      return false;
    }
  }

  /**
   * Call Ollama API
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
        // Note: Ollama may not support response_format
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from Ollama");
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

      // Handle Ollama-specific errors
      if (error instanceof OpenAI.APIError) {
        // Connection errors
        if (error.status === 0 || error.code === "ECONNREFUSED") {
          throw new LLMUnavailableError(
            `Cannot connect to Ollama at ${this.baseURL} (${duration.toFixed(2)}ms)`,
            "ollama",
            error
          );
        }

        // Server errors (5xx)
        if (error.status && error.status >= 500) {
          throw new LLMTransientError(
            `Ollama service error: ${error.message} (${duration.toFixed(2)}ms)`,
            "ollama",
            error
          );
        }

        // Other API errors
        throw new Error(`Ollama API error: ${error.message} (status: ${error.status})`);
      }

      // Unknown errors
      throw new Error(
        `Ollama call failed: ${error instanceof Error ? error.message : "Unknown error"} (${duration.toFixed(2)}ms)`
      );
    }
  }
}
