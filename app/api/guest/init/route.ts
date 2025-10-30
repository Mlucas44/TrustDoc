/**
 * POST /api/guest/init
 *
 * Initialize guest user and quota.
 * Creates a new guest ID and quota record if needed.
 */

import { NextResponse } from "next/server";

import {
  getOrCreateGuestId,
  initGuestQuota,
  getGuestQuotaStatus,
} from "@/src/services/guest-quota";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Get or create guest ID
    const guestId = await getOrCreateGuestId();

    // Initialize quota in database
    await initGuestQuota(guestId);

    // Get current status
    const status = await getGuestQuotaStatus(guestId);

    return NextResponse.json({
      guestId,
      ...status,
    });
  } catch (error) {
    console.error("[POST /api/guest/init] Error:", error);
    return NextResponse.json({ error: "Failed to initialize guest session" }, { status: 500 });
  }
}
