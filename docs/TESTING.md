# Testing - Infrastructure de Tests d'Intégration

Documentation complète du système de tests d'intégration de TrustDoc pour garantir la fiabilité de la chaîne complète d'analyse de contrats.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture des tests](#architecture-des-tests)
- [Configuration](#configuration)
- [Helpers de tests](#helpers-de-tests)
- [Fixtures PDF](#fixtures-pdf)
- [Tests d'intégration](#tests-dintégration)
- [Exécution des tests](#exécution-des-tests)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

Les tests d'intégration de TrustDoc valident la chaîne complète :

```
Upload PDF → Parsing → LLM Analysis → Stockage résultats → API retour JSON
```

### Objectifs

- **Fiabilité** : Garantir que le pipeline complet fonctionne en conditions réelles
- **Isolation** : Chaque test démarre avec une base de données propre
- **Déterminisme** : Mocks LLM pour des résultats prédictibles
- **Performance** : Tests rapides avec timeouts appropriés
- **Coverage** : Scénarios critiques (success, erreurs, limites)

### Technologies

| Outil                         | Usage                                |
| ----------------------------- | ------------------------------------ |
| **Vitest**                    | Framework de tests (moderne, rapide) |
| **Happy-DOM**                 | Environnement DOM léger pour React   |
| **@testing-library/react**    | Utilitaires de tests React           |
| **MSW (Mock Service Worker)** | Mocks HTTP pour LLM (OpenAI/Ollama)  |
| **node-mocks-http**           | Mocks de requêtes/réponses Next.js   |

---

## Architecture des tests

### Structure des dossiers

```
tests/
├── setup.ts                          # Configuration globale Vitest
├── helpers/                          # Utilitaires réutilisables
│   ├── test-db.ts                    # Gestion base de données test
│   ├── test-storage.ts               # Mock Supabase Storage
│   ├── test-auth.ts                  # Helper d'authentification
│   ├── integration-client.ts         # Client API pour tests
│   └── llm-mock.ts                   # Mocks LLM déterministes (MSW)
├── fixtures/                         # Données de test
│   ├── sample-freelance.pdf          # PDF contrat freelance (valid)
│   ├── sample-employment.pdf         # PDF contrat CDI (valid)
│   ├── invalid-too-short.pdf         # PDF invalide (< 100 chars)
│   └── corrupted.pdf                 # PDF corrompu (parsing fail)
├── integration/                      # Tests d'intégration
│   ├── analysis-flow.test.ts         # Test principal (upload → analyse)
│   ├── credits.test.ts               # Tests système de crédits
│   ├── rate-limiting.test.ts         # Tests rate-limit (429 Too Many Requests)
│   ├── guest-quota.test.ts           # Tests quota invités (3 analyses max)
│   └── llm-validation.test.ts        # Tests validation JSON LLM
└── unit/                             # Tests unitaires (si nécessaires)
    └── utils/                        # Tests utilitaires isolés
```

### Flux de test typique

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { integrationClient } from "../helpers/integration-client";
import { setupTestUser } from "../helpers/test-auth";
import { cleanupTestDatabase } from "../helpers/test-db";

describe("Analysis Flow", () => {
  beforeEach(async () => {
    await cleanupTestDatabase(); // Isolation entre tests
  });

  it("should complete full analysis successfully", async () => {
    // 1. Setup: créer utilisateur avec crédits
    const user = await setupTestUser({ credits: 10 });

    // 2. Upload: télécharger PDF
    const uploadResult = await integrationClient.upload("sample-freelance.pdf", {
      userId: user.id,
    });

    // 3. Analyze: lancer analyse LLM (mock)
    const analysisResult = await integrationClient.analyze({
      userId: user.id,
      filePath: uploadResult.filePath,
      contractType: "FREELANCE",
    });

    // 4. Assert: vérifier résultats
    expect(analysisResult.success).toBe(true);
    expect(analysisResult.risks).toHaveLength(3);
    expect(analysisResult.risks[0].severity).toBe("HIGH");

    // 5. Verify: vérifier débit crédits
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser.credits).toBe(9); // 10 - 1
  });
});
```

---

## Configuration

### Variables d'environnement

Créer `.env.test` pour les tests :

```bash
# Database (IMPORTANT: Base de données dédiée pour tests)
DATABASE_URL="postgresql://user:pass@localhost:5432/trustdoc_test"

# LLM (mocks activés automatiquement)
OPENAI_API_KEY="sk-test-mock-key-not-used-in-tests"
OPENAI_MODEL="gpt-4o-mini"

# Storage (mock local activé par tests/setup.ts)
SUPABASE_URL="https://fake.supabase.co"
SUPABASE_SERVICE_KEY="mock-service-key"
SUPABASE_BUCKET_NAME="test-bucket"

# Auth (pour tests avec sessions)
AUTH_SECRET="test-secret-min-32-characters-long"

# Logs (silent mode pour tests)
LOG_SILENT_TEST="1"

# Mocking (activé par tests/setup.ts)
MOCK_STORAGE="true"
MOCK_LLM="true"
```

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "TrustDoc Integration Tests",
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/integration/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["tests/**/*.spec.ts", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts", "app/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/*.spec.ts",
        "**/*.test.ts",
      ],
    },
    testTimeout: 30000, // 30s pour LLM mocks
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

### tests/setup.ts

Configuration globale exécutée avant tous les tests :

```typescript
import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach } from "vitest";
import { cleanupTestDatabase } from "./helpers/test-db";
import { cleanupTestStorage } from "./helpers/test-storage";

// Environment de test
process.env.NODE_ENV = "test";
process.env.LOG_SILENT_TEST = "1";
process.env.MOCK_STORAGE = "true";

// Validation DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for integration tests");
}

beforeAll(async () => {
  console.log("[TEST SETUP] Initializing test environment...");
  await cleanupTestDatabase();
  await cleanupTestStorage();
  console.log("[TEST SETUP] Test environment ready");
});

afterEach(async () => {
  // Isolation : cleanup après chaque test
  await cleanupTestDatabase();
  await cleanupTestStorage();
});

afterAll(async () => {
  console.log("[TEST TEARDOWN] Cleaning up test environment...");
  await cleanupTestDatabase();
  await cleanupTestStorage();
  console.log("[TEST TEARDOWN] Test environment cleaned up");
});
```

---

## Helpers de tests

### test-db.ts - Gestion base de données

Utilitaires pour gérer la base de données de test.

```typescript
import { prisma } from "@/src/lib/prisma";

/**
 * Nettoie toutes les données de test de la base de données
 * Exécuté avant/après chaque test pour garantir l'isolation
 */
export async function cleanupTestDatabase() {
  await prisma.$transaction([
    prisma.analysis.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * Crée un utilisateur de test avec crédits
 */
export async function createTestUser(opts?: { email?: string; credits?: number }) {
  return prisma.user.create({
    data: {
      email: opts?.email ?? "test@example.com",
      credits: opts?.credits ?? 10,
      name: "Test User",
    },
  });
}

/**
 * Crée une analyse de test
 */
export async function createTestAnalysis(
  userId: string,
  opts?: {
    contractType?: string;
    status?: string;
  }
) {
  return prisma.analysis.create({
    data: {
      userId,
      filePath: "test/sample.pdf",
      contractType: opts?.contractType ?? "FREELANCE",
      status: opts?.status ?? "COMPLETED",
      result: {
        risks: [],
        summary: "Test analysis",
      },
    },
  });
}
```

### test-storage.ts - Mock Supabase Storage

Mock du système de stockage Supabase pour tests locaux.

```typescript
import fs from "fs/promises";
import path from "path";

const MOCK_STORAGE_DIR = path.join(process.cwd(), ".test-storage");

/**
 * Initialise le répertoire de stockage mock
 */
export async function initTestStorage() {
  await fs.mkdir(MOCK_STORAGE_DIR, { recursive: true });
}

/**
 * Nettoie tous les fichiers de stockage mock
 */
export async function cleanupTestStorage() {
  try {
    await fs.rm(MOCK_STORAGE_DIR, { recursive: true, force: true });
  } catch {
    // Ignore si le répertoire n'existe pas
  }
}

/**
 * Upload un fichier vers le stockage mock
 */
export async function uploadToMockStorage(filePath: string, buffer: Buffer): Promise<string> {
  await initTestStorage();
  const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return filePath;
}

/**
 * Télécharge un fichier depuis le stockage mock
 */
export async function downloadFromMockStorage(filePath: string): Promise<Buffer> {
  const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
  return fs.readFile(fullPath);
}
```

### test-auth.ts - Helper d'authentification

Utilitaires pour créer des sessions de test.

```typescript
import { createTestUser } from "./test-db";
import { prisma } from "@/src/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

/**
 * Crée un utilisateur de test avec session active
 */
export async function setupTestUser(opts?: { email?: string; credits?: number }) {
  const user = await createTestUser(opts);

  const session = await prisma.session.create({
    data: {
      sessionToken: createId(),
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    },
  });

  return { user, sessionToken: session.sessionToken };
}

/**
 * Crée un header d'authentification pour les tests
 */
export function createAuthHeader(sessionToken: string) {
  return {
    cookie: `next-auth.session-token=${sessionToken}`,
  };
}
```

### integration-client.ts - Client API

Client HTTP pour appeler les endpoints dans les tests.

```typescript
import { createMocks } from "node-mocks-http";
import { POST as uploadHandler } from "@/app/api/upload/route";
import { POST as analyzeHandler } from "@/app/api/analyze/route";
import { createAuthHeader } from "./test-auth";

/**
 * Client API pour tests d'intégration
 */
export const integrationClient = {
  /**
   * Upload un PDF vers /api/upload
   */
  async upload(fixtureName: string, opts: { userId?: string; sessionToken?: string }) {
    const { req, res } = createMocks({
      method: "POST",
      headers: opts.sessionToken ? createAuthHeader(opts.sessionToken) : {},
    });

    // Mock FormData avec fichier PDF
    const pdfBuffer = await fs.readFile(path.join(process.cwd(), "tests/fixtures", fixtureName));
    req.body = { file: new Blob([pdfBuffer], { type: "application/pdf" }) };

    await uploadHandler(req as any);

    return JSON.parse(res._getData());
  },

  /**
   * Lance une analyse via /api/analyze
   */
  async analyze(opts: {
    userId: string;
    filePath: string;
    contractType: string;
    sessionToken?: string;
  }) {
    const { req, res } = createMocks({
      method: "POST",
      headers: opts.sessionToken ? createAuthHeader(opts.sessionToken) : {},
      body: {
        filePath: opts.filePath,
        contractType: opts.contractType,
      },
    });

    await analyzeHandler(req as any);

    return JSON.parse(res._getData());
  },
};
```

### llm-mock.ts - Mocks LLM déterministes

Mocks MSW pour simuler les réponses LLM.

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/**
 * Réponse LLM mock pour contrat freelance
 */
const MOCK_FREELANCE_RESPONSE = {
  risks: [
    {
      category: "PAYMENT",
      severity: "HIGH",
      title: "Délai de paiement excessif",
      excerpt: "Le paiement interviendra sous 90 jours...",
      recommendation: "Négocier un délai maximal de 30 jours",
    },
    {
      category: "LIABILITY",
      severity: "MEDIUM",
      title: "Clause de responsabilité illimitée",
      excerpt: "Le prestataire est responsable sans limitation...",
      recommendation: "Limiter la responsabilité au montant du contrat",
    },
  ],
  summary: "Contrat freelance avec risques sur les délais de paiement et la responsabilité.",
};

/**
 * Handlers MSW pour OpenAI API
 */
const handlers = [
  http.post("https://api.openai.com/v1/chat/completions", () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify(MOCK_FREELANCE_RESPONSE),
          },
        },
      ],
    });
  }),
];

/**
 * Serveur MSW pour tests
 */
export const llmMockServer = setupServer(...handlers);

/**
 * Active les mocks LLM
 */
export function enableLLMMocks() {
  llmMockServer.listen({ onUnhandledRequest: "bypass" });
}

/**
 * Désactive les mocks LLM
 */
export function disableLLMMocks() {
  llmMockServer.close();
}

/**
 * Réinitialise les mocks LLM
 */
export function resetLLMMocks() {
  llmMockServer.resetHandlers();
}
```

---

## Fixtures PDF

Fichiers PDF de test dans `tests/fixtures/` :

### sample-freelance.pdf

Contrat freelance valide (15 pages, 5000 caractères) avec :

- Clauses de paiement (90 jours)
- Responsabilité illimitée
- Propriété intellectuelle
- Résiliation unilatérale

**Usage** : Test du pipeline complet (success path)

### sample-employment.pdf

Contrat CDI valide (20 pages, 7000 caractères) avec :

- Clause de non-concurrence (12 mois)
- Mobilité géographique
- Heures supplémentaires non rémunérées

**Usage** : Test détection type de contrat

### invalid-too-short.pdf

PDF avec seulement 50 caractères.

**Usage** : Test validation `TEXT_TOO_SHORT` (< 100 caractères)

### corrupted.pdf

PDF corrompu (header invalide).

**Usage** : Test gestion erreur parsing PDF

---

## Tests d'intégration

### analysis-flow.test.ts - Test principal

Test du flux complet upload → analyse → résultats.

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { integrationClient } from "../helpers/integration-client";
import { setupTestUser } from "../helpers/test-auth";
import { cleanupTestDatabase } from "../helpers/test-db";
import { enableLLMMocks, disableLLMMocks } from "../helpers/llm-mock";

describe("Analysis Flow - Complete Pipeline", () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
    enableLLMMocks();
  });

  afterAll(() => {
    disableLLMMocks();
  });

  it("should complete full analysis successfully", async () => {
    // 1. Setup: créer utilisateur avec crédits
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // 2. Upload: télécharger PDF
    const uploadResult = await integrationClient.upload("sample-freelance.pdf", { sessionToken });

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.filePath).toMatch(/^user-/);

    // 3. Analyze: lancer analyse LLM (mock)
    const analysisResult = await integrationClient.analyze({
      userId: user.id,
      filePath: uploadResult.filePath,
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.risks).toBeDefined();
    expect(analysisResult.risks).toHaveLength(2);
    expect(analysisResult.risks[0].severity).toBe("HIGH");
    expect(analysisResult.risks[0].category).toBe("PAYMENT");

    // 4. Verify: vérifier débit crédits
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser.credits).toBe(9); // 10 - 1

    // 5. Verify: vérifier sauvegarde analysis
    const analysis = await prisma.analysis.findFirst({
      where: { userId: user.id },
    });
    expect(analysis).toBeDefined();
    expect(analysis.status).toBe("COMPLETED");
    expect(analysis.contractType).toBe("FREELANCE");
  });
});
```

### credits.test.ts - Tests crédits

Tests du système de crédits.

```typescript
describe("Credits System", () => {
  it("should reject analysis when credits = 0", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 0 });

    const result = await integrationClient.analyze({
      userId: user.id,
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("INSUFFICIENT_CREDITS");
    expect(result.statusCode).toBe(402); // Payment Required
  });

  it("should debit 1 credit on successful analysis", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 5 });

    await integrationClient.analyze({
      userId: user.id,
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser.credits).toBe(4);
  });

  it("should NOT debit credits on failed analysis", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 5 });

    // Forcer une erreur LLM
    llmMockServer.use(
      http.post("https://api.openai.com/v1/chat/completions", () => {
        return HttpResponse.error();
      })
    );

    const result = await integrationClient.analyze({
      userId: user.id,
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result.success).toBe(false);

    // Vérifier que les crédits n'ont PAS été débités
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser.credits).toBe(5); // Inchangé
  });
});
```

### rate-limiting.test.ts - Tests rate-limit

Tests des limites de débit (429 Too Many Requests).

```typescript
describe("Rate Limiting", () => {
  it("should enforce rate limit for guests (3 req / 5min)", async () => {
    const ipAddress = "192.168.1.1";

    // 1ère requête : OK
    const res1 = await integrationClient.analyze({
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res1.statusCode).toBe(200);

    // 2ème requête : OK
    const res2 = await integrationClient.analyze({
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res2.statusCode).toBe(200);

    // 3ème requête : OK
    const res3 = await integrationClient.analyze({
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res3.statusCode).toBe(200);

    // 4ème requête : RATE LIMITED
    const res4 = await integrationClient.analyze({
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res4.statusCode).toBe(429);
    expect(res4.error).toBe("RATE_LIMIT_EXCEEDED");
  });
});
```

### guest-quota.test.ts - Tests quota invités

Tests de la limite de 3 analyses pour les utilisateurs non authentifiés.

```typescript
describe("Guest Quota", () => {
  it("should allow 3 analyses without auth", async () => {
    const ipAddress = "192.168.1.100";

    // 1ère analyse : OK
    const res1 = await integrationClient.analyze({
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res1.statusCode).toBe(200);

    // 2ème analyse : OK
    const res2 = await integrationClient.analyze({
      filePath: "test/file2.pdf",
      contractType: "EMPLOYMENT",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res2.statusCode).toBe(200);

    // 3ème analyse : OK
    const res3 = await integrationClient.analyze({
      filePath: "test/file3.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res3.statusCode).toBe(200);

    // 4ème analyse : QUOTA EXCEEDED
    const res4 = await integrationClient.analyze({
      filePath: "test/file4.pdf",
      contractType: "FREELANCE",
      headers: { "x-forwarded-for": ipAddress },
    });
    expect(res4.statusCode).toBe(402);
    expect(res4.error).toBe("GUEST_QUOTA_EXCEEDED");
  });
});
```

### llm-validation.test.ts - Tests validation JSON

Tests de la validation stricte du JSON retourné par le LLM.

```typescript
describe("LLM Response Validation", () => {
  it("should reject invalid JSON from LLM", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse LLM invalide
    llmMockServer.use(
      http.post("https://api.openai.com/v1/chat/completions", () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: "This is not valid JSON",
              },
            },
          ],
        });
      })
    );

    const result = await integrationClient.analyze({
      userId: user.id,
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("LLM_INVALID_JSON");

    // Vérifier que les crédits n'ont PAS été débités
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser.credits).toBe(10); // Inchangé
  });

  it("should reject missing required fields", async () => {
    const { user, sessionToken } = await setupTestUser({ credits: 10 });

    // Forcer une réponse LLM sans champ "risks"
    llmMockServer.use(
      http.post("https://api.openai.com/v1/chat/completions", () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Valid summary",
                  // Missing "risks" field
                }),
              },
            },
          ],
        });
      })
    );

    const result = await integrationClient.analyze({
      userId: user.id,
      filePath: "test/file.pdf",
      contractType: "FREELANCE",
      sessionToken,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("LLM_SCHEMA_VALIDATION_FAILED");
  });
});
```

---

## Exécution des tests

### Commandes npm

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run tests/integration",
    "test:unit": "vitest run tests/unit",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Exécuter tous les tests

```bash
pnpm test
```

### Exécuter uniquement les tests d'intégration

```bash
pnpm test:integration
```

### Mode watch (développement)

```bash
pnpm test:watch
```

### Interface graphique Vitest

```bash
pnpm test:ui
# Ouvre http://localhost:51204/__vitest__/
```

### Coverage

```bash
pnpm test:coverage
# Génère rapport dans coverage/index.html
```

---

## CI/CD

### GitHub Actions Workflow

Créer `.github/workflows/test-integration.yml` :

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: trustdoc_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup test database
        run: |
          pnpm prisma generate
          pnpm prisma db push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trustdoc_test

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/trustdoc_test
          OPENAI_API_KEY: sk-test-mock-key
          SUPABASE_URL: https://fake.supabase.co
          SUPABASE_SERVICE_KEY: mock-service-key
          AUTH_SECRET: test-secret-min-32-characters-long
          LOG_SILENT_TEST: "1"
          MOCK_STORAGE: "true"
          MOCK_LLM: "true"

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
```

