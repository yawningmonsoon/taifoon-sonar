/**
 * Signal Relay Service — Forward Taifoon signals to Sonar webhook
 * 
 * Connects to Taifoon SSE stream → filters signals → POSTs to Sonar
 */

import EventSource from 'eventsource';
import { createHmac } from 'crypto';

interface RelayConfig {
  taifoonSseUrl: string;
  sonarWebhookUrl: string;
  sonarWebhookSecret: string;
  filters: {
    strategies?: string[];
    min_rug_score?: number;
    max_rug_score?: number;
    min_sniper_score?: number;
    chains?: (number | string)[];
    platforms?: string[];
  };
}

export class TaifoonSignalRelay {
  private config: RelayConfig;
  private es: EventSource | null = null;
  public stats = {
    total: 0,
    accepted: 0,
    rejected: 0,
    errors: 0,
    last_signal_at: 0
  };

  constructor(config: RelayConfig) {
    this.config = config;
  }

  start() {
    const types = [
      'token_launch',
      'snipe_signal',
      'whale_transfer',
      'arb_signal',
      'gas_spike',
      'defi_event',
      'coordinated_launch',
      'sniper_fingerprint',
      'launch_reorg_detected'
    ].join(',');

    const url = `${this.config.taifoonSseUrl}/api/sniper/live?types=${types}`;
    console.log(`[SIGNAL-RELAY] Connecting to ${url}`);

    this.es = new EventSource(url);

    this.es.onopen = () => {
      console.log('[SIGNAL-RELAY] Connected to Taifoon SSE stream');
    };

    this.es.onmessage = async (event) => {
      try {
        const signal = JSON.parse(event.data);
        this.stats.total++;
        this.stats.last_signal_at = Date.now();

        // Apply filters
        if (!this.passesFilters(signal)) {
          this.stats.rejected++;
          return;
        }

        // Forward to Sonar
        await this.forwardSignal(signal);
        this.stats.accepted++;
      } catch (error: any) {
        console.error('[SIGNAL-RELAY] Error processing signal:', error.message);
        this.stats.errors++;
      }
    };

    this.es.onerror = (error) => {
      console.error('[SIGNAL-RELAY] SSE error:', error);
    };

    console.log('[SIGNAL-RELAY] Started. Stats available at /stats endpoint');
  }

  stop() {
    if (this.es) {
      this.es.close();
      console.log('[SIGNAL-RELAY] Stopped');
    }
  }

  private passesFilters(signal: any): boolean {
    const f = this.config.filters;

    // Strategy filter
    if (f.strategies && signal.strategy && !f.strategies.includes(signal.strategy)) {
      return false;
    }

    // Rug score filter
    if (typeof signal.rug_score === 'number') {
      if (f.min_rug_score !== undefined && signal.rug_score < f.min_rug_score) return false;
      if (f.max_rug_score !== undefined && signal.rug_score > f.max_rug_score) return false;
    }

    // Sniper score filter
    if (f.min_sniper_score !== undefined && typeof signal.sniper_score === 'number') {
      if (signal.sniper_score < f.min_sniper_score) return false;
    }

    // Chain filter
    if (f.chains && signal.chain_id && !f.chains.includes(signal.chain_id)) {
      return false;
    }

    // Platform filter
    if (f.platforms && signal.platform && !f.platforms.includes(signal.platform)) {
      return false;
    }

    // Quality gates
    if (signal.token_symbol === '???') return false;
    if (signal.token_name && signal.token_name.startsWith('Token(0x')) return false;

    return true;
  }

  private async forwardSignal(signal: any): Promise<void> {
    const payload = JSON.stringify(signal);
    const timestamp = Date.now();
    const signature = this.generateSignature(payload, timestamp);

    try {
      const response = await fetch(this.config.sonarWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Taifoon-Signature': signature,
          'X-Taifoon-Timestamp': String(timestamp)
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
      }

      console.log(`[SIGNAL-RELAY] Forwarded ${signal.type} (${signal.token_symbol || signal.strategy || 'unknown'})`);
    } catch (error: any) {
      console.error(`[SIGNAL-RELAY] Webhook error:`, error.message);
      throw error;
    }
  }

  private generateSignature(payload: string, timestamp: number): string {
    const hmac = createHmac('sha256', this.config.sonarWebhookSecret);
    hmac.update(`${timestamp}.${payload}`);
    return hmac.digest('hex');
  }
}

// ── CLI Usage ─────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const relay = new TaifoonSignalRelay({
    taifoonSseUrl: process.env.TAIFOON_SSE_URL || 'http://localhost:7072',
    sonarWebhookUrl: process.env.SONAR_WEBHOOK_URL!,
    sonarWebhookSecret: process.env.SONAR_WEBHOOK_SECRET!,
    filters: {
      strategies: ['GEM_HUNT', 'SWEEPER', 'WHALE'],
      max_rug_score: 30,
      min_sniper_score: 70,
      chains: [1, 8453, 42161, 10] // ETH, Base, ARB, OP
    }
  });

  relay.start();

  // Stats endpoint
  setInterval(() => {
    console.log(`[SIGNAL-RELAY] Stats:`, relay.stats);
  }, 60_000);

  process.on('SIGTERM', () => relay.stop());
  process.on('SIGINT', () => relay.stop());
}
