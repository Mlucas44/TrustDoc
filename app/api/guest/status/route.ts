/**
 * GET /api/guest/status
 *
 * Get current guest quota status.
 * Returns { guestId, used, remaining, limit } or creates new guest if needed.
 */

import { NextResponse } from "next/server";

import { getOrCreateGuestId, getGuestQuotaStatus } from "@/src/services/guest-quota";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Get guest ID from cookie (creates if doesn't exist)
    const guestId = await getOrCreateGuestId();

    // Get quota status
    const status = await getGuestQuotaStatus(guestId);

    return NextResponse.json({
      guestId,
      ...status,
    });
  } catch (error) {
    console.error("[GET /api/guest/status] Error:", error);
    return NextResponse.json({ error: "Failed to get guest status" }, { status: 500 });
  }
}
