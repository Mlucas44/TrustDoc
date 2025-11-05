# Rate Limiting - Token Bucket Implementation

## Vue d'ensemble

Le système de rate limiting protège l'API contre les abus et les coûts excessifs, particulièrement pour les appels LLM coûteux. Il utilise l'algorithme **Token Bucket** avec support de burst pour équilibrer protection et expérience utilisateur.

## Architecture

### Algorithme Token Bucket

Contrairement aux approches classiques (sliding window, fixed window), le token bucket offre :

- **Burst tolerance** : Permet des pics de trafic légitimes (ex: retry rapide après erreur)
- **Distribution lisse** : Les tokens se rechargent progressivement dans le temps
- **Précision** : Gestion granulaire des requêtes

```
Bucket : [🪙 🪙 🪙 🪙 🪙] (5 tokens)
         ↓ 1 requête consomme 1 token
Bucket : [🪙 🪙 🪙 🪙 ⚪] (4 tokens restants)
         ↓ Temps écoulé : recharge progressive
Bucket : [🪙 🪙 🪙 🪙 🪙] (rechargé)
```

### Fichiers clés

```
src/
├── constants/rate.ts          # Politiques par route
├── middleware/rate-limit.ts   # Implémentation token bucket
app/api/
├── upload/route.ts            # 5 req/min (burst: +2)
├── analyze/route.ts           # 3 req/5min (burst: +1) ⚠️ CRITIQUE
├── prepare/route.ts           # 5 req/min (burst: +2)
└── parse/route.ts             # 10 req/min (burst: +2)
```

## Politiques de rate limiting

| Route          | Limite | Fenêtre | Burst | Raison                      |
| -------------- | ------ | ------- | ----- | --------------------------- |
| `/api/upload`  | 5      | 1 min   | +2    | Upload de fichiers          |
| `/api/analyze` | 3      | 5 min   | +1    | **Coûts LLM élevés**        |
| `/api/prepare` | 5      | 1 min   | +2    | Préparation de texte        |
| `/api/parse`   | 10     | 1 min   | +2    | Parsing PDF (moins coûteux) |

### Pourquoi ces limites ?

- **`/api/analyze`** : La plus stricte (3 req/5min) car chaque appel = coût LLM significatif
- **Burst tolerance** : +1 ou +2 tokens au-dessus de la limite pour gérer les retries légitimes
- **IP-based** : Une IP partagée (NAT, VPN) peut affecter plusieurs utilisateurs

## Identification des clients

### Détection d'IP

Priorité des headers proxy :

1. `x-forwarded-for` (Vercel, most proxies) → premier IP de la liste
2. `x-real-ip` (Nginx)
3. `cf-connecting-ip` (Cloudflare)
4. Fallback : `127.0.0.1` (dev) ou `0.0.0.0` (prod)

### Normalisation

- **IPv4** : Utilisé tel quel (ex: `192.168.1.100`)
- **IPv6** : Normalisation simple (suppression zéros leading)

### Stockage

- **Clé** : `{ip}:{route}` (ex: `192.168.1.100:/api/analyze`)
- **Structure** : `Map<string, TokenBucket>` (en mémoire)
- **Nettoyage** : Buckets inactifs >10 min supprimés tous les 5 min

## Configuration

### Variables d'environnement

Override des politiques par route :

```bash
# Override upload limit (default: 5)
RATE_API_UPLOAD_LIMIT=10

# Override upload window (default: 60000ms = 1 min)
RATE_API_UPLOAD_WINDOW_MS=120000

# Bypass rate limiting (admin)
BYPASS_RATE_LIMIT_FOR_ADMIN=true
```

### Format des variables

Route `/api/upload` → Env prefix `RATE_API_UPLOAD_*`

- Slash (`/`) → Underscore (`_`)
- Prefix `RATE_` automatique
- Suffix `_LIMIT` ou `_WINDOW_MS`

## Réponses HTTP

### Success (limite non atteinte)

```http
200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1704124800
```

### Rate limit exceeded

