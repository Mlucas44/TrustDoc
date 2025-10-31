# Idempotency Setup Guide

This document explains how to activate the idempotency system for credit-safe analysis.

## Overview

The idempotency system prevents duplicate credit charges when users retry/refresh analysis requests. It ensures:

- **Atomic Operations**: Analysis persistence + credit consumption happen in one transaction
- **Replay Protection**: Duplicate requests with same idempotency key don't charge credits
- **Concurrency Safety**: In-memory mutex + database locking prevent race conditions

## Current Status

⚠️ **PENDING MIGRATION** - The idempotency system code is complete but requires database migration.

Files ready:

- ✅ `prisma/schema.prisma` - Idempotency model added
- ✅ `src/services/idempotency.ts` - Full service implementation
- ✅ `src/services/pipeline/run-analysis.ts` - Pipeline orchestration

## Activation Steps

### 1. Run Database Migration

```bash
# Connect to database and run migration
pnpm db:migrate "add_idempotency_model"

# Verify migration succeeded
pnpm db:generate
```

This will create the `idempotency` table with:

- `key` (PK) - Client-provided idempotency key
- `status` - PENDING | SUCCEEDED | FAILED
- `fingerprint` - Request parameter hash
- `resultId` - Analysis ID if succeeded
- `errorCode` / `errorMessage` - If failed
- `lockedAt` / `lockedUntil` - For lock timeout
- `expiresAt` - Key expiration (24 hours)

### 2. Verify TypeScript Types

After migration, regenerate Prisma client:

```bash
pnpm db:generate
```

Verify types are generated:

- `IdempotencyStatus` enum
- `prisma.idempotency` model

### 3. Update API Route

Currently `/api/analyze` directly calls `analyzeContract()`. After migration, update to use the pipeline:

```typescript
// app/api/analyze/route.ts

import { runAnalysis } from "@/src/services/pipeline/run-analysis";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  // 1. Check quota/credits (existing)
  const quotaCheck = await requireQuotaOrUserCredit("/api/analyze");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.error }, { status: 402 });
  }

  // 2. Parse request body
  const { textClean, contractType, filename, idempotencyKey } = await request.json();

  // 3. Run analysis pipeline with idempotency
  const result = await runAnalysis({
    userId: quotaCheck.userId || quotaCheck.guestId!,
    isGuest: quotaCheck.isGuest,
    textClean,
    contractType,
    filename: filename || "contract.pdf",
    idempotencyKey: idempotencyKey || uuidv4(), // Auto-generate if not provided
  });

  // 4. Return result
  return NextResponse.json(
    {
      analysisId: result.analysisId,
      analysis: result.analysis,
      isReplay: result.isReplay,
      creditsRemaining: result.creditsRemaining,
    },
    {
      status: 200,
      headers: result.creditsRemaining
        ? { "x-credits-remaining": String(result.creditsRemaining) }
        : {},
    }
  );
}
```

### 4. Client-Side Integration

Update client to send idempotency keys:

```typescript
// Generate stable idempotency key per upload
const idempotencyKey = `analysis_${fileId}_${Date.now()}`;

const response = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    textClean,
    contractType,
    filename,
    idempotencyKey, // Include key
  }),
});

const data = await response.json();

if (data.isReplay) {
  console.log("Replay detected - no credit charged");
}

console.log(`Credits remaining: ${response.headers.get("x-credits-remaining")}`);
```

### 5. Periodic Cleanup

Set up a cron job to clean expired idempotency records:

```typescript
// app/api/cron/cleanup-idempotency/route.ts

import { cleanupExpiredIdempotencyRecords } from "@/src/services/idempotency";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupExpiredIdempotencyRecords();

  return NextResponse.json({
    success: true,
    deleted,
  });
}
```

Configure Vercel cron:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-idempotency",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Testing

### Unit Tests

```typescript
// tests/idempotency.spec.ts

test("withIdempotency prevents duplicate execution", async () => {
  const key = "test_key_123";
  const fingerprint = createFingerprint({ foo: "bar" });

  let execCount = 0;
  const fn = async () => {
    execCount++;
    return "result_id";
  };

  // First call - should execute
  const result1 = await withIdempotency(key, fingerprint, fn);
  expect(result1.isReplay).toBe(false);
  expect(execCount).toBe(1);

  // Second call - should replay
  const result2 = await withIdempotency(key, fingerprint, fn);
  expect(result2.isReplay).toBe(true);
  expect(execCount).toBe(1); // Not executed again
});
```

### Integration Tests

```typescript
// tests/run-analysis.spec.ts

test("runAnalysis charges credits only once", async () => {
  const user = await createTestUser({ credits: 10 });
  const idempotencyKey = "test_analysis_xyz";

  // First request
  const result1 = await runAnalysis({
    userId: user.id,
    isGuest: false,
    textClean: "Contract text...",
    contractType: "FREELANCE",
    filename: "test.pdf",
    idempotencyKey,
  });

  expect(result1.isReplay).toBe(false);
  expect(result1.creditsRemaining).toBe(9);

  // Retry with same key
  const result2 = await runAnalysis({
    userId: user.id,
    isGuest: false,
    textClean: "Contract text...",
    contractType: "FREELANCE",
    filename: "test.pdf",
    idempotencyKey, // Same key
  });

  expect(result2.isReplay).toBe(true);
  expect(result2.analysisId).toBe(result1.analysisId); // Same analysis
  expect(result2.creditsRemaining).toBe(9); // No additional charge
});
```

## Rollback

If issues occur after migration:

1. Revert API route to direct `analyzeContract()` call
2. Keep table for future use (data is harmless)
3. Investigate errors in logs
4. Fix and redeploy

## Benefits After Activation

- ✅ No double-charging on browser refresh
- ✅ Safe retries on network errors
- ✅ Idempotent API (HTTP best practice)
- ✅ Audit trail (all requests logged)
- ✅ Prevents race conditions
- ✅ Observable (telemetry for replays)

## Monitoring

After activation, monitor:

```sql
-- Check replay rate
SELECT
  COUNT(*) FILTER (WHERE status = 'SUCCEEDED') as total_requests,
  COUNT(*) FILTER (WHERE "createdAt" < "updatedAt") as replays
FROM idempotency;

-- Find slow requests
SELECT key, "createdAt", "lockedUntil"
FROM idempotency
WHERE status = 'PENDING'
  AND "lockedUntil" < NOW();
```

## Next Steps

1. Run migration when database is accessible
2. Test in development environment
3. Deploy to staging first
4. Monitor replay rate and errors
5. Deploy to production with gradual rollout
