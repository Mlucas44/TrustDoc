# TrustDoc

Document trust verification platform built with Next.js 16, TypeScript, and App Router.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development with strict mode enabled
- **React 19** - Latest React with Server Components
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible and customizable component library
- **Playwright** - End-to-end testing
- **ESLint** - Code linting
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js 20.9 or later (required by Next.js 16)
- pnpm (install with `npm install -g pnpm`)

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers (first time only)
pnpm exec playwright install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

TrustDoc uses **type-safe, validated environment variables**. You must configure them before running the app.

**Quick setup**:

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Edit with your credentials (see .env.example for details)

# 3. Validate configuration
pnpm env:check
```

**Available variables**:

| Variable                        | Scope  | Required | Description                     |
| ------------------------------- | ------ | -------- | ------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Client | Yes      | Public app URL                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client | Yes      | Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Yes      | Supabase public key             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server | Yes      | Supabase private key            |
| `NEXTAUTH_URL`                  | Server | Yes      | NextAuth callback URL           |
| `NEXTAUTH_SECRET`               | Server | Yes      | NextAuth JWT secret (≥32 chars) |
| `GOOGLE_CLIENT_ID`              | Server | Yes      | Google OAuth client ID          |
| `GOOGLE_CLIENT_SECRET`          | Server | Yes      | Google OAuth secret             |
| `OPENAI_API_KEY`                | Server | Yes      | OpenAI API key                  |
| `OLLAMA_BASE_URL`               | Server | No       | Ollama local LLM URL            |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Client | Yes      | Stripe publishable key          |
| `STRIPE_SECRET_KEY`             | Server | Yes      | Stripe secret key               |
| `STRIPE_WEBHOOK_SECRET`         | Server | Yes      | Stripe webhook secret           |
| `RATE_LIMIT_WINDOW`             | Server | No       | Rate limit window (seconds)     |
| `RATE_LIMIT_MAX`                | Server | No       | Max requests per window         |

📚 **Full documentation**: [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md)

### Development

```bash
# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
# Create production build
pnpm build

# Start production server
pnpm start
```

### Environment Validation

```bash
# Validate all environment variables
pnpm env:check

# Print variables (secrets hidden)
pnpm env:print
```

### Code Quality

```bash
# Lint with ESLint
pnpm lint              # Check
pnpm lint:fix          # Auto-fix

# Format with Prettier
pnpm format            # Format all files
pnpm format:check      # Check formatting

# TypeScript type checking
pnpm typecheck
```

**Pre-commit hooks**: Husky + lint-staged automatically run lint and format on staged files before each commit.

### Authentication

TrustDoc uses **NextAuth v5** with database sessions (Prisma + Supabase PostgreSQL).

#### Server Components (RSC)

Use server-side helpers for authentication in React Server Components:

```tsx
// Read session (returns null if not authenticated)
import { getSession } from "@/src/auth/session";

export default async function MyPage() {
  const session = await getSession();
  if (!session) return <p>Please sign in</p>;
  return <p>Welcome {session.user.email}</p>;
}

// Require session (redirects if not authenticated)
import { requireSession } from "@/src/auth/session";

export default async function ProtectedPage() {
  const session = await requireSession({
    callbackUrl: "/dashboard", // Return here after sign-in
  });
  return <p>Protected content</p>;
}

// Get current user from database
import { getCurrentUser } from "@/src/auth/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please sign in</p>;
  return <p>Credits: {user.credits}</p>;
}

// Require current user (throws UnauthorizedError if not authenticated)
import { requireCurrentUser } from "@/src/auth/current-user";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  return (
    <p>
      Welcome {user.name}, you have {user.credits} credits
    </p>
  );
}
```

#### Client Components

Use client-side hooks for authentication in Client Components:

```tsx
"use client";
import { useSessionClient } from "@/src/auth/use-session";

export function MyComponent() {
  const { data: session, status } = useSessionClient();

  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated") return <p>Please sign in</p>;

  return <p>Welcome {session.user.email}</p>;
}

// Require authentication (auto-redirect if not authenticated)
("use client");
import { useRequireAuth } from "@/src/auth/use-require-auth";

export function ProtectedComponent() {
  const { session, loading } = useRequireAuth();

  if (loading) return <p>Loading...</p>;

  return <p>Protected content for {session.user.email}</p>;
}

// Use AuthGate component for conditional rendering
import { AuthGate } from "@/components/auth/auth-gate";

export function MyComponent() {
  return (
    <AuthGate>
      <ProtectedContent />
    </AuthGate>
  );
}

// Display credits badge
import { CreditsBadge } from "@/components/auth/credits-badge";

export function Navbar() {
  return (
    <nav>
      <CreditsBadge />
    </nav>
  );
}
```

#### Callback URL Pattern

After successful authentication, users are redirected back to the page they came from:

```tsx
// Link to sign-in with callback URL
<Link href="/auth/signin?callbackUrl=/dashboard">Sign in</Link>;

// Server-side redirect with callback
import { requireSession } from "@/src/auth/session";

const session = await requireSession({
  callbackUrl: "/dashboard",
});

// Client-side redirect with callback (automatic in useRequireAuth)
const { session } = useRequireAuth({
  preserveCallbackUrl: true, // default: true
});
```

📚 **Full documentation**: [docs/NEXTAUTH_SETUP.md](docs/NEXTAUTH_SETUP.md)

### Guest Mode (Free Trial)

TrustDoc allows unauthenticated users to try the service with **3 free analyses per browser**.

#### How it works

- **Guest Identification**: Each browser gets a unique guest ID stored in an httpOnly cookie (`td_guest_id`)
- **Quota Tracking**: Server-side database tracks usage (max 3 analyses)
- **Quota Reset**: Automatically resets after 30 days
- **Seamless Upgrade**: Sign in to switch from guest quota to user credits

#### Data Model

```typescript
// Guest quota stored in PostgreSQL
model GuestQuota {
  id        String   @id  // UUID v4 guest identifier
  used      Int      // Number of analyses consumed (0-3)
  createdAt DateTime
  expiresAt DateTime // 30 days from creation
}
```

#### Cookies Used

| Cookie           | Type     | Purpose                    | Duration |
| ---------------- | -------- | -------------------------- | -------- |
| `td_guest_id`    | httpOnly | Guest identifier (UUID v4) | 30 days  |
| `td_guest_quota` | httpOnly | Quick UX hint (used count) | 30 days  |

**Security**: All cookies are httpOnly, sameSite=lax, and signed server-side. No client-side tampering possible.

#### API Endpoints

```typescript
// Initialize guest session
POST /api/guest/init
→ { guestId, used, remaining, limit, limitReached }

// Get current quota status
GET /api/guest/status
→ { guestId, used, remaining, limit, limitReached }
// limitReached: true when remaining === 0 (quota exhausted)
```

#### Usage in Code

```typescript
// Server-side: Check quota before analysis
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";

const quotaCheck = await requireQuotaOrUserCredit();
if (!quotaCheck.allowed) {
  return NextResponse.json(
    { error: quotaCheck.error, code: quotaCheck.errorCode },
    { status: 402 }
  );
}

// After successful analysis
if (quotaCheck.isGuest) {
  await consumeGuestQuota(quotaCheck.guestId);
}
```

```tsx
// Client-side: Display quota progress
import { GuestProgress } from "@/components/guest/guest-progress";
import { GuestQuotaExceededDialog } from "@/components/guest/guest-quota-exceeded-dialog";

<GuestProgress showProgress />
<GuestQuotaExceededDialog open={showDialog} onOpenChange={setShowDialog} />
```

#### Behavior & Limits

- ✅ **First visit**: Initializes guestId, shows 0/3
- ✅ **After 3 successful analyses**: 4th attempt blocked with upgrade CTA
- ✅ **Failed analysis** (parsing error): Does NOT increment quota
- ✅ **Sign in**: Guest mode disabled, switches to user credits
- ✅ **New browser**: Separate guestId and independent quota
- ✅ **Cookie cleared**: New guestId created, quota resets
- ⏰ **30 days later**: Quota automatically resets

### Credit Management (Authenticated Users)

TrustDoc uses a **credit-based system** for authenticated users. Each analysis consumes 1 credit.

#### Credit Operations

**User Repository** (`src/db/user.repo.ts`):

```typescript
import { UserRepo, InsufficientCreditsError } from "@/src/db/user.repo";

