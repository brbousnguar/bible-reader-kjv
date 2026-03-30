# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A KJV Bible reader web application — vanilla HTML/CSS/JS frontend served by a **Python FastAPI** backend that also provides Bible data, OpenAI TTS, and AI verse commentary.

## Running the App

### FastAPI backend (required for all features)

From the project root:

```bash
source server/.venv/bin/activate   # or server\.venv\Scripts\Activate.ps1 on Windows
pip install -r server/requirements.txt   # first time only
uvicorn server.main:app --reload --port 3000
```

Open **http://localhost:3000**.

### With Docker

```bash
docker compose up --build
# App: http://localhost:3000
```

All env vars are read from `.env` at the project root (auto-loaded by both uvicorn and Docker Compose).

No build step, test suite, or linter is configured.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | **Yes** | HMAC secret for signing auth tokens (app won't start without it) |
| `APP_LOGIN_USER` | **Yes** | Login username (app won't start without it) |
| `APP_LOGIN_PASSWORD_HASH` | **Yes** | Password hash in format `pbkdf2_sha256$<iters>$<salt>$<hash_b64url>` |
| `AI_TTS_API_KEY` | No | OpenAI TTS (`tts-1`) |
| `AI_COMMENTARY_API_KEY` | No | OpenAI verse commentary (`gpt-4o-mini`) |
| `AI_BOOK_CHAT_API_KEY` | No | OpenAI book discussion chat (`gpt-4o-mini`) |
| `APP_DATA_DB_PATH` | No | SQLite DB path (defaults to `/var/data/bible_app.db` or `server/bible_app.db`) |
| `SHARE_PUBLIC_HOST` | No | Override LAN IP for the share-URL feature |

## Architecture

Single FastAPI server on port 3000 that:
1. Serves all static files (`index.html`, `styles.css`, `js/*.js`, etc.) via catch-all route
2. Provides Bible data from local KJV JSON files
3. Proxies OpenAI TTS requests (auth required)
4. Streams GPT-4o-mini commentary and book discussion chat via SSE (auth required)
5. Persists user state (notes, highlights, read map) in SQLite

Frontend is split across plain scripts loaded in order:
- `js/app.js` (shared state, app setup, books/recent, shared helpers)
- `js/reader.js` (chapter fetch/render, search, TTS, commentary, playback)
- `js/notes.js` (notes/highlights modal and notes page)
- `js/characters.js` (characters filtering/detail views)
- `js/hero.js` (hero controls)
- `js/bootstrap.js` (runs `initializeApp()`)

### Backend API endpoints (`server/main.py`)

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/auth/login` | — | Cookie-based login; body: `{username, password}` |
| `POST /api/auth/logout` | — | Clears auth cookie |
| `GET /api/auth/status` | — | Returns `{authenticated, username}` |
| `GET /api/user/state` | Yes | Load notes/highlights/recent_books/read_map from SQLite |
| `POST /api/user/state` | Yes | Save user state to SQLite |
| `GET /api/bible/books` | — | Book list from `bibles/kjv_json/index.json` |
| `GET /api/bible/{slug}/{chapter}` | — | Chapter verses |
| `GET /api/bible/search?q=` | — | Full-text verse search (max 200 results) |
| `POST /api/tts` | Yes | OpenAI TTS — body: `{text, voice, speed}`, returns MP3 |
| `GET /api/commentary?book=&chapter=&verse=&text=` | Yes | SSE-streamed GPT-4o-mini commentary |
| `POST /api/book-chat` | Yes | SSE-streamed chat — body: `{book, user_message, chapter_count, quick_review, history}` |
| `GET /api/share-url` | — | Returns LAN base URL for sharing |
| `GET /{path}` (catch-all) | — | Static file serving, falls back to `index.html` |

All frontend API calls use **relative paths** (e.g. `/api/bible/genesis/1`) — no hardcoded ports.

### Authentication

Cookie-based HMAC-SHA256 tokens (`bible_auth` cookie), 30-day expiry. All AI/TTS endpoints and user state endpoints require auth. The `require_auth()` function in `server/main.py` handles validation and raises HTTP 401 on failure.

### User State Persistence

SQLite at `APP_DATA_DB_PATH`. Table `user_state` stores notes, highlights, recent_books (capped at 6), and read_map per username as JSON columns. Previously these were localStorage-only.

### Static data files

- `books.json` — 66-book metadata, organized by testament/category
- `book_meta.json` — Curated reviews for 8 major books
- `characters.json` — 66+ biblical characters with facts and appearances
- `bibles/kjv_json/` — Local KJV text (index.json + per-book JSON files)

### Key frontend areas

- `js/app.js`: `getApiUrl(book, chapter)`, `loadBooks()`, `renderBooks()`, `initializeApp()`
- `js/reader.js`: `displayVerses(data)`, `speakVerse(...)`, `speakVerseAndWait(...)`, `readNextInChapter()`, `explainVerse(...)`
- `js/notes.js`: notes/highlights CRUD — syncs with `/api/user/state` when authenticated, falls back to `localStorage`
- `js/characters.js`: character list/filter/detail rendering

### Settings panel (`index.html`)

- `#aiVoiceSelect` — 6 OpenAI voices (alloy, echo, fable, onyx, nova, shimmer)
- `#rateRange` — speed slider (0.5–2.0), stored as `bible_ai_speed` in localStorage
- Selected voice stored as `bible_ai_voice` in localStorage

### Styling conventions

- CSS custom properties for all theming (sepia/warm brown palette)
- `clamp()` for responsive typography
- Backdrop blur for overlay panels
- Hero section uses `videos/bible_scenes_1080p.mp4` (35 MB, committed to repo)
- Commentary panel: `.verse-commentary`, `.explain-btn`, `.commentary-text`

## Removed Legacy Files

- `server/app.py` — removed (old Flask backend)
- `server/index.js` — removed (old Node.js proxy)
- `server/package.json` — removed (legacy Node deps)
