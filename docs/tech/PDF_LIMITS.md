# PDF Processing Limits & Safety

## Overview

This document describes the safety limits and resource constraints for PDF processing in TrustDoc. These limits prevent memory exhaustion, timeout issues, and excessive resource consumption when handling large or complex PDFs.

**Last Updated**: 2025-11-14

---

## Hard Limits

### File Size Limit

**Maximum**: 10 MB (10,485,760 bytes)

**Configuration**: `maxSizeBytes` option in PDF extractor (default: 10 MB)

**Error**: `PdfFileTooLargeError` (HTTP 413 Payload Too Large)

**Rationale**:
- Prevents memory exhaustion in serverless environments
- Balances processing time vs. file size
- Most legal contracts are < 5 MB

**Environment Variable**: `UPLOAD_MAX_SIZE_MB` (default: 10)

```typescript
// Default configuration
maxSizeBytes: 10 * 1024 * 1024 // 10 MB
```

---

### Page Count Limit

**Maximum**: 500 pages

**Configuration**: `maxPages` option in PDF extractor (default: 500)

**Error**: `PdfTooManyPagesError` (HTTP 422 Unprocessable Entity)

**Rationale**:
- Large PDFs (300+ pages) can cause memory issues
- Average contract length: 10-50 pages
- Processing time scales linearly with page count

**Warning Threshold**: 300 pages (logs warning but continues)

```typescript
// Default configuration
maxPages: 500

// Warning logged for PDFs > 300 pages:
// "[pdfjs] Processing large PDF: 350 pages, size: 8.5MB (may consume significant memory and time)"
```

---

### Processing Timeout

**Per-Page Timeout**: 800 ms (configurable: 200-3000 ms)

**Configuration**: `pageTimeoutMs` option in PDF extractor

**Error**: `PdfPageTimeoutError` (page-level, non-fatal)

**Behavior**:
- Individual pages that timeout are marked as `[Page X - extraction timed out]`
- Extraction continues with remaining pages (graceful degradation)
- Timeout pages tracked in `stats.timedOutPages` array

**Environment Variable**: `PDF_PAGE_TIMEOUT_MS` (default: 800, range: 200-3000)

```typescript
// Default configuration (clamped to safe bounds)
pageTimeoutMs: clamp(envValue || 800, 200, 3000)
```

**Rationale**:
- Prevents single complex page from blocking entire extraction
- Average page extraction: 50-200 ms
- Timeout allows for 4-10x average processing time

---

### Concurrency Limit

**Maximum Concurrent Pages**: 8 (default: 4)

**Configuration**: `maxConcurrency` option in PDF extractor

**Environment Variable**: `PDF_MAX_CONCURRENCY` (default: 4, range: 1-8)

**Rationale**:
- Balances speed vs. memory consumption
- Lower values (1-2): Sequential processing, minimal memory
- Higher values (6-8): Faster processing, higher memory usage
- Default (4): Balanced approach for most PDFs

```typescript
// Default configuration (clamped to safe bounds)
maxConcurrency: clamp(envValue || 4, 1, 8)
```

**Memory Impact**:
```
Estimated memory per page batch: 2-4 MB
maxConcurrency=1: ~2-4 MB peak
maxConcurrency=4: ~8-16 MB peak (default)
maxConcurrency=8: ~16-32 MB peak
```

---

### Text Content Minimum

**Minimum Alphanumeric Characters**: 50

**Configuration**: `minTextLength` option in PDF extractor (default: 50)

**Error**: `PdfTextEmptyError` (HTTP 422 Unprocessable Entity)

**Rationale**:
- Detects scanned PDFs (no extractable text)
- Prevents processing of image-only documents
- Validates meaningful text content exists

---

## Soft Limits & Warnings

### Large PDF Warning

**Threshold**: 300 pages

**Behavior**: Logs warning but continues processing

**Log Message**:
```
[pdfjs] Processing large PDF: {numPages} pages, size: {sizeMB}MB (may consume significant memory and time)
```