// Get user's credit balance
const credits = await UserRepo.getCredits(userId);

// Consume credits transactionally (atomic operation)
const { remaining } = await UserRepo.consumeCredits(userId, 1);

// Set credits (admin operation)
await UserRepo.setCredits(userId, 10);
```

**Credits Service** (`src/services/credits.ts`):

```typescript
import { requireCredits, consumeOnSuccess } from "@/src/services/credits";

// Validate sufficient credits
await requireCredits(userId, 1);

// Execute operation and consume credits only on success
const result = await consumeOnSuccess(
  userId,
  async () => {
    // Perform document analysis
    return await analyzeDocument(fileBuffer);
  },
  1 // credits to consume
);
```

#### Credit Flow (Recommended Pattern)

1. **Verify credits** - Check user has sufficient credits
2. **Execute operation** - Perform the analysis/task
3. **Consume credits** - Deduct credits only if operation succeeds

```typescript
// Example: Analysis endpoint
import { ensureHasCredits } from "@/src/middleware/credits-guard";
import { UserRepo } from "@/src/db/user.repo";

export async function POST(request: Request) {
  // 1. Check credits
  const creditsCheck = await ensureHasCredits(1);
  if (!creditsCheck.allowed) {
    return NextResponse.json(
      { error: creditsCheck.error, code: creditsCheck.errorCode },
      { status: creditsCheck.errorCode === "UNAUTHENTICATED" ? 401 : 402 }
    );
  }

  try {
    // 2. Execute operation
    const result = await analyzeDocument(fileBuffer);

    // 3. Consume credits (only on success)
    await UserRepo.consumeCredits(creditsCheck.userId!, 1);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // Credits NOT consumed on failure
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
```

#### API Endpoints

```typescript
// Get user's credit balance
GET /api/credits
→ { credits: 10, userId: "..." }
// Requires authentication (401 if not authenticated)

// Get user profile with credits
GET /api/me
→ { id, email, credits, name, image }
```

#### Middleware Guards

```typescript
// Check if user has sufficient credits
import { ensureHasCredits } from "@/src/middleware/credits-guard";

const result = await ensureHasCredits(1);
if (!result.allowed) {
  // Handle error (401 Unauthorized or 402 Insufficient Credits)
}

// Unified guard (checks user credits OR guest quota)
import { requireQuotaOrUserCredit } from "@/src/middleware/quota-guard";

const quotaCheck = await requireQuotaOrUserCredit();
if (!quotaCheck.allowed) {
  // errorCode: "INSUFFICIENT_CREDITS" | "GUEST_QUOTA_EXCEEDED" | "USER_NOT_FOUND"
}
```

#### Client-Side Components

```tsx
// Display user's credit balance (real-time with SWR)
import { CreditsBadge } from "@/components/auth/credits-badge";

<CreditsBadge refreshInterval={30000} />; // Refreshes every 30s

// Show insufficient credits dialog
import { InsufficientCreditsAlert } from "@/components/credits/insufficient-credits-alert";

<InsufficientCreditsAlert
  open={showAlert}
  onOpenChange={setShowAlert}
  currentCredits={0}
  requiredCredits={1}
/>;
```

#### Error Handling (402 Payment Required)

When credits are insufficient, API returns **402 status code**:

```typescript
// Client-side error handling
const response = await fetch("/api/analyze", {
  method: "POST",
  body: formData,
});

if (response.status === 402) {
  const { error, code } = await response.json();
  // code: "INSUFFICIENT_CREDITS"
  // Show InsufficientCreditsAlert dialog
  setShowInsufficientCreditsAlert(true);
}
```

#### Transaction Safety

All credit operations use **Prisma transactions** for atomicity:

```typescript
// UserRepo.consumeCredits implementation
static async consumeCredits(userId: string, count = 1) {
  return prisma.$transaction(async (tx) => {
    // 1. Read user (with row lock)
    const user = await tx.user.findUnique({ where: { id: userId } });

    // 2. Check sufficient credits
    if (user.credits < count) {
      throw new InsufficientCreditsError(userId, count, user.credits);
    }

    // 3. Decrement credits
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: count } },
    });

    return { remaining: updated.credits };
  });
}
```

This ensures **race conditions are prevented** when multiple requests occur simultaneously.

#### Credits Guard (Blocking Expensive Operations)

TrustDoc uses **guard middleware** to block expensive operations (LLM calls, PDF parsing) when users have insufficient credits. The guard executes **early in the request lifecycle** to minimize wasted resources.

**How it works:**

1. **Early Check** - Guard runs BEFORE expensive operations
2. **Fast Rejection** - Returns 402 immediately if credits insufficient
3. **Telemetry** - Logs all refusals with userId, route, duration
4. **Guest Support** - Automatically handles guest quota OR user credits

**Guard Order of Execution:**

```typescript
// In protected API routes:
export async function POST(request: NextRequest) {
  // 1. FIRST: Check quota/credits (fast, ~10ms)
  const quotaCheck = await requireQuotaOrUserCredit("/api/analyze");

  if (!quotaCheck.allowed) {
    // Return 402 immediately - NO expensive operations executed
    return NextResponse.json(
      { error: quotaCheck.error, code: quotaCheck.errorCode },
      { status: 402 }
    );
  }

  // 2. THEN: Proceed with expensive operations (LLM, parsing, etc.)
  const analysis = await analyzeContract(...);

  // 3. FINALLY: Consume credits after success
  await UserRepo.consumeCredits(userId, 1);
}
```

**Protected Endpoints:**

- `POST /api/upload` - File upload validation
- `POST /api/parse` - PDF text extraction
- `POST /api/prepare` - Text normalization
- `POST /api/analyze` - LLM contract analysis

**Error Response Format:**

When credits are insufficient, API returns 402 with standardized payload:

```json
{
  "error": "Insufficient credits. You have 0 credits, but 1 is required.",
  "code": "INSUFFICIENT_CREDITS"
}
```

For guests:

```json
{
  "error": "Guest quota exceeded (3/3). Please sign in to continue.",
  "code": "GUEST_QUOTA_EXCEEDED"
}
```

**Client-Side Handling:**

```typescript
// Client code example
const response = await fetch("/api/analyze", {
  method: "POST",
  body: JSON.stringify({ textClean, contractType }),
});

if (response.status === 402) {
  const { code } = await response.json();

  if (code === "INSUFFICIENT_CREDITS") {
    // Show "Buy Credits" dialog
    showInsufficientCreditsDialog();
  } else if (code === "GUEST_QUOTA_EXCEEDED") {
    // Show "Sign In" dialog
    showSignInDialog();
  }
}
```

**Centralized Error Handling:**

Use `toJsonError()` utility for consistent error responses:

```typescript
import { toJsonError } from "@/src/middleware/httpErrors";

try {
  await analyzeContract(...);
} catch (error) {
  // Automatically maps to correct status code:
  // - InsufficientCreditsError → 402
  // - GuestQuotaExceededError → 402
  // - LLMRateLimitError → 429
  // - LLMTransientError → 503
  // - AnalysisInvalidError → 422
  return toJsonError(error);
}
```

**Telemetry & Logging:**

All credit guard refusals are logged with telemetry data:

```typescript
// Example log output (development)
[requireQuotaOrUserCredit] Insufficient credits (402) {
  userId: "clx...",
  credits: 0,
  route: "/api/analyze",
  duration: "8.42ms",
  timestamp: "2025-01-15T10:30:00.000Z"
}
```

**Benefits:**

- ✅ **Cost Savings** - No LLM calls wasted on insufficient credits
- ✅ **Fast Response** - Guard executes in ~10ms (no DB queries for guest mode)
- ✅ **Better UX** - Clear error messages with upgrade path
- ✅ **Observable** - All refusals logged with context
- ✅ **Consistent** - Centralized error mapping across all routes

#### Credit Consumption (Analysis Pipeline)

TrustDoc ensures credits are charged **exactly once per successful analysis** with idempotency protection.

**Pipeline Order:**

```typescript
// 1. Guard checks credits BEFORE expensive operations
const quotaCheck = await requireQuotaOrUserCredit("/api/analyze");
if (!quotaCheck.allowed) return 402;

