# PDF Extractor Configuration

**Status**: Ready for Production
**Created**: 2025-11-12
**Last Updated**: 2025-11-13 (Flag flip: V2 default)
**Purpose**: Document environment-based configuration for PDF extraction without recompilation

---

## Overview

The PDF extraction module supports runtime configuration via environment variables. This allows tuning performance parameters and parser version selection without code changes or recompilation.

### PDF Parser Version Selection

**As of 2025-11-13**: PDF.js (V2) is now the default parser for all PDF extraction.

| Parser | Environment Variable | Default | Description |
|--------|---------------------|---------|-------------|
| **V2 (pdfjs-dist)** | `PDF_PARSE_V2` | `true` | PDF.js parser with password support (RECOMMENDED) |
| **V1 (pdf-parse)** | `PDF_PARSE_V1_LEGACY` | `false` | Legacy parser (DEPRECATED, no password support) |

**Migration Notes**:
- V2 is **enabled by default** (`PDF_PARSE_V2=true`)
- V1 requires **explicit opt-in** (`PDF_PARSE_V1_LEGACY=true`) for emergency rollback
- V1 will be removed in a future release
- V1 does NOT support password-protected PDFs

**Endpoints**:
- `/api/parse-v2` - Always available (V2 parser)
- `/api/parse` - Only available if `PDF_PARSE_V1_LEGACY=true` (returns 410 Gone otherwise)

### Performance Configuration Parameters

| Parameter | Environment Variable | Default | Safe Bounds | Description |
|-----------|---------------------|---------|-------------|-------------|
| **Concurrency** | `PDF_MAX_CONCURRENCY` | `4` | `1-8` | Number of pages to extract concurrently (V2 only) |
| **Page Timeout** | `PDF_PAGE_TIMEOUT_MS` | `800` | `200-3000` | Timeout per page in milliseconds (V2 only) |
| **Fixture Storage** | `DEV_USE_FIXTURE_STORAGE` | `false` | `true/false` | Use local fixtures instead of Supabase (dev only) |

### Key Features

✅ **No Recompilation**: Change values via environment variables
✅ **Safe Bounds**: Automatic clamping prevents invalid values
✅ **Validation**: Invalid values fall back to defaults
✅ **Logging**: Effective configuration logged at runtime

---

## Environment Variables

### Parser Version Selection

#### `PDF_PARSE_V2`

**Purpose**: Enable PDF.js (V2) parser (default).

**Default**: `true` (V2 enabled by default)

**Values**: `true` | `false`

**Recommended**: Leave as `true` for all deployments

**Examples**:
```bash
# Production (default - V2 enabled)
PDF_PARSE_V2=true

# Emergency rollback to V1 (not recommended)
# Must also set PDF_PARSE_V1_LEGACY=true
PDF_PARSE_V2=false
```

**When to disable**:
- ❌ Never disable in production
- ⚠️ Only disable if critical V2 bug discovered and V1 rollback needed

---

#### `PDF_PARSE_V1_LEGACY`

**Purpose**: Enable legacy pdf-parse (V1) parser for emergency rollback.

**Default**: `false` (V1 disabled, V2 is default)

**Values**: `true` | `false`

**Deprecated**: V1 will be removed in a future release

**Limitations**:
- ❌ Does NOT support password-protected PDFs
- ❌ Less robust error handling
- ❌ No telemetry logging
- ⚠️ Only use for emergency rollback

**Examples**:
```bash
# Emergency rollback to V1
PDF_PARSE_V1_LEGACY=true

# Default (V1 disabled, /api/parse returns 410 Gone)
PDF_PARSE_V1_LEGACY=false
```

**Endpoint Behavior**:
- When `PDF_PARSE_V1_LEGACY=false` (default):
  - `/api/parse` returns `410 Gone` with message: "This endpoint (V1) is deprecated. Use /api/parse-v2 instead..."
- When `PDF_PARSE_V1_LEGACY=true`:
  - `/api/parse` works normally with pdf-parse v1
  - `/api/parse-v2` always available regardless of this flag

---

#### `DEV_USE_FIXTURE_STORAGE`

**Purpose**: Use local PDF fixtures from `fixtures/pdf/` instead of Supabase Storage.

