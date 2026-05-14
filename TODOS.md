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

- [ ] Backend: OpenRouter client (`pkg/openrouter/`) — POST /api/v1/ai/action
- [ ] Backend: AI actions: summarize, rephrase, expand (request body: `{action, text, model?}`)
- [ ] Backend: Rate limiting on AI endpoints (per-user, sliding window)
- [ ] Frontend: AI pill buttons in editor sidebar (call /api/v1/ai/action)
- [ ] Frontend: AI result shown inline in right sidebar (streaming or one-shot)
- [ ] Frontend: Model selector in settings (default: free tier via OpenRouter)
- [ ] MCP server (basic): list_notes, get_note, search_notes tools (read-only)

## P0 Remaining
- [ ] Rate limiting on /auth/login and /auth/register (per-IP, sliding window)

## DEFERRED

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
- 🔜 Phase 3c (~2-3 weeks): AI text features (OpenRouter) + MCP server (read-only)
- Phase 4 (~2 weeks): Note types (meeting, voice) + Voice → Note (Whisper)
- Phase 5 (~3 weeks): Semantic search (embeddings) + Chat with personal context + Weekly review
- Phase 6: Tasks entity + Integrations (Calendar, GitHub, Telegram) + Shared workspace
