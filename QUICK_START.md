# 🚀 Quick Start - TrustDoc

## Installation Rapide

```bash
# Installer les dépendances
pnpm install

# Installer les navigateurs Playwright (première fois uniquement)
pnpm exec playwright install chromium
```

## Développement

```bash
# Démarrer le serveur de développement
pnpm dev

# Ouvrir http://localhost:3000
```

## Tests

```bash
# Lancer tous les tests
pnpm test

# Tests avec interface UI
pnpm test:ui
```

## Validation

```bash
# Vérifier le typage TypeScript
pnpm typecheck

# Vérifier le linting
pnpm lint

# Build de production
pnpm build

# Démarrer en production
pnpm start
```

## Commandes Essentielles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement (http://localhost:3000) |
| `pnpm build` | Build de production optimisé |
| `pnpm start` | Démarre le serveur de production |
| `pnpm test` | Exécute les tests Playwright |
| `pnpm lint` | Vérifie le code avec ESLint |
| `pnpm typecheck` | Vérifie les types TypeScript |

## URLs Importantes

- **Homepage**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Première Utilisation

1. **Clone et installation**
   ```bash
   cd TrustDoc
   pnpm install
   pnpm exec playwright install chromium
   ```

2. **Lancer le serveur**
   ```bash
   pnpm dev
   ```

3. **Vérifier que tout fonctionne**
   ```bash
   # Dans un autre terminal
   curl http://localhost:3000/api/health
   # Devrait retourner: {"status":"ok"}
   ```

4. **Lancer les tests**
   ```bash
   pnpm test
   # Tous les tests devraient passer
   ```

## Structure des Fichiers

```
app/
├── page.tsx           # Page d'accueil (/)
├── layout.tsx         # Layout racine
└── api/health/
    └── route.ts       # GET /api/health

tests/
└── app.spec.ts        # Tests Playwright
```

## Prochaines Étapes

Consultez le [README.md](README.md) pour plus de détails sur:
- Architecture du projet
- Documentation complète
- Bonnes pratiques

Pour la validation complète, voir [VALIDATION.md](VALIDATION.md)
