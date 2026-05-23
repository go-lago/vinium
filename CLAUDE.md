# Vinium — Personal AI Workspace

## Что это

Vinium — персональный AI workspace, объединяющий лучшее из **Linear** (структурность задач)
и **Inkdrop/Notion** (блочные заметки), с единым AI-слоем поверх всего контекста пользователя.

Цель — система, соединяющая **действия и знания**: заметки, задачи, события и контакты
живут в одном пространстве, AI проактивно помогает ими управлять.

Ключевые сущности: Note, Task, Event, Reminder, Contact — связаны графом отношений.
Контексты (Personal, Work, …) изолируют данные; AI может работать со всеми контекстами.

Проект строится поэтапно, каждая фаза — самостоятельная рабочая единица.

---

## Стек

### Backend
- **Go** — основной язык
- **Chi** — HTTP-роутер
- **GORM** — ORM
- **PostgreSQL** — база данных
- **JWT** — аутентификация (access token 15 мин, refresh token 7 дней)
- **Google OAuth 2.0** — вход через Google

### Frontend
- **React + Vite + TypeScript**
- **Tailwind CSS**
- **Shadcn/ui** — компоненты
- **Lexical** — Rich Text Editor (Facebook, extensible)

### AI
- **OpenRouter** — API-прокси для LLM (используется для всех AI-фич: summary, ассистент встреч, дайджест)
- Приоритет: бесплатные/дешёвые модели через OpenRouter (Mistral, Gemma, Llama и др.)
- Для локальных задач без сети — лёгкие библиотеки не требовательные к ресурсам сервера

### Структура монорепо
```
/
├── backend/        # Go приложение
├── frontend/       # React приложение
├── docker-compose.yml
└── CLAUDE.md
```

---

## Архитектура backend

### Структура пакетов
```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── auth/           # JWT, OAuth, middleware
│   ├── user/           # модель, репозиторий, хендлеры
│   ├── note/           # модель, репозиторий, хендлеры
│   └── ai/             # AI actions handler + service
├── pkg/
│   ├── database/       # инициализация GORM + PostgreSQL
│   ├── config/         # загрузка конфига из env
│   ├── ctxutil/        # userID из context
│   ├── lexical/        # ExtractPlainText из Lexical JSON
│   ├── openrouter/     # HTTP-клиент OpenRouter
│   ├── ratelimit/      # in-memory per-key rate limiter
│   └── middleware/     # logging, cors
├── migrations/         # SQL миграции
├── .env.example
└── go.mod
```

### Модели базы данных

```go
// User
type User struct {
    ID           uuid.UUID  `gorm:"type:uuid;primaryKey"`
    Email        string     `gorm:"uniqueIndex;not null"`
    Name         string
    AvatarURL    string
    PasswordHash string     // null для OAuth-пользователей
    GoogleID     string     `gorm:"uniqueIndex"`
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

// RefreshToken
type RefreshToken struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
    UserID    uuid.UUID
    Token     string    `gorm:"uniqueIndex"`
    ExpiresAt time.Time
    CreatedAt time.Time
}
```

### API эндпоинты (текущий)

```
POST   /api/v1/auth/register          # регистрация через email
POST   /api/v1/auth/login             # вход через email (rate-limited per IP)
POST   /api/v1/auth/refresh           # обновление access token
POST   /api/v1/auth/logout            # инвалидация refresh token
GET    /api/v1/auth/google            # редирект на Google OAuth
GET    /api/v1/auth/google/callback   # колбэк от Google

GET    /api/v1/me                     # данные текущего пользователя (protected)
PUT    /api/v1/me                     # обновление профиля (protected)

GET    /api/v1/notes                  # список заметок (paged, FTS search)
POST   /api/v1/notes                  # создать заметку
GET    /api/v1/notes/:id              # получить заметку
PUT    /api/v1/notes/:id              # обновить заметку
DELETE /api/v1/notes/:id              # удалить заметку

POST   /api/v1/ai/action              # AI-действие над заметкой (summarize/rephrase/expand)
```

### Auth flow

**Email/Password:**
1. `POST /register` → хэшируем пароль (bcrypt), создаём User, возвращаем токены
2. `POST /login` → проверяем пароль, создаём access + refresh токены
3. Access token (JWT, 15 мин) передаётся в `Authorization: Bearer <token>`
4. Refresh token (7 дней) хранится в httpOnly cookie
5. `POST /refresh` → проверяем refresh token в БД, выдаём новый access token

**Google OAuth:**
1. `GET /auth/google` → редирект на Google с state (CSRF-защита)
2. Google редиректит на `/auth/google/callback` с code
3. Обмениваем code на токены Google, получаем профиль
4. Ищем User по google_id или email, создаём если не существует
5. Возвращаем наши JWT токены

---

## Архитектура frontend

### Структура
```
frontend/
├── src/
│   ├── api/            # axios клиент, interceptors для refresh
│   ├── components/
│   │   ├── ui/         # shadcn компоненты
│   │   └── layout/     # Header, Sidebar, Layout
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx
│   ├── store/          # Zustand для auth state
│   ├── hooks/          # useAuth, useUser
│   └── types/          # TypeScript типы
```

### Страницы (фаза 1)

- `/login` — форма входа (email/password + кнопка Google)
- `/register` — форма регистрации
- `/` — главная страница (dashboard), доступна только авторизованным

### Auth на фронте

- Access token хранится в памяти (не localStorage)
- Refresh token в httpOnly cookie (автоматически отправляется)
- Axios interceptor: при 401 → автоматически вызывает `/refresh` → повторяет запрос
- Protected routes через `<PrivateRoute>` компонент

---

## Фазы разработки

