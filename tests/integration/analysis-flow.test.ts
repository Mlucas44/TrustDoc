/**
 * Integration Test - Analysis Flow
 *
 * Tests the complete pipeline: upload PDF → analyze → save → verify results
 *
 * This is the main integration test that validates the entire contract
 * analysis workflow works end-to-end.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { prisma } from "@/src/lib/prisma";

import { integrationClient } from "../helpers/integration-client";
import { enableLLMMocks, disableLLMMocks, resetLLMMocks } from "../helpers/llm-mock";
import { setupTestUser } from "../helpers/test-auth";
import { cleanupTestDatabase } from "../helpers/test-db";
import { cleanupTestStorage } from "../helpers/test-storage";

describe("Analysis Flow - Complete Pipeline", () => {
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

  it("should complete full analysis successfully with freelance contract", async () => {
    // 1. Setup: créer utilisateur avec crédits
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // 2. Upload: télécharger PDF
    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.data.filePath).toBeDefined();
    expect(uploadResult.data.filePath).toMatch(/^user-/);

    const filePath = uploadResult.data.filePath;

    // 3. Prepare: parser le PDF (optionnel mais teste le pipeline complet)
    const prepareResult = await integrationClient.prepare({
      filePath,
      sessionToken,
    });

    expect(prepareResult.success).toBe(true);
    expect(prepareResult.data.text).toBeDefined();
    expect(prepareResult.data.text.length).toBeGreaterThan(100);

    // 4. Analyze: lancer analyse LLM (mock)
    const analyzeResult = await integrationClient.analyze({
      filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(analyzeResult.success).toBe(true);
    expect(analyzeResult.data.risks).toBeDefined();
    expect(analyzeResult.data.risks).toHaveLength(3); // Mock retourne 3 risques
    expect(analyzeResult.data.risks[0].severity).toBe("HIGH");
    expect(analyzeResult.data.risks[0].category).toBe("PAYMENT");
    expect(analyzeResult.data.summary).toBeDefined();

    // 5. Verify: vérifier débit crédits
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.credits).toBe(9); // 10 - 1

    // 6. Verify: vérifier sauvegarde analysis
    const analysis = await prisma.analysis.findFirst({
      where: { userId: user.id },
    });

    expect(analysis).toBeDefined();
    expect(analysis!.status).toBe("COMPLETED");
    expect(analysis!.contractType).toBe("FREELANCE");
    expect(analysis!.filePath).toBe(filePath);
    expect(analysis!.result).toBeDefined();

    // 7. Verify: vérifier que le résultat contient bien les risques
    const result = analysis!.result as {
      risks: Array<{ category: string; severity: string }>;
    };
    expect(result.risks).toHaveLength(3);
  });

  it("should complete full analysis successfully with employment contract", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 5 });

    const uploadResult = await integrationClient.upload("sample-employment.pdf", { sessionToken });

    expect(uploadResult.success).toBe(true);

    const analyzeResult = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "EMPLOYMENT",
      sessionToken,
    });

    expect(analyzeResult.success).toBe(true);
    expect(analyzeResult.data.risks).toBeDefined();

    // Mock retourne 2 risques pour contrat CDI
    expect(analyzeResult.data.risks).toHaveLength(2);
    expect(analyzeResult.data.risks[0].category).toBe("NON_COMPETE");

    // Vérifier débit crédits
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(4); // 5 - 1
  });

  it("should use fullAnalysisFlow helper successfully", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    const result = await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result.success).toBe(true);
    expect(result.upload).toBeDefined();
    expect(result.prepare).toBeDefined();
    expect(result.analyze).toBeDefined();
    expect(result.analyze.risks).toHaveLength(3);

    // Vérifier que l'utilisateur a été débité
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(9);
  });

  it("should retrieve analysis from history", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Créer une analyse
    await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    // Récupérer l'historique
    const historyResult = await integrationClient.getHistory({
      sessionToken,
    });

    expect(historyResult.success).toBe(true);
    expect(historyResult.data.analyses).toBeDefined();
    expect(historyResult.data.analyses).toHaveLength(1);
    expect(historyResult.data.analyses[0].contractType).toBe("FREELANCE");
    expect(historyResult.data.analyses[0].status).toBe("COMPLETED");
  });

  it("should handle multiple analyses for same user", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Première analyse
    await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    // Deuxième analyse
    await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-employment.pdf",
      contractType: "EMPLOYMENT",
      sessionToken,
    });

    // Vérifier historique
    const historyResult = await integrationClient.getHistory({
      sessionToken,
    });

    expect(historyResult.data.analyses).toHaveLength(2);

    // Vérifier débit crédits (2 analyses)
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(8); // 10 - 2
  });
});
