/**
 * Database helpers for integration tests
 *
 * Provides utilities for:
 * - Cleaning up test database between tests
 * - Creating test users with credits
 * - Creating test analyses
 */

import { prisma } from "@/src/lib/prisma";

/**
 * Nettoie toutes les données de test de la base de données
 * Exécuté avant/après chaque test pour garantir l'isolation
 */
export async function cleanupTestDatabase() {
  await prisma.$transaction([
    prisma.analysis.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * Crée un utilisateur de test avec crédits
 */
export async function createTestUser(opts?: { email?: string; credits?: number; name?: string }) {
  return prisma.user.create({
    data: {
      email: opts?.email ?? `test-${Date.now()}@example.com`,
      credits: opts?.credits ?? 10,
      name: opts?.name ?? "Test User",
    },
  });
}

/**
 * Crée une analyse de test
 */
export async function createTestAnalysis(
  userId: string,
  opts?: {
    contractType?: string;
    status?: string;
    filePath?: string;
    result?: object;
  }
) {
  return prisma.analysis.create({
    data: {
      userId,
      filePath: opts?.filePath ?? "test/sample.pdf",
      contractType: opts?.contractType ?? "FREELANCE",
      status: opts?.status ?? "COMPLETED",
      result: opts?.result ?? {
        risks: [],
        summary: "Test analysis",
      },
    },
  });
}

/**
 * Compte le nombre d'analyses pour un utilisateur
 */
export async function countUserAnalyses(userId: string): Promise<number> {
  return prisma.analysis.count({
    where: { userId },
  });
}

/**
 * Récupère tous les utilisateurs de test
 */
export async function getAllTestUsers() {
  return prisma.user.findMany();
}

/**
 * Récupère toutes les analyses de test
 */
export async function getAllTestAnalyses() {
  return prisma.analysis.findMany();
}
