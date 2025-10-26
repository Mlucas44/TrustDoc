/**
 * Prisma Client Singleton
 *
 * This module exports a singleton instance of PrismaClient to ensure
 * only one database connection is created across the application.
 *
 * In development, the singleton is attached to globalThis to survive
 * hot-reloads during development without creating new connections.
 *
 * @see https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";

import { env } from "@/src/env";

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance with logging configuration
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.server.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// In development, store the client on globalThis to prevent hot-reload issues
if (env.server.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper to ensure Prisma disconnects gracefully on app shutdown
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Graceful shutdown handlers
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await disconnectPrisma();
  });
}
