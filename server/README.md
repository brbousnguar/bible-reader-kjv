Optional TTS proxy (Google / Azure)

This small Express app provides a `/tts` endpoint that the client can POST to with JSON:

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

Install & run

```bash
cd server
npm install
# set env vars, example (Linux/macOS)
export GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
export AZURE_KEY="YOUR_AZURE_KEY"
export AZURE_REGION="eastus"
node index.js
```

Notes
- Google: the code uses the `text:synthesize` REST API and returns MP3.
- Azure: the code uses the Speech REST endpoint; ensure you have the correct region and subscription key.
- AWS Polly: not implemented in this scaffold; recommended to use AWS SDK on server if desired.
- This server will incur cloud TTS costs when used. Keep your API keys secret.
