# Audit UI/UX - TrustDoc

**Date**: 2025-11-06
**Objectif**: Fluidifier le parcours utilisateur "Arriver → Uploader → Analyser → Consulter"
**Status**: En cours

---

## 1. Cartographie de l'existant

### 1.1. Plan du site (Sitemap)

```
TrustDoc
├── / (Landing page)
├── /auth
│   ├── /auth/signin (Connexion)
│   ├── /auth/error (Erreur auth)
│   └── /auth/verify-request (Vérification email)
├── /dashboard (Tableau de bord utilisateur)
├── /credits (Gestion des crédits)
│   ├── /billing/success (Paiement réussi)
│   └── /billing/cancel (Paiement annulé)
├── /history (Historique des analyses)
├── /analysis/[id] (Détail d'une analyse)
├── /unauthorized (Accès refusé)
└── /styleguide (Guide de style - dev)
```

### 1.2. Routes API principales

```
API Routes
├── /api/auth/[...nextauth] (NextAuth)
├── /api/upload (Upload PDF)
├── /api/prepare (Préparation du texte)
├── /api/detect-type (Détection type de contrat)
├── /api/analyze (Analyse LLM)
├── /api/credits (Consultation solde)
├── /api/history (Liste analyses)
├── /api/analysis/[id] (GET/DELETE analyse)
│   ├── /api/analysis/[id]/restore (Restaurer)
│   ├── /api/analysis/[id]/export.json (Export JSON)
│   └── /api/analysis/[id]/export.md (Export Markdown)
├── /api/billing
│   ├── /api/billing/checkout (Créer session Stripe)
│   ├── /api/billing/webhook (Webhook Stripe)
│   └── /api/billing/history (Historique achats)
├── /api/guest
│   ├── /api/guest/init (Initialiser session invité)
│   └── /api/guest/status (Statut quota invité)
├── /api/jobs (CRON jobs - cleanup, retention)
├── /api/me (Infos utilisateur courant)
└── /api/health (Health check DB)
```

### 1.3. Navigation (Navbar)

**Composant**: [components/navbar.tsx](components/navbar.tsx)

**Structure actuelle**:

```
┌─────────────────────────────────────────────────────────────┐
│ TrustDoc  Accueil  Documentation  │  [Credits] [Theme] [Auth] │
└─────────────────────────────────────────────────────────────┘
```

**CTAs navbar**:

- **Logo "TrustDoc"** → `/` (Accueil)
- **"Accueil"** → `/` (Redondant avec logo)
- **"Documentation"** → `/docs` (404 - route inexistante)
- **CreditsBadge** → Affiche solde crédits (cliquable vers `/credits`)
- **ThemeToggle** → Bascule dark/light mode
- **AuthButton** → Menu déroulant si connecté:
  - "Mes crédits (X)" → `/credits`
  - "Mon profil" → `/dashboard/profile` (404 - route inexistante)
  - "Se déconnecter" → Déconnexion

### 1.4. Landing page (/)

**Fichier**: [app/page.tsx](app/page.tsx)

**CTAs**:

- **"Vérifier un document"** → `/verify` (404 - route inexistante)
- **"Documentation"** → `/docs` (404 - route inexistante)

**Problème critique**: Les deux CTA principaux mènent vers des routes 404.

### 1.5. Dashboard (/dashboard)

**Fichier**: [app/dashboard/page.tsx](app/dashboard/page.tsx)

**État**: Page protégée avec auth requise
**CTAs**:

- **"Commencer une analyse"** → `<button>` sans lien (non fonctionnel)
- **"Voir les offres"** → `<button>` sans lien (non fonctionnel)

**Problème**: Deux boutons d'action principaux ne font rien (placeholders).

### 1.6. Historique (/history)

**Fichier**: [app/history/page.tsx](app/history/page.tsx)
**Composant**: [src/components/history/HistoryTable.tsx](src/components/history/HistoryTable.tsx)

