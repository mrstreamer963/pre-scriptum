import type { ReactNode } from 'react';
import type { Card } from '../core/types';

export const CARD_REF_RE = /\[\[([^\]]+)\]\]/;

export function extractCardRefs(text: string): string[] {
  const refs: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function renderInline(text: string, cards: Map<string, Card>, onCardClick: (id: string) => void): ReactNode[] {
  const tokens = text.split(/(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, index) => {
    const cardRef = token.match(/^\[\[([^\]]+)\]\]$/);
    if (cardRef) {
      const id = cardRef[1];
      const card = cards.get(id);
      return (
        <button
          key={index}
          type="button"
          className="card-ref"
          title={card ? `Открыть карточку: ${card.title}` : `Карточка не найдена: ${id}`}
          onClick={() => onCardClick(id)}
        >
          {card ? card.title : id}
        </button>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code key={index} className="inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    return <span key={index}>{token}</span>;
  });
}

export function renderMarkdown(
  text: string,
  cards: Map<string, Card>,
  onCardClick: (id: string) => void,
): ReactNode[] {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = (keyBase: string) => {
    if (para.length > 0) {
      const key = `${keyBase}-p-${out.length}`;
      out.push(
        <p key={key}>
          {para.map((line, i) => (
            <span key={`${key}-${i}`}>
              {renderInline(line, cards, onCardClick)}
              {i < para.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>,
      );
      para = [];
    }
  };

  const flushList = (keyBase: string) => {
    if (list.length > 0) {
      const key = `${keyBase}-ul-${out.length}`;
      out.push(
        <ul key={key}>
          {list.map((item, i) => (
            <li key={`${key}-${i}`}>{renderInline(item, cards, onCardClick)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara('h');
      flushList('h');
      const level = heading[1].length;
      const content = renderInline(heading[2], cards, onCardClick);
      const key = `h-${out.length}`;
      if (level === 1) {
        out.push(<h1 key={key}>{content}</h1>);
      } else if (level === 2) {
        out.push(<h2 key={key}>{content}</h2>);
      } else {
        out.push(<h3 key={key}>{content}</h3>);
      }
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      flushPara('l');
      list.push(item[1]);
      continue;
    }
    if (line.trim() === '') {
      flushPara('b');
      flushList('b');
      continue;
    }
    if (list.length > 0) {
      flushList('m');
    }
    para.push(line);
  }
  flushPara('e');
  flushList('e');
  return out;
}
