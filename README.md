# Taifoon ↔ Sonar.trade Integration

**Private repository** — Bidirectional integration between Taifoon Network and Sonar.trade.

## Architecture Overview

### Two-Way Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    TAIFOON ↔ SONAR                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐           ┌───────────────┐            │
│  │  SONAR.TRADE   │           │   TAIFOON     │            │
│  │  Execution     │◄─────────►│   Signals     │            │
│  └────────────────┘           └───────────────┘            │
│         │                              │                    │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌────────────────┐           ┌───────────────┐            │
│  │  Trade Events  │──────────►│  V5 Proof     │            │
│  │  (execution)   │           │  Anchoring    │            │
│  └────────────────┘           └───────────────┘            │
│         │                              │                    │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌────────────────────────────────────────────┐            │
│  │    Immutable Audit Trail                   │            │
│  │    (every trade = 6-layer MMR proof)       │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Sonar → Taifoon (Proof Anchoring)

### Purpose
**Make every Sonar trade cryptographically verifiable** under Taifoon's 6-layer V5 proof system.

### Value Proposition for Sonar
- **"Trustless Execution"** — every trade has an immutable proof
- **Regulatory compliance** — complete audit trail
- **Insurance layer** — provable execution quality (slippage, timing)
- **User confidence** — transparent on-chain verification

### How It Works

```
Sonar executes trade
  ↓
POST /api/v5/proof/anchor
  {
    "chain_id": 8453,
    "tx_hash": "0xabc...",
    "block_number": 42891234,
    "strategy": "market_making",
    "user": "0x123..."
  }
  ↓
Taifoon generates 6-layer proof:
  1. Block header
  2. Twig (2048 blocks)
  3. MMR root
  4. SuperRoot (all chains)
  5. Finality (PoS/PoW consensus)
  6. TaifoonUniversalOperator attestation
  ↓
Returns proof blob + verification URL
  ↓
Sonar stores proof with trade record
  ↓
Users can verify anytime via scanner.taifoon.dev
```

### API Endpoint

**POST `/api/v5/proof/anchor`**

Request:
```json
{
  "chain_id": 8453,
  "block_number": 42891234,
  "tx_hash": "0xabc123...",
  "strategy": "market_making",
  "metadata": {
    "user": "0x123...",
    "vault": "0x456...",
    "allocation_usd": 5000
  }
}
```

Response:
```json
{
  "proof_id": "proof_8453_42891234_abc123",
  "proof_blob": "0x...",
  "verification_url": "https://scanner.taifoon.dev/proof/8453/42891234",
  "layers": {
    "block": { "hash": "0x...", "timestamp": 1735862400 },
    "twig": { "root": "0x...", "index": 12345 },
    "mmr": { "root": "0x...", "peak_count": 11 },
    "superroot": { "root": "0x...", "batch_id": 67890 },
    "finality": { "type": "optimism_l1", "confirmed": true },
    "operator": { "attested": true, "timestamp": 1735862410 }
  },
  "on_chain_verifiable": true
}
```

### SDK Usage

```javascript
import { TaifoonProofClient } from '@taifoon/sonar-sdk';

const client = new TaifoonProofClient({
  apiKey: process.env.TAIFOON_API_KEY,
  apiUrl: 'https://api.taifoon.dev'
});

// After Sonar executes a trade
const trade = await sonar.executeTrade({ ... });

// Anchor to Taifoon proofs
const proof = await client.anchorTrade({
  chain_id: trade.chain_id,
  block_number: trade.block_number,
  tx_hash: trade.tx_hash,
  strategy: 'market_making',
  metadata: {
    user: trade.user,
    vault: trade.vault,
    allocation_usd: trade.amount_usd
  }
});

// Store proof with trade
await db.trades.update(trade.id, {
  taifoon_proof_id: proof.proof_id,
  taifoon_proof_blob: proof.proof_blob,
  verification_url: proof.verification_url
});

console.log(`Trade ${trade.id} anchored: ${proof.verification_url}`);
```

---

## 2. Taifoon → Sonar (Signal Feed)

