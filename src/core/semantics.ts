import type { EmbeddingPort, SearchPort, StoragePort } from './ports';
import type { Card, Embedding } from './types';
import { now } from './id';

export interface SemanticHit {
  card: Card;
  score: number;
}

export interface SoftLink {
  card: Card;
  score: number;
}

export interface SemanticOptions {
  topK?: number;
  threshold?: number;
}

export function cardText(card: Card): string {
  return card.body ? `${card.title}\n${card.body}` : card.title;
}

export function createSemantics(storage: StoragePort, embeddingPort: EmbeddingPort, searchPort: SearchPort) {
  async function generateEmbedding(card: Card): Promise<Embedding> {
    const vector = await embeddingPort.embed(cardText(card));
    const embedding: Embedding = {
      cardId: card.id,
      vector,
      model: embeddingPort.model,
      updatedAt: now(),
    };
    await storage.saveEmbedding(embedding);
    return embedding;
  }

  async function ensureEmbedding(card: Card): Promise<Embedding> {
    const existing = await storage.getEmbedding(card.id);
    if (existing && existing.model === embeddingPort.model) {
      return existing;
    }
    return generateEmbedding(card);
  }

  async function recomputeEmbeddings(cards: Card[]): Promise<number> {
    let count = 0;
    for (const card of cards) {
      await generateEmbedding(card);
      count += 1;
    }
    return count;
  }

  async function semanticSearch(query: string, topK = 10): Promise<SemanticHit[]> {
    const queryVector = await embeddingPort.embed(query);
    const embeddings = await storage.listEmbeddings();
    const hits = searchPort.search(queryVector, embeddings);
    const result: SemanticHit[] = [];
    for (const hit of hits.slice(0, topK)) {
      const card = await storage.getCard(hit.id);
      if (card) {
        result.push({ card, score: hit.score });
      }
    }
    return result;
  }

  async function softLinks(cardId: string, options: SemanticOptions = {}): Promise<SoftLink[]> {
    const { topK = 5, threshold = 0.3 } = options;
    const centerEmbedding = await storage.getEmbedding(cardId);
    if (!centerEmbedding) {
      return [];
    }
    const links = await storage.listLinks();
    const excluded = new Set<string>([cardId]);
    for (const link of links) {
      if (link.from === cardId) {
        excluded.add(link.to);
      } else if (link.to === cardId) {
        excluded.add(link.from);
      }
    }
    const candidates = (await storage.listEmbeddings()).filter((embedding) => !excluded.has(embedding.cardId));
    const hits = searchPort.search(centerEmbedding.vector, candidates);
    const result: SoftLink[] = [];
    for (const hit of hits) {
      if (hit.score < threshold) {
        break;
      }
      const card = await storage.getCard(hit.id);
      if (card) {
        result.push({ card, score: hit.score });
      }
      if (result.length >= topK) {
        break;
      }
    }
    return result;
  }

  async function suggestHardLinks(cardId: string, options: SemanticOptions = {}): Promise<SoftLink[]> {
    return softLinks(cardId, options);
  }

  return { generateEmbedding, ensureEmbedding, recomputeEmbeddings, semanticSearch, softLinks, suggestHardLinks };
}

export type Semantics = ReturnType<typeof createSemantics>;