// 2. Run analysis pipeline (LLM → Persist → Debit)
const result = await runAnalysis({
  userId,
  isGuest,
  textClean,
  contractType,
  filename,
  idempotencyKey, // Client-provided for replay protection
});

// 3. Credits consumed ONLY if analysis succeeds
// Transaction: INSERT Analysis + UPDATE User.credits -= 1
```

**Atomic Transaction:**

All credit operations use **Prisma transactions** for atomicity:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Verify credits (with row lock)
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (user.credits < 1) throw new Error("Insufficient credits");

  // 2. Create analysis
  const analysis = await tx.analysis.create({ data: {...} });

  // 3. Consume credit (decrement by 1)
  await tx.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } },
  });

  // All or nothing - if any step fails, entire transaction rolls back
});
```

**Idempotency Protection:**

Prevents duplicate charges on retries/refreshes:

```typescript
// Client sends idempotency key
const response = await fetch("/api/analyze", {
  method: "POST",
  body: JSON.stringify({
    textClean,
    contractType,
    idempotencyKey: `analysis_${fileId}_${timestamp}`, // Stable key per upload
  }),
});

const data = await response.json();

if (data.isReplay) {
  // Request was duplicate - no credit charged
  console.log("Using cached result from previous analysis");
} else {
  // New analysis - 1 credit charged
  console.log(`Credits remaining: ${data.creditsRemaining}`);
}
```

**When Credits Are Consumed:**

| Scenario                                 | Credit Charged?   | Reason                                     |
| ---------------------------------------- | ----------------- | ------------------------------------------ |
| Analysis succeeds                        | ✅ Yes (1 credit) | Transaction commits after analysis + debit |
| Parse error (PDF invalid)                | ❌ No             | Error before LLM call                      |
| LLM timeout/error                        | ❌ No             | Transaction not started                    |
| Validation error (output invalid)        | ❌ No             | Transaction rolled back                    |
| Duplicate request (same idempotency key) | ❌ No             | Replay detected, cached result returned    |
| User refreshes page                      | ❌ No             | Same idempotency key = replay              |

**Preventing Over-Debits:**

1. **Pre-check**: Guard verifies credits > 0 before starting
2. **Transaction check**: Re-verify credits inside transaction (race condition protection)
3. **Atomic decrement**: `credits: { decrement: 1 }` prevents negative balance
4. **Idempotency**: Duplicate requests don't charge (24-hour key expiration)
5. **No retry charging**: Failed analyses never consume credits

**Telemetry:**

Credit consumption is fully logged:

```typescript
// Example log output
[persistAndConsumeCredits] Analysis clx_abc123 created {
  userId: "clx_user789",
  debit: 1,
  remaining: 9
}

[runAnalysis] Analysis pipeline completed successfully in 3420.52ms {
  analysisId: "clx_abc123",
  isReplay: false,
  creditsRemaining: 9
}

// Replay detected
[withIdempotency] Replay detected for key idem_xyz, status: SUCCEEDED
[runAnalysis] Idempotency replay for key idem_xyz {
  status: "SUCCEEDED",
  resultId: "clx_abc123"
}
```

**Setup:**

⚠️ **Requires database migration** - See [IDEMPOTENCY_SETUP.md](IDEMPOTENCY_SETUP.md) for activation steps.

Current implementation includes:

- ✅ Prisma schema (Idempotency model)
- ✅ Service with mutex + DB locking
- ✅ Pipeline orchestration (LLM → Persist → Debit)
- ✅ Full documentation

After migration:

1. Run `pnpm db:migrate "add_idempotency_model"`
2. Update `/api/analyze` to use `runAnalysis()` pipeline
3. Client sends `idempotencyKey` with each request

### File Upload (Secure PDF Storage)

TrustDoc provides secure, temporary file upload to Supabase Storage for PDF contract analysis.

#### Key Features

- **Private Storage**: Files stored in private Supabase bucket (no public access)
- **File Validation**: PDF only, max 10 MB
- **Rate Limiting**: 5 uploads per minute per IP
- **Temporary Storage**: Files automatically deleted after analysis
- **Mock Mode**: Local development without Supabase configuration

#### Supabase Bucket Setup

Create a private bucket named `contracts-temp`:

1. Go to **Storage** → **Buckets** in Supabase dashboard
2. Create bucket: `contracts-temp` (Private, 10 MB limit, PDF only)
3. Apply RLS policies (service role only):

```sql
-- Policy 1: Service role can upload
CREATE POLICY "Service role can upload files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'contracts-temp');

-- Policy 2: Service role can read
CREATE POLICY "Service role can read files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'contracts-temp');

-- Policy 3: Service role can delete
CREATE POLICY "Service role can delete files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'contracts-temp');
```

📚 **Full setup guide**: [docs/SUPABASE_STORAGE_SETUP.md](docs/SUPABASE_STORAGE_SETUP.md)

#### Environment Variables

```bash
# Supabase (required for production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upload configuration
UPLOAD_MAX_SIZE_MB=10
UPLOAD_ALLOWED_MIME_TYPES=application/pdf

# Development: Mock mode (bypass Supabase, save locally)
MOCK_STORAGE=false
```

#### API Endpoint

```typescript
POST /api/upload
Content-Type: multipart/form-data

// Request body
FormData {
  file: File (PDF, ≤10 MB)
}

// Success (200)
{
  fileId: "cm4x5y6z7",
  filename: "cm4x5y6z7-1699123456789.pdf",
  size: 2048576,
  mimeType: "application/pdf",
  path: "user-abc123/cm4x5y6z7-1699123456789.pdf"
}

// Errors
401 Unauthorized - Not authenticated
402 Payment Required - Insufficient credits or quota exceeded
413 Payload Too Large - File exceeds 10 MB
415 Unsupported Media Type - File is not a PDF
429 Too Many Requests - Rate limit exceeded (5/min)
500 Internal Server Error - Upload failed
```

#### Client Component

```tsx
import { UploadDropzone } from "@/components/upload/upload-dropzone";

<UploadDropzone
  onUploadSuccess={(result) => {
    console.log("Uploaded:", result.fileId);
    // Proceed to analysis with result.fileId
  }}
  onUploadError={(error) => {
    console.error("Upload failed:", error.error);
  }}
/>;
```

#### File Lifecycle

1. **Upload**: User uploads PDF via dropzone
2. **Validation**: Size (≤10 MB), type (PDF), quota/credits
3. **Storage**: Saved to `contracts-temp/{user-id}/{fileId}.pdf`
4. **Analysis**: Document parsed and analyzed
5. **Cleanup**: File automatically deleted after analysis

#### Mock Mode (Local Development)

For local development without Supabase:

```bash
# .env.local
MOCK_STORAGE=true
```

Files will be saved to `./temp/uploads/` instead of Supabase Storage.

#### File Naming Convention

```
contracts-temp/
  ├── user-{userId}/
  │   └── {cuid}-{timestamp}.pdf
  └── guest-{guestId}/
      └── {cuid}-{timestamp}.pdf
```

Example: `user-abc123/cm4x5y6z7-1699123456789.pdf`

**Benefits**:

- User isolation (easy cleanup per user)
- Unique filenames (CUID prevents collisions)
- Timestamped (traceable uploads)

#### Security Measures

- ✅ **Private bucket** - No public URLs
- ✅ **RLS policies** - Service role only
- ✅ **Server-side upload** - Client never gets service role key
- ✅ **MIME validation** - PDF only
- ✅ **Size validation** - 10 MB maximum
- ✅ **Rate limiting** - 5 uploads/min/IP
- ✅ **Temporary storage** - Auto-delete after analysis
- ✅ **Quota/credit check** - Before accepting upload

### PDF Text Extraction (Multi-Page)

TrustDoc extracts text from uploaded PDFs with multi-page support and metadata extraction.

#### Key Features

- **Multi-page support**: Extracts text from all pages with separators
- **Page separators**: `--- PAGE {n} ---` for clause extraction
- **Metadata extraction**: Title, author, producer, creator, creation date
- **Scanned PDF detection**: Rejects PDFs with no extractable text
- **Timeout protection**: 20-second limit for parsing
- **Size validation**: Maximum 10 MB (enforced at upload and parse)

