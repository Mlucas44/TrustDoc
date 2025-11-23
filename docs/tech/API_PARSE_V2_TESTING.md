# Testing /api/parse-v2

**Status**: Ready for Testing
**Created**: 2025-11-12
**Purpose**: Guide for testing the new PDF.js-based parser API

---

## Overview

The `/api/parse-v2` endpoint exposes the new PDF.js extractor with support for:
- Password-protected PDFs
- Better error handling (specific error codes)
- Page-level concurrency control
- Configurable timeout per page
- Enhanced metadata extraction

---

## Prerequisites

### 1. Enable Feature Flag

Add to `.env.local`:
```bash
PDF_PARSE_V2=true
```

### 2. Enable Dev Mock (Optional - for local testing)

To test without uploading to Supabase, enable fixture mode:

```bash
DEV_USE_FIXTURE_STORAGE=true
```

This allows the API to read PDFs from `fixtures/pdf/` instead of Supabase storage.

### 3. Start Development Server

```bash
pnpm dev
```

Server will run on `http://localhost:3000`

---

## Testing with curl

### Test 1: Simple PDF (Success)

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/simple.pdf"}' \
  | jq
```

**Expected Response** (200 OK):
```json
{
  "pages": 1,
  "textLength": 99,
  "textRaw": "\n--- Page 1 ---\nHello World - Simple Contract...",
  "meta": {
    "title": "Simple Test PDF",
    "author": "PDF Fixture Generator",
    "producer": "TrustDoc Test Suite"
  },
  "engineUsed": "pdfjs",
  "stats": {
    "totalTimeMs": 450,
    "avgPageTimeMs": 450,
    "timedOutPages": []
  }
}
```

---

### Test 2: Multi-Page PDF (Success)

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/long.pdf"}' \
  | jq
```

**Expected Response** (200 OK):
```json
{
  "pages": 3,
  "textLength": 396,
  "engineUsed": "pdfjs",
  "stats": {
    "totalTimeMs": 700,
    "avgPageTimeMs": 233
  }
}
```

---

### Test 3: Empty Text PDF (422 Error)

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type": application/json" \
  -d '{"filePath":"user-test123/empty-text.pdf"}' \
  | jq
```

**Expected Response** (422 Unprocessable Entity):
```json
{
  "error": "PDF semble scanné ou sans texte extractible (17 caractères)",
  "code": "TEXT_EMPTY",
  "hint": "Ce PDF semble être une image scannée. Veuillez fournir un PDF avec du texte sélectionnable.",
  "engineUsed": "pdfjs",
  "textLength": 17
}
```

---

### Test 4: Encrypted PDF with Correct Password (Success)

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/encrypted.pdf","pdfPassword":"test123"}' \
  | jq
```

**Expected Response** (200 OK):
```json
{
  "pages": 1,
  "textLength": 99,
  "engineUsed": "pdfjs"
}
```

**Note**: You must first create `encrypted.pdf` using instructions in [fixtures/pdf/HOWTO_ENCRYPT.md](../../fixtures/pdf/HOWTO_ENCRYPT.md)

---

### Test 5: Encrypted PDF Without Password (401 Error)

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/encrypted.pdf"}' \
  | jq
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Ce PDF est protégé par mot de passe",
  "code": "PASSWORD_REQUIRED",
  "hint": "Ce PDF est protégé par mot de passe. Veuillez fournir le mot de passe dans le champ pdfPassword.",
  "engineUsed": "pdfjs",
  "requiresPassword": true
}
```

---

### Test 6: Encrypted PDF with Wrong Password (401 Error)

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/encrypted.pdf","pdfPassword":"wrongpass"}' \
  | jq
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Le mot de passe fourni est incorrect",
  "code": "PASSWORD_INVALID",
  "hint": "Le mot de passe fourni est incorrect. Veuillez vérifier et réessayer.",
  "engineUsed": "pdfjs"
}
```

---

### Test 7: Feature Flag Disabled (404 Error)

**Setup**: Set `PDF_PARSE_V2=false` in `.env.local`

**Request**:
```bash
curl -X POST http://localhost:3000/api/parse-v2 \
  -H "Content-Type: application/json" \
  -d '{"filePath":"user-test123/simple.pdf"}' \
  | jq
```

