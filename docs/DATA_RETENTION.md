# Data Retention & Deletion Policy

## Overview

TrustDoc implements a comprehensive data retention and deletion policy to:

1. **Minimize sensitive data exposure** - Contract text and PDFs are deleted as soon as possible
2. **Control storage costs** - Automatic cleanup of orphaned files and old analyses
3. **Comply with data protection** - Users' sensitive data is not retained indefinitely
4. **Provide data recovery** - Soft-delete with grace period before physical removal

## Retention Timeline

```
PDF Upload → Processing → Immediate Deletion (30min safety net)
                              ↓
                        Analysis Stored
                              ↓
                    (365 days retention)
                              ↓
                        Soft-Delete
                              ↓
                    (30 days grace period)
                              ↓
                      Physical Purge
```

## Configuration

### Environment Variables

```bash
# Maximum time to keep PDFs in storage (minutes)
# Default: 30 minutes
PDF_TTL_MINUTES=30

# How long to keep analysis data before soft-delete (days)
# Default: 365 days (1 year)
ANALYSIS_RETENTION_DAYS=365

# How long to keep soft-deleted analyses before physical purge (days)
# Default: 30 days
ANALYSIS_PURGE_DAYS=30

# Secret key for authenticating CRON job requests
# Generate with: openssl rand -base64 32
CRON_SECRET=your-cron-secret-key-min-32-chars-long
```

## PDF Lifecycle

### Immediate Deletion

PDFs are deleted **immediately after processing** in the `/api/prepare` endpoint:

```typescript
// 6. Delete source file after successful preparation
try {
  await deleteFile(filePath);
} catch (error) {
  // Log but don't fail the request if deletion fails
  console.error("[POST /api/prepare] Failed to delete source file:", error);
}
```

