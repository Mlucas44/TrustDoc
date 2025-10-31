/**
 * Guest Quota Service
 *
 * Manages quota tracking for unauthenticated users (3 free analyses per browser).
 * Uses a hybrid approach: server-side database + signed cookies for UX.
 */

import "server-only";

import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@/src/lib/prisma";

// Constants
export const GUEST_QUOTA_LIMIT = 3;
export const GUEST_COOKIE_NAME = "td_guest_id";
export const GUEST_QUOTA_COOKIE_NAME = "td_guest_quota";
export const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Error thrown when guest quota is exceeded
 */
export class GuestQuotaExceededError extends Error {
  constructor(message = "Guest quota exceeded. Please sign in to continue.") {
    super(message);
    this.name = "GuestQuotaExceededError";
  }
}

/**
 * Initialize or retrieve guest ID from cookie
 *
 * @returns Guest ID (creates new one if doesn't exist)
 */
export async function getOrCreateGuestId(): Promise<string> {
  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!guestId) {
    // Create new guest ID
    guestId = uuidv4();

    // Set cookie (httpOnly, sameSite=lax, 30 days)
    cookieStore.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: GUEST_COOKIE_MAX_AGE,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return guestId;
}

/**
 * Initialize guest quota in database
 *
 * @param guestId - Guest identifier
 * @returns Guest quota record
 */
export async function initGuestQuota(guestId: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  const quota = await prisma.guestQuota.upsert({
    where: { id: guestId },
    create: {
      id: guestId,
      used: 0,
      expiresAt,
    },
    update: {
      // If quota exists but expired, reset it
      used: 0,
      expiresAt,
    },
  });

  // Update cookie with quota info
  const cookieStore = await cookies();
  cookieStore.set(GUEST_QUOTA_COOKIE_NAME, quota.used.toString(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return quota;
}

/**
 * Get current guest quota status
 *
 * @param guestId - Guest identifier
 * @returns Quota status { used, remaining, limit, limitReached }
 */
export async function getGuestQuotaStatus(guestId: string) {
  const quota = await prisma.guestQuota.findUnique({
    where: { id: guestId },
  });

  if (!quota) {
    // Initialize if doesn't exist
    const newQuota = await initGuestQuota(guestId);
    return {
      used: newQuota.used,
      remaining: GUEST_QUOTA_LIMIT - newQuota.used,
      limit: GUEST_QUOTA_LIMIT,
      limitReached: false,
      expired: false,
    };
  }

  // Check if expired
  const expired = new Date() > quota.expiresAt;
  if (expired) {
    // Reset quota
    const resetQuota = await prisma.guestQuota.update({
      where: { id: guestId },
      data: {
        used: 0,
        expiresAt: new Date(Date.now() + GUEST_COOKIE_MAX_AGE * 1000),
      },
    });

    return {
      used: resetQuota.used,
      remaining: GUEST_QUOTA_LIMIT,
      limit: GUEST_QUOTA_LIMIT,
      limitReached: false,
      expired: true,
    };
  }

  const remaining = Math.max(0, GUEST_QUOTA_LIMIT - quota.used);

  return {
    used: quota.used,
    remaining,
    limit: GUEST_QUOTA_LIMIT,
    limitReached: remaining === 0,
    expired: false,
  };
}

/**
 * Check if guest has quota remaining
 *
 * @param guestId - Guest identifier
 * @returns true if quota available, false otherwise
 * @throws {GuestQuotaExceededError} If quota is exceeded
 */
export async function checkGuestQuota(guestId: string): Promise<boolean> {
  const status = await getGuestQuotaStatus(guestId);

  if (status.remaining <= 0) {
    throw new GuestQuotaExceededError(
      `Guest quota exceeded (${status.used}/${status.limit}). Please sign in to continue.`
    );
  }

  return true;
}

/**
 * Consume one unit of guest quota
 *
 * This should ONLY be called after a successful analysis.
 * Do NOT call on parsing errors or LLM failures.
 *
 * @param guestId - Guest identifier
 * @returns Updated quota status
 */
export async function consumeGuestQuota(guestId: string) {
  // Check quota first
  await checkGuestQuota(guestId);

  // Increment used count
  const quota = await prisma.guestQuota.update({
    where: { id: guestId },
    data: {
      used: {
        increment: 1,
      },
    },
  });

  // Update cookie
  const cookieStore = await cookies();
  cookieStore.set(GUEST_QUOTA_COOKIE_NAME, quota.used.toString(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return {
    used: quota.used,
    remaining: Math.max(0, GUEST_QUOTA_LIMIT - quota.used),
    limit: GUEST_QUOTA_LIMIT,
  };
}

/**
 * Clear guest quota cookies (useful when user signs in)
 */
export async function clearGuestQuota() {
  const cookieStore = await cookies();

  cookieStore.delete(GUEST_COOKIE_NAME);
  cookieStore.delete(GUEST_QUOTA_COOKIE_NAME);
}
