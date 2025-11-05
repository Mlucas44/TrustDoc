/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint for processing payment events.
 * Handles checkout.session.completed to credit user accounts after successful payment.
 *
 * Security:
 * - Verifies Stripe signature to prevent fraud
 * - Idempotent: prevents double-crediting via stripeEventId uniqueness
 * - Logs all transactions for audit trail
 *
 * Flow:
 * 1. Verify webhook signature
 * 2. Parse checkout.session.completed event
 * 3. Extract userId and payment details from session metadata
 * 4. Check idempotence (event not already processed)
 * 5. Create CreditLedger entry and update User.credits in transaction
 * 6. Return 200 to acknowledge receipt
 */

import { type NextRequest, NextResponse } from "next/server";

import { getPackByPriceId } from "@/src/constants/billing";
import { prisma } from "@/src/lib/db";
import {
  logStripeWebhookReceived,
  logStripeCreditsAdded,
  logStripeWebhookFailed,
} from "@/src/lib/logger-events";
import { getStripeServer } from "@/src/lib/stripe.server";
import { getRawBody, verifyStripeWebhook } from "@/src/lib/webhook.server";

import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

export const runtime = "nodejs";

/**
 * POST /api/billing/webhook
 *
 * Process Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get signature from header
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      logStripeWebhookFailed({
        reason: "MISSING_SIGNATURE",
      });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Get raw body for signature verification
    const rawBody = await getRawBody(request);

    // Verify signature and construct event
    let event: Stripe.Event;
    try {
      event = verifyStripeWebhook(rawBody, signature);
    } catch (error) {
      logStripeWebhookFailed({
        reason: "INVALID_SIGNATURE",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Log webhook received
    logStripeWebhookReceived({
      eventId: event.id,
      eventType: event.type,
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;

      // Optionally handle payment_intent.succeeded for additional guard
      // case "payment_intent.succeeded":
      //   await handlePaymentIntentSucceeded(event);
      //   break;

      default:
        // Ignore other event types - no logging needed
        break;
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Log error but return 200 to avoid infinite retries
    logStripeWebhookFailed({
      reason: "INTERNAL_ERROR",
    });

    // Return 500 for unexpected errors (Stripe will retry)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 * Credits user account after successful payment
 */
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Extract user ID from metadata
  const userId = session.metadata?.userId;
  if (!userId) {
    logStripeWebhookFailed({
      reason: "MISSING_USER_ID",
      eventId: event.id,
      sessionId: session.id,
    });
    // Return without error to prevent retries (bad data from client)
    return;
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, credits: true },
  });

  if (!user) {
    logStripeWebhookFailed({
      reason: "USER_NOT_FOUND",
      eventId: event.id,
      sessionId: session.id,
      userId,
    });
    // Return without error to prevent infinite retries
    return;
  }

  // Extract payment details
  const amountTotal = session.amount_total; // in cents
  const currency = session.currency || "eur";

  if (!amountTotal) {
    logStripeWebhookFailed({
      reason: "MISSING_AMOUNT",
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  // Get line items to extract price ID
  const stripe = getStripeServer();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 10,
  });

  if (!lineItems.data || lineItems.data.length === 0) {
    logStripeWebhookFailed({
      reason: "NO_LINE_ITEMS",
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  // Get first line item's price ID
  const priceId = lineItems.data[0].price?.id;
  if (!priceId) {
    logStripeWebhookFailed({
      reason: "MISSING_PRICE_ID",
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  // Resolve pack from price ID
  const pack = getPackByPriceId(priceId);
  if (!pack) {
    logStripeWebhookFailed({
      reason: "UNKNOWN_PRICE_ID",
      eventId: event.id,
      sessionId: session.id,
      priceId,
    });
    // Return without error (unknown pack, might be from wrong environment)
    return;
  }

  // Check idempotence: has this event already been processed?
  const existingLedger = await prisma.creditLedger.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingLedger) {
    // Already processed - no log needed (normal idempotent behavior)
    return;
  }

  // Create credit ledger entry and update user credits in transaction
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create ledger entry
      await tx.creditLedger.create({
        data: {
          userId: user.id,
          stripeEventId: event.id,
          type: "PURCHASE",
          credits: pack.credits,
          amountCents: amountTotal,
          currency: currency,
          pack: pack.id,
        },
      });

      // Update user credits
      await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: pack.credits,
          },
        },
      });

      // Get updated user credits
      const updatedUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { credits: true },
      });

      // Log successful credit addition
      logStripeCreditsAdded({
        userId: user.id,
        creditsAdded: pack.credits,
        totalCredits: updatedUser?.credits || user.credits + pack.credits,
        eventId: event.id,
        sessionId: session.id,
      });
    });
  } catch (error) {
    // Transaction failed (might be duplicate key on stripeEventId)
    logStripeWebhookFailed({
      reason: "TRANSACTION_FAILED",
      eventId: event.id,
      sessionId: session.id,
      userId,
    });
    throw error; // Re-throw to trigger retry
  }
}
