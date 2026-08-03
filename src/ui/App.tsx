import { useCallback, useEffect, useState } from 'react';
import type { GraphApi } from '../core/api';
import type { Card, LinkType } from '../core/types';
import type { Plex } from '../core/services';
import type { SoftLink } from '../core/semantics';
import { PlexGraph } from './PlexGraph';
import { CardEditor, CardsList, DocumentsPanel, LinkCreator, PlexLinks, SearchPanel, SoftLinksPanel, type LinkAction } from './panels';

export interface AppProps {
  api: GraphApi;
}

export function App({ api }: AppProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [plex, setPlex] = useState<Plex | null>(null);
  const [soft, setSoft] = useState<SoftLink[]>([]);
  const [embeddingStatus, setEmbeddingStatus] = useState<'idle' | 'ready' | 'error'>('idle');

  const refreshCards = useCallback(async () => {
    setCards(await api.listCards());
  }, [api]);

  const refreshPlex = useCallback(
    async (id: string) => {
      try {
        const next = await api.getPlex(id);
        setPlex(next);
        setSoft(await api.softLinks(id, { topK: 6, threshold: 0.25 }));
      } catch (error) {
        console.error('Ошибка загрузки плекса', error);
        setPlex(null);
      }
    },
    [api],
  );

  const loadAll = useCallback(async () => {
    await refreshCards();
    setEmbeddingStatus('ready');
  }, [refreshCards]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!currentId) {
      setPlex(null);
      setSoft([]);
      return;
    }
    void refreshPlex(currentId);
  }, [currentId, refreshPlex]);

  const selectCard = useCallback(
    async (id: string) => {
      setCurrentId(id);
      await refreshPlex(id);
    },
    [refreshPlex],
  );

  const handleCreateCard = async (title: string, body: string) => {
    try {
      const card = await api.createCard({ title, body });
      await refreshCards();
      await selectCard(card.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSaveCard = async (title: string, body: string) => {
    if (!currentId) {
      return;
    }
    try {
      await api.updateCard(currentId, { title, body });
      await refreshCards();
      await refreshPlex(currentId);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDeleteCard = async () => {
    if (!currentId) {
      return;
    }
    const id = currentId;
    await api.deleteCard(id);
    setCurrentId(null);
    await refreshCards();
  };

  const handleCreateLink = async (action: LinkAction) => {
    if (!currentId) {
      return;
    }
    try {
      await api.createLink(action);
      await refreshPlex(currentId);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!currentId) {
      return;
    }
    await api.deleteLink(id);
    await refreshPlex(currentId);
  };

  const handleAcceptSoft = async (to: string, type: LinkType) => {
    if (!currentId) {
      return;
    }
    try {
      await api.createLink({ from: currentId, to, type });
      await refreshPlex(currentId);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRecompute = async () => {
    setEmbeddingStatus('ready');
    const count = await api.recomputeEmbeddings();
    alert(`Эмбеддинги пересчитаны: ${count}`);
  };

  const currentCard = cards.find((card) => card.id === currentId) ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>pre-scriptum</h1>
        <div className="embedding-status">
          {embeddingStatus === 'error' ? (
            <span className="badge error">модель недоступна</span>
          ) : (
            <span className="badge">эмбеддинги активны</span>
          )}
        </div>
      </header>
      <div className="app-layout">
        <aside className="sidebar-left">
          <CardsList
            cards={cards}
            currentId={currentId}
            onSelect={(id) => void selectCard(id)}
            onCreate={() => void handleCreateCard('Новая мысль', '')}
          />
          <PlexLinks plex={plex} onDeleteLink={(id) => void handleDeleteLink(id)} />
        </aside>
        <main className="graph-area">
          {plex ? (
            <PlexGraph
              center={plex.center}
              neighbors={plex.neighbors}
              soft={soft}
              onSelect={(id) => void selectCard(id)}
            />
          ) : (
            <div className="empty-state">
              <p>Выберите карточку слева или создайте новую.</p>
              <button type="button" onClick={() => handleCreateCard('Новая мысль', '')}>
                Создать первую карточку
              </button>
            </div>
          )}
        </main>
        <aside className="sidebar-right">
          <CardEditor card={currentCard} onSave={handleSaveCard} onDelete={() => void handleDeleteCard()} />
          <LinkCreator cards={cards} currentId={currentId} onCreateLink={(action) => void handleCreateLink(action)} />
          <SoftLinksPanel softLinks={soft} onAccept={(to, type) => void handleAcceptSoft(to, type)} onRefresh={() => currentId && void refreshPlex(currentId)} />
          <SearchPanel api={api} onOpenCard={(id) => void selectCard(id)} />
          <DocumentsPanel api={api} cards={cards} onOpenCard={(id) => void selectCard(id)} />
          <div className="panel">
            <button type="button" onClick={() => void handleRecompute()}>
              Пересчитать эмбеддинги
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
