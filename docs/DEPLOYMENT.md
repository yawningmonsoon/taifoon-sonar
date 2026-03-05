# Deployment Guide — Taifoon ↔ Sonar Integration

## Prerequisites

- Node.js ≥ 18.0.0
- npm or yarn
- Taifoon API key (contact dev@taifoon.dev)
- Sonar webhook secret (configure in Sonar dashboard)

---

## 1. Proof Anchor Service (Taifoon → Sonar)

**Purpose:** Generate V5 proofs for Sonar trades.

### Setup

```bash
cd /root/taifoon-sonar

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   TAIFOON_API_KEY=<your_key>
#   OPERATOR_KEY=<private_key>
#   PORT=8082

# Build TypeScript
npm run build

# Start service
npm run start:proof-anchor

# Production (PM2)
pm2 start dist/proof-anchor/api.js --name taifoon-proof-anchor
```

### Verify

```bash
curl http://localhost:8082/health
# Expected: {"status":"ok","service":"taifoon-proof-anchor",...}
```

### Usage (Sonar side)

```typescript
import { TaifoonProofClient } from '@taifoon/sonar-sdk';

const client = new TaifoonProofClient({
  apiKey: process.env.TAIFOON_API_KEY,
  apiUrl: 'http://localhost:8082' // or https://api.taifoon.dev
});

const proof = await client.anchorTrade({
  chain_id: 8453,
  block_number: 42891234,
  tx_hash: '0xabc...',
  strategy: 'market_making'
});

console.log(proof.verification_url);
```

---

## 2. Signal Relay Service (Taifoon → Sonar)

**Purpose:** Forward Taifoon signals to Sonar webhook.

### Setup

```bash
# Configure environment
# Edit .env:
#   TAIFOON_SSE_URL=https://scanner.taifoon.dev/signals-api
#   SONAR_WEBHOOK_URL=https://sonar.trade/api/integrations/taifoon/signals
#   SONAR_WEBHOOK_SECRET=<webhook_secret>

# Start service
npm run start:signal-relay

# Production (PM2)
pm2 start dist/signal-relay/relay-service.js --name taifoon-signal-relay
```

### Verify

```bash
# Check logs
pm2 logs taifoon-signal-relay

# Expected output:
# [SIGNAL-RELAY] Connected to Taifoon SSE stream
# [SIGNAL-RELAY] Forwarded snipe_signal (BASED)
```

### Custom Filters

Edit `src/signal-relay/relay-service.ts`:

```typescript
const relay = new TaifoonSignalRelay({
  taifoonSseUrl: process.env.TAIFOON_SSE_URL!,
  sonarWebhookUrl: process.env.SONAR_WEBHOOK_URL!,
  sonarWebhookSecret: process.env.SONAR_WEBHOOK_SECRET!,
  filters: {
    strategies: ['GEM_HUNT', 'SWEEPER'], // Only these strategies
    max_rug_score: 30,                   // Skip risky tokens
    min_sniper_score: 70,                // Only high-quality signals
    chains: [8453, 42161],               // Base + Arbitrum only
    platforms: ['clanker', 'uniswap_v4'] // Specific platforms
  }
});
```

---

## 3. Sonar Webhook Receiver (Sonar → Taifoon)

**Purpose:** Receive Taifoon signals in Sonar's backend.

### Setup (Sonar side)

```bash
# In Sonar's backend repo
npm install @taifoon/sonar-sdk express

# Create webhook endpoint
# See: examples/sonar-signal-receiver.ts
```

### Endpoint

```typescript
app.post('/api/integrations/taifoon/signals', async (req, res) => {
  const signal = req.body;
  
  // 1. Verify HMAC signature
  if (!verifyTaifoonSignature(...)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Map to Sonar strategy
  const sonarStrategy = mapTaifoonToSonar(signal);
  
  // 3. Execute
  const execution = await sonar.createStrategy(sonarStrategy);
  
  res.json({ status: 'accepted', sonar_strategy_id: execution.id });
});
```

### Test Webhook

```bash
# Generate test signature
node examples/test-webhook.js

# Expected: 201 Created
```

---

## 4. Monitoring

### Proof Anchor Service

```bash
# Check health
curl http://localhost:8082/health

# View logs
pm2 logs taifoon-proof-anchor

# Metrics
curl http://localhost:8082/metrics
```

### Signal Relay Service

```bash
# Check stats
curl http://localhost:7072/api/sniper/stats

# View logs
pm2 logs taifoon-signal-relay

# Expected output:
# [SIGNAL-RELAY] Stats: {
#   total: 1234,
#   accepted: 890,
#   rejected: 344,
#   errors: 0
# }
```

---

## 5. Production Checklist

**Before going live:**

- [ ] API keys configured and tested
- [ ] Webhook secret shared securely with Sonar
- [ ] HTTPS enabled (use nginx/Caddy reverse proxy)
- [ ] Rate limiting configured (100 req/min default)
- [ ] Monitoring/alerts set up (PM2 + Datadog/Sentry)
- [ ] Database configured (optional, for proof persistence)
- [ ] Firewall rules (allow only Sonar IPs for webhook)
- [ ] Backup strategy (proof cache backup daily)

**Security:**

- [ ] Use environment variables (never hardcode secrets)
- [ ] Rotate API keys quarterly
- [ ] Enable CORS only for Sonar domain
- [ ] Use TLS 1.3 minimum
- [ ] Rate limit per API key (not just per IP)

**Performance:**

- [ ] Proof cache size tuned (default 10k entries)
- [ ] PM2 cluster mode (use all CPU cores)
- [ ] Database connection pooling (if using Postgres)
- [ ] CDN for verification URLs (optional)

---

## 6. Scaling

### Horizontal Scaling

```bash
# Run multiple proof anchor instances
pm2 start dist/proof-anchor/api.js -i 4 --name taifoon-proof-anchor

# Load balance with nginx
upstream taifoon_proof {
  server localhost:8082;
  server localhost:8083;
  server localhost:8084;
  server localhost:8085;
}

server {
  listen 443 ssl;
  server_name api.taifoon.dev;
  
  location /api/v5/proof/ {
    proxy_pass http://taifoon_proof;
  }
}
```

### Database Migration

```bash
# Move from in-memory cache to RocksDB
npm install rocksdb

# Edit src/proof-anchor/storage.ts
# Uncomment RocksDB code

# Rebuild
npm run build

# Restart
pm2 restart taifoon-proof-anchor
```

---

## 7. Troubleshooting

### Proof generation fails

```bash
# Check Taifoon API status
curl https://api.taifoon.dev/health

# Check logs
pm2 logs taifoon-proof-anchor | grep ERROR

# Common issue: Block not found (too old or not synced yet)
# Solution: Wait for spinner to sync, or request older block
```

### Webhook delivery fails

```bash
# Check Sonar endpoint is reachable
curl -X POST https://sonar.trade/api/integrations/taifoon/signals \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check HMAC signature
node examples/test-webhook.js --debug

# Common issue: Signature mismatch
# Solution: Verify SONAR_WEBHOOK_SECRET matches on both sides
```

### High latency

```bash
# Check proof generation time
curl -w "\nTime: %{time_total}s\n" \
  http://localhost:8082/api/v5/proof/anchor \
  -X POST -H "Authorization: Bearer $API_KEY" \
  -d '{"chain_id":8453,"block_number":42891234}'

# Target: <1s
# If >1s: Check spinner API health, increase cache size
```

---

## 8. Support

**Issues?** Contact dev@taifoon.dev or open a GitHub issue (private repo access required).

**Docs:** https://docs.taifoon.dev/sonar-integration
