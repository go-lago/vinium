# Vinium — Personal AI Workspace

## Что это

Vinium — персональное веб-приложение для работы со знаниями и заметками, усиленное AI.
Основная идея: не ещё один таск-менеджер, а умный workspace который накапливает твой
личный контекст и помогает им управлять — через голосовые заметки, ассистента встреч,
дайджест новостей и открытый API для внешних агентов.

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
│   ├── note/           # модель, репозиторий, хендлеры (фаза 2)
│   └── digest/         # дайджест новостей (фаза 3)
├── pkg/
│   ├── database/       # инициализация GORM + PostgreSQL
│   ├── config/         # загрузка конфига из env
│   └── middleware/     # logging, cors, auth middleware
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

### API эндпоинты (фаза 1)

```
POST   /api/v1/auth/register          # регистрация через email
POST   /api/v1/auth/login             # вход через email
POST   /api/v1/auth/refresh           # обновление access token
POST   /api/v1/auth/logout            # инвалидация refresh token
GET    /api/v1/auth/google            # редирект на Google OAuth
GET    /api/v1/auth/google/callback   # колбэк от Google

GET    /api/v1/me                     # данные текущего пользователя (protected)
PUT    /api/v1/me                     # обновление профиля (protected)
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

### ✅ Фаза 1 — Фундамент
Цель: рабочее веб-приложение с аутентификацией.

- [x] Инициализация проекта (backend + frontend)
- [x] Docker Compose (PostgreSQL)
- [x] Конфиг и подключение к БД
- [x] User модель + миграция
- [x] Email/Password auth (register, login, logout, refresh)
- [x] Google OAuth
- [x] Auth middleware (проверка JWT)
- [x] Эндпоинт `/me`
- [x] React приложение с роутингом
- [x] Страницы Login / Register
- [x] Dashboard для авторизованных пользователей
- [x] Axios клиент с auto-refresh

### 🔜 Фаза 2 — Заметки
- Note модель + CRUD API (backend)
- Rich Text редактор на базе **Lexical** (frontend)
- `/notes` — отдельная страница со списком всех заметок (поиск, сортировка)
- `/notes/:id` — страница редактирования заметки
- Автосохранение (debounce 1–2 сек)

### 🔜 Фаза 3 — AI-фичи для заметок
- Голос → заметка (Web Speech API / Whisper через OpenRouter)
- Ассистент встречи: транскрипт → summary + задачи (OpenRouter LLM)
- AI-улучшение текста: rephrase, summarize, expand (OpenRouter)

### 🔜 Фаза 4 — Дайджест новостей
- Настройка тем и источников (RSS, GitHub releases, Hacker News)
- Фоновый воркер (cron) для сбора контента
- OpenRouter LLM для фильтрации и резюмирования
- Ежедневный дайджест как заметка в workspace

### 🔜 Фаза 5 — AI поверх данных
- Семантический поиск по заметкам (embeddings, лёгкая локальная модель)
- Chat с контекстом пользователя (OpenRouter)
- Проактивные подсказки и связи между заметками
- Weekly review — автоматическое summary недели (OpenRouter)

### 🔜 Фаза 6 — Открытая платформа
- Public API (REST)
- MCP-сервер — подключение к Claude, Cursor и другим AI-клиентам
- Интеграции: Google Calendar, GitHub, Telegram
- Shared workspace (командные заметки)

---

## Переменные окружения

```env
# backend/.env
DATABASE_URL=postgres://user:password@localhost:5432/vinium
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/auth/google/callback

OPENROUTER_API_KEY=        # для AI-фич (фаза 3+)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

FRONTEND_URL=http://localhost:5173
PORT=8080
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