/**
 * Database Health Check Endpoint
 *
 * Verifies database connectivity and performance by executing a simple query.
 * This endpoint forces Node.js runtime (required for Prisma) instead of Edge.
 *
 * GET /api/health/db
 *
 * Success response (200):
 * {
 *   "status": "ok",
 *   "db": "ok",
 *   "responseTime": 42,
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 *
 * Error response (503):
 * {
 *   "status": "error",
 *   "db": "error",
 *   "error": "Connection timeout",
 *   "responseTime": 5003,
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 */

import { NextResponse } from "next/server";

import { withDb } from "@/src/lib/db-helpers";

// Force Node.js runtime for Prisma (not compatible with Edge runtime)
export const runtime = "nodejs";

// Disable caching for health checks
export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // Execute a simple query to verify database connectivity
    // Using $queryRaw for a lightweight check
    await withDb(async (db) => {
      await db.$queryRaw`SELECT 1 as health_check`;
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error("[Health Check] Database error:", error);

    return NextResponse.json(
      {
        status: "error",
        db: "error",
        error: error instanceof Error ? error.message : "Unknown database error",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 503 } // Service Unavailable
    );
  }
}
