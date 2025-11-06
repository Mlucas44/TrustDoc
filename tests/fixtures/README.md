# Test Fixtures - PDF Contracts

Ce répertoire contient les fichiers PDF utilisés pour les tests d'intégration.

## Fichiers requis

Les tests d'intégration nécessitent les fichiers PDF suivants. **IMPORTANT** : Ces fichiers doivent être créés manuellement car ils ne peuvent pas être générés automatiquement.

### 1. sample-freelance.pdf

**Type** : Contrat freelance / prestation de services
**Taille** : 15-20 pages minimum
**Contenu minimal** : ~5000 caractères de texte extractible

**Clauses à inclure** (pour tests réalistes) :

- Délai de paiement (ex: 90 jours)
- Clause de responsabilité
- Propriété intellectuelle
- Conditions de résiliation
- Description de la mission
- Tarifs et modalités de facturation

**Comment créer** :

1. Utiliser un modèle de contrat freelance réel (anonymisé)
2. OU générer un contrat factice avec un outil comme Google Docs / Word
3. Exporter en PDF
4. Placer le fichier dans `tests/fixtures/sample-freelance.pdf`

**Validation** :

```bash
# Vérifier que le PDF est lisible
pnpm tsx scripts/test-pdf-extract.ts tests/fixtures/sample-freelance.pdf
```

---

### 2. sample-employment.pdf

**Type** : Contrat de travail CDI
**Taille** : 20-25 pages minimum
**Contenu minimal** : ~7000 caractères de texte extractible

**Clauses à inclure** :

- Clause de non-concurrence (ex: 12-24 mois)
- Mobilité géographique
- Heures supplémentaires
- Rémunération et avantages
- Période d'essai
- Conditions de rupture

**Comment créer** :

1. Utiliser un modèle de CDI français (anonymisé)
2. OU générer un contrat factice
3. Exporter en PDF
4. Placer le fichier dans `tests/fixtures/sample-employment.pdf`

---

### 3. invalid-too-short.pdf

**Type** : PDF invalide (texte trop court)
**Taille** : 1 page
**Contenu minimal** : < 100 caractères de texte extractible

**Objectif** : Tester la validation `TEXT_TOO_SHORT` de l'API `/api/prepare`

**Comment créer** :

1. Créer un document Word/Google Docs avec SEULEMENT 50 caractères de texte
   ```
   Ceci est un document trop court pour être analysé.
   ```
2. Exporter en PDF
3. Placer le fichier dans `tests/fixtures/invalid-too-short.pdf`

---

### 4. corrupted.pdf

**Type** : PDF corrompu (header invalide)
**Taille** : N/A
**Contenu** : Fichier corrompu non-parsable

**Objectif** : Tester la gestion d'erreur du parsing PDF

**Comment créer** :

1. Créer un fichier texte avec du contenu aléatoire :
   ```
   %PDF-CORRUPTED
   This is not a valid PDF file structure.
   Random bytes to simulate corruption: ∂ƒ¬∆˚¬≈ç√∫˜µ
   ```
2. Sauvegarder avec l'extension `.pdf`
3. Placer le fichier dans `tests/fixtures/corrupted.pdf`

---

## Scripts utilitaires

### Vérifier un PDF

```bash
# Extraire le texte d'un PDF pour vérifier qu'il est parsable
pnpm tsx scripts/test-pdf-extract.ts <chemin-vers-pdf>
```

### Compter les caractères

```bash
# Compter le nombre de caractères extractibles
pnpm tsx scripts/test-pdf-extract.ts <chemin-vers-pdf> | wc -m
```

---

## Alternative : Générateur automatique

Si vous ne souhaitez pas créer les PDFs manuellement, vous pouvez utiliser le script de génération automatique :

```bash
pnpm tsx scripts/generate-test-pdfs.ts
```

**ATTENTION** : Ce script nécessite :

- Node.js >= 20
- Package `pdfkit` ou `puppeteer` pour générer des PDFs
- Les PDFs générés seront moins réalistes que des vrais contrats

---

## Sécurité & Privacy

Les fichiers de ce répertoire sont utilisés UNIQUEMENT pour les tests et ne doivent JAMAIS contenir :

- De vraies données personnelles (noms, adresses, numéros de sécurité sociale)
- De vrais contrats signés
- Des informations confidentielles d'entreprises réelles

**Recommandation** : Utiliser des données factices (Lorem Ipsum, noms d'entreprises fictives, etc.)

---

## Utilisation dans les tests

```typescript
import { integrationClient } from "../helpers/integration-client";

// Upload d'un PDF de test
const result = await integrationClient.upload("sample-freelance.pdf", {
  sessionToken,
});

// Le fichier est lu depuis tests/fixtures/sample-freelance.pdf
```

---

## .gitignore

Par défaut, les fichiers PDF de ce répertoire ne sont PAS ignorés par git. Si vous ajoutez des fichiers contenant des données sensibles, ajoutez-les manuellement au `.gitignore` :

```bash
# .gitignore
tests/fixtures/my-real-contract.pdf
```

---

## Checklist avant de lancer les tests

- [ ] `sample-freelance.pdf` existe et contient > 5000 caractères
- [ ] `sample-employment.pdf` existe et contient > 7000 caractères
- [ ] `invalid-too-short.pdf` existe et contient < 100 caractères
- [ ] `corrupted.pdf` existe et n'est PAS un PDF valide
- [ ] Tous les fichiers sont anonymisés (pas de vraies données)
- [ ] Les PDFs sont parsables avec `pdf-parse` (sauf corrupted.pdf)

---

**Dernière mise à jour** : 2025-01-15
**Version** : 1.0.0
