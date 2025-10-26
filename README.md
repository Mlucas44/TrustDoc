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

### Health Check

**GET** `/api/health`

Returns the application health status.

**Response:**

```json
{
  "status": "ok"
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

### Quick Setup

1. **Get Supabase Connection String**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Settings → Database → Connection String (URI)

2. **Add to `.env.local`**:

   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

3. **Run Migrations**:

   ```bash
   pnpm db:generate    # Generate Prisma Client
   pnpm db:migrate     # Create tables
   pnpm db:seed        # Add test data (optional)
   ```

4. **Open Prisma Studio** (optional):
   ```bash
   pnpm db:studio      # Visual database browser
   ```

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
