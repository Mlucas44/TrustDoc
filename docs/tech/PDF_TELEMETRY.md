# PDF Parse V2 Telemetry

## Overview

The `/api/parse-v2` endpoint logs structured JSON telemetry for monitoring PDF ingestion performance and troubleshooting issues.

## Log Format

All telemetry logs are JSON objects with a consistent structure:

```json
{
  "prefix": "[pdf-parse-v2]",
  "event": "parse_success" | "parse_failed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  ...additional fields
}
```

## Success Event

Logged when PDF parsing completes successfully.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `prefix` | string | Log identifier | `"[pdf-parse-v2]"` |
| `event` | string | Event type | `"parse_success"` |
| `engineUsed` | string | Parser engine used | `"pdfjs-dist"` |
| `pages` | number | Number of pages extracted | `5` |
| `encrypted` | boolean | Whether PDF was encrypted | `false` |
| `totalMs` | number | Total processing time in milliseconds | `1234` |
| `textLength` | number | Total characters extracted | `5678` |
| `filePathPattern` | string | User/guest prefix only (no full path) | `"user-abc123"` |
| `timestamp` | string | ISO 8601 timestamp | `"2024-01-01T12:00:00.000Z"` |

### Example

```json
{
  "prefix": "[pdf-parse-v2]",
  "event": "parse_success",
  "engineUsed": "pdfjs-dist",
  "pages": 12,
  "encrypted": false,
  "totalMs": 856,
  "textLength": 15432,
  "filePathPattern": "user-abc123",
  "timestamp": "2024-11-13T14:22:15.789Z"
}
```

## Failure Event

Logged when PDF parsing fails for any reason.

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `prefix` | string | Log identifier | `"[pdf-parse-v2]"` |
| `event` | string | Event type | `"parse_failed"` |
| `errorCode` | string | Standardized error code | `"PASSWORD_REQUIRED"` |
| `totalMs` | number | Time before failure | `123` |
| `timestamp` | string | ISO 8601 timestamp | `"2024-01-01T12:00:00.000Z"` |
| `encrypted` | boolean? | Present for password errors | `true` |
| `textLength` | number? | Present for empty text errors | `0` |
| `sizeBytes` | number? | Present for file size errors | `15728640` |
| `pageNumber` | number? | Present for timeout errors | `42` |
| `errorMessage` | string? | Present for unknown errors | `"Unexpected error"` |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PASSWORD_REQUIRED` | 401 | PDF is encrypted, password needed |
| `PASSWORD_INVALID` | 401 | Provided password is incorrect |
| `TEXT_EMPTY` | 422 | PDF has no extractable text (scanned) |
| `FILE_TOO_LARGE` | 413 | PDF exceeds 10 MB limit |
| `PAGE_TIMEOUT` | 504 | Page extraction timed out |
| `PARSE_FAILED` | 500 | PDF parsing failed (corrupted, etc.) |
| `PARSE_ERROR` | 500 | Unknown error during parsing |

### Examples

#### Password Required

```json
{
  "prefix": "[pdf-parse-v2]",
  "event": "parse_failed",
  "errorCode": "PASSWORD_REQUIRED",
  "encrypted": true,
  "totalMs": 245,
  "timestamp": "2024-11-13T14:25:30.123Z"
}
```

#### Empty Text (Scanned PDF)

```json
{
  "prefix": "[pdf-parse-v2]",
  "event": "parse_failed",
  "errorCode": "TEXT_EMPTY",
  "textLength": 0,
  "totalMs": 512,
  "timestamp": "2024-11-13T14:28:45.456Z"
}
```

#### Page Timeout

```json
{
  "prefix": "[pdf-parse-v2]",
  "event": "parse_failed",
  "errorCode": "PAGE_TIMEOUT",
  "pageNumber": 42,
  "totalMs": 35678,
  "timestamp": "2024-11-13T14:30:15.789Z"
}
```

## Privacy & Security

### No Sensitive Data

Telemetry logs **DO NOT** include:

- ✅ File content or extracted text
- ✅ Full file paths (only user/guest prefix)
- ✅ User IDs or personal information
- ✅ Passwords or authentication tokens
- ✅ PDF metadata (author, title, etc.)

### Safe to Log

The following data is safe and useful for monitoring:

- ✅ Performance metrics (pages, totalMs, textLength)
- ✅ Error codes and types
- ✅ Engine used for parsing
- ✅ Encryption status (yes/no, no password logged)
- ✅ Generic file path pattern (user-xxx or guest-xxx)

## Usage

### Filtering Logs

To extract only PDF parse v2 telemetry from logs:

```bash
# Development
pnpm dev | grep '"\[pdf-parse-v2\]"'

# Production (JSON logs)
cat logs/app.log | jq 'select(.prefix == "[pdf-parse-v2]")'
```

### Monitoring Success Rate

```bash
# Count successes
cat logs/app.log | jq 'select(.prefix == "[pdf-parse-v2]" and .event == "parse_success")' | wc -l

# Count failures
cat logs/app.log | jq 'select(.prefix == "[pdf-parse-v2]" and .event == "parse_failed")' | wc -l
```

### Average Processing Time

```bash
# Average totalMs for successful parses
cat logs/app.log | jq -r 'select(.prefix == "[pdf-parse-v2]" and .event == "parse_success") | .totalMs' | awk '{sum+=$1; n++} END {print sum/n}'
```

### Error Distribution

```bash
# Group failures by error code
cat logs/app.log | jq -r 'select(.prefix == "[pdf-parse-v2]" and .event == "parse_failed") | .errorCode' | sort | uniq -c
```

## Testing

See [scripts/test-telemetry.sh](../../scripts/test-telemetry.sh) for testing telemetry output in development.

```bash
# Start dev server
pnpm dev

# In another terminal, test telemetry
./scripts/test-telemetry.sh
```

Check your dev server logs for JSON output with `prefix: "[pdf-parse-v2]"`.

## Configuration

Telemetry is always enabled and cannot be disabled. It's designed to be:

- **Lightweight**: JSON serialization is fast
- **Structured**: Easy to parse and query
- **Privacy-safe**: No sensitive data logged
- **Actionable**: Includes metrics needed for monitoring

## Future Enhancements

Potential improvements:

- [ ] Ship telemetry to external monitoring (Datadog, CloudWatch, etc.)
- [ ] Add request ID correlation
- [ ] Include concurrency and timeout settings used
- [ ] Track retry attempts for failed pages
- [ ] Add user type (guest vs authenticated)
