#!/usr/bin/env tsx
/**
 * PDF Extractor Test Runner
 *
 * Test the pdfjs extractor with fixture PDFs without touching the API.
 * Run with: pnpm tsx scripts/pdf-runner.ts <fixture-name>
 *
 * Examples:
 *   pnpm tsx scripts/pdf-runner.ts simple
 *   pnpm tsx scripts/pdf-runner.ts long
 *   pnpm tsx scripts/pdf-runner.ts empty-text
 */

import fs from "fs/promises";
import path from "path";

import {
  PdfPasswordRequiredError,
  PdfPasswordInvalidError,
  PdfPageTimeoutError,
  PdfParseFailedError,
  PdfFileTooLargeError,
  PdfTextEmptyError,
  getUserFacingMessage,
} from "../src/pdf/extract/errors";
import { extractTextWithPdfJs } from "../src/pdf/extract/pdfjs";

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print extraction result with detailed info
 */
function printResult(result: Awaited<ReturnType<typeof extractTextWithPdfJs>>) {
  console.log("\n📊 Extraction Results:");
  console.log("═".repeat(60));

  // Basic info
  console.log(`\n🔹 Basic Info:`);
  console.log(`   Pages:       ${result.pages}`);
  console.log(`   Text Length: ${result.textLength} characters`);
  console.log(`   Engine:      ${result.engineUsed}`);

  // Metadata
  console.log(`\n🔹 Metadata:`);
  if (result.meta.title) console.log(`   Title:        ${result.meta.title}`);
  if (result.meta.author) console.log(`   Author:       ${result.meta.author}`);
  if (result.meta.producer) console.log(`   Producer:     ${result.meta.producer}`);
  if (result.meta.creator) console.log(`   Creator:      ${result.meta.creator}`);
  if (result.meta.creationDate) console.log(`   Created:      ${result.meta.creationDate}`);

  // Stats
  console.log(`\n🔹 Performance Stats:`);
  console.log(`   Total Time:      ${formatDuration(result.stats.totalTimeMs)}`);
  console.log(`   Avg Time/Page:   ${formatDuration(result.stats.avgPageTimeMs)}`);
  if (result.stats.timedOutPages.length > 0) {
    console.log(`   ⚠️  Timed Out Pages: ${result.stats.timedOutPages.join(", ")}`);
  }

  // Memory stats
  console.log(`\n🔹 Memory Stats:`);
  console.log(`   Input Size:      ${formatBytes(result.stats.memory.inputBufferBytes)}`);
  console.log(`   Extracted Text:  ${formatBytes(result.stats.memory.extractedTextBytes)}`);
  console.log(
    `   Estimated Peak:  ${formatBytes(result.stats.memory.estimatedPeakBytes)}`
  );

  // Text preview
  console.log(`\n🔹 Text Preview (first 200 chars):`);
  console.log("─".repeat(60));
  const preview = result.textRaw.slice(0, 200).replace(/\n/g, " ");
  console.log(`   ${preview}...`);
  console.log("─".repeat(60));
}

/**
 * Print error details
 */
function printError(error: unknown) {
  console.error("\n❌ Extraction Failed:");
  console.error("═".repeat(60));

  if (error instanceof PdfPasswordRequiredError) {
    console.error("\n🔒 Password Required");
    console.error(`   ${error.message}`);
    console.error(`   Code: ${error.code}`);
  } else if (error instanceof PdfPasswordInvalidError) {
    console.error("\n🔑 Invalid Password");
    console.error(`   ${error.message}`);
    console.error(`   Code: ${error.code}`);
  } else if (error instanceof PdfPageTimeoutError) {
    console.error("\n⏱️  Page Timeout");
    console.error(`   ${error.message}`);
    console.error(`   Page: ${error.pageNumber}`);
    console.error(`   Timeout: ${error.timeoutMs}ms`);
    console.error(`   Code: ${error.code}`);
  } else if (error instanceof PdfFileTooLargeError) {
    console.error("\n📦 File Too Large");
    console.error(`   ${error.message}`);
    console.error(`   Size: ${formatBytes(error.sizeBytes)}`);
    console.error(`   Max: ${formatBytes(error.maxSizeBytes)}`);
    console.error(`   Code: ${error.code}`);
  } else if (error instanceof PdfTextEmptyError) {
    console.error("\n📄 Empty Text (Scanned PDF?)");
    console.error(`   ${error.message}`);
    console.error(`   Text Length: ${error.textLength} chars`);
    console.error(`   Code: ${error.code}`);
  } else if (error instanceof PdfParseFailedError) {
    console.error("\n🔥 Parse Failed");
    console.error(`   ${error.message}`);
    console.error(`   Code: ${error.code}`);
    if (error.cause) {
      console.error(`   Cause: ${error.cause}`);
    }
  } else if (error instanceof Error) {
    console.error("\n💥 Unknown Error");
    console.error(`   Message: ${error.message}`);
    console.error(`   Name: ${error.name}`);
    if (error.stack) {
      console.error(`\n   Stack Trace:`);
      console.error(`   ${error.stack.split("\n").slice(0, 5).join("\n   ")}`);
    }
  } else {
    console.error("\n💥 Unknown Error");
    console.error(`   ${String(error)}`);
  }

  console.error("\n🗨️  User-Facing Message:");
  console.error(`   "${getUserFacingMessage(error)}"`);
  console.error("\n" + "═".repeat(60));
}

