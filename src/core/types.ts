export type LinkType = 'parent' | 'reference';

export interface Card {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface Link {
  id: string;
  from: string;
  to: string;
  type: LinkType;
  createdAt: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Embedding {
  cardId: string;
  vector: number[];
  model: string;
  updatedAt: number;
}

export interface CardInput {
  title: string;
  body?: string;
}

export interface DocumentInput {
  title: string;
  content?: string;
}

export interface LinkInput {
  from: string;
  to: string;
  type: LinkType;
}
