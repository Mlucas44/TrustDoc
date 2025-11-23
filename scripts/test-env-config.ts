#!/usr/bin/env tsx
/**
 * Test Environment Variable Configuration
 *
 * Simple script to verify PDF_MAX_CONCURRENCY and PDF_PAGE_TIMEOUT_MS
 * are correctly read from environment.
 */

// Test different scenarios
const scenario = process.argv[2] || "default";

if (scenario === "high-timeout") {
  process.env.PDF_PAGE_TIMEOUT_MS = "3000";
  console.log("📋 Scenario: High Timeout (3000ms)\n");
} else if (scenario === "low-concurrency") {
  process.env.PDF_MAX_CONCURRENCY = "1";
  console.log("📋 Scenario: Low Concurrency (1)\n");
} else if (scenario === "both") {
  process.env.PDF_MAX_CONCURRENCY = "2";
  process.env.PDF_PAGE_TIMEOUT_MS = "1500";
  console.log("📋 Scenario: Custom (concurrency=2, timeout=1500ms)\n");
} else if (scenario === "extreme") {
  // Test clamping with extreme values
  process.env.PDF_MAX_CONCURRENCY = "999";
  process.env.PDF_PAGE_TIMEOUT_MS = "99999";
  console.log("📋 Scenario: Extreme Values (should be clamped)\n");
  console.log("   Setting: concurrency=999 (should clamp to 8)");
  console.log("   Setting: timeout=99999 (should clamp to 3000)\n");
} else {
  // Default test values
  process.env.PDF_MAX_CONCURRENCY = process.env.PDF_MAX_CONCURRENCY || "6";
  process.env.PDF_PAGE_TIMEOUT_MS = process.env.PDF_PAGE_TIMEOUT_MS || "2000";
  console.log("📋 Scenario: Default Test (concurrency=6, timeout=2000ms)\n");
}

console.log("🔧 Testing Environment Variable Configuration\n");
console.log("Environment Variables:");
console.log(`  PDF_MAX_CONCURRENCY = ${process.env.PDF_MAX_CONCURRENCY}`);
console.log(`  PDF_PAGE_TIMEOUT_MS = ${process.env.PDF_PAGE_TIMEOUT_MS}`);

// Import after setting env vars
import { extractTextWithPdfJs } from "../src/pdf/extract/pdfjs";
import fs from "fs/promises";
import path from "path";

async function main() {
  const fixturePath = path.join(process.cwd(), "fixtures", "pdf", "simple.pdf");

  console.log("\n📖 Reading simple.pdf...");
  const buffer = await fs.readFile(fixturePath);

  console.log("\n⚙️  Extracting text (watch for config log)...\n");
  const result = await extractTextWithPdfJs(buffer);

  console.log("\n✅ Extraction successful!");
  console.log(`   Pages: ${result.pages}`);
  console.log(`   Text Length: ${result.textLength} chars`);
  console.log(`   Time: ${result.stats.totalTimeMs}ms`);
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