**État**: Page protégée, redirection vers `/` si non connecté
**Fonctionnalités**:

- ✅ Recherche par nom de fichier
- ✅ Filtres (type, risque)
- ✅ Pagination cursor-based
- ✅ Actions: Ouvrir, Supprimer, Deep-links vers red-flags/clauses
- ✅ Responsive (table desktop, cards mobile)
- ✅ Empty state avec CTA "Importer un contrat" → `/`

**Problème**: Le CTA dans l'empty state redirige vers la landing page au lieu d'une page d'upload dédiée.

### 1.7. Crédits (/credits)

**Fichier**: [app/credits/page.tsx](app/credits/page.tsx)

**État**: Page protégée avec auth requise
**Composants**:

- **CreditsBalance**: Affichage du solde avec refresh SWR
- **PaymentSuccessBanner**: Bannière après achat réussi
- **CreditPacksGrid**: Grille des packs (STARTER, PRO, SCALE)
- **PurchaseHistoryTable**: Historique des achats

**Fonctionnalités**:

- ✅ Affichage solde temps réel (SWR)
- ✅ Achat de crédits via Stripe Checkout
- ✅ Historique des transactions
- ✅ Filtres et pagination

### 1.8. Analyse détaillée (/analysis/[id])

**Fichier**: [app/analysis/[id]/page.tsx](app/analysis/[id]/page.tsx)
**Composant client**: [src/components/analysis/AnalysisDetailClient.tsx](src/components/analysis/AnalysisDetailClient.tsx)

**État**: Page protégée, vérification ownership
**Tabs**:

