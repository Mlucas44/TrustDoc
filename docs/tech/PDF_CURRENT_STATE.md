# PDF Ingestion - Current State (v1)

**Status**: Production
**Branch**: `main`
**Created**: 2025-11-12
**Purpose**: Technical inventory of existing PDF parsing system before v2 migration

---

## Overview

TrustDoc currently uses a **simple, synchronous PDF parsing pipeline** based on `pdf-parse` v1.1.4. The system extracts text from uploaded PDFs, normalizes it, detects contract type, and prepares it for LLM analysis.

**Key Characteristics:**

- **Library**: `pdf-parse` v1.1.4 (npm package)
- **Architecture**: Single-threaded, synchronous parsing
- **Limitations**: No support for encrypted/password-protected PDFs, scanned PDFs (no OCR)
- **Performance**: ~1-3s for typical contracts (5-20 pages)
- **Timeout**: 20s hard limit

---

## Core Components

### 1. PDF Parsing Service

**File**: [src/services/pdf/parse-pdf.ts](../../src/services/pdf/parse-pdf.ts)

**Exports**:

- `parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult>` - Parse PDF from buffer
- `parsePdfFromStorage(filePath: string): Promise<PdfParseResult>` - Parse from Supabase Storage
- `parsePdfFromStorageWithTimeout(filePath: string, timeoutMs: number): Promise<PdfParseResult>` - With timeout
- `PdfParseResult` - Result type (textRaw, pages, textLength, meta)
- `PdfParseError` - Encrypted/corrupted PDF error
- `PdfTextEmptyError` - Scanned/empty PDF error
- `PdfFileTooLargeError` - File exceeds 10 MB limit

**Key Features**:

- Size validation (max 10 MB)
- Text content validation (min 50 alphanumeric chars)
- Metadata extraction (title, author, producer, creator, creationDate)
- Crypt warning suppression (downgrades to debug log)
- Error handling for encrypted/corrupted PDFs

**Dependencies**:

```json
{
  "pdf-parse": "1.1.4",
  "@types/pdf-parse": "^1.1.5"
}
```

**Usage Example**:

```typescript
import { parsePdfFromStorageWithTimeout } from "@/src/services/pdf/parse-pdf";

const result = await parsePdfFromStorageWithTimeout("user-abc/doc.pdf", 20000);
// {
//   textRaw: "Contract text...",
//   pages: 5,
//   textLength: 12450,
//   meta: { title: "Employment Contract", ... }
// }
```

---

### 2. Text Normalization Service

**File**: [src/services/text/normalize.ts](../../src/services/text/normalize.ts)

**Exports**:

- `normalizeContractText(input: NormalizeInput): NormalizeResult` - Main normalization function
- `NormalizeInput` - Input type (textRaw, pages, meta)
- `NormalizeResult` - Result type (textClean, textTokensApprox, stats, sections)
- `TextTooShortError` - Text < 200 chars after cleanup

**Key Features**:

- Header/footer removal (heuristic-based)
- Space normalization (CRLF → LF, trailing spaces, multiple spaces)
- Hyphen joining across line breaks
- Paragraph break normalization
- Heading detection (levels 1-3)
- Token estimation (char_count / 4)
- Truncation at 200k chars

**Normalization Stats**:

```typescript
{
  pages: number;
  textLengthRaw: number;
  textLengthClean: number;
  removedHeaderFooterRatio: number;
  hyphenJoins: number;
  linesMerged: number;
  truncated?: boolean;
}
```

---

### 3. Contract Type Detection

**Files**:

- [src/services/detect/contract-type.ts](../../src/services/detect/contract-type.ts) - Orchestrator
- [src/services/detect/type-heuristic.ts](../../src/services/detect/type-heuristic.ts) - Keyword-based detection
- [src/services/detect/type-llm.ts](../../src/services/detect/type-llm.ts) - LLM fallback

**Strategy**:

1. **Heuristic detection** (< 200ms) - Keyword matching with confidence scoring
2. **If confidence ≥ 0.8** → Return heuristic result
3. **Otherwise** → Validate with LLM (< 1.5s)
4. **Combine results** using confidence scores

**Detected Types**:

- `CGU` - Terms of Service / Conditions Générales d'Utilisation
- `FREELANCE` - Freelance Contract
- `EMPLOI` - Employment Contract
- `NDA` - Non-Disclosure Agreement
- `DEVIS` - Quote / Estimate
- `PARTENARIAT` - Partnership Agreement
- `AUTRE` - Other

**Rate Limiting**: Token bucket (max 5 LLM calls, refill 0.5/second)

---

### 4. Pipeline Orchestration

**File**: [src/services/pipeline/prepare-text.ts](../../src/services/pipeline/prepare-text.ts)

**Exports**:

- `prepareTextFromStorage(filePath, timeoutMs, detectType, trace): Promise<PreparedTextPayload>`
- `PreparedTextPayload` - Final payload (textClean, textTokensApprox, stats, meta, sections, contractType)

**Pipeline Steps**:

1. Parse PDF from storage
2. Normalize text
3. Detect contract type (optional)
4. Return unified payload

**Usage in API Routes**:

