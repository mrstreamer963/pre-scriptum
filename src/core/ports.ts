import type { Card, Document, Embedding, Link } from './types';

export interface StoragePort {
  // Cards
  listCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  saveCard(card: Card): Promise<void>;
  deleteCard(id: string): Promise<void>;

  // Links
  listLinks(): Promise<Link[]>;
  getLink(id: string): Promise<Link | undefined>;
  saveLink(link: Link): Promise<void>;
  deleteLink(id: string): Promise<void>;

  // Documents
  listDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  saveDocument(doc: Document): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  // Embeddings
  listEmbeddings(): Promise<Embedding[]>;
  getEmbedding(cardId: string): Promise<Embedding | undefined>;
  saveEmbedding(embedding: Embedding): Promise<void>;
  deleteEmbedding(cardId: string): Promise<void>;
}

export interface EmbeddingPort {
  embed(text: string): Promise<number[]>;
  readonly model: string;
}

export interface SearchHit {
  id: string;
  score: number;
}

export interface SearchPort {
  search(queryVector: number[], embeddings: Embedding[]): SearchHit[];
}