- **Overview** (Vue d'ensemble)
- **Red Flags** (Points d'attention)
- **Clauses** (Clauses clés)
- **Summary** (Résumé)
- **JSON** (Export brut)

**Fonctionnalités**:

- ✅ Navigation tabs avec URL sync (hash + query)
- ✅ Deep-linking (#red-flags, #clauses, ?tab=summary)
- ✅ Export JSON/Markdown
- ✅ DisclaimerBanner (Avertissement légal)
- ✅ RiskGauge visuel
- ✅ Responsive

---

## 2. Parcours utilisateurs cibles

### 2.1. Happy Path (Utilisateur authentifié)

```
1. Arrivée sur landing page (/)
   └─> Comprendre l'offre (features cards)

2. Clic "Se connecter" (Navbar)
   └─> /auth/signin
   └─> Google OAuth
   └─> Redirection vers /dashboard

3. Visualiser son solde et crédits (dashboard)
   └─> 10 crédits offerts à l'inscription

4. [MANQUANT] Uploader un PDF
   └─> Besoin d'une page /upload dédiée OU
   └─> Upload dropzone sur /dashboard

5. Déclencher analyse
   └─> POST /api/upload → /api/prepare → /api/analyze
   └─> Débitage 1 crédit

6. Consulter résultats
   └─> /analysis/[id]
   └─> Vue d'ensemble → Red flags → Clauses → Export

7. Accéder à l'historique
   └─> /history
   └─> Recherche/filtres/pagination

8. Acheter des crédits (si besoin)
   └─> /credits
   └─> Stripe Checkout
   └─> /billing/success
```

### 2.2. Variante (Utilisateur invité - non implémenté)

```
1. Arrivée sur landing page (/)

2. [MANQUANT] Uploader un PDF sans compte
   └─> POST /api/guest/init (obtenir sessionId)
   └─> Quota: 1 analyse gratuite

3. Déclencher analyse
   └─> Idem utilisateur auth mais avec guestId

4. Consulter résultats
   └─> /analysis/[id]
   └─> Message: "Créez un compte pour sauvegarder"

5. Invitation à créer un compte
   └─> Modal ou banner persistant
   └─> Redirect vers /auth/signin
```

### 2.3. Variante (Acheter des crédits)

```
1. Utilisateur connecté avec 0 crédits

2. Tentative d'analyse
   └─> Modal "Crédits insuffisants"
   └─> CTA "Acheter des crédits" → /credits

3. Page crédits
   └─> Choix pack (STARTER/PRO/SCALE)
   └─> Clic "Acheter"
   └─> POST /api/billing/checkout

4. Redirection Stripe Checkout
   └─> Paiement CB

5. Retour application
   └─> /billing/success?session_id=xxx
   └─> Webhook Stripe crédite le compte

6. Confirmation
   └─> Banner "10 crédits ajoutés !"
   └─> Redirection vers /dashboard ou /history
```

---

## 3. Tableau d'audit des CTAs

| Page/Composant          | CTA                     | Destination                      | État                   | Priorité | Action                                      |
| ----------------------- | ----------------------- | -------------------------------- | ---------------------- | -------- | ------------------------------------------- |
| **Landing (/)**         | "Vérifier un document"  | `/verify`                        | 🔴 **404**             | **P0**   | Remplacer par `/upload` ou `/dashboard`     |
| **Landing (/)**         | "Documentation"         | `/docs`                          | 🔴 **404**             | P2       | Créer la page OU rediriger vers README      |
| **Navbar**              | Logo "TrustDoc"         | `/`                              | ✅ OK                  | -        | -                                           |
| **Navbar**              | "Accueil"               | `/`                              | ⚠️ Redondant           | P2       | Supprimer (doublon avec logo)               |
| **Navbar**              | "Documentation"         | `/docs`                          | 🔴 **404**             | P2       | Idem landing                                |
| **Navbar → AuthButton** | "Mon profil"            | `/dashboard/profile`             | 🔴 **404**             | **P1**   | Créer la page OU remplacer par `/dashboard` |
| **Navbar → AuthButton** | "Mes crédits (X)"       | `/credits`                       | ✅ OK                  | -        | -                                           |
| **Dashboard**           | "Commencer une analyse" | ❌ Aucune                        | 🔴 **Non fonctionnel** | **P0**   | Lier à `/upload` ou upload inline           |
| **Dashboard**           | "Voir les offres"       | ❌ Aucune                        | 🔴 **Non fonctionnel** | P1       | Lier à `/credits`                           |
| **History (empty)**     | "Importer un contrat"   | `/`                              | ⚠️ Suboptimal          | **P1**   | Rediriger vers `/upload`                    |
| **Analysis detail**     | Export JSON             | `/api/analysis/[id]/export.json` | ✅ OK                  | -        | -                                           |
| **Analysis detail**     | Export Markdown         | `/api/analysis/[id]/export.md`   | ✅ OK                  | -        | -                                           |
| **Credits**             | "Acheter" (pack)        | Stripe Checkout                  | ✅ OK                  | -        | -                                           |
| **History (table)**     | "Ouvrir"                | `/analysis/[id]`                 | ✅ OK                  | -        | -                                           |
| **History (table)**     | Deep-link red-flags     | `/analysis/[id]#red-flags`       | ✅ OK                  | -        | -                                           |
| **History (table)**     | Deep-link clauses       | `/analysis/[id]#clauses`         | ✅ OK                  | -        | -                                           |

### Légende

- 🔴 **404 ou Non fonctionnel**: Bloquant
- ⚠️ **Suboptimal**: Fonctionne mais UX améliorable
- ✅ **OK**: Fonctionne correctement

---

## 4. États UI à harmoniser

### 4.1. États identifiés

| Composant                | Loading       | Empty                | Error         | Success        | Notes                                          |
| ------------------------ | ------------- | -------------------- | ------------- | -------------- | ---------------------------------------------- |
| **CreditsBadge**         | ✅ Pulse      | ⚠️ Hidden            | ❌ Non géré   | ✅ Affichage   | Si erreur API, badge disparaît silencieusement |
| **AuthButton**           | ✅ Skeleton   | ✅ "Se connecter"    | ❌ Non géré   | ✅ Menu        | -                                              |
| **HistoryTable**         | ✅ isPending  | ✅ Empty state + CTA | ❌ Non géré   | ✅ Table/Cards | Pas de message d'erreur si fetch échoue        |
| **CreditsBalance**       | ⚠️ Absent     | ⚠️ Absent            | ⚠️ Absent     | ✅ Affichage   | Composant non analysé en détail                |
| **CreditPacksGrid**      | ⚠️ Par bouton | ⚠️ Absent            | ⚠️ Toast only | ✅ Redirect    | Erreurs affichées uniquement en toast          |
| **PurchaseHistoryTable** | ⚠️ Absent     | ⚠️ Absent            | ⚠️ Absent     | ✅ Table       | Composant non analysé en détail                |
| **AnalysisDetailClient** | ⚠️ SSR only   | ⚠️ N/A               | ❌ Non géré   | ✅ Tabs        | Pas de skeleton côté client                    |

### 4.2. Recommandations

**P0** (Bloquant):

- **CreditsBadge**: Afficher un message d'erreur ou un fallback au lieu de disparaître
- **HistoryTable**: Afficher une Card d'erreur avec retry button si fetch échoue

**P1** (Important):

- **CreditsBalance**: Ajouter états loading, empty, error explicites
- **CreditPacksGrid**: Améliorer feedback erreur (pas seulement toast)
- **PurchaseHistoryTable**: Ajouter états loading, empty, error

**P2** (Nice to have):

- **AnalysisDetailClient**: Ajouter skeleton côté client pour fluidité
- Harmoniser les composants de loading (Spinner vs Skeleton vs Pulse)

---

## 5. Accessibilité et responsive

### 5.1. Points positifs

- ✅ **HistoryTable**: Responsive table → cards mobile
- ✅ **Navbar**: Burger menu sur mobile (hidden md:flex)
- ✅ **Dark mode**: ThemeToggle fonctionnel
- ✅ **Focus management**: Tab navigation dans AnalysisDetailClient
- ✅ **Semantic HTML**: Utilisation de `<nav>`, `<header>`, `<main>`

### 5.2. Améliorations accessibilité

**P0**:

- ❌ **Navbar links**: Manque `aria-label` ou `aria-current` pour page active
- ❌ **Logo TrustDoc**: Manque alt text descriptif (actuellement juste `<span>`)
- ❌ **CTA buttons**: Certains boutons manquent de labels explicites (ex: IconButton sans title)

**P1**:

- ⚠️ **Skip to content**: Manque un lien "Skip to main content" pour lecteurs d'écran
- ⚠️ **Focus visible**: Vérifier styles :focus-visible sur tous les interactifs
- ⚠️ **ARIA landmarks**: Ajouter role="main", role="complementary" si pertinent

**P2**:

- ⚠️ **Keyboard shortcuts**: Possibilité d'ajouter des raccourcis (ex: `?` pour help)
- ⚠️ **Screen reader announcements**: Utiliser `aria-live` pour notifications

### 5.3. Améliorations responsive

**P0**:

- ❌ **Dashboard**: Cards "Commencer analyse" et "Voir offres" doivent être responsive (actuellement grid fixe)
- ❌ **Landing page**: Features cards en grid md:grid-cols-3 → vérifier spacing mobile

**P1**:

- ⚠️ **Navbar**: "Documentation" disparaît sur très petit écran → envisager overflow menu
- ⚠️ **Analysis tabs**: TabsList peut déborder sur mobile si trop de tabs

---

## 6. Éléments orphelins ou inutiles

### 6.1. Routes 404 (à créer ou rediriger)

| Route                | Référencé par         | Action recommandée                                |
| -------------------- | --------------------- | ------------------------------------------------- |
| `/verify`            | Landing page CTA      | **Créer la page** OU rediriger vers `/upload`     |
| `/docs`              | Landing + Navbar (×2) | **Créer la page** OU rediriger vers GitHub README |
| `/dashboard/profile` | Navbar → AuthButton   | **Créer la page** OU rediriger vers `/dashboard`  |

### 6.2. Composants ou pages inutilisés

| Fichier                   | Statut                   | Action                                    |
| ------------------------- | ------------------------ | ----------------------------------------- |
| `/styleguide`             | Page de dev uniquement   | ✅ Conserver pour design system interne   |
| `/unauthorized`           | Page d'erreur d'accès    | ✅ Conserver (nécessaire pour edge cases) |
| `app/auth/error`          | Gestion erreurs NextAuth | ✅ Conserver (nécessaire)                 |
| `app/auth/verify-request` | Email magic link         | ✅ Conserver (si email provider activé)   |

### 6.3. Liens redondants

- **Navbar "Accueil"** + **Logo TrustDoc** → Tous deux mènent à `/`
  - **Action**: Supprimer le lien "Accueil" ou le remplacer par un lien plus utile (ex: "Mes analyses" → `/history`)

### 6.4. Composants incomplets

- **Dashboard buttons**: "Commencer une analyse" et "Voir les offres" sont des `<button>` sans action
  - **Action**: Les transformer en `<Link>` fonctionnels

---

## 7. Guidage et réassurance

### 7.1. Éléments présents

| Élément                  | Localisation             | État                                      |
| ------------------------ | ------------------------ | ----------------------------------------- |
| **DisclaimerBanner**     | `/analysis/[id]`         | ✅ Présent (avertissement légal)          |
| **PaymentSuccessBanner** | `/credits` (après achat) | ✅ Présent                                |
| **CreditsBadge**         | Navbar (si connecté)     | ✅ Présent (indicateur de quota)          |
| **Empty states**         | HistoryTable             | ✅ Présent avec CTA "Importer un contrat" |
| **Toast notifications**  | Global (Toaster)         | ✅ Présent (succès, erreurs)              |

### 7.2. Éléments manquants

**P0** (Bloquant):

- ❌ **Onboarding**: Aucun guidage à la première connexion
- ❌ **Explication crédits**: Pas de tooltip/info "Qu'est-ce qu'un crédit ?" sur la landing page
- ❌ **Coût de l'analyse**: Pas d'indication "Cette analyse consommera 1 crédit" avant de cliquer

**P1** (Important):

- ⚠️ **Quota invité**: Si mode invité implémenté, manque un bandeau "1 analyse gratuite restante"
- ⚠️ **Temps estimé**: Pas de feedback "Analyse en cours, ~15 secondes" pendant le processing
- ⚠️ **Limites upload**: Pas d'indication visible "10 MB max, PDF uniquement" sur la dropzone

**P2** (Nice to have):

- ⚠️ **Tooltips**: Ajouter des `?` info icons sur les features complexes (ex: RiskScore, Red Flags)
- ⚠️ **Progressive disclosure**: Masquer les tabs avancées (JSON export) pour les nouveaux utilisateurs
- ⚠️ **Changelog**: Afficher un badge "Nouveau" sur les features récentes

### 7.3. Propositions de messages

**Avant analyse**:

```
[i] Cette analyse consommera 1 crédit.
    Vous avez actuellement X crédits.
    [En savoir plus sur les crédits]
```

**Pendant analyse**:

```
[Spinner] Analyse en cours...
          Parsing du PDF → Détection du type → Analyse LLM
          ⏱️ Temps estimé : 10-20 secondes
```

**Après analyse (banner en haut)**:

```
[✓] Analyse terminée avec succès !
    1 crédit a été débité. Il vous reste X crédits.
    [Acheter des crédits]
```

**Crédits insuffisants**:

```
[!] Crédits insuffisants
    Vous avez 0 crédit. Une analyse coûte 1 crédit.
    [Acheter des crédits] [En savoir plus]
```

**Onboarding première connexion**:

```
[🎉] Bienvenue sur TrustDoc !
     Vous avez reçu 10 crédits offerts pour commencer.
     Chaque analyse de contrat coûte 1 crédit.
     [Commencer mon analyse] [Plus tard]
```

---

## 8. Plan d'action priorisé

### Phase 1 - Blocages critiques (P0)

| Tâche                                                             | Estimation | Assignation |
| ----------------------------------------------------------------- | ---------- | ----------- |
| 1. Créer la page `/upload` ou intégrer upload sur `/dashboard`    | 4h         | Dev         |
| 2. Corriger CTA "Vérifier un document" (landing) → `/upload`      | 5min       | Dev         |
| 3. Corriger CTA "Commencer une analyse" (dashboard) → `/upload`   | 5min       | Dev         |
| 4. Corriger ou supprimer lien "Mon profil" (navbar)               | 15min      | Dev + PO    |
| 5. Ajouter gestion d'erreur sur CreditsBadge (fallback)           | 1h         | Dev         |
| 6. Ajouter gestion d'erreur sur HistoryTable (retry button)       | 1h         | Dev         |
| 7. Ajouter message "Coût: 1 crédit" avant déclenchement analyse   | 30min      | Dev         |
| 8. Ajouter accessibilité: aria-label, alt text logo, aria-current | 2h         | Dev         |

**Total Phase 1**: ~9h

### Phase 2 - Améliorations importantes (P1)

| Tâche                                                                  | Estimation | Assignation   |
| ---------------------------------------------------------------------- | ---------- | ------------- |
| 9. Créer `/docs` ou rediriger vers README GitHub                       | 2h         | Dev + Content |
| 10. Corriger CTA "Voir les offres" (dashboard) → `/credits`            | 5min       | Dev           |
| 11. Corriger CTA empty state history → `/upload`                       | 5min       | Dev           |
| 12. Ajouter états loading/empty/error sur CreditsBalance               | 2h         | Dev           |
| 13. Ajouter états loading/empty/error sur PurchaseHistoryTable         | 2h         | Dev           |
| 14. Améliorer feedback erreur CreditPacksGrid (modal au lieu de toast) | 1h         | Dev           |
| 15. Supprimer lien "Accueil" redondant dans navbar                     | 5min       | Dev           |
| 16. Ajouter banner onboarding première connexion                       | 3h         | Dev + UX      |
| 17. Ajouter indicateur "Analyse en cours" avec temps estimé            | 2h         | Dev           |
| 18. Ajouter "Skip to content" link pour accessibilité                  | 30min      | Dev           |

**Total Phase 2**: ~13h

### Phase 3 - Nice to have (P2)

| Tâche                                                            | Estimation | Assignation   |
| ---------------------------------------------------------------- | ---------- | ------------- |
| 19. Harmoniser composants de loading (standardiser sur Skeleton) | 3h         | Dev           |
| 20. Ajouter tooltips explicatifs (RiskScore, Red Flags, etc.)    | 4h         | Dev + Content |
| 21. Améliorer responsive navbar (overflow menu)                  | 2h         | Dev           |
| 22. Ajouter skeleton côté client sur AnalysisDetailClient        | 1h         | Dev           |
| 23. Ajouter raccourcis clavier (keyboard shortcuts)              | 3h         | Dev           |
| 24. Implémenter mode invité (guest flow)                         | 8h         | Dev           |
| 25. Ajouter tests E2E Playwright pour happy paths                | 6h         | QA            |

**Total Phase 3**: ~27h

---

## 9. Métriques de succès

### 9.1. Avant/Après

| Métrique                                 | Avant | Cible  | Outil            |
| ---------------------------------------- | ----- | ------ | ---------------- |
| **Taux de conversion landing → upload**  | ? %   | +50%   | Analytics        |
| **Taux d'abandon upload → analyse**      | ? %   | <10%   | Funnel tracking  |
| **Taux de ré-achat crédits**             | ? %   | +30%   | Stripe Dashboard |
| **Score Lighthouse Accessibility**       | ?     | >95    | Lighthouse CI    |
| **Temps moyen jusqu'à première analyse** | ? min | <2 min | Analytics        |
| **Taux de rebond landing page**          | ? %   | <40%   | Analytics        |

### 9.2. KPIs à suivre

- **Analyses/jour**: Nombre d'analyses totales
- **Crédits achetés/semaine**: Revenu récurrent
- **Erreurs 404**: Taux de clics sur liens cassés
- **Erreurs API**: Taux d'échec `/api/analyze`, `/api/upload`
- **Taux de crédits non utilisés**: % users avec crédits > 0 mais 0 analyses dans 30j

---

## 10. Notes et questions

### Questions ouvertes

1. **Mode invité**: Doit-on l'implémenter ? Si oui, dans quelle phase ?
2. **Documentation**: Page `/docs` intégrée dans l'app ou lien externe vers GitHub ?
3. **Profil utilisateur**: Quelles infos afficher sur `/dashboard/profile` (email, historique, stats) ?
4. **Upload UX**: Page dédiée `/upload` OU upload inline sur `/dashboard` ?
5. **Quota guest**: 1 analyse gratuite suffisant ? Tracking par IP ou cookie ?

### Dépendances externes

- **Stripe**: Webhook `/api/billing/webhook` doit être configuré en production
- **NextAuth**: Email provider (SMTP) pour magic links optionnel
- **Supabase Storage**: Upload PDF nécessite bucket configuré
- **OpenAI API**: Crédit LLM à surveiller

### Risques identifiés

- **404 sur landing**: Utilisateurs abandonnent immédiatement si CTA ne fonctionne pas
- **Dashboard vide**: Sans CTA fonctionnel, utilisateurs ne savent pas quoi faire
- **Erreurs silencieuses**: CreditsBadge qui disparaît sans explication crée confusion
- **Accessibilité**: Non-conformité ARIA peut bloquer utilisateurs avec handicaps

---

## Annexes

### A. Palette de couleurs (à documenter)

- **Primary**: `hsl(var(--primary))` (bleu)
- **Destructive**: `hsl(var(--destructive))` (rouge)
- **Muted**: `hsl(var(--muted))` (gris clair)
- **Border**: `hsl(var(--border))` (gris bordure)

### B. Composants UI réutilisables

- `Button` (variants: default, destructive, outline, ghost, link)
- `Card`, `CardHeader`, `CardContent`
- `Badge` (variants: default, outline, secondary, destructive)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Dialog`, `AlertDialog`
- `Toast`, `Toaster`
- `Skeleton`
- `Progress`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`

### C. États des features

| Feature               | État                    | Notes                                      |
| --------------------- | ----------------------- | ------------------------------------------ |
| **Auth Google OAuth** | ✅ Fonctionnel          | NextAuth v5 beta                           |
| **Upload PDF**        | ⚠️ API OK, UI manquante | `/api/upload` existe                       |
| **Analyse LLM**       | ✅ Fonctionnel          | OpenAI gpt-4o-mini                         |
| **Crédits**           | ✅ Fonctionnel          | Système de débitage OK                     |
| **Stripe**            | ✅ Fonctionnel          | Checkout + Webhook OK                      |
| **Historique**        | ✅ Fonctionnel          | Filtres + Pagination OK                    |
| **Export**            | ✅ Fonctionnel          | JSON + Markdown OK                         |
| **Mode invité**       | ❌ Non implémenté       | API existe (`/api/guest/*`) mais pas d'UI  |
| **Dark mode**         | ✅ Fonctionnel          | ThemeProvider + toggle                     |
| **Responsive**        | ⚠️ Partiel              | Navbar et HistoryTable OK, reste à valider |
| **Tests E2E**         | ⚠️ Partiels             | Playwright configuré, tests incomplets     |

---

**Dernière mise à jour**: 2025-11-06
**Prochaine revue**: Après implémentation Phase 1
