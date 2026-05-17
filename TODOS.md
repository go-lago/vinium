# TODOS — Vinium
Updated: 2026-05-17

## P0: Fix Before Phase 3 (critical bugs + security) ✅

### Security
- [x] Fix OAuth redirect: access token leaks into URL → one-time code exchange pattern
- [x] Fix refresh cookie: `Secure: false` hardcoded → read from env `COOKIE_SECURE`, default true
- [x] Fix JWT_SECRET: empty string accepted → fail startup if len < 32 chars
- [x] Fix refresh token rotation: wrap read-delete-create in DB transaction (race condition)
- [x] Add http.MaxBytesReader(1MB) before JSON decode in all handlers
- [x] Fix userID(r): panic-proof — return (uuid.UUID, bool), handle false case with 401
- [ ] Add rate limiting on /auth/login and /auth/register (per-IP, sliding window)

### Data integrity bugs
- [x] Fix autosave race: `scheduleSave` reads `contentRef.current` AT FIRE TIME, not at schedule time
- [x] Fix autosave: add `titleRef` mirroring `contentRef`
- [x] Fix autosave: `saveStatus = 'error'` state when save fails; show persistent retry UI
- [x] Fix autosave: clear timers on component unmount (useEffect cleanup)
- [x] Fix note delete: check `RowsAffected == 0`, return 404 sentinel
- [x] Replace `window.confirm()` in delete handler with inline confirm UI
- [x] Fix NotesPage: add .catch() to notesApi.list(); show error state (not empty state)

## P1: Schema Changes ✅

- [x] Add `content_plain text` column (extracted plaintext for search + AI)
- [x] Add `content_version int default 1` (migration safety)
- [x] Add `type text default 'note'` (values: note | meeting | voice | digest)
- [x] Add `tags jsonb` (stored as jsonb via datatypes.JSON)
- [x] Add `metadata jsonb` (AI outputs, summaries, embedding refs)
- [x] Add `deleted_at` timestamp for soft delete (gorm.DeletedAt)
- [x] Fix FindByUserID → FindSummaryByUserID (select summary fields only, NOT content)
- [x] Add pagination to note list (page/per_page params, server-side max 100)
- [x] Add FK constraint notes(user_id) → users(id) ON DELETE CASCADE

## P2: Architecture ✅

- [x] Add note.Service layer (handler → service → repo)
- [x] Add note.Service.ExtractPlainText(lexicalJSON string) string method
- [x] Add note.Service.SearchNotes via full-text search
- [x] Add Lexical version pinning: store `lexical_version` in metadata on every save

## P3: UX ✅

- [x] Add text preview to note list cards (first 120 chars of content_plain)
- [x] Add search bar to /notes page (backend FTS via content_plain tsvector)
- [x] Add pinned notes to top of list (ЗАКРЕПЛЕНО / НЕДАВНИЕ sections)
- [x] Add Command Palette (⌘K/Ctrl+K) for quick note creation and search
- [x] Redirect / (dashboard) to /notes
- [x] Create note on first save (draft mode in NoteEditorPage, no eager API call)

## P4: Tests ✅

### Backend (unit tests, no DB required)
- [x] Concurrent refresh rotation: 20 goroutines, exactly 1 succeeds (`internal/auth/service_test.go`)
- [x] Cross-user note isolation: GetByID returns ErrNoteNotFound for wrong userID
- [x] Cross-user delete denied: Delete returns ErrNoteNotFound for wrong userID
- [x] Delete non-existent note → ErrNoteNotFound
- [x] Note list returns only owner's notes (mock repo with mixed users)
- [x] ExtractPlainText: empty, invalid JSON, single paragraph, multi-paragraph, nested nodes

### Frontend (Vitest + jsdom, `npm test` in frontend/)
- [x] formatRelative: все диапазоны (только что / минуты / часы / дни / дата)
- [x] Autosave: no timer fire after cleanup (fake timers)
- [x] Autosave: debounce — rapid changes produce exactly one save call
- [x] Autosave: save error is captured, status transitions to 'error' (not 'saved')
- [x] Autosave: pin carries latest titleRef/contentRef from refs

## P5: UI Redesign ✅

