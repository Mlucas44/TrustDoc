# PDF Parse V2 E2E Tests

## Overview

End-to-end tests for the PDF Parse V2 API and password dialog UX using Playwright.

**Test File**: `tests/pdf-parse-v2.spec.ts`

**Coverage**:
- API route validation (status codes, error codes)
- Password protection flows (encrypted PDFs)
- UI password dialog interactions
- Telemetry verification

## Prerequisites

### Required Environment Variables

```bash
# Enable PDF Parse V2 feature
PDF_PARSE_V2=true

# Enable fixture storage for testing (optional, for full test coverage)
DEV_USE_FIXTURE_STORAGE=true
```

### PDF Fixtures

Tests use PDF fixtures from `fixtures/pdf/`:
- `simple.pdf` - Basic single-page PDF
- `long.pdf` - Multi-page PDF
- `empty-text.pdf` - Scanned PDF with no extractable text
- `encrypted.pdf` - Password-protected PDF (requires generation)

**Note**: Most tests are configured to skip gracefully if fixtures are not available.

## Test Suites

### 1. PDF Parse V2 API Routes

Tests direct HTTP calls to `/api/parse-v2` endpoint.

| Test | Status Code | Error Code | Description |
|------|-------------|------------|-------------|
| Feature flag disabled | 404 / 200* | N/A | Verifies endpoint availability |
| Missing filePath | 400 | `MISSING_FILE_PATH` | Missing request body field |
| Invalid filePath format | 400 | `INVALID_FILE_PATH_FORMAT` | Invalid path pattern |
| Non-existent file | 404 | `FILE_NOT_FOUND` | File doesn't exist in storage |
| Successful parse (simple PDF) | 200 | N/A | Extracts text from simple.pdf |
| Empty-text PDF | 422 | `TEXT_EMPTY` | Scanned PDF with no text |
| Multi-page PDF | 200 | N/A | Handles long.pdf with page markers |

*Depends on feature flag configuration

**Status**: ✅ All passing (4 tests run, 3 skipped without fixtures)

### 2. PDF Parse V2 - Password Protection (API)

Tests password-protected PDF handling via API.

| Test | Status Code | Error Code | Description |
|------|-------------|------------|-------------|
| No password provided | 401 | `PASSWORD_REQUIRED` | Encrypted PDF, no password |
| Invalid password | 401 | `PASSWORD_INVALID` | Wrong password provided |
| Correct password | 200 | N/A | Successfully extracts with password |

**Status**: ⏩ All skipped (requires encrypted fixture generation)

**To enable**: Run `pnpm tsx scripts/generate-encrypted-pdf.ts` and set `HAS_ENCRYPTED_FIXTURE=true`

### 3. PDF Password Dialog UX

Tests browser-based password dialog interactions.

| Test | Description | Prerequisites |
|------|-------------|---------------|
| Show password dialog | Verifies dialog appears on encrypted upload | Encrypted fixture + auth |
| Show error for invalid password | Tests wrong password feedback | Encrypted fixture + auth |
| Successful upload with password | Complete flow: upload → password → success | Encrypted fixture + auth |
| Cancel password dialog | Tests dialog dismissal | Encrypted fixture + auth |

**Status**: ⏩ All skipped (requires encrypted fixture + authentication setup)

**Authentication Note**: Dashboard page requires user authentication. Tests need mock auth or test user setup.

### 4. PDF Parse V2 - Telemetry Verification

Tests structured JSON telemetry logging.

| Test | Description | Log Format |
|------|-------------|------------|
| Success telemetry | Verifies `parse_success` event logged | `{"prefix":"[pdf-parse-v2]","event":"parse_success",...}` |
| Password error telemetry | Verifies `parse_failed` event for password errors | `{"prefix":"[pdf-parse-v2]","event":"parse_failed","errorCode":"PASSWORD_REQUIRED",...}` |

**Status**: ⏩ Skipped (requires fixtures and log aggregation for automated verification)

**Manual Verification**: Check dev server logs during test runs for JSON telemetry output.

## Running Tests

### Run All E2E Tests

```bash
# Run all tests (includes pdf-parse-v2.spec.ts)
pnpm test:e2e

# Run only PDF Parse V2 tests
pnpm test:e2e tests/pdf-parse-v2.spec.ts

# Run in UI mode (interactive)
pnpm test:e2e:ui tests/pdf-parse-v2.spec.ts
```

### Run with Fixtures

```bash
# Set environment variables
export PDF_PARSE_V2=true
export DEV_USE_FIXTURE_STORAGE=true

# Run tests
pnpm test:e2e tests/pdf-parse-v2.spec.ts
```

### View Test Report

```bash
pnpm exec playwright show-report
```

## Test Results

### Current Status (Without Fixtures)

```
✅ 4 passed
⏩ 12 skipped (fixtures not available)
❌ 0 failed
```

**Passing Tests**:
1. ✅ Feature flag check
2. ✅ Missing filePath validation
3. ✅ Invalid filePath format validation
4. ✅ Non-existent file handling

**Skipped Tests** (require `DEV_USE_FIXTURE_STORAGE=true` or `HAS_ENCRYPTED_FIXTURE=true`):
- Simple PDF parsing
- Empty-text PDF detection
- Multi-page PDF handling
- Password protection flows (3 tests)
- UI password dialog tests (4 tests)
- Telemetry verification (2 tests)

### Expected Status (With Fixtures)

```
✅ 12 passed (7 API + 5 telemetry)
⏩ 4 skipped (UI tests, require auth)
❌ 0 failed
```