**Expected Response** (404 Not Found):
```json
{
  "error": "This endpoint is not available. Use /api/parse instead.",
  "code": "FEATURE_DISABLED"
}
```

---

## Standardized Error Response Format

Since the refactoring, all PDF extraction errors now follow a standardized format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "hint": "Actionable suggestion for the user (optional)",
  "engineUsed": "pdfjs",
  "additionalField": "Error-specific metadata (optional)"
}
```

**Fields**:
- `error` (string): Human-readable message describing what went wrong
- `code` (string): Machine-readable error code for programmatic handling
- `hint` (string, optional): Actionable suggestion in French for end users
- `engineUsed` (string, optional): PDF engine that encountered the error (`pdfjs` or `pdf-parse`)
- Additional fields: Error-specific metadata (e.g., `textLength`, `sizeBytes`, `pageNumber`)

---

## Error Codes Summary

| Status | Code | Scenario | Description | Hint Provided |
|--------|------|----------|-------------|---------------|
| 200 | - | Success | PDF extracted successfully | - |
| 400 | `INVALID_JSON` | Bad request body | Request body is not valid JSON | ❌ |
| 400 | `MISSING_FILE_PATH` | Missing filePath | filePath field is missing or not a string | ❌ |
| 400 | `INVALID_FILE_PATH_FORMAT` | Invalid path format | filePath doesn't match expected pattern | ❌ |
| 400 | `INVALID_PASSWORD_TYPE` | Invalid password type | pdfPassword is not a string | ❌ |
| 401 | `PASSWORD_REQUIRED` | Encrypted PDF, no password | PDF requires password but none provided | ✅ |
| 401 | `PASSWORD_INVALID` | Wrong password | PDF password is incorrect | ✅ |
| 404 | `FILE_NOT_FOUND` | File not in storage | PDF file doesn't exist in storage | ❌ |
| 404 | `FEATURE_DISABLED` | Feature flag off | PDF_PARSE_V2 is not set to "true" | ❌ |
| 413 | `PDF_TOO_LARGE` | File too large | PDF exceeds 10 MB limit | ✅ |
| 422 | `TEXT_EMPTY` | Scanned/empty PDF | PDF has less than 50 characters of text | ✅ |
| 422 | `TOO_MANY_PAGES` | Too many pages | PDF exceeds 500 page limit | ✅ |
| 500 | `PARSE_FAILED` | Parsing error | PDF is corrupted or invalid | ✅ |
| 500 | `DOWNLOAD_FAILED` | Storage error | Failed to download from storage | ❌ |
| 504 | `PAGE_TIMEOUT` | Page extraction timeout | A page took longer than configured timeout | ✅ |

---

## Testing Matrix

| Scenario | filePath | pdfPassword | Expected Status | Expected Code |
|----------|----------|-------------|-----------------|---------------|
| Simple PDF | `user-test123/simple.pdf` | - | 200 | - |
| Long PDF | `user-test123/long.pdf` | - | 200 | - |
| Empty text | `user-test123/empty-text.pdf` | - | 422 | `TEXT_EMPTY` |
| Encrypted (correct) | `user-test123/encrypted.pdf` | `test123` | 200 | - |
| Encrypted (no pass) | `user-test123/encrypted.pdf` | - | 401 | `PASSWORD_REQUIRED` |
| Encrypted (wrong) | `user-test123/encrypted.pdf` | `wrongpass` | 401 | `PASSWORD_INVALID` |
| Feature disabled | `user-test123/simple.pdf` | - | 404 | `FEATURE_DISABLED` |

---

## Testing Without Dev Mock

If you want to test with actual Supabase storage:

1. **Disable dev mock**:
   ```bash
   # Remove or set to false
   DEV_USE_FIXTURE_STORAGE=false
   ```

2. **Upload test PDF** to Supabase storage:
   - Use the upload UI at `/upload`
   - Note the returned `filePath` (e.g., `user-abc123/file-xyz.pdf`)

3. **Call API** with real filePath:
   ```bash
   curl -X POST http://localhost:3000/api/parse-v2 \
     -H "Content-Type: application/json" \
     -d '{"filePath":"user-abc123/file-xyz.pdf"}' \
     | jq
   ```

---

## Automated Testing

For automated testing, see [scripts/test-api-v2-curl.sh](../../scripts/test-api-v2-curl.sh):

```bash
# Test simple PDF
./scripts/test-api-v2-curl.sh simple