```http
429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704124800

{
  "error": "Trop de requêtes. Veuillez réessayer dans 45 secondes.",
  "code": "RATE_LIMIT_EXCEEDED",
  "resetIn": 45000
}
```

## Métriques et observabilité

### Métriques disponibles

```typescript
import { getRateLimitMetrics } from "@/src/middleware/rate-limit";

const metrics = getRateLimitMetrics();
// {
//   totalBlocked: 142,
//   blockedByRoute: {
//     "/api/analyze": 89,
//     "/api/upload": 53
//   },
//   activeBuckets: 1247
// }
```

### Logs de développement

En mode `NODE_ENV=development` :

```
[RateLimit] Blocked: /api/analyze { ip: '192.168.1.100', remaining: 0, resetIn: '45s', limit: 3 }
[RateLimit] Cleaned up 12 expired buckets
```

## Extension Redis/KV

Le système est conçu pour être étendu à Redis/KV pour la production :

### Interface à implémenter

```typescript
interface RateLimitStore {
  get(key: string): Promise<TokenBucket | null>;
  set(key: string, bucket: TokenBucket): Promise<void>;
  delete(key: string): Promise<void>;
}
```

### Avantages Redis

- **Scalabilité** : Partagé entre instances
- **Persistance** : Survit aux redémarrages
- **TTL natif** : Expiration automatique
- **Atomic operations** : INCR/DECR pour concurrence

### Migration progressive

```typescript
// src/middleware/rate-limit.ts
const store = process.env.REDIS_URL
  ? new RedisRateLimitStore(process.env.REDIS_URL)
  : new MemoryRateLimitStore();
```

## Considérations de sécurité

### Protection

✅ **Protège contre** :

- Spam / abus d'API
- Coûts LLM incontrôlés
- DDoS léger (IP-based)

❌ **Ne protège PAS contre** :

- DDoS distribué (multiples IPs)
- Attaques sophistiquées (IP rotation)
- Abus intra-quota (utilisateur légitime qui abuse)

### Recommandations

1. **Monitoring** : Surveiller `metrics.blockedByRoute` pour détecter patterns anormaux
2. **Admin bypass** : Utiliser avec précaution (`BYPASS_RATE_LIMIT_FOR_ADMIN=true`)
3. **Faux positifs** : IP partagées (NAT, VPN) → considérer rate limiting par user ID
4. **Combinaison** : Rate limiting + quota system = protection complète

## Debugging

### Tester rate limiting localement

```bash
# 6 requêtes rapides (devrait bloquer la 6ème si limite = 5)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/upload \
    -H "Content-Type: multipart/form-data" \
    -F "file=@test.pdf"
  echo "\n---"
done
```

### Vérifier les buckets actifs

```typescript
import { getRateLimitStoreSize } from "@/src/middleware/rate-limit";

console.log(`Active buckets: ${getRateLimitStoreSize()}`);
```

### Reset manuel (dev uniquement)

```typescript
import { clearRateLimitStore } from "@/src/middleware/rate-limit";

clearRateLimitStore(); // ⚠️ Dev only!
```

## FAQ

### Pourquoi token bucket plutôt que sliding window ?

**Token bucket** :

- ✅ Burst tolerance naturelle
- ✅ Distribution lisse des requêtes
- ✅ Gestion fine des pics légitimes

**Sliding window** :

- ❌ Burst = dépassement de limite
- ❌ Window reset brutal
- ✅ Plus simple à implémenter

### Que se passe-t-il si l'IP est introuvable ?

Le système log un warning et **autorise la requête** :

```
[RateLimit] Cannot identify client, allowing request
```

### Comment gérer les IP partagées (NAT) ?

Deux approches :

1. **Augmenter les limites** pour les routes concernées
2. **Combiner IP + user ID** pour authenticated users
3. **Whitelist** des IP connues (bureaux, VPN corporate)

### Le rate limiting persiste-t-il après redémarrage ?

**Non** (en mémoire). Pour persistance → migrer vers Redis/KV.

## Références

- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Rate Limiting Patterns](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [X-RateLimit Headers (IETF)](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers)
