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
