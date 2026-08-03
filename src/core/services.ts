import { newId, now } from './id';
import type { StoragePort } from './ports';
import type { Card, CardInput, Document, DocumentInput, Link, LinkInput } from './types';

export interface PlexNeighbor {
  card: Card;
  link: Link;
}

export interface Plex {
  center: Card;
  links: Link[];
  neighbors: PlexNeighbor[];
}

export interface TextSearchHit {
  card: Card;
  field: 'title' | 'body';
}

export function createCardService(storage: StoragePort) {
  async function listCards(): Promise<Card[]> {
    return storage.listCards();
  }

  async function getCard(id: string): Promise<Card | undefined> {
    return storage.getCard(id);
  }

  async function createCard(input: CardInput): Promise<Card> {
    const title = input.title.trim();
    if (!title) {
      throw new Error('Заголовок карточки не может быть пустым');
    }
    const timestamp = now();
    const card: Card = {
      id: newId(),
      title,
      body: input.body?.trim() ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await storage.saveCard(card);
    return card;
  }

  async function updateCard(id: string, input: CardInput): Promise<Card> {
    const existing = await storage.getCard(id);
    if (!existing) {
      throw new Error(`Карточка не найдена: ${id}`);
    }
    const card: Card = {
      ...existing,
      title: input.title.trim(),
      body: input.body?.trim() ?? existing.body,
      updatedAt: now(),
    };
    if (!card.title) {
      throw new Error('Заголовок карточки не может быть пустым');
    }
    await storage.saveCard(card);
    return card;
  }

  async function deleteCard(id: string): Promise<void> {
    const existing = await storage.getCard(id);
    if (!existing) {
      throw new Error(`Карточка не найдена: ${id}`);
    }
    const links = await storage.listLinks();
    for (const link of links) {
      if (link.from === id || link.to === id) {
        await storage.deleteLink(link.id);
      }
    }
    await storage.deleteEmbedding(id);
    await storage.deleteCard(id);
  }

  return { listCards, getCard, createCard, updateCard, deleteCard };
}

export type CardService = ReturnType<typeof createCardService>;

export function createLinkService(storage: StoragePort) {
  async function listLinks(): Promise<Link[]> {
    return storage.listLinks();
  }

  async function createLink(input: LinkInput): Promise<Link> {
    if (input.from === input.to) {
      throw new Error('Нельзя связать карточку с самой собой');
    }
    const from = await storage.getCard(input.from);
    const to = await storage.getCard(input.to);
    if (!from || !to) {
      throw new Error('Обе карточки должны существовать для создания связи');
    }
    const existing = await storage.listLinks();
    const duplicate = existing.some(
      (link) => link.from === input.from && link.to === input.to && link.type === input.type,
    );
    if (duplicate) {
      throw new Error('Такая связь уже существует');
    }
    const link: Link = {
      id: newId(),
      from: input.from,
      to: input.to,
      type: input.type,
      createdAt: now(),
    };
    await storage.saveLink(link);
    return link;
  }

  async function deleteLink(id: string): Promise<void> {
    const existing = await storage.getLink(id);
    if (!existing) {
      throw new Error(`Связь не найдена: ${id}`);
    }
    await storage.deleteLink(id);
  }

  return { listLinks, createLink, deleteLink };
}

export type LinkService = ReturnType<typeof createLinkService>;

export function createDocumentService(storage: StoragePort) {
  async function listDocuments(): Promise<Document[]> {
    return storage.listDocuments();
  }

  async function getDocument(id: string): Promise<Document | undefined> {
    return storage.getDocument(id);
  }

  async function createDocument(input: DocumentInput): Promise<Document> {
    const timestamp = now();
    const doc: Document = {
      id: newId(),
      title: input.title.trim() || 'Без названия',
      content: input.content ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await storage.saveDocument(doc);
    return doc;
  }

  async function updateDocument(id: string, input: DocumentInput): Promise<Document> {
    const existing = await storage.getDocument(id);
    if (!existing) {
      throw new Error(`Документ не найден: ${id}`);
    }
    const doc: Document = {
      ...existing,
      title: input.title.trim() || existing.title,
      content: input.content ?? existing.content,
      updatedAt: now(),
    };
    await storage.saveDocument(doc);
    return doc;
  }

  async function deleteDocument(id: string): Promise<void> {
    const existing = await storage.getDocument(id);
    if (!existing) {
      throw new Error(`Документ не найден: ${id}`);
    }
    await storage.deleteDocument(id);
  }

  return { listDocuments, getDocument, createDocument, updateDocument, deleteDocument };
}

export type DocumentService = ReturnType<typeof createDocumentService>;

export function createPlexService(storage: StoragePort) {
  async function getPlex(cardId: string): Promise<Plex> {
    const center = await storage.getCard(cardId);
    if (!center) {
      throw new Error(`Карточка не найдена: ${cardId}`);
    }
    const links = await storage.listLinks();
    const direct = links.filter((link) => link.from === cardId || link.to === cardId);
    const neighbors: PlexNeighbor[] = [];
    for (const link of direct) {
      const neighborId = link.from === cardId ? link.to : link.from;
      const card = await storage.getCard(neighborId);
      if (card) {
        neighbors.push({ card, link });
      }
    }
    return { center, links: direct, neighbors };
  }

  return { getPlex };
}

export type PlexService = ReturnType<typeof createPlexService>;

export function createTextSearchService(storage: StoragePort) {
  async function searchCards(query: string): Promise<Card[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    const cards = await storage.listCards();
    const hits: TextSearchHit[] = [];
    for (const card of cards) {
      const title = card.title.toLowerCase();
      const body = card.body.toLowerCase();
      if (title.includes(needle)) {
        hits.push({ card, field: 'title' });
      } else if (body.includes(needle)) {
        hits.push({ card, field: 'body' });
      }
    }
    return hits.map((hit) => hit.card);
  }

  return { searchCards };
}

export type TextSearchService = ReturnType<typeof createTextSearchService>;