# Test encrypted PDF
./scripts/test-api-v2-curl.sh encrypted

# Test all scenarios
for scenario in simple long empty encrypted encrypted-nopass encrypted-wrong; do
  ./scripts/test-api-v2-curl.sh $scenario
done
```

---

## Configuration

### Environment Variables

**Feature Flag**:
- `PDF_PARSE_V2=true` - Enable /api/parse-v2 endpoint

**Dev Mode**:
- `DEV_USE_FIXTURE_STORAGE=true` - Read from fixtures instead of Supabase

**PDF Extraction**:
- `PDF_MAX_CONCURRENCY=4` - Pages to extract concurrently (1-8)
- `PDF_PAGE_TIMEOUT_MS=800` - Timeout per page in ms (200-3000)

See [PDF_CONFIG.md](./PDF_CONFIG.md) for full configuration guide.

---

## Comparing v1 vs v2

### /api/parse (v1 - pdf-parse)

**Pros**:
- Simple and stable
- No dependencies on external binaries

**Cons**:
- ❌ No password support
- ❌ Generic error messages
- ❌ Less metadata extraction

### /api/parse-v2 (v2 - pdf.js)

**Pros**:
- ✅ Password-protected PDF support
- ✅ Specific error codes (PASSWORD_REQUIRED, PASSWORD_INVALID, etc.)
- ✅ Better metadata extraction
- ✅ Configurable concurrency and timeouts
- ✅ Per-page timeout detection

**Cons**:
- Slightly larger bundle size
- More complex error handling

---

## Production Deployment

### Checklist

- [ ] Set `PDF_PARSE_V2=true` in production environment
- [ ] Ensure `DEV_USE_FIXTURE_STORAGE` is NOT set in production
- [ ] Configure `PDF_MAX_CONCURRENCY` based on server resources (default: 4)
- [ ] Configure `PDF_PAGE_TIMEOUT_MS` based on PDF complexity (default: 800)
- [ ] Test all error scenarios in staging
- [ ] Monitor error rates after deployment
- [ ] Keep /api/parse (v1) as fallback during gradual migration

### Migration Strategy

**Phase 1: Parallel deployment** (current)
- Both `/api/parse` and `/api/parse-v2` available
- Feature flag controls v2 availability
- No breaking changes

**Phase 2: Gradual migration**
- Direct new uploads to v2
- Monitor performance and error rates
- Keep v1 for fallback

**Phase 3: Full migration**
- Deprecate `/api/parse` (v1)
- Redirect all traffic to `/api/parse-v2`
- Remove pdf-parse dependency

---

## Troubleshooting

### Issue: 404 FEATURE_DISABLED

**Cause**: `PDF_PARSE_V2` is not set to `"true"`

**Solution**:
```bash
# In .env.local
PDF_PARSE_V2=true

# Restart dev server
pnpm dev
```

---

### Issue: 404 FILE_NOT_FOUND (Dev Mock)

**Cause**: Fixture doesn't exist in `fixtures/pdf/`

**Solution**:
```bash
# Check available fixtures
ls fixtures/pdf/

# Generate fixtures if missing
pnpm run pdf:fixtures

# For encrypted.pdf, follow HOWTO_ENCRYPT.md
```

---

### Issue: Server throws "server-only" error

**Cause**: Missing `server-only` package

**Solution**:
```bash
pnpm add server-only
```

---

## Summary

✅ **Ready for testing** - Start dev server and use curl commands above

✅ **Feature flag protected** - No impact on production until explicitly enabled

✅ **Dev mock available** - Test without Supabase storage

✅ **Comprehensive error codes** - Easy to debug and display to users

**Next Steps**:
1. Test all scenarios with curl
2. Verify error messages in French
3. Test with real Supabase storage
4. Monitor performance metrics
5. Plan gradual migration from v1 to v2
