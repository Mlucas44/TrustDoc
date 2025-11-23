# PDF Runtime Configuration - Node.js vs Edge

**Status**: Production
**Created**: 2025-11-12
**Purpose**: Document why PDF processing requires Node.js runtime and not Edge

---

## TL;DR

**All PDF-related API routes MUST use `export const runtime = "nodejs"`**

❌ **DO NOT use Edge Runtime** for PDF processing
✅ **ALWAYS use Node.js Runtime** for PDF processing

---

## Why Node.js Runtime is Required

### 1. File System Access

PDF parsing libraries require access to Node.js file system APIs:

```typescript
import fs from "fs";
import { Buffer } from "buffer";
```

**Edge Runtime limitations**:

- No `fs` module access
- Limited `Buffer` operations
- No temporary file creation

### 2. PDF Library Dependencies

#### Current: `pdf-parse` v1.1.4

- **Requires**: Node.js native modules (`zlib`, `buffer`, `stream`)
- **Size**: ~500KB with dependencies
- **Incompatible with**: Edge Runtime

#### Future: `pdfjs-dist` v4.x

- **Requires**: Node.js `canvas` module for text extraction
- **Size**: ~5MB with dependencies (includes worker files)
- **Incompatible with**: Edge Runtime (unless using browser build, which lacks server features)

### 3. Memory Requirements

**PDF Processing Memory Usage**:

- Typical contract (5 pages, 500KB): ~10-20 MB RAM
- Large document (50 pages, 5MB): ~50-100 MB RAM
- Peak during parsing: ~2x file size

**Edge Runtime constraints**:

- Limited memory per request
- Optimized for low-latency, not heavy computation
- Timeouts more aggressive

### 4. Processing Time

**PDF Parsing Duration**:

- Small PDF (< 1MB): 500ms - 1.5s
- Medium PDF (1-5MB): 1.5s - 5s
- Large PDF (5-10MB): 5s - 20s (timeout at 20s)

**Edge Runtime issues**:

- Optimized for < 100ms responses
- Not suitable for long-running operations
- Connection can close prematurely

---

## Current Configuration

All PDF-related routes are correctly configured with Node.js runtime:

### ✅ Configured Routes

```typescript
// app/api/parse/route.ts
export const runtime = "nodejs"; // ✅ Correct

// app/api/prepare/route.ts
export const runtime = "nodejs"; // ✅ Correct

// app/api/analyze/route.ts
export const runtime = "nodejs"; // ✅ Correct

// app/api/upload/route.ts
export const runtime = "nodejs"; // ✅ Correct
```

---

## Edge vs Node.js Comparison

| Feature               | Edge Runtime | Node.js Runtime  | PDF Needs      |
| --------------------- | ------------ | ---------------- | -------------- |
| **Latency**           | < 50ms       | 50-200ms         | Low priority   |
| **Memory**            | Limited      | Generous         | **High**       |
| **Processing**        | Lightweight  | CPU-intensive OK | **Heavy**      |
| **File System**       | ❌ No        | ✅ Yes           | **Required**   |
| **Native Modules**    | ❌ No        | ✅ Yes           | **Required**   |
| **Timeout**           | Aggressive   | Flexible         | **20s needed** |
| **Cold Start**        | ~10ms        | ~100-500ms       | Acceptable     |
| **Global Deployment** | ✅ Yes       | Regional         | Nice-to-have   |

---

## When to Use Each Runtime

### Use Edge Runtime for:

✅ Static content delivery
✅ Simple API responses (JSON)
✅ Middleware (auth checks, redirects)
✅ Geolocation-based routing
✅ A/B testing
✅ Rate limiting (simple)

### Use Node.js Runtime for:

✅ **PDF processing** ← Our use case
✅ Image manipulation
✅ Database queries (Prisma)
✅ File uploads/downloads
✅ Complex computations
✅ Third-party library integration
✅ Streaming responses

---

## Migration Considerations (pdf-parse → pdfjs-dist)

### Current: pdf-parse v1.1.4

```typescript
import pdfParse from "pdf-parse";

export const runtime = "nodejs"; // Required
```

### Future: pdfjs-dist v4.x

```typescript
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs"; // Still required!
```

**Why pdfjs-dist also needs Node.js**:

- Uses `canvas` for text layer extraction
- Requires worker threads for performance
- Needs access to `.wasm` files via file system
- Text extraction uses native Node.js streams

---

## Error Scenarios

### Attempting to Use Edge Runtime

```typescript
// ❌ WRONG - Will fail at runtime
export const runtime = "edge";

export async function POST(request: NextRequest) {
  const buffer = await downloadFile(filePath); // ❌ Fails
  const result = await pdfParse(buffer); // ❌ Fails
  // Error: Module 'fs' is not available in Edge Runtime
}
```

