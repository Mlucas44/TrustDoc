#!/usr/bin/env tsx
/**
 * Test Layout Detection via API
 *
 * Tests the layout-pass implementation by uploading PDFs to /api/prepare
 * and analyzing the detection results.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface TestResult {
  filename: string;
  success: boolean;
  detectedType?: string;
  confidence?: number;
  source?: string;
  evidence?: string[];
  stats?: {
    pages: number;
    textLengthClean: number;
  };
  error?: string;
  errorCode?: string;
}

/**
 * Test a single PDF file via API
 */
async function testPdfViaLocalModule(filePath: string, filename: string): Promise<TestResult> {
  try {
    console.log(`\n📄 Testing: ${filename}`);

    // Read PDF buffer
    const buffer = readFileSync(filePath);
    console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);

    // Import modules dynamically to avoid server-only issues
    // We'll use a different approach - direct module testing
    const { analyzeLayoutFromBuffer, computeCerfaLikelihood } = await import(
      "../src/services/text/layout-pass.js"
    );
    const { extractTextWithPdfJs } = await import("../src/pdf/extract/pdfjs.js");
    const { normalizeContractText } = await import("../src/services/text/normalize.js");

    // 1. Layout analysis
    console.log(`   Running layout analysis...`);
    const layoutInfo = await analyzeLayoutFromBuffer(buffer);
    const cerfaScore = computeCerfaLikelihood(layoutInfo);

    console.log(`   ✅ Layout: ${layoutInfo.blocks.length} blocks`);
    console.log(
      `   ✅ Form indicators: ${layoutInfo.formIndicators.colonLabels} labels, ${layoutInfo.formIndicators.fieldLabels} fields, ${layoutInfo.formIndicators.checkboxes} checkboxes`
    );
    console.log(`   ✅ Cerfa score: ${cerfaScore.toFixed(3)}`);

    // 2. Text extraction
    console.log(`   Extracting text...`);
    const pdfData = await extractTextWithPdfJs(buffer);

    // 3. Normalization
    console.log(`   Normalizing text...`);
    const normalizeResult = normalizeContractText({
      textRaw: pdfData.textRaw,
      pages: pdfData.pages,
      meta: pdfData.meta as Record<string, string>,
    });

    console.log(`   ✅ Extracted: ${pdfData.textLength} chars from ${pdfData.pages} pages`);
    console.log(`   ✅ Clean text: ${normalizeResult.textClean.length} chars`);

    // Determine type based on cerfa score
    let detectedType = "UNKNOWN";
    let confidence = 0;
    let source = "layout";

    if (cerfaScore >= 0.45) {
      detectedType = "FORM_CERFA";
      confidence = 0.85;
      console.log(`   🎯 Type: FORM_CERFA (forced by layout, score=${cerfaScore.toFixed(3)})`);
    } else {
      console.log(
        `   ℹ️  Cerfa score too low (${cerfaScore.toFixed(3)} < 0.45), would use heuristic detection`
      );
      detectedType = "WILL_USE_HEURISTIC";
      confidence = 0;
      source = "heuristic";
    }

    return {
      filename,
      success: true,
      detectedType,
      confidence,
      source,
      stats: {
        pages: pdfData.pages,
        textLengthClean: normalizeResult.textClean.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Error: ${errorMessage}`);

    return {
      filename,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("🧪 TrustDoc - Layout Detection Test Suite");
  console.log("==========================================\n");

  const fixturesDir = join(process.cwd(), "fixtures", "pdf");
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".pdf"));

  console.log(`Found ${files.length} PDF files to test\n`);

  const results: TestResult[] = [];

  for (const file of files) {
    const filePath = join(fixturesDir, file);
    const result = await testPdfViaLocalModule(filePath, file);
    results.push(result);
  }

  // Print summary
  console.log("\n\n📊 TEST SUMMARY");
  console.log("================\n");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const cerfaDetected = results.filter((r) => r.detectedType === "FORM_CERFA");

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`🎯 FORM_CERFA detected: ${cerfaDetected.length}/${successful.length}\n`);

  // Detailed results table
  console.log("Detailed Results:");
  console.log("─".repeat(100));
  console.log("Filename                  | Type              | Confidence | Pages | Text (chars)");
  console.log("─".repeat(100));

  for (const result of results) {
    if (result.success) {
      const filename = result.filename.padEnd(25);
      const type = (result.detectedType || "N/A").padEnd(17);
      const conf = (result.confidence?.toFixed(2) || "N/A").padStart(10);
      const pages = (result.stats?.pages.toString() || "N/A").padStart(5);
      const text = (result.stats?.textLengthClean.toString() || "N/A").padStart(12);

      console.log(`${filename} | ${type} | ${conf} | ${pages} | ${text}`);
    } else {
      const filename = result.filename.padEnd(25);
      console.log(`${filename} | ERROR: ${result.error}`);
    }
  }
  console.log("─".repeat(100));

  // Expected vs Actual
  console.log("\n\n🎯 VALIDATION CRITERIA");
  console.log("======================\n");

  // Define expectations based on filenames
  const expectedCerfa = ["cerfa.pdf", "bulletin_inedis.pdf", "bulletin_nurun.pdf"];
  const expectedTabular = ["devis_free.pdf"];
  const expectedOther = ["cgu_github.pdf", "nda.pdf", "contrat_inedis.pdf", "contrat_nurun.pdf"];

  console.log("Expected FORM_CERFA (score >= 0.45):");
  for (const file of expectedCerfa) {
    const result = results.find((r) => r.filename === file);
    if (!result) {
      console.log(`   ⚠️  ${file} - NOT TESTED`);
    } else if (!result.success) {
      console.log(`   ❌ ${file} - ERROR: ${result.error}`);
    } else if (result.detectedType === "FORM_CERFA") {
      console.log(`   ✅ ${file} - CORRECTLY detected as FORM_CERFA (confidence: ${result.confidence?.toFixed(2)})`);
    } else {
      console.log(`   ❌ ${file} - WRONG: detected as ${result.detectedType} (should be FORM_CERFA)`);
    }
  }

  console.log("\nExpected DEVIS/TABULAR_COMMERCIAL (score < 0.45):");
  for (const file of expectedTabular) {
    const result = results.find((r) => r.filename === file);
    if (!result) {
      console.log(`   ⚠️  ${file} - NOT TESTED`);
    } else if (!result.success) {
      console.log(`   ❌ ${file} - ERROR: ${result.error}`);
    } else if (result.detectedType !== "FORM_CERFA") {
      console.log(`   ✅ ${file} - CORRECTLY NOT detected as FORM_CERFA (will use heuristic)`);
    } else {
      console.log(`   ❌ ${file} - WRONG: detected as FORM_CERFA (should NOT be)`);
    }
  }

  console.log("\nExpected OTHER types (CGU, NDA, contracts - score < 0.45):");
  for (const file of expectedOther) {
    const result = results.find((r) => r.filename === file);
    if (!result) {
      console.log(`   ⚠️  ${file} - NOT TESTED`);
    } else if (!result.success) {
      console.log(`   ❌ ${file} - ERROR: ${result.error}`);
    } else if (result.detectedType !== "FORM_CERFA") {
      console.log(`   ✅ ${file} - CORRECTLY NOT detected as FORM_CERFA`);
    } else {
      console.log(`   ❌ ${file} - WRONG: detected as FORM_CERFA (should NOT be)`);
    }
  }

  // Final verdict
  console.log("\n\n🏆 FINAL VERDICT");
  console.log("================\n");

  const allCerfaCorrect = expectedCerfa.every((file) => {
    const result = results.find((r) => r.filename === file);
    return result?.success && result.detectedType === "FORM_CERFA";
  });

  const allNonCerfaCorrect = [...expectedTabular, ...expectedOther].every((file) => {
    const result = results.find((r) => r.filename === file);
    return result?.success && result.detectedType !== "FORM_CERFA";
  });

  if (allCerfaCorrect && allNonCerfaCorrect) {
    console.log("✅ ALL TESTS PASSED!");
    console.log("   - Cerfa forms correctly detected (score >= 0.45)");
    console.log("   - Non-Cerfa documents correctly excluded (score < 0.45)");
    console.log("\n🎉 Layout-pass implementation is WORKING as expected!");
  } else {
    console.log("⚠️  SOME TESTS FAILED");
    if (!allCerfaCorrect) {
      console.log("   ❌ Some Cerfa forms were NOT detected");
    }
    if (!allNonCerfaCorrect) {
      console.log("   ❌ Some non-Cerfa documents were INCORRECTLY detected as Cerfa");
    }
    console.log("\n🔧 Review the detailed results above to adjust the scoring thresholds.");
  }

  // Print guidance
  console.log("\n\n📚 HOW TO INTERPRET RESULTS");
  console.log("============================\n");
  console.log("✅ PASS criteria:");
  console.log("   - cerfa.pdf, bulletin_*.pdf → detected as FORM_CERFA (score >= 0.45)");
  console.log("   - devis_free.pdf → NOT detected as FORM_CERFA (score < 0.45)");
  console.log("   - cgu_github.pdf, nda.pdf, contrat_*.pdf → NOT detected as FORM_CERFA");
  console.log("\n💡 If tests fail:");
  console.log("   - Check the Cerfa score for each file");
  console.log("   - Adjust weights in computeCerfaLikelihood() if needed");
  console.log("   - Review layoutInfo.formIndicators to understand why score is too high/low");
  console.log("\n");

  process.exit(allCerfaCorrect && allNonCerfaCorrect ? 0 : 1);
}

// Run tests
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
