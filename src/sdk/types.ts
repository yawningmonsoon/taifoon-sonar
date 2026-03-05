/**
 * TypeScript types for Taifoon ↔ Sonar integration
 */

// ── Proof Anchoring ───────────────────────────────────────────────────────────

export interface ProofRequest {
  chain_id: number | string;
  block_number: number;
  tx_hash?: string;
  strategy?: string;
  metadata?: Record<string, any>;
}

export interface ProofResponse {
  proof_id: string;
  proof_blob: string;
  verification_url: string;
  layers: {
    block: { hash: string; timestamp: number };
    twig: { root: string; index: number };
    mmr: { root: string; peak_count: number };
    superroot: { root: string; batch_id: number };
    finality: { type: string; confirmed: boolean };
    operator: { attested: boolean; timestamp: number };
  };
  on_chain_verifiable: boolean;
  generated_at: number;
}

// ── Signal Relay ──────────────────────────────────────────────────────────────

export interface RelayConfig {
  taifoonSseUrl: string;
  sonarWebhookUrl: string;
  sonarWebhookSecret: string;
  filters: RelayFilters;
}

export interface RelayFilters {
  strategies?: string[];
  min_rug_score?: number;
  max_rug_score?: number;
  min_sniper_score?: number;
  chains?: (number | string)[];
  platforms?: string[];
}

export interface RelayStats {
  total: number;
  accepted: number;
  rejected: number;
  errors: number;
  last_signal_at: number;
}

// ── Signal Types ──────────────────────────────────────────────────────────────

export interface TokenLaunchSignal {
  type: 'token_launch';
  token_address: string;
  token_symbol: string;
  token_name: string;
  chain_id: number | string;
  chain_name: string;
  platform: string;
  pair_address?: string;
  pool_id?: string;
  initial_price: number;
  initial_liquidity_usd?: number;
  rug_score: number;
  sniper_score: number;
  has_hooks?: boolean;
  proof_url: string;
  timestamp: number;
}

export interface SnipeSignal {
  type: 'snipe_signal';
  action: 'entry' | 'exit' | 'monitor';
  strategy: 'GEM_HUNT' | 'SWEEPER' | 'WHALE';
  token_address: string;
  token_symbol: string;
  chain_id: number | string;
  chain_name: string;
  platform: string;
  entry_price?: number;
  current_price?: number;
  exit_price?: number;
  gain_pct?: number;
  reason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TIMEOUT' | 'RUG_EXIT';
  confidence: number;
  recommended_params: {
    allocation_pct: number;
    take_profit_pct: number;
    stop_loss_pct: number;
    timeout_minutes: number;
  };
  proof_url: string;
  timestamp: number;
}

export interface WhaleTransferSignal {
  type: 'whale_transfer';
  from_address: string;
  to_address: string;
  token_address: string;
  token_symbol: string;
  value_eth?: number;
  value_usd: number;
  chain_id: number | string;
  chain_name: string;
  tx_hash: string;
  block_number: number;
  from_label?: string;
  to_label?: string;
  proof_url: string;
  timestamp: number;
}

export interface ArbSignal {
  type: 'arb_signal';
  token_symbol: string;
  token_address_a: string;
  token_address_b: string;
  chain_a: number;
  chain_b: number;
  price_a: number;
  price_b: number;
  spread_pct: number;
  profit_usd_estimated: number;
  gas_cost_usd: number;
  net_profit_usd: number;
  proof_url_a: string;
  proof_url_b: string;
  timestamp: number;
}

export interface GasSpikeSignal {
  type: 'gas_spike';
  chain_id: number;
  chain_name: string;
  base_fee_gwei: number;
  spike_gwei: number;
  multiplier: number;
  block_number: number;
  trigger: 'nft_mint' | 'token_launch' | 'liquidation' | 'unknown';
  proof_url: string;
  timestamp: number;
}

export interface DeFiEventSignal {
  type: 'defi_event';
  protocol: string;
  event_type: 'governance_proposal' | 'exploit_detected' | 'liquidity_migration' | 'oracle_update';
  chain_id: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_assets?: string[];
  proof_url: string;
  timestamp: number;
}

export type TaifoonSignal =
  | TokenLaunchSignal
  | SnipeSignal
  | WhaleTransferSignal
  | ArbSignal
  | GasSpikeSignal
  | DeFiEventSignal;
