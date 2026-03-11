# FastAPI Backend — `server/main.py`

Single Python server that handles **Bible data**, **OpenAI TTS**, and **AI commentary**, and also serves all static frontend files.

## Setup

From the **project root**:

```bash
python3 -m venv server/.venv
source server/.venv/bin/activate        # macOS/Linux
# server\.venv\Scripts\Activate.ps1   # Windows PowerShell

pip install -r server/requirements.txt
```

Create a `.env` file in the project root:

```
AI_TTS_API_KEY=sk-proj-...
AI_COMMENTARY_API_KEY=sk-proj-...
AI_BOOK_CHAT_API_KEY=sk-proj-...
```

## Run

```bash
uvicorn server.main:app --reload --port 3000
```

Open **http://localhost:3000**.

## API

### Bible

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/bible/books` | All 66 books from `bibles/kjv_json/index.json` |
| `GET` | `/api/bible/{slug}/{chapter}` | Chapter verses (slug = lowercase book name, e.g. `genesis`, `1-samuel`) |
| `GET` | `/api/bible/search?q=<query>` | Full-text search across all verses (max 200 results) |

### TTS

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tts` | Synthesize speech with OpenAI `tts-1` model |

Request body:
```json
{
  "text": "verse text here",
  "voice": "onyx",
  "speed": 1.0
}
```
Returns: `audio/mpeg` (MP3).

Available voices: `alloy` · `echo` · `fable` · `onyx` · `nova` · `shimmer`

### Commentary (SSE)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/commentary` | Streams GPT-4o-mini commentary as Server-Sent Events |

Query params: `book`, `chapter`, `verse`, `text`

The stream sends text tokens as `data: <token>` events, ending with `data: [DONE]`. Errors are sent as `data: [ERROR] <message>` followed by `data: [DONE]`.

### Book Chat (SSE)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/book-chat` | Streams GPT-4o-mini discussion for the selected book as Server-Sent Events |

Request body:
```json
{
  "book": "Revelation",
  "user_message": "What are the main themes in this book?",
  "chapter_count": 22,
  "quick_review": {
    "author": "John of Patmos"
  },
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Each SSE event is JSON in the `data:` field, for example `{"delta":"text chunk"}`. The stream ends with `data: [DONE]`. Errors are sent as `{"error":"message"}` before `[DONE]`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AI_TTS_API_KEY` | Yes | Used only for TTS (`POST /api/tts`) |
| `AI_COMMENTARY_API_KEY` | Yes | Used only for verse commentary (`GET /api/commentary`) |
| `AI_BOOK_CHAT_API_KEY` | Yes | Used only for book discussion chat (`POST /api/book-chat`) |

The server loads `.env` from the working directory via `python-dotenv`.

## Dependencies

```
fastapi
uvicorn[standard]
openai
python-dotenv
aiofiles
```

## Bible Data Paths

The server tries Docker paths first, then falls back to local dev paths:

| Resource | Docker | Local dev |
|---|---|---|
| KJV JSON | `/app/bibles/kjv_json` | `../bibles/kjv_json` |
| Static files | `/app/static` | project root (`../`) |
