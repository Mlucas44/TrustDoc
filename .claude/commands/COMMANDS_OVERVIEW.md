# 🎯 Vue d'Ensemble des Commandes - TrustDoc

## 🚀 Commandes de Développement

### `/feature` - Créer une Nouvelle Fonctionnalité
```
/feature Système d'authentification utilisateur
```
**Pipeline complet :** Plan → Code → Tests → Doc → Validation

---

### `/commit` - Commit Propre
```
/commit
/commit feat: ajout du système de cache
```
**Auto-nettoyage :** Logs → Debug → Doc complexe → Commit

---

### `/check` - Vérification Qualité
```
/check
/check avec tests
```
**Validations :** TypeCheck → Lint → Build → Tests

---

## 🔧 Commandes de Maintenance

### `/fix` - Corriger un Problème
```
/fix Erreur TypeScript dans app/api/users
```
**Workflow :** Diagnostic → Solution → Validation → Doc

---

### `/review` - Revue de Code
```
/review
/review app/components
```
**Analyse :** Architecture → Qualité → Performance → Sécurité

---

### `/doc` - Documentation
```
/doc
/doc architecture API
```
**Génération :** README → Guides → JSDoc → Exemples

---

## 📊 Matrice d'Utilisation

| Situation | Commande | Résultat |
|-----------|----------|----------|
| Nouvelle feature | `/feature Description` | Code + Tests + Doc |
| Bug à corriger | `/fix Description` | Diagnostic + Fix + Validation |
| Avant push | `/check avec tests` | Vérification complète |
| Après dev | `/commit` | Commit propre |
| Revue périodique | `/review` | Rapport qualité |
| Update docs | `/doc Sujet` | Documentation à jour |

---

## 💡 Best Practices

### Workflow Recommandé
1. **Développer** : `/feature Ma fonctionnalité`
2. **Vérifier** : `/check avec tests`
3. **Réviser** : `/review app/ma-fonctionnalité`
4. **Commiter** : `/commit feat: ma fonctionnalité`

### Avant Release
```bash
/review          # Revue complète
/check avec tests # Validation
/doc             # Update documentation
/commit          # Commit final
```

### Debugging
```bash
/fix Description du bug
# ... investigation ...
/check           # Vérifier que c'est corrigé
/commit fix: ...
```

---

## 🎨 Exemples Concrets

### Créer une API
```
/feature API endpoint pour upload de documents PDF
→ Crée : route.ts + validation + tests + doc
```

### Optimiser Performance
```
/review performance
→ Analyse : bundle size + rendering + caching
→ Suggestions d'optimisation
```

### Fix Bug TypeScript
```
/fix Type error in app/components/FileUpload.tsx
→ Identifie : problème de types
→ Corrige : types appropriés
→ Valide : typecheck + build
```

### Documentation API
```
/doc API endpoints documentation
→ Génère : doc complète des endpoints
→ Inclut : exemples + types + erreurs
```

---

## ⚙️ Configuration

Les commandes sont définies dans `.claude/commands/*.md`

Format de commande :
```markdown
---
description: Description courte
---

Instructions détaillées avec {{ARGS}}
```

Pour modifier une commande, éditez le fichier `.md` correspondant.

---

## 📈 Statistiques d'Utilisation

Commandes les plus utiles par phase :

**Développement** : `/feature`, `/check`
**Debug** : `/fix`, `/review`  
**Maintenance** : `/doc`, `/commit`
**Release** : `/review`, `/check`, `/commit`