**Default**: `false` (use Supabase Storage)

**Values**: `true` | `false`

**Use Cases**:
- ✅ Local development without Supabase setup
- ✅ E2E testing with known PDF fixtures
- ❌ Never use in production!

**Examples**:
```bash
# Development: Use local fixtures
DEV_USE_FIXTURE_STORAGE=true

# Production: Use Supabase Storage (default)
DEV_USE_FIXTURE_STORAGE=false
```

**How it works**:
- When `true`: API reads PDFs from `fixtures/pdf/{filename}`
- Ignores Supabase credentials entirely
- Useful for testing `/api/parse-v2` without storage setup

---

### Performance Tuning (V2 Only)

#### `PDF_MAX_CONCURRENCY`

**Purpose**: Control how many PDF pages are extracted simultaneously.

**Default**: `4`

**Range**: `1-8` (values outside this range are clamped)

**Use Cases**:
- **Low Memory**: Set to `1-2` to reduce memory usage
- **Fast Server**: Set to `6-8` for high-performance environments
- **Debugging**: Set to `1` to extract pages sequentially

**Examples**:
```bash
# Low memory (sequential extraction)
export PDF_MAX_CONCURRENCY=1

# Default (balanced)
export PDF_MAX_CONCURRENCY=4

# High performance (max concurrency)
export PDF_MAX_CONCURRENCY=8
```

**Behavior**:
- Values `< 1` → clamped to `1`
- Values `> 8` → clamped to `8`
- Invalid values (NaN) → defaults to `4`
- Not set → defaults to `4`

---

#### `PDF_PAGE_TIMEOUT_MS`

**Purpose**: Set maximum time (milliseconds) to extract a single page before timeout (V2 only).

**Default**: `800` (0.8 seconds)

**Range**: `200-3000` (values outside this range are clamped)

**Use Cases**:
- **Fast PDFs**: Set to `200-500ms` for simple documents
- **Complex PDFs**: Set to `1500-3000ms` for documents with heavy formatting
- **Debugging**: Set higher to prevent timeouts during inspection

**Examples**:
```bash
# Fast extraction (simple PDFs)
export PDF_PAGE_TIMEOUT_MS=500

# Default (balanced)
export PDF_PAGE_TIMEOUT_MS=800

# Patient extraction (complex PDFs)
export PDF_PAGE_TIMEOUT_MS=3000
```

**Behavior**:
- Values `< 200` → clamped to `200`
- Values `> 3000` → clamped to `3000`
- Invalid values (NaN) → defaults to `800`
- Not set → defaults to `800`

---

## Configuration Examples

### Production Environment (.env.production)

```bash
# Production: V2 enabled (default)
PDF_PARSE_V2=true
PDF_PARSE_V1_LEGACY=false

# Balanced performance (V2)
PDF_MAX_CONCURRENCY=4
PDF_PAGE_TIMEOUT_MS=800
```

### Development Environment (.env.local)

```bash
# Development: V2 enabled + fixture storage
PDF_PARSE_V2=true
DEV_USE_FIXTURE_STORAGE=true

# Patient settings for debugging
PDF_MAX_CONCURRENCY=2
PDF_PAGE_TIMEOUT_MS=2000
```

### High-Performance Server (.env.production)

```bash
# High-end server with 16+ cores and 32+ GB RAM
PDF_MAX_CONCURRENCY=8
PDF_PAGE_TIMEOUT_MS=500
```

### Low-Memory Server (.env.production)

```bash
# Constrained environment (e.g., Docker with 512 MB limit)
PDF_MAX_CONCURRENCY=1
PDF_PAGE_TIMEOUT_MS=1200
```

---

## Testing Configuration

### Test with Custom Values

```bash
# Test with high timeout
PDF_PAGE_TIMEOUT_MS=3000 pnpm run pdf:run:long

# Test with low concurrency
PDF_MAX_CONCURRENCY=1 pnpm run pdf:run:long

# Test with both
PDF_MAX_CONCURRENCY=2 PDF_PAGE_TIMEOUT_MS=1500 pnpm run pdf:run:simple
```

### Verify Effective Configuration

The extractor logs the effective configuration at runtime:

