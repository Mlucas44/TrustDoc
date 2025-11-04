/**
 * Analysis Detail API Routes
 *
 * DELETE /api/analysis/[id] - Soft delete an analysis (owner only)
 */

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/auth/current-user";
import { AnalysisRepo } from "@/src/db/analysis.repo";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * DELETE /api/analysis/[id]
 *
 * Soft delete an analysis (idempotent)
 *
 * Security:
 * - Requires authentication
 * - Only owner can delete
 * - Returns 404 for both non-existent and non-owned analyses (no info leakage)
 *
 * Returns:
 * - 204 No Content on success (idempotent)
 * - 401 Unauthorized if not authenticated
 * - 404 Not Found if analysis doesn't exist or user doesn't own it
 * - 500 Internal Server Error on unexpected errors
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    // 1. Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get analysis ID from params
    const { id } = await context.params;

    // 3. Soft delete (idempotent)
    try {
      await AnalysisRepo.softDelete(id, user.id);

      // Success: 204 No Content (idempotent - same response if already deleted)
      return new Response(null, { status: 204 });
    } catch (error) {
      // Don't reveal whether analysis exists or ownership failed
      // Both return 404 to prevent info leakage
      if (error instanceof Error) {
        if (error.message.includes("not found") || error.message.includes("does not own")) {
          return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
        }
      }

      // Re-throw unexpected errors
      throw error;
    }
  } catch (error) {
    console.error("[DELETE /api/analysis/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