```typescript
const payload = await prepareTextFromStorage(filePath, 20000, true);
// Ready for /api/analyze
```

---

## API Routes

### POST /api/parse

**File**: [app/api/parse/route.ts](../../app/api/parse/route.ts)

**Purpose**: Legacy endpoint - Parse PDF and return raw text

**Request**:

```json
{
  "filePath": "user-abc123/file-xyz.pdf"
}
```

**Response**:

```json
{
  "pages": 5,
  "textLength": 12450,
  "textRaw": "Contract text...",
  "meta": {
    "title": "Employment Contract",
    "author": "John Doe"
  }
}
```

**Error Codes**:

- `RATE_LIMIT_EXCEEDED` (429) - 10 requests/min exceeded
- `INSUFFICIENT_CREDITS` (402) - User has no credits
- `GUEST_QUOTA_EXCEEDED` (402) - Guest quota exceeded
- `MISSING_FILE_PATH` (400) - No filePath provided
- `INVALID_FILE_PATH_FORMAT` (400) - Path format invalid
- `FILE_NOT_FOUND` (404) - File not in storage
- `PDF_TOO_LARGE` (413) - File > 10 MB
- `PDF_TEXT_EMPTY_OR_SCANNED` (422) - Scanned PDF
- `PARSE_TIMEOUT` (504) - Parsing > 20s
- `PARSE_FAILED` (500) - Corrupted/encrypted PDF

**Behavior**: Deletes source PDF after successful parsing

---

### POST /api/prepare

**File**: [app/api/prepare/route.ts](../../app/api/prepare/route.ts)

**Purpose**: Modern endpoint - Full preparation pipeline (parse + normalize + detect + persist to DB)

**Request**:

```json
{
  "filePath": "user-abc123/file-xyz.pdf"
}
```

**Response**:

```json
{
  "jobId": "cm5abc123xyz"
}
```

**Pipeline**:

1. Parse PDF (`prepareTextFromStorage`)
2. Persist to `analysis_jobs` table (status: `prepared`)
3. Delete source PDF
4. Return `jobId` for `/api/analyze`

**Error Codes**: Same as `/api/parse` + additional DB errors

**Database Fields Populated**:

- `text_raw` - Raw extracted text
- `text_clean` - Normalized text
- `text_length_raw` - Raw text length
- `text_length_clean` - Clean text length
- `text_tokens_approx` - Estimated token count
- `pages` - Page count
- `meta` - PDF metadata (JSON)
- `sections` - Document sections (JSON)
- `contract_type` - Detected type
- `status` - `prepared`

---

## Data Flow

```
┌─────────────────┐
│  User uploads   │
│   PDF to UI     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  POST /api/upload                   │
│  - Validates file type (.pdf)       │
│  - Saves to Supabase Storage        │
│  - Returns filePath                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  POST /api/prepare                  │
│  1. parsePdfFromStorageWithTimeout  │
│     └─> src/services/pdf/parse-pdf  │
│  2. normalizeContractText           │
│     └─> src/services/text/normalize │
│  3. detectContractType (optional)   │
│     └─> src/services/detect/*       │
│  4. Persist to analysis_jobs (DB)   │
│  5. Delete PDF from storage         │
│  6. Return jobId                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  POST /api/analyze                  │
│  - Fetches job from DB by jobId     │
│  - Reads text_clean from DB         │
│  - Runs LLM analysis                │
│  - Consumes credits                 │
│  - Persists to analyses table       │
│  - Updates job status: analyzed     │
└─────────────────────────────────────┘
```

---

## Dependencies

### Production

```json
{
  "pdf-parse": "1.1.4"
}
```

**Why pdf-parse v1.1.4?**

- Stable, battle-tested library
- Works with Node.js 20+ and Next.js serverless
- Simple API (no complex configuration)
- Good metadata extraction
- **Known limitations**: No encrypted PDF support, no OCR

### Development

```json
{
  "@types/pdf-parse": "^1.1.5"
}
```

---

## Known Issues & Limitations

### 1. Encrypted PDFs Not Supported

**Issue**: `pdf-parse` throws error on password-protected PDFs
**Error Message**: "Ce PDF est protégé par mot de passe. Veuillez supprimer la protection et réessayer."
**Workaround**: User must remove password before upload
**Impact**: ~5-10% of uploaded PDFs (estimated)

### 2. Scanned PDFs (No OCR)

**Issue**: PDFs without embedded text return `PdfTextEmptyError`
**Error Message**: "PDF appears to be scanned or has no extractable text"
**Workaround**: None - OCR not implemented
**Impact**: ~2-5% of uploaded PDFs (estimated)

### 3. Size Limit

**Issue**: PDFs > 10 MB rejected
**Reason**: Performance + serverless timeout constraints
**Impact**: Minimal (<1% of uploads)

### 4. Performance

**Issue**: Large PDFs (50+ pages) can take 5-10s to parse
**Mitigation**: 20s timeout in place
**Impact**: Some complex multi-page contracts timeout

### 5. Crypt Warnings in Logs

