# Bible Reader (KJV)

A Bible reading web app with a vanilla frontend and a FastAPI backend that serves scripture data, AI features, and authenticated user state.

## Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (modular scripts in `js/`)
- Backend: Python 3 + FastAPI
- ASGI server: Uvicorn
- AI SDK: OpenAI Python SDK (`openai`)
- Data storage:
  - Static JSON files for Bible text and metadata
  - SQLite for authenticated user state (`notes`, `highlights`, `recent_books`, `read_map`)
- Realtime transport: Server-Sent Events (SSE) for streaming verse commentary and book discussion chat
- Deployment option: Docker Compose

## Model Stack

The app currently uses the OpenAI SDK with separate API keys per AI feature.

| Feature | User-facing behavior | Endpoint | Model | API key |
|---|---|---|---|---|
| Read verse / Read chapter | Text-to-speech audio playback | `POST /api/tts` | `tts-1` | `AI_TTS_API_KEY` |
| Explain verse | Streaming verse explanation / commentary | `GET /api/commentary` | `gpt-4o-mini` | `AI_COMMENTARY_API_KEY` |
| Discuss the Book | Streaming book-level Q&A chat | `POST /api/book-chat` | `gpt-4o-mini` | `AI_BOOK_CHAT_API_KEY` |

### How The App Uses Different Models

- Audio generation is isolated from text generation. Verse and chapter reading call the TTS endpoint, which returns MP3 audio.
- Verse explanation is a lightweight streamed text generation flow optimized for short commentary on one verse at a time.
- Book discussion is a separate streamed text generation flow that includes selected book context, quick-review metadata, and recent chat history.
- The environment variable names are provider-neutral, so the configuration is not tightly coupled to `openai` naming even though the current implementation uses the OpenAI SDK and models.

## Libraries and Dependencies

### Backend (`server/requirements.txt`)

- `fastapi`
- `uvicorn[standard]`
- `openai`
- `python-dotenv`
- `aiofiles`
- Python stdlib used heavily: `sqlite3`, `json`, `hmac`, `hashlib`, `pathlib`, `time`

### Frontend

- No framework (no React/Vue/etc.)
- QR rendering via CDN:
  - `qrcode@1.5.4` (`https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js`)

## Techniques and Implementation Notes

- Single-origin architecture:
  - FastAPI serves both static frontend files and API routes from port `3000`
- Auth/session:
  - Signed auth cookie (`bible_auth`) using HMAC
  - Login/logout/status endpoints (`/api/auth/*`)
- Persistent per-user server state:
  - `user_state` table in SQLite
- Local-first client persistence:
  - localStorage for notes/highlights and UI state
- Streaming AI UX:
  - SSE token streaming for commentary responses
- Contextual AI chat:
  - Book-aware chat endpoint receives selected book metadata + recent chat history
- Responsive UI:
  - Mobile-first adaptations in CSS media queries

## Project Structure

```text
bible/
├── index.html
├── login.html
├── styles.css
├── js/
│   ├── app.js
│   ├── reader.js
│   ├── notes.js
│   ├── characters.js
│   ├── hero.js
│   └── bootstrap.js
├── books.json
├── book_meta.json
├── characters.json
├── bibles/kjv_json/
├── videos/
├── logo.png
├── server/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README_PY.md
├── docker-compose.yml
└── .env
```

## API Endpoints

### Authentication

- `GET /api/auth/status`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### User state

- `GET /api/user/state`
- `POST /api/user/state`

### Bible data

- `GET /api/bible/books`
- `GET /api/bible/{slug}/{chapter}`
- `GET /api/bible/search?q=<query>`

### AI

- `POST /api/tts`
- `GET /api/commentary?book=&chapter=&verse=&text=` (SSE stream)
- `POST /api/book-chat` (SSE stream)

### Networking utilities

- `GET /api/share-url`

## Environment Variables

Create a root `.env` file:

```env
AI_TTS_API_KEY=sk-...
AI_COMMENTARY_API_KEY=sk-...
AI_BOOK_CHAT_API_KEY=sk-...

# Required auth config
AUTH_SECRET=replace-with-long-random-secret
APP_LOGIN_USER=your-username
APP_LOGIN_PASSWORD_HASH=pbkdf2_sha256$<iterations>$<salt>$<hash_b64url>

# Optional
APP_DATA_DB_PATH=server/bible_app.db
SHARE_PUBLIC_HOST=
```

### Generate `APP_LOGIN_PASSWORD_HASH`

Run this once (replace password/salt values):

```bash
python3 - <<'PY'
import base64, hashlib
password = 'change-me'
salt = 'change-this-salt'
iterations = 600000
dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), iterations)
b64 = base64.urlsafe_b64encode(dk).decode().rstrip('=')
print(f'pbkdf2_sha256${iterations}${salt}${b64}')
PY
```

## Local Development

Quick start (macOS):

```bash
./start.command
```

This script creates/activates `server/.venv`, installs dependencies, checks `.env`, and starts the app on port `3000`.

Manual start:

```bash
python3 -m venv server/.venv
source server/.venv/bin/activate
pip install -r server/requirements.txt
uvicorn server.main:app --reload --port 3000
```

Open: `http://localhost:3000`

## Docker

```bash
docker compose up --build
```

If auth variables are not present in your Docker environment, the backend will fail to start.

## Cloud Deployment

- Platform: Render
- Live URL: `https://bible-yp6u.onrender.com/`

## Housekeeping (this cleanup)

Removed legacy/unused backend artifacts:

- `server/app.py` (old Flask server)
- `server/index.js` (old Node proxy)
- `server/package.json` (Node proxy deps)
- `server/README.md` (Node proxy docs)
- `server/__pycache__/` (generated cache)
