#!/usr/bin/env tsx
/**
 * Test /api/parse-v2 Endpoint
 *
 * Tests the new PDF.js-based parser API with various scenarios:
 * - Simple PDF (success)
 * - Empty text PDF (422 error)
 * - Encrypted PDF with correct password (success)
 * - Encrypted PDF without password (401 PASSWORD_REQUIRED)
 * - Encrypted PDF with wrong password (401 PASSWORD_INVALID)
 *
 * Usage:
 *   pnpm tsx scripts/test-parse-v2-api.ts <scenario>
 *
 * Scenarios:
 *   simple         - Test with simple.pdf (should succeed)
 *   long           - Test with long.pdf (should succeed)
 *   empty          - Test with empty-text.pdf (should return 422)
 *   encrypted      - Test with encrypted.pdf + correct password (should succeed)
 *   encrypted-nopass - Test with encrypted.pdf without password (should return 401 PASSWORD_REQUIRED)
 *   encrypted-wrong  - Test with encrypted.pdf + wrong password (should return 401 PASSWORD_INVALID)
 *   feature-disabled - Test with PDF_PARSE_V2=false (should return 404)
 */

import fs from "fs/promises";
import path from "path";

// Set feature flag to enable v2
const scenario = process.argv[2] || "simple";

if (scenario === "feature-disabled") {
  process.env.PDF_PARSE_V2 = "false";
} else {
  process.env.PDF_PARSE_V2 = "true";
}

// Set NEXT_RUNTIME to undefined to skip server-only imports (test context)
delete process.env.NEXT_RUNTIME;

