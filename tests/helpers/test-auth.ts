/**
 * Authentication helpers for integration tests
 *
 * Provides utilities for:
 * - Creating test users with active sessions
 * - Generating auth headers for API calls
 * - Managing test session tokens
 */

import { createId } from "@paralleldrive/cuid2";

import { prisma } from "@/src/lib/prisma";

import { createTestUser } from "./test-db";

/**
 * Crée un utilisateur de test avec session active
 */
export async function setupTestUser(opts?: { email?: string; credits?: number; name?: string }) {
  const user = await createTestUser(opts);

  const session = await prisma.session.create({
    data: {
      sessionToken: createId(),
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    },
  });

  return { user, sessionToken: session.sessionToken };
}

/**
 * Crée un header d'authentification pour les tests
 *
 * Format: cookie: "next-auth.session-token=<token>"
 */
export function createAuthHeader(sessionToken: string) {
  return {
    cookie: `next-auth.session-token=${sessionToken}`,
  };
}

/**
 * Crée une session de test pour un utilisateur existant
 */
export async function createTestSession(userId: string) {
  const session = await prisma.session.create({
    data: {
      sessionToken: createId(),
      userId,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    },
  });

  return session.sessionToken;
}

/**
 * Vérifie si une session est valide
 */
export async function isSessionValid(sessionToken: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
  });

  if (!session) return false;
  if (session.expires < new Date()) return false;

  return true;
}

/**
 * Révoque une session de test
 */
export async function revokeTestSession(sessionToken: string): Promise<void> {
  await prisma.session.delete({
    where: { sessionToken },
  });
}