### Purpose
**Feed Taifoon's AI-curated signals into Sonar's execution engine** for intelligent entry/exit points.

### Value Proposition for Sonar
- **15 signal types** (token launches, whale moves, gas spikes, etc.)
- **Backtested strategies** (GEM HUNT 1.827x EV on Base V4)
- **Real-time SSE stream** (~10k+ signals/day)
- **Quality scoring** (rug score, sniper score, distribution analysis)

### Signal Catalog (15 Types)

| # | Signal Type | Status | Source | Description |
|---|-------------|--------|--------|-------------|
| 1 | **token_launch** | ✅ LIVE | taifoon-signals | New token pool creation (V4/V3/V2/Clanker) |
| 2 | **whale_transfer** | ✅ LIVE | taifoon-sniper | Large value transfers (>$150k) |
| 3 | **gas_spike** | ✅ LIVE | taifoon-sniper | Sudden gas price increases |
| 4 | **defi_event** | ✅ LIVE | taifoon-signals | Major DeFi protocol events |
| 5 | **snipe_signal** | ✅ LIVE | taifoon-sniper | GEM HUNT/SWEEPER strategy entries |
| 6 | **arb_signal** | ✅ LIVE | taifoon-sniper | Cross-chain arbitrage opportunities |
| 7 | **coordinated_launch** | ✅ LIVE | taifoon-sniper | Multiple wallets launching simultaneously |
| 8 | **sniper_fingerprint** | ✅ LIVE | taifoon-sniper | Bot wallet patterns detected |
| 9 | **launch_reorg_detected** | ✅ LIVE | taifoon-sniper | Chain reorg affecting launch timing |
| 10 | **liquidity_shock** | 🔄 ROADMAP | taifoon-sniper | Sudden liquidity removal (>30%) |
| 11 | **flash_loan** | 🔄 ROADMAP | taifoon-sniper | Flash loan usage detected |
| 12 | **twap_deviation** | 🔄 ROADMAP | taifoon-sniper | Price vs TWAP >5% deviation |
| 13 | **volume_divergence** | 🔄 ROADMAP | taifoon-sniper | Volume spike without price move |
| 14 | **pool_imbalance** | 🔄 ROADMAP | taifoon-sniper | LP ratio >80% skewed |
| 15 | **cross_chain_arb** | 🔄 ROADMAP | taifoon-sniper | Multi-chain price delta >2% |

**Legend:**
- ✅ **LIVE** — Available now, production-ready
- 🔄 **ROADMAP** — Detectors built, integration pending

### How It Works

```
Taifoon detects signal
  ↓
Signal passes quality gates:
  - rug_score < 40
  - sniper_score > 30 (pump.fun) / 70 (V4)
  - No ??? tokens
  - MMR proof available
  ↓
POST /api/integrations/sonar/signals (webhook)
  ↓
Sonar receives signal + maps to strategy:
  - GEM HUNT → long-term hold (TP +350%, SL -18%)
  - SWEEPER → spike trade (TP +35%, SL -20%)
  - WHALE → shadow trade (follow large wallet)
  ↓
Sonar executes trade via user's vault
  ↓
Trade anchored back to Taifoon V5 proofs
```

### API Endpoint

**Webhook:** `POST https://sonar.trade/api/integrations/taifoon/signals`

Payload:
```json
{
  "type": "snipe_signal",
  "action": "entry",
  "strategy": "GEM_HUNT",
  "token_address": "0x123...",
  "token_symbol": "BASED",
  "chain_id": 8453,
  "chain_name": "Base",
  "platform": "uniswap_v4",
  "entry_price": 0.0000123,
  "confidence": 0.87,
  "rug_score": 15,
  "sniper_score": 85,
  "proof_url": "https://scanner.taifoon.dev/api/v5/proof/blob/8453/42891234",
  "metadata": {
    "init_price": 0.0000100,
    "entry_x": 1.23,
    "swaps": 5,
    "pool_id": "0xabc..."
  },
  "recommended_params": {
    "allocation_pct": 5,
    "take_profit_pct": 350,
    "stop_loss_pct": 18,
    "timeout_minutes": 80
  }
}
```

