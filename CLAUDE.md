# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TrustDoc** is a document trust verification platform that analyzes contracts and legal documents using AI. It detects contract types, identifies red flags, extracts key clauses, and calculates risk scores.

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript (strict mode), Prisma (PostgreSQL), NextAuth, Tailwind CSS + shadcn/ui, OpenAI API, Supabase Storage, Stripe.

## Development Commands

### Setup
```bash
pnpm install                  # Install dependencies
pnpm db:generate              # Generate Prisma client
pnpm db:migrate              # Run database migrations
pnpm env:check               # Validate environment variables
```

### Development
```bash
pnpm dev                     # Start dev server (localhost:3000)
pnpm typecheck              # Run TypeScript type checking
pnpm lint                   # Run ESLint
pnpm lint:fix               # Auto-fix linting issues
pnpm format                 # Format code with Prettier
```

### Database
```bash
pnpm db:studio              # Open Prisma Studio GUI
pnpm db:push                # Push schema changes to DB
pnpm db:seed                # Seed database with test data
pnpm db:reset               # Reset database (destructive)
```

### Testing
```bash
pnpm test:e2e               # Run Playwright E2E tests
pnpm test:e2e:ui            # Run tests in UI mode
```

### Build & Deploy
```bash
pnpm build                  # Production build (runs env:check automatically)
pnpm start                  # Start production server
```

## Architecture Overview

### API Pipeline: Stateless Two-Phase Analysis

The core analysis pipeline is split into two stateless API routes with durable storage:

1. **`POST /api/prepare`** - PDF Parsing & Text Extraction
   - Validates file path and quota/credits (does NOT consume yet)
   - Parses PDF from Supabase Storage
   - Normalizes text (removes headers/footers, joins hyphenated words)
   - Detects contract type (heuristic + LLM fallback)
   - Persists extracted text and metadata to `analysis_jobs` table
   - Returns `jobId` for next step
   - **Deletes original PDF** after successful extraction

2. **`POST /api/analyze`** - LLM Analysis & Credit Consumption
   - Fetches prepared text from `analysis_jobs` by `jobId`
   - Runs LLM analysis (OpenAI GPT-4) to extract risk score, red flags, clauses
   - Persists final analysis to `analyses` table
   - **Consumes credits in atomic transaction** with analysis persistence
   - Updates job status to `analyzed`
   - **Idempotent**: Returns cached result if already analyzed (no re-charge)

**Key Design Principles:**
- **Stateless**: No in-memory state between prepare/analyze - all data in DB
- **Durable**: Text stored in DB prevents MISSING_TEXT_CLEAN errors on retries
- **Atomic**: Credit consumption + analysis persistence in single transaction
- **Idempotent**: Using `analysis_jobs` status tracking (see [TESTING_API_PIPELINE.md](docs/TESTING_API_PIPELINE.md))

### Database Models (Prisma)

**Core Tables:**
- `users` - Authentication (NextAuth) + credit balance
- `analyses` - Completed analysis results (soft-deletable)
- `analysis_jobs` - Pipeline state storage (TTL 24h)
  - Stores `text_raw`, `text_clean`, `contract_type` between prepare→analyze
  - Status: `prepared` → `analyzed` | `failed`
- `guest_quotas` - Guest user limits (3 free analyses per browser via UUID cookie)
- `credit_ledger` - Audit trail for credit purchases (Stripe events)
- `idempotency` - Prevents duplicate credit charges (PENDING implementation - see [IDEMPOTENCY_SETUP.md](IDEMPOTENCY_SETUP.md))

**Important Note**: The idempotency system code exists in `src/services/idempotency.ts` and `src/services/pipeline/run-analysis.ts` but is **temporarily excluded from TypeScript compilation** (see `tsconfig.json` exclude). Migration `20251111222003_add_analysis_jobs` exists but idempotency table requires separate migration when ready to activate.

### Authentication & Authorization

