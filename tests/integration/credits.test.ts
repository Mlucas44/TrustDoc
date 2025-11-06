/**
 * Integration Test - Credits System
 *
 * Tests the credit system behavior:
 * - Credit debit on successful analysis
 * - Rejection when credits = 0
 * - No debit on failed analysis
 * - Credit balance tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { prisma } from "@/src/lib/prisma";

import { integrationClient } from "../helpers/integration-client";
import { enableLLMMocks, disableLLMMocks, resetLLMMocks, mockLLMError } from "../helpers/llm-mock";
import { setupTestUser } from "../helpers/test-auth";
import { cleanupTestDatabase } from "../helpers/test-db";
import { cleanupTestStorage } from "../helpers/test-storage";

describe("Credits System", () => {
  beforeAll(() => {
    enableLLMMocks();
  });

  afterAll(() => {
    disableLLMMocks();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    await cleanupTestStorage();
    resetLLMMocks();
  });

  it("should reject analysis when credits = 0", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 0 });

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // Devrait échouer avec 402 Payment Required
    expect(result.success).toBe(false);
    expect(result.status).toBe(402);
    expect(result.data.error).toMatch(/credit/i);

    // Vérifier que les crédits n'ont pas changé
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(0);
  });

  it("should debit 1 credit on successful analysis", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 5 });

    const result = await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result.success).toBe(true);

    // Vérifier débit de 1 crédit
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(4); // 5 - 1
  });

  it("should NOT debit credits on failed analysis (LLM error)", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 5 });

    // Forcer une erreur LLM
    mockLLMError(500, "Internal Server Error");

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait échouer
    expect(result.success).toBe(false);

    // Vérifier que les crédits n'ont PAS été débités
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(5); // Inchangé
  });

  it("should allow multiple analyses until credits exhausted", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 3 });

    // 1ère analyse : OK (3 → 2)
    const result1 = await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });
    expect(result1.success).toBe(true);

    let updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(2);

    // 2ème analyse : OK (2 → 1)
    const result2 = await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-employment.pdf",
      contractType: "EMPLOYMENT",
      sessionToken,
    });
    expect(result2.success).toBe(true);

    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser!.credits).toBe(1);

    // 3ème analyse : OK (1 → 0)
    const result3 = await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });
    expect(result3.success).toBe(true);

    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser!.credits).toBe(0);

    // 4ème analyse : REJECTED (crédits épuisés)
    const uploadResult4 = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result4 = await integrationClient.analyze({
      filePath: uploadResult4.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result4.success).toBe(false);
    expect(result4.status).toBe(402);
  });

  it("should handle concurrent analyses correctly", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Lancer 3 analyses en parallèle
    const results = await Promise.all([
      integrationClient.fullAnalysisFlow({
        fixtureName: "sample-freelance.pdf",
        contractType: "FREELANCE",
        sessionToken,
      }),
      integrationClient.fullAnalysisFlow({
        fixtureName: "sample-employment.pdf",
        contractType: "EMPLOYMENT",
        sessionToken,
      }),
      integrationClient.fullAnalysisFlow({
        fixtureName: "sample-freelance.pdf",
        contractType: "FREELANCE",
        sessionToken,
      }),
    ]);

    // Toutes devraient réussir
    expect(results.every((r) => r.success)).toBe(true);

    // Vérifier débit de 3 crédits
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(7); // 10 - 3
  });

  it("should track credit usage in analysis history", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Créer quelques analyses
    await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-employment.pdf",
      contractType: "EMPLOYMENT",
      sessionToken,
    });

    // Vérifier historique
    const analyses = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    expect(analyses).toHaveLength(2);
    expect(analyses.every((a) => a.status === "COMPLETED")).toBe(true);

    // Vérifier crédits finaux
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(8); // 10 - 2
  });
});
