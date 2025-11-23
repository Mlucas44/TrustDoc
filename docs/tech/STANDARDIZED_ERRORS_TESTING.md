# Testing Standardized Error Responses

**Status**: Ready for Manual Testing
**Created**: 2025-11-14
**Purpose**: Validate standardized error mapping with `hint` and `engineUsed` fields

---

## Overview

The refactoring introduced centralized error mapping in [src/pdf/http-errors.ts](../../src/pdf/http-errors.ts) that ensures all PDF extraction errors now return:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "hint": "Actionable suggestion for the user",
  "engineUsed": "pdfjs",
  "additionalMetadata": "..."
}
```

This document provides manual test instructions to verify the implementation.

---

## Prerequisites

### 1. Start Development Server

```bash
pnpm dev
```

Server should be running at `http://localhost:3000`

### 2. Enable Dev Mock Storage

In `.env.local`:
```bash
DEV_USE_FIXTURE_STORAGE=true
PDF_PARSE_V2=true
```

This allows testing without Supabase storage.

### 3. Generate Test Fixtures

```bash
# Generate standard fixtures
pnpm tsx scripts/generate-pdf-fixtures.ts

# For encrypted PDF testing (optional)
# See fixtures/pdf/HOWTO_ENCRYPT.md
```

---

## Manual Test Cases

### Test 1: Empty Text PDF (422 TEXT_EMPTY)

**Purpose**: Verify scanned PDF detection includes `hint` and `engineUsed`

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/empty-text.pdf"}' \
  | jq
```

**Expected Response** (422):
```json
{
  "error": "PDF semble scanné ou sans texte extractible (17 caractères)",
  "code": "TEXT_EMPTY",
  "hint": "Ce PDF semble être une image scannée. Veuillez fournir un PDF avec du texte sélectionnable.",
  "engineUsed": "pdfjs",
  "textLength": 17
}
```

**Validation Checklist**:
- ✅ HTTP status is 422
- ✅ Response contains `error` field
- ✅ Response contains `code` = `TEXT_EMPTY`
- ✅ Response contains `hint` field (French message)
- ✅ Response contains `engineUsed` = `pdfjs`
- ✅ Response contains `textLength` field

---

### Test 2: Encrypted PDF - Password Required (401 PASSWORD_REQUIRED)

**Purpose**: Verify password-protected PDF error includes actionable hint

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/encrypted.pdf"}' \
  | jq
```

**Expected Response** (401):
```json
{
  "error": "Ce PDF est protégé par mot de passe",
  "code": "PASSWORD_REQUIRED",
  "hint": "Ce PDF est protégé par mot de passe. Veuillez fournir le mot de passe dans le champ pdfPassword.",
  "engineUsed": "pdfjs",
  "requiresPassword": true
}
```

**Validation Checklist**:
- ✅ HTTP status is 401
- ✅ Response contains `error` field
- ✅ Response contains `code` = `PASSWORD_REQUIRED`
- ✅ Response contains `hint` field (mentions `pdfPassword` field)
- ✅ Response contains `engineUsed` = `pdfjs`
- ✅ Response contains `requiresPassword` = `true`

**Note**: Requires `encrypted.pdf` in fixtures. See [fixtures/pdf/HOWTO_ENCRYPT.md](../../fixtures/pdf/HOWTO_ENCRYPT.md) for generation instructions.

---

### Test 3: Encrypted PDF - Invalid Password (401 PASSWORD_INVALID)

**Purpose**: Verify wrong password error includes helpful hint

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/encrypted.pdf","pdfPassword":"wrongpass"}' \
  | jq
