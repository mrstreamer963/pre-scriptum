import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN_IMPORTS = ['idb', '@huggingface/transformers', 'cytoscape', 'react', 'vite', 'node:'];

describe('переносимость core (7.3)', () => {
  const dir = join(process.cwd(), 'src', 'core');
  const files = readdirSync(dir).filter((file) => file.endsWith('.ts'));

  it('не импортирует модули окружения', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(join(dir, file), 'utf8');
      for (const moduleName of FORBIDDEN_IMPORTS) {
        const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(source, `${file} не должен импортировать ${moduleName}`).not.toMatch(
          new RegExp(`from ['"]${escaped}`, 'i'),
        );
      }
    }
  });

  it('не использует глобальные объекты окружения браузера', () => {
    for (const file of files) {
      const source = readFileSync(join(dir, file), 'utf8');
      expect(source, `${file} не должен использовать indexedDB`).not.toMatch(/indexedDB/i);
      expect(source, `${file} не должен использовать window`).not.toMatch(/window\./i);
      expect(source, `${file} не должен использовать document.`).not.toMatch(/document\./i);
    }
  });
});