#### API Endpoint

```typescript
POST /api/parse
Content-Type: application/json

// Request body
{
  filePath: "user-abc123/cm4x5y6z7-1699123456789.pdf"
}

// Success (200)
{
  pages: 15,
  textLength: 12543,
  textRaw: "Page 1 content...\n\n--- PAGE 2 ---\n\nPage 2 content...",
  meta: {
    title: "Contract Agreement",
    author: "John Doe",
    producer: "Adobe PDF Library",
    creator: "Microsoft Word",
    creationDate: "D:20240101120000Z"
  }
}

// Errors
400 Bad Request - Missing or invalid filePath
401 Unauthorized - Not authenticated
402 Payment Required - Insufficient credits or quota exceeded
404 Not Found - File not found in storage (FILE_NOT_FOUND)
413 Payload Too Large - PDF exceeds 10 MB (PDF_TOO_LARGE)
422 Unprocessable Entity - Scanned PDF with no text (PDF_TEXT_EMPTY_OR_SCANNED)
500 Internal Server Error - Parse failed (PARSE_FAILED)
504 Gateway Timeout - Parsing took >20s (PARSE_TIMEOUT)
```

#### Usage Flow

```typescript
// 1. Upload PDF
const uploadResponse = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});
const { filePath } = await uploadResponse.json();

// 2. Parse PDF
const parseResponse = await fetch("/api/parse", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filePath }),
});
const { pages, textLength, textRaw, meta } = await parseResponse.json();

// 3. Proceed to analysis with extracted text
console.log(`Extracted ${textLength} characters from ${pages} pages`);
```

#### Page Separators

Text is extracted with page separators for clause identification:

```
Contract content from page 1...

--- PAGE 2 ---

Contract content from page 2...

--- PAGE 3 ---

Contract content from page 3...
```

This allows the AI to reference specific pages when identifying clauses.

#### Scanned PDF Detection

PDFs are validated for text content:

- **Minimum text length**: 50 characters
- **Minimum alphanumeric**: 50 characters
- **Rejection**: Returns 422 with `PDF_TEXT_EMPTY_OR_SCANNED`

**OCR is NOT supported**. Users must provide text-based PDFs.

#### Timeout Protection

Parsing has a 20-second timeout to prevent worker blocking:

- Large PDFs (>10 MB) are rejected at upload
- Complex PDFs may timeout → user should simplify
- Timeout returns 504 with `PARSE_TIMEOUT`

#### Security Measures

- ✅ **Path validation** - Prevents path traversal attacks
- ✅ **Format validation** - Only `{user|guest}-{id}/{fileId}.pdf`
- ✅ **Size validation** - 10 MB maximum (re-checked at parse)
- ✅ **Timeout protection** - 20-second limit
- ✅ **No binary exposure** - Binary never returned to client
- ✅ **Dev-only logging** - File IDs logged, not content

#### Error Handling

```typescript
try {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePath }),
  });

  if (response.status === 422) {
    // Scanned PDF - ask user for text-based version
    alert("Please provide a text-based PDF (OCR not supported)");
  } else if (response.status === 413) {
    // File too large
    alert("PDF exceeds 10 MB limit");
  } else if (response.status === 504) {
    // Parsing timeout
    alert("PDF is too complex. Please simplify or use a smaller file.");
  }
} catch (error) {
  console.error("Parse failed:", error);
}
```

### Text Normalization & Cleanup

TrustDoc normalizes and cleans extracted PDF text for optimal LLM processing.

#### Key Features

- **Space normalization**: Removes extra spaces, normalizes line breaks
- **Ligature conversion**: ﬁ→fi, ﬂ→fl, ﬀ→ff
- **Hyphen word joining**: Rejoins words split across lines (contrac-\ntion → contraction)
- **Header/footer removal**: Detects and removes repeated headers/footers (>50% of pages)
- **Page separator removal**: Removes --- PAGE N --- markers
- **List normalization**: Converts exotic bullets (•, ◦, ▪) to standard dash (-)
- **Metadata cleanup**: Removes PDF producer signatures
- **Heading detection**: Identifies document structure (SECTION 1, 1.1, etc.)
- **Title extraction**: Detects document title from first lines
- **Token estimation**: Approximate token count (chars/4 heuristic)

#### API Endpoint

```typescript
POST /api/prepare
Content-Type: application/json

// Request body
{
  filePath: "user-abc123/cm4x5y6z7-1699123456789.pdf"
}

// Success (200)
{
  textClean: "CONTRAT DE PRESTATION DE SERVICES\n\n1. Objet du contrat...",
  textTokensApprox: 3200,
  stats: {
    pages: 5,
    textLengthRaw: 15420,
    textLengthClean: 12850,
    removedHeaderFooterRatio: 0.15,
    hyphenJoins: 8,
    linesMerged: 142,
    truncated: false
  },
  meta: {
    title: "Contract Agreement",
    author: "John Doe",
    producer: "Adobe PDF Library"
  },
  sections: {
    title: "CONTRAT DE PRESTATION DE SERVICES",
    headings: [
      { level: 1, text: "SECTION 1 - DEFINITIONS", index: 12 },
      { level: 2, text: "1.1 Termes généraux", index: 15 },
      { level: 1, text: "SECTION 2 - OBLIGATIONS", index: 45 }
    ]
  }
}

// Errors
400 Bad Request - Missing or invalid filePath
401 Unauthorized - Not authenticated
402 Payment Required - Insufficient credits or quota exceeded
404 Not Found - File not found (FILE_NOT_FOUND)
413 Payload Too Large - PDF too large (PDF_TOO_LARGE)
422 Unprocessable Entity - No text OR text too short after cleanup
  - PDF_TEXT_EMPTY_OR_SCANNED (scanned PDF)
  - TEXT_TOO_SHORT_AFTER_CLEANUP (< 200 chars after cleanup)
500 Internal Server Error - Processing failed (PARSE_FAILED / PREPARE_ERROR)
504 Gateway Timeout - Processing took >20s (PREPARE_TIMEOUT)
```

#### Usage Flow

```typescript
// Option A: Two-step (parse then normalize separately)
const parseResponse = await fetch("/api/parse", { ... });
const { textRaw } = await parseResponse.json();
// ... normalize client-side or send to another endpoint

// Option B: One-step (recommended - uses /api/prepare)
const prepareResponse = await fetch("/api/prepare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filePath }),
});

if (prepareResponse.ok) {
  const { textClean, textTokensApprox, stats, sections } = await prepareResponse.json();

  console.log(`Ready for LLM: ${textTokensApprox} tokens`);
  console.log(`Found ${sections.headings.length} headings`);

  // Send textClean to LLM for analysis
}
```

#### Normalization Rules

**1. Space & Line Break Normalization:**

- Converts CRLF to LF
- Removes trailing spaces
- Compresses multiple spaces to one
- Merges lines intelligently (preserves lists and headings)
- Normalizes paragraph breaks (3+ newlines → 2)

**2. Ligatures & Special Characters:**

- Ligatures: ﬁ→fi, ﬂ→fl, ﬀ→ff, ﬃ→ffi, ﬄ→ffl
- Quotes: ""→", ''→'
- Dashes: —→" - ", –→"-"
- Apostrophes: '→'
- Ellipsis: …→"..."

**3. Hyphenated Word Joining:**
Rejoins words split across line breaks:

```
Before: "Cette obliga-\ntion doit être..."
After:  "Cette obligation doit être..."
```

**4. List Normalization:**
Converts exotic bullets to standard format:

```
• Item 1  →  - Item 1
◦ Item 2  →  - Item 2
* Item 3  →  - Item 3
```

**5. Header/Footer Removal:**
Detects lines appearing on >50% of pages and removes them:

```
Page 1 footer: "© 2024 Company - Confidential"
Page 2 footer: "© 2024 Company - Confidential"
→ Removed from all pages
```

**6. Heading Detection:**

Detects document structure using heuristics:

- **Level 1**: ALL CAPS (SECTION 1), ARTICLE/SECTION keywords
- **Level 2**: Numbered (1., 1.1), Title Case headings
- **Level 3**: Clause/Article markers

