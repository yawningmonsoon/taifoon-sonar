/**
 * Example: Sonar.trade integrating Taifoon proof anchoring
 * 
 * Use case: After Sonar executes a trade, anchor it to Taifoon V5 proofs
 * for cryptographic verification and "trustless execution" claims.
 */

import { TaifoonProofClient } from '@taifoon/sonar-sdk';

// Initialize Taifoon client
const taifoon = new TaifoonProofClient({
  apiKey: process.env.TAIFOON_API_KEY!,
  apiUrl: 'https://api.taifoon.dev'
});

// ── Example: Sonar trade execution flow ──────────────────────────────────────

interface SonarTrade {
  id: string;
  user: string;
  vault: string;
  chain_id: number;
  token_address: string;
  amount_usd: number;
  strategy: 'market_making' | 'position_scaling';
  tx_hash: string;
  block_number: number;
  timestamp: number;
}

async function executeTrade(params: {
  user: string;
  vault: string;
  token: string;
  amount_usd: number;
  strategy: 'market_making' | 'position_scaling';
}): Promise<SonarTrade> {
  // Sonar executes the trade (mock)
  console.log('[SONAR] Executing trade:', params);
  
  // Simulate blockchain transaction
  const trade: SonarTrade = {
    id: `trade_${Date.now()}`,
    user: params.user,
    vault: params.vault,
    chain_id: 8453, // Base
    token_address: params.token,
    amount_usd: params.amount_usd,
    strategy: params.strategy,
    tx_hash: '0xabc123...',
    block_number: 42891234,
    timestamp: Date.now()
  };

  console.log('[SONAR] Trade executed:', trade);
  return trade;
}

async function anchorTradeToTaifoon(trade: SonarTrade): Promise<void> {
  try {
    console.log('[TAIFOON] Anchoring trade to V5 proofs...');
    
    const proof = await taifoon.anchorTrade({
      chain_id: trade.chain_id,
      block_number: trade.block_number,
      tx_hash: trade.tx_hash,
      strategy: trade.strategy,
      metadata: {
        sonar_trade_id: trade.id,
        user: trade.user,
        vault: trade.vault,
        amount_usd: trade.amount_usd
      }
    });

    console.log('[TAIFOON] Proof generated:', {
      proof_id: proof.proof_id,
      verification_url: proof.verification_url,
      on_chain_verifiable: proof.on_chain_verifiable
    });

    // Store proof with trade in Sonar's database
    await updateTradeWithProof(trade.id, proof);

    console.log('[SUCCESS] Trade anchored successfully!');
    console.log(`Verify at: ${proof.verification_url}`);
  } catch (error) {
    console.error('[ERROR] Failed to anchor trade:', error);
    throw error;
  }
}

async function updateTradeWithProof(tradeId: string, proof: any): Promise<void> {
  // Store in Sonar's database (mock)
  console.log('[SONAR] Updating trade with proof:', {
    trade_id: tradeId,
    proof_id: proof.proof_id,
    proof_blob: proof.proof_blob.slice(0, 20) + '...',
    verification_url: proof.verification_url
  });

  // In production:
  // await db.trades.update(tradeId, {
  //   taifoon_proof_id: proof.proof_id,
  //   taifoon_proof_blob: proof.proof_blob,
  //   taifoon_verification_url: proof.verification_url,
  //   verified_at: Date.now()
  // });
}

// ── Main execution flow ───────────────────────────────────────────────────────

async function main() {
  // 1. Sonar executes a trade
  const trade = await executeTrade({
    user: '0x123abc...',
    vault: '0x456def...',
    token: '0x789ghi...',
    amount_usd: 5000,
    strategy: 'market_making'
  });

  // 2. Anchor trade to Taifoon V5 proofs
  await anchorTradeToTaifoon(trade);

  // 3. Users can now verify the trade on scanner.taifoon.dev
  console.log('\n✅ Trade is now cryptographically verifiable!');
  console.log('Marketing tagline: "Trustless Execution via Taifoon V5 Proofs"');
}

main().catch(console.error);
