#!/bin/zsh
# Bible Reader — start server
# Double-click this file in Finder to launch the app.

# Always run from the project directory (wherever this script lives)
cd "$(dirname "$0")"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📖  Bible Reader — starting server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Create virtual environment if missing ───────────────────────────────
if [ ! -d "server/.venv" ]; then
  echo "⚙️  Creating Python virtual environment..."
  python3 -m venv server/.venv
fi

# ── 2. Activate it ────────────────────────────────────────────────────────
source server/.venv/bin/activate

# ── 3. Install / update dependencies ──────────────────────────────────────
echo "📦  Installing dependencies..."
pip install -q -r server/requirements.txt

# ── 4. Check for .env file ────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo ""
  echo "⚠️  No .env file found!"
  echo "   Create a file named .env in this folder with:"
  echo "   AI_TTS_API_KEY=sk-proj-..."
  echo "   AI_COMMENTARY_API_KEY=sk-proj-..."
  echo "   AI_BOOK_CHAT_API_KEY=sk-proj-..."
  echo ""
  echo "   AI voice and text features will not work without them."
  echo ""
fi

# ── 5. Start the server ───────────────────────────────────────────────────
PORT=3000
echo ""
echo "✅  Server starting at http://localhost:$PORT"
echo "   Press Ctrl+C to stop."
echo ""

# Open browser after a short delay
(sleep 2 && open "http://localhost:$PORT") &

uvicorn server.main:app --port $PORT