**7. Metadata Cleanup:**
Removes PDF producer signatures:

```
"Generated by Adobe Acrobat"  →  Removed
"PDF Producer: Microsoft Word"  →  Removed
```

#### Statistics

The `stats` object provides insights:

- `textLengthRaw`: Original text length
- `textLengthClean`: Cleaned text length
- `removedHeaderFooterRatio`: 0-1 (0.15 = 15% removed)
- `hyphenJoins`: Number of hyphenated words rejoined
- `linesMerged`: Number of lines merged
- `truncated`: true if text exceeded 200k chars

#### Limits

- **Minimum text**: 200 characters after cleanup
- **Maximum text**: 200,000 characters (truncated if exceeded)
- **Timeout**: 20-second processing limit

#### Debug Mode

Enable debug output in development:

```bash
# .env.local
TEXT_DEBUG=1
```

Creates files in `temp/text-debug/`:

- `{fileId}-raw.txt` - Raw extracted text
- `{fileId}-clean.txt` - Normalized text

**⚠️ Never enable in production** (exposes document content to filesystem)

#### Error Handling

```typescript
const response = await fetch("/api/prepare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filePath }),
});

if (response.status === 422) {
  const { code } = await response.json();

  if (code === "PDF_TEXT_EMPTY_OR_SCANNED") {
    alert("PDF is scanned. OCR not supported.");
  } else if (code === "TEXT_TOO_SHORT_AFTER_CLEANUP") {
    alert("Document has insufficient text content.");
  }
} else if (response.ok) {
  const prepared = await response.json();
  // Ready for LLM analysis
}
```

### Contract Type Detection

TrustDoc automatically detects the type of contract using a hybrid approach combining fast heuristics and LLM validation.

#### Supported Contract Types

| Type            | Description                      | Examples                                        |
| --------------- | -------------------------------- | ----------------------------------------------- |
| **CGU**         | Terms of Service / General Terms | Platform T&Cs, user agreements, CGU/CGV         |
| **FREELANCE**   | Independent Contractor Agreement | Freelance contracts, consulting agreements, MSA |
| **EMPLOI**      | Employment Contract              | CDI, CDD, labor contracts                       |
| **NDA**         | Non-Disclosure Agreement         | Confidentiality agreements, secrecy agreements  |
| **DEVIS**       | Quote / Estimate                 | Price quotes, proposals, estimates              |
| **PARTENARIAT** | Partnership Agreement            | Collaboration agreements, joint ventures, MOU   |
| **AUTRE**       | Other / Unknown                  | Documents that don't fit above categories       |

#### Detection Strategy

**1. Heuristic Detection (Fast, < 200ms)**:

- Title/header matching with bilingual aliases (FR/EN)
- Weighted keyword scoring (discriminant terms)
- Structural pattern matching (articles, clauses)
- Evidence extraction with context

**2. LLM Validation (When Needed, < 1.5s)**:

- Called only if heuristic confidence < 0.8
- OpenAI GPT-4o-mini for cost-efficiency
- Budget-optimized prompts (≤ 300 tokens)
- JSON-structured responses

**3. Hybrid Orchestration**:

- Use heuristic if confidence ≥ 0.8 (fast path)
- Call LLM for validation if confidence < 0.8
- Combine results with weighted scoring
- Rate limiting (5 LLM calls max, refill 0.5/sec)

#### API Endpoints

**Standalone Detection**:

```typescript
POST /api/detect-type
Content-Type: application/json

// Request
{
  textClean: "Normalized contract text..."
}

// Success (200)
{
  type: "FREELANCE",
  confidence: 0.92,
  source: "hybrid",  // "heuristic", "llm", or "hybrid"
  evidence: [
    "Contains 'prestation de services' and 'facturation'",
    "Mentions 'indépendant' and 'livrables'",
    ...
  ],
  reason: "LLM confirmed freelance agreement with high confidence"
}

// Errors
400 Bad Request - Missing or invalid textClean
422 Unprocessable Entity - Text too short (< 200 chars)
500 Internal Server Error - Detection failed
```

**Integrated in Pipeline**:

The `/api/prepare` endpoint automatically includes contract type detection:

```typescript
POST /api/prepare
Content-Type: application/json

// Request
{
  filePath: "user-abc123/document.pdf"
}

// Response includes contractType
{
  textClean: "...",
  textTokensApprox: 11250,
  stats: { ... },
  meta: { ... },
  sections: { ... },
  contractType: {
    type: "FREELANCE",
    confidence: 0.92,
    source: "hybrid",
    evidence: [...],
    reason: "..."
  }
}
```

#### Usage Example

```typescript
// Method 1: Standalone detection
const detectResponse = await fetch("/api/detect-type", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ textClean: normalizedText }),
});

const { type, confidence, source, evidence } = await detectResponse.json();
console.log(`Detected: ${type} (confidence: ${confidence}, source: ${source})`);

// Method 2: Integrated in prepare pipeline
const prepareResponse = await fetch("/api/prepare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filePath: "user-abc/doc.pdf" }),
});

const { textClean, contractType } = await prepareResponse.json();
console.log(`Contract type: ${contractType.type} (${contractType.confidence})`);
```

#### Performance Characteristics

- **Heuristic only**: < 200ms for 5-10k characters
- **Heuristic + LLM**: < 1.5s total (budget-controlled)
- **Rate limiting**: Max 5 LLM calls, refill 0.5/sec (1 every 2 seconds)
- **No content leakage**: Only short excerpts (≤ 200 chars) in evidence

#### Keyword Examples

**CGU Keywords**: utilisateur, service, plateforme, cookies, "données personnelles", "propriété intellectuelle"

**FREELANCE Keywords**: prestations, mission, facturation, indépendant, livrables, honoraires, "taux journalier"

**EMPLOI Keywords**: CDI, CDD, "période d'essai", salaire, "congés payés", hiérarchie, "convention collective"

**NDA Keywords**: confidentiel, confidentialité, divulgation, "durée de confidentialité", "informations protégées"

**DEVIS Keywords**: devis, acceptation, validité, "prix HT", "prix TTC", acompte, "bon de commande"

**PARTENARIAT Keywords**: partenariat, coopération, "joint marketing", "exclusivité territoriale", collaboration

#### Limitations

- **Mixed documents**: Documents containing multiple contract types (e.g., CGU with NDA clause) will be classified as the dominant type
- **Bilingual support**: Currently optimized for French and English; other languages may have lower accuracy
- **Custom templates**: Non-standard contract structures may require manual review
- **Confidence threshold**: Low confidence (< 0.5) results in "AUTRE" classification

### Contract Analysis (LLM)

TrustDoc analyzes contracts using LLM (OpenAI or local Ollama) with strict JSON schema validation to ensure structured, reliable output.

#### Analysis Components

**Summary** (5-8 bullet points):

- Clear, concise key points about the contract
- Focus on main obligations and rights
- Simple, understandable language

**Risk Score** (0-100):

- 0-30: Low risk (fair, balanced contract)
- 31-60: Medium risk (some unfavorable clauses)
- 61-100: High risk (very unfavorable, potential traps)
- Includes justification explaining the score

**Red Flags** (0-N problematic clauses):

- Title: Brief description
- Severity: low | medium | high
- Why: Explanation of the problem
- Clause excerpt: Exact text from contract

**Clauses** (key contract sections):

- Extracted based on contract type
- FREELANCE: Objet de la mission, Rémunération, Livrables, etc.
- EMPLOI: Poste, Durée, Période d'essai, Rémunération, etc.
- CGU: Objet du service, Données personnelles, Responsabilité, etc.
- NDA: Définition confidentialité, Obligations, Durée, etc.

#### API Endpoint

