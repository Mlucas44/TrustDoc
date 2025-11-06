/**
 * Integration test client for API endpoints
 *
 * Provides high-level methods to call API endpoints with authentication
 * and proper request/response handling.
 *
 * This client directly imports and calls Next.js route handlers for faster
 * integration tests compared to spinning up a full HTTP server.
 */

import fs from "fs/promises";
import path from "path";

import { type NextRequest } from "next/server";

import { POST as analyzeHandler } from "@/app/api/analyze/route";
import { GET as historyHandler } from "@/app/api/history/route";
import { POST as prepareHandler } from "@/app/api/prepare/route";
import { POST as uploadHandler } from "@/app/api/upload/route";

import { createAuthHeader } from "./test-auth";

/**
 * Helper pour créer une NextRequest mock
 */
function createMockRequest(opts: {
  method: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): NextRequest {
  const url = opts.url ?? "http://localhost:3000/api/test";
  const headers = new Headers(opts.headers ?? {});

  // Créer un Request standard avec le body si fourni
  const request = new Request(url, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  return request as NextRequest;
}

/**
 * Helper pour parser une Response
 */
async function parseResponse(response: Response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);
    return {
      status: response.status,
      data,
      success: response.ok,
    };
  } catch {
    return {
      status: response.status,
      data: text,
      success: response.ok,
    };
  }
}

/**
 * Client API pour tests d'intégration
 */
export const integrationClient = {
  /**
   * Upload un PDF vers /api/upload
   */
  async upload(fixtureName: string, opts?: { sessionToken?: string; userId?: string }) {
    // Lire le fichier fixture
    const fixturePath = path.join(process.cwd(), "tests/fixtures", fixtureName);
    const fileBuffer = await fs.readFile(fixturePath);

    // Créer FormData avec le fichier
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: "application/pdf" });
    formData.append("file", blob, fixtureName);

    // Créer request
    const headers: Record<string, string> = {};
    if (opts?.sessionToken) {
      Object.assign(headers, createAuthHeader(opts.sessionToken));
    }

    const request = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      headers,
      body: formData,
    });

    // Appeler handler
    const response = await uploadHandler(request as NextRequest);
    return parseResponse(response);
  },

  /**
   * Lance une analyse via /api/analyze
   */
  async analyze(opts: {
    filePath: string;
    contractType: string;
    sessionToken?: string;
    userId?: string;
  }) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (opts.sessionToken) {
      Object.assign(headers, createAuthHeader(opts.sessionToken));
    }

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/analyze",
      headers,
      body: {
        filePath: opts.filePath,
        contractType: opts.contractType,
      },
    });

    const response = await analyzeHandler(request);
    return parseResponse(response);
  },

  /**
   * Prépare un PDF via /api/prepare
   */
  async prepare(opts: { filePath: string; sessionToken?: string }) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (opts.sessionToken) {
      Object.assign(headers, createAuthHeader(opts.sessionToken));
    }

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/prepare",
      headers,
      body: {
        filePath: opts.filePath,
      },
    });

    const response = await prepareHandler(request);
    return parseResponse(response);
  },

  /**
   * Récupère l'historique des analyses via /api/history
   */
  async getHistory(opts?: { sessionToken?: string }) {
    const headers: Record<string, string> = {};

    if (opts?.sessionToken) {
      Object.assign(headers, createAuthHeader(opts.sessionToken));
    }

    const request = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/history",
      headers,
    });

    const response = await historyHandler(request);
    return parseResponse(response);
  },

  /**
   * Flow complet : upload + prepare + analyze
   * Utile pour tests end-to-end
   */
  async fullAnalysisFlow(opts: {
    fixtureName: string;
    contractType: string;
    sessionToken: string;
  }) {
    // 1. Upload
    const uploadResult = await this.upload(opts.fixtureName, {
      sessionToken: opts.sessionToken,
    });

    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadResult.data)}`);
    }

    const filePath = uploadResult.data.filePath;

    // 2. Prepare (optionnel, mais test le pipeline complet)
    const prepareResult = await this.prepare({
      filePath,
      sessionToken: opts.sessionToken,
    });

    if (!prepareResult.success) {
      throw new Error(`Prepare failed: ${JSON.stringify(prepareResult.data)}`);
    }

    // 3. Analyze
    const analyzeResult = await this.analyze({
      filePath,
      contractType: opts.contractType,
      sessionToken: opts.sessionToken,
    });

    return {
      upload: uploadResult.data,
      prepare: prepareResult.data,
      analyze: analyzeResult.data,
      success: analyzeResult.success,
    };
  },
};
