# Encrypted PDF Testing Guide

**Status**: Ready for Testing
**Created**: 2025-11-12
**Purpose**: Document encrypted PDF handling and password testing scenarios

---

## Overview

The PDF extraction pipeline supports password-protected PDFs through `pdfjs-dist`. This document describes how to test the three critical scenarios:

1. ✅ **Correct Password**: Extraction succeeds
2. ❌ **No Password**: Fails with `PASSWORD_REQUIRED`
3. ❌ **Wrong Password**: Fails with `PASSWORD_INVALID`

---

## Setup

### 1. Create Encrypted PDF Fixture

Follow instructions in [fixtures/pdf/HOWTO_ENCRYPT.md](../../fixtures/pdf/HOWTO_ENCRYPT.md):

```bash
cd fixtures/pdf
qpdf --encrypt test123 "" 40 -- simple.pdf encrypted.pdf
```

**If qpdf is not available**, use one of the alternative methods documented in the HOWTO file.

### 2. Verify Fixture Exists

```bash
ls -lh fixtures/pdf/encrypted.pdf
# Should show ~1 KB file
```

---

## Test Scenarios

### Scenario 1: Correct Password ✅

**Command**:

```bash
pnpm run pdf:run:encrypted
# or
pnpm tsx scripts/pdf-runner.ts encrypted --password=test123
```

**Expected Output**:

```
🔍 PDF Extractor Test Runner
════════════════════════════════════════════════════════════

📂 Fixture: encrypted.pdf
📍 Path: C:\...\fixtures\pdf\encrypted.pdf
🔑 Password: ******* (7 chars)

📖 Reading file...
   ✓ Loaded: 1.02 KB

⚙️  Extracting text with pdfjs...
   ✓ Success in 1.2s

📊 Extraction Results:
════════════════════════════════════════════════════════════

🔹 Basic Info:
   Pages:       1
   Text Length: 99 characters
   Engine:      pdfjs

🔹 Metadata:
   Title:        Simple Test PDF (or Protected Document)
   Author:       PDF Fixture Generator
   Producer:     TrustDoc Test Suite

🔹 Performance Stats:
   Total Time:      1.18s
   Avg Time/Page:   1.18s

🔹 Text Preview (first 200 chars):
────────────────────────────────────────────────────────────
   --- Page 1 --- Hello World - Simple Contract...
────────────────────────────────────────────────────────────

✅ Test completed successfully!
```

**Exit Code**: `0`

---

### Scenario 2: No Password ❌

**Command**:

```bash
pnpm run pdf:run:encrypted:nopass
# or
pnpm tsx scripts/pdf-runner.ts encrypted
```

**Expected Output**:

```
🔍 PDF Extractor Test Runner
════════════════════════════════════════════════════════════

📂 Fixture: encrypted.pdf
📍 Path: C:\...\fixtures\pdf\encrypted.pdf

📖 Reading file...
   ✓ Loaded: 1.02 KB

⚙️  Extracting text with pdfjs...
   ✗ Failed in 245ms

❌ Extraction Failed:
════════════════════════════════════════════════════════════

🔒 Password Required
   Ce PDF est protégé par mot de passe
   Code: PASSWORD_REQUIRED

🗨️  User-Facing Message:
   "Ce PDF est protégé par mot de passe"

════════════════════════════════════════════════════════════

⚠️  Test completed with errors
```

**Exit Code**: `1`

**Error Type**: `PdfPasswordRequiredError`
**Error Code**: `PASSWORD_REQUIRED`

---

### Scenario 3: Wrong Password ❌

**Command**:

```bash
pnpm run pdf:run:encrypted:wrong
# or
pnpm tsx scripts/pdf-runner.ts encrypted --password=wrongpass
```

**Expected Output**:

