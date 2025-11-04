/**
 * Billing Constants
 *
 * Defines credit packs, pricing, and Stripe configuration.
 * Used for Stripe Checkout integration.
 */

/**
 * Available credit pack types
 */
export const PACK_TYPES = {
  STARTER: "STARTER",
  PRO: "PRO",
  SCALE: "SCALE",
} as const;

export type PackType = (typeof PACK_TYPES)[keyof typeof PACK_TYPES];

/**
 * Credit pack definitions
 * Prices are in cents (EUR)
 */
export interface CreditPack {
  id: PackType;
  name: string;
  credits: number;
  price: number; // in cents
  priceFormatted: string;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKS: Record<PackType, CreditPack> = {
  STARTER: {
    id: "STARTER",
    name: "Pack Starter",
    credits: 10,
    price: 990, // 9.90€
    priceFormatted: "9,90 €",
    description: "Idéal pour tester le service",
  },
  PRO: {
    id: "PRO",
    name: "Pack Pro",
    credits: 50,
    price: 3900, // 39.00€
    priceFormatted: "39,00 €",
    description: "Pour un usage régulier",
    popular: true,
  },
  SCALE: {
    id: "SCALE",
    name: "Pack Scale",
    credits: 200,
    price: 12900, // 129.00€
    priceFormatted: "129,00 €",
    description: "Pour les gros volumes",
  },
};

/**
 * Get all packs as an array (sorted by price)
 */
export function getAllPacks(): CreditPack[] {
  return Object.values(CREDIT_PACKS).sort((a, b) => a.price - b.price);
}

/**
 * Get pack by ID
 */
export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS[id as PackType];
}

/**
 * Validate pack type
 */
export function isValidPackType(pack: string): pack is PackType {
  return pack in PACK_TYPES;
}

/**
 * Feature flag for billing
 * Set to false to hide billing UI when not configured
 */
export const BILLING_ENABLED =
  process.env.STRIPE_SECRET_KEY !== undefined && process.env.STRIPE_PUBLIC_KEY !== undefined;