**Error messages you'll see**:

```
Error: The edge runtime does not support Node.js 'fs' module.
Error: The edge runtime does not support Node.js 'buffer' module.
Error: Cannot find module 'canvas'
```

### Correct Implementation

```typescript
// ✅ CORRECT
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const buffer = await downloadFile(filePath); // ✅ Works
  const result = await pdfParse(buffer); // ✅ Works
  return NextResponse.json(result);
}
```

---

## Performance Implications

### Node.js Runtime (Current)

- **Cold start**: ~300ms (Vercel serverless)
- **Warm request**: ~50ms overhead
- **Total PDF parse**: 1-3s (typical)
- **Memory**: 128-512 MB allocated
- **Timeout**: Configurable (20s for PDF routes)

### Edge Runtime (Hypothetical - Not Supported)

- **Cold start**: ~10ms
- **Warm request**: ~5ms overhead
- ❌ **Cannot parse PDFs** (missing dependencies)

**Conclusion**: Node.js runtime is non-negotiable for PDF processing.

---

## Best Practices

### 1. Always Declare Runtime Explicitly

```typescript
// At the top of every PDF-related route
export const runtime = "nodejs";
```

Don't rely on defaults - be explicit.

### 2. Set Appropriate Timeouts

```typescript
// For long-running PDF operations
export const maxDuration = 20; // seconds (Vercel)
```

### 3. Monitor Memory Usage

```typescript
console.log("Memory:", process.memoryUsage());
// { rss: 50MB, heapTotal: 20MB, heapUsed: 15MB }
```

### 4. Handle Timeouts Gracefully

```typescript
const result = await parsePdfWithTimeout(filePath, 20000);
// Throws error if > 20s
```

---

## Deployment Configuration

### Vercel (Current Platform)

**vercel.json** (if needed):

```json
{
  "functions": {
    "app/api/parse/route.ts": {
      "runtime": "nodejs20.x",
      "memory": 512,
      "maxDuration": 20
    },
    "app/api/prepare/route.ts": {
      "runtime": "nodejs20.x",
      "memory": 512,
      "maxDuration": 20
    }
  }
}
```

**Note**: `export const runtime = "nodejs"` in route files is usually sufficient. The `vercel.json` config is optional for fine-tuning.

---

## Testing Runtime Configuration

### Check Current Runtime

```bash
# In development
pnpm dev

# Make request to PDF endpoint
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"filePath": "test.pdf"}'

# Check logs for:
# - No "edge runtime" errors ✅
# - Successful PDF parsing ✅
```

### Verify in Production

```bash
# Check function runtime in Vercel dashboard
# Settings → Functions → View function details
# Runtime: nodejs20.x ✅
```

---

## Common Questions

### Q: Can we use Edge for upload endpoint?

**A**: No - upload requires file system access and Supabase SDK which needs Node.js.

### Q: What about text-only analysis (no PDF)?

**A**: If you already have extracted text, you _could_ use Edge for LLM analysis, but we use Node.js for consistency and Prisma database access.

### Q: Does pdfjs-dist have a browser version?

**A**: Yes, but it's designed for client-side rendering, not server-side text extraction. Lacks critical APIs we need.

### Q: What if we move to AWS Lambda?

**A**: Same rules apply - use Node.js runtime, not Lambda@Edge.

### Q: Can we cache parsed results to avoid re-parsing?

**A**: Yes! We already do this via `analysis_jobs` table. See [TESTING_API_PIPELINE.md](../TESTING_API_PIPELINE.md).

---

## Future Optimizations

### Potential Improvements (Still on Node.js)

1. **Worker Threads**: Parallelize page extraction
2. **Streaming**: Process pages as they're parsed (reduce memory)
3. **Incremental Parsing**: Return partial results before full parse completes
4. **Caching**: Cache parsed text in Redis for 24h TTL
5. **Dedicated Service**: Move PDF parsing to separate microservice with higher resources

**All of these still require Node.js runtime** - Edge is not an option.

---

## References

- [Next.js Edge Runtime Docs](https://nextjs.org/docs/app/api-reference/edge)
- [Vercel Functions Runtime](https://vercel.com/docs/functions/runtimes)
- [pdfjs-dist GitHub](https://github.com/mozilla/pdf.js)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)

---

## Summary Checklist

Before deploying PDF-related changes:

- [ ] All PDF routes have `export const runtime = "nodejs"`
- [ ] No Edge Runtime imports in PDF code
- [ ] Timeout set to 20s minimum for PDF routes
- [ ] Memory allocation appropriate (512MB recommended)
- [ ] Error handling for timeout scenarios
- [ ] Monitoring in place for parse failures

**If in doubt, use Node.js runtime. PDF processing is incompatible with Edge.**