```
[pdfjs] Extraction config: concurrency=4, timeout=800ms, maxSize=10MB
```

**Example with custom values**:
```bash
$ PDF_MAX_CONCURRENCY=2 PDF_PAGE_TIMEOUT_MS=1500 pnpm run pdf:run:simple

[pdfjs] Extraction config: concurrency=2, timeout=1500ms, maxSize=10MB
```

---

## Implementation Details

### Code Structure

**Location**: `src/pdf/extract/pdfjs.ts`

**Key Functions**:

1. **`clamp(value, min, max)`**: Ensures values stay within safe bounds
2. **`getConfigFromEnv()`**: Reads and validates environment variables
3. **`DEFAULT_OPTIONS`**: Uses environment-based defaults

### Environment Variable Reading

```typescript
function getConfigFromEnv(): {
  maxConcurrency: number;
  pageTimeoutMs: number;
} {
  // Read from environment with fallback to defaults
  const concurrencyEnv = process.env.PDF_MAX_CONCURRENCY;
  const timeoutEnv = process.env.PDF_PAGE_TIMEOUT_MS;

  // Parse values (default to 4 and 800 if not set or invalid)
  const concurrencyRaw = concurrencyEnv ? parseInt(concurrencyEnv, 10) : 4;
  const timeoutRaw = timeoutEnv ? parseInt(timeoutEnv, 10) : 800;

  // Apply safe bounds
  const maxConcurrency = clamp(isNaN(concurrencyRaw) ? 4 : concurrencyRaw, 1, 8);
  const pageTimeoutMs = clamp(isNaN(timeoutRaw) ? 800 : timeoutRaw, 200, 3000);

  return {
    maxConcurrency,
    pageTimeoutMs,
  };
}

// Read configuration from environment at module load time
const envConfig = getConfigFromEnv();
```

### Validation Logic

**Concurrency Validation**:
```typescript
// 1 <= concurrency <= 8
const maxConcurrency = clamp(concurrencyRaw, 1, 8);
```

**Timeout Validation**:
```typescript
// 200ms <= timeout <= 3000ms
const pageTimeoutMs = clamp(timeoutRaw, 200, 3000);
```

---

## Performance Tuning Guide

### When to Increase Concurrency

✅ **Increase `PDF_MAX_CONCURRENCY` (5-8) when:**
- Server has 4+ CPU cores
- RAM is abundant (8+ GB available)
- PDFs have many pages (10+ pages)
- Network I/O is not a bottleneck

❌ **Don't increase if:**
- Memory is limited (< 2 GB)
- CPU has only 1-2 cores
- PDFs are mostly 1-3 pages

### When to Increase Timeout

✅ **Increase `PDF_PAGE_TIMEOUT_MS` (1000-3000) when:**
- PDFs have complex formatting
- Pages contain many embedded fonts
- Pages have large images or vector graphics
- Extraction is timing out frequently

❌ **Don't increase if:**
- PDFs are simple text documents
- Fast response time is critical
- You want to fail fast on problematic pages

### When to Decrease Concurrency

✅ **Decrease `PDF_MAX_CONCURRENCY` (1-2) when:**
- Memory is constrained
- CPU usage is too high
- Out-of-memory errors occur
- Debugging extraction issues

### When to Decrease Timeout

✅ **Decrease `PDF_PAGE_TIMEOUT_MS` (200-500) when:**
- PDFs are simple and fast
- You want quick failure on slow pages
- Response time is critical

---

## Real-World Examples

### Example 1: Simple Contracts (1-5 pages)

**Scenario**: Small business contracts with plain text

```bash
# Fast extraction, low concurrency
PDF_MAX_CONCURRENCY=2
PDF_PAGE_TIMEOUT_MS=500
```

**Expected Performance**:
- 1-page PDF: ~100-200ms
- 5-page PDF: ~300-500ms

---

### Example 2: Complex Legal Documents (50+ pages)

**Scenario**: Dense legal documents with formatting, tables, annotations

```bash
# High concurrency, patient timeout
PDF_MAX_CONCURRENCY=6
PDF_PAGE_TIMEOUT_MS=1500
```

**Expected Performance**:
- 50-page PDF: ~5-10 seconds
- 100-page PDF: ~10-20 seconds

