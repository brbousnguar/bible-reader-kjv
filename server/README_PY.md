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
OPENAI_API_KEY=sk-proj-...
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

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Used for TTS and commentary |

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
