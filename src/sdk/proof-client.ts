/**
 * TaifoonProofClient — SDK for anchoring trades to V5 proofs
 */

import type { ProofRequest, ProofResponse } from './types.js';

export interface ProofClientConfig {
  apiKey: string;
  apiUrl?: string;
}

export class TaifoonProofClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: ProofClientConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.taifoon.dev';
  }

  /**
   * Anchor a trade to Taifoon V5 proofs
   */
  async anchorTrade(request: ProofRequest): Promise<ProofResponse> {
    const url = `${this.apiUrl}/api/v5/proof/anchor`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Proof anchor failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Retrieve a proof by ID
   */
  async getProof(proofId: string): Promise<ProofResponse> {
    const url = `${this.apiUrl}/api/v5/proof/${proofId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Proof not found');
      }
      const error = await response.json();
      throw new Error(`Failed to retrieve proof: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verify a proof on-chain (via scanner UI)
   */
  getVerificationUrl(chainId: number, blockNumber: number): string {
    return `https://scanner.taifoon.dev/proof/${chainId}/${blockNumber}`;
  }
}