---

### Example 3: Scanned PDFs (Will Fail TEXT_EMPTY)

**Scenario**: Scanned documents with minimal extractable text

```bash
# Low concurrency (will fail fast anyway)
PDF_MAX_CONCURRENCY=2
PDF_PAGE_TIMEOUT_MS=800
```

**Expected Behavior**:
- Extraction succeeds but text is < 50 chars
- Throws `PdfTextEmptyError` (code: `TEXT_EMPTY`)

---

### Example 4: Encrypted PDFs with Password

**Scenario**: Password-protected documents

```bash
# Default settings work fine
# Configuration doesn't affect password handling
PDF_MAX_CONCURRENCY=4
PDF_PAGE_TIMEOUT_MS=800
```

**Note**: Configuration affects extraction speed, not password validation.

---

## Docker Configuration

### Dockerfile

```dockerfile
FROM node:20-slim

# Set PDF extraction configuration
ENV PDF_MAX_CONCURRENCY=4
ENV PDF_PAGE_TIMEOUT_MS=800

# ... rest of Dockerfile
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    build: .
    environment:
      - PDF_MAX_CONCURRENCY=4
      - PDF_PAGE_TIMEOUT_MS=800
      - NODE_ENV=production
    # ...
```

### Override for Different Environments

```bash
# Development (patient settings)
docker-compose --env-file .env.development up

# Production (balanced settings)
docker-compose --env-file .env.production up

# High-performance (max settings)
docker-compose --env-file .env.highperf up
```

---

## Kubernetes Configuration

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pdf-config
data:
  PDF_MAX_CONCURRENCY: "4"
  PDF_PAGE_TIMEOUT_MS: "800"
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trustdoc-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: trustdoc:latest
          envFrom:
            - configMapRef:
                name: pdf-config
```

### Override for Specific Pods

```bash
# Scale with different configs
kubectl set env deployment/trustdoc-app PDF_MAX_CONCURRENCY=8
kubectl set env deployment/trustdoc-app PDF_PAGE_TIMEOUT_MS=1500
```

---

## Monitoring Configuration

### Logging

All extractions log the effective configuration:

```
[pdfjs] Extraction config: concurrency=4, timeout=800ms, maxSize=10MB
```

**Parse logs to monitor**:
```bash
# Check what configuration is being used
grep "Extraction config" logs/production.log | tail -n 10

# Example output:
# [pdfjs] Extraction config: concurrency=4, timeout=800ms, maxSize=10MB
```

### Metrics to Track

**Recommended metrics**:
1. **Extraction Duration**: Total time per PDF
2. **Pages Per Second**: Throughput metric
3. **Timeout Rate**: Percentage of pages that timeout
4. **Memory Usage**: Peak memory during extraction

**Example Prometheus metrics**:
```typescript
// src/metrics/pdf.ts
import { register, Histogram, Counter } from "prom-client";

export const pdfExtractionDuration = new Histogram({
  name: "pdf_extraction_duration_seconds",
  help: "PDF extraction duration",
  labelNames: ["pages", "concurrency"],
});

export const pdfPageTimeouts = new Counter({
  name: "pdf_page_timeouts_total",
  help: "Number of pages that timed out",
  labelNames: ["concurrency", "timeout_ms"],
});
```

---

## Troubleshooting

### Issue: Extraction is Too Slow

**Symptoms**:
- Total extraction time > 10 seconds for 10-page PDF
- API requests timing out

**Solutions**:
1. Increase concurrency:
   ```bash
   export PDF_MAX_CONCURRENCY=6
   ```
2. Decrease timeout (fail faster on slow pages):
   ```bash
   export PDF_PAGE_TIMEOUT_MS=500
   ```
3. Check if PDF is scanned (will always be slow)

---

### Issue: Out of Memory Errors

**Symptoms**:
- Node.js crashes with `FATAL ERROR: Reached heap limit`
- Docker container killed by OOMKiller

**Solutions**:
1. Decrease concurrency:
   ```bash
   export PDF_MAX_CONCURRENCY=1
   ```
2. Increase Node.js heap size:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```
3. Reduce PDF size limit in code (not configurable via env)

---

