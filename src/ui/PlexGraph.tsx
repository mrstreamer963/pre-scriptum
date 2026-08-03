import { useEffect, useRef } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import type { Card, Link } from '../core/types';
import type { SoftLink } from '../core/semantics';

export interface PlexGraphProps {
  center: Card;
  neighbors: Array<{ card: Card; link: Link }>;
  soft: SoftLink[];
  onSelect: (id: string) => void;
}

const CENTER_RADIUS = 220;
const SOFT_RADIUS = 460;

function buildElements(center: Card, neighbors: Array<{ card: Card; link: Link }>, soft: SoftLink[]): {
  elements: ElementDefinition[];
  positions: Record<string, { x: number; y: number }>;
} {
  const elements: ElementDefinition[] = [];
  const positions: Record<string, { x: number; y: number }> = {};
  const present = new Set<string>([center.id]);

  positions[center.id] = { x: 0, y: 0 };

  neighbors.forEach(({ card }, index) => {
    if (present.has(card.id)) {
      return;
    }
    const angle = (2 * Math.PI * index) / Math.max(neighbors.length, 1);
    positions[card.id] = {
      x: Math.cos(angle) * CENTER_RADIUS,
      y: Math.sin(angle) * CENTER_RADIUS,
    };
    present.add(card.id);
  });

  soft.forEach((item, index) => {
    if (present.has(item.card.id)) {
      return;
    }
    const offset = (Math.PI * index) / Math.max(soft.length, 1);
    positions[item.card.id] = {
      x: Math.cos(offset) * SOFT_RADIUS,
      y: Math.sin(offset) * SOFT_RADIUS,
    };
    present.add(item.card.id);
  });

  const nodes: ElementDefinition[] = Array.from(present).map((id) => {
    const card = id === center.id ? center : (neighbors.find((n) => n.card.id === id)?.card ?? soft.find((s) => s.card.id === id)?.card);
    return {
      data: { id, title: card?.title ?? id },
      classes: id === center.id ? 'center' : '',
      position: positions[id],
    };
  });
  elements.push(...nodes);

  const edges: ElementDefinition[] = neighbors
    .filter(({ card }) => present.has(card.id))
    .map(({ link }) => ({
      data: { id: `link-${link.id}`, source: link.from, target: link.to, type: link.type },
      classes: '',
    }));
  const softEdges: ElementDefinition[] = soft
    .filter((item) => present.has(item.card.id))
    .map((item) => ({
      data: { id: `soft-${item.card.id}`, source: center.id, target: item.card.id },
      classes: 'soft',
    }));
  elements.push(...edges, ...softEdges);

  return { elements, positions };
}

export function PlexGraph({ center, neighbors, soft, onSelect }: PlexGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const cy = cytoscape({
      container,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            width: 100,
            height: 44,
            shape: 'round-rectangle',
            'background-color': '#e9edf5',
            'border-color': '#5a6b8c',
            'border-width': 1,
            label: 'data(title)',
            'text-wrap': 'wrap',
            'text-max-width': '90px',
            'font-size': 11,
            color: '#1c2333',
            'text-valign': 'center',
            'text-halign': 'center',
          },
        },
        {
          selector: 'node.center',
          style: {
            'background-color': '#1f3d7a',
            color: '#ffffff',
            'border-width': 2,
            width: 130,
            height: 56,
            'font-size': 12,
            'text-max-width': '120px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#5a6b8c',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#5a6b8c',
          },
        },
        {
          selector: 'edge[type = "parent"]',
          style: {
            'line-color': '#4a90d9',
            'target-arrow-color': '#4a90d9',
          },
        },
        {
          selector: 'edge[type = "reference"]',
          style: {
            'line-color': '#b98ad9',
            'target-arrow-color': '#b98ad9',
          },
        },
        {
          selector: 'edge.soft',
          style: {
            'line-style': 'dashed',
            'line-color': '#9aa3b5',
            'target-arrow-shape': 'none',
            width: 1,
          },
        },
      ],
      layout: { name: 'preset' },
      wheelSensitivity: 0.2,
    });
    cyRef.current = cy;
    cy.on('tap', 'node', (event) => {
      onSelect(event.target.id());
    });
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    const { elements, positions } = buildElements(center, neighbors, soft);
    cy.json({ elements });
    cy.batch(() => {
      for (const node of cy.nodes()) {
        const pos = positions[node.id()];
        if (pos) {
          node.position(pos);
        }
      }
    });
    cy.fit(undefined, 50);
  }, [center, neighbors, soft]);

  return <div ref={containerRef} className="plex-graph" />;
}