/**
 * Parse command line arguments
 */
function parseArgs(): { fixtureName: string; password?: string } {
  const args = process.argv.slice(2);
  let fixtureName: string | undefined;
  let password: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--password=")) {
      password = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      fixtureName = arg;
    }
  }

  if (!fixtureName) {
    throw new Error("Missing fixture name");
  }

  return { fixtureName, password };
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  let fixtureName: string;
  let password: string | undefined;

  try {
    const parsed = parseArgs();
    fixtureName = parsed.fixtureName;
    password = parsed.password;
  } catch (error) {
    console.error("❌ Error: Missing fixture name");
    console.error("\nUsage: pnpm tsx scripts/pdf-runner.ts <fixture-name> [--password=PASSWORD]");
    console.error("\nAvailable fixtures:");
    console.error("  - simple       (1 page, basic text)");
    console.error("  - long         (3 pages, contract)");
    console.error("  - empty-text   (1 page, minimal text - should fail)");
    console.error("  - encrypted    (1 page, password-protected)");
    console.error("\nExamples:");
    console.error("  pnpm tsx scripts/pdf-runner.ts simple");
    console.error("  pnpm tsx scripts/pdf-runner.ts long");
    console.error("  pnpm tsx scripts/pdf-runner.ts empty-text");
    console.error("  pnpm tsx scripts/pdf-runner.ts encrypted --password=test123");
    process.exit(1);
  }

  const fixturePath = path.join(process.cwd(), "fixtures", "pdf", `${fixtureName}.pdf`);

  console.log("🔍 PDF Extractor Test Runner");
  console.log("═".repeat(60));
  console.log(`\n📂 Fixture: ${fixtureName}.pdf`);
  console.log(`📍 Path: ${fixturePath}`);
  if (password) {
    console.log(`🔑 Password: ${"*".repeat(password.length)} (${password.length} chars)`);
  }

  // Check if file exists
  try {
    await fs.access(fixturePath);
  } catch (error) {
    console.error(`\n❌ Error: Fixture file not found: ${fixturePath}`);
    console.error("\nAvailable fixtures:");
    try {
      const files = await fs.readdir(path.join(process.cwd(), "fixtures", "pdf"));
      files.forEach((file) => {
        if (file.endsWith(".pdf")) {
          console.error(`  - ${file.replace(".pdf", "")}`);
        }
      });
    } catch {
      console.error("  (Could not list fixtures directory)");
    }
    process.exit(1);
  }

  // Read file
  console.log("\n📖 Reading file...");
  const buffer = await fs.readFile(fixturePath);
  console.log(`   ✓ Loaded: ${formatBytes(buffer.length)}`);

  // Extract text
  console.log("\n⚙️  Extracting text with pdfjs...");
  const startTime = performance.now();

  try {
    const result = await extractTextWithPdfJs(buffer, {
      password,
      maxConcurrency: 4,
      pageTimeoutMs: 800,
    });

    const duration = performance.now() - startTime;
    console.log(`   ✓ Success in ${formatDuration(duration)}`);

    printResult(result);

    console.log("\n✅ Test completed successfully!\n");
    process.exit(0);
  } catch (error) {
    const duration = performance.now() - startTime;
    console.log(`   ✗ Failed in ${formatDuration(duration)}`);

    printError(error);

    console.log("\n⚠️  Test completed with errors\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
