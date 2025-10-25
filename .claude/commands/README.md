# Commandes Claude Personnalisées - TrustDoc

Ce dossier contient des commandes personnalisées pour faciliter le développement de TrustDoc avec Claude Code.

## 📋 Commandes Disponibles

### `/commit [message]`
Prépare et crée un commit propre.

**Actions automatiques :**
- Retire les logs et fichiers de debug
- Nettoie le code inutile
- Crée une doc dans `/docs` si la solution implémentée est complexe/étonnante
- Crée le commit avec un message descriptif

**Exemples :**
```
/commit
/commit feat: ajout de l'authentification utilisateur
/commit fix: correction du bug de validation
```

---

### `/check [options]`
Vérifie la qualité du code.

**Actions automatiques :**
- ✅ `pnpm typecheck` - Vérification TypeScript
- ✅ `pnpm lint` - Vérification ESLint
- ✅ `pnpm build` - Vérification du build
- ✅ `pnpm test` - Tests (si demandé)

**Exemples :**
```
/check
/check avec tests
```

---

### `/feature <description>`
Crée une nouvelle fonctionnalité complète.

**Actions automatiques :**
1. Crée un plan avec TodoList
2. Détermine la structure (fichiers, routes, types)
3. Implémente avec Next.js 16 + TypeScript strict
4. Ajoute des tests Playwright
5. Met à jour la documentation
6. Valide la qualité

**Exemples :**
```
/feature Système d'upload de documents PDF
/feature Page de profil utilisateur avec édition
```

---

### `/fix <problème>`
Analyse et corrige les erreurs.

**Actions automatiques :**
1. Diagnostic du problème
2. Proposition et implémentation de solution
3. Validation (typecheck, lint, build)
4. Documentation si nécessaire

**Exemples :**
```
/fix Les tests Playwright échouent
/fix Erreur TypeScript dans app/page.tsx
```

---

### `/review [scope]`
Revue de code et suggestions d'amélioration.

**Aspects analysés :**
- Architecture et structure
- Qualité et bonnes pratiques
- Performance et optimisations
- Sécurité
- Accessibilité
- Tests
- Documentation

**Exemples :**
```
/review
/review app/api
/review performance
```

---

### `/doc [sujet]`
Génère ou met à jour la documentation.

**Actions automatiques :**
1. Analyse du code concerné
2. Création/mise à jour de la documentation
3. Ajout d'exemples et de liens
4. Validation de la clarté

**Exemples :**
```
/doc
/doc API endpoints
/doc architecture du projet
```

---

## 🎯 Workflow Recommandé

### Développer une nouvelle fonctionnalité
```bash
/feature Description de la fonctionnalité
# ... développement ...
/check
/commit
```

### Corriger un bug
```bash
/fix Description du problème
# ... correction ...
/check
/commit fix: correction du bug
```

### Avant de pousser du code
```bash
/review
/check avec tests
/commit
```

---

## 📝 Notes

- Ces commandes sont spécifiques au projet TrustDoc
- Elles respectent l'architecture Next.js 16 + App Router + TypeScript strict
- Les commits suivent les conventions de messages clairs et descriptifs
- La documentation est générée uniquement quand c'est vraiment utile

---

## 🔧 Personnalisation

Pour modifier une commande, éditez le fichier `.md` correspondant dans `.claude/commands/`.

Format :
```markdown
---
description: Description courte de la commande
---

Contenu du prompt avec {{ARGS}} pour les arguments
```
