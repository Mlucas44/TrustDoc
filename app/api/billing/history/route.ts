/**
 * GET /api/billing/history
 *
 * Retrieve user's credit purchase history from CreditLedger.
 * Supports filtering by date range and pack type, with cursor-based pagination.
 *
 * Security:
 * - Requires authentication (guests rejected with 401)
 * - Returns only current user's transactions
 * - No sensitive payment data exposed (only internal ledger)
 *
 * Query Parameters:
 * - limit: number of items per page (default: 50, max: 100)
 * - cursor: pagination cursor (creditLedger.id)
 * - pack: filter by pack type (STARTER, PRO, SCALE)
 * - from: start date (ISO 8601)
 * - to: end date (ISO 8601)
 */

import { type NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/src/auth/current-user";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";

/**
 * Response item schema
 */
interface HistoryItem {
  id: string;
  createdAt: string; // ISO 8601
  pack: string;
  credits: number;
  amountCents: number;
  currency: string;
  stripeEventId: string; // Truncated for display
}

/**
 * Response schema
 */
interface HistoryResponse {
  items: HistoryItem[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * GET /api/billing/history
 *
 * Retrieve credit purchase history
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireCurrentUser();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const pack = searchParams.get("pack") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    // Build where clause
    const where: {
      userId: string;
      pack?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId: user.id,
    };

    if (pack) {
      where.pack = pack;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    // Query credit ledger with cursor pagination
    const items = await prisma.creditLedger.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit + 1, // Take one extra to check if there are more
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1, // Skip the cursor itself
      }),
    });

    // Check if there are more items
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Format response
    const response: HistoryResponse = {
      items: resultItems.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        pack: item.pack,
        credits: item.credits,
        amountCents: item.amountCents,
        currency: item.currency,
        stripeEventId: truncateEventId(item.stripeEventId),
      })),
      nextCursor: hasMore ? resultItems[resultItems.length - 1].id : undefined,
      hasMore,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[GET /api/billing/history] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch purchase history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Truncate Stripe event ID for display
 * Example: evt_1234567890abcdef1234567890abcdef → evt_123...def
 */
function truncateEventId(eventId: string): string {
  if (eventId.length <= 10) return eventId;
  return `${eventId.substring(0, 7)}...${eventId.substring(eventId.length - 3)}`;
}
