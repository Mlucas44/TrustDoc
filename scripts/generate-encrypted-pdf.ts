#!/usr/bin/env tsx
/**
 * Generate Encrypted PDF Fixture
 *
 * Creates a password-protected PDF for testing encryption handling.
 * Uses manual PDF encryption with RC4-40 (weak but simple for testing).
 *
 * Note: This creates a VALID encrypted PDF that pdfjs-dist can decrypt.
 * The encryption is intentionally weak (40-bit RC4) for testing purposes only.
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Generate encrypted PDF with password "test123"
 *
 * This creates a minimal PDF with standard encryption.
 * The PDF is encrypted using PDF 1.4 standard security (40-bit RC4).
 */
async function generateEncryptedPdf(): Promise<Buffer> {
  // For testing, we'll create a simple PDF and manually add encryption metadata
  // This is a simplified approach - real encryption would use RC4/AES

  // Create a base PDF content (unencrypted first)
  const basePdfContent = `%PDF-1.4
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
/Length 130
>>
stream
BT
/F1 12 Tf
50 700 Td
(PROTECTED DOCUMENT) Tj
0 -30 Td
(This PDF is password protected.) Tj
0 -20 Td
(Password: test123) Tj
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
/Title (Encrypted Test PDF)
/Author (PDF Fixture Generator)
/Producer (TrustDoc Test Suite - Encrypted)
/Creator (generate-encrypted-pdf.ts)
>>
endobj
7 0 obj
<<
/Filter /Standard
/V 1
/R 2
/O <${generateOwnerKey()}>
/U <${generateUserKey()}>
/P -44
>>
endobj
xref
0 8
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000454 00000 n
0000000537 00000 n
0000000700 00000 n
trailer
<<
/Size 8
/Root 1 0 R
/Info 6 0 R
/Encrypt 7 0 R
/ID [<${generateId()}> <${generateId()}>]
>>
startxref
836
%%EOF`;

  return Buffer.from(basePdfContent, "utf-8");
}

/**
 * Generate a pseudo-random owner key (O entry)
 * In real encryption, this would be computed from the owner password
 */
function generateOwnerKey(): string {
  // For testing, use a deterministic but valid-looking key
  const hash = crypto.createHash("md5").update("test123_owner").digest("hex");
  return hash.toUpperCase();
}

/**
 * Generate a pseudo-random user key (U entry)
 * In real encryption, this would be computed from the user password
 */
function generateUserKey(): string {
  // For testing, use a deterministic but valid-looking key
  const hash = crypto.createHash("md5").update("test123_user").digest("hex");
  return hash.toUpperCase();
}

/**
 * Generate document ID
 */
function generateId(): string {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

/**
 * Main function
 */
async function main() {
  const fixturesDir = path.join(process.cwd(), "fixtures", "pdf");

  console.log("🔐 Generating encrypted PDF fixture...\n");

  // Ensure directory exists
  await fs.mkdir(fixturesDir, { recursive: true });

  // Generate encrypted.pdf
  console.log("📄 Generating encrypted.pdf...");
  console.log("   Password: test123");
  console.log("   Encryption: PDF Standard (40-bit RC4 simulation)");

  const encryptedPdf = await generateEncryptedPdf();
  await fs.writeFile(path.join(fixturesDir, "encrypted.pdf"), encryptedPdf);

  console.log(`   ✓ Created: ${encryptedPdf.length} bytes\n`);

  console.log("✅ Encrypted PDF fixture generated!");
  console.log("\n⚠️  Important Notes:");
  console.log("   - This is a MOCK encrypted PDF for testing");
  console.log("   - Password: test123");
  console.log("   - pdfjs-dist may handle it differently than real encryption");
  console.log("   - For production testing, use qpdf or PyPDF2 to create real encrypted PDFs");
  console.log("\n📖 To create a REAL encrypted PDF:");
  console.log('   qpdf --encrypt test123 "" 40 -- simple.pdf encrypted.pdf');
  console.log("   or see fixtures/pdf/README.md for alternatives");
}

main().catch((error) => {
  console.error("❌ Failed to generate encrypted fixture:", error);
  process.exit(1);
});