### SDK Usage (Sonar Side)

```javascript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/integrations/taifoon/signals', async (req, res) => {
  const signal = req.body;
  
  // Validate signal authenticity (HMAC signature)
  const isValid = verifyTaifoonSignature(
    req.headers['x-taifoon-signature'],
    JSON.stringify(signal),
    process.env.TAIFOON_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Map Taifoon strategy → Sonar strategy
  const sonarStrategy = {
    token: signal.token_address,
    chain: signal.chain_id,
    entryPrice: signal.entry_price,
    allocation: signal.recommended_params.allocation_pct / 100,
    takeProfit: signal.recommended_params.take_profit_pct / 100,
    stopLoss: signal.recommended_params.stop_loss_pct / 100,
    timeout: signal.recommended_params.timeout_minutes * 60 * 1000,
    metadata: {
      taifoon_signal_id: signal.metadata.signal_id,
      proof_url: signal.proof_url
    }
  };
  
  // Create Sonar strategy
  const execution = await sonar.createStrategy(sonarStrategy);
  
  res.json({
    status: 'accepted',
    sonar_strategy_id: execution.id,
    taifoon_signal_id: signal.metadata.signal_id
  });
});

app.listen(3000);
```

### SDK Usage (Taifoon Side — Signal Relay)

```javascript
import { TaifoonSignalRelay } from '@taifoon/sonar-sdk';

const relay = new TaifoonSignalRelay({
  webhookUrl: 'https://sonar.trade/api/integrations/taifoon/signals',
  webhookSecret: process.env.SONAR_WEBHOOK_SECRET,
  filters: {
    strategies: ['GEM_HUNT', 'SWEEPER', 'WHALE'],
    min_rug_score: 0,
    max_rug_score: 30,
    min_sniper_score: 70,
    chains: [1, 8453, 42161, 10] // ETH, Base, ARB, OP
  }
});

// Start relaying
relay.start();

// Stats
console.log(`Relayed ${relay.stats.total} signals`);
console.log(`Accepted: ${relay.stats.accepted}, Rejected: ${relay.stats.rejected}`);
```

---

## Architecture Components

### 1. Proof Anchor Service (`src/proof-anchor/`)

**Purpose:** Generate and store V5 proofs for Sonar trades.

**Files:**
- `anchor-service.ts` — Main proof anchoring logic
- `proof-generator.ts` — Calls Taifoon DA API for proof generation
- `storage.ts` — Stores proofs in RocksDB/Postgres
- `api.ts` — Express API endpoints

**Tech Stack:**
- Node.js + TypeScript
- Express (API server)
- RocksDB (proof cache)
- ethers.js (blockchain interaction)

### 2. Signal Relay Service (`src/signal-relay/`)

**Purpose:** Forward Taifoon signals to Sonar webhook.

**Files:**
- `relay-service.ts` — SSE consumer + webhook sender
- `filters.ts` — Quality gates (rug/sniper score)
- `hmac.ts` — Webhook signature generation
- `rate-limit.ts` — Prevent spam (max 10 signals/min)

**Tech Stack:**
- Node.js + TypeScript
- EventSource (SSE client)
- axios (webhook POST)

### 3. SDK (`src/sdk/`)

**Purpose:** TypeScript SDK for both directions.

**Files:**
- `proof-client.ts` — `TaifoonProofClient` class
- `signal-relay.ts` — `TaifoonSignalRelay` class
- `types.ts` — TypeScript interfaces
- `index.ts` — Exports

**Published as:** `@taifoon/sonar-sdk` (npm package)

---

## Deployment

### Proof Anchor Service

```bash
# Install
npm install

# Configure
cp .env.example .env
# Set: TAIFOON_API_KEY, TAIFOON_API_URL, OPERATOR_KEY

# Run
npm run start:proof-anchor

# Production
pm2 start src/proof-anchor/api.ts --name taifoon-proof-anchor
```

**Endpoint:** `https://api.taifoon.dev/v5/proof/anchor`

### Signal Relay Service