```
🔍 PDF Extractor Test Runner
════════════════════════════════════════════════════════════

📂 Fixture: encrypted.pdf
📍 Path: C:\...\fixtures\pdf\encrypted.pdf
🔑 Password: ********* (9 chars)

📖 Reading file...
   ✓ Loaded: 1.02 KB

⚙️  Extracting text with pdfjs...
   ✗ Failed in 312ms

❌ Extraction Failed:
════════════════════════════════════════════════════════════

🔑 Invalid Password
   Le mot de passe fourni est incorrect
   Code: PASSWORD_INVALID

🗨️  User-Facing Message:
   "Le mot de passe fourni est incorrect"

════════════════════════════════════════════════════════════

⚠️  Test completed with errors
```

**Exit Code**: `1`

**Error Type**: `PdfPasswordInvalidError`
**Error Code**: `PASSWORD_INVALID`

---

## Error Code Summary

| Scenario         | Error Class                | Error Code          | HTTP Status | User Message                           |
| ---------------- | -------------------------- | ------------------- | ----------- | -------------------------------------- |
| Correct Password | N/A                        | N/A                 | 200         | Success                                |
| No Password      | `PdfPasswordRequiredError` | `PASSWORD_REQUIRED` | 401         | "Ce PDF est protégé par mot de passe"  |
| Wrong Password   | `PdfPasswordInvalidError`  | `PASSWORD_INVALID`  | 401         | "Le mot de passe fourni est incorrect" |

---

## Testing Matrix

### Manual Testing

```bash
# 1. Generate encrypted PDF
cd fixtures/pdf
qpdf --encrypt test123 "" 40 -- simple.pdf encrypted.pdf

# 2. Test all scenarios
pnpm run pdf:run:encrypted           # ✅ Should succeed
pnpm run pdf:run:encrypted:nopass    # ❌ Should fail PASSWORD_REQUIRED
pnpm run pdf:run:encrypted:wrong     # ❌ Should fail PASSWORD_INVALID

# 3. Verify exit codes
echo $?  # 0 for success, 1 for failure
```

### Automated Testing Script

```bash
#!/bin/bash
# test-encrypted-pdfs.sh

set -e  # Exit on error

echo "Testing Encrypted PDF Handling..."

# Test 1: Correct password
echo "Test 1: Correct password"
pnpm run pdf:run:encrypted
if [ $? -eq 0 ]; then
  echo "✅ PASS: Correct password succeeded"
else
  echo "❌ FAIL: Correct password should succeed"
  exit 1
fi

# Test 2: No password (should fail)
echo "Test 2: No password"
pnpm run pdf:run:encrypted:nopass
if [ $? -eq 1 ]; then
  echo "✅ PASS: No password failed as expected"
else
  echo "❌ FAIL: No password should fail"
  exit 1
fi

# Test 3: Wrong password (should fail)
echo "Test 3: Wrong password"
pnpm run pdf:run:encrypted:wrong
if [ $? -eq 1 ]; then
  echo "✅ PASS: Wrong password failed as expected"
else
  echo "❌ FAIL: Wrong password should fail"
  exit 1
fi

echo "✅ All tests passed!"
```

---

## Implementation Details

### Password Flow in Code

```typescript
// src/pdf/extract/pdfjs.ts

export async function extractTextWithPdfJs(
  buffer: Buffer,
  options: PdfJsExtractionOptions = {}
): Promise<PdfJsExtractionResult> {
  // ...

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      password: options.password || undefined, // ← Password passed here
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    pdfDocument = await loadingTask.promise;
  } catch (error) {
    // Handle password errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("password")) {
        if (options.password) {
          throw new PdfPasswordInvalidError(); // ← Wrong password
        } else {
          throw new PdfPasswordRequiredError(); // ← No password
        }
      }
    }

    throw new PdfParseFailedError(undefined, error);
  }

  // ... continue with extraction
}
```

### Error Detection Logic

**pdfjs-dist throws errors with messages like:**

- `"No password provided"` → Map to `PASSWORD_REQUIRED`
- `"Incorrect password"` → Map to `PASSWORD_INVALID`
- `"Bad password"` → Map to `PASSWORD_INVALID`

