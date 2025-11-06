# Observability - Tracing & Métriques

Documentation complète du système d'observabilité de TrustDoc : tracing distribué, métriques, et Service Level Objectives (SLOs).

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Tracing distribué](#tracing-distribué)
- [Métriques](#métriques)
- [Service Level Objectives (SLOs)](#service-level-objectives-slos)
- [Endpoint de diagnostics](#endpoint-de-diagnostics)
- [Corrélation des logs](#corrélation-des-logs)
- [Privacy & Sécurité](#privacy--sécurité)

---

## Vue d'ensemble

Le système d'observabilité de TrustDoc permet de :

- **Mesurer** les performances du pipeline d'analyse (parsing, LLM, persistance)
- **Suivre** les KPIs opérationnels (taux d'erreur, latence, throughput)
- **Corréler** les événements distribués via traceId
- **Détecter** les régressions de performance et les bottlenecks

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Request (traceId: uuid-v4)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
    │ Tracing │      │   Logging   │   │   Metrics   │
    │  (Span) │      │ (Structured)│   │ (In-Memory) │
    └────┬────┘      └──────┬──────┘   └──────┬──────┘
         │                  │                  │
         ▼                  ▼                  ▼
    HTTP Headers       JSON Logs        GET /api/_metrics
    (dev mode)         (prod mode)      (protected)
```

---

## Tracing distribué

Le tracing mesure la durée de chaque opération (span) dans le pipeline d'analyse.

### Spans instrumentés

| Span          | Opération                             | SLO (p95) |
| ------------- | ------------------------------------- | --------- |
| `prepare`     | Parsing PDF + normalisation texte     | < 1.5s    |
| `detect_type` | Détection automatique du type contrat | < 500ms   |
| `llm_analyze` | Appel LLM (OpenAI/Ollama)             | < 4s      |
| `cleanup`     | Suppression fichiers temporaires      | < 200ms   |
| **TOTAL**     | **Analyse end-to-end**                | **< 6s**  |

### Utilisation

#### Dans le code (server-side)

```typescript
import { Trace } from "@/src/lib/timing";

// Créer une trace avec le requestId
const trace = new Trace(requestId);

// Démarrer un span
const endPrepare = trace.start("prepare", { filePath: "user-123/doc.pdf" });

// ... faire le travail ...
await parsePdfFromStorage(filePath);

// Terminer le span
endPrepare();

// Export en JSON (pour logs)
const traceData = trace.toJSON();
console.log(traceData);
// {
//   traceId: "550e8400-e29b-41d4-a716-446655440000",
//   spans: [
//     { name: "prepare", start: 0, end: 1234.56, durationMs: 1234.56, attrs: {...} }
//   ]
// }

// Export en headers HTTP (dev mode uniquement)
if (process.env.NODE_ENV === "development") {
  const headers = trace.toHeaders("x-td-latency-");
  // {
  //   "x-td-latency-trace-id": "550e8400-e29b-41d4-a716-446655440000",
  //   "x-td-latency-total": "1234.56",
  //   "x-td-latency-prepare": "1234.56"
  // }
}
```

#### Headers de debug (développement)

En mode développement (`NODE_ENV=development`), les endpoints `/api/prepare` et `/api/analyze` retournent des headers de debug :

```bash
curl -v http://localhost:3000/api/prepare \
  -H "Content-Type: application/json" \
  -d '{"filePath": "user-123/doc.pdf"}'

# Response headers:
# x-td-latency-trace-id: 550e8400-e29b-41d4-a716-446655440000
# x-td-latency-total: 2456.78
# x-td-latency-prepare: 1234.56
# x-td-latency-detect_type: 456.12
# x-td-latency-cleanup: 123.45
```

**Important**: Ces headers ne sont **jamais** exposés en production pour éviter toute fuite d'information opérationnelle.

---

## Métriques

Système de collecte de métriques en mémoire pour environnements à faible volume.

### Types de métriques

#### Counters

Compteurs monotones (toujours en augmentation).

```typescript
import { metrics } from "@/src/lib/metrics";

// Incrémenter un compteur
metrics.increment("analysis.success");

// Avec labels
metrics.increment("analysis.error", { reason: "LLM_TIMEOUT" });
```

#### Histograms

Distributions de valeurs avec calcul automatique des percentiles.

```typescript
// Enregistrer une latence
metrics.histogram("latency.prepare", 1234.56);

// Export avec percentiles
const snapshot = metrics.export();
console.log(snapshot.histograms["latency.prepare"]);
// {
//   count: 1000,
//   sum: 1234567.89,
//   min: 234.56,
//   max: 5678.90,
//   mean: 1234.57,
//   p50: 1200.00,
//   p90: 2000.00,
//   p95: 2500.00,
//   p99: 4000.00
// }
```

### Métriques recommandées

#### Performance (Histograms)

- `latency.prepare` - Durée parsing + normalisation
- `latency.detect_type` - Durée détection type contrat
- `latency.llm_analyze` - Durée appel LLM
- `latency.total` - Durée end-to-end

#### Erreurs (Counters)

- `analysis.success` - Analyses réussies
- `analysis.error` - Analyses échouées (avec label `reason`)
- `llm.rate_limit` - Rate limits LLM (avec label `provider`)
- `upload.failed` - Uploads échoués (avec label `reason`)

#### Business (Counters)

- `credits.debited` - Crédits débités (avec label `userId`)
- `contracts.analyzed` - Contrats analysés (avec label `contractType`)

---

## Service Level Objectives (SLOs)

Les SLOs définissent les cibles de performance pour garantir une bonne expérience utilisateur.

### Latence (p95)

| Opération          | Objectif p95 | Critique si > |
| ------------------ | ------------ | ------------- |
| Parsing PDF        | < 1.5s       | 3s            |
| LLM Analysis       | < 4s         | 8s            |
| **Total Analysis** | **< 6s**     | **12s**       |

### Disponibilité

| Service            | Objectif | Mesure             |
| ------------------ | -------- | ------------------ |
| API `/api/analyze` | 99.5%    | Erreurs 5xx < 0.5% |
| API `/api/prepare` | 99.5%    | Erreurs 5xx < 0.5% |
| LLM Provider       | 99%      | Erreurs LLM < 1%   |

### Throughput

| Endpoint       | Capacité   | Rate Limit     |
| -------------- | ---------- | -------------- |
| `/api/analyze` | 3 req/5min | Par IP (guest) |
| `/api/prepare` | 5 req/min  | Par IP (guest) |

---

## Endpoint de diagnostics

### GET /api/\_metrics

Endpoint protégé pour exporter les métriques collectées.

#### Authentication

Requiert le header `x-metrics-secret` avec la valeur de `METRICS_SECRET` (.env).

```bash
# Configuration
METRICS_SECRET=your-secret-key-min-32-chars

# Requête
curl -H "x-metrics-secret: your-secret-key-min-32-chars" \
  http://localhost:3000/api/_metrics
```

#### Response

```json
{
  "success": true,
  "metrics": {
    "counters": {
      "analysis.success": { "count": 1234 },
      "analysis.error:reason=LLM_TIMEOUT": { "count": 5, "labels": { "reason": "LLM_TIMEOUT" } }
    },
    "histograms": {
      "latency.prepare": {
        "count": 1000,
        "sum": 1234567.89,
        "min": 234.56,
        "max": 5678.9,
        "mean": 1234.57,
        "p50": 1200.0,
        "p90": 2000.0,
        "p95": 2500.0,
        "p99": 4000.0
      }
    },
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  "durationMs": 12.34
}
```

#### Erreurs

- **401 Unauthorized**: Header `x-metrics-secret` manquant ou invalide
- **500 Internal Error**: Échec de l'export des métriques

#### Intégration monitoring

Cet endpoint peut être interrogé par des outils de monitoring externes :

- **Prometheus** : Via un exporter custom
- **Datadog** : Via DogStatsD ou custom check
- **New Relic** : Via custom metrics API
- **Grafana** : Via JSON API datasource

---

## Corrélation des logs

Tous les logs structurés incluent le `requestId` (qui est le même que `traceId`), permettant de suivre une requête à travers tous les composants.

### Format des logs

```json
{
  "level": "info",
  "event": "analysis.started",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userType": "user",
  "userId": "user-abc123",
  "contractType": "FREELANCE",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Recherche par traceId

Pour suivre une requête complète :

```bash
# Filtrer les logs par requestId/traceId
grep "550e8400-e29b-41d4-a716-446655440000" logs.json

# Exemples d'événements corrélés :
# - analysis.started (requestId: ...)
# - analysis.prepared (requestId: ...)
# - llm.completion (requestId: ...)
# - analysis.completed (requestId: ...)
```

### Événements loggés

| Événement            | Description                    |
| -------------------- | ------------------------------ |
| `analysis.started`   | Démarrage analyse              |
| `analysis.prepared`  | Texte préparé (parsing + norm) |
| `analysis.completed` | Analyse terminée avec succès   |
| `analysis.failed`    | Analyse échouée                |
| `upload.started`     | Début upload PDF               |
| `upload.completed`   | Upload réussi                  |
| `stripe.credited`    | Crédits ajoutés (paiement)     |

---

## Privacy & Sécurité

### Garanties de confidentialité

Le système d'observabilité respecte les principes de privacy-by-design :

✅ **JAMAIS loggé/tracé** :

- Texte du contrat (raw ou clean)
- Contenu du PDF
- PII non hashée (emails en clair, adresses IP)
- Clés API ou secrets

✅ **Seulement métadonnées** :

- IDs (requestId, userId, fileId)
- Durées et timestamps
- Scores de risque
- Codes d'erreur
- Noms de modèles LLM

### Sécurité de l'endpoint `/api/_metrics`

- **Authentication** : Header secret requis (`x-metrics-secret`)
- **No exposure** : Endpoint non accessible depuis le client
- **Rate limiting** : Pas de rate limit (endpoint interne)
- **Logs** : Pas de logs des appels metrics (éviter boucle infinie)

### Headers de debug

Les headers `x-td-latency-*` sont :

- Uniquement en mode **développement** (`NODE_ENV=development`)
- Jamais exposés en **production**
- Ne contiennent que des durées (pas de données sensibles)

---

## Exemples d'utilisation

### Détecter une régression de performance

```bash
# Comparer les percentiles p95 sur 2 périodes
curl -H "x-metrics-secret: $SECRET" http://localhost:3000/api/_metrics | jq '.metrics.histograms."latency.llm_analyze".p95'

# Période 1: p95 = 3500ms
# Période 2: p95 = 7500ms ⚠️ Régression détectée !
```

### Analyser les erreurs

```bash
# Obtenir les compteurs d'erreurs avec raisons
curl -H "x-metrics-secret: $SECRET" http://localhost:3000/api/_metrics | jq '.metrics.counters | to_entries | map(select(.key | contains("error")))'

# Résultat:
# [
#   { "key": "analysis.error:reason=LLM_TIMEOUT", "value": { "count": 12, "labels": {...} } },
#   { "key": "analysis.error:reason=TEXT_TOO_SHORT", "value": { "count": 5, "labels": {...} } }
# ]
```

### Suivre une requête end-to-end

```bash
# 1. Récupérer le traceId depuis les headers (dev)
TRACE_ID=$(curl -v http://localhost:3000/api/analyze ... 2>&1 | grep "x-td-latency-trace-id" | cut -d: -f2 | tr -d ' ')

# 2. Filtrer tous les logs avec ce traceId
grep "$TRACE_ID" logs/*.json | jq '.'

# 3. Voir le timeline complet
grep "$TRACE_ID" logs/*.json | jq -s 'sort_by(.timestamp)'
```

---

## Limitations actuelles

### In-Memory Metrics

Les métriques sont stockées **en mémoire** :

- ✅ Simple à implémenter
- ✅ Pas de dépendance externe
- ⚠️ Réinitialisées au redémarrage
- ⚠️ Pas de persistance historique
- ⚠️ Non adapté aux environnements distribués (multiple instances)

**Recommandation** : Pour la production à grande échelle, migrer vers un système de métriques externe (Prometheus, Datadog, CloudWatch).

### Percentiles

Les percentiles sont calculés sur **toutes les valeurs** en mémoire :

- ✅ Précision maximale
- ⚠️ Consommation mémoire croissante
- ⚠️ Pas de fenêtre glissante

**Recommandation** : Implémenter un système de fenêtre glissante (ex : dernières 1000 valeurs) ou utiliser des sketches (T-Digest, HdrHistogram).

### Debug Headers

Les headers de debug sont désactivés en production pour la sécurité, mais cela limite le debugging :

- ✅ Pas de fuite d'information opérationnelle
- ⚠️ Pas de visibilité sur les performances en prod

**Recommandation** : Utiliser les logs structurés et l'endpoint `/api/_metrics` pour le monitoring production.

---

## Roadmap

### Short-term (prochaines versions)

- [ ] Ajouter métriques LLM (tokens used, model selected)
- [ ] Implémenter alerts sur SLOs (webhook ou email)
- [ ] Créer dashboard Grafana (JSON model)

### Long-term

- [ ] Migrer vers OpenTelemetry (OTEL)
- [ ] Intégration Prometheus/Datadog
- [ ] Distributed tracing multi-services
- [ ] Real User Monitoring (RUM) client-side
