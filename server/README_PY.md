Python TTS proxy (Flask)

This optional Flask app provides a `/tts` endpoint the client can POST to with JSON:

{
  "text": "Text to synthesize",
  "provider": "google" | "azure",
  "voice": "voiceName",
  "rate": 0.95,
  "pitch": 1.0
}

It supports:
- Google Cloud Text-to-Speech (REST API): set `GOOGLE_API_KEY` environment variable.
- Azure Cognitive Services Speech Synthesis (REST): set `AZURE_KEY` and `AZURE_REGION` environment variables.

Install & run (Python 3.8+ recommended):

```bash
cd server
python -m venv .venv
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Set env vars and run (PowerShell example):
$env:GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'
python app.py
```

By default the server listens on port 3000. If you serve the web UI on a different origin, enable CORS or proxy requests to `/tts`.

Notes
- Google: uses `text:synthesize` REST API returning base64 MP3.
- Azure: uses the Speech REST endpoint with SSML; ensure region + key are correct.
- This server will incur cloud TTS costs when used; keep API keys secret.