- **NextAuth v5** with Google OAuth + Email magic links
- Session storage: Database strategy (recommended for serverless)
- New users get 3 free credits (`src/auth.ts` events callback)
- Guest mode: UUID cookie-based quota (3 analyses max, 30-day expiration)
- Server-side auth helpers:
  - `src/auth/current-user.ts` - Get current user in Server Components
  - `src/auth/session.ts` - Get session in Server Actions
- Client-side: `src/auth/use-session.ts` hook

### Credit System

- **1 credit = 1 analysis**
- Credit packs purchasable via Stripe (defined in `src/constants/billing.ts`)
- Credits consumed **only after successful analysis** (atomic with DB persistence)
- Guest users bypass credits, use quota instead
- Middleware: `src/middleware/quota-guard.ts` checks credits before analysis

### Rate Limiting

Configured per-route in `src/constants/rate.ts`:
- `/api/prepare`: 5 requests/min per IP
- `/api/analyze`: 3 requests/5min per IP
- Uses in-memory rate limiter (`src/middleware/rate-limit.ts`)
- Configurable via env vars: `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX`

### File Storage

- **Supabase Storage** for PDF uploads
- File naming: `{user-userId|guest-guestId}/{fileId}-{timestamp}.pdf`
- Validation: Path format enforced by Zod regex in schemas
- **Lifecycle**: PDF deleted after successful text extraction in `/api/prepare`
- Service: `src/services/storage.ts`

### Environment Variables

All environment variables are **validated at runtime** using Zod schemas in `src/env.ts`:
- **Server**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, etc.
- **Client**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, etc.
- Run `pnpm env:check` to validate before deployment
- See [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) for full list

### Error Handling

Standardized error codes per route (see [TESTING_API_PIPELINE.md](docs/TESTING_API_PIPELINE.md)):
- Use `src/middleware/httpErrors.ts` for consistent error responses
- Custom error classes: `PdfParseError`, `TextTooShortError`, `StorageUploadError`, etc.
- All errors include `code` field for client-side handling

### Observability

- **Structured Logging**: `src/lib/logger.ts` + `src/lib/logger-events.ts`
  - Events: `analysis.prepared`, `analysis.started`, `analysis.completed`, `analysis.failed`
- **Request Tracing**: `src/middleware/request-id.ts` adds unique ID per request
- **Metrics**: `src/lib/metrics.ts` - Prometheus-compatible endpoint at `/api/_metrics`
- **Performance**: `src/lib/timing.ts` - Trace class for measuring operation durations

### UI Components (shadcn/ui)

- Components located in `src/components/ui/` (not tracked in git per shadcn convention)
- Custom analysis components in `src/components/analysis/`
- Tailwind CSS with custom theme in `tailwind.config.ts`
- Dark mode support via `next-themes`
- See [docs/UI_COMPONENTS.md](docs/UI_COMPONENTS.md) for component library

### Data Retention

- Soft delete for analyses: `deletedAt` timestamp
- Permanent deletion after 30 days (configurable)
- Cron jobs in `app/api/jobs/`:
  - `retention-analyses` - Soft delete old analyses
  - `purge-analyses` - Hard delete after retention period
  - `cleanup-pdfs` - Remove orphaned PDFs from storage
- See [docs/DATA_RETENTION.md](docs/DATA_RETENTION.md)

## Code Patterns

### Import Rules

Always use absolute imports with `@/` prefix:
```typescript
import { prisma } from "@/src/lib/prisma";        // ✅ Correct
import { prisma } from "../../../lib/prisma";     // ❌ Wrong
```

### Server-Only Code

Mark server-side modules with `"use server"` or import `"server-only"`:
```typescript
import "server-only";  // Prevents client bundle inclusion
```

Files like `src/lib/prisma.ts`, `src/services/llm/`, `src/db/` should NEVER be imported in client components.

### Database Queries

- Use Prisma Client: `src/lib/prisma.ts` (singleton instance)
- Repository pattern: `src/db/*.repo.ts` for reusable queries
- Always use transactions for multi-step operations (see `persistAndConsumeCredits` in `src/services/pipeline/run-analysis.ts`)