// Mock storage service to read from fixtures during tests
// This allows testing the API without needing actual Supabase storage
async function mockDownloadFile(filePath: string): Promise<Buffer> {
  console.log(`[mockStorage] Downloading: ${filePath}`);

  // Extract filename from path (e.g., "user-abc/simple.pdf" -> "simple.pdf")
  const filename = path.basename(filePath);
  const fixturePath = path.join(process.cwd(), "fixtures", "pdf", filename);

  try {
    const buffer = await fs.readFile(fixturePath);
    console.log(`[mockStorage] Loaded from fixtures: ${fixturePath} (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    console.error(`[mockStorage] File not found: ${fixturePath}`);
    const StorageUploadError = class extends Error {
      constructor(message: string) {
        super(message);
        this.name = "StorageUploadError";
      }
    };
    throw new StorageUploadError(`File not found: ${filePath}`);
  }
}

// Mock deleteFile to avoid errors
async function mockDeleteFile(filePath: string): Promise<void> {
  console.log(`[mockStorage] Skipping deletion (mock): ${filePath}`);
}

// Monkey-patch modules BEFORE importing the route
import { NextRequest } from "next/server";

import { POST } from "../app/api/parse-v2/route";

const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string) {
  // Mock server-only (no-op in test scripts)
  if (id === "server-only") {
    return {};
  }

  // Mock storage service
  if (id === "@/src/services/storage") {
    return {
      downloadFile: mockDownloadFile,
      deleteFile: mockDeleteFile,
      StorageUploadError: class extends Error {
        constructor(message: string) {
          super(message);
          this.name = "StorageUploadError";
        }
      },
    };
  }

  // Mock quota-guard (always allow in tests)
  if (id === "@/src/middleware/quota-guard") {
    return {
      requireQuotaOrUserCredit: async () => ({ allowed: true }),
    };
  }

  // Mock rate-limit (always allow in tests)
  if (id === "@/src/middleware/rate-limit") {
    return {
      checkRateLimitForRoute: () => ({ allowed: true }),
      getRateLimitHeaders: () => ({}),
    };
  }

  return originalRequire.apply(this, arguments);
};

// Import the route AFTER patching

/**
 * Create mock NextRequest
 */
function createMockRequest(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/parse-v2";
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  return new NextRequest(url, init);
}

/**
 * Test scenarios
 */
const scenarios: Record<
  string,
  {
    description: string;
    body: { filePath: string; pdfPassword?: string };
    expectedStatus: number;
    expectedCode?: string;
  }
> = {
  simple: {
    description: "Simple PDF (should succeed)",
    body: { filePath: "user-test123/simple.pdf" },
    expectedStatus: 200,
  },
  long: {
    description: "Long PDF with 3 pages (should succeed)",
    body: { filePath: "user-test123/long.pdf" },
    expectedStatus: 200,
  },
  empty: {
    description: "Empty text PDF (should return 422 TEXT_EMPTY)",
    body: { filePath: "user-test123/empty-text.pdf" },
    expectedStatus: 422,
    expectedCode: "TEXT_EMPTY",
  },
  encrypted: {
    description: "Encrypted PDF with correct password (should succeed)",
    body: { filePath: "user-test123/encrypted.pdf", pdfPassword: "test123" },
    expectedStatus: 200,
  },
  "encrypted-nopass": {
    description: "Encrypted PDF without password (should return 401 PASSWORD_REQUIRED)",
    body: { filePath: "user-test123/encrypted.pdf" },
    expectedStatus: 401,
    expectedCode: "PASSWORD_REQUIRED",
  },
  "encrypted-wrong": {
    description: "Encrypted PDF with wrong password (should return 401 PASSWORD_INVALID)",
    body: { filePath: "user-test123/encrypted.pdf", pdfPassword: "wrongpass" },
    expectedStatus: 401,
    expectedCode: "PASSWORD_INVALID",
  },
  "feature-disabled": {
    description: "Feature flag disabled (should return 404 FEATURE_DISABLED)",
    body: { filePath: "user-test123/simple.pdf" },
    expectedStatus: 404,
    expectedCode: "FEATURE_DISABLED",
  },
};

/**
 * Run test
 */
async function runTest() {
  const testCase = scenarios[scenario];

  if (!testCase) {
    console.error(`❌ Unknown scenario: ${scenario}`);
    console.error("\nAvailable scenarios:");
    Object.keys(scenarios).forEach((key) => {
      console.error(`  - ${key}: ${scenarios[key].description}`);
    });
    process.exit(1);
  }

  console.log("🧪 Testing /api/parse-v2");
  console.log("═".repeat(60));
  console.log(`\n📋 Scenario: ${testCase.description}`);
  console.log(`📨 Request Body:`, JSON.stringify(testCase.body, null, 2));
  console.log(`✅ Expected Status: ${testCase.expectedStatus}`);
  if (testCase.expectedCode) {
    console.log(`🔹 Expected Code: ${testCase.expectedCode}`);
  }
  console.log("");

  try {
    // Create mock request
    const request = createMockRequest(testCase.body);

    // Call the API route
    console.log("⚙️  Calling POST /api/parse-v2...\n");
    const response = await POST(request);

    // Parse response
    const status = response.status;
    const data = await response.json();

    console.log("📊 Response:");
    console.log("═".repeat(60));
    console.log(`Status: ${status}`);
    console.log(`Body:`, JSON.stringify(data, null, 2));
    console.log("");

    // Validate status
    if (status !== testCase.expectedStatus) {
      console.error(`❌ FAIL: Expected status ${testCase.expectedStatus}, got ${status}`);
      process.exit(1);
    }

    // Validate error code if expected
    if (testCase.expectedCode && data.code !== testCase.expectedCode) {
      console.error(
        `❌ FAIL: Expected code "${testCase.expectedCode}", got "${data.code || "none"}"`
      );
      process.exit(1);
    }

    // Success case validation
    if (status === 200) {
      if (!data.pages || !data.textRaw || !data.engineUsed) {
        console.error("❌ FAIL: Missing required fields in success response");
        console.error("Expected: pages, textRaw, engineUsed");
        console.error("Got:", Object.keys(data));
        process.exit(1);
      }

      if (data.engineUsed !== "pdfjs") {
        console.error(`❌ FAIL: Expected engineUsed="pdfjs", got "${data.engineUsed}"`);
        process.exit(1);
      }

      console.log("✅ SUCCESS: API returned expected response");
      console.log(`   Engine: ${data.engineUsed}`);
      console.log(`   Pages: ${data.pages}`);
      console.log(`   Text Length: ${data.textLength} chars`);
      console.log(`   Total Time: ${data.stats?.totalTimeMs}ms`);
      console.log(`   Avg Time/Page: ${data.stats?.avgPageTimeMs}ms`);
    } else {
      console.log(`✅ SUCCESS: API returned expected error (${status} ${data.code})`);
      console.log(`   Message: ${data.error}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ FATAL ERROR:", error);
    process.exit(1);
  }
}

runTest();
