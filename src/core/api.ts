import type { EmbeddingPort, SearchPort, StoragePort } from './ports';
import {
  createCardService,
  createDocumentService,
  createLinkService,
  createPlexService,
  createTextSearchService,
  type Plex,
} from './services';
import { createSemantics, type SemanticHit, type SoftLink, type SemanticOptions } from './semantics';
import type { Card, CardInput, Document, DocumentInput, Link, LinkInput } from './types';

export interface GraphApiDeps {
  storage: StoragePort;
  embedding: EmbeddingPort;
  search: SearchPort;
}

export interface GraphApi {
  // Cards
  listCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(input: CardInput): Promise<Card>;
  updateCard(id: string, input: CardInput): Promise<Card>;
  deleteCard(id: string): Promise<void>;

  // Links
  listLinks(): Promise<Link[]>;
  createLink(input: LinkInput): Promise<Link>;
  deleteLink(id: string): Promise<void>;

  // Documents
  listDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(input: DocumentInput): Promise<Document>;
  updateDocument(id: string, input: DocumentInput): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Plex
  getPlex(cardId: string): Promise<Plex>;

  // Search
  searchCards(query: string): Promise<Card[]>;
  semanticSearch(query: string, topK?: number): Promise<SemanticHit[]>;
  softLinks(cardId: string, options?: SemanticOptions): Promise<SoftLink[]>;
  suggestHardLinks(cardId: string, options?: SemanticOptions): Promise<SoftLink[]>;

  // Embeddings
  ensureCardEmbedding(card: Card): Promise<void>;
  recomputeEmbeddings(): Promise<number>;
}

export function createGraphApi(deps: GraphApiDeps): GraphApi {
  const cards = createCardService(deps.storage);
  const links = createLinkService(deps.storage);
  const documents = createDocumentService(deps.storage);
  const plex = createPlexService(deps.storage);
  const text = createTextSearchService(deps.storage);
  const semantics = createSemantics(deps.storage, deps.embedding, deps.search);

  return {
    // Cards
    listCards: cards.listCards,
    getCard: cards.getCard,
    async createCard(input) {
      const card = await cards.createCard(input);
      await semantics.generateEmbedding(card);
      return card;
    },
    async updateCard(id, input) {
      const card = await cards.updateCard(id, input);
      await semantics.generateEmbedding(card);
      return card;
    },
    deleteCard: cards.deleteCard,

    // Links
    listLinks: links.listLinks,
    createLink: links.createLink,
    deleteLink: links.deleteLink,

    // Documents
    listDocuments: documents.listDocuments,
    getDocument: documents.getDocument,
    createDocument: documents.createDocument,
    updateDocument: documents.updateDocument,
    deleteDocument: documents.deleteDocument,

    // Plex
    getPlex: plex.getPlex,

    // Search
    searchCards: text.searchCards,
    semanticSearch: semantics.semanticSearch,
    softLinks: semantics.softLinks,
    suggestHardLinks: semantics.suggestHardLinks,

    // Embeddings
    async ensureCardEmbedding(card) {
      await semantics.ensureEmbedding(card);
    },
    async recomputeEmbeddings() {
      const allCards = await cards.listCards();
      return semantics.recomputeEmbeddings(allCards);
    },
  };
}
