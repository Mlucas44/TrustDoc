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
→ { guestId, used, remaining, limit }

// Get current quota status
GET /api/guest/status
→ { guestId, used, remaining, limit }
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
