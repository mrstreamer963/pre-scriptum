import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoragePort } from '../core/ports';
import type { Card, Document, Embedding, Link } from '../core/types';

interface PreScriptumSchema extends DBSchema {
  cards: { key: string; value: Card };
  links: { key: string; value: Link };
  documents: { key: string; value: Document };
  embeddings: { key: string; value: Embedding };
}

export class IndexedDBStorage implements StoragePort {
  private readonly db: Promise<IDBPDatabase<PreScriptumSchema>>;

  constructor(name = 'pre-scriptum') {
    this.db = openDB<PreScriptumSchema>(name, 1, {
      upgrade(database) {
        database.createObjectStore('cards', { keyPath: 'id' });
        database.createObjectStore('links', { keyPath: 'id' });
        database.createObjectStore('documents', { keyPath: 'id' });
        database.createObjectStore('embeddings', { keyPath: 'cardId' });
      },
    });
  }

  // Cards
  async listCards(): Promise<Card[]> {
    return (await this.db).getAll('cards');
  }

  async getCard(id: string): Promise<Card | undefined> {
    return (await this.db).get('cards', id);
  }

  async saveCard(card: Card): Promise<void> {
    await (await this.db).put('cards', card);
  }

  async deleteCard(id: string): Promise<void> {
    await (await this.db).delete('cards', id);
  }

  // Links
  async listLinks(): Promise<Link[]> {
    return (await this.db).getAll('links');
  }

  async getLink(id: string): Promise<Link | undefined> {
    return (await this.db).get('links', id);
  }

  async saveLink(link: Link): Promise<void> {
    await (await this.db).put('links', link);
  }

  async deleteLink(id: string): Promise<void> {
    await (await this.db).delete('links', id);
  }

  // Documents
  async listDocuments(): Promise<Document[]> {
    return (await this.db).getAll('documents');
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return (await this.db).get('documents', id);
  }

  async saveDocument(doc: Document): Promise<void> {
    await (await this.db).put('documents', doc);
  }

  async deleteDocument(id: string): Promise<void> {
    await (await this.db).delete('documents', id);
  }

  // Embeddings
  async listEmbeddings(): Promise<Embedding[]> {
    return (await this.db).getAll('embeddings');
  }

  async getEmbedding(cardId: string): Promise<Embedding | undefined> {
    return (await this.db).get('embeddings', cardId);
  }

  async saveEmbedding(embedding: Embedding): Promise<void> {
    await (await this.db).put('embeddings', embedding);
  }

  async deleteEmbedding(cardId: string): Promise<void> {
    await (await this.db).delete('embeddings', cardId);
  }
}
