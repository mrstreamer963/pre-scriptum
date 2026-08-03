import type { Embedding } from '../core/types';
import type { SearchHit, SearchPort } from '../core/ports';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class CosineSearch implements SearchPort {
  search(queryVector: number[], embeddings: Embedding[]): SearchHit[] {
    const scored: SearchHit[] = embeddings.map((embedding) => ({
      id: embedding.cardId,
      score: cosineSimilarity(queryVector, embedding.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}
