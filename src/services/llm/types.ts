/**
 * LLM Service Types
 *
 * Common types and interfaces for LLM providers.
 */

/**
 * LLM provider type
 */
export type LLMProvider = "openai" | "ollama";

/**
 * LLM request parameters
 */
export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM response
 */
export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  duration?: number;
}

/**
 * Provider interface (common contract)
 */
export interface ILLMProvider {
  /**
   * Provider name
   */
  readonly name: LLMProvider;

  /**
   * Call LLM with a prompt
   */
  call(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}
