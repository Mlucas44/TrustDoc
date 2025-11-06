/**
 * Integration Test - LLM Response Validation
 *
 * Tests the validation of LLM responses:
 * - Invalid JSON handling
 * - Missing required fields
 * - Schema validation
 * - Timeout handling
 * - Error recovery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { prisma } from "@/src/lib/prisma";

import { integrationClient } from "../helpers/integration-client";
import {
  enableLLMMocks,
  disableLLMMocks,
  resetLLMMocks,
  mockLLMInvalidJSON,
  mockLLMMissingFields,
  mockLLMResponse,
  mockLLMTimeout,
} from "../helpers/llm-mock";
import { setupTestUser } from "../helpers/test-auth";
import { cleanupTestDatabase } from "../helpers/test-db";
import { cleanupTestStorage } from "../helpers/test-storage";

describe("LLM Response Validation", () => {
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

  it("should reject invalid JSON from LLM", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse LLM invalide (pas du JSON)
    mockLLMInvalidJSON();

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait échouer
    expect(result.success).toBe(false);
    expect(result.data.error).toMatch(/json|parse/i);

    // Vérifier que les crédits n'ont PAS été débités
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(10); // Inchangé
  });

  it("should reject LLM response with missing required fields", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse sans le champ "risks"
    mockLLMMissingFields();

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait échouer
    expect(result.success).toBe(false);
    expect(result.data.error).toMatch(/schema|validation|required/i);

    // Vérifier que les crédits n'ont PAS été débités
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(10);
  });

  it("should reject LLM response with invalid risk structure", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse avec structure de risque invalide
    mockLLMResponse({
      risks: [
        {
          // Missing category, severity, title
          excerpt: "Some text",
        },
      ],
      summary: "Valid summary",
    });

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait échouer
    expect(result.success).toBe(false);

    // Vérifier non débit
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(10);
  });

  it("should handle LLM timeout gracefully", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer un timeout (31s > 30s timeout)
    mockLLMTimeout(31000);

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait échouer
    expect(result.success).toBe(false);
    expect(result.data.error).toMatch(/timeout/i);

    // Vérifier non débit
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(10);
  }, 35000); // Timeout du test > 31s

  it("should validate risk severity enum values", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse avec severity invalide
    mockLLMResponse({
      risks: [
        {
          category: "PAYMENT",
          severity: "INVALID_SEVERITY", // Devrait être HIGH, MEDIUM, ou LOW
          title: "Test risk",
          excerpt: "Test excerpt",
          recommendation: "Test recommendation",
        },
      ],
      summary: "Valid summary",
    });

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    const result = await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait échouer
    expect(result.success).toBe(false);

    // Vérifier non débit
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(10);
  });

  it("should accept valid LLM response with all required fields", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse valide complète
    mockLLMResponse({
      risks: [
        {
          category: "PAYMENT",
          severity: "HIGH",
          title: "Délai de paiement excessif",
          excerpt: "Le paiement interviendra sous 90 jours...",
          recommendation: "Négocier un délai maximal de 30 jours",
        },
      ],
      summary: "Contrat avec risque sur les délais de paiement.",
    });

    const result = await integrationClient.fullAnalysisFlow({
      fixtureName: "sample-freelance.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    // L'analyse devrait réussir
    expect(result.success).toBe(true);
    expect(result.analyze.risks).toHaveLength(1);
    expect(result.analyze.risks[0].severity).toBe("HIGH");

    // Vérifier débit
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser!.credits).toBe(9); // 10 - 1
  });

  it("should save failed analysis with error details", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer JSON invalide
    mockLLMInvalidJSON();

    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    await integrationClient.analyze({
      filePath: uploadResult.data.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    // Vérifier qu'une analyse "FAILED" a été créée
    const analysis = await prisma.analysis.findFirst({
      where: { userId: user.id },
    });

    expect(analysis).toBeDefined();
    expect(analysis!.status).toBe("FAILED");
    expect(analysis!.result).toBeDefined();

    // Le result devrait contenir des infos sur l'erreur
    const result = analysis!.result as { error?: string };
    expect(result.error).toBeDefined();
  });
});
