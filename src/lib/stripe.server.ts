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
 */
export function getStripeServer(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.server.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
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
 */
export function getStripePriceId(pack: PackType): string {
  const priceIds: Record<PackType, string> = {
    STARTER: env.server.STRIPE_PRICE_STARTER,
    PRO: env.server.STRIPE_PRICE_PRO,
    SCALE: env.server.STRIPE_PRICE_SCALE,
  };

  return priceIds[pack];
}

/**
 * Get pack credits amount
 * @param pack Pack type
 * @returns Number of credits in the pack
 */
export function getPackCredits(pack: PackType): number {
  return CREDIT_PACKS[pack].credits;
}
