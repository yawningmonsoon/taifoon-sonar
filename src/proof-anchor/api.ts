/**
 * Proof Anchor API — Generate V5 proofs for Sonar trades
 * 
 * POST /api/v5/proof/anchor
 *   → Generates 6-layer proof for a trade
 *   → Stores in cache
 *   → Returns proof blob + verification URL
 */

import express from 'express';
import { generateProof, ProofRequest, ProofResponse } from './proof-generator.js';
import { storeProof, getProof } from './storage.js';
import rateLimit from 'express-rate-limit';
import { createHash, createHmac } from 'crypto';

const app = express();
app.use(express.json());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,            // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by API key
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');
    return apiKey || req.ip || 'anonymous';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum 100 requests per minute',
      retry_after: 60
    });
  }
});

app.use('/api/v5/proof', limiter);

// ── Auth Middleware ───────────────────────────────────────────────────────────
const API_KEYS = new Map<string, { name: string; tier: 'free' | 'pro' | 'enterprise'; quota: number }>();

// Load from env or database
if (process.env.SONAR_API_KEY) {
  API_KEYS.set(process.env.SONAR_API_KEY, {
    name: 'Sonar.trade',
    tier: 'enterprise',
    quota: -1 // unlimited
  });
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const client = API_KEYS.get(apiKey);
  
  if (!client) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Check quota (if not unlimited)
  if (client.quota === 0) {
    return res.status(429).json({ error: 'Quota exceeded', message: 'Please upgrade your plan' });
  }

  (req as any).client = client;
  (req as any).apiKey = apiKey;
  next();
}

// ── POST /api/v5/proof/anchor ─────────────────────────────────────────────────
app.post('/api/v5/proof/anchor', authenticate, async (req, res) => {
  try {
    const request: ProofRequest = req.body;
    
    // Validate request
    if (!request.chain_id || !request.block_number) {
      return res.status(400).json({ error: 'Missing required fields: chain_id, block_number' });
    }

    // Check cache first
    const proofId = `proof_${request.chain_id}_${request.block_number}_${request.tx_hash?.slice(0, 10) || 'batch'}`;
    const cached = await getProof(proofId);
    if (cached) {
      console.log(`[PROOF-ANCHOR] Cache hit: ${proofId}`);
      return res.json(cached);
    }

    // Generate proof
    console.log(`[PROOF-ANCHOR] Generating proof for chain=${request.chain_id} block=${request.block_number}`);
    const proof = await generateProof(request);

    // Store in cache
    await storeProof(proofId, proof);

    // Decrement quota (if limited)
    const client = (req as any).client;
    if (client.quota > 0) {
      client.quota--;
    }

    res.json(proof);
  } catch (error: any) {
    console.error('[PROOF-ANCHOR] Error:', error);
    res.status(500).json({ error: 'Proof generation failed', message: error.message });
  }
});

// ── GET /api/v5/proof/:proof_id ───────────────────────────────────────────────
app.get('/api/v5/proof/:proof_id', async (req, res) => {
  try {
    const { proof_id } = req.params;
    const proof = await getProof(proof_id);
    
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    res.json(proof);
  } catch (error: any) {
    console.error('[PROOF-ANCHOR] Error:', error);
    res.status(500).json({ error: 'Failed to retrieve proof', message: error.message });
  }
});

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'taifoon-proof-anchor',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`[PROOF-ANCHOR] API listening on port ${PORT}`);
  console.log(`[PROOF-ANCHOR] Loaded ${API_KEYS.size} API keys`);
});

export default app;