```typescript
POST /api/analyze
Content-Type: application/json

// Request
{
  textClean: "Normalized contract text...",
  contractType: "FREELANCE"  // or CGU, EMPLOI, NDA, DEVIS, PARTENARIAT, AUTRE
}

// Success (200)
{
  "analysis": {
    "summary": [
      "Contrat de prestation de services entre freelance et client",
      "Mission limitée à 3 mois renouvelable",
      "Rémunération forfaitaire de 5000€ HT",
      "Propriété intellectuelle transférée au client",
      "Clause de confidentialité standard"
    ],
    "riskScore": 45,
    "riskJustification": "Score modéré dû à une clause de résiliation unilatérale par le client sans préavis.",
    "redFlags": [
      {
        "title": "Résiliation unilatérale sans préavis",
        "severity": "medium",
        "why": "Le client peut résilier à tout moment sans justification ni préavis.",
        "clause_excerpt": "Le Client pourra résilier le présent contrat à tout moment..."
      }
    ],
    "clauses": [
      {
        "type": "Objet de la mission",
        "text": "Le Prestataire s'engage à réaliser pour le Client..."
      },
      {
        "type": "Rémunération & facturation",
        "text": "La rémunération est fixée à 5000€ HT..."
      }
    ]
  }
}

// Errors
400 Bad Request - Missing or invalid input
401 Unauthorized - Not authenticated
402 Payment Required - Insufficient credits or quota exceeded
422 Unprocessable Entity - LLM output invalid after retries (ANALYSIS_INVALID_OUTPUT)
500 Internal Server Error - LLM service error (ANALYSIS_FAILED)
```

#### JSON Schema Validation

All LLM outputs are validated with Zod schemas:

```typescript
// AnalysisSchema
{
  summary: string[],           // 3-10 items, 10-500 chars each
  riskScore: number,            // integer 0-100
  riskJustification: string,    // 20-1000 chars
  redFlags: RedFlag[],          // 0-N items
  clauses: Clause[]             // contract-specific clauses
}

// RedFlagSchema
{
  title: string,                // 1-200 chars
  severity: "low" | "medium" | "high",
  why: string,                  // 10-1000 chars
  clause_excerpt: string        // 10-500 chars
}

// ClauseSchema
{
  type: string,                 // 1-100 chars (e.g., "Durée & renouvellement")
  text: string                  // 10-2000 chars
}
```

#### Validation & Retry Logic

1. **Initial LLM Call**: Request JSON output from GPT-4o-mini
2. **Parse & Validate**: Parse JSON and validate with Zod schema
3. **If Valid**: Return result immediately
4. **If Invalid**: Retry with repair prompt (max 2 attempts)
   - Send validation errors back to LLM
   - Request corrected JSON output
5. **After Max Retries**: Throw `AnalysisInvalidError` (422 status)

This ensures:

- ✅ Structured output (no free-form text)
- ✅ Type-safe data for frontend
- ✅ Reliable database storage
- ✅ Reduced hallucinations

#### Ollama Support (Local LLM)

TrustDoc supports local LLM inference via Ollama:

```bash
# Set environment variables
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434/v1  # default

# Recommended models
ollama pull mistral
ollama pull llama2
```

**Benefits**:

- No API costs (runs locally)
- Data privacy (contracts never leave your machine)
- Offline capability

**Trade-offs**:

- Slower than OpenAI (depends on hardware)
- May produce lower quality analysis
- Requires GPU for good performance

#### Usage Example

```typescript
// Complete pipeline: Upload → Parse → Normalize → Detect → Analyze
const formData = new FormData();
formData.append("file", pdfFile);

// 1. Upload PDF
const uploadResponse = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});
const { filePath } = await uploadResponse.json();

// 2. Prepare text (parse + normalize + detect type)
const prepareResponse = await fetch("/api/prepare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filePath }),
});
const { textClean, contractType } = await prepareResponse.json();

// 3. Analyze contract
const analyzeResponse = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    textClean,
    contractType: contractType.type,
  }),
});

const { analysis } = await analyzeResponse.json();

console.log(`Risk score: ${analysis.riskScore}/100`);
console.log(`Red flags: ${analysis.redFlags.length}`);
console.log(`Summary: ${analysis.summary.join(" • ")}`);
```

#### Limitations & Known Issues

**Schema Enforcement**:

- LLMs may occasionally produce invalid JSON despite prompts
- Retry logic handles most cases (success rate ~95%)
- Complex contracts may require 2-3 attempts

**Hallucinations**:

- LLMs may misinterpret ambiguous clauses
- Red flags should be manually verified
- Not a substitute for legal advice

**Performance**:

- OpenAI: ~2-5 seconds per analysis
- Ollama (local): ~10-30 seconds (depends on hardware)
- Large contracts (>50k chars) may take longer

**Token Limits**:

- Maximum 200k characters per analysis
- Very long contracts are truncated by normalization pipeline

### Testing

```bash
# Run Playwright tests
pnpm test

# Run tests with UI mode
pnpm test:ui
```

## Project Structure

```
TrustDoc/
├── app/                    # Next.js App Router directory
│   ├── api/               # API routes
│   │   └── health/        # Health check endpoint
│   │       └── route.ts   # GET /api/health
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── tests/                 # Playwright integration tests
│   └── app.spec.ts        # Application tests
├── .eslintrc.json         # ESLint configuration
├── .gitignore             # Git ignore rules
├── next.config.ts         # Next.js configuration
├── package.json           # Dependencies and scripts
├── playwright.config.ts   # Playwright configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## API Endpoints

### Health Checks

**GET** `/api/health`

Returns the application health status.

**Response:**

```json
{
  "status": "ok"
}
```

**GET** `/api/health/db`

Verifies database connectivity and performance.

**Success Response (200):**

```json
{
  "status": "ok",
  "db": "ok",
  "responseTime": 42,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response (503):**

```json
{
  "status": "error",
  "db": "error",
  "error": "Connection timeout",
  "responseTime": 5003,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Features

- **TypeScript Strict Mode** - Maximum type safety
- **React Strict Mode** - Development warnings and best practices
- **App Router** - File-system based routing with React Server Components
- **Integration Tests** - Automated testing with Playwright
- **Code Quality** - ESLint + Prettier with pre-commit hooks (Husky)
- **CI/CD** - GitHub Actions with matrix testing (Node 18/20)

## Claude Code Custom Commands

Ce projet inclut des commandes personnalisées pour faciliter le développement avec Claude Code :

- `/commit [message]` - Prépare et crée un commit propre
- `/check [options]` - Vérifie la qualité du code (typecheck, lint, build, tests)
- `/feature <description>` - Crée une nouvelle fonctionnalité complète
- `/fix <problème>` - Analyse et corrige les erreurs
- `/review [scope]` - Revue de code et suggestions
- `/doc [sujet]` - Génère ou met à jour la documentation

Consultez [.claude/commands/README.md](.claude/commands/README.md) pour plus de détails.

## UI Components & Design System

TrustDoc utilise **Tailwind CSS** et **shadcn/ui** pour le design system.

### Composants disponibles

- **Button** - Bouton avec variantes (default, secondary, outline, ghost, link)
- **Card** - Carte avec header, content, footer
- **Badge** - Badge de statut
- **Input/Textarea** - Champs de formulaire
- **Label** - Labels accessibles
- **Dialog** - Modales
- **Tabs** - Onglets
- **Toast** - Notifications
- **RiskScoreBadge** - Badge de niveau de risque (Low/Medium/High)
- **RiskGauge** - Jauge visuelle de score de risque avec animation

### Dark Mode

Le dark mode est activé par défaut avec le toggle dans la navbar:

- Thème clair/sombre/système
- Basé sur `next-themes`
- CSS variables pour les couleurs

### Documentation complète

Consultez [docs/UI_COMPONENTS.md](docs/UI_COMPONENTS.md) pour:

- Guide d'utilisation de chaque composant
- Exemples de code
- Conventions et bonnes pratiques
- Comment ajouter de nouveaux composants

### Styleguide

Visualisez tous les composants sur [http://localhost:3000/styleguide](http://localhost:3000/styleguide)

### Risk Visualization

Les composants de visualisation de risque permettent d'afficher le score et le niveau de risque des contrats analysés de manière claire et accessible.

#### Risk Thresholds (Seuils de risque)

Les niveaux de risque sont définis dans `src/constants/risk.ts`:

| Level  | Score Range | Color  | Badge Style                     |
| ------ | ----------- | ------ | ------------------------------- |
| Low    | 0 - 33      | Green  | `bg-green-100 text-green-800`   |
| Medium | 34 - 66     | Yellow | `bg-yellow-100 text-yellow-800` |
| High   | 67 - 100    | Red    | `bg-red-100 text-red-800`       |

#### RiskScoreBadge Component

Badge coloré affichant le niveau de risque.

**Props**:

```typescript
{
  score: number;          // Score de risque (0-100)
  size?: "sm" | "md" | "lg"; // Taille du badge (défaut: "md")
  showScore?: boolean;    // Afficher le score numérique (défaut: false)
  className?: string;     // Classes CSS additionnelles
}
```

**Exemples d'utilisation**:

```tsx
import { RiskScoreBadge } from "@/src/components/analysis/RiskScoreBadge";

// Badge simple
<RiskScoreBadge score={25} />
// Affiche: "Low" (badge vert)

// Avec score numérique
<RiskScoreBadge score={57} showScore />
// Affiche: "Medium (57)" (badge jaune)

// Taille large
<RiskScoreBadge score={85} size="lg" />
// Affiche: "High" (badge rouge, plus grand)
```

#### RiskGauge Component

Jauge visuelle complète avec barre de progression, score numérique, et texte de justification.

**Props**:

```typescript
{
  score: number;          // Score de risque (0-100)
  justification?: string; // Texte explicatif du score
  animate?: boolean;      // Animation du score (défaut: true)
  className?: string;     // Classes CSS additionnelles
}
```

**Exemples d'utilisation**:

```tsx
import { RiskGauge } from "@/src/components/analysis/RiskGauge";

// Jauge simple
<RiskGauge score={42} />

// Avec justification
<RiskGauge
  score={57}
  justification="Multiple unclear clauses regarding payment terms and intellectual property rights require clarification."
/>

// Sans animation (pour tests ou captures)
<RiskGauge score={85} animate={false} />
```

**Intégration dans une page de résultat**:

```tsx
import { RiskScoreBadge } from "@/src/components/analysis/RiskScoreBadge";
import { RiskGauge } from "@/src/components/analysis/RiskGauge";

export function AnalysisResultPage({ analysis }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{analysis.filename}</CardTitle>
            <CardDescription>Analyzed {analysis.createdAt}</CardDescription>
          </div>
          <RiskScoreBadge score={analysis.riskScore} showScore size="lg" />
        </div>
      </CardHeader>
      <CardContent>
        <RiskGauge score={analysis.riskScore} justification={analysis.riskJustification} />
      </CardContent>
    </Card>
  );
}
```

#### Accessibility Features

Les composants de visualisation de risque sont conçus pour être accessibles:

- **ARIA Labels**: Tous les composants incluent des `aria-label` descriptifs
  - Badge: `aria-label="Risk score: Medium (57%)"`
  - Gauge: `role="region" aria-label="Risk score gauge"`
  - Progress: `role="progressbar" aria-valuenow="57" aria-valuemin="0" aria-valuemax="100"`

- **Contrast Ratios**: Conformité WCAG AA
  - Mode clair: contraste optimal sur fond blanc
  - Mode sombre: couleurs ajustées automatiquement via `dark:` variants

- **Animations**: Accessibles et désactivables
  - Animation douce du score (1 seconde)
  - Peut être désactivée avec `animate={false}`
  - Respecte `prefers-reduced-motion` (à implémenter)

#### Testing

Les tests sont disponibles dans `tests/risk-visualization.spec.ts`:

```bash
# Exécuter les tests de visualisation de risque
pnpm test tests/risk-visualization.spec.ts