**Recommendation**: Consider splitting PDFs > 300 pages into smaller documents

---

### Large Text Extraction Warning

**Threshold**: 5 MB extracted text

**Behavior**: Logs warning after successful extraction

**Log Message**:
```
[pdfjs] Large text extraction: {sizeMB}MB (may impact downstream processing)
```

**Impact**: Large text may cause:
- Increased LLM API costs
- Longer analysis times
- Database storage concerns

---

## Memory Tracking

### Memory Statistics

The PDF extractor tracks and logs memory usage:

```typescript
stats: {
  memory: {
    inputBufferBytes: number;      // Original PDF file size
    extractedTextBytes: number;    // UTF-8 encoded text size
    estimatedPeakBytes: number;    // Estimated peak memory usage
  }
}
```

**Calculation**:
```typescript
estimatedPeakBytes = inputBufferBytes + extractedTextBytes + (numPages * 1024)
```

**Example**:
```
Input: 5 MB PDF, 100 pages
Extracted text: 2 MB
Estimated peak: 5 MB + 2 MB + 100 KB = ~7.1 MB
```

### Memory Logging

**At Start**:
```
[pdfjs] Starting extraction: {numPages} pages, {inputMB}MB input, ~{estimatedMB}MB estimated memory
```

**At Completion**:
```
[pdfjs] Extraction complete: {numPages} pages, {extractedKB}KB text extracted, {totalMs}ms total
```

---

## Performance Characteristics

### Expected Processing Times

| PDF Size | Pages | Expected Time | Notes |
|----------|-------|---------------|-------|
| Small | 1-10 | 100-500 ms | Typical contracts |
| Medium | 11-50 | 500 ms - 2s | Multi-section documents |
| Large | 51-200 | 2-10s | Comprehensive agreements |
| Very Large | 201-500 | 10-30s | Edge cases, may timeout |

**Factors affecting speed**:
- Page complexity (tables, images, fonts)
- Text density
- PDF generation tool
- Server resources (CPU, memory)

### Memory Usage Estimates

| PDF Size | Pages | Input Size | Estimated Peak Memory |
|----------|-------|------------|---------------------|
| Small | 10 | 500 KB | ~2 MB |
| Medium | 50 | 2 MB | ~6 MB |
| Large | 200 | 8 MB | ~20 MB |
| Very Large | 500 | 10 MB | ~30 MB |

---

## Configuration Reference

### Environment Variables

```bash
# PDF Parsing Configuration
PDF_MAX_CONCURRENCY=4          # Concurrent page extraction (1-8, default: 4)
PDF_PAGE_TIMEOUT_MS=800        # Per-page timeout in ms (200-3000, default: 800)
UPLOAD_MAX_SIZE_MB=10          # Maximum file size in MB (default: 10)
```

### Runtime Options

```typescript
import { extractTextWithPdfJs } from "@/src/pdf/extract/pdfjs";

const result = await extractTextWithPdfJs(buffer, {
  password: "secret",           // Optional password for encrypted PDFs
  maxConcurrency: 4,            // Concurrent pages (1-8)
  pageTimeoutMs: 800,           // Timeout per page (200-3000 ms)
  maxSizeBytes: 10485760,       // Max file size (10 MB)
  maxPages: 500,                // Max page count
  minTextLength: 50,            // Min alphanumeric chars
});
```

---

## Error Handling

### Error Codes

| Error Code | HTTP Status | Description | Retry? |
|------------|-------------|-------------|--------|
| `FILE_TOO_LARGE` | 413 | File exceeds 10 MB | No - reduce file size |
| `TOO_MANY_PAGES` | 422 | PDF exceeds 500 pages | No - split document |
| `TEXT_EMPTY` | 422 | Scanned PDF, no text | No - use OCR service |
| `PAGE_TIMEOUT` | 200* | Page timeout (partial) | Yes - retry or increase timeout |
| `PARSE_FAILED` | 500 | General parse error | Yes - may be transient |

*Page timeouts are non-fatal - extraction continues with remaining pages