### ✅ Фаза 1 — Фундамент (auth)
Email/Password + Google OAuth, JWT, защищённые роуты, axios auto-refresh.

### ✅ Фаза 2 — Заметки
Note CRUD, Lexical editor, автосохранение, базовый тулбар.

### ✅ Фаза 3 — Качество + AI
P0 security fixes, schema improvements, FTS-поиск, UI redesign (dark theme, icon sidebar),
AI text actions (summarize / rephrase / expand) через OpenRouter server key.

### 🔜 Фаза 4 — Богатый редактор
Slash-команды (`/`) для выбора типа блока; новые блоки: code, quote, callout, toggle, divider;
правая кнопка мыши → контекстное меню (форматирование + AI для выделенного текста);
drag handles для перестановки блоков; markdown shortcuts.

### 🔜 Фаза 5 — Tasks
Task как первоклассная сущность: статус, приоритет, дедлайн, assignee.
Linear-like список задач. Связь Note ↔ Task.

### 🔜 Фаза 6 — Contexts + Projects
Изолированные рабочие пространства (Personal / Work / …).
Project как контейнер для Notes + Tasks + Events.

### 🔜 Фаза 7 — Relations + Graph
Граф связей между сущностями (related_to / part_of / blocked_by / reference_of).
Auto-linking предложения от AI. Graph View (визуализация).

### 🔜 Фаза 8 — AI Feed + Voice
Проактивная лента рекомендаций. Голосовой ввод (Web Speech API / Whisper).
Intent classification: текст → задача/заметка/напоминание.
Smart reminders. Weekly review.

---

## Переменные окружения

```env
# backend/.env
DATABASE_URL=postgres://user:password@localhost:5432/vinium
JWT_SECRET=your-secret-key-must-be-at-least-32-characters-long
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/auth/google/callback

OPENROUTER_API_KEY=sk-or-...          # обязателен, без него сервер не стартует
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
TRUST_PROXY=false

FRONTEND_URL=http://localhost:5173
PORT=8080
COOKIE_SECURE=false
```

---

## Правила разработки

### Go
- Ошибки возвращаются явно, не используй panic в бизнес-логике
- Хендлеры тонкие — бизнес-логика в сервисах
- Используй интерфейсы для репозиториев (упрощает тесты)
- Все UUID генерируются на бэкенде
- Пароли только через bcrypt, никогда не логируй их
- Структура вызовов: handler → service → repository

### Frontend
- Компоненты пишутся на TypeScript строго (no `any`)
- Все API-вызовы только через `/src/api/` — не fetch напрямую в компонентах
- Access token не хранить в localStorage/sessionStorage
- Shadcn компоненты не модифицировать напрямую — оборачивать
- Lexical: кастомные ноды и плагины — в `src/editor/`, не встраивать логику редактора в страницы

### AI (OpenRouter)
- Все вызовы к OpenRouter — только через backend (`/api/v1/ai/...`), ключ не светить на фронте
- Выбор модели: дефолт — бесплатная/дешёвая (Mistral, Gemma, Llama), переопределяемая через конфиг
- Таймаут на AI-запросы: 30 сек, при превышении — graceful ошибка пользователю

### Git
- Ветки: `feat/название`, `fix/название`
- Коммиты: `feat: добавить auth middleware`, `fix: исправить refresh token race condition`
- Каждая фаза завершается тегом: `v1.0`, `v2.0` и т.д.

---

## Запуск локально

```bash
# База данных
docker compose up -d postgres

# Backend
cd backend
cp .env.example .env
# Заполни .env своими значениями
go run cmd/server/main.go

# Frontend
cd frontend
npm install
npm run dev
```

---

## Ориентиры и вдохновение

- **Linear** — простота, скорость, Self-Driving SaaS подход
- **Notion** — гибкость структуры контента
- **Obsidian** — локальная база знаний, связи между заметками
- **Anytype** — открытость и MCP-интеграция

Отличие Vinium: hosted AI-слой поверх персонального контекста + открытый API с первого дня.

## Deploy Configuration (configured by /setup-deploy)
- Platform: Railway (backend) + Vercel (frontend)
- Production URL backend: https://vinium-backend.up.railway.app (update after first deploy)
- Production URL frontend: https://vinium.vercel.app (update after first deploy)
- Deploy workflow: auto-deploy on push to main
- Deploy status command: HTTP health check at /health
- Merge method: merge
- Project type: web app (monorepo: Go API + React SPA)
- Post-deploy health check: https://vinium-backend.up.railway.app/health

### Custom deploy hooks
- Pre-merge: none
- Deploy trigger: automatic on push to main (Railway watches backend/, Vercel watches frontend/)
- Deploy status: poll /health on Railway backend
- Health check: https://vinium-backend.up.railway.app/health

### Railway environment variables (set in Railway dashboard)
```
DATABASE_URL=<Railway PostgreSQL plugin URL>
JWT_SECRET=<random 32+ chars>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
FRONTEND_URL=https://vinium.vercel.app
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
GOOGLE_REDIRECT_URL=https://vinium-backend.up.railway.app/api/v1/auth/google/callback
TRUST_PROXY=true
COOKIE_SECURE=true
PORT=8080
```

### Vercel environment variables (set in Vercel dashboard)
```
VITE_API_BASE_URL=https://vinium-backend.up.railway.app
```

### Railway service setup (one-time, via dashboard)
1. Create new project → Deploy from GitHub repo
2. Add service → select this repo → set Root Directory = `backend/`
3. Add PostgreSQL plugin → Railway auto-sets DATABASE_URL
4. Set all env vars above

### Vercel setup (one-time, via dashboard)
1. Import GitHub repo → set Root Directory = `frontend/`
2. Framework: Vite (auto-detected)
3. Set VITE_API_BASE_URL env var

---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore