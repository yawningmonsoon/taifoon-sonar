# Taifoon ↔ Sonar.trade — Integration Overview

## Executive Summary

**Two-way integration** between Taifoon Network (cross-chain proofs + AI signals) and Sonar.trade (automated DeFi execution).

### Value Propositions

**For Sonar:**
- ✅ **"Trustless Execution"** — every trade anchored to cryptographic proofs
- ✅ **AI-curated signals** — backtested strategies (GEM HUNT 1.827x EV)
- ✅ **15 signal types** — token launches, whale moves, gas spikes, arb opportunities
- ✅ **Regulatory compliance** — immutable audit trail for every trade
- ✅ **User confidence** — transparent on-chain verification

**For Taifoon:**
- ✅ **Professional execution layer** — no need to build DEX routing
- ✅ **Real-world validation** — strategies tested with real capital
- ✅ **Enterprise client** — Sonar's user base accessing Taifoon signals
- ✅ **Revenue stream** — per-proof/per-signal pricing model

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│             TAIFOON ↔ SONAR INTEGRATION                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Direction 1: SONAR → TAIFOON (Proof Anchoring)       │
│  ════════════════════════════════════════════════════   │
│                                                         │
│  Sonar executes trade                                  │
│         ↓                                               │
│  POST /api/v5/proof/anchor                             │
│    { chain_id, block_number, tx_hash, strategy }       │
│         ↓                                               │
│  Taifoon generates 6-layer proof:                      │
│    1. Block header                                      │
│    2. Twig (2048 blocks)                               │
│    3. MMR root                                          │
│    4. SuperRoot (all chains)                           │
│    5. Finality (PoS consensus)                         │
│    6. TaifoonUniversalOperator                         │
│         ↓                                               │
│  Returns proof blob + verification URL                 │
│         ↓                                               │
│  Sonar stores proof with trade record                  │
│         ↓                                               │
│  Users verify at scanner.taifoon.dev                   │
│                                                         │
│  ════════════════════════════════════════════════════   │
│                                                         │
│  Direction 2: TAIFOON → SONAR (Signal Feed)           │
│  ════════════════════════════════════════════════════   │
│                                                         │
│  Taifoon detects signal (GEM HUNT/SWEEPER/WHALE)      │
│         ↓                                               │
│  Signal passes quality gates:                          │
│    - rug_score < 30                                    │
│    - sniper_score > 70                                 │
│    - MMR proof available                               │
│         ↓                                               │
│  POST /api/integrations/taifoon/signals (webhook)     │
│    { type, strategy, token, recommended_params }       │
│         ↓                                               │
│  Sonar verifies HMAC signature                         │
│         ↓                                               │
│  Maps Taifoon strategy → Sonar strategy:               │
│    - GEM HUNT → TP +350%, SL -18%, 80min              │
│    - SWEEPER → TP +35%, SL -20%, 5min                 │
│    - WHALE → shadow trade (follow wallet)             │
│         ↓                                               │
│  Sonar executes trade via user vault                   │
│         ↓                                               │
│  Trade anchored back to Taifoon proofs (Direction 1)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Status

### ✅ COMPLETE

1. **Architecture design** — two-way integration flow documented
2. **Proof anchor service** — TypeScript API + proof generator + storage
3. **Signal relay service** — SSE consumer + webhook sender + filters
4. **TypeScript SDK** — `@taifoon/sonar-sdk` with both directions
5. **Signal catalog** — 15 types documented (9 LIVE, 6 ROADMAP)
6. **OpenAPI 3.0 spec** — full API documentation
7. **Integration examples** — proof anchoring + signal receiver
8. **Deployment guide** — production setup instructions

### 🔄 TODO (Deployment)

1. **Deploy proof anchor service** — `api.taifoon.dev/v5/proof/anchor`
2. **Generate API keys** — for Sonar production access
3. **Configure webhook** — Sonar → Taifoon signal endpoint
4. **Test end-to-end** — 1-2 trades on testnet
5. **Monitor metrics** — proof latency, webhook delivery rate

---

## Repository Structure

```
taifoon-sonar/
├── README.md                          # Main overview
├── package.json                       # NPM package config
├── tsconfig.json                      # TypeScript config
├── .env.example                       # Environment template
│
├── src/
│   ├── proof-anchor/
│   │   ├── api.ts                    # Express API (POST /anchor)
│   │   ├── proof-generator.ts        # Calls Taifoon DA API
│   │   └── storage.ts                # In-memory + RocksDB cache
│   │
│   ├── signal-relay/
│   │   └── relay-service.ts          # SSE → webhook relay
│   │
│   └── sdk/
│       ├── index.ts                  # SDK entry point
│       ├── proof-client.ts           # TaifoonProofClient class
│       ├── signal-relay.ts           # TaifoonSignalRelay class
│       └── types.ts                  # TypeScript interfaces
│
├── docs/
│   ├── SIGNAL_CATALOG.md             # 15 signal types reference
│   ├── DEPLOYMENT.md                 # Production setup guide
│   ├── INTEGRATION_OVERVIEW.md       # This file
│   └── openapi.yaml                  # OpenAPI 3.0 spec
│
└── examples/
    ├── sonar-proof-integration.ts    # Proof anchoring example
    └── sonar-signal-receiver.ts      # Webhook receiver example
```