## Fixture Setup

### Option 1: Use Fixture Storage Mode (Recommended for Tests)

```bash
# 1. Enable fixture storage in .env.local
DEV_USE_FIXTURE_STORAGE=true

# 2. Fixtures are automatically loaded from fixtures/pdf/
# No upload needed - files are read directly from filesystem
```

### Option 2: Upload to Supabase Storage

```bash
# Upload fixtures to Supabase (if fixture storage not available)
# Use path pattern: user-test123/{filename}

# Example using Supabase CLI:
supabase storage cp fixtures/pdf/simple.pdf contracts-temp/user-test123/simple.pdf
supabase storage cp fixtures/pdf/empty-text.pdf contracts-temp/user-test123/empty-text.pdf
supabase storage cp fixtures/pdf/long.pdf contracts-temp/user-test123/long.pdf
```

### Generate Encrypted Fixture

```bash
# Generate password-protected PDF
pnpm tsx scripts/generate-encrypted-pdf.ts

# Output: fixtures/pdf/encrypted.pdf (password: "test-password")

# Enable encrypted tests
export HAS_ENCRYPTED_FIXTURE=true

# Run password tests
pnpm test:e2e tests/pdf-parse-v2.spec.ts
```

## Authentication Setup for UI Tests

UI tests require authentication to access `/dashboard`. Two options:

### Option 1: Mock Authentication (Recommended for Tests)

Create a Playwright auth helper:

```typescript
// tests/helpers/auth.ts
import { Page } from "@playwright/test";

export async function mockAuth(page: Page) {
  // Set auth cookies or local storage
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: "mock-session-token",
      domain: "localhost",
      path: "/",
    },
  ]);
}
```

Update tests to use mock auth:

```typescript
test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await page.goto("/dashboard");
});
```

### Option 2: Test User Setup

Create a test user in the database with known credentials:

```typescript
test.beforeEach(async ({ page }) => {
  // Sign in with test user
  await page.goto("/auth/signin");
  await page.fill('input[type="email"]', "test@example.com");
  await page.click('button[type="submit"]');
  // Wait for magic link or use OAuth
});
```

## Troubleshooting

### Tests Fail with 404 Errors

**Cause**: Fixtures not available in Supabase Storage or fixture storage mode not enabled.

**Solution**: Enable `DEV_USE_FIXTURE_STORAGE=true` in `.env.local` to use local fixtures.

### Tests Fail with "Unauthorized" Errors

**Cause**: UI tests require authentication to access dashboard.

**Solution**: Set up mock authentication (see "Authentication Setup" section above).

### Tests Skip with "Fixture storage not enabled"

**Expected Behavior**: Tests gracefully skip when fixtures aren't available.

**To Enable**: Set `DEV_USE_FIXTURE_STORAGE=true` and ensure fixtures exist in `fixtures/pdf/`.

### Tests Skip with "Encrypted PDF fixture not available"

**Cause**: No encrypted PDF fixture generated.

**Solution**:
1. Run `pnpm tsx scripts/generate-encrypted-pdf.ts`
2. Set `HAS_ENCRYPTED_FIXTURE=true` environment variable
3. Re-run tests

### Telemetry Tests Don't Verify Logs

**Expected**: Telemetry tests verify API responses, not log output.

**Manual Verification**: Check dev server console during test runs for JSON logs with `"prefix":"[pdf-parse-v2]"`.

**Future Enhancement**: Integrate with log aggregation service for automated log verification.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Setup environment
        run: |
          echo "PDF_PARSE_V2=true" >> .env.local
          echo "DEV_USE_FIXTURE_STORAGE=true" >> .env.local

      - name: Generate encrypted fixture
        run: pnpm tsx scripts/generate-encrypted-pdf.ts

      - name: Run E2E tests
        env:
          HAS_ENCRYPTED_FIXTURE: true
        run: pnpm test:e2e tests/pdf-parse-v2.spec.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Coverage Summary

| Category | Total Tests | Passing | Skipped | Notes |
|----------|-------------|---------|---------|-------|
| API Routes | 7 | 4 | 3 | Requires fixture storage |
| Password Protection (API) | 3 | 0 | 3 | Requires encrypted fixture |
| UI Password Dialog | 4 | 0 | 4 | Requires auth + encrypted fixture |
| Telemetry | 2 | 0 | 2 | Requires fixtures |
| **Total** | **16** | **4** | **12** | **Without fixtures** |

**With Full Setup**: 12 passing, 4 skipped (UI tests require auth)

## Future Enhancements

- [ ] Add mock authentication for UI tests
- [ ] Automate encrypted fixture generation in CI
- [ ] Integrate with log aggregation for telemetry verification
- [ ] Add visual regression tests for password dialog UI
- [ ] Test rate limiting behavior
- [ ] Test quota/credit consumption
- [ ] Add performance benchmarks (parse time < Xms)
- [ ] Test concurrent uploads
- [ ] Test file size limits (10 MB)
- [ ] Add accessibility tests (a11y)

## Related Documentation

- [PDF Parse V2 API](../../docs/tech/PDF_CURRENT_STATE.md)
- [PDF Telemetry](../../docs/tech/PDF_TELEMETRY.md)
- [PDF Testing Guide](../../docs/tech/API_PARSE_V2_TESTING.md)
- [Unit Tests](../../docs/testing/PDF_TESTS.md)
- [Encrypted PDF Testing](../../docs/tech/PDF_ENCRYPTED_TESTING.md)
