---
description: Analyse et corrige les erreurs du projet
---

Analyse et corrige les problèmes dans le projet TrustDoc :

Contexte/Problème : "{{ARGS}}"

Processus :

1. **Diagnostic** : Identifie la source du problème
   - Examine les fichiers concernés
   - Vérifie les logs d'erreur
   - Analyse les dépendances

2. **Solution** : Propose et implémente une solution
   - Explique la cause racine
   - Applique le correctif
   - Vérifie qu'il n'y a pas d'effets de bord

3. **Validation** : S'assure que tout fonctionne
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm build`
   - Tests appropriés

4. **Documentation** : Documente la correction si c'est un problème complexe ou récurrent
