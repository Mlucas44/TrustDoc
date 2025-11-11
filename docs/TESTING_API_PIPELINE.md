# Testing API Pipeline - TrustDoc

Ce document décrit comment tester le pipeline d'analyse `/api/prepare` → `/api/analyze` avec des exemples cURL.

## Architecture

Le pipeline est maintenant **stateless** et **durable** :

1. **`POST /api/prepare`** : Parse PDF, nettoie texte, persiste dans `analysis_jobs` table
   - Input : `{ filePath: string }`
   - Output : `{ jobId: string }`
   - Le texte nettoyé est stocké en DB pour consultation ultérieure

2. **`POST /api/analyze`** : Récupère texte en DB, analyse avec LLM, met à jour `analysis_jobs`
   - Input : `{ jobId: string }`
   - Output : `{ analysis: AnalysisResult, analysisId: string }`
   - **Idempotent** : si déjà analysé, retourne le résultat en cache

## Prérequis

- Serveur Next.js démarré : `pnpm dev`
- Base de données migrée : `pnpm prisma migrate dev`
- PDF uploadé dans storage (via l'UI ou directement)
- Session authentifiée (cookie ou token)

## Codes d'erreur standardisés

### `/api/prepare`

| Code | Status | Description |
|------|--------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de 5 req/min dépassée |
| `INSUFFICIENT_CREDITS` | 402 | Crédits insuffisants (user) |
| `GUEST_QUOTA_EXCEEDED` | 402 | Quota guest dépassé (3 analyses max) |
| `INVALID_REQUEST_BODY` | 400 | Corps de requête invalide (Zod) |
| `INVALID_JSON` | 400 | JSON mal formé |
| `FILE_NOT_FOUND` | 404 | Fichier introuvable dans storage |
| `PDF_TOO_LARGE` | 413 | PDF > 10 MB |
| `PDF_TEXT_EMPTY_OR_SCANNED` | 422 | PDF scanné ou vide |
| `TEXT_TOO_SHORT_AFTER_CLEANUP` | 422 | Texte < 10 chars après nettoyage |
| `PARSE_FAILED` | 500 | Erreur parsing PDF (corrompu/crypté) |
| `PREPARE_TIMEOUT` | 504 | Timeout > 20s |
| `EMPTY_TEXT_CLEAN` | 422 | textClean vide après extraction |
| `DB_WRITE_FAILED` | 500 | Échec écriture DB |

### `/api/analyze`

| Code | Status | Description |
|------|--------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de 3 req/5min dépassée |
| `INSUFFICIENT_CREDITS` | 402 | Crédits insuffisants |
| `GUEST_QUOTA_EXCEEDED` | 402 | Quota guest dépassé |
| `INVALID_REQUEST_BODY` | 400 | Corps invalide (Zod) |
| `INVALID_JSON` | 400 | JSON mal formé |
| `JOB_NOT_FOUND` | 404 | Job inexistant en DB |
| `ACCESS_DENIED` | 403 | Job non possédé par user |
| `MISSING_TEXT_CLEAN` | 422 | text_clean manquant en DB |
| `TEXT_TOO_SHORT` | 422 | text_clean < 200 chars |
| `TEXT_TOO_LONG` | 422 | text_clean > 200k chars |
| `MISSING_CONTRACT_TYPE` | 422 | contract_type manquant |
| `LLM_RATE_LIMIT_EXCEEDED` | 429 | Limite LLM provider dépassée |
| `LLM_TRANSIENT_ERROR` | 503 | Erreur temporaire LLM (5xx) |
| `LLM_UNAVAILABLE` | 503 | Provider LLM indisponible |
| `ANALYSIS_INVALID_OUTPUT` | 422 | Sortie LLM invalide après retries |
| `ANALYSIS_FAILED` | 500 | Échec analyse LLM |
| `DB_READ_FAILED` | 500 | Échec lecture DB |

## Tests manuels (cURL)

### 1. Test nominal : Préparation + Analyse

```bash
# 1.1. Upload PDF (via UI ou API /api/upload)
# Suppose que vous avez un filePath: "user-cm4x5y6z7/abc123-1699123456789.pdf"

# 1.2. Préparer le document
curl -X POST http://localhost:3000/api/prepare \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "filePath": "user-cm4x5y6z7/abc123-1699123456789.pdf"
  }'

# Réponse attendue (200 OK):
# {
#   "jobId": "cm5abc123xyz"
# }

# 1.3. Analyser le document avec jobId
JOB_ID="cm5abc123xyz"  # Remplacer par le jobId reçu

curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d "{
    \"jobId\": \"$JOB_ID\"
  }"

# Réponse attendue (200 OK):
# {
#   "analysis": {
#     "riskScore": 45,
#     "summary": "...",
#     "redFlags": [...],
#     "clauses": [...]
#   },
#   "analysisId": "cm5abc123xyz"
# }
```

### 2. Test idempotence : Ré-analyser le même job

```bash
# 2.1. Re-call /api/analyze avec le même jobId
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d "{
    \"jobId\": \"$JOB_ID\"
  }"

# Réponse attendue (200 OK) :
# - Retourne IMMÉDIATEMENT le résultat en cache (status="analyzed")
# - Pas d'appel LLM
# - Même contenu qu'au premier appel
```

### 3. Test erreur : Job inexistant

```bash
# 3.1. Appeler /api/analyze avec un jobId invalide
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "jobId": "INVALID_JOB_ID"
  }'

# Réponse attendue (404 NOT FOUND):
# {
#   "error": "Analysis job not found",
#   "code": "JOB_NOT_FOUND",
#   "jobId": "INVALID_JOB_ID"
# }
```

### 4. Test erreur : PDF crypté

```bash
# 4.1. Upload un PDF protégé par mot de passe
# 4.2. Appeler /api/prepare avec ce PDF

curl -X POST http://localhost:3000/api/prepare \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "filePath": "user-cm4x5y6z7/encrypted.pdf"
  }'

# Réponse attendue (500 INTERNAL SERVER ERROR):
# {
#   "error": "Ce PDF est protégé par mot de passe. Veuillez supprimer la protection et réessayer.",
#   "code": "PARSE_FAILED"
# }
```

### 5. Test erreur : Validation Zod

```bash
# 5.1. Appeler /api/prepare sans filePath
curl -X POST http://localhost:3000/api/prepare \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{}'

# Réponse attendue (400 BAD REQUEST):
# {
#   "error": "Invalid request body",
#   "code": "INVALID_REQUEST_BODY",
#   "details": [
#     {
#       "code": "too_small",
#       "minimum": 1,
#       "type": "string",
#       "inclusive": true,
#       "exact": false,
#       "message": "filePath is required",
#       "path": ["filePath"]
#     }
#   ]
# }

# 5.2. Appeler /api/prepare avec filePath invalide
curl -X POST http://localhost:3000/api/prepare \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "filePath": "../../../etc/passwd"
  }'

# Réponse attendue (400 BAD REQUEST):
# {
#   "error": "Invalid request body",
#   "code": "INVALID_REQUEST_BODY",
#   "details": [
#     {
#       "validation": "regex",
#       "code": "invalid_string",
#       "message": "Invalid filePath format. Expected: {user-userId|guest-guestId}/{fileId}.pdf",
#       "path": ["filePath"]
#     }
#   ]
# }
```

### 6. Test erreur : text_clean manquant (simulation)

```bash
# 6.1. Simuler un job avec text_clean = null en DB
# (via script SQL ou code de test)

# UPDATE analysis_jobs SET text_clean = NULL WHERE id = 'cm5abc123xyz';

# 6.2. Appeler /api/analyze avec ce jobId
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d "{
    \"jobId\": \"$JOB_ID\"
  }"

# Réponse attendue (422 UNPROCESSABLE ENTITY):
# {
#   "error": "Missing or invalid text_clean in analysis job. Please re-run /api/prepare",
#   "code": "MISSING_TEXT_CLEAN",
#   "jobId": "cm5abc123xyz"
# }
```

## Vérifications en DB

```sql
-- 1. Vérifier qu'un job a été créé
SELECT id, user_id, status, text_length_clean, contract_type, created_at
FROM analysis_jobs
WHERE id = 'cm5abc123xyz';

-- 2. Vérifier le texte nettoyé
SELECT text_clean
FROM analysis_jobs
WHERE id = 'cm5abc123xyz';

-- 3. Vérifier le résultat d'analyse
SELECT status, result
FROM analysis_jobs
WHERE id = 'cm5abc123xyz'
  AND status = 'analyzed';

-- 4. Lister tous les jobs d'un user
SELECT id, status, filename, contract_type, created_at
FROM analysis_jobs
WHERE user_id = 'cm4x5y6z7'
ORDER BY created_at DESC;

-- 5. Nettoyer les jobs expirés (TTL 24h)
DELETE FROM analysis_jobs
WHERE expires_at < NOW();
```

## Logs à surveiller

### `/api/prepare` logs attendus :

```
[POST /api/prepare] [req:abc123] Created job: cm5abc123xyz
[INFO] analysis.prepared { pages: 2, textLengthRaw: 4904, textLengthClean: 521, textTokensApprox: 131 }
POST /api/prepare 200 in 1382ms
```

### `/api/analyze` logs attendus :

```
[POST /api/analyze] [req:xyz789] Retrieved job: cm5abc123xyz (status: prepared)
[INFO] analysis.started { userType: "user", contractType: "EMPLOI", textLength: 521 }
[INFO] analysis.completed { riskScore: 45, redFlagsCount: 3, clausesCount: 12, durationMs: 2345 }
POST /api/analyze 200 in 2.4s
```

### Erreurs attendues (si PDF crypté) :

```
Warning: filter "Crypt" not supported yet
[parsePdfBuffer] PDF Crypt warnings (non-blocking): ["Warning: filter \"Crypt\" not supported yet"]
[POST /api/prepare] [req:abc123] PDF parsing error: Ce PDF est protégé par mot de passe...
[ERROR] analysis.failed { reason: "PARSE_FAILED", durationMs: 123 }
POST /api/prepare 500
```

## Nettoyage après tests

```bash
# 1. Supprimer les fichiers de test en storage (mock mode)
rm -rf temp/uploads/user-*/test-*

# 2. Supprimer les jobs de test en DB
psql -d trustdoc_dev -c "DELETE FROM analysis_jobs WHERE filename LIKE 'test-%';"

# 3. Réinitialiser les crédits de test
psql -d trustdoc_dev -c "UPDATE users SET credits = 10 WHERE email = 'test@example.com';"
```

## Prétraitement optionnel : Décrypter PDF

Si vous avez des PDFs protégés, vous pouvez les décrypter avec `qpdf` :

```bash
# Installer qpdf (Ubuntu/Debian)
sudo apt-get install qpdf

# Décrypter un PDF protégé par mot de passe utilisateur
qpdf --password=USER_PASSWORD --decrypt input.pdf output.pdf

# Décrypter un PDF protégé sans mot de passe utilisateur (owner password only)
qpdf --decrypt input.pdf output.pdf
```

**Note** : Ce prétraitement est **optionnel** et **manuel**. L'application ne supporte pas nativement les PDFs cryptés.

## Checklist de validation

- [ ] `/api/prepare` retourne `{ jobId }` (200 OK)
- [ ] `analysis_jobs` table contient un row avec `status = "prepared"` et `text_clean` non null
- [ ] `/api/analyze` avec `jobId` retourne `{ analysis, analysisId }` (200 OK)
- [ ] `analysis_jobs.status` passe à `"analyzed"` et `result` est rempli
- [ ] Ré-appeler `/api/analyze` retourne le résultat en cache instantanément (idempotence)
- [ ] Appeler `/api/analyze` avec jobId invalide retourne 404 `JOB_NOT_FOUND`
- [ ] Appeler `/api/analyze` avec jobId d'un autre user retourne 403 `ACCESS_DENIED`
- [ ] Appeler `/api/prepare` avec PDF crypté retourne 500 `PARSE_FAILED`
- [ ] Appeler `/api/prepare` sans filePath retourne 400 `INVALID_REQUEST_BODY` (Zod)
- [ ] Warning "Crypt" ne pollue plus les logs (downgrade à debug)
- [ ] Aucun usage de `new Buffer()` dans le code
- [ ] Le fichier PDF source est supprimé après `prepare` réussi

## Résumé des améliorations

✅ **Pipeline durable** : `text_clean` persisté en DB (table `analysis_jobs`)
✅ **Stateless** : `/api/analyze` ne dépend plus d'un cache mémoire
✅ **Idempotent** : Re-analyser retourne le résultat en cache
✅ **Validation Zod** : Messages d'erreur clairs et typés
✅ **Logs structurés** : `requestId` + `jobId` corrélés
✅ **Gestion Crypt warning** : Downgrade à debug (non-bloquant)
✅ **Pas de Buffer() déprécié** : Utilise `Buffer.from()` partout
✅ **TTL 24h** : Jobs expirés auto-supprimés
✅ **Contrôle d'accès** : Vérification user/guest ownership
