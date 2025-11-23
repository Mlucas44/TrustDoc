#!/usr/bin/env tsx
/**
 * Generate PDF fixtures for testing
 *
 * This script creates simple PDF files for testing the PDF extraction pipeline.
 * Run with: pnpm tsx scripts/generate-pdf-fixtures.ts
 */

import fs from "fs/promises";
import path from "path";

/**
 * Generate a simple single-page PDF with basic text
 *
 * This creates a minimal valid PDF structure with embedded text.
 * The PDF contains "Hello World - Simple Contract" and basic metadata.
 */
async function generateSimplePdf(): Promise<Buffer> {
  // Minimal valid PDF with text content
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 120
>>
stream
BT
/F1 12 Tf
50 700 Td
(Hello World - Simple Contract) Tj
0 -20 Td
(This is a test PDF with extractable text.) Tj
0 -20 Td
(Page 1 of 1) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
6 0 obj
<<
/Title (Simple Test PDF)
/Author (PDF Fixture Generator)
/Producer (TrustDoc Test Suite)
/Creator (generate-pdf-fixtures.ts)
/CreationDate (D:20250112000000Z)
>>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000444 00000 n
0000000527 00000 n
trailer
<<
/Size 7
/Root 1 0 R
/Info 6 0 R
>>
startxref
713
%%EOF`;

  return Buffer.from(pdfContent, "utf-8");
}

/**
 * Generate a multi-page PDF (3 pages)
 */
async function generateLongPdf(): Promise<Buffer> {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R 4 0 R 5 0 R]
/Count 3
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 6 0 R
/Resources <<
/Font <<
/F1 9 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 7 0 R
/Resources <<
/Font <<
/F1 9 0 R
>>
>>
>>
endobj
5 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 8 0 R
/Resources <<
/Font <<
/F1 9 0 R
>>
>>
>>
endobj
6 0 obj
<<
/Length 150
>>
stream
BT
/F1 12 Tf
50 700 Td
(EMPLOYMENT CONTRACT - PAGE 1) Tj
0 -30 Td
(Article 1: Position and Duties) Tj
0 -20 Td
(The employee shall work as a Software Engineer.) Tj
0 -20 Td
(Location: Paris, France) Tj
ET
endstream
endobj
7 0 obj
<<
/Length 160
>>
stream
BT
/F1 12 Tf
50 700 Td
(EMPLOYMENT CONTRACT - PAGE 2) Tj
0 -30 Td
(Article 2: Compensation) Tj
0 -20 Td
(Base salary: 50,000 EUR per year) Tj
0 -20 Td
(Paid monthly on the last business day.) Tj
ET
endstream
endobj
8 0 obj
<<
/Length 140
>>
stream
BT
/F1 12 Tf
50 700 Td
(EMPLOYMENT CONTRACT - PAGE 3) Tj
0 -30 Td
(Article 3: Termination) Tj
0 -20 Td
(Notice period: 2 months) Tj
0 -20 Td
(Signed in Paris) Tj
ET
endstream
endobj
9 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
10 0 obj
<<
/Title (Long Multi-Page Contract)
/Author (PDF Fixture Generator)
/Producer (TrustDoc Test Suite)
/Creator (generate-pdf-fixtures.ts)
/CreationDate (D:20250112000000Z)
>>
endobj
xref
0 11
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000125 00000 n
0000000284 00000 n
0000000443 00000 n
0000000602 00000 n
0000000803 00000 n
0000001014 00000 n
0000001205 00000 n
0000001288 00000 n
trailer
<<
/Size 11
/Root 1 0 R
/Info 10 0 R
>>
startxref
1489
%%EOF`;

  return Buffer.from(pdfContent, "utf-8");
}

/**
 * Generate a PDF with very minimal text (simulates scanned PDF)
 */
async function generateEmptyTextPdf(): Promise<Buffer> {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 40
>>
stream
BT
/F1 12 Tf
50 700 Td
(X) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
6 0 obj
<<
/Title (Empty Text PDF)
/Author (PDF Fixture Generator)
/Producer (TrustDoc Test Suite - Scanned Simulation)
/Creator (generate-pdf-fixtures.ts)
>>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000374 00000 n
0000000457 00000 n
trailer
<<
/Size 7
/Root 1 0 R
/Info 6 0 R
>>
startxref
633
%%EOF`;

  return Buffer.from(pdfContent, "utf-8");
}

/**
 * Main function to generate all fixtures
 */
async function main() {
  const fixturesDir = path.join(process.cwd(), "fixtures", "pdf");

  console.log("🔨 Generating PDF fixtures...\n");

  // Ensure directory exists
  await fs.mkdir(fixturesDir, { recursive: true });

  // Generate simple.pdf
  console.log("📄 Generating simple.pdf...");
  const simplePdf = await generateSimplePdf();
  await fs.writeFile(path.join(fixturesDir, "simple.pdf"), simplePdf);
  console.log(`   ✓ Created: ${simplePdf.length} bytes\n`);

  // Generate long.pdf
  console.log("📄 Generating long.pdf (3 pages)...");
  const longPdf = await generateLongPdf();
  await fs.writeFile(path.join(fixturesDir, "long.pdf"), longPdf);
  console.log(`   ✓ Created: ${longPdf.length} bytes\n`);

  // Generate empty-text.pdf
  console.log("📄 Generating empty-text.pdf...");
  const emptyPdf = await generateEmptyTextPdf();
  await fs.writeFile(path.join(fixturesDir, "empty-text.pdf"), emptyPdf);
  console.log(`   ✓ Created: ${emptyPdf.length} bytes\n`);

  console.log("✅ All fixtures generated successfully!");
  console.log("\nFixtures location: fixtures/pdf/");
  console.log("  - simple.pdf (1 page, ~700 bytes)");
  console.log("  - long.pdf (3 pages, ~1500 bytes)");
  console.log("  - empty-text.pdf (1 page, minimal text, ~600 bytes)");
}

main().catch((error) => {
  console.error("❌ Failed to generate fixtures:", error);
  process.exit(1);
});
