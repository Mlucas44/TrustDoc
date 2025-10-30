/**
 * Current user helpers (server-only)
 *
 * Provides utilities for fetching the current authenticated user's data
 * from the database in React Server Components (RSC).
 */

import "server-only";

import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";

/**
 * Custom error for unauthorized access
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Get the current authenticated user from the database
 *
 * @returns User object with { id, email, credits, name?, image? } or null
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { getCurrentUser } from "@/src/auth/current-user";
 *
 * export default async function ProfilePage() {
 *   const user = await getCurrentUser();
 *   if (!user) return <p>Please sign in</p>;
 *   return <p>Credits: {user.credits}</p>;
 * }
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
      credits: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Require current user or throw UnauthorizedError
 *
 * @returns User object with { id, email, credits, name?, image? }
 * @throws {UnauthorizedError} If user is not authenticated
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { requireCurrentUser } from "@/src/auth/current-user";
 *
 * export default async function ProtectedPage() {
 *   const user = await requireCurrentUser();
 *   return <p>Welcome {user.email}, you have {user.credits} credits</p>;
 * }
 * ```
 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError("You must be signed in to access this resource");
  }

  return user;
}
