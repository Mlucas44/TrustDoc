/**
 * POST /api/billing/checkout
 *
 * Create a Stripe Checkout session for purchasing credit packs.
 * - Requires authenticated user (guests are rejected with 401)
 * - Validates pack type
 * - Creates Stripe Checkout session
 * - Returns checkout URL for client redirection
 */

import { type NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/src/auth/current-user";
import { isValidPackType, type PackType } from "@/src/constants/billing";
import { env } from "@/src/env";
import { getStripePriceId, getStripeServer } from "@/src/lib/stripe.server";

export const runtime = "nodejs";

/**
 * Request body schema
 */
interface CheckoutRequest {
  pack: string;
}

/**
 * Response schema
 */
interface CheckoutResponse {
  url: string;
}

/**
 * POST /api/billing/checkout
 *
 * Create Stripe Checkout session
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication - will throw UnauthorizedError if not authenticated or guest
    const user = await requireCurrentUser();

    // Parse request body
    const body = (await request.json()) as CheckoutRequest;
    const { pack } = body;

    // Validate pack type
    if (!pack || !isValidPackType(pack)) {
      return NextResponse.json(
        {
          error: "Invalid pack type",
          details: "Pack must be one of: STARTER, PRO, SCALE",
        },
        { status: 400 }
      );
    }

    // Get Stripe price ID for the pack
    const priceId = getStripePriceId(pack as PackType);

    // Get Stripe instance
    const stripe = getStripeServer();

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.client.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.client.NEXT_PUBLIC_APP_URL}/billing/cancel`,
      metadata: {
        userId: user.id,
        pack: pack,
      },
      customer_email: user.email ?? undefined,
      payment_intent_data: {
        metadata: {
          userId: user.id,
          pack: pack,
        },
      },
    });

    // Return checkout URL
    const response: CheckoutResponse = {
      url: session.url!,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Log error for debugging
    console.error("[POST /api/billing/checkout] Error:", error);

    // Return generic error response
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