### Stabilité des tests

**Garanties CI** :

- ✅ Base de données PostgreSQL dédiée (service Docker)
- ✅ Mocks LLM déterministes (pas d'appels API réels)
- ✅ Isolation complète entre tests (cleanup database)
- ✅ Timeouts appropriés (30s pour tests LLM)
- ✅ Logs silencieux (`LOG_SILENT_TEST=1`)

**Prévention flakiness** :

- Éviter `sleep()` → utiliser `waitFor()` de testing-library
- Cleanup systématique → `afterEach(cleanupTestDatabase)`
- Mocks déterministes → pas de random ou Date.now()
- Timeouts généreux → 30s pour LLM (CI plus lent que local)

---

## Troubleshooting

### Erreur : "DATABASE_URL must be set"

**Solution** : Créer `.env.test` avec une DATABASE_URL valide vers une base de test dédiée.

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/trustdoc_test"
```

### Erreur : "Table does not exist"

**Solution** : Exécuter les migrations Prisma sur la base de test.

```bash
pnpm prisma db push
```

### Tests qui échouent en CI mais pas en local

**Causes possibles** :

1. **Timeouts trop courts** : Augmenter `testTimeout` dans `vitest.config.ts`
2. **Cleanup incomplet** : Vérifier `cleanupTestDatabase()` dans `afterEach`
3. **Mocks manquants** : Vérifier que `enableLLMMocks()` est appelé

### Tests très lents (> 1 minute)

**Optimisations** :

1. Utiliser `happy-dom` au lieu de `jsdom` (plus rapide)
2. Réduire le nombre d'appels DB (utiliser transactions)
3. Paralléliser les tests (`vitest --pool=threads`)

### Erreur : "Port 51204 already in use" (Vitest UI)

**Solution** :

```bash
# Tuer le processus sur le port
npx kill-port 51204

# Ou utiliser un port différent
vitest --ui --port 51205
```

---

## Bonnes pratiques

### 1. Isolation des tests

**TOUJOURS** nettoyer la base de données entre les tests :

```typescript
afterEach(async () => {
  await cleanupTestDatabase();
  await cleanupTestStorage();
});
```

### 2. Mocks déterministes

**NE JAMAIS** appeler les vraies API LLM dans les tests :

```typescript
// ✅ BON : Mock déterministe
enableLLMMocks();

// ❌ MAUVAIS : Vraie API (coût, lenteur, flakiness)
// process.env.MOCK_LLM = 'false';
```

### 3. Fixtures réalistes

Utiliser des PDFs réels (extraits anonymisés) pour tester le parsing.

### 4. Assertions précises

```typescript
// ✅ BON : Assertion précise
expect(result.risks[0].severity).toBe("HIGH");

// ❌ MAUVAIS : Assertion vague
expect(result.risks).toBeTruthy();
```

### 5. Test des cas d'erreur

**TOUJOURS** tester les scénarios d'échec :

```typescript
it("should handle LLM timeout gracefully", async () => {
  llmMockServer.use(
    http.post("https://api.openai.com/v1/chat/completions", async () => {
      await delay(31000); // > 30s timeout
    })
  );

  const result = await integrationClient.analyze({...});
  expect(result.error).toBe("LLM_TIMEOUT");
});
```

### 6. Documentation des tests

Ajouter des commentaires pour les tests complexes :

```typescript
it("should NOT debit credits on failed analysis", async () => {
  // IMPORTANT: Les crédits ne doivent être débités que si l'analyse réussit
  // pour éviter de facturer des erreurs techniques à l'utilisateur.

  const { user, sessionToken } = await setupTestUser({ credits: 5 });

  // Forcer une erreur LLM...
});
```

---

## Métriques de qualité

### Objectifs de coverage

| Zone                | Objectif | Actuel |
| ------------------- | -------- | ------ |
| **API Endpoints**   | 90%      | -      |
| **Business Logic**  | 85%      | -      |
| **Utils & Helpers** | 80%      | -      |
| **Global (lignes)** | 80%      | -      |

### SLOs des tests

| Métrique             | Objectif |
| -------------------- | -------- |
| Durée totale (local) | < 30s    |
| Durée totale (CI)    | < 2 min  |
| Flakiness            | < 1%     |
| Tests qui passent    | 100%     |

---

## Roadmap

### Phase 1 (actuelle)

- [x] Configuration Vitest + Happy-DOM
- [ ] Helpers de base (DB, Storage, Auth)
- [ ] Test principal (upload → analyse)
- [ ] Tests crédits et rate-limit
- [ ] CI GitHub Actions

### Phase 2

- [ ] Tests Stripe webhook (crédit après paiement)
- [ ] Tests multi-utilisateurs (concurrence)
- [ ] Tests permissions (RBAC)
- [ ] Tests edge cases (PDF corrompus, Unicode, très gros fichiers)

### Phase 3

- [ ] Tests E2E Playwright (UI complète)
- [ ] Tests de performance (charge LLM)
- [ ] Tests de sécurité (XSS, injection)
- [ ] Visual regression testing

---

## Ressources

### Documentation officielle

- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [Happy-DOM](https://github.com/capricorn86/happy-dom)

### Articles recommandés

- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Integration Testing with Next.js](https://nextjs.org/docs/testing)
- [Mocking OpenAI API](https://platform.openai.com/docs/api-reference)

---

**Document maintenu par** : Équipe TrustDoc
**Dernière mise à jour** : 2025-01-15
**Version** : 1.0.0
