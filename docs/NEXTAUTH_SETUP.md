# NextAuth Integration Guide

This document explains how to set up and use authentication in TrustDoc using NextAuth v5 with Supabase.

## Table of Contents

1. [Features](#features)
2. [Setup](#setup)
3. [Environment Variables](#environment-variables)
4. [Database Migration](#database-migration)
5. [Usage](#usage)
6. [Troubleshooting](#troubleshooting)

## Features

### Authentication Providers

- **Google OAuth**: One-click sign-in with Google account
- **Email Magic Links**: Passwordless authentication via email

### Features

- ✅ Database sessions (recommended for serverless)
- ✅ Credit system integration
- ✅ Protected routes via middleware
- ✅ Server-side authentication helpers
- ✅ Client-side session management
- ✅ Automatic credit allocation for new users (3 free credits)

## Setup

### 1. Environment Variables

Add the following variables to your `.env.local` file:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars-long

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here

# SMTP for email magic links
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@trustdoc.app
```

#### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

#### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
7. Copy **Client ID** and **Client Secret**

#### SMTP Configuration

**Gmail** (recommended for development):

1. Enable 2-factor authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password as `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

**Other providers**:

- **SendGrid**: `smtp.sendgrid.net` (port 587)
- **Mailgun**: `smtp.mailgun.org` (port 587)
- **AWS SES**: `email-smtp.region.amazonaws.com` (port 587)

### 2. Database Migration

Run the migration to create NextAuth tables:

```bash
pnpm prisma migrate dev --name auth_models
```

This creates the following tables:

- `accounts` - OAuth provider accounts
- `sessions` - Active user sessions
- `verification_tokens` - Email magic links

And adds these fields to `users`:

- `emailVerified` - Email verification timestamp
- `name` - User display name
- `image` - Profile picture URL

### 3. Verify Setup

```bash
# Check TypeScript types
pnpm typecheck

# Run linter
pnpm lint

# Start development server
pnpm dev
```

Visit [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin) to test authentication.

## Usage

### Client Components

```tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <button onClick={() => signIn()}>Sign in</button>;
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <p>Credits: {session.user.credits}</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

### Server Components

```tsx
import { auth } from "@/src/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div>
      <h1>Welcome {session.user.name}!</h1>
      <p>You have {session.user.credits} credits</p>
    </div>
  );
}
```

### Authentication Helpers

```tsx
import { getCurrentUser } from "@/src/auth/current-user";
import { requireSession } from "@/src/auth/session";

// Get current user with fresh data from database
const user = await getCurrentUser();
if (!user) {
  return { error: "Not authenticated" };
}

// Require authentication (redirects if not logged in)
const session = await requireAuth();

// Check if user has enough credits
const hasCredits = await checkCredits(1);
if (!hasCredits) {
  return { error: "Insufficient credits" };
}

// Deduct credits from user
const updatedUser = await deductCredits(1);
if (!updatedUser) {
  return { error: "Failed to deduct credits" };
}
```

### Server Actions

```tsx
"use server";

import { requireSession } from "@/src/auth/session";
import { prisma } from "@/src/lib/prisma";

export async function createAnalysis(documentId: string) {
  const session = await requireAuth(); // Redirects if not authenticated

  const analysis = await prisma.analysis.create({
    data: {
      userId: session.user.id,
      documentId,
      // ...
    },
  });

  return analysis;
}
```

### Protected API Routes

```ts
// app/api/analyze/route.ts
import { auth } from "@/src/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process request...
  return NextResponse.json({ success: true });
}
```

## Route Protection

To protect routes, use the `requireAuth()` helper in Server Components or layouts:

```tsx
// app/dashboard/layout.tsx
import { requireSession } from "@/src/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(); // Redirects to /auth/signin if not authenticated

  return <div>{children}</div>;
}
```

For individual pages:

```tsx
// app/dashboard/page.tsx
import { requireSession } from "@/src/auth/session";

export default async function DashboardPage() {
  const session = await requireAuth();

  return <div>Welcome {session.user.email}!</div>;
}
```

**Note**: Middleware-based protection is not used because NextAuth with Prisma is incompatible with Edge Runtime. Manual protection in layouts/pages provides more flexibility and avoids Edge Runtime limitations.

## Troubleshooting

### "Adapter version mismatch" error

The Prisma adapter version may conflict with NextAuth core. This is a known issue with NextAuth v5 beta. The app works correctly despite the TypeScript warning.

**Fixed**: A `// @ts-expect-error` comment has been added in `src/auth.ts` to suppress this warning.

### Email not sending

1. Check SMTP credentials in `.env.local`
2. For Gmail, ensure app password (not account password) is used
3. Check spam folder
4. Review server logs for detailed error messages

### "Session not found" errors

1. Ensure database migration was run: `pnpm prisma migrate dev`
2. Verify `DATABASE_URL` in `.env.local`
3. Check that session table exists: `pnpm prisma studio`

### Google OAuth "redirect_uri_mismatch"

1. Ensure callback URL in Google Console matches exactly:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
2. No trailing slashes
3. Must include `/api/auth/callback/google` path

### Credits not updating in session

Session data is cached. To get fresh credit balance:

```tsx
import { getCurrentUser } from "@/src/auth/current-user";

const user = await getCurrentUser(); // Fresh data from database
console.log(user.credits); // Current balance
```

### Edge Runtime / Middleware errors

NextAuth with Prisma adapter cannot run in Edge Runtime (middleware). This is a Next.js limitation.

**Solution**: Use `requireAuth()` helper in Server Components/layouts instead of middleware for route protection. This approach is more flexible and works with all Next.js features.

## Security Best Practices

1. **Never commit `.env.local`** - Gitignored by default
2. **Rotate secrets regularly** - Generate new `NEXTAUTH_SECRET` periodically
3. **Use HTTPS in production** - Required for OAuth and secure cookies
4. **Limit OAuth scopes** - Only request necessary user data
5. **Validate session server-side** - Never trust client session alone
6. **Rate limit auth endpoints** - Prevent brute force attacks

## Files Reference

### Core Authentication Files

- `src/auth.ts` - NextAuth configuration
- `src/lib/auth-helpers.ts` - Server-side helpers (requireAuth, getCurrentUser, etc.)
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API handler

### UI Components

- `app/auth/signin/page.tsx` - Sign-in page
- `app/auth/signin/signin-form.tsx` - Sign-in form (client)
- `app/auth/verify-request/page.tsx` - Email sent confirmation
- `app/auth/error/page.tsx` - Authentication errors
- `components/auth-button.tsx` - Navbar auth button
- `components/providers/session-provider.tsx` - Session provider

### Database

- `prisma/schema.prisma` - Database schema with NextAuth models
- `prisma/migrations/` - Database migrations

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth v5 Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma)
- [Google OAuth Setup](https://console.cloud.google.com/)
