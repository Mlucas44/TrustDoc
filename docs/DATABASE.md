# Database Documentation

This guide explains the database schema, setup, and usage for TrustDoc.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Setup](#setup)
- [Migrations](#migrations)
- [Seed Data](#seed-data)
- [Repositories](#repositories)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

TrustDoc uses **PostgreSQL** via **Supabase** with **Prisma ORM** for type-safe database access.

### Stack

- **Database**: PostgreSQL 15+ (Supabase)
- **ORM**: Prisma 6.18
- **Client**: @prisma/client
- **Migration Tool**: Prisma Migrate

### Key Features

- ✅ Type-safe queries with Prisma Client
- ✅ Automatic migrations
- ✅ Soft-delete support
- ✅ Check constraints for data integrity
- ✅ Cursor-based pagination
- ✅ Repository pattern for business logic

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │──┐
│ email (UNIQUE)  │  │
│ credits         │  │ 1:N
│ createdAt       │  │
│ updatedAt       │  │
└─────────────────┘  │
                     │
                     │
                     ▼
              ┌─────────────────┐
              │    Analysis     │
              ├─────────────────┤
              │ id (PK)         │
              │ userId (FK)     │
              │ filename        │
              │ type (ENUM)     │
              │ textLength      │
              │ summary         │
              │ riskScore       │
              │ redFlags (JSON) │
              │ clauses (JSON)  │
              │ aiResponse      │
              │ createdAt       │
              │ updatedAt       │
              │ deletedAt       │
              └─────────────────┘
```

### User Model

Represents a user account with credit-based usage.

| Field       | Type     | Constraints         | Description                 |
| ----------- | -------- | ------------------- | --------------------------- |
| `id`        | String   | PK, CUID            | Unique identifier           |
| `email`     | String   | UNIQUE, NOT NULL    | User email (login)          |
| `credits`   | Int      | DEFAULT 0, CHECK ≥0 | Available analysis credits  |
| `createdAt` | DateTime | DEFAULT now()       | Account creation timestamp  |
| `updatedAt` | DateTime | Auto-updated        | Last modification timestamp |

**Indexes**:

- `email` (UNIQUE) - Fast user lookup by email

**Constraints**:

- `credits >= 0` - Prevents negative credit balance

### Analysis Model

Represents a document analysis result.

| Field        | Type         | Constraints            | Description                                   |
| ------------ | ------------ | ---------------------- | --------------------------------------------- |
| `id`         | String       | PK, CUID               | Unique identifier                             |
| `userId`     | String       | FK → User.id, CASCADE  | Owner of the analysis                         |
| `filename`   | String       | NOT NULL               | Original document filename                    |
| `type`       | ContractType | ENUM, DEFAULT AUTRE    | Type of contract                              |
| `textLength` | Int          | DEFAULT 0, CHECK ≥0    | Extracted text length (characters)            |
| `summary`    | Text         | NULLABLE               | AI-generated summary                          |
| `riskScore`  | Int          | DEFAULT 0, CHECK 0-100 | Risk assessment score (0=safe, 100=high risk) |
| `redFlags`   | JSON         | NULLABLE               | Array of identified red flags                 |
| `clauses`    | JSON         | NULLABLE               | Array of important clauses                    |
| `aiResponse` | JSON         | NULLABLE               | Full AI response for debugging                |
| `createdAt`  | DateTime     | DEFAULT now()          | Analysis creation timestamp                   |
| `updatedAt`  | DateTime     | Auto-updated           | Last modification timestamp                   |
| `deletedAt`  | DateTime     | NULLABLE (soft-delete) | Soft deletion timestamp                       |

**Indexes**:

- `userId` - Fast queries by user
- `createdAt` - Chronological ordering
- `type` - Filter by contract type
- `deletedAt` - Exclude soft-deleted records

**Constraints**:

- `riskScore >= 0 AND riskScore <= 100` - Valid risk score range
- `textLength >= 0` - Non-negative text length
- FK `userId` CASCADE - Delete analyses when user is deleted

### ContractType Enum

```typescript
enum ContractType {
  CGU          // Terms of Service / Conditions Générales d'Utilisation
  FREELANCE    // Freelance Contract
  EMPLOI       // Employment Contract
  NDA          // Non-Disclosure Agreement
  DEVIS        // Quote / Estimate
  PARTENARIAT  // Partnership Agreement
  AUTRE        // Other
}
```

---

## Setup

### 1. Supabase Configuration

1. Create a Supabase project: https://supabase.com/dashboard
2. Go to **Settings** → **Database**
3. Copy the **Connection String** (URI format)

### 2. Environment Variables

Add to `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Format breakdown**:

- `postgres` - Username (default)
- `[YOUR-PASSWORD]` - Your database password
- `db.[PROJECT-REF].supabase.co` - Your Supabase host
- `5432` - PostgreSQL port
- `postgres` - Database name

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

This creates the type-safe Prisma Client based on your schema.

### 4. Run Migrations

```bash
# Development (creates migration + applies)
pnpm db:migrate

# Production (applies existing migrations)
pnpm db:migrate:deploy
```

### 5. Seed Database (Optional)

```bash
pnpm db:seed
```

Creates:

- 1 test user: `test@example.com` (10 credits)
- 2 sample analyses

---

## Migrations

### Creating Migrations

```bash
# Create and apply migration
pnpm db:migrate

# Name your migration when prompted
# Example: "add_user_role_field"
```

### Migration Workflow

1. Modify `prisma/schema.prisma`
2. Run `pnpm db:migrate`
3. Prisma generates SQL migration in `prisma/migrations/`
4. Migration is applied to database
5. Prisma Client is regenerated

### Check Constraints

Prisma doesn't natively support CHECK constraints in the schema. After running migrations, apply constraints manually:

```bash
# Connect to Supabase SQL Editor and run:
psql $DATABASE_URL -f prisma/migrations/add_check_constraints.sql
```

Or copy-paste from `prisma/migrations/add_check_constraints.sql` into Supabase SQL Editor.

### Reset Database

```bash
# WARNING: Deletes all data!
pnpm db:reset
```

This:

1. Drops the database
2. Recreates it
3. Applies all migrations
4. Runs seed script

---

## Seed Data

The seed script (`prisma/seed.ts`) creates development data:

### Test User

```typescript
{
  email: "test@example.com",
  credits: 10
}
```

### Sample Analyses

**1. Freelance Contract**

```typescript
{
  filename: "contrat_freelance.pdf",
  type: "FREELANCE",
  riskScore: 35,
  redFlags: [
    "Clause de non-concurrence très large (2 ans, toute l'Europe)",
    "Pas de clause de résiliation anticipée"
  ]
}
```

**2. Terms of Service (CGU)**

```typescript
{
  filename: "cgu_plateforme.pdf",
  type: "CGU",
  riskScore: 15,
  redFlags: ["Collecte de données étendue"]
}
```

---

## Repositories

TrustDoc uses the **Repository Pattern** for data access, providing a clean separation between business logic and database queries.

### UserRepo

Located: `src/db/user.repo.ts`

#### Methods

```typescript
// Get user by ID
const user = await UserRepo.getById("cl123...");

// Get user by email
const user = await UserRepo.getByEmail("user@example.com");

// Create user if not exists
const user = await UserRepo.createIfNotExists("user@example.com");

// Increment credits
const user = await UserRepo.incrementCredits("cl123...", 5);

// Decrement credits (with validation)
const user = await UserRepo.decrementCredits("cl123...", 1);
// Throws if insufficient credits
```

#### Validation

- `decrementCredits` prevents negative balances
- Returns `AppUser` (selected fields only, no sensitive data)

### AnalysisRepo

Located: `src/db/analysis.repo.ts`

#### Methods

```typescript
// Create analysis
const analysis = await AnalysisRepo.create({
  userId: "cl123...",
  filename: "contract.pdf",
  type: "FREELANCE",
  textLength: 1500,
  summary: "Summary text",
  riskScore: 35,
  redFlags: ["Red flag 1", "Red flag 2"],
  clauses: [{ type: "payment", content: "30 days", risk: "low" }],
});

// List user analyses with pagination
const analyses = await AnalysisRepo.listByUser("cl123...", {
  limit: 10,
  cursor: "cl456...", // ID of last item from previous page
  type: "FREELANCE", // Optional filter
  includeDeleted: false, // Exclude soft-deleted
});

// Get analysis by ID
const analysis = await AnalysisRepo.getById("cl789...");

// Soft delete (with ownership check)
const deleted = await AnalysisRepo.softDelete("cl789...", "cl123...");
// Throws if user doesn't own the analysis
```

#### Validation

- `create` validates `riskScore` (0-100) and `textLength` (≥0)
- `softDelete` verifies ownership before deletion
- Pagination uses cursor-based approach (scalable)

---

## Scripts Reference

| Command                  | Description                            |
| ------------------------ | -------------------------------------- |
| `pnpm db:generate`       | Generate Prisma Client                 |
| `pnpm db:push`           | Push schema without creating migration |
| `pnpm db:migrate`        | Create and apply migration (dev)       |
| `pnpm db:migrate:deploy` | Apply migrations (production)          |
| `pnpm db:seed`           | Seed database with test data           |
| `pnpm db:studio`         | Open Prisma Studio (GUI)               |
| `pnpm db:reset`          | Reset database (DANGER: deletes data!) |

---

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

**Problem**: DATABASE_URL not set in environment.

**Solution**:

```bash
# Add to .env.local
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

### "Can't reach database server"

**Problem**: Cannot connect to Supabase database.

**Solutions**:

1. Check DATABASE_URL is correct
2. Verify Supabase project is active
3. Check network/firewall settings
4. Try connection from Supabase SQL Editor first

### "Unique constraint failed on the fields: (`email`)"

**Problem**: Trying to create user with existing email.

**Solution**: Use `UserRepo.createIfNotExists()` instead of direct Prisma create.

### "Insufficient credits"

**Problem**: `UserRepo.decrementCredits()` throws error.

**Solution**: Check user has enough credits before attempting to decrement:

```typescript
const user = await UserRepo.getById(userId);
if (user.credits < cost) {
  throw new Error("Insufficient credits");
}
await UserRepo.decrementCredits(userId, cost);
```

### Migrations out of sync

**Problem**: Local migrations differ from database state.

**Solution**:

```bash
# Reset and reapply all migrations
pnpm db:reset

# Or push schema directly (skip migrations)
pnpm db:push
```

### Prisma Client not generated

**Problem**: Import errors like "Cannot find module '@prisma/client'".

**Solution**:

```bash
pnpm db:generate
```

---

## Best Practices

### 1. Use Repositories, Not Direct Prisma

```typescript
// ❌ Bad: Direct Prisma access
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Good: Use repository
const user = await UserRepo.getById(id);
```

### 2. Handle Soft Deletes

```typescript
// Exclude soft-deleted by default
const analyses = await AnalysisRepo.listByUser(userId, {
  includeDeleted: false, // Default
});

// Include soft-deleted if needed (e.g., admin view)
const allAnalyses = await AnalysisRepo.listByUser(userId, {
  includeDeleted: true,
});
```

### 3. Use Transactions for Multi-Step Operations

```typescript
import { prisma } from "@/src/lib/prisma";

await prisma.$transaction(async (tx) => {
  // Decrement credits
  await tx.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } }
  });

  // Create analysis
  await tx.analysis.create({
    data: { userId, filename, ... }
  });
});
```

### 4. Validate Input Before Database Calls

```typescript
// Validate in repository layer
if (input.riskScore < 0 || input.riskScore > 100) {
  throw new Error("riskScore must be between 0 and 100");
}
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: 2025-10-25
