/**
 * GET /api/_metrics
 *
 * Endpoint de diagnostics pour exporter les métriques opérationnelles.
 * Protégé par METRICS_SECRET pour limiter l'accès aux outils de monitoring.
 *
 * Métriques disponibles:
 * - Counters: Compteurs d'événements (succès, erreurs, types)
 * - Histograms: Distributions de latence avec percentiles (p50, p90, p95, p99)
 *
 * Security:
 * - Protected by x-metrics-secret header
 * - Only accessible by authorized monitoring tools
 *
 * Usage:
 * ```bash
 * curl -H "x-metrics-secret: YOUR_SECRET" http://localhost:3000/api/_metrics
 * ```
 */

import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/src/env";
import { metrics } from "@/src/lib/metrics";

export const runtime = "nodejs";

const METRICS_SECRET_HEADER = "x-metrics-secret";

/**
 * GET /api/_metrics
 *
 * Export metrics snapshot
 */
export async function GET(request: NextRequest) {
  const t0 = performance.now();

  // 1. Validate authentication
  const secret = request.headers.get(METRICS_SECRET_HEADER);

  if (!secret) {
    return NextResponse.json(
      {
        error: "Missing metrics authentication header",
        code: "METRICS_AUTH_MISSING",
      },
      { status: 401 }
    );
  }

  if (secret !== env.server.METRICS_SECRET) {
    return NextResponse.json(
      {
        error: "Invalid metrics authentication",
        code: "METRICS_AUTH_INVALID",
      },
      { status: 401 }
    );
  }

  // 2. Export metrics snapshot
  try {
    const snapshot = metrics.export();
    const durationMs = Math.round(performance.now() - t0);

    return NextResponse.json(
      {
        success: true,
        metrics: snapshot,
        durationMs,
      },
      { status: 200 }
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);

    return NextResponse.json(
      {
        error: "Failed to export metrics",
        code: "METRICS_EXPORT_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        durationMs,
      },
      { status: 500 }
    );
  }
}
