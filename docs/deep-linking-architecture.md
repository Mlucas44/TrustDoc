# Architecture de Deep-linking pour les Analyses

## Vue d'ensemble

Le système de deep-linking permet aux utilisateurs d'accéder directement à un onglet spécifique d'une analyse via l'URL, facilitant le partage et la navigation.

## Composants principaux

### 1. Gestion d'état URL (`src/lib/tab-utils.ts`)

Utilitaires centralisés pour gérer l'état des onglets via l'URL :

```typescript
type AnalysisTab = "overview" | "red-flags" | "clauses" | "summary" | "json";
```

**Priorité de résolution** : Hash (`#red-flags`) > Query (`?tab=red-flags`) > Défaut

### 2. Architecture Server/Client

**Server Component** (`app/analysis/[id]/page.tsx`) :

- Authentification et vérification de propriété
- Récupération des données minimales
- Détermination de l'onglet initial depuis l'URL
- Sécurité : 404 pour analyses inexistantes ou non autorisées

**Client Component** (`src/components/analysis/AnalysisDetailClient.tsx`) :

- Interface à onglets avec synchronisation URL
- Écoute des changements de hash (`hashchange`)
- Gestion de l'historique du navigateur (`pushState`)
- Focus management pour l'accessibilité

### 3. Navigation depuis l'historique

Le composant `HistoryTable` propose :

- **Bouton principal "Ouvrir"** : `/analysis/[id]` (vue d'ensemble par défaut)
- **Boutons d'action rapide** :
  - 🔺 Points d'attention : `/analysis/[id]#red-flags`
  - 📄 Clauses clés : `/analysis/[id]#clauses`

## Flux de navigation

```
Histoire → Clic sur icône → URL avec hash → Server (auth) → Client (tab actif)
          ↓
/history → /analysis/123#red-flags → Vérifie propriété → Ouvre onglet "red-flags"
```

## Fonctionnalités

✅ Deep-linking avec hash et query params
✅ Synchronisation bidirectionnelle URL ↔ État
✅ Historique du navigateur (bouton retour fonctionne)
✅ Sécurité : pas de fuite de données
✅ Accessibilité : focus management
✅ États de chargement (skeletons)
✅ Page 404 personnalisée
✅ Responsive (desktop + mobile)

## Exemples d'URLs

- `/analysis/abc123` → Vue d'ensemble
- `/analysis/abc123#red-flags` → Points d'attention
- `/analysis/abc123?tab=clauses` → Clauses clés
- `/analysis/abc123#summary` → Résumé
- `/analysis/abc123#json` → Export JSON

## Considérations de sécurité

- Vérification de propriété côté serveur
- 404 générique (ne révèle pas l'existence de l'analyse)
- Pas d'exposition de données sensibles dans l'URL
- Session requise pour accès

## Tests

Pour tester le deep-linking :

1. Naviguer vers `/history`
2. Cliquer sur l'icône 🔺 ou 📄
3. Vérifier l'onglet actif dans `/analysis/[id]`
4. Utiliser le bouton retour du navigateur
5. Vérifier que l'URL et l'onglet restent synchronisés