# Tests avec UI mode
pnpm test:ui tests/risk-visualization.spec.ts
```

**Couverture des tests**:

- ✅ Classification des niveaux de risque (getRiskLevel)
- ✅ Seuils de frontière (33, 66, 100)
- ✅ Variantes de couleur des badges (vert/jaune/rouge)
- ✅ Rendu de la barre de progression
- ✅ Affichage du score numérique
- ✅ Labels de niveau de risque
- ✅ Affichage du texte de justification
- ✅ Attributs d'accessibilité (ARIA)
- ✅ Compatibilité mode sombre
- ✅ Ratios de contraste visuel

---

## Red Flags List

### Overview

The Red Flags List components provide a comprehensive UI for displaying contract red flags with severity levels, search, filtering, and copy functionality. The system includes:

- **Type-safe data structures** for red flags with severity levels
- **RedFlagItem component** for individual red flag display
- **RedFlagList component** with search and filtering
- **useRedFlags hook** for state management
- **Clipboard utility** with toast feedback

### Components

#### RedFlagItem

Displays a single red flag in a card format.

**Props:**

| Prop        | Type        | Default     | Description              |
| ----------- | ----------- | ----------- | ------------------------ |
| `flag`      | `UiRedFlag` | Required    | Red flag data to display |
| `className` | `string`    | `undefined` | Additional CSS classes   |

**Example:**

```tsx
import { RedFlagItem } from "@/src/components/analysis/RedFlagItem";

<RedFlagItem
  flag={{
    id: "rf_1",
    title: "Unlimited Liability Clause",
    severity: "high",
    why: "This clause exposes you to unlimited financial liability...",
    clause_excerpt: 'Section 7.3: "The Contractor shall be liable..."',
  }}
/>;
```

**Features:**

- Severity badge with color coding (green/yellow/red)
- "Why this matters" explanation text
- Scrollable clause excerpt (max 1500 characters)
- Copy to clipboard button with toast feedback
- Icons from lucide-react based on severity
- Full accessibility support

#### RedFlagList

Displays a filterable, searchable list of red flags.

**Props:**

| Prop              | Type                                   | Default     | Description                   |
| ----------------- | -------------------------------------- | ----------- | ----------------------------- |
| `items`           | `UiRedFlag[]`                          | Required    | Array of red flags to display |
| `defaultSeverity` | `"low" \| "medium" \| "high" \| "all"` | `"all"`     | Initial severity filter       |
| `defaultSearch`   | `string`                               | `""`        | Initial search query          |
| `showCount`       | `boolean`                              | `true`      | Show count of filtered items  |
| `className`       | `string`                               | `undefined` | Additional CSS classes        |

**Example:**

```tsx
import { RedFlagList } from "@/src/components/analysis/RedFlagList";

<RedFlagList items={redFlags} defaultSeverity="all" showCount />;
```

**Features:**

- Search by title or "why" text
- Filter by severity level (all/low/medium/high)
- Automatic sorting: high → medium → low, then alphabetically
- Item counter with aria-live updates
- Empty state with helpful message
- Fully accessible with ARIA labels

### Hook: useRedFlags

Manages red flags filtering, searching, and sorting with memoization.

**Usage:**

```typescript
import { useRedFlags } from "@/src/hooks/useRedFlags";

function MyComponent({ redFlags }: { redFlags: UiRedFlag[] }) {
  const {
    filteredItems,
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,
    totalCount,
    filteredCount
  } = useRedFlags(redFlags, {
    defaultSeverity: "all",
    defaultSearch: ""
  });

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <p>Showing {filteredCount} of {totalCount} red flags</p>
      {filteredItems.map(flag => <RedFlagItem key={flag.id} flag={flag} />)}
    </div>
  );
}
```

**Return Value:**

| Property            | Type                       | Description                   |
| ------------------- | -------------------------- | ----------------------------- |
| `filteredItems`     | `UiRedFlag[]`              | Filtered and sorted red flags |
| `searchQuery`       | `string`                   | Current search query          |
| `setSearchQuery`    | `(query: string) => void`  | Update search query           |
| `severityFilter`    | `RedFlagSeverity \| "all"` | Current severity filter       |
| `setSeverityFilter` | `(severity) => void`       | Update severity filter        |
| `totalCount`        | `number`                   | Total items before filtering  |
| `filteredCount`     | `number`                   | Number of filtered items      |

### Types

```typescript
// Severity level
export type RedFlagSeverity = "low" | "medium" | "high";

// Base red flag structure (from API)
export interface RedFlag {
  title: string;
  severity: RedFlagSeverity;
  why: string;
  clause_excerpt: string;
}

