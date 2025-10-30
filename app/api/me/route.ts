/**
 * GET /api/me
 *
 * Returns the current authenticated user's profile information.
 * Returns 401 if not authenticated.
 */

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/auth/current-user";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      credits: user.credits,
      name: user.name,
      image: user.image,
    });
  } catch (error) {
    console.error("[GET /api/me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
