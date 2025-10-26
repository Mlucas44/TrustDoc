# Environment Variables Guide

This guide explains how environment variables are configured, validated, and used in TrustDoc.

## Table of Contents

- [Overview](#overview)
- [Variable Reference](#variable-reference)
- [Local Setup](#local-setup)
- [Vercel Deployment](#vercel-deployment)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

TrustDoc uses **type-safe, validated environment variables** with runtime checks to prevent deployment with missing or invalid configuration.

### Key Features

- ✅ **Type-safe** - Full TypeScript support with autocomplete
- ✅ **Validated** - Runtime validation with Zod schemas
- ✅ **Client/Server separation** - Prevents accidental secret exposure
- ✅ **Fail-fast** - Build fails if variables are missing or invalid
- ✅ **CI/CD ready** - Automatic validation in GitHub Actions

### Architecture

```
src/env.ts                 # Environment validation & type definitions
├── serverSchema           # Private server-side variables
├── clientSchema           # Public client-side variables (NEXT_PUBLIC_*)
└── validateEnv()          # Runtime validation (runs at import)

.env.example               # Template with all variables
.env.local                 # Your local config (gitignored)
.env.ci                    # CI/CD test values (gitignored in production)
```

---

## Variable Reference

### App Configuration

| Variable              | Scope  | Required | Description            | Example                     |
| --------------------- | ------ | -------- | ---------------------- | --------------------------- |
| `NODE_ENV`            | Server | Yes      | Node environment       | `development`, `production` |
| `NEXT_PUBLIC_APP_URL` | Client | Yes      | Public URL of your app | `http://localhost:3000`     |

### Supabase (Database & Auth)

| Variable                        | Scope  | Required | Description                                 | Example                                                |
| ------------------------------- | ------ | -------- | ------------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client | Yes      | Supabase project URL                        | `https://xxx.supabase.co`                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Yes      | Public anon key                             | `eyJhbGciOiJIUzI1NiIs...`                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server | Yes      | Private service role key                    | `eyJhbGciOiJIUzI1NiIs...`                              |
| `DATABASE_URL`                  | Server | Yes      | **Pooled** Postgres connection (pgBouncer)  | `postgresql://postgres.xxx:[PWD]@...pooler...?pgbo...` |
| `SHADOW_DATABASE_URL`           | Server | No       | **Direct** Postgres connection (migrations) | `postgresql://postgres:[PWD]@db.xxx...?sslmode=...`    |

**Where to get**:

- **API keys**: [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API
- **Connection strings**: [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → Database

**Important**: `DATABASE_URL` must use the **Transaction pooler** (port 6543) with these query parameters:

```
?pgbouncer=true&connection_limit=1&pool_timeout=5&connect_timeout=5&sslmode=require
```

`SHADOW_DATABASE_URL` should use the **Direct connection** (port 5432) for running migrations:

```
?sslmode=require
```

See [README.md](../README.md#database) for detailed setup instructions.

### NextAuth (Authentication)

| Variable          | Scope  | Required | Description                       | Example                             |
| ----------------- | ------ | -------- | --------------------------------- | ----------------------------------- |
| `NEXTAUTH_URL`    | Server | Yes      | NextAuth callback URL             | `http://localhost:3000`             |
| `NEXTAUTH_SECRET` | Server | Yes      | JWT encryption secret (≥32 chars) | Generate: `openssl rand -base64 32` |

**Generate secret**:

```bash
openssl rand -base64 32
```

### OAuth Providers

| Variable               | Scope  | Required | Description            | Example                                    |
| ---------------------- | ------ | -------- | ---------------------- | ------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | Server | Yes      | Google OAuth client ID | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Server | Yes      | Google OAuth secret    | `GOCSPX-xxxxxxxxxxxxxxxxx`                 |

**Where to get**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client

### OpenAI / LLM

| Variable          | Scope  | Required | Description          | Example                      |
| ----------------- | ------ | -------- | -------------------- | ---------------------------- |
| `OPENAI_API_KEY`  | Server | Yes      | OpenAI API key       | `sk-proj-xxxxxxxxxxxxxxxxxx` |
| `OLLAMA_BASE_URL` | Server | No       | Ollama local LLM URL | `http://localhost:11434`     |

**Where to get**: [OpenAI Platform](https://platform.openai.com/api-keys)

### Stripe (Payments)

| Variable                        | Scope  | Required | Description            | Example                 |
| ------------------------------- | ------ | -------- | ---------------------- | ----------------------- |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Client | Yes      | Stripe publishable key | `pk_test_xxxxxxxxxxxxx` |
| `STRIPE_SECRET_KEY`             | Server | Yes      | Stripe secret key      | `sk_test_xxxxxxxxxxxxx` |
| `STRIPE_WEBHOOK_SECRET`         | Server | Yes      | Stripe webhook secret  | `whsec_xxxxxxxxxxxxxxx` |

**Where to get**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### Rate Limiting

| Variable            | Scope  | Required | Description               | Default | Example |
| ------------------- | ------ | -------- | ------------------------- | ------- | ------- |
| `RATE_LIMIT_WINDOW` | Server | No       | Window duration (seconds) | `60`    | `60`    |
| `RATE_LIMIT_MAX`    | Server | No       | Max requests per window   | `10`    | `10`    |

---

## Local Setup

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Fill in Your Values

Edit `.env.local` with your actual credentials. **Never commit this file!**

```bash
# Example .env.local
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Add your real credentials here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ... etc
```

### 3. Validate Configuration

```bash
# Check if all variables are valid
pnpm env:check

# Print variables (secrets are hidden)
pnpm env:print
```

### 4. Start Development

```bash
pnpm dev
```

If variables are missing or invalid, you'll see a descriptive error:

```
❌ Invalid server environment variables:
  - NEXTAUTH_SECRET: String must contain at least 32 character(s)
  - OPENAI_API_KEY: Required
```

---

## Vercel Deployment

### Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add each variable from [Variable Reference](#variable-reference)
4. Select the appropriate environment:
   - **Production** - Live site
   - **Preview** - PR deployments
   - **Development** - Local development (optional)

### Recommended Vercel Configuration

For each variable, set the **scope**:

| Variable Type            | Production | Preview | Development |
| ------------------------ | ---------- | ------- | ----------- |
| Public (`NEXT_PUBLIC_*`) | ✅         | ✅      | ✅          |
| Secrets (server-only)    | ✅         | ✅      | ❌          |

**Important**: Use **different values** for production vs. preview:

- Production: Real API keys, production database
- Preview: Test API keys, staging database

### Environment-Specific URLs

```bash
# Production
NEXT_PUBLIC_APP_URL=https://trustdoc.com
NEXTAUTH_URL=https://trustdoc.com

# Preview
NEXT_PUBLIC_APP_URL=https://trustdoc-git-main.vercel.app
NEXTAUTH_URL=https://trustdoc-git-main.vercel.app
```

---

## Security Best Practices

### ✅ DO

- **Use `.env.local` for local development** (gitignored)
- **Keep secrets in server variables** (no `NEXT_PUBLIC_` prefix)
- **Validate all variables** with Zod schemas
- **Use different credentials** for dev/staging/production
- **Rotate secrets regularly** (especially after team changes)
- **Import from `src/env.ts`** instead of `process.env`

### ❌ DON'T

- **Never commit `.env.local`** or any file with real credentials
- **Never use `NEXT_PUBLIC_` for secrets** (exposed to client!)
- **Never copy `process.env` wholesale** in Next.js config
- **Never hardcode credentials** in source code
- **Never share secrets via chat/email** (use secure tools)
- **Never use production secrets** in development

### Client vs. Server Variables

```typescript
// ✅ CORRECT: Client variable (safe to expose)
export default function HomePage() {
  const appUrl = env.client.NEXT_PUBLIC_APP_URL; // ✅ OK
  return <div>Visit: {appUrl}</div>;
}

// ❌ WRONG: Server variable in client component
"use client";
export default function DangerousComponent() {
  const apiKey = env.server.OPENAI_API_KEY; // ❌ ERROR! Secret exposed!
}

// ✅ CORRECT: Server variable in Server Component
export default async function ServerComponent() {
  const apiKey = env.server.OPENAI_API_KEY; // ✅ OK (server-side only)
  const data = await fetch("...", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
```

---

## Troubleshooting

### Build Fails with "Environment validation failed"

**Problem**: Missing or invalid environment variables.

**Solution**:

1. Check the error message for specific variables
2. Ensure `.env.local` exists: `cp .env.example .env.local`
3. Fill in all required variables
4. Run `pnpm env:check` to validate

```bash
# Example error
❌ Client environment validation failed:
  - NEXT_PUBLIC_APP_URL: Invalid url
```

**Fix**: Ensure URL is valid (include protocol):

```bash
# ❌ Wrong
NEXT_PUBLIC_APP_URL=localhost:3000

# ✅ Correct
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### "Server-only module imported on client side"

**Problem**: Importing `env.server.*` in a client component.

**Solution**: Only use `env.server` in Server Components or API Routes.

```typescript
// ❌ Wrong - client component
"use client";
import { env } from "@/env";
console.log(env.server.OPENAI_API_KEY); // Error!

// ✅ Correct - server component (no "use client")
import { env } from "@/env";
export default async function Page() {
  const key = env.server.OPENAI_API_KEY; // OK
}
```

### Variables Not Updating

**Problem**: Changed `.env.local` but values not reflected.

**Solution**: Restart the dev server:

```bash
# Stop dev server (Ctrl+C)
pnpm dev
```

Next.js caches environment variables at startup.

### Vercel Deployment Fails

**Problem**: Build succeeds locally but fails on Vercel.

**Solution**: Ensure all variables are set in Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Check that all required variables are present
3. Verify no typos in variable names
4. Redeploy after adding variables

### Type Errors with `env`

**Problem**: TypeScript doesn't recognize `env.server.*` or `env.client.*`.

**Solution**: Ensure `src/env.ts` is imported at least once:

```typescript
// In app/layout.tsx or any root file
import { env } from "@/src/env";
```

### CI/CD Fails

**Problem**: GitHub Actions fails with environment validation error.

**Solution**: The CI uses `.env.ci` with dummy values. This is expected for validation testing. Ensure `.env.ci` has valid formats (even if dummy values).

---

## Scripts Reference

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `pnpm env:check` | Validate all environment variables             |
| `pnpm env:print` | Print variables (secrets hidden)               |
| `pnpm dev`       | Start dev server (validates env automatically) |
| `pnpm build`     | Build app (runs `prebuild` → `env:check`)      |

---

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Zod Documentation](https://zod.dev/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Updated**: 2025-10-25
