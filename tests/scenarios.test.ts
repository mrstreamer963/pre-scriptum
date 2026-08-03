import { describe, expect, it } from 'vitest';
import { createGraphApi } from '../src/core/api';
import { CosineSearch } from '../src/adapters/cosine-search';
import { FakeEmbedding, MemoryStorage } from './helpers';
import { extractCardRefs } from '../src/ui/markdown';

function makeApi() {
  const storage = new MemoryStorage();
  return {
    api: createGraphApi({ storage, embedding: new FakeEmbedding(), search: new CosineSearch() }),
    storage,
  };
}

describe('сценарии specs: плекс (thought-graph)', () => {
  it('новая карточка появляется и доступна для навигации', async () => {
    const { api } = makeApi();
    const card = await api.createCard({ title: 'Новая мысль', body: 'тело' });
    expect(await api.getCard(card.id)).toBeDefined();
    const plex = await api.getPlex(card.id);
    expect(plex.center.title).toBe('Новая мысль');
  });

  it('перескок по связи перестраивает плекс вокруг новой карточки', async () => {
    const { api } = makeApi();
    const a = await api.createCard({ title: 'A' });
    const b = await api.createCard({ title: 'B' });
    const c = await api.createCard({ title: 'C' });
    await api.createLink({ from: a.id, to: b.id, type: 'parent' });
    await api.createLink({ from: b.id, to: c.id, type: 'reference' });

    const plexA = await api.getPlex(a.id);
    expect(plexA.neighbors.map((n) => n.card.id)).toEqual([b.id]);

    const plexB = await api.getPlex(b.id);
    const bNeighbors = plexB.neighbors.map((n) => n.card.id).sort();
    expect(bNeighbors).toEqual([a.id, c.id].sort());
  });
});

describe('сценарии specs: семантика (semantic-links)', () => {
  it('отображает мягкие связи только к близким карточкам без жёсткой связи', async () => {
    const { api } = makeApi();
    const center = await api.createCard({ title: 'астрономия космос звёзды планеты орбита' });
    const close = await api.createCard({ title: 'звёзды планеты космос астрономия' });
    await api.createCard({ title: 'выпечка хлеб мука дрожжи духовка' });

    const soft = await api.softLinks(center.id, { topK: 1, threshold: 0 });
    expect(soft).toHaveLength(1);
    expect(soft[0].card.id).toBe(close.id);
  });

  it('не отображает мягких связей, если близких карточек нет', async () => {
    const { api } = makeApi();
    const center = await api.createCard({ title: 'философия разум сознание бытие' });
    await api.createCard({ title: 'рецепт пасты соус макароны' });

    const soft = await api.softLinks(center.id, { topK: 5, threshold: 0.8 });
    expect(soft).toHaveLength(0);
  });
});

describe('сценарии specs: документы (writing-layer)', () => {
  it('создаёт, редактирует и удаляет документ; документ не становится карточкой', async () => {
    const { api } = makeApi();
    const doc = await api.createDocument({ title: 'Эссе', content: '# Начало' });
    expect((await api.listDocuments()).map((d) => d.id)).toContain(doc.id);
    expect(await api.getCard(doc.id)).toBeUndefined();

    await api.updateDocument(doc.id, { title: 'Эссе v2', content: 'Изменённый текст' });
    const updated = await api.getDocument(doc.id);
    expect(updated?.title).toBe('Эссе v2');
    expect(updated?.content).toBe('Изменённый текст');

    await api.deleteDocument(doc.id);
    expect(await api.getDocument(doc.id)).toBeUndefined();
  });

  it('извлекает ссылки на карточки из markdown и ссылка ведёт к карточке', async () => {
    const { api } = makeApi();
    const card = await api.createCard({ title: 'Целевая мысль' });
    const doc = await api.createDocument({ title: 'Док', content: `См. [[${card.id}]]` });

    const loaded = await api.getDocument(doc.id);
    expect(extractCardRefs(loaded!.content)).toEqual([card.id]);
    expect(await api.getCard(card.id)).toBeDefined();
  });
});