### Design system
- [x] Dark theme tokens (#0d1117, #161b22, #2B73C4) + light theme toggle
- [x] Inter Tight (headings) + Inter (body) + JetBrains Mono (mono/meta) via Google Fonts
- [x] CSS custom properties mapped to Tailwind v4 theme

### Shell
- [x] Replace wide text sidebar with 48px icon-only sidebar + tooltips
- [x] Active nav indicator: 2px blue left border
- [x] Theme toggle (dark/light) + logout in sidebar bottom
- [x] Remove top Header; add minimal status bar at bottom
- [x] Search bar inline in workspace header with ⌘K shortcut hint

### Notes view
- [x] Feed-style rows (40px height): icon + title + relative time
- [x] Hover-reveal action buttons: pin, delete (double-click confirm)
- [x] Section headers with divider lines (ЗАКРЕПЛЕНО / НЕДАВНИЕ)
- [ ] Note row: tag chips, priority dot (needs tags UI — Phase 3c)

### Editor
- [x] Split layout: ed-main (flex:1) + ed-sidebar (216px)
- [x] Breadcrumb navigation: Заметки › Note title
- [x] Doc-meta-row: creation date + type tag pill
- [x] Right sidebar panel: metadata (created/updated/pinned), AI placeholder
- [ ] AI pill inline buttons (summarize, expand, rephrase) — Phase 3c

## NEXT: Phase 3c — AI Text Features

Model: серверный ключ — `OPENROUTER_API_KEY` в .env; пользователи получают лимитированный доступ к AI.
Без BYOK. Без хранения ключей пользователей. Нет ключа в .env — фича недоступна (500 при старте).
MCP server deferred to Phase 4.

### P0 Security ✅
- [x] Rate limiting on /auth/login and /auth/register (per-IP, X-Forwarded-For + TRUST_PROXY config)
- [x] http.Server timeouts: ReadTimeout:30s WriteTimeout:35s IdleTimeout:120s
- [x] MaxBytesReader 512KB on AI action endpoint

### Backend: Config & rate limiting ✅
- [x] Config: add `OPENROUTER_API_KEY` (required, fail startup if empty)
- [x] pkg/ratelimit/ — per-user sliding window 10 req/min + daily cap 20 req/день (in-memory, sweep goroutine)

### Backend: AI actions ✅
- [x] pkg/lexical/ — extract ExtractPlainText from note.Service (breaks ai→note coupling)
- [x] pkg/openrouter/client.go — HTTP client, uses r.Context() as parent (30s timeout)
- [x] internal/ai/ — handler + service: action enum (summarize/rephrase/expand), system prompts as constants, empty plaintext → 400

### Frontend: AI panel in editor ✅
- [x] src/api/ai.ts — aiApi.action(action, content)
- [x] AIPanel component — state machine: idle → loading → success → error
  - Buttons: Сводка / Перефразировать / Расширить (vertical stack, ghost+border, font-mono 11px)
  - Section header: "AI — вся заметка"
  - Disabled when isDraft=true OR content empty
  - Loading: skeleton bars (animate-pulse, 3 lines)
  - AbortController — cancel on new action click
  - Success: result (Inter 12px, max-h-48 overflow-y-auto) + Copy button + Dismiss (×)
  - Error: differentiated (timeout / rate-limit / server)
- [x] Send contentRef.current (Lexical JSON) to backend; backend extracts plaintext

### Tests ✅
- [x] pkg/ratelimit: sliding window 10/min, daily cap 20/день, concurrency, no memory leak
- [x] internal/ai: empty content_plain → 400, invalid action → 400, r.Context() cancel propagates
- [x] Frontend: AIPanel state machine, AbortController cancel, rate-limit error message

---
Updated: 2026-05-17

## COMPLETED PHASES SUMMARY

- ✅ Phase 1: Auth (email + Google OAuth, JWT, refresh tokens)
- ✅ Phase 2: Notes CRUD + Lexical editor + autosave
- ✅ Phase 3a: P0 security + schema (content_plain, tags, soft delete, FTS)
- ✅ Phase 3b: UI redesign (dark theme, icon sidebar, feed list, split editor)
- ✅ Phase 3c: AI text actions (summarize/rephrase/expand) via OpenRouter server key
- ✅ Phase 4: Rich editor (slash commands, floating toolbar, drag & drop, markdown shortcuts)
- ✅ Phase 5: Tasks — Linear-like task manager (CRUD, status groups, detail panel, priority icons)

---

## Phase 4 — Богатый редактор ✅ (частично)

Цель: редактор уровня Notion/AnyType — блочность, slash-команды, drag & drop, контекстное меню.

### Slash-команды (/)
- [x] Плагин SlashCommandPlugin для Lexical — триггер на `/` в начале блока
- [x] Выпадающий список с поиском: Text, H1–H3, Quote, Code, Divider, • List, 1. List (9 команд)
- [x] Навигация стрелками + Enter для выбора, Escape для закрытия
- [x] Fuzzy-фильтрация по мере ввода
- [ ] Callout и Toggle в slash-меню — deferred

### Новые типы блоков
- [x] **Code block** — моноширинный, styled
- [x] **Quote** — блок цитаты с левой полосой
- [x] **Divider** — горизонтальный разделитель (`---`)
- [ ] **Callout** — блок с иконкой (info / warning / tip) — deferred
- [ ] **Toggle** — сворачиваемый блок — deferred

### Drag & drop блоков
- [x] Drag handle (⠿) появляется при наведении слева от блока
- [x] Перетаскивание блока → смена порядка в Lexical
- [x] Визуальный индикатор места вставки

### Floating toolbar (при выделении текста)
- [x] Появляется при выделении текста
- [x] Форматирование: Bold / Italic / Underline / Strike / Code (inline)
- [x] Тип блока: H1–H3 / Quote
- [x] Link — TOGGLE_LINK_COMMAND, inline URL input, detect/remove existing
- [x] AI для выделенного: Перефразировать / Расширить / Сжать (plain text → backend)
- [ ] Скопировать блок / Удалить блок — deferred

### Markdown shortcuts
- [x] `#`, `##`, `###` + пробел → H1/H2/H3
- [x] `-` + пробел → bullet list
- [x] `1.` + пробел → numbered list
- [x] ` ``` ` → code block
- [x] `>` + пробел → quote
- [x] `---` → divider
- [x] `**text**` → bold, `_text_` → italic, `~~text~~` → strikethrough, `` `code` `` → inline code

### Тесты
- [ ] SlashCommandPlugin: триггер, фильтрация, выбор блока, Escape — deferred
- [ ] Markdown shortcuts: каждый паттерн трансформируется корректно — deferred
- [ ] Floating toolbar: появляется при выделении, форматирование — deferred

---

## Phase 5 — Tasks ✅

Цель: Task как первоклассная сущность рядом с Notes.

### Backend
- [x] Модель Task: id, user_id, title, description, status (todo/in_progress/done/cancelled), priority (none/low/medium/high), due_date, note_id (nullable FK)
- [x] CRUD: GET/POST /api/v1/tasks, GET/PUT/DELETE /api/v1/tasks/:id
- [x] Фильтрация: по статусу и приоритету (query params)
- [x] note_id — связь Task ↔ Note (nullable FK с ON DELETE SET NULL)

### Frontend
- [x] /tasks — Linear-like split view: список сгруппирован по статусам слева, detail panel справа
- [x] Строка задачи: иконка статуса + приоритет (бар-иконка) + заголовок + дедлайн
- [x] Клик на иконку статуса — циклическое переключение (todo→in_progress→done→todo)
- [x] Inline создание задачи: "+ Добавить задачу" в группе "К выполнению"
- [x] Иконка Tasks в боковом меню
- [x] Detail panel: title, description (textarea), статус/приоритет (select), дедлайн (date), удаление с подтверждением
- [x] Автосохранение в detail panel (600ms debounce)
- [ ] В редакторе заметки: блок "Связанные задачи" — deferred to Phase 7
- [ ] Command Palette: создать задачу из ⌘K — deferred

### Тесты
- [x] Backend: CRUD изоляция по user_id, фильтрация, статус-переходы, due_date (8 тестов)
- [ ] Frontend: создание, смена статуса, фильтрация

---

## Phase 6 — Contexts + Projects

Цель: изолированные рабочие пространства и проекты как контейнеры.

### Contexts
- [ ] Модель Context: id, user_id, name, color, icon
- [ ] Переключатель контекстов в боковом меню (Personal / Work / …)
- [ ] Notes и Tasks принадлежат контексту (context_id FK)
- [ ] Фильтрация всего по активному контексту

### Projects
- [ ] Модель Project: id, context_id, name, description, status
- [ ] Проект содержит Notes + Tasks (project_id FK на обоих)
- [ ] /projects — список проектов в контексте
- [ ] Страница проекта: вкладки Notes / Tasks

---

## Phase 7 — Relations + Graph

Цель: граф связей между сущностями, auto-linking через AI.

### Backend
- [ ] Модель Relation: id, from_id, from_type, to_id, to_type, relation_type (related_to / part_of / blocked_by / reference_of)
- [ ] API: POST/DELETE /api/v1/relations, GET /api/v1/entities/:id/relations
- [ ] AI auto-suggest: при сохранении заметки → найти похожие заметки/задачи (FTS + embedding)

### Frontend
- [ ] Панель "Связанные" в редакторе: список связей + кнопка "Добавить связь"
- [ ] Graph View: визуализация узлов и рёбер (библиотека d3 или react-flow)
- [ ] AI-подсказки: "Эта заметка похожа на X — связать?"

---

## Phase 8 — AI Feed + Voice + Intent

Цель: проактивный AI-ассистент поверх всего контекста.

### AI Feed
- [ ] /feed — глобальная лента рекомендаций (приоритеты дня, незавершённые задачи, связи)
- [ ] AI анализирует Notes + Tasks → предлагает действия с объяснением "почему"
- [ ] Иконка Feed в боковом меню

### Voice Input
- [ ] Web Speech API (браузерный) → текст в редактор / создание заметки
- [ ] Whisper через OpenRouter как fallback (для длинных записей)

### Intent Classification
- [ ] Пользователь пишет в Command Palette: "напомни позвонить Ане завтра"
- [ ] AI классифицирует намерение → создаёт Task / Note / Reminder
- [ ] Human-in-the-loop: предлагает, пользователь подтверждает

---

## DEFERRED (без конкретного срока)

- Streaming (SSE) для AI ответов
- MCP-сервер для подключения внешних AI-клиентов
- Offline-first архитектура
- Интеграции: Google Calendar, GitHub, Telegram
- Shared workspace (командные заметки)
- Semantic search (embeddings)
