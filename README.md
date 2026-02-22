# Bible Reader — KJV

A feature-rich King James Version Bible reader with AI-powered voice reading and verse commentary.

## Features

- Browse all 66 books and their chapters
- Full-text verse search
- **AI voice reading** — per-verse and full-chapter playback via OpenAI TTS
- **AI commentary** — GPT-4o-mini explains any verse on demand (streamed)
- Notes & highlights saved to `localStorage`
- 66+ biblical characters with images and cross-references
- Hero video background, sepia/paper theme, responsive layout

## Quick Start

### 1. Add your OpenAI key

Create a `.env` file in the project root:

```
OPENAI_API_KEY=sk-proj-...
```

### 2. Install dependencies

From the project root, activate (or create) a virtual environment:

```bash
python3 -m venv server/.venv
source server/.venv/bin/activate      # macOS/Linux
# server\.venv\Scripts\Activate.ps1  # Windows PowerShell

pip install -r server/requirements.txt
```

### 3. Run the server

```bash
uvicorn server.main:app --reload --port 3000
```

Open **http://localhost:3000** in your browser.

---

## Docker

```bash
# .env is picked up automatically by Docker Compose
docker compose up --build
```

Open **http://localhost:3000**.

---

## Project Structure

```
bible/
├── index.html          # App shell
├── js/
│   ├── app.js          # App state, bootstrap helpers, book loading
│   ├── reader.js       # Reader/search/TTS/commentary/chapter playback
│   ├── notes.js        # Notes/highlights pages and persistence
│   ├── characters.js   # Characters page logic
│   ├── hero.js         # Hero video interactions
│   └── bootstrap.js    # App initialization after script load
├── styles.css          # Sepia/paper theme
├── books.json          # 66-book metadata (testament / category)
├── book_meta.json      # Curated reviews for major books
├── characters.json     # 66+ biblical characters
├── bibles/
│   └── kjv_json/       # Local KJV text (index.json + per-book files)
├── videos/
│   └── bible_scenes_1080p.mp4
├── server/
│   ├── main.py         # FastAPI backend (Bible API + TTS + commentary)
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── .env                # Your secrets (git-ignored)
```

## API Endpoints

All served by `server/main.py` on port 3000:

| Endpoint | Description |
|---|---|
| `GET /api/bible/books` | Book list from local KJV index |
| `GET /api/bible/{slug}/{chapter}` | Chapter verses (e.g. `/api/bible/genesis/1`) |
| `GET /api/bible/search?q=faith` | Full-text verse search (up to 200 results) |
| `POST /api/tts` | OpenAI TTS — returns MP3 audio |
| `GET /api/commentary?book=&chapter=&verse=&text=` | SSE-streamed GPT-4o-mini commentary |
| `GET /` | Serves `index.html` and all static assets |

### TTS request body

```json
{ "text": "In the beginning God created...", "voice": "onyx", "speed": 1.0 }
```

Available voices: `alloy`, `echo`, `fable`, `onyx` (default), `nova`, `shimmer`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required — OpenAI TTS + GPT-4o-mini commentary |

Put it in `.env` at the project root (auto-loaded by the backend and by Docker Compose).

## Notes

- Bible text is the public-domain King James Version, stored locally in `bibles/kjv_json/`.
- Search is done client-side, fetching chapters from the local backend.
- AI features require an active internet connection and a valid OpenAI key.
- `server/app.py` (old Flask backend) is no longer used and can be deleted.