**Our code detects these patterns**:

```typescript
if (errorMessage.includes("password")) {
  if (options.password) {
    // Password was provided but wrong
    throw new PdfPasswordInvalidError();
  } else {
    // No password provided
    throw new PdfPasswordRequiredError();
  }
}
```

---

## API Integration

### Using in API Routes

```typescript
// app/api/prepare/route.ts

export async function POST(request: NextRequest) {
  const { filePath, password } = await request.json();

  try {
    const buffer = await downloadFile(filePath);

    const result = await extractTextWithPdfJs(buffer, {
      password, // ← Password from client
      maxConcurrency: 4,
      pageTimeoutMs: 800,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof PdfPasswordRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          requiresPassword: true, // ← Signal to client
        },
        { status: 401 }
      );
    }

    if (error instanceof PdfPasswordInvalidError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 401 }
      );
    }

    throw error;
  }
}
```

### Client-Side Handling

```typescript
// Upload flow with password retry
async function uploadAndAnalyze(file: File, password?: string) {
  try {
    const response = await fetch("/api/prepare", {
      method: "POST",
      body: JSON.stringify({ filePath, password }),
    });

    if (!response.ok) {
      const error = await response.json();

      if (error.code === "PASSWORD_REQUIRED") {
        // Prompt user for password
        const userPassword = await promptForPassword();
        return uploadAndAnalyze(file, userPassword); // Retry with password
      }

      if (error.code === "PASSWORD_INVALID") {
        // Show error, allow retry
        showError("Mot de passe incorrect. Réessayez.");
        const userPassword = await promptForPassword();
        return uploadAndAnalyze(file, userPassword);
      }
    }

    return await response.json();
  } catch (error) {
    handleError(error);
  }
}
```

---

## Security Considerations

### Password Handling

✅ **DO:**

- Pass password in request body (HTTPS only)
- Clear password from memory after use
- Hash passwords in logs (never log plaintext)
- Use secure connection (TLS/SSL)

❌ **DON'T:**

- Pass password in URL query parameters
- Store password in cookies
- Log passwords in plaintext
- Cache decrypted content without encryption

### Test Fixtures

⚠️ **Warning**: Test fixtures use weak encryption (RC4-40)

- **Test password**: `test123` (public, intentionally weak)
- **DO NOT** use test fixtures for real documents
- **DO NOT** use weak encryption in production
- **Always** use AES-256 for production

---

## Troubleshooting

### Fixture Not Found

```
❌ Error: Fixture file not found: encrypted.pdf
```

**Solution**: Create the fixture using HOWTO_ENCRYPT.md instructions.

### pdfjs-dist Doesn't Detect Password

If pdfjs-dist fails to detect password requirement, the PDF may be using:

- Unsupported encryption algorithm
- Corrupted encryption metadata
- Owner password only (no user password)

**Solution**: Regenerate with qpdf using user password.

### Extraction Succeeds Without Password

The PDF may not be actually encrypted, or uses owner password only.

**Solution**: Verify encryption with:

```bash
qpdf --check encrypted.pdf
# Should output: "PDF is encrypted"
```

---

## References

- [pdfjs-dist Password Support](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#password-protected-pdfs)
- [PDF Encryption Specification](https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf) (Section 7.6)
- [qpdf Documentation](https://qpdf.readthedocs.io/en/stable/cli.html#password-protected-files)

---

## Summary Checklist

Before integration:

- [ ] Encrypted PDF fixture created (`encrypted.pdf`)
- [ ] Test with correct password succeeds (exit 0)
- [ ] Test without password fails with `PASSWORD_REQUIRED` (exit 1)
- [ ] Test with wrong password fails with `PASSWORD_INVALID` (exit 1)
- [ ] Error messages are user-friendly in French
- [ ] Exit codes are consistent (0 = success, 1 = error)
- [ ] Password is masked in logs (`*******`)
- [ ] Documentation updated

**Once all tests pass, the encrypted PDF handling is ready for production!** 🔐