---

## Signal Types (15 Total)

### ✅ LIVE (9 types)

1. **token_launch** — New pool creation (V4/V3/V2/Clanker/pump.fun/Raydium)
2. **snipe_signal** — GEM HUNT/SWEEPER/WHALE strategy entries
3. **whale_transfer** — Large transfers (>$150k default)
4. **arb_signal** — Cross-chain arbitrage (>2% spread)
5. **gas_spike** — Sudden gas price increases (>2x baseline)
6. **defi_event** — Protocol events (governance, exploits, migrations)
7. **coordinated_launch** — Bot cluster detection
8. **sniper_fingerprint** — Bot wallet pattern analysis
9. **launch_reorg_detected** — Chain reorg affecting launches

### 🔄 ROADMAP (6 types)

10. **liquidity_shock** — Sudden LP removal (>30%)
11. **flash_loan** — Flash loan usage detected
12. **twap_deviation** — Price vs TWAP >5% deviation
13. **volume_divergence** — Volume spike without price move
14. **pool_imbalance** — LP ratio >80% skewed
15. **cross_chain_arb** — Full-stack arb with bridge costs

---

## Integration Examples

### Proof Anchoring (Sonar → Taifoon)

```typescript
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
  strategy: 'market_making'
});

// Store proof with trade
await db.trades.update(trade.id, {
  taifoon_proof_id: proof.proof_id,
  verification_url: proof.verification_url
});

console.log(`Verify: ${proof.verification_url}`);
// → https://scanner.taifoon.dev/proof/8453/42891234
```

### Signal Relay (Taifoon → Sonar)

```typescript
// Sonar webhook receiver
app.post('/api/integrations/taifoon/signals', async (req, res) => {
  const signal = req.body;
  
  // Verify HMAC signature
  if (!verifyTaifoonSignature(...)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Map Taifoon strategy → Sonar strategy
  const sonarStrategy = {
    token: signal.token_address,
    entryPrice: signal.entry_price,
    takeProfit: 1 + (signal.recommended_params.take_profit_pct / 100),
    stopLoss: 1 - (signal.recommended_params.stop_loss_pct / 100)
  };
  
  // Execute
  const execution = await sonar.createStrategy(sonarStrategy);
  
  res.json({ status: 'accepted', sonar_strategy_id: execution.id });
});
```

---

## Performance Targets

### Proof Anchoring
- **Latency:** <1s per proof (p95)
- **Throughput:** 100 proofs/minute
- **Availability:** 99.9% uptime
- **Cache hit rate:** >80% (for repeated blocks)

### Signal Relay
- **Delivery rate:** >95% webhooks delivered
- **Latency:** <500ms from signal detection → Sonar webhook
- **Throughput:** 10-20 signals/minute (peak)
- **Quality:** 0% false positives (rug_score gate)

---

## Security

### API Authentication
- **Bearer tokens** for proof anchoring
- **HMAC-SHA256** for webhook delivery
- **Rate limiting** (100 req/min per API key)
- **IP whitelisting** (optional)

### Proof Integrity
- **Immutable** — proofs stored on-chain + IPFS
- **Verifiable** — any user can verify via scanner
- **Timestamped** — block timestamp + generation timestamp

### Webhook Security
- **Signature verification** — `HMAC(timestamp + payload, secret)`
- **Replay protection** — timestamp validation (<5 min window)
- **TLS 1.3** — HTTPS only, no downgrade

---

## Next Steps

### Phase 1: Proof Anchoring (Week 1)
1. Deploy proof anchor service to `api.taifoon.dev`
2. Generate API key for Sonar
3. Sonar integrates `@taifoon/sonar-sdk`
4. Test with 5-10 trades on Base testnet
5. Go live on mainnet

### Phase 2: Signal Feed (Week 2)
1. Configure webhook URL + secret with Sonar
2. Deploy signal relay service
3. Test with 1-2 GEM HUNT signals
4. Monitor win rate vs expected (50% WR, 1.8x EV)
5. Scale to multi-chain

### Phase 3: Expansion (Month 2)
1. Add ROADMAP signals (liquidity_shock, flash_loan, etc.)
2. Increase signal throughput (50-100/min)
3. Add Solana signal feed (pump.fun, Raydium)
4. Implement revenue model (per-proof/per-signal pricing)

---

## Revenue Model

### Proof Anchoring
- **Free tier:** 1,000 proofs/month
- **Pro tier:** $0.01 per proof (volume discounts)
- **Enterprise:** $500/month unlimited

### Signal Feed
- **Free tier:** 100 signals/month (test mode)
- **Pro tier:** $0.05 per signal (quality-gated)
- **Enterprise:** $2,000/month unlimited (all 15 types)

**Estimated Revenue (Sonar as Enterprise client):**
- Proof anchoring: $500/month (unlimited trades)
- Signal feed: $2,000/month (all signal types)
- **Total: $2,500/month = $30k/year**

---

## Contact

**Taifoon Team:**
- Technical: dev@taifoon.dev
- Partnerships: partnerships@taifoon.dev
- Discord: https://discord.gg/taifoon

**Sonar Team:**
- Integration contact: (TBD)
- Technical lead: (TBD)

---

## License

**Private Repository** — Internal use only. Do not distribute.

Copyright © 2026 Taifoon Network. All rights reserved.
