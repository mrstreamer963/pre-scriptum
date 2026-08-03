import { useEffect, useState, type ReactNode } from 'react';
import type { GraphApi } from '../core/api';
import type { Card, Link, LinkType } from '../core/types';
import type { SoftLink } from '../core/semantics';
import { extractCardRefs, renderMarkdown } from './markdown';

export interface LinkAction {
  from: string;
  to: string;
  type: LinkType;
}

export function CardsList({
  cards,
  currentId,
  onSelect,
  onCreate,
}: {
  cards: Card[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="panel cards-list">
      <div className="panel-head">
        <h3>Карточки ({cards.length})</h3>
        <button type="button" className="ghost" onClick={onCreate} title="Новая карточка">
          + Новая
        </button>
      </div>
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              className={card.id === currentId ? 'active' : ''}
              onClick={() => onSelect(card.id)}
              title={card.body}
            >
              {card.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardEditor({ card, onSave, onDelete }: { card: Card | null; onSave: (title: string, body: string) => void; onDelete: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    setTitle(card?.title ?? '');
    setBody(card?.body ?? '');
  }, [card]);

  if (!card) {
    return (
      <div className="panel">
        <h3>Карточка</h3>
        <p className="muted">Выберите карточку в графе или списке.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Карточка</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (title.trim()) onSave(title, body);
          }
        }}
        placeholder="Заголовок"
      />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Тело (необязательно)" rows={5} />
      <div className="row">
        <button type="button" onClick={() => onSave(title, body)} disabled={!title.trim()}>
          Сохранить
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Удалить
        </button>
      </div>
    </div>
  );
}

export function LinkCreator({ cards, currentId, onCreateLink }: { cards: Card[]; currentId: string | null; onCreateLink: (action: LinkAction) => void }) {
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState<LinkType>('reference');

  const candidates = cards.filter((card) => card.id !== currentId);
  useEffect(() => {
    if (!targetId && candidates.length > 0) {
      setTargetId(candidates[0].id);
    }
  });

  if (!currentId) {
    return null;
  }

  return (
    <div className="panel">
      <h3>Новая связь</h3>
      <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
        {candidates.map((card) => (
          <option key={card.id} value={card.id}>
            {card.title}
          </option>
        ))}
      </select>
      <div className="row">
        <label>
          <input type="radio" checked={type === 'reference'} onChange={() => setType('reference')} /> ссылка
        </label>
        <label>
          <input type="radio" checked={type === 'parent'} onChange={() => setType('parent')} /> родитель
        </label>
      </div>
      <button type="button" onClick={() => targetId && onCreateLink({ from: currentId, to: targetId, type })}>
        Создать
      </button>
    </div>
  );
}

export function PlexLinks({ plex, onDeleteLink }: { plex: { links: Link[] } | null; onDeleteLink: (id: string) => void }) {
  if (!plex || plex.links.length === 0) {
    return (
      <div className="panel">
        <h3>Связи</h3>
        <p className="muted">Прямых связей нет.</p>
      </div>
    );
  }
  return (
    <div className="panel">
      <h3>Связи</h3>
      <ul>
        {plex.links.map((link) => (
          <li key={link.id}>
            {link.type === 'parent' ? 'родитель' : 'ссылка'}:
            <button type="button" className="link" onClick={() => onDeleteLink(link.id)}>
              удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestionRow({ item, onAccept }: { item: SoftLink; onAccept: (type: LinkType) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <li>
      <span className="score">{item.score.toFixed(2)}</span> {item.card.title}
      <div className="row">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onAccept('reference');
          }}
        >
          ссылка
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onAccept('parent');
          }}
        >
          родитель
        </button>
      </div>
    </li>
  );
}

export function SoftLinksPanel({ softLinks, onAccept, onRefresh }: { softLinks: SoftLink[]; onAccept: (to: string, type: LinkType) => void; onRefresh: () => void }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Семантически близкие</h3>
        <button type="button" className="ghost" onClick={onRefresh}>
          Обновить
        </button>
      </div>
      {softLinks.length === 0 ? (
        <p className="muted">Нет мягких связей.</p>
      ) : (
        <ul>
          {softLinks.map((item) => (
            <SuggestionRow key={item.card.id} item={item} onAccept={(type) => onAccept(item.card.id, type)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchPanel({ api, onOpenCard }: { api: GraphApi; onOpenCard: (id: string) => void }) {
  const [textQuery, setTextQuery] = useState('');
  const [semQuery, setSemQuery] = useState('');
  const [textResults, setTextResults] = useState<Card[] | null>(null);
  const [semResults, setSemResults] = useState<Array<{ card: Card; score: number }>>([]);
  const [searching, setSearching] = useState(false);

  const runText = async () => {
    setTextResults(await api.searchCards(textQuery));
  };

  const runSemantic = async () => {
    setSearching(true);
    try {
      setSemResults(await api.semanticSearch(semQuery, 8));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="panel search-panel">
      <h3>Поиск</h3>
      <div className="search-group">
        <input value={textQuery} onChange={(e) => setTextQuery(e.target.value)} placeholder="Текстовый поиск" />
        <button type="button" onClick={runText}>
          Найти
        </button>
      </div>
      {textResults && (
        <ul>
          {textResults.map((card) => (
            <li key={card.id}>
              <button type="button" className="link" onClick={() => onOpenCard(card.id)}>
                {card.title}
              </button>
            </li>
          ))}
          {textResults.length === 0 && <li className="muted">Ничего не найдено</li>}
        </ul>
      )}
      <div className="search-group">
        <input value={semQuery} onChange={(e) => setSemQuery(e.target.value)} placeholder="Семантический поиск" />
        <button type="button" onClick={runSemantic} disabled={searching}>
          {searching ? '…' : 'Найти'}
        </button>
      </div>
      {semResults.length > 0 && (
        <ul>
          {semResults.map(({ card, score }) => (
            <li key={card.id}>
              <span className="score">{score.toFixed(2)}</span>{' '}
              <button type="button" className="link" onClick={() => onOpenCard(card.id)}>
                {card.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DocumentsPanel({ api, cards, onOpenCard }: { api: GraphApi; cards: Card[]; onOpenCard: (id: string) => void }) {
  const [documents, setDocuments] = useState<Array<{ id: string; title: string }>>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const cardMap = new Map(cards.map((card) => [card.id, card]));

  const load = async () => {
    const docs = await api.listDocuments();
    setDocuments(docs.map((doc) => ({ id: doc.id, title: doc.title })));
  };

  useEffect(() => {
    void load();
  }, []);

  const open = async (id: string) => {
    const doc = await api.getDocument(id);
    if (!doc) {
      return;
    }
    setOpenId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
  };

  const save = async () => {
    if (!openId) {
      return;
    }
    await api.updateDocument(openId, { title, content });
    await load();
  };

  const create = async () => {
    const doc = await api.createDocument({ title: newTitle });
    setNewTitle('');
    await load();
    await open(doc.id);
  };

  const insertCardRef = (cardId: string) => {
    setContent((prev) => `${prev}\n[[${cardId}]]`);
  };

  const remove = async () => {
    if (!openId) {
      return;
    }
    await api.deleteDocument(openId);
    setOpenId(null);
    await load();
  };

  return (
    <div className="panel documents-panel">
      <h3>Документы</h3>
      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>
            <button type="button" className={doc.id === openId ? 'link active' : 'link'} onClick={() => open(doc.id)}>
              {doc.title}
            </button>
          </li>
        ))}
      </ul>
      <div className="search-group">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Новый документ" />
        <button type="button" onClick={create}>
          Создать
        </button>
      </div>
      {openId && (
        <div className="doc-editor">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Markdown…" />
          <div className="row">
            <label>Вставить карточку:</label>
            <select onChange={(e) => e.target.value && insertCardRef(e.target.value)} defaultValue="">
              <option value="" disabled>
                — выберите —
              </option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.title}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <button type="button" onClick={save}>
              Сохранить
            </button>
            <button type="button" className="danger" onClick={remove}>
              Удалить
            </button>
          </div>
          <div className="doc-preview">{renderMarkdown(content, cardMap, onOpenCard)}</div>
        </div>
      )}
    </div>
  );
}

export function RefCount({ text }: { text: string }): ReactNode {
  const refs = extractCardRefs(text);
  if (refs.length === 0) {
    return null;
  }
  return <span className="muted">ссылок на карточки: {refs.length}</span>;
}