```bash
# Configure
cp .env.example .env
# Set: SONAR_WEBHOOK_URL, SONAR_WEBHOOK_SECRET, TAIFOON_SIGNALS_URL

# Run
npm run start:signal-relay

# Production
pm2 start src/signal-relay/relay-service.ts --name taifoon-signal-relay
```

---

## Integration Checklist

### For Sonar.trade

**Phase 1: Proof Anchoring (Receive)**
- [ ] Set up API key with Taifoon
- [ ] Install `@taifoon/sonar-sdk`
- [ ] Add proof anchoring after trade execution
- [ ] Store proof URLs in trade DB
- [ ] Display "Verified by Taifoon" badges in UI
- [ ] Update marketing: "Trustless Execution via Taifoon V5 Proofs"

**Phase 2: Signal Feed (Send)**
- [ ] Expose webhook endpoint: `/api/integrations/taifoon/signals`
- [ ] Implement HMAC signature verification
- [ ] Map Taifoon strategies → Sonar strategies
- [ ] Test with 1-2 tokens (Base Clanker V4)
- [ ] Monitor win rate vs expected (GEM HUNT ~50% WR, 1.8x EV)
- [ ] Scale to multi-chain (Solana pump.fun, Ethereum V4, etc.)

### For Taifoon

**Phase 1: Proof Anchoring (Send)**
- [x] Build proof anchor API (`/v5/proof/anchor`)
- [ ] Deploy proof anchor service
- [ ] Generate API keys for Sonar
- [ ] Monitor proof generation latency (<1s)

**Phase 2: Signal Feed (Receive)**
- [x] Build signal relay service
- [ ] Configure webhook URL + secret
- [ ] Apply quality filters (rug/sniper score)
- [ ] Rate limit (max 10 signals/min to prevent spam)
- [ ] Monitor delivery success rate (>95%)

---

## Revenue Model

**No direct fees to Sonar.trade.** Integration is free for partnership launch.

### Revenue Sources

**1. Clanker Donut Fee Split**
- Sonar users executing Taifoon signals on Clanker V4 pools
- Revenue flows through `FoonSniperVault` (existing contract)
- Pro-rata distribution to Taifoon network participants
- **No additional fees charged to Sonar**

**2. Signal Subscriber System**
- Sonar integrates as a subscriber under Taifoon's existing quota system
- Uses `TaifoonCreditVault` prepaid credits model (already deployed)
- Credits consumed per signal delivered (weight-based, not flat-rate)
- Initial quota allocation: **generous for partnership launch**

**Benefits:**
- Sonar gets **free proof anchoring** (builds trust with their users)
- Sonar gets **free signal feed** (within quota)
- Taifoon earns from **downstream fees** (Clanker donut splits, not upfront charges)
- Win-win: Sonar increases user engagement → more Clanker trades → Taifoon revenue grows

---

## Security

### Proof Anchoring
- API key authentication (Bearer token)
- Rate limiting (100 req/min per API key)
- Proof immutability (stored on-chain + IPFS)
- HTTPS only

### Signal Relay
- HMAC-SHA256 webhook signatures
- Replay attack prevention (timestamp + nonce)
- IP whitelisting (optional)
- TLS 1.3

---

## Monitoring

### Metrics
- Proofs generated/hour
- Proof generation latency (p50/p95/p99)
- Signals relayed/hour
- Webhook delivery success rate
- API uptime (target: 99.9%)

### Alerts
- Proof generation failure >5%
- Webhook delivery failure >10%
- API response time >1s
- Any 5xx errors

---

## Support

**Taifoon Team:**
- Technical: dev@taifoon.dev
- Integration: partnerships@taifoon.dev
- Discord: https://discord.gg/taifoon

**Docs:**
- API Reference: https://docs.taifoon.dev/sonar-integration
- SDK Docs: https://taifoon.dev/sdk/sonar
- Examples: https://github.com/taifoon/taifoon-sonar/examples

---

## License

**Private Repository** — Internal use only. Do not distribute without permission.

Copyright © 2026 Taifoon Network. All rights reserved.
