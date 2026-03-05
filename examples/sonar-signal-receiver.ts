/**
 * Example: Sonar.trade receiving Taifoon signals
 * 
 * Use case: Taifoon sends AI-curated signals → Sonar executes trades
 * based on backtested strategies (GEM HUNT, SWEEPER, WHALE).
 */

import express from 'express';
import { createHmac } from 'crypto';

const app = express();
app.use(express.json());

// ── Webhook signature verification ───────────────────────────────────────────

function verifyTaifoonSignature(
  signature: string,
  timestamp: string,
  payload: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(`${timestamp}.${payload}`);
  const expected = hmac.digest('hex');
  return signature === expected;
}

// ── Taifoon → Sonar strategy mapping ─────────────────────────────────────────

interface TaifoonSignal {
  type: string;
  action: 'entry' | 'exit' | 'monitor';
  strategy: 'GEM_HUNT' | 'SWEEPER' | 'WHALE';
  token_address: string;
  token_symbol: string;
  chain_id: number | string;
  platform: string;
  entry_price?: number;
  confidence: number;
  recommended_params: {
    allocation_pct: number;
    take_profit_pct: number;
    stop_loss_pct: number;
    timeout_minutes: number;
  };
  proof_url: string;
}

interface SonarStrategy {
  token: string;
  chain: number | string;
  entryPrice: number;
  allocation: number; // 0-1
  takeProfit: number; // multiplier
  stopLoss: number;   // multiplier
  timeout: number;    // milliseconds
  metadata: {
    taifoon_signal_id: string;
    taifoon_strategy: string;
    proof_url: string;
  };
}

function mapTaifoonToSonar(signal: TaifoonSignal): SonarStrategy {
  const params = signal.recommended_params;
  
  return {
    token: signal.token_address,
    chain: signal.chain_id,
    entryPrice: signal.entry_price!,
    allocation: params.allocation_pct / 100,
    takeProfit: 1 + (params.take_profit_pct / 100),
    stopLoss: 1 - (params.stop_loss_pct / 100),
    timeout: params.timeout_minutes * 60 * 1000,
    metadata: {
      taifoon_signal_id: `${signal.token_address}_${Date.now()}`,
      taifoon_strategy: signal.strategy,
      proof_url: signal.proof_url
    }
  };
}

// ── Webhook endpoint ──────────────────────────────────────────────────────────

app.post('/api/integrations/taifoon/signals', async (req, res) => {
  const signal: TaifoonSignal = req.body;
  
  // 1. Verify signature
  const signature = req.headers['x-taifoon-signature'] as string;
  const timestamp = req.headers['x-taifoon-timestamp'] as string;
  const secret = process.env.TAIFOON_WEBHOOK_SECRET!;

  if (!verifyTaifoonSignature(signature, timestamp, JSON.stringify(signal), secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Validate signal
  if (signal.action !== 'entry') {
    // Only process entry signals (exits handled by Sonar's own logic)
    return res.json({ status: 'skipped', reason: 'Only processing entry signals' });
  }

  try {
    // 3. Map Taifoon strategy → Sonar strategy
    const sonarStrategy = mapTaifoonToSonar(signal);

    console.log('[SONAR] Received Taifoon signal:', {
      strategy: signal.strategy,
      token: signal.token_symbol,
      chain: signal.chain_id,
      confidence: signal.confidence,
      allocation: sonarStrategy.allocation,
      take_profit: sonarStrategy.takeProfit,
      stop_loss: sonarStrategy.stopLoss
    });

    // 4. Execute via Sonar
    const execution = await executeSonarStrategy(sonarStrategy);

    console.log('[SONAR] Strategy created:', execution.id);

    // 5. Respond to Taifoon
    res.json({
      status: 'accepted',
      sonar_strategy_id: execution.id,
      taifoon_signal_id: sonarStrategy.metadata.taifoon_signal_id
    });
  } catch (error: any) {
    console.error('[SONAR] Error processing signal:', error);
    res.status(500).json({ error: 'Failed to create strategy', message: error.message });
  }
});

// ── Sonar strategy execution (mock) ───────────────────────────────────────────

async function executeSonarStrategy(strategy: SonarStrategy): Promise<{ id: string }> {
  // In production, this would:
  // 1. Check user vault balance
  // 2. Calculate position size (allocation × vault balance)
  // 3. Execute buy order on DEX
  // 4. Set up automated exit conditions (TP/SL/timeout)
  
  console.log('[SONAR] Executing strategy:', {
    token: strategy.token,
    entry_price: strategy.entryPrice,
    allocation: `${(strategy.allocation * 100).toFixed(0)}%`,
    take_profit: `${((strategy.takeProfit - 1) * 100).toFixed(0)}%`,
    stop_loss: `-${((1 - strategy.stopLoss) * 100).toFixed(0)}%`,
    timeout: `${strategy.timeout / 60000}min`
  });

  // Mock execution
  return { id: `sonar_${Date.now()}` };
}

// ── Stats endpoint ────────────────────────────────────────────────────────────

let stats = {
  total_signals: 0,
  accepted: 0,
  rejected: 0,
  errors: 0,
  last_signal_at: 0
};

app.get('/api/integrations/taifoon/stats', (req, res) => {
  res.json(stats);
});

// ── Start server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SONAR] Listening for Taifoon signals on port ${PORT}`);
  console.log(`[SONAR] Webhook: POST http://localhost:${PORT}/api/integrations/taifoon/signals`);
});
