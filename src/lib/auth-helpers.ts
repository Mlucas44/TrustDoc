/**
 * Server-Side Authentication Helpers
 *
 * These functions can only be used in Server Components, Server Actions,
 * and API Routes. DO NOT import in Client Components.
 *
 * Usage:
 * - const user = await getCurrentUser()
 * - const session = await requireAuth()
 */

import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";

/**
 * Get the currently authenticated user with full database data
 *
 * Returns null if not authenticated.
 * Use this when you need more than just session data (e.g., fresh credit balance)
 *
 * @example
 * ```ts
 * const user = await getCurrentUser()
 * if (!user) return redirect("/auth/signin")
 * console.log("Credits:", user.credits)
 * ```
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      credits: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Require authentication - redirect to sign-in if not authenticated
 *
 * Use this in Server Components/Actions that require authentication.
 *
 * @example
 * ```ts
 * const session = await requireAuth()
 * // If we reach here, user is guaranteed to be authenticated
 * console.log("User ID:", session.user.id)
 * ```
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return session;
}

/**
 * Check if user has enough credits
 *
 * @example
 * ```ts
 * const hasCredits = await checkCredits(1)
 * if (!hasCredits) {
 *   return { error: "Insufficient credits" }
 * }
 * ```
 */
export async function checkCredits(required: number = 1) {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  return user.credits >= required;
}

/**
 * Deduct credits from user account
 *
 * @returns Updated user or null if insufficient credits
 *
 * @example
 * ```ts
 * const user = await deductCredits(1)
 * if (!user) {
 *   return { error: "Insufficient credits" }
 * }
 * ```
 */
export async function deductCredits(amount: number = 1) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.credits < amount) {
    return null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      credits: {
        decrement: amount,
      },
    },
  });

  return updatedUser;
}
