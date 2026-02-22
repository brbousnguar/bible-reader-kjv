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

`OPENAI_API_KEY` is read from `.env` at the project root (auto-loaded by both uvicorn and Docker Compose).

No build step, test suite, or linter is configured.

## Architecture

Single FastAPI server on port 3000 that:
1. Serves all static files (`index.html`, `styles.css`, `js/*.js`, etc.) via `StaticFiles` mount
2. Provides Bible data from local KJV JSON files
3. Proxies OpenAI TTS requests
4. Streams GPT-4o-mini commentary via SSE

Frontend is split across plain scripts loaded in order:
- `js/app.js` (shared state, app setup, books/recent, shared helpers)
- `js/reader.js` (chapter fetch/render, search, TTS, commentary, playback)
- `js/notes.js` (notes/highlights modal and notes page)
- `js/characters.js` (characters filtering/detail views)
- `js/hero.js` (hero controls)
- `js/bootstrap.js` (runs `initializeApp()`)

### Backend API endpoints (`server/main.py`)

| Endpoint | Description |
|---|---|
| `GET /api/bible/books` | Book list from `bibles/kjv_json/index.json` |
| `GET /api/bible/{slug}/{chapter}` | Chapter verses |
| `GET /api/bible/search?q=` | Full-text verse search (max 200 results) |
| `POST /api/tts` | OpenAI TTS — body: `{text, voice, speed}`, returns MP3 |
| `GET /api/commentary?book=&chapter=&verse=&text=` | SSE-streamed GPT-4o-mini commentary |
| `GET /` (catch-all) | Static file serving |

All frontend API calls use **relative paths** (e.g. `/api/bible/genesis/1`) — no hardcoded ports.

### Static data files

- `books.json` — 66-book metadata, organized by testament/category
- `book_meta.json` — Curated reviews for 8 major books
- `characters.json` — 66+ biblical characters with facts and appearances
- `bibles/kjv_json/` — Local KJV text (index.json + per-book JSON files)

### Key frontend areas

- `js/app.js`: `getApiUrl(book, chapter)`, `loadBooks()`, `renderBooks()`, `initializeApp()`
- `js/reader.js`: `displayVerses(data)`, `speakVerse(...)`, `speakVerseAndWait(...)`, `readNextInChapter()`, `explainVerse(...)`
- `js/notes.js`: notes/highlights CRUD persisted in `localStorage`
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

## Environment Variables

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI TTS (`tts-1`) and commentary (`gpt-4o-mini`) |

Put it in `.env` at the project root — loaded automatically by `python-dotenv` and Docker Compose.

## Obsolete Files

- `server/app.py` — old Flask backend, no longer used
- `server/index.js` — old Node.js TTS proxy, no longer used
