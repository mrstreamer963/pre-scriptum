import { describe, expect, it } from 'vitest';
import { createGraphApi } from '../src/core/api';
import { CosineSearch, cosineSimilarity } from '../src/adapters/cosine-search';
import { FakeEmbedding, MemoryStorage } from './helpers';

function makeApi() {
  const storage = new MemoryStorage();
  return {
    api: createGraphApi({ storage, embedding: new FakeEmbedding(), search: new CosineSearch() }),
    storage,
  };
}

describe('семантика: эмбеддинги', () => {
  it('генерирует эмбеддинг при создании карточки', async () => {
    const { api, storage } = makeApi();
    const card = await api.createCard({ title: 'Нейронные сети' });
    const embedding = await storage.getEmbedding(card.id);
    expect(embedding).toBeDefined();
    expect(embedding?.vector.length).toBe(64);
    expect(embedding?.model).toBe('fake-ngram');
  });

  it('пересчитывает эмбеддинг при изменении карточки', async () => {
    const { api, storage } = makeApi();
    const card = await api.createCard({ title: 'Оригинал' });
    const before = await storage.getEmbedding(card.id);

    await api.updateCard(card.id, { title: 'Совсем другой текст заголовка' });
    const after = await storage.getEmbedding(card.id);

    expect(after).toBeDefined();
    expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt);
    expect(after!.vector).not.toEqual(before!.vector);
  });
});

describe('семантика: косинусная близость', () => {
  it('считает косинус единичных и перпендикулярных векторов', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('ранжирует похожие карточки выше', async () => {
    const { api } = makeApi();
    await api.createCard({ title: 'рецепт борща свекла бурак капуста' });
    await api.createCard({ title: 'рецепт пасты макароны соус' });
    await api.createCard({ title: 'вселенная космос галактика звёзды' });

    const hits = await api.semanticSearch('как варить борщ из свеклы', 3);
    expect(hits.length).toBe(3);
    expect(hits[0].card.title).toContain('борща');
  });
});

describe('семантика: мягкие связи', () => {
  it('исключает карточки с жёсткой связью и саму себя', async () => {
    const { api } = makeApi();
    const center = await api.createCard({ title: 'космос галактика вселенная звёзды планеты' });
    const similarHard = await api.createCard({ title: 'звёзды галактики туманности космос' });
    const similarFree = await api.createCard({ title: 'телескоп орбита спутник космос наука' });
    const distant = await api.createCard({ title: 'рецепт шоколадного торта мука сахар' });

    await api.createLink({ from: center.id, to: similarHard.id, type: 'reference' });

    const soft = await api.softLinks(center.id, { topK: 10, threshold: 0 });
    const softIds = soft.map((s) => s.card.id);
    expect(softIds).not.toContain(center.id);
    expect(softIds).not.toContain(similarHard.id);
    expect(softIds).toContain(similarFree.id);
    expect(softIds).toContain(distant.id);
  });

  it('не возвращает мягкие связи ниже порога', async () => {
    const { api } = makeApi();
    const center = await api.createCard({ title: 'космос астрономия звёзды планеты орбита' });
    await api.createCard({ title: 'рецепт пасты макароны соус томат' });

    const soft = await api.softLinks(center.id, { topK: 5, threshold: 0.9 });
    expect(soft).toHaveLength(0);
  });

  it('предлагает жёсткую связь и принимает её', async () => {
    const { api } = makeApi();
    const center = await api.createCard({ title: 'нейросети машинное обучение обучение модели' });
    const close = await api.createCard({ title: 'обучение модели машинное обучение нейросети' });

    const suggestions = await api.suggestHardLinks(center.id, { topK: 5, threshold: 0.05 });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].card.id).toBe(close.id);

    await api.createLink({ from: center.id, to: close.id, type: 'reference' });

    const after = await api.suggestHardLinks(center.id, { topK: 5, threshold: 0 });
    expect(after.map((s) => s.card.id)).not.toContain(close.id);
  });
});
