import { describe, expect, it } from 'vitest';
import { createGraphApi } from '../src/core/api';
import { CosineSearch } from '../src/adapters/cosine-search';
import { FakeEmbedding, MemoryStorage } from './helpers';

function makeApi() {
  const storage = new MemoryStorage();
  return {
    api: createGraphApi({ storage, embedding: new FakeEmbedding(), search: new CosineSearch() }),
    storage,
  };
}

describe('домен: карточки', () => {
  it('создаёт, читает и обновляет карточку', async () => {
    const { api } = makeApi();
    const created = await api.createCard({ title: 'Мысль', body: 'Тело мысли' });
    expect(created.title).toBe('Мысль');
    expect(created.body).toBe('Тело мысли');

    const read = await api.getCard(created.id);
    expect(read).toBeDefined();
    expect(read?.title).toBe('Мысль');

    const updated = await api.updateCard(created.id, { title: 'Мысль 2' });
    expect(updated.title).toBe('Мысль 2');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it('отклоняет карточку с пустым заголовком', async () => {
    const { api } = makeApi();
    await expect(api.createCard({ title: '   ' })).rejects.toThrow('Заголовок');
  });

  it('удаляет карточку вместе со связями и эмбеддингом', async () => {
    const { api, storage } = makeApi();
    const a = await api.createCard({ title: 'A' });
    const b = await api.createCard({ title: 'B' });
    await api.createLink({ from: a.id, to: b.id, type: 'parent' });

    await api.deleteCard(a.id);

    expect(await api.getCard(a.id)).toBeUndefined();
    expect(await storage.listLinks()).toHaveLength(0);
    expect(await storage.listEmbeddings()).toHaveLength(1);
  });
});

describe('домен: связи', () => {
  it('создаёт parent и reference связи', async () => {
    const { api } = makeApi();
    const a = await api.createCard({ title: 'A' });
    const b = await api.createCard({ title: 'B' });

    const parent = await api.createLink({ from: a.id, to: b.id, type: 'parent' });
    const reference = await api.createLink({ from: a.id, to: b.id, type: 'reference' });

    expect(parent.type).toBe('parent');
    expect(reference.type).toBe('reference');
    expect(await api.listLinks()).toHaveLength(2);
  });

  it('отклоняет дубликат связи и связь с самой собой', async () => {
    const { api } = makeApi();
    const a = await api.createCard({ title: 'A' });
    const b = await api.createCard({ title: 'B' });

    await api.createLink({ from: a.id, to: b.id, type: 'parent' });
    await expect(api.createLink({ from: a.id, to: b.id, type: 'parent' })).rejects.toThrow('уже существует');
    await expect(api.createLink({ from: a.id, to: a.id, type: 'reference' })).rejects.toThrow('самой собой');
  });

  it('удаляет связь', async () => {
    const { api } = makeApi();
    const a = await api.createCard({ title: 'A' });
    const b = await api.createCard({ title: 'B' });
    const link = await api.createLink({ from: a.id, to: b.id, type: 'reference' });

    await api.deleteLink(link.id);
    expect(await api.listLinks()).toHaveLength(0);
  });
});

describe('домен: плекс', () => {
  it('возвращает центр и прямых соседей', async () => {
    const { api } = makeApi();
    const a = await api.createCard({ title: 'Центр' });
    const b = await api.createCard({ title: 'Ребёнок' });
    const c = await api.createCard({ title: 'Ссылка' });
    const d = await api.createCard({ title: 'Не связан' });

    await api.createLink({ from: a.id, to: b.id, type: 'parent' });
    await api.createLink({ from: a.id, to: c.id, type: 'reference' });

    const plex = await api.getPlex(a.id);
    expect(plex.center.id).toBe(a.id);
    expect(plex.links).toHaveLength(2);
    const neighborIds = plex.neighbors.map((n) => n.card.id).sort();
    expect(neighborIds).toEqual([b.id, c.id].sort());
    expect(neighborIds).not.toContain(d.id);
  });

  it('показывает обратную связь как соседа', async () => {
    const { api } = makeApi();
    const a = await api.createCard({ title: 'A' });
    const b = await api.createCard({ title: 'B' });
    await api.createLink({ from: a.id, to: b.id, type: 'parent' });

    const plexB = await api.getPlex(b.id);
    expect(plexB.neighbors.map((n) => n.card.id)).toContain(a.id);
  });
});

describe('домен: текстовый поиск', () => {
  it('находит карточку по заголовку и телу без учёта регистра', async () => {
    const { api } = makeApi();
    await api.createCard({ title: 'Кофе', body: 'Утренний ритуал' });
    await api.createCard({ title: 'Чай', body: 'Вечернее расслабление' });

    const byTitle = await api.searchCards('кофе');
    expect(byTitle.map((c) => c.title)).toContain('Кофе');

    const byBody = await api.searchCards('РАССЛАБЛЕНИЕ');
    expect(byBody.map((c) => c.title)).toContain('Чай');
  });
});
