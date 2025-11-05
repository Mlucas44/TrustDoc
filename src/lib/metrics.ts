/**
 * In-Memory Metrics System
 *
 * Simple metrics collection for low-volume production environments.
 * Tracks counters (events, errors) and histograms (latency, token usage).
 *
 * Usage:
 * ```typescript
 * // Increment counter
 * metrics.increment('analysis.success');
 * metrics.increment('analysis.error', { reason: 'LLM_TIMEOUT' });
 *
 * // Record histogram value
 * metrics.histogram('latency.analyze', 4523.5);
 * metrics.histogram('latency.prepare', 1234.2);
 *
 * // Get all metrics
 * const snapshot = metrics.export();
 * console.log(snapshot);
 * ```
 *
 * Privacy:
 * - NO sensitive data (contract text, PDF content, PII) in metrics
 * - Only operational metadata (counts, durations, status codes)
 */

/**
 * Counter represents a monotonically increasing value
 */
interface Counter {
  count: number;
  labels?: Record<string, string | number>;
}

/**
 * Histogram stores values for percentile calculation
 */
interface Histogram {
  values: number[];
  count: number;
  sum: number;
  min: number;
  max: number;
}

/**
 * Metrics snapshot for export
 */
export interface MetricsSnapshot {
  counters: Record<string, Counter>;
  histograms: Record<
    string,
    {
      count: number;
      sum: number;
      min: number;
      max: number;
      mean: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    }
  >;
  timestamp: string;
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower] ?? 0;
  }

  const lowerValue = sortedValues[lower] ?? 0;
  const upperValue = sortedValues[upper] ?? 0;
  return lowerValue * (1 - weight) + upperValue * weight;
}

/**
 * In-Memory Metrics Collector
 */
class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string | number>): void {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    const counter = this.counters.get(key);

    if (counter) {
      counter.count++;
    } else {
      this.counters.set(key, {
        count: 1,
        labels,
      });
    }
  }

  /**
   * Record a histogram value (e.g., latency, token count)
   */
  histogram(name: string, value: number): void {
    const hist = this.histograms.get(name);

    if (hist) {
      hist.values.push(value);
      hist.count++;
      hist.sum += value;
      hist.min = Math.min(hist.min, value);
      hist.max = Math.max(hist.max, value);
    } else {
      this.histograms.set(name, {
        values: [value],
        count: 1,
        sum: value,
        min: value,
        max: value,
      });
    }
  }

  /**
   * Export metrics snapshot
   */
  export(): MetricsSnapshot {
    const counters: Record<string, Counter> = {};
    for (const [key, counter] of this.counters.entries()) {
      counters[key] = counter;
    }

    const histograms: Record<string, MetricsSnapshot["histograms"][string]> = {};
    for (const [name, hist] of this.histograms.entries()) {
      const sortedValues = [...hist.values].sort((a, b) => a - b);
      const mean = hist.count > 0 ? hist.sum / hist.count : 0;

      histograms[name] = {
        count: hist.count,
        sum: hist.sum,
        min: hist.min,
        max: hist.max,
        mean: parseFloat(mean.toFixed(2)),
        p50: parseFloat(calculatePercentile(sortedValues, 50).toFixed(2)),
        p90: parseFloat(calculatePercentile(sortedValues, 90).toFixed(2)),
        p95: parseFloat(calculatePercentile(sortedValues, 95).toFixed(2)),
        p99: parseFloat(calculatePercentile(sortedValues, 99).toFixed(2)),
      };
    }

    return {
      counters,
      histograms,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

/**
 * Global metrics instance (singleton)
 */
export const metrics = new MetricsCollector();
