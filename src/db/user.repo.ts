/**
 * User Repository
 *
 * Data access layer for User model with validation and business logic.
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
}
