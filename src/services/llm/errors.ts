/**
 * LLM Service Errors
 *
 * Typed errors for LLM service operations.
 */

/**
 * Rate limit error (429 from provider)
 */
export class LLMRateLimitError extends Error {
  constructor(
    message: string,
    public readonly provider: "openai" | "ollama",
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "LLMRateLimitError";
  }
}

/**
 * Transient error (5xx from provider, network issues)
 */
export class LLMTransientError extends Error {
  constructor(
    message: string,
    public readonly provider: "openai" | "ollama",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMTransientError";
  }
}

/**
 * Provider unavailable (cannot connect)
 */
export class LLMUnavailableError extends Error {
  constructor(
    message: string,
    public readonly provider: "openai" | "ollama",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMUnavailableError";
  }
}
