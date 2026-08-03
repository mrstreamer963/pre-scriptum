# pre-scriptum — AGENTS.md

## Обязательные правила

- **«Запомни» = запись в файл.** Когда пользователь говорит «запомни» — сохранить информацию на диск (например, в `MEMORY.md` или другой файл заметок). Не просто подтверждать словами.
- **Git: сначала читать `GIT_NOTES.md`.** Все git-команды вызывать с `--no-pager` (избегать зависания в less).

## Репозиторий

- **Спека-драйвен проект.** Вся функциональная работа ведётся через OpenSpec: изменения лежат в `openspec/changes/`, main-спеки — в `openspec/specs/`.
- **Кода пока нет.** Репозиторий пустой (только конфиги и один change). Единственный активный change — `thought-graph` (см. `openspec/changes/thought-graph/`).
- **Язык артефактов — русский.** Все proposal/design/specs/tasks и заметки писать по-русски в соответствии с существующими.
- **Ветка работы — `dev`** (main — релизная).

## OpenSpec workflow

- CLI `openspec` (v1.7.0) установлен; store локальный, команды работают на ближайшем `openspec/` корне.
- Цикл: **propose → apply → sync → archive**. В OpenCode доступны команды `/opsx-*` (или одноимённые skills).
- Перед apply обязательно выполнить:
  - `openspec status --change <name> --json` — понять схему, контекст, прогресс;
  - `openspec instructions apply --change <name> --json` — получить context files (proposal, design, specs, tasks), которые нужно прочитать перед реализацией.
- Чекбоксы в `tasks.md` отмечать (`- [ ]` → `- [x]`) сразу после завершения каждой задачи. При неясностях/блокерах — пауза и уточнение, не угадывать.
- Проверка артефактов: `openspec validate`.

## Планируемый стек (из change `thought-graph`)

- TypeScript SPA (Vite + React), тесты vitest.
- Гексагональная архитектура: `core/` (чистый домен + порты Storage/Embedding/Search), `adapters/` (IndexedDB, transformers.js), `ui/` (2D-граф, cytoscape.js).
- Core должен быть переносимым на Node.js (файлы + SQLite) без переписывания домена — без импортов окружения в `core/`.
- Всё работает локально/оффлайн, без сервера.
