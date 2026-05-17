# TODOS — Vinium
Updated: 2026-05-15

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

## DEFERRED

- ❌ MCP server — Phase 4 (read+write, separate Go binary, content_plain write path, BYOK token)
- ❌ Model selector UI — Phase 4 (model hardcoded per action in .env for now)
- ❌ Streaming (SSE) — Phase 4
- ❌ Selected text as AI input — Phase 4 (requires Lexical selection API)
- ❌ Phase 4: News digest — cut (use Readwise/Feedly)
- ❌ Contexts/workspaces system — Phase 6+
- ❌ Tasks as entity — Phase 5+
- ❌ Events, Reminders, Files, Contacts — Phase 6+
- ❌ Graph/Relations model + Graph View — Phase 6+
- ❌ Collections/Views/Queries — Phase 6+
- ❌ Offline-first architecture — needs explicit design

## REVISED PHASE SEQUENCE

- ✅ Phase 3a: P0 bugs + P1 schema + P2 architecture
- ✅ Phase 3b: UI Redesign (vinium-workspace-3.html → production)
- 🔜 Phase 3c (~1.5 weeks): BYOK AI text features + settings page
- Phase 4 (~3 weeks): MCP server (read+write) + Note types (meeting, voice) + Voice → Note (Whisper)
- Phase 5 (~3 weeks): Semantic search (embeddings) + Chat with personal context + Weekly review
- Phase 6: Tasks entity + Integrations (Calendar, GitHub, Telegram) + Shared workspace
