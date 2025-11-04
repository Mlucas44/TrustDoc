/**
 * Webhook Utilities (Server-Side Only)
 *
 * Provides utilities for processing Stripe webhooks securely:
 * - Signature verification
 * - Raw body parsing
 * - Event construction
 *
 * IMPORTANT: This file must NEVER be imported in client components.
 */

import { env } from "@/src/env";
import { getStripeServer } from "@/src/lib/stripe.server";

import type Stripe from "stripe";

/**
 * Verify Stripe webhook signature and construct event
 *
 * @param rawBody - Raw request body (Buffer or string)
 * @param signature - Stripe signature header value
 * @returns Parsed Stripe event
 * @throws Error if signature is invalid or webhook secret is not configured
 */
export function verifyStripeWebhook(rawBody: Buffer | string, signature: string): Stripe.Event {
  if (!env.server.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      "Stripe webhook secret is not configured. Please set STRIPE_WEBHOOK_SECRET environment variable."
    );
  }

  const stripe = getStripeServer();

  try {
    // Construct and verify event
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.server.STRIPE_WEBHOOK_SECRET
    );

    return event;
  } catch (error) {
    // Invalid signature
    throw new Error(
      `Webhook signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Read raw body from Next.js Request
 * Required for Stripe signature verification
 *
 * @param request - Next.js Request object
 * @returns Raw body as Buffer
 */
export async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