### API Route Structure

```typescript
// Standard API route template
export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  const trace = new Trace();

  // 1. Rate limiting
  const rateLimitResult = await checkRateLimitForRoute("/api/example");
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  // 2. Authentication & quota check
  const quotaCheck = await requireQuotaOrUserCredit("/api/example");
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { error: quotaCheck.error, code: quotaCheck.code },
      { status: quotaCheck.status }
    );
  }

  // 3. Validate request body with Zod
  const body = await request.json();
  const parsed = ExampleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", code: "INVALID_REQUEST_BODY", details: parsed.error.errors },
      { status: 400 }
    );
  }

  // 4. Business logic...

  // 5. Structured logging
  logAnalysisCompleted({ /* event data */ });

  return NextResponse.json({ success: true });
}
```

### Client Components

Use `"use client"` directive for components with hooks/interactivity:
```typescript
"use client";

import { useState } from "react";
import { useSession } from "@/src/auth/use-session";
```

### Zod Schemas

- Define schemas in `src/schemas/`
- Use for request validation, type inference, and error messages
- Example: `PrepareRequestSchema` in `src/schemas/analysis-job.ts`

## Testing API Pipeline Manually

See [TESTING_API_PIPELINE.md](docs/TESTING_API_PIPELINE.md) for complete curl examples to test:
- Nominal flow: prepare → analyze
- Idempotence: re-analyzing same job
- Error cases: invalid jobId, encrypted PDF, validation errors

## Known Issues & Workarounds

### TypeScript Exclusions

`tsconfig.json` currently excludes:
- `src/services/idempotency.ts`
- `src/services/pipeline/run-analysis.ts`

**Reason**: Idempotency table not yet migrated. Code is ready but requires DB migration to activate (see [IDEMPOTENCY_SETUP.md](IDEMPOTENCY_SETUP.md)).

### PDF Encrypted Files

- **pdf-parse v1.1.4** does not support password-protected PDFs
- Error is caught and returns user-friendly message
- Logs "Crypt" warning at debug level (non-blocking)
- Workaround: Ask users to remove password protection

### Testing

- Unit tests removed (previous Vitest setup)
- E2E tests available via Playwright (`pnpm test:e2e`)
- Manual API testing via curl recommended (see testing docs)

## Key Files Reference

- **Pipeline**: `src/services/pipeline/prepare-text.ts`, `app/api/prepare/route.ts`, `app/api/analyze/route.ts`
- **Database**: `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/db/*.repo.ts`
- **Auth**: `src/auth.ts`, `src/auth/current-user.ts`, `app/api/auth/[...nextauth]/route.ts`
- **LLM**: `src/services/llm/analysis.service.ts`, `src/services/llm/providers/openai.ts`
- **Storage**: `src/services/storage.ts`
- **Validation**: `src/env.ts`, `src/schemas/*.ts`
- **Middleware**: `src/middleware/rate-limit.ts`, `src/middleware/quota-guard.ts`, `src/middleware/request-id.ts`

## Important Constraints

- **Node.js**: ≥20.9.0 required (Next.js 16 requirement)
- **pnpm**: Required package manager (not npm/yarn)
- **Strict TypeScript**: No `any` types without explicit suppression
- **ESLint**: Must pass before commit (husky pre-commit hook via lint-staged)
- **Database**: PostgreSQL only (Prisma + Supabase)
- **Deployment**: Designed for Vercel (serverless)

## Additional Documentation

- [docs/DATABASE.md](docs/DATABASE.md) - Database schema and migrations
- [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) - Linting and formatting rules
- [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) - Logging and metrics
- [docs/RATE_LIMITING.md](docs/rate-limiting.md) - Rate limiting configuration
- [docs/NEXTAUTH_SETUP.md](docs/NEXTAUTH_SETUP.md) - Authentication setup
- [docs/SUPABASE_STORAGE_SETUP.md](docs/SUPABASE_STORAGE_SETUP.md) - File storage setup