**Location**: [app/api/prepare/route.ts:286-291](../app/api/prepare/route.ts#L286-L291)

### Orphaned File Cleanup

A safety net CRON job (`cleanup-pdfs`) runs **hourly** to delete any orphaned PDFs older than `PDF_TTL_MINUTES` (default: 30 minutes).

**Endpoint**: `POST /api/jobs/cleanup-pdfs`

**Schedule**: `0 * * * *` (every hour at :00)

**What it does**:

1. Lists all folders (`user-*` and `guest-*`) in Supabase Storage
2. For each folder, lists files and checks `created_at` timestamp
3. Deletes files older than TTL cutoff
4. Logs cleanup statistics

**Authentication**: Requires `x-cron-secret` header matching `CRON_SECRET` env var

## Analysis Lifecycle

### Soft-Delete Policy

Analyses are **soft-deleted** (not physically removed) after `ANALYSIS_RETENTION_DAYS` (default: 365 days).

**Endpoint**: `POST /api/jobs/retention-analyses`

**Schedule**: `0 * * * *` (every hour at :00)

**What it does**:

1. Finds analyses created before cutoff date (e.g., 365 days ago)
2. Sets `deletedAt` timestamp (soft-delete)
3. Analyses remain in database but hidden from user views
4. Logs soft-delete count

**Authentication**: Requires `x-cron-secret` header matching `CRON_SECRET` env var

### Physical Purge

Soft-deleted analyses are **physically removed** from the database after `ANALYSIS_PURGE_DAYS` (default: 30 days).

**Endpoint**: `POST /api/jobs/purge-analyses`

**Schedule**: `0 2 * * *` (daily at 2:00 AM)

**What it does**:

1. Finds analyses with `deletedAt` older than purge cutoff (e.g., 30 days ago)
2. Permanently deletes records from database
3. Logs purge count

**Authentication**: Requires `x-cron-secret` header matching `CRON_SECRET` env var

## CRON Job Configuration

### Vercel Cron

Jobs are scheduled using Vercel Cron (configured in [vercel.json](../vercel.json)):

```json
{
  "crons": [
    {
      "path": "/api/jobs/cleanup-pdfs",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/jobs/retention-analyses",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/jobs/purge-analyses",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Note**: Vercel Cron is only available in **production**. Local testing uses manual invocation.

### Local Testing

Test CRON jobs locally with `curl`:

```bash
# Generate CRON_SECRET if not set
CRON_SECRET=$(openssl rand -base64 32)

# Test PDF cleanup
curl -X POST http://localhost:3000/api/jobs/cleanup-pdfs \
  -H "x-cron-secret: $CRON_SECRET"

# Test analysis retention
curl -X POST http://localhost:3000/api/jobs/retention-analyses \
  -H "x-cron-secret: $CRON_SECRET"

# Test analysis purge
curl -X POST http://localhost:3000/api/jobs/purge-analyses \
  -H "x-cron-secret: $CRON_SECRET"
```

## Security

### CRON Authentication

All CRON jobs are protected by `x-cron-secret` header to prevent unauthorized access.

**Middleware**: [src/middleware/cron-auth.ts](../src/middleware/cron-auth.ts)

```typescript
export function validateCronRequest(request: NextRequest): NextResponse | null {
  const secret = request.headers.get(CRON_SECRET_HEADER);

  if (!secret) {
    return NextResponse.json({ error: "Missing CRON authentication header" }, { status: 401 });
  }

  if (secret !== env.server.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid CRON authentication" }, { status: 401 });
  }

  return null;
}
```

**Generate a secure CRON_SECRET**:

```bash
openssl rand -base64 32
```

### Vercel Configuration

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `CRON_SECRET` with your generated secret
4. Deploy to production

Vercel will automatically add the `x-cron-secret` header when invoking CRON jobs.

## Monitoring

### Structured Logging

All CRON jobs use structured logging with privacy-by-design:

```typescript
jobLogger.info("cleanup-pdfs.completed", {
  deletedCount: result.deleted,
  durationMs,
});
```

**Events**:

- `cleanup-pdfs.started` - PDF cleanup job started
- `cleanup-pdfs.completed` - PDF cleanup job completed with count
- `cleanup-pdfs.failed` - PDF cleanup job failed with error
- `retention-analyses.started` - Retention job started
- `retention-analyses.completed` - Retention job completed with count
- `retention-analyses.failed` - Retention job failed with error
- `purge-analyses.started` - Purge job started
- `purge-analyses.completed` - Purge job completed with count
- `purge-analyses.failed` - Purge job failed with error

### Vercel Dashboard

Monitor CRON job execution in Vercel:

1. Go to your Vercel project
2. Navigate to **Deployments → [Latest] → Logs**
3. Filter by CRON job paths (`/api/jobs/*`)

## Best Practices

### Development

- Use `MOCK_STORAGE=true` to avoid Supabase costs during development
- Set short retention periods for testing (e.g., `ANALYSIS_RETENTION_DAYS=1`)
- Manually invoke CRON jobs with `curl` to test logic

### Production

- Use default retention periods for production (`365` days for analyses)
- Monitor CRON job logs for failures
- Set up alerts for failed jobs (Vercel Integrations → Monitoring)
- Regularly review storage costs in Supabase dashboard

### Privacy Compliance

- **Never** log contract text, PDF content, or PII
- PDFs are deleted immediately after processing
- Analyses are soft-deleted, not immediately purged (recovery window)
- Users can request immediate deletion (implement `/api/user/delete-data` if needed)

## Database Schema

The `Analysis` model includes `deletedAt` for soft-delete:

```prisma
model Analysis {
  id             String       @id @default(cuid())
  userId         String
  filename       String
  type           ContractType @default(AUTRE)

  // Analysis results
  summary      String? @db.Text
  riskScore    Int     @default(0)
  redFlags     Json?
  clauses      Json?

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // Soft delete

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Important**: Queries must filter out soft-deleted records:

```typescript
// Get user analyses (exclude soft-deleted)
const analyses = await prisma.analysis.findMany({
  where: {
    userId,
    deletedAt: null, // Only active analyses
  },
  orderBy: { createdAt: "desc" },
});
```

## Future Enhancements

- [ ] User-initiated data export (GDPR compliance)
- [ ] User-initiated immediate deletion (right to be forgotten)
- [ ] Admin dashboard for retention policy monitoring
- [ ] Configurable retention periods per user plan
- [ ] Archive old analyses to cold storage (S3 Glacier) before purge