### Handling Large PDFs

**Client-side validation**:
```typescript
// Check file size before upload
if (file.size > 10 * 1024 * 1024) {
  alert("File too large. Maximum size: 10 MB");
  return;
}
```

**Server-side validation**:
```typescript
// Automatic in extractTextWithPdfJs()
try {
  const result = await extractTextWithPdfJs(buffer);
} catch (error) {
  if (error instanceof PdfTooManyPagesError) {
    return NextResponse.json(
      {
        error: `PDF has too many pages: ${error.pageCount} (max: ${error.maxPages})`,
        code: "TOO_MANY_PAGES",
      },
      { status: 422 }
    );
  }
}
```

---

## Production Recommendations

### 1. Monitor Memory Usage

Track `stats.memory.estimatedPeakBytes` in production logs to identify problematic PDFs:

```typescript
const result = await extractTextWithPdfJs(buffer);

if (result.stats.memory.estimatedPeakBytes > 20 * 1024 * 1024) {
  console.warn(`High memory usage: ${result.stats.memory.estimatedPeakBytes} bytes`);
}
```

### 2. Adjust Concurrency for Environment

**Serverless (Vercel, AWS Lambda)**:
- Use lower concurrency (2-4) to fit memory limits
- Monitor cold start times

**Dedicated Server**:
- Can use higher concurrency (6-8) if memory available
- Monitor CPU utilization

### 3. Handle Timeout Gracefully

```typescript
const result = await extractTextWithPdfJs(buffer);

if (result.stats.timedOutPages.length > 0) {
  console.warn(`Pages timed out: ${result.stats.timedOutPages.join(", ")}`);

  // Decide: accept partial results or reject?
  if (result.stats.timedOutPages.length > result.pages * 0.1) {
    // > 10% pages timed out - reject
    throw new Error("Too many page timeouts");
  }
  // Otherwise accept partial results
}
```

### 4. Set Appropriate Timeouts

**Development** (detailed extraction):
```bash
PDF_PAGE_TIMEOUT_MS=2000  # 2 seconds per page
```

**Production** (fail fast):
```bash
PDF_PAGE_TIMEOUT_MS=800   # 800 ms per page (default)
```

---

## Troubleshooting

### Issue: PDF exceeds page limit

**Symptom**: `PdfTooManyPagesError` thrown

**Solutions**:
1. Split PDF into smaller documents (< 500 pages each)
2. Extract only relevant sections
3. Contact support for enterprise limits (if applicable)

### Issue: Extraction timeout

**Symptom**: Many pages in `stats.timedOutPages`

**Solutions**:
1. Increase `PDF_PAGE_TIMEOUT_MS` (up to 3000 ms)
2. Reduce `PDF_MAX_CONCURRENCY` to lower memory pressure
3. Simplify PDF (remove embedded fonts, compress images)

### Issue: Memory exhaustion

**Symptom**: Server crashes or OOM errors

**Solutions**:
1. Reduce `PDF_MAX_CONCURRENCY` to 1-2
2. Increase server memory allocation
3. Implement PDF size pre-check before processing

### Issue: Slow processing

**Symptom**: Extraction takes > 30 seconds

**Solutions**:
1. Increase `PDF_MAX_CONCURRENCY` to 6-8 (if memory allows)
2. Check server CPU availability
3. Verify PDF isn't corrupted or overly complex

---

## Related Documentation

- [PDF Current State](./PDF_CURRENT_STATE.md) - Feature overview
- [PDF Configuration](./PDF_CONFIG.md) - Environment setup
- [PDF Encrypted Testing](./PDF_ENCRYPTED_TESTING.md) - Password-protected PDFs
- [PDF Runtime](./PDF_RUNTIME.md) - Deployment configuration
- [E2E Tests](../testing/PDF_E2E_TESTS.md) - Test coverage

---

## Changelog

### 2025-11-14
- Initial documentation
- Added `maxPages` limit (500 pages)
- Added memory tracking and logging
- Documented all hard/soft limits
