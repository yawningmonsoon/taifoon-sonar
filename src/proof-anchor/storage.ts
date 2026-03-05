/**
 * Proof Storage — In-memory cache + optional RocksDB persistence
 */

import { ProofResponse } from './proof-generator.js';

// In-memory cache (LRU with 10k max entries)
const cache = new Map<string, ProofResponse>();
const MAX_CACHE_SIZE = 10_000;

export async function storeProof(proof_id: string, proof: ProofResponse): Promise<void> {
  // Store in memory
  cache.set(proof_id, proof);

  // Evict oldest if cache full
  if (cache.size > MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  // TODO: Persist to RocksDB or Postgres for long-term storage
  // await rocksdb.put(proof_id, JSON.stringify(proof));
}

export async function getProof(proof_id: string): Promise<ProofResponse | null> {
  // Check memory cache first
  const cached = cache.get(proof_id);
  if (cached) return cached;

  // TODO: Check RocksDB if not in memory
  // const stored = await rocksdb.get(proof_id);
  // if (stored) {
  //   const proof = JSON.parse(stored);
  //   cache.set(proof_id, proof); // warm cache
  //   return proof;
  // }

  return null;
}

export function getCacheStats() {
  return {
    size: cache.size,
    max_size: MAX_CACHE_SIZE,
    hit_rate: 0, // TODO: track hits/misses
  };
}
