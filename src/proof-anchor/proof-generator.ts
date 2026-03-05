/**
 * Proof Generator — Calls Taifoon DA API to generate V5 proofs
 */

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

const TAIFOON_API_URL = process.env.TAIFOON_API_URL || 'https://api.taifoon.dev';
const SCANNER_URL = 'https://scanner.taifoon.dev';

export async function generateProof(request: ProofRequest): Promise<ProofResponse> {
  const { chain_id, block_number, tx_hash, strategy, metadata } = request;

  // Call Taifoon DA API for V5 proof
  const url = `${TAIFOON_API_URL}/api/v5/proof/blob/${chain_id}/${block_number}`;
  
  console.log(`[PROOF-GEN] Fetching proof: ${url}`);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Proof API returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  // If proof generation failed (empty blob), return error
  if (!data.proof_blob || data.proof_blob === '0x') {
    throw new Error(`Proof generation failed: ${data.error || 'No proof blob returned'}`);
  }

  // Construct proof ID
  const proof_id = `proof_${chain_id}_${block_number}_${tx_hash?.slice(0, 10) || 'batch'}`;

  // Build response
  const proof: ProofResponse = {
    proof_id,
    proof_blob: data.proof_blob,
    verification_url: `${SCANNER_URL}/proof/${chain_id}/${block_number}`,
    layers: {
      block: {
        hash: data.block_hash || data.layers?.block?.hash || '0x0',
        timestamp: data.block_timestamp || data.layers?.block?.timestamp || 0
      },
      twig: {
        root: data.twig_root || data.layers?.twig?.root || '0x0',
        index: data.twig_index || data.layers?.twig?.index || 0
      },
      mmr: {
        root: data.mmr_root || data.layers?.mmr?.root || '0x0',
        peak_count: data.mmr_peak_count || data.layers?.mmr?.peak_count || 0
      },
      superroot: {
        root: data.superroot || data.layers?.superroot?.root || '0x0',
        batch_id: data.batch_id || data.layers?.superroot?.batch_id || 0
      },
      finality: {
        type: data.finality_type || data.layers?.finality?.type || 'unknown',
        confirmed: data.finality_confirmed ?? data.layers?.finality?.confirmed ?? false
      },
      operator: {
        attested: data.operator_attested ?? data.layers?.operator?.attested ?? false,
        timestamp: data.operator_timestamp || data.layers?.operator?.timestamp || 0
      }
    },
    on_chain_verifiable: data.on_chain_verifiable ?? true,
    generated_at: Date.now()
  };

  return proof;
}