**Issue**: `pdf-parse` logs "Warning: filter 'Crypt' not supported yet" for some PDFs
**Mitigation**: Warnings downgraded to debug level
**Impact**: Noise in logs (non-blocking)

---

## Testing

### Manual Testing (cURL)

See [docs/TESTING_API_PIPELINE.md](../TESTING_API_PIPELINE.md) for complete test suite.

**Quick Test**:

```bash
# 1. Upload PDF via UI → get filePath
# 2. Test parse endpoint
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"filePath": "user-abc/file-xyz.pdf"}'

# Expected: 200 OK with pages, textLength, textRaw, meta
```

### Unit Tests

**Status**: Not implemented (tests removed in previous cleanup)

### E2E Tests

**Status**: Minimal coverage (Playwright tests exist but don't cover PDF parsing)

---

## Performance Metrics

**Typical Performance** (5-page contract, ~10k chars):

- PDF Parsing: 800ms - 1.5s
- Text Normalization: 50ms - 100ms
- Contract Type Detection (heuristic): 100ms - 200ms
- Contract Type Detection (LLM fallback): 1s - 2s
- **Total**: 1s - 3.5s

**Database Storage** (per job):

- `text_raw`: ~10-50 KB
- `text_clean`: ~8-40 KB
- `meta`: ~0.5 KB
- `sections`: ~1-2 KB
- **Total per job**: ~20-100 KB

---

## File Inventory

### Core Files

```
src/services/pdf/
├── parse-pdf.ts              # Main PDF parsing service (243 lines)

src/services/text/
├── normalize.ts               # Text normalization (full file)

src/services/detect/
├── contract-type.ts           # Detection orchestrator
├── type-heuristic.ts          # Keyword-based detection
└── type-llm.ts                # LLM fallback

src/services/pipeline/
└── prepare-text.ts            # Pipeline orchestrator (174 lines)

app/api/
├── parse/route.ts             # Legacy parse endpoint (248 lines)
└── prepare/route.ts           # Modern prepare endpoint
```

### Supporting Files

```
src/services/
├── storage.ts                 # Supabase Storage integration (downloadFile, deleteFile)

src/schemas/
├── detect.ts                  # DetectionResult schema (Zod)
└── analysis-job.ts            # PrepareRequestSchema (Zod)

src/lib/
└── timing.ts                  # Trace class for performance monitoring
```

---

## Migration Readiness (v2)

### Candidates for Replacement/Enhancement

1. **PDF Parsing Library**: Consider alternatives to `pdf-parse`
   - **pdfjs-dist** (Mozilla) - Better encryption handling, more robust
   - **pdf2json** - JSON output, better structure extraction
   - **pdfplumber** (Python) - If moving to Python microservice

2. **OCR Support**: Add for scanned PDFs
   - **Tesseract.js** - Client-side OCR
   - **Google Cloud Vision API** - Server-side OCR
   - **AWS Textract** - Server-side OCR with table extraction

3. **Parallel Processing**: Large PDFs could benefit from page-level parallelization

4. **Caching**: Parsed results could be cached (Redis) to avoid re-parsing

5. **Streaming**: For very large PDFs, stream pages instead of loading entire file

### Files to Review for v2

- [ ] `src/services/pdf/parse-pdf.ts` - Replace `pdf-parse` with new library
- [ ] `src/services/text/normalize.ts` - Enhance normalization (tables, lists, etc.)
- [ ] `src/services/detect/type-heuristic.ts` - Add more keywords/patterns
- [ ] `app/api/parse/route.ts` - Consider deprecating in favor of `/api/prepare`
- [ ] Error handling - Add retry logic for transient failures

---

## Security Considerations

### Current Safeguards

✅ Path validation (regex) prevents traversal attacks
✅ File size limit (10 MB) prevents DoS
✅ Timeout (20s) prevents hanging processes
✅ Rate limiting (10 req/min) prevents abuse
✅ Files deleted after parsing (storage cleanup)

### Potential Vulnerabilities

⚠️ No virus/malware scanning on uploaded PDFs
⚠️ No content filtering (malicious JS in PDFs)
⚠️ No validation of PDF structure (zip bombs, nested objects)

### Recommendations for v2

- [ ] Add virus scanning (ClamAV, VirusTotal API)
- [ ] Sandbox PDF parsing (isolated container)
- [ ] Validate PDF structure before parsing

---

## Observability

### Logging Events

- `[parsePdfBuffer] Text extraction stats` - Character counts, first 200 chars
- `[POST /api/parse] Success` - filePath, pages, textLength
- `[POST /api/parse] PDF parse error` - Error details

### Metrics

- Parse duration (via `Trace` class in pipeline)
- Success/failure rate (logged but not aggregated)

### Missing

- [ ] Prometheus metrics for parse success rate
- [ ] Alert on parse failures > 10%
- [ ] Dashboard for average parse time by page count

---

## Conclusion

The current PDF parsing system (v1) is **simple, reliable, and production-ready** for typical use cases (text-based, unencrypted PDFs). However, it has clear limitations:

- No encrypted PDF support
- No OCR for scanned PDFs
- Limited performance for large files

**Next Steps**: Document v2 requirements and evaluate alternative libraries/architectures.
