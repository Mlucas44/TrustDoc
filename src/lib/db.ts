/**
 * Prisma Client Singleton
 *
 * Ensures a single Prisma Client instance across the application.
 * Prevents connection exhaustion in development with hot-reloading.
 */

import { PrismaClient } from "@prisma/client";

import { env } from "@/src/env";

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (env.server.NODE_ENV === "production") {
  // Production: create new instance
  prisma = new PrismaClient();
} else {
  // Development: reuse cached instance to avoid connection exhaustion
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient();
  }
  prisma = global.cachedPrisma;
}

export { prisma };

// Export as 'db' for consistency with raw SQL queries
export const db = prisma;
