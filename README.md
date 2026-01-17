# Bible Reader (KJV) — lightweight web app

This small app provides quick access to books and chapters of the King James Version (public domain) by fetching passages from `bible-api.com`.

Quick start

1. Open the project folder and serve it with a simple static server.

Using Python (recommended):
```bash
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Or using Node (if you have http-server):
```bash
npx http-server -p 8000
```

Files
- `index.html`: Main UI
- `styles.css`: Clean, minimal styles
- `script.js`: Loads `books.json`, fetches chapters from `https://bible-api.com` (KJV) and renders verses
- `books.json`: List of books and chapter counts

Cloud TTS proxy (optional)

If you want higher-quality neural voices, you can run the optional server in `server/` which proxies to cloud TTS providers (Google/Azure). It expects API keys as environment variables — see `server/README.md` for details.

If you prefer Python instead of Node, there's a Flask-based proxy in `server/app.py`. Install its dependencies with:

```bash
cd server
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows PowerShell
pip install -r requirements.txt
```

Then set `GOOGLE_API_KEY` or `AZURE_KEY`/`AZURE_REGION` and run `python app.py`.

Notes
- The app uses the public-domain King James Version (KJV) via `https://bible-api.com`. No shipping of the full text is included.
- Search accepts references like `John 3` or `John 3:16`.
