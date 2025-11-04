/**
 * Stripe Server-Side Utility
 *
 * Singleton instance of Stripe client for server-side operations.
 * IMPORTANT: This file must NEVER be imported in client components.
 */

import Stripe from "stripe";

import { CREDIT_PACKS, type PackType } from "@/src/constants/billing";
import { env } from "@/src/env";

/**
 * Singleton Stripe instance
 * Initialized lazily on first use
 */
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe server instance (singleton)
 * @returns Stripe client configured with secret key
 * @throws Error if Stripe is not configured
 */
export function getStripeServer(): Stripe {
  if (!env.server.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Please set STRIPE_SECRET_KEY and other Stripe environment variables."
    );
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(env.server.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
      typescript: true,
      appInfo: {
        name: "TrustDoc",
        version: "1.0.0",
      },
    });
  }

  return stripeInstance;
}

/**
 * Get Stripe Price ID for a given pack type
 * @param pack Pack type (STARTER, PRO, SCALE)
 * @returns Stripe Price ID from environment
 * @throws Error if price ID is not configured
 */
export function getStripePriceId(pack: PackType): string {
  const priceIds: Record<PackType, string | undefined> = {
    STARTER: env.server.STRIPE_PRICE_STARTER,
    PRO: env.server.STRIPE_PRICE_PRO,
    SCALE: env.server.STRIPE_PRICE_SCALE,
  };

  const priceId = priceIds[pack];
  if (!priceId) {
    throw new Error(
      `Stripe price ID for pack ${pack} is not configured. Please set STRIPE_PRICE_${pack} environment variable.`
    );
  }

  return priceId;
}

/**
 * Get pack credits amount
 * @param pack Pack type
 * @returns Number of credits in the pack
 */
export function getPackCredits(pack: PackType): number {
  return CREDIT_PACKS[pack].credits;
}
