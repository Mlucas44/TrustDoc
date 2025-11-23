# PDF Dependency Audit - Dead Code Analysis

## Summary

**Current Status**: pdf-parse is **NOT** dead code - it's actively used in production.

**Finding**: Cannot safely remove pdf-parse dependency yet because it's used by the main `/api/prepare` route (production).

## Dependency Usage Map

### pdf-parse (v1.1.4)

**Status**: ✅ **ACTIVELY USED** in production

**Used by**:
1. `/api/parse` (v1 fallback route) → `parsePdfFromStorageWithTimeout`
2. `/api/prepare` (main production route) → `prepareTextFromStorage` → `parsePdfFromStorageWithTimeout`
3. `scripts/pdf-prepare-runner.ts` (test/demo script)

**Source files**:
- `src/services/pdf/parse-pdf.ts` - Main pdf-parse wrapper
- `src/services/pipeline/prepare-text.ts` - Uses parse-pdf for text extraction

### pdfjs-dist (v4.10.38)

**Status**: ✅ **ACTIVELY USED** in v2

**Used by**:
1. `/api/parse-v2` (new route with password support) → `extractTextWithPdfJs`

**Source files**:
- `src/pdf/extract/pdfjs.ts` - Main pdfjs-dist wrapper
- `src/pdf/extract/errors.ts` - Custom error types

## Routes Analysis

| Route | Parser | Status | Notes |
|-------|--------|--------|-------|
| `/api/parse` | pdf-parse | ⚠️ Fallback | Standalone parse endpoint (v1) |
| `/api/parse-v2` | pdfjs-dist | ✅ Active | New endpoint with password support |
| `/api/prepare` | pdf-parse | ✅ **PRODUCTION** | Main route used by UI |

## Migration Path

To safely remove pdf-parse, we need to:

### Phase 1: Migrate `/api/prepare` to pdfjs-dist

**Goal**: Make `/api/prepare` use pdfjs-dist instead of pdf-parse

**Steps**:
1. Update `src/services/pipeline/prepare-text.ts` to use `extractTextWithPdfJs` instead of `parsePdfFromStorageWithTimeout`
2. Test thoroughly with production PDFs
3. Deploy and monitor for issues

**Risk**: Medium - this is the main production route

### Phase 2: Deprecate `/api/parse` v1

**Goal**: Remove the old parse endpoint

**Steps**:
1. Add deprecation notice to `/api/parse`
2. Monitor usage (should be zero if only used internally)
3. Remove route after grace period

**Risk**: Low - only used as fallback

### Phase 3: Remove pdf-parse dependency

**Goal**: Uninstall pdf-parse package

**Steps**:
1. Remove `pdf-parse` from `package.json`
2. Delete `src/services/pdf/parse-pdf.ts`
3. Run `pnpm install` to update lock file

**Risk**: None - only after phases 1 & 2 complete

## Recommended Action

**DO NOT** remove pdf-parse now. Instead:

1. ✅ Keep both parsers for now
2. ✅ Keep `/api/parse` v1 as fallback
3. ⚠️ Plan migration of `/api/prepare` to pdfjs-dist
4. ⚠️ Test pdfjs-dist thoroughly in production scenarios
5. ⚠️ Only remove pdf-parse after successful migration

## Dead Code (Can Remove Safely)

None identified. All current dependencies are in active use.

## Unused Scripts

**Test/Demo scripts** (keep for development):
- `scripts/pdf-prepare-runner.ts` - Uses pdf-parse for testing
- `scripts/pdf-prepare-demo.ts` - Demo script for prepare-lite
- `scripts/test-parse-v2-api.ts` - Test script for v2 endpoint

**Recommendation**: Keep these scripts for development/testing purposes.

## Conclusion

**Status**: No dead code to remove at this time.

**Next Steps**:
1. Test pdfjs-dist thoroughly with production PDFs
2. Plan migration of `/api/prepare` to pdfjs-dist
3. Only remove pdf-parse AFTER successful migration

**Estimated Timeline**:
- Testing: 1-2 weeks
- Migration: 1 day
- Monitoring: 1 week
- Cleanup: 1 day

**Total**: ~3-4 weeks for safe migration