```

**Expected Response** (401):
```json
{
  "error": "Le mot de passe fourni est incorrect",
  "code": "PASSWORD_INVALID",
  "hint": "Le mot de passe fourni est incorrect. Veuillez vérifier et réessayer.",
  "engineUsed": "pdfjs"
}
```

**Validation Checklist**:
- ✅ HTTP status is 401
- ✅ Response contains `error` field
- ✅ Response contains `code` = `PASSWORD_INVALID`
- ✅ Response contains `hint` field
- ✅ Response contains `engineUsed` = `pdfjs`

---

### Test 4: File Too Large (413 PDF_TOO_LARGE)

**Purpose**: Verify file size limit error includes size information

**Note**: This requires a PDF > 10 MB. You can create one with:
```bash
# Generate large PDF (not included in fixtures)
# Or test with real large file via Supabase storage
```

**Expected Response** (413):
```json
{
  "error": "PDF trop volumineux: 12.5 MB (max: 10 MB)",
  "code": "FILE_TOO_LARGE",
  "hint": "La taille maximale autorisée est de 10 MB.",
  "engineUsed": "pdfjs",
  "sizeBytes": 13107200,
  "maxSizeBytes": 10485760,
  "sizeMB": 12.5
}
```

---

### Test 5: Page Timeout (504 PAGE_TIMEOUT)

**Purpose**: Verify timeout error includes page number and hint

**Note**: Difficult to test without complex PDF. Can trigger with:
```bash
# In .env.local, set very low timeout:
PDF_PAGE_TIMEOUT_MS=10
```

**Expected Response** (504):
```json
{
  "error": "La page 5 a pris trop de temps (timeout: 10ms)",
  "code": "PAGE_TIMEOUT",
  "hint": "La page est trop complexe à extraire. Essayez de simplifier le PDF ou contactez le support.",
  "engineUsed": "pdfjs",
  "pageNumber": 5,
  "timeoutMs": 10
}
```

---

### Test 6: Parse Failed (500 PARSE_FAILED)

**Purpose**: Verify corrupted PDF error includes generic hint

**Note**: Requires corrupted PDF. Can create with:
```bash
echo "Not a valid PDF" > fixtures/pdf/corrupted.pdf
```

**Expected Response** (500):
```json
{
  "error": "Échec de l'extraction du PDF: format invalide",
  "code": "PARSE_FAILED",
  "hint": "Le PDF est peut-être corrompu ou dans un format non supporté. Essayez de le régénérer.",
  "engineUsed": "pdfjs"
}
```

---

## Automated Testing Script

A PowerShell script is available for automated testing:

```powershell
# Run all standardized error tests
.\scripts\test-standardized-errors.ps1
```

This script verifies:
1. Empty text PDF returns `hint` + `engineUsed`
2. Encrypted PDF (no password) returns `hint` + `engineUsed`
3. Encrypted PDF (wrong password) returns `hint` + `engineUsed`

---

## Success Criteria

All error responses should include:
- ✅ `error` (string): Human-readable message
- ✅ `code` (string): Machine-readable error code
- ✅ `hint` (string): Actionable suggestion in French
- ✅ `engineUsed` (string): `"pdfjs"` or `"pdf-parse"`
- ✅ Additional metadata (error-specific)

---

## Telemetry Verification

Check console logs for structured telemetry:

```json
{
  "prefix": "[pdf-parse-v2]",
  "event": "parse_failed",
  "errorCode": "TEXT_EMPTY",
  "engineUsed": "pdfjs",
  "totalMs": 450,
  "timestamp": "2025-11-14T20:00:00.000Z"
}
```

**Key Points**:
- Telemetry is logged for ALL errors (not just some)
- Telemetry includes `errorCode` and `engineUsed`
- Telemetry includes timing information

---

## Comparison: Before vs After

### Before (Repetitive Code)
```typescript
// Lines 200-357 in old /api/parse-v2/route.ts
if (error instanceof PdfPasswordRequiredError) {
  console.log(JSON.stringify({ /* telemetry */ }));
  return NextResponse.json({
    error: error.message,
    code: error.code,
    requiresPassword: true,
  }, { status: 401 });
}
// ... repeated for 6 more error types
```

**Issues**:
- ❌ No `hint` field
- ❌ No `engineUsed` field
- ❌ Duplicated telemetry logging (7 times!)
- ❌ 160 lines of repetitive code

### After (Centralized Mapping)
```typescript
// Line 201 in new /api/parse-v2/route.ts
return mapPdfErrorToResponse(error, startTime, "pdfjs");
```

**Benefits**:
- ✅ Includes `hint` field (actionable suggestions)
- ✅ Includes `engineUsed` field
- ✅ Centralized telemetry logging (DRY)
- ✅ Reduced to 1 line (182 lines removed!)

---

## Rollback Plan

If issues are discovered:

1. **Revert [src/pdf/http-errors.ts](../../src/pdf/http-errors.ts)** commits
2. **Revert [app/api/parse-v2/route.ts](../../app/api/parse-v2/route.ts)** refactoring
3. **Restore original error handling** (from git history)

---

## Next Steps

1. ✅ Run manual tests above
2. ✅ Verify all error scenarios include `hint` + `engineUsed`
3. ✅ Check telemetry logs in console
4. ✅ Test with real Supabase storage (not just fixtures)
5. ✅ Monitor error rates in production after deployment

---

## Related Documentation

- [API_PARSE_V2_TESTING.md](./API_PARSE_V2_TESTING.md) - Full API testing guide
- [src/pdf/http-errors.ts](../../src/pdf/http-errors.ts) - Centralized error mapper implementation
- [src/pdf/extract/errors.ts](../../src/pdf/extract/errors.ts) - PDF error class definitions

---

**Ready for manual testing!** 🧪

Start the dev server and run the curl commands above to verify standardized error responses.
