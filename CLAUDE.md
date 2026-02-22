# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A KJV Bible reader web application — vanilla HTML/CSS/JS frontend with an optional Python Flask (or Node.js Express) backend for local data serving and Text-to-Speech proxy.

## Running the App

### Static frontend only (no backend required)
```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

### Full stack with Docker
```bash
docker-compose up
# Frontend: http://localhost:8000
# Backend API: http://localhost:3000
```

### Python Flask backend (local Bible data + TTS proxy)
```bash
cd server
source .venv/bin/activate   # or .\.venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
export GOOGLE_API_KEY="..."   # optional, for TTS
export AZURE_KEY="..."        # optional, for TTS
export AZURE_REGION="eastus"  # optional, for TTS
python app.py                 # serves on http://localhost:3000
```

### Node.js Express backend (alternative TTS proxy only)
```bash
cd server
npm install
node index.js
```

No build step, test suite, or linter is configured.

## Architecture

The app is a client-side SPA. `script.js` drives all logic; `index.html` is the shell; `styles.css` provides the sepia/paper theme.

### Data sources
- **Remote (default):** Public `bible-api.com` REST API
- **Local (optional):** Python Flask backend reading from `bibles/kjv_json/` indexed JSON files

The frontend auto-detects or lets the user toggle between remote and local. When local is enabled, it hits `localhost:3000/api/local/<slug>/<chapter>`.

### Backend API endpoints (`server/app.py`)
| Endpoint | Description |
|---|---|
| `GET /api/local/books` | Book list with metadata |
| `GET /api/local/<slug>/<chapter>` | Fetch chapter verses |
| `GET /api/local/search?q=<query>` | Full-scan verse search |
| `POST /tts` | TTS proxy (Google Cloud or Azure Cognitive Services) |

### Static data files
- `books.json` — 66-book metadata, organized by testament/category
- `book_meta.json` — Curated reviews for 8 major books
- `characters.json` — 66+ biblical characters with facts and appearances

### Key areas in `script.js`
- Bible fetch logic (remote vs. local switching)
- Notes & highlights system (persisted to `localStorage`)
- TTS synthesis (Google/Azure provider selection)
- Character filtering and rendering

### Styling conventions
- CSS custom properties for all theming (sepia/warm brown palette)
- `clamp()` for responsive typography
- Backdrop blur for overlay panels
- Hero section uses `videos/bible_scenes_1080p.mp4` (35 MB, committed to repo)

## Environment Variables (backend)

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Google Cloud TTS |
| `AZURE_KEY` | Azure Cognitive Services TTS |
| `AZURE_REGION` | Azure region (e.g. `eastus`) |
