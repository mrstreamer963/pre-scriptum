import type { StoragePort, EmbeddingPort } from '../../src/core/ports';
import type { Card, Document, Embedding, Link } from '../../src/core/types';

export class MemoryStorage implements StoragePort {
  cards = new Map<string, Card>();
  links = new Map<string, Link>();
  documents = new Map<string, Document>();
  embeddings = new Map<string, Embedding>();

  async listCards(): Promise<Card[]> {
    return [...this.cards.values()];
  }

  async getCard(id: string): Promise<Card | undefined> {
    return this.cards.get(id);
  }

  async saveCard(card: Card): Promise<void> {
    this.cards.set(card.id, card);
  }

  async deleteCard(id: string): Promise<void> {
    this.cards.delete(id);
  }

  async listLinks(): Promise<Link[]> {
    return [...this.links.values()];
  }

  async getLink(id: string): Promise<Link | undefined> {
    return this.links.get(id);
  }

  async saveLink(link: Link): Promise<void> {
    this.links.set(link.id, link);
  }

  async deleteLink(id: string): Promise<void> {
    this.links.delete(id);
  }

  async listDocuments(): Promise<Document[]> {
    return [...this.documents.values()];
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async saveDocument(doc: Document): Promise<void> {
    this.documents.set(doc.id, doc);
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async listEmbeddings(): Promise<Embedding[]> {
    return [...this.embeddings.values()];
  }

  async getEmbedding(cardId: string): Promise<Embedding | undefined> {
    return this.embeddings.get(cardId);
  }

  async saveEmbedding(embedding: Embedding): Promise<void> {
    this.embeddings.set(embedding.cardId, embedding);
  }

  async deleteEmbedding(cardId: string): Promise<void> {
    this.embeddings.delete(cardId);
  }
}

export class FakeEmbedding implements EmbeddingPort {
  readonly model = 'fake-ngram';
  readonly dim: number;

  constructor(dim = 64) {
    this.dim = dim;
  }

  async embed(text: string): Promise<number[]> {
    const vec = new Array(this.dim).fill(0);
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    for (let i = 0; i < normalized.length - 1; i++) {
      const bigram = normalized.slice(i, i + 2);
      let hash = 0;
      for (let j = 0; j < bigram.length; j++) {
        hash = (hash * 31 + bigram.charCodeAt(j)) >>> 0;
      }
      vec[hash % this.dim] += 1;
    }
    const length = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / length);
  }
}
