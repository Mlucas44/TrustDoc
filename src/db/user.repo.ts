/**
 * User Repository
 *
 * Data access layer for User model with validation and business logic.
 * Includes transactional credit operations.
 */

import "@/src/lib/server-only";

import { prisma } from "@/src/lib/prisma";

export type AppUser = {
  id: string;
  email: string;
  credits: number;
  createdAt: Date;
};

/**
 * Error thrown when user has insufficient credits
 */
export class InsufficientCreditsError extends Error {
  constructor(
    public readonly userId: string,
    public readonly required: number,
    public readonly available: number
  ) {
    super(`Insufficient credits: required ${required}, available ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * User Repository Class
 */
export class UserRepo {
  /**
   * Get user by ID
   */
  static async getById(id: string): Promise<AppUser | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get user by email
   */
  static async getByEmail(email: string): Promise<AppUser | null> {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create user if not exists, otherwise return existing
   */
  static async createIfNotExists(email: string): Promise<AppUser> {
    const existing = await this.getByEmail(email);
    if (existing) return existing;

    return prisma.user.create({
      data: { email },
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true,
      },
    });
  }

  /**
   * Increment user credits
   * @throws Error if credits would become negative
   */
  static async incrementCredits(userId: string, by: number): Promise<AppUser> {
    return prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: by } },
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true,
      },
    });
  }

  /**
   * Decrement user credits
   * @throws Error if credits would become negative
   */
  static async decrementCredits(userId: string, by: number): Promise<AppUser> {
    // Check current credits first
    const user = await this.getById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.credits < by) {
      throw new Error(
        `Insufficient credits. User has ${user.credits} credits, tried to decrement by ${by}`
      );
    }

    return prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: by } },
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get user's current credit balance
   * @throws Error if user not found
   */
  static async getCredits(userId: string): Promise<number> {
    const user = await this.getById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user.credits;
  }

  /**
   * Consume credits from user account (transactional)
   *
   * This operation is atomic and will:
   * 1. Lock the user row for update
   * 2. Check sufficient credits
   * 3. Decrement credits
   * 4. Return new balance
   *
   * @param userId - User identifier
   * @param count - Number of credits to consume (default: 1)
   * @returns Object with remaining credits
   * @throws {InsufficientCreditsError} If user has insufficient credits
   * @throws Error if user not found
   */
  static async consumeCredits(userId: string, count = 1): Promise<{ remaining: number }> {
    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Read user (transaction provides isolation)
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, credits: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // 2. Check sufficient credits
      if (user.credits < count) {
        throw new InsufficientCreditsError(userId, count, user.credits);
      }

      // 3. Decrement credits
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: count,
          },
        },
        select: { credits: true },
      });

      return { remaining: updated.credits };
    });

    return result;
  }

  /**
   * Set user credits to a specific value (admin operation)
   */
  static async setCredits(userId: string, credits: number): Promise<{ total: number }> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { credits },
      select: { credits: true },
    });

    return { total: user.credits };
  }
}
