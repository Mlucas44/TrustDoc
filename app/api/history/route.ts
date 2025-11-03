/**
 * GET /api/history
 *
 * Returns user's analysis history with pagination and filters.
 * Auth required, returns only user's own analyses.
 */

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/auth/current-user";
import { AnalysisRepo } from "@/src/db/analysis.repo";

import type { ContractType } from "@prisma/client";

export const runtime = "nodejs";

const HISTORY_PAGE_SIZE = 10;

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const type = searchParams.get("type") as ContractType | null;
    const riskMin = searchParams.get("riskMin");
    const riskMax = searchParams.get("riskMax");
    const q = searchParams.get("q") || undefined;

    // Fetch analyses with filters
    const items = await AnalysisRepo.listByUser(user.id, {
      limit: HISTORY_PAGE_SIZE + 1, // Fetch one extra to check if there's a next page
      cursor,
      type: type || undefined,
      riskMin: riskMin ? parseInt(riskMin, 10) : undefined,
      riskMax: riskMax ? parseInt(riskMax, 10) : undefined,
      q,
    });

    // Determine pagination cursors
    const hasNextPage = items.length > HISTORY_PAGE_SIZE;
    const itemsToReturn = hasNextPage ? items.slice(0, HISTORY_PAGE_SIZE) : items;

    const response = {
      items: itemsToReturn.map((item) => ({
        id: item.id,
        filename: item.filename,
        type: item.type,
        riskScore: item.riskScore,
        createdAt: item.createdAt.toISOString(),
      })),
      nextCursor: hasNextPage ? itemsToReturn[itemsToReturn.length - 1]?.id : null,
      prevCursor: cursor || null, // Simplified: just track if we came from somewhere
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/history] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