### Issue: Pages Timing Out Frequently

**Symptoms**:
- Logs show: `Page X extraction timed out (800ms)`
- Result has `timedOutPages: [1, 5, 7]`

**Solutions**:
1. Increase timeout:
   ```bash
   export PDF_PAGE_TIMEOUT_MS=2000
   ```
2. Decrease concurrency (pages compete for CPU):
   ```bash
   export PDF_MAX_CONCURRENCY=2
   ```

---

### Issue: Configuration Not Applied

**Symptoms**:
- Logs show default values despite setting env vars
- Configuration seems ignored

**Debugging**:
1. Verify environment variable is set:
   ```bash
   echo $PDF_MAX_CONCURRENCY
   # Should output your value, not empty
   ```

2. Check variable spelling:
   ```bash
   # Wrong (typo)
   export PDF_CONCURRENCY=8

   # Correct
   export PDF_MAX_CONCURRENCY=8
   ```

3. Restart application:
   ```bash
   # Configuration is read at module load time
   # Requires restart to pick up changes
   pnpm run dev  # Restart development server
   ```

---

## Security Considerations

### Safe Bounds Rationale

**Why `1-8` for concurrency?**
- **Min (1)**: Prevents zero/negative (would hang extraction)
- **Max (8)**: Prevents resource exhaustion from excessive parallelism

**Why `200-3000ms` for timeout?**
- **Min (200ms)**: Prevents too-fast timeouts (most pages need > 100ms)
- **Max (3000ms)**: Prevents indefinite hangs (3s is generous)

### DoS Prevention

❌ **Without bounds**:
```bash
# Attacker could set extreme values
export PDF_MAX_CONCURRENCY=10000  # Would crash server
export PDF_PAGE_TIMEOUT_MS=9999999  # Would hang forever
```

✅ **With bounds (current implementation)**:
```bash
# Values automatically clamped to safe range
export PDF_MAX_CONCURRENCY=10000  # → clamped to 8
export PDF_PAGE_TIMEOUT_MS=9999999  # → clamped to 3000
```

---

## Future Enhancements

### Potential Additional Configuration

**Not yet implemented** (consider for future):

1. **`PDF_MAX_SIZE_MB`**: Configurable file size limit (currently hardcoded to 10 MB)
2. **`PDF_MIN_TEXT_LENGTH`**: Configurable minimum text threshold (currently 50 chars)
3. **`PDF_ENABLE_IMAGES`**: Toggle image extraction (performance impact)
4. **`PDF_LOG_LEVEL`**: Control verbosity (silent, errors, info, debug)

### Dynamic Configuration

Future: Support runtime configuration updates without restart (via Redis, database, or API).

---

## Summary

### Quick Reference

| Variable | Default | Range | When to Change |
|----------|---------|-------|----------------|
| `PDF_MAX_CONCURRENCY` | `4` | `1-8` | Adjust based on CPU/memory |
| `PDF_PAGE_TIMEOUT_MS` | `800` | `200-3000` | Adjust based on PDF complexity |

### Testing Checklist

- [ ] Test with default values (no env vars set)
- [ ] Test with `PDF_MAX_CONCURRENCY=1` (sequential)
- [ ] Test with `PDF_MAX_CONCURRENCY=8` (max concurrency)
- [ ] Test with `PDF_PAGE_TIMEOUT_MS=200` (fast timeout)
- [ ] Test with `PDF_PAGE_TIMEOUT_MS=3000` (patient timeout)
- [ ] Test with invalid values (verify clamping works)
- [ ] Test with both variables set simultaneously
- [ ] Verify logs show correct configuration

### Production Recommendations

**Standard deployment**:
```bash
PDF_MAX_CONCURRENCY=4
PDF_PAGE_TIMEOUT_MS=800
```

**High-performance deployment** (powerful server):
```bash
PDF_MAX_CONCURRENCY=6
PDF_PAGE_TIMEOUT_MS=1000
```

**Constrained deployment** (limited resources):
```bash
PDF_MAX_CONCURRENCY=2
PDF_PAGE_TIMEOUT_MS=1200
```

---

## References

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Ready for production!** 🚀

Configure your environment variables and enjoy tuneable PDF extraction without recompilation.