// UI red flag with client-generated ID
export interface UiRedFlag extends RedFlag {
  id: string; // Generated with nanoid
}
```

### Severity Configuration

**Labels:**

- `high` → "High"
- `medium` → "Medium"
- `low` → "Low"

**Sort Order:**

1. High severity items first
2. Medium severity items second
3. Low severity items last
4. Within same severity: alphabetical by title

**Color Schemes:**

| Severity | Badge  | Text   | Background     | Icon           |
| -------- | ------ | ------ | -------------- | -------------- |
| High     | Red    | Red    | Red (light)    | alert-triangle |
| Medium   | Yellow | Yellow | Yellow (light) | alert-circle   |
| Low      | Green  | Green  | Green (light)  | info           |

### Clipboard Utility

```typescript
import { copyToClipboard } from "@/src/lib/clipboard";

async function handleCopy() {
  try {
    await copyToClipboard(text);
    toast({ title: "Copied!" });
  } catch (error) {
    toast({ title: "Copy failed", variant: "destructive" });
  }
}
```

**Features:**

- Uses modern Clipboard API when available
- Fallback to `document.execCommand()` for older browsers
- Type-safe with TypeScript

### Integration Example

```tsx
"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { RedFlagList } from "@/src/components/analysis/RedFlagList";
import type { RedFlag, UiRedFlag } from "@/src/types/red-flag";

export function AnalysisResultPage({ analysis }) {
  // Convert API red flags to UI red flags
  const redFlags: UiRedFlag[] = analysis.red_flags.map((flag: RedFlag) => ({
    ...flag,
    id: nanoid(), // Generate client-side ID
  }));

  return (
    <div className="space-y-6">
      <h2>Contract Red Flags</h2>
      <RedFlagList items={redFlags} />
    </div>
  );
}
```

### Accessibility

All components follow WCAG AA standards:

- ✅ Proper ARIA labels on all interactive elements
- ✅ `role="article"` for red flag items
- ✅ `role="status"` with `aria-live="polite"` for count updates
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Color contrast ratios meet WCAG AA
- ✅ Screen reader friendly text

### Clause Excerpt Length

Clause excerpts are automatically truncated:

- **Maximum length**: 1500 characters
- **Format**: Monospace font in scrollable container
- **Max height**: 300px with scroll
- **Truncation indicator**: "..." appended when truncated

### Testing

Run tests with Playwright:

```bash
pnpm test tests/red-flags.spec.ts
```

**Test Coverage:**

- ✅ Red flag item rendering
- ✅ Severity badge display
- ✅ Search functionality
- ✅ Severity filtering
- ✅ Sorting behavior
- ✅ Copy button functionality
- ✅ Empty state display
- ✅ Accessibility attributes
- ✅ Dark mode compatibility
- ✅ ARIA live regions

---

## Deployment

### Vercel (Recommended)

1. **Push to GitHub** (if not already done)

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your repository
   - Vercel auto-detects Next.js configuration

3. **Configure Environment Variables**:
   - Go to **Project Settings** → **Environment Variables**
   - Add all variables from [Variable Reference](#environment-variables)
   - Set appropriate scopes (Production/Preview/Development)
   - Use different credentials for Production vs. Preview

4. **Deploy**:
   - Vercel automatically deploys on push to `main`
   - Preview deployments for all PRs
   - Build fails if environment variables are invalid (fail-fast)

📚 **Detailed guide**: [docs/ENVIRONMENT_VARIABLES.md#vercel-deployment](docs/ENVIRONMENT_VARIABLES.md#vercel-deployment)

### Environment Variables on Vercel

**Required for all environments**:

- All variables from the [table above](#environment-variables)
- Use production values for Production
- Use test/staging values for Preview

**Important**: Set `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to match your deployment URL:

```bash
# Production
NEXT_PUBLIC_APP_URL=https://trustdoc.com
NEXTAUTH_URL=https://trustdoc.com

# Preview (use your Vercel preview URL)
NEXT_PUBLIC_APP_URL=https://trustdoc-git-main.vercel.app
NEXTAUTH_URL=https://trustdoc-git-main.vercel.app
```

## Database

TrustDoc uses **PostgreSQL** via **Supabase** with **Prisma ORM** for type-safe database access.

### Connection Pooling Architecture

```
Next.js App Router → PrismaClient (Singleton) → pgBouncer → PostgreSQL (Supabase)
```

**Why pooling?**
Serverless environments (like Vercel) create new function instances that can exhaust database connections. Connection pooling via pgBouncer ensures:

- ✅ Stable response times under load
- ✅ No "too many connections" errors
- ✅ Efficient connection reuse
- ✅ Automatic retry for transient failures

### Quick Setup

1. **Get Supabase Connection Strings**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard) → Settings → Database
   - Copy **two** connection strings:
     - **Transaction pooler** (port 6543) → for `DATABASE_URL`
     - **Direct connection** (port 5432) → for `SHADOW_DATABASE_URL`

2. **Add to `.env.local`**:

   ```bash
   # POOLED connection (for runtime queries via pgBouncer)
   DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=5&connect_timeout=5&sslmode=require

   # DIRECT connection (for migrations, no pooling)
   SHADOW_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
   ```

   **Important query parameters:**
   - `pgbouncer=true` - Enable pgBouncer mode
   - `connection_limit=1` - Limit to 1 connection per client (serverless best practice)
   - `pool_timeout=5` - Timeout after 5s if pool exhausted
   - `connect_timeout=5` - Connection establishment timeout
   - `sslmode=require` - Force SSL encryption

3. **Run Migrations**:

   ```bash
   pnpm db:generate    # Generate Prisma Client
   pnpm db:migrate     # Create tables (uses SHADOW_DATABASE_URL)
   pnpm db:seed        # Add test data (optional)
   ```

4. **Verify Database Health**:

   ```bash
   # Start dev server
   pnpm dev

   # Check database connectivity
   curl http://localhost:3000/api/health/db
   # Should return: {"status":"ok","db":"ok","responseTime":42,...}
   ```

5. **Open Prisma Studio** (optional):
   ```bash
   pnpm db:studio      # Visual database browser
   ```

### Runtime Requirements

**API Routes using Prisma must force Node.js runtime** (not Edge):

```typescript
// app/api/your-route/route.ts
export const runtime = "nodejs"; // Required for Prisma
```

Edge Runtime doesn't support Prisma's native database drivers. All database operations must run in Node.js runtime.

### Database Schema

**User Model**:

- `id` (PK), `email` (unique), `credits` (≥0)
- Relations: User → Analysis (1-N)

**Analysis Model**:

- `id` (PK), `userId` (FK), `filename`, `type` (enum)
- `summary`, `riskScore` (0-100), `redFlags`, `clauses`
- Soft-delete support (`deletedAt`)

**Contract Types**: CGU, FREELANCE, EMPLOI, NDA, DEVIS, PARTENARIAT, AUTRE

### Database Scripts

```bash
pnpm db:generate         # Generate Prisma Client
pnpm db:migrate          # Create/apply migrations
pnpm db:seed             # Seed test data
pnpm db:studio           # Open Prisma Studio GUI
pnpm db:reset            # Reset database (deletes all data!)
```

📚 **Full documentation**: [docs/DATABASE.md](docs/DATABASE.md)

- Entity relationship diagram
- Complete schema reference
- Repository pattern usage
- Migration guide
- Troubleshooting

## Code Quality & Conventions

TrustDoc applique des standards stricts de qualité de code:

### Tools

- **ESLint 9** - Linting avec règles TypeScript/React avancées
- **Prettier** - Formatage automatique (printWidth 100, doubles quotes)
- **Husky** - Git hooks pre-commit
- **lint-staged** - Lint uniquement les fichiers modifiés

### Rules principales

- Import automatique des types avec `type` keyword
- Ordre des imports (builtin → external → internal → sibling)
- Suppression automatique des imports inutilisés
- Pas de `console.log` (warn, error autorisés)
- Balises React auto-fermantes
- TypeScript strict mode

### Workflow

1. Écrire le code
2. `pnpm lint:fix` - Auto-correction
3. `git commit` - Pre-commit hook vérifie automatiquement
4. CI vérifie: lint + format + typecheck + tests + build

### Documentation

Consultez [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) pour:

- Règles ESLint détaillées
- Configuration Prettier
- Troubleshooting
- Bonnes pratiques

## Next Steps

Refer to the [Next.js App Router documentation](https://nextjs.org/docs/app) for more information on:

- [Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## License

Private - All rights reserved
