# Guide Qualité de Code - TrustDoc

Ce document décrit les outils et processus mis en place pour maintenir une haute qualité de code dans TrustDoc.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [ESLint](#eslint)
- [Prettier](#prettier)
- [Husky & lint-staged](#husky--lint-staged)
- [CI/CD](#cicd)
- [Commandes](#commandes)
- [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

TrustDoc utilise un stack complet pour garantir la qualité du code:

- **ESLint** - Linting TypeScript/React avec règles strictes
- **Prettier** - Formatage automatique du code
- **Husky** - Git hooks pour validation pre-commit
- **lint-staged** - Lint uniquement les fichiers modifiés
- **GitHub Actions** - CI/CD automatisée avec matrix Node.js

---

## ESLint

### Configuration

Fichier: `eslint.config.mjs`

### Plugins activés

- `@typescript-eslint` - Règles TypeScript
- `eslint-plugin-react` - Règles React
- `eslint-plugin-react-hooks` - Règles React Hooks
- `eslint-plugin-import` - Gestion des imports
- `eslint-plugin-unused-imports` - Détection imports inutilisés
- `eslint-plugin-prettier` - Intégration Prettier

### Règles principales

#### TypeScript

```typescript
// ✅ Bon - imports de types séparés
import { type User } from "./types";

// ❌ Mauvais - imports mixés
import { User } from "./types";
```

**Règles:**

- `@typescript-eslint/consistent-type-imports` - Force les imports de types
- `@typescript-eslint/no-unused-vars` - Variables non utilisées (warn)
- `@typescript-eslint/no-explicit-any` - Éviter `any` (warn)

#### React

```tsx
// ✅ Bon - balise auto-fermante
<Component />

// ❌ Mauvais
<Component></Component>
```

**Règles:**

- `react/self-closing-comp` - Balises auto-fermantes
- `react/jsx-curly-brace-presence` - Pas d'accolades inutiles
- `react/react-in-jsx-scope` - Désactivé (Next.js 13+)

#### Imports

```typescript
// ✅ Bon - imports groupés et triés
import { readFile } from "fs";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { type User } from "./types";

// ❌ Mauvais - imports désordonnés
import { Button } from "@/components/ui/button";
import { readFile } from "fs";
import { type User } from "./types";
import { useState } from "react";
```

**Règles:**

- `unused-imports/no-unused-imports` - Supprime les imports inutilisés
- `import/order` - Ordre des imports (builtin → external → internal → parent/sibling)
- `import/no-duplicates` - Pas d'imports dupliqués

#### Console & Code quality

```typescript
// ✅ Bon
console.warn("Attention");
console.error("Erreur");

// ❌ Mauvais
console.log("Debug"); // warn
```

**Règles:**

- `no-console` - Interdit console.log (autorise warn/error)
- `prefer-const` - Utiliser const quand possible

### Ignores

ESLint ignore automatiquement:

- `.next/` - Build Next.js
- `node_modules/` - Dépendances
- `playwright-report/` - Rapports tests
- `coverage/` - Couverture de code
- `*.config.{js,mjs,ts}` - Fichiers de config

---

## Prettier

### Configuration

Fichier: `.prettierrc`

```json
{
  "printWidth": 100,
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "useTabs": false,
  "endOfLine": "lf",
  "arrowParens": "always",
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "proseWrap": "preserve"
}
```

### Règles

- **printWidth**: 100 caractères max par ligne
- **semi**: Points-virgules obligatoires
- **singleQuote**: Doubles quotes (cohérence React/JSX)
- **tabWidth**: 2 espaces
- **trailingComma**: Virgules finales ES5
- **endOfLine**: LF (Unix)

### Fichiers ignorés

Voir `.prettierignore`:

- Build outputs (`.next/`, `dist/`, `build/`)
- Dependencies (`node_modules/`, `*-lock.{yaml,json}`)
- Test outputs (`coverage/`, `playwright-report/`)
- Logs et fichiers système

---

## Husky & lint-staged

### Workflow pre-commit

Quand vous faites `git commit`:

1. **Husky** intercepte le commit
2. **lint-staged** identifie les fichiers modifiés
3. Pour chaque fichier:
   - `*.{ts,tsx}` → ESLint --fix → Prettier --write
   - `*.{json,md,css}` → Prettier --write
4. Si tout passe ✅ → Commit créé
5. Si erreur ❌ → Commit bloqué

### Configuration

**`.husky/pre-commit`:**

```bash
pnpm lint-staged
```

**`package.json` (lint-staged):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

### Exemple de commit bloqué

```bash
$ git commit -m "feat: add feature"

✖ eslint --fix:
  app/components/Button.tsx
    5:7  error  'unusedVar' is assigned a value but never used

✖ lint-staged failed with errors
```

**Solution**: Corriger l'erreur puis recommiter.

### Bypass (déconseillé)

```bash
# En cas d'urgence uniquement
git commit --no-verify -m "message"
```

⚠️ **Attention**: Le commit sera rejeté par la CI!

---

## CI/CD

### Workflow GitHub Actions

Fichier: `.github/workflows/ci.yml`

### Jobs

#### 1. `lint-and-format`

- Vérifie Prettier (`pnpm format:check`)
- Vérifie ESLint (`pnpm lint`)
- Timeout: 5 minutes

#### 2. `typecheck`

- Vérifie TypeScript (`pnpm typecheck`)
- Timeout: 5 minutes

#### 3. `test` (Matrix)

- Tests sur Node.js 18 et 20
- Tests Playwright
- Upload rapport si échec
- Timeout: 10 minutes

#### 4. `build`

- Build Next.js
- Dépend de `lint-and-format` et `typecheck`
- Upload artifacts `.next/`
- Timeout: 10 minutes

### Triggers

- **Push** sur `main` ou `develop`
- **Pull Request** vers `main` ou `develop`

### Cache

- Cache pnpm store pour accélérer installations
- Clé: `${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}`

### Artifacts

- **Playwright reports** - Conservés 7 jours (uniquement si échec)
- **Build output** - Conservé 7 jours

---

## Commandes

### Développement local

```bash
# Lint
pnpm lint              # Vérifier
pnpm lint:fix          # Corriger automatiquement

# Format
pnpm format            # Formater tous les fichiers
pnpm format:check      # Vérifier le formatage

# TypeScript
pnpm typecheck         # Vérifier les types

# Tests
pnpm test              # Tests Playwright
pnpm test:ui           # Tests en mode UI

# Build
pnpm build             # Build de production
```

### Pre-commit manuel

```bash
# Simuler le pre-commit hook
pnpm lint-staged
```

### Corriger tous les fichiers

```bash
# Fix ESLint + Format
pnpm lint:fix && pnpm format
```

---

## Troubleshooting

### Erreur: "Parsing error: Cannot read file 'tsconfig.json'"

**Cause**: ESLint ne trouve pas tsconfig.json

**Solution**:

```bash
# Vérifier que tsconfig.json existe
ls tsconfig.json

# Réinstaller les dépendances
pnpm install
```

### Erreur: "Delete `␍` prettier/prettier"

**Cause**: Fins de ligne CRLF (Windows) au lieu de LF

**Solution**:

```bash
# Convertir tous les fichiers en LF
pnpm format
```

**Ou configurer Git:**

```bash
git config core.autocrlf input
```

### Erreur: Import order violation

**Cause**: Imports mal ordonnés

**Solution**:

```bash
# Auto-fix avec ESLint
pnpm lint:fix
```

### Husky ne s'exécute pas

**Cause**: Husky non initialisé

**Solution**:

```bash
# Réinstaller Husky
pnpm install
pnpm prepare
```

### CI échoue mais local passe

**Causes possibles**:

1. Cache local obsolète
2. Dépendances manquantes dans pnpm-lock.yaml
3. Node.js version différente

**Solutions**:

```bash
# Nettoyer le cache
rm -rf node_modules .next
pnpm install --frozen-lockfile

# Tester avec la même version Node
nvm use 20  # ou 18
pnpm build
```

---

## Bonnes pratiques

### 1. Commits fréquents

✅ **Bon**: Petits commits atomiques

```bash
git commit -m "feat: add Button component"
git commit -m "test: add Button tests"
git commit -m "docs: update Button documentation"
```

❌ **Mauvais**: Gros commits fourre-tout

```bash
git commit -m "add everything"
```

### 2. Messages de commit

Suivre les [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: correct bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: update dependencies
```

### 3. Pre-commit review

Avant chaque commit:

1. ✅ `pnpm lint:fix`
2. ✅ `pnpm typecheck`
3. ✅ `pnpm test`
4. ✅ Review changes

### 4. Pull Requests

Avant de créer une PR:

1. ✅ Branch à jour avec `main`
2. ✅ Tous les tests passent localement
3. ✅ Code review personnel
4. ✅ Description claire de la PR

---

## Ressources

- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Dernière mise à jour**: 2025-10-25
