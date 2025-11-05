/**
 * Timing and Tracing Utilities
 *
 * Provides performance measurement and distributed tracing for API requests.
 * Tracks operation durations across the analysis pipeline (prepare, detect_type, llm_analyze, persist, cleanup).
 *
 * Usage:
 * ```typescript
 * const trace = new Trace(crypto.randomUUID());
 * const endPrepare = trace.start('prepare');
 * // ... do work
 * endPrepare();
 *
 * // Or use withTrace helper:
 * const { res, t } = await withTrace(traceId, async (trace) => {
 *   const endSpan = trace.start('llm_analyze', { model: 'gpt-4' });
 *   const result = await analyzeWithLLM();
 *   endSpan({ tokens: result.tokens });
 *   return result;
 * });
 * ```
 *
 * Privacy:
 * - NO sensitive data (contract text, PDF content, PII) in spans
 * - Only operational metadata (durations, status codes, model names)
 */

/**
 * Span represents a single timed operation
 */
export type Span = {
  name: string;
  start: number;
  end?: number;
  attrs?: Record<string, number | string | boolean>;
};

/**
 * Trace tracks multiple spans for a single request
 */
export class Trace {
  private spans: Span[] = [];

  constructor(public traceId: string) {}

  /**
   * Start a new span
   * @param name - Span name (e.g., 'prepare', 'llm_analyze')
   * @param attrs - Optional attributes (e.g., { model: 'gpt-4' })
   * @returns Function to end the span
   */
  start(name: string, attrs?: Span["attrs"]): () => void {
    const span: Span = {
      name,
      start: performance.now(),
      attrs,
    };
    this.spans.push(span);
    return () => this.end(name);
  }

  /**
   * End a span
   * @param name - Span name to end
   * @param attrs - Optional additional attributes to merge
   */
  end(name: string, attrs?: Span["attrs"]): void {
    const span = this.spans.findLast((s) => s.name === name && !s.end);
    if (span) {
      span.end = performance.now();
      if (attrs) {
        Object.assign((span.attrs ??= {}), attrs);
      }
    }
  }

  /**
   * Export trace as HTTP headers (dev mode only)
   * @param prefix - Header prefix (default: 'x-td-latency-')
   * @returns Headers object with timing data
   */
  toHeaders(prefix = "x-td-latency-"): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add traceId
    headers[`${prefix}trace-id`] = this.traceId;

    // Calculate total duration
    const firstStart = Math.min(...this.spans.map((s) => s.start));
    const lastEnd = Math.max(...this.spans.map((s) => s.end ?? performance.now()));
    const totalDuration = lastEnd - firstStart;
    headers[`${prefix}total`] = totalDuration.toFixed(2);

    // Add individual span durations
    for (const span of this.spans) {
      const duration = (span.end ?? performance.now()) - span.start;
      headers[`${prefix}${span.name}`] = duration.toFixed(2);
    }

    return headers;
  }

  /**
   * Export trace as JSON with calculated durations
   * @returns JSON representation with traceId and spans
   */
  toJSON(): {
    traceId: string;
    spans: Array<{
      name: string;
      start: number;
      end?: number;
      durationMs: number;
      attrs?: Span["attrs"];
    }>;
  } {
    return {
      traceId: this.traceId,
      spans: this.spans.map((s) => ({
        ...s,
        durationMs: parseFloat(((s.end ?? performance.now()) - s.start).toFixed(2)),
      })),
    };
  }

  /**
   * Get all spans
   */
  getSpans(): Span[] {
    return [...this.spans];
  }
}

/**
 * Helper to wrap an operation with tracing
 * @param traceId - Unique trace identifier (UUID)
 * @param fn - Async function that receives the trace instance
 * @returns Result and trace instance
 */
export async function withTrace<T>(
  traceId: string,
  fn: (trace: Trace) => Promise<T>
): Promise<{ res: T; trace: Trace }> {
  const trace = new Trace(traceId);
  const res = await fn(trace);
  return { res, trace };
}
