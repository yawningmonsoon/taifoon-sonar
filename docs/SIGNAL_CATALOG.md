# Taifoon Signal Catalog — Complete Reference

**15 Signal Types** for Sonar.trade integration.

---

## ✅ LIVE Signals (9 types)

### 1. token_launch

**Description:** New token pool creation detected across DEXes.

**Platforms:** Uniswap V4/V3/V2, Clanker, pump.fun, Raydium, PancakeSwap

**Chains:** Ethereum, Base, Arbitrum, Optimism, BSC, Polygon, Solana

**Quality Scoring:**
- `rug_score` (0-100): Lower = safer (checks: contract verified, LP locked, ownership renounced)
- `sniper_score` (0-100): Higher = better entry (checks: wallet distribution, first buyers, volume)

**Schema:**
```typescript
{
  type: 'token_launch',
  token_address: string,
  token_symbol: string,
  token_name: string,
  chain_id: number | 'solana',
  chain_name: string,
  platform: 'uniswap_v4' | 'uniswap_v3' | 'uniswap_v2' | 'clanker' | 'pump_fun' | 'raydium',
  pair_address?: string,
  pool_id?: string,
  initial_price: number,
  initial_liquidity_usd?: number,
  rug_score: number,
  sniper_score: number,
  has_hooks?: boolean,
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **GEM HUNT strategy**: Wait for 5 swaps, check momentum, enter at 1.05-1.9x init price
- **SWEEPER strategy**: Catch 2x+ spikes from init, exit at +35% or -20%
- **Market making**: Provide liquidity on new pools

**Example:**
```json
{
  "type": "token_launch",
  "token_address": "0x123abc...",
  "token_symbol": "BASED",
  "chain_id": 8453,
  "platform": "clanker",
  "initial_price": 0.0000100,
  "rug_score": 15,
  "sniper_score": 85,
  "proof_url": "https://scanner.taifoon.dev/api/v5/proof/blob/8453/42891234"
}
```

---

### 2. whale_transfer

**Description:** Large value transfers detected (default threshold: >$150k).

**Chains:** All EVM chains + Solana

**Quality Scoring:**
- `wallet_age_days`: Older wallets = more credible
- `transaction_count`: Higher = established wallet
- `known_entity`: DEX, CEX, multisig, or unknown

**Schema:**
```typescript
{
  type: 'whale_transfer',
  from_address: string,
  to_address: string,
  token_address: string,
  token_symbol: string,
  value_eth?: number,
  value_usd: number,
  chain_id: number | 'solana',
  chain_name: string,
  tx_hash: string,
  block_number: number,
  from_label?: string,  // e.g., "Binance Hot Wallet"
  to_label?: string,
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **Whale shadow trading**: Mirror large wallet moves
- **Liquidity tracking**: Monitor DEX deposits/withdrawals
- **Market sentiment**: CEX → DEX = bullish, DEX → CEX = bearish

**Example:**
```json
{
  "type": "whale_transfer",
  "from_address": "0xabc...",
  "to_address": "0xdef...",
  "token_symbol": "ETH",
  "value_usd": 250000,
  "chain_id": 1,
  "from_label": "Unknown Whale",
  "to_label": "Uniswap V3: ETH/USDC"
}
```

---

### 3. gas_spike

**Description:** Sudden gas price increase (>2x baseline in <5 blocks).

**Chains:** Ethereum, Arbitrum, Optimism, Base, BSC, Polygon

**Schema:**
```typescript
{
  type: 'gas_spike',
  chain_id: number,
  chain_name: string,
  base_fee_gwei: number,
  spike_gwei: number,
  multiplier: number,  // spike / baseline
  block_number: number,
  trigger: 'nft_mint' | 'token_launch' | 'liquidation' | 'unknown',
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **MEV opportunities**: High gas = high value transactions
- **Network congestion**: Delay trades during spikes
- **Arbitrage timing**: Wait for gas to normalize

**Example:**
```json
{
  "type": "gas_spike",
  "chain_id": 1,
  "base_fee_gwei": 20,
  "spike_gwei": 85,
  "multiplier": 4.25,
  "trigger": "nft_mint"
}
```

---

### 4. defi_event

**Description:** Major DeFi protocol events (governance, exploits, migrations).

**Protocols:** Aave, Compound, Uniswap, Curve, Balancer, etc.

**Schema:**
```typescript
{
  type: 'defi_event',
  protocol: string,
  event_type: 'governance_proposal' | 'exploit_detected' | 'liquidity_migration' | 'oracle_update',
  chain_id: number,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  affected_assets?: string[],
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **Risk management**: Exit positions on exploit detection
- **Governance alpha**: Front-run proposal outcomes
- **Liquidity tracking**: Follow migrations

**Example:**
```json
{
  "type": "defi_event",
  "protocol": "Aave V3",
  "event_type": "governance_proposal",
  "chain_id": 1,
  "description": "AIP-42: Enable ETH collateral on Arbitrum",
  "severity": "medium"
}
```

---

### 5. snipe_signal

**Description:** Taifoon strategy entry/exit signals (GEM HUNT, SWEEPER, WHALE).

**Strategies:**
- **GEM HUNT**: 5-swap gate, momentum checks, TP +350%, SL -18%
- **SWEEPER**: 2x+ spike, TP +35%, SL -20%
- **WHALE**: Shadow large wallet moves

**Schema:**
```typescript
{
  type: 'snipe_signal',
  action: 'entry' | 'exit' | 'monitor',
  strategy: 'GEM_HUNT' | 'SWEEPER' | 'WHALE',
  token_address: string,
  token_symbol: string,
  chain_id: number | 'solana',
  platform: string,
  entry_price?: number,
  current_price?: number,
  exit_price?: number,
  gain_pct?: number,
  reason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TIMEOUT' | 'RUG_EXIT',
  confidence: number,  // 0-1
  recommended_params: {
    allocation_pct: number,
    take_profit_pct: number,
    stop_loss_pct: number,
    timeout_minutes: number
  },
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **Automated execution**: Map Taifoon strategies → Sonar strategies
- **Backtested alpha**: GEM HUNT 1.827x EV on Base V4
- **Exit timing**: Follow proven stop-loss/take-profit levels

**Example:**
```json
{
  "type": "snipe_signal",
  "action": "entry",
  "strategy": "GEM_HUNT",
  "token_symbol": "BASED",
  "entry_price": 0.0000123,
  "confidence": 0.87,
  "recommended_params": {
    "allocation_pct": 5,
    "take_profit_pct": 350,
    "stop_loss_pct": 18,
    "timeout_minutes": 80
  }
}
```

---

### 6. arb_signal

**Description:** Cross-chain arbitrage opportunities (>2% price delta).

**Chains:** All EVM chains (ETH, Base, ARB, OP, BSC, Polygon, Linea, etc.)

**Schema:**
```typescript
{
  type: 'arb_signal',
  token_symbol: string,
  token_address_a: string,
  token_address_b: string,
  chain_a: number,
  chain_b: number,
  price_a: number,
  price_b: number,
  spread_pct: number,
  profit_usd_estimated: number,
  gas_cost_usd: number,
  net_profit_usd: number,
  proof_url_a: string,
  proof_url_b: string,
  timestamp: number
}
```

**Use Cases:**
- **Cross-chain arbitrage**: Buy low on chain A, sell high on chain B
- **Bridge timing**: Execute when spread > gas costs
- **Market efficiency**: Profit from temporary imbalances

**Example:**
```json
{
  "type": "arb_signal",
  "token_symbol": "ETH",
  "chain_a": 1,
  "chain_b": 42161,
  "price_a": 2019.50,
  "price_b": 2065.00,
  "spread_pct": 2.25,
  "net_profit_usd": 45.50
}
```

---

### 7. coordinated_launch

**Description:** Multiple wallets launching tokens simultaneously (possible bot cluster).

**Detection:** 3+ launches from same deployer or linked wallets within 5 blocks.

**Schema:**
```typescript
{
  type: 'coordinated_launch',
  deployer_address: string,
  linked_wallets: string[],
  tokens: Array<{
    token_address: string,
    token_symbol: string,
    block_number: number
  }>,
  chain_id: number,
  pattern: 'same_deployer' | 'funded_by_same_source' | 'same_liquidity_provider',
  risk_level: 'low' | 'medium' | 'high',
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **Risk avoidance**: Skip tokens from known bot clusters
- **MEV opportunities**: Front-run bot cluster exits
- **Pattern recognition**: Track deployer success rate

**Example:**
```json
{
  "type": "coordinated_launch",
  "deployer_address": "0x123...",
  "tokens": [
    { "token_symbol": "SCAM1", "block_number": 42891234 },
    { "token_symbol": "SCAM2", "block_number": 42891236 },
    { "token_symbol": "SCAM3", "block_number": 42891238 }
  ],
  "pattern": "same_deployer",
  "risk_level": "high"
}
```

---

### 8. sniper_fingerprint

**Description:** Bot wallet patterns detected (unusual buying behavior).

**Detection:** Wallet buys >10 tokens in <1 hour, all within first 5 swaps.

**Schema:**
```typescript
{
  type: 'sniper_fingerprint',
  wallet_address: string,
  chain_id: number,
  tokens_sniped: number,
  total_spent_eth: number,
  avg_entry_block_age: number,  // blocks from launch
  success_rate_pct: number,      // % of profitable exits
  bot_confidence: number,        // 0-1
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **Bot tracking**: Monitor successful sniper wallets
- **Shadow trading**: Copy bot entries (if success rate high)
- **Risk avoidance**: Avoid tokens with heavy bot activity

**Example:**
```json
{
  "type": "sniper_fingerprint",
  "wallet_address": "0xabc...",
  "tokens_sniped": 15,
  "total_spent_eth": 2.5,
  "success_rate_pct": 60,
  "bot_confidence": 0.92
}
```

---

### 9. launch_reorg_detected

**Description:** Chain reorg affecting token launch timing (impacts entry price).

**Chains:** All EVM chains (reorgs more common on L2s)

**Schema:**
```typescript
{
  type: 'launch_reorg_detected',
  token_address: string,
  token_symbol: string,
  chain_id: number,
  reorg_depth: number,  // blocks reorganized
  original_block: number,
  new_block: number,
  price_impact_pct?: number,
  proof_url: string,
  timestamp: number
}
```

**Use Cases:**
- **Risk management**: Pause trading during reorgs
- **Entry recalculation**: Adjust entry price post-reorg
- **MEV awareness**: Reorgs often caused by MEV attacks

**Example:**
```json
{
  "type": "launch_reorg_detected",
  "token_symbol": "BASED",
  "chain_id": 8453,
  "reorg_depth": 3,
  "original_block": 42891234,
  "new_block": 42891237,
  "price_impact_pct": -5.2
}
```

---

## 🔄 ROADMAP Signals (6 types)

### 10. liquidity_shock

**Status:** Detector built, integration pending

**Description:** Sudden liquidity removal (>30% in single TX).

**Use Case:** Exit position immediately on liquidity rug.

**Schema:**
```typescript
{
  type: 'liquidity_shock',
  pool_address: string,
  token_symbol: string,
  chain_id: number,
  liquidity_removed_usd: number,
  removal_pct: number,
  remaining_liquidity_usd: number,
  tx_hash: string,
  proof_url: string,
  timestamp: number
}
```

---

### 11. flash_loan

**Status:** Detector built, integration pending

**Description:** Flash loan usage detected (potential exploit or arbitrage).

**Use Case:** Monitor for exploit attempts on protocols you hold.

**Schema:**
```typescript
{
  type: 'flash_loan',
  protocol: string,
  loan_amount_usd: number,
  loan_token: string,
  repaid: boolean,
  profit_loss_usd: number,
  chain_id: number,
  tx_hash: string,
  proof_url: string,
  timestamp: number
}
```

---

### 12. twap_deviation

**Status:** Detector built, integration pending

**Description:** Current price vs TWAP >5% deviation.

**Use Case:** Mean reversion trades (price likely to revert to TWAP).

**Schema:**
```typescript
{
  type: 'twap_deviation',
  token_symbol: string,
  pool_address: string,
  chain_id: number,
  current_price: number,
  twap_price: number,
  deviation_pct: number,
  direction: 'above' | 'below',
  proof_url: string,
  timestamp: number
}
```

---

### 13. volume_divergence

**Status:** Detector built, integration pending

**Description:** Volume spike (>10x) without proportional price move.

**Use Case:** Accumulation phase (whales buying without moving price).

**Schema:**
```typescript
{
  type: 'volume_divergence',
  token_symbol: string,
  chain_id: number,
  volume_usd: number,
  avg_volume_usd: number,
  volume_multiplier: number,
  price_change_pct: number,
  proof_url: string,
  timestamp: number
}
```

---

### 14. pool_imbalance

**Status:** Detector built, integration pending

**Description:** LP token ratio >80% skewed (potential impermanent loss).

**Use Case:** Avoid providing liquidity to imbalanced pools.

**Schema:**
```typescript
{
  type: 'pool_imbalance',
  pool_address: string,
  token_a: string,
  token_b: string,
  chain_id: number,
  ratio: number,  // token_a / token_b
  imbalance_pct: number,
  recommended_action: 'remove_liquidity' | 'wait' | 'rebalance',
  proof_url: string,
  timestamp: number
}
```

---

### 15. cross_chain_arb

**Status:** Integration pending (detector functional, webhook not wired)

**Description:** Same as `arb_signal` but includes bridge cost estimates.

**Use Case:** Full-stack cross-chain arbitrage with realistic profit calc.

**Schema:**
```typescript
{
  type: 'cross_chain_arb',
  token_symbol: string,
  chain_a: number,
  chain_b: number,
  price_a: number,
  price_b: number,
  spread_pct: number,
  bridge_cost_usd: number,
  gas_cost_total_usd: number,
  net_profit_usd: number,
  bridge_protocol: 'across' | 'stargate' | 'layerzero',
  estimated_time_minutes: number,
  proof_url_a: string,
  proof_url_b: string,
  timestamp: number
}
```

---

## Integration Priority

**Recommended order for Sonar.trade:**

1. **Phase 1 (Immediate Value)**
   - `token_launch` — Core signal for market making
   - `snipe_signal` — Proven strategies (GEM HUNT 1.827x EV)
   - `whale_transfer` — High-conviction moves

2. **Phase 2 (Expand Coverage)**
   - `arb_signal` — Cross-chain opportunities
   - `gas_spike` — Timing optimization
   - `coordinated_launch` — Risk avoidance

3. **Phase 3 (Advanced Intelligence)**
   - `sniper_fingerprint` — Bot tracking
   - `launch_reorg_detected` — Edge case handling
   - `defi_event` — Protocol-level risk

4. **Phase 4 (Full Suite — Roadmap)**
   - `liquidity_shock` — Instant exit triggers
   - `twap_deviation` — Mean reversion plays
   - `volume_divergence` — Accumulation detection
   - `pool_imbalance` — LP risk management
   - `flash_loan` — Exploit monitoring

---

## Signal Quality Metrics

**All LIVE signals include:**
- `proof_url` — Taifoon V5 proof for verification
- `timestamp` — Unix timestamp (milliseconds)
- `chain_id` — EVM chain ID or `'solana'`
- `confidence` — 0-1 score (where applicable)

**Quality gates applied:**
- No `???` token symbols
- No `Token(0x...)` placeholder names
- `rug_score < 40` (launches only)
- `sniper_score > 30` (launches only)
- MMR proof available

**Expected throughput:**
- `token_launch`: ~5-10 per minute (peak)
- `snipe_signal`: ~1-2 per minute
- `whale_transfer`: ~0.5 per minute
- Others: <1 per minute

---

## Testing

**Sandbox mode available:**
- Use `https://api.taifoon.dev/sandbox/signals` for test data
- Replays historical signals (no real trades)
- Rate limit: 100 signals/hour

**Production:**
- Real-time SSE stream: `https://api.taifoon.dev/api/sniper/live`
- Webhook delivery: `POST https://sonar.trade/api/integrations/taifoon/signals`

---

## Support

Questions? Contact dev@taifoon.dev or join Discord: https://discord.gg/taifoon
