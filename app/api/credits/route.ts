/**
 * GET /api/credits
 *
 * Returns authenticated user's current credit balance.
 * Requires authentication.
 */

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/auth/current-user";
import { UserRepo } from "@/src/db/user.repo";

export async function GET() {
  try {
    // 1. Check authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get current credits
    const credits = await UserRepo.getCredits(user.id);

    return NextResponse.json({
      credits,
      userId: user.id,
    });
  } catch (error) {
    console.error("[GET /api/credits] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
