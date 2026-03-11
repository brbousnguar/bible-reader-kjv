# Repository Guidelines

## Project Structure & Module Organization
- Frontend is plain HTML/CSS/JS at the repo root: `index.html`, `styles.css`, and modular scripts under `js/`.
- Static data lives in `books.json`, `book_meta.json`, `characters.json`, and `bibles/kjv_json/`.
- Media assets are in `videos/` and `logo.png`.
- Backend is a FastAPI app in `server/main.py` (serves static files plus API endpoints).
- Legacy servers have been removed; use `server/main.py` as the only backend.

## Architecture Overview
- Single FastAPI server serves the frontend and API under the same origin (port 3000).
- Frontend calls the API via relative paths like `/api/bible/{slug}/{chapter}`.
- AI features are handled by the FastAPI backend using separate keys: `AI_TTS_API_KEY`, `AI_COMMENTARY_API_KEY`, and `AI_BOOK_CHAT_API_KEY`.

## Build, Test, and Development Commands
- Python backend (primary):
  - `python3 -m venv server/.venv`
  - `source server/.venv/bin/activate`
  - `pip install -r server/requirements.txt`
  - `uvicorn server.main:app --reload --port 3000`
- Docker (optional): `docker compose up --build`

## Coding Style & Naming Conventions
- JavaScript and CSS are hand-written; keep functions small and readable in the `js/` modules.
- Follow existing naming patterns: `camelCase` for JS functions/variables, `kebab-case` for CSS classes.
- Keep API paths relative (e.g., `/api/bible/genesis/1`) to avoid hardcoding ports.
- No formatter/linter is configured; keep diffs tight and consistent with current style.

## Testing Guidelines
- No automated test suite is configured.
- If you add tests, place them next to the module or under a new `tests/` directory and document how to run them.

## Commit & Pull Request Guidelines
- Commit history is mostly sentence-style messages (e.g., “Add FastAPI backend…”). Conventional commits appear occasionally (`feat:`). Keep messages short and descriptive; either style is acceptable if consistent within the PR.
- PRs should include:
  - A brief summary of behavior changes
  - Links to related issues (if any)
  - Screenshots or a short video for UI changes

## Security & Configuration Tips
- Put secrets in a root `.env` file (e.g., `AI_TTS_API_KEY=...`, `AI_COMMENTARY_API_KEY=...`, `AI_BOOK_CHAT_API_KEY=...`). Do not commit `.env`.
- AI features require a valid OpenAI key and internet access.

## Agent-Specific Notes
- `CLAUDE.md` documents architecture, endpoints, and local run instructions. Keep it updated if behavior changes.
