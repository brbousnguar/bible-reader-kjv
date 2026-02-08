from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os, base64, requests, io
import json
from pathlib import Path

app = Flask(__name__)
CORS(app)

# --- Local KJV JSON backend support ---
_kjv_index = None
# Try Docker path first (/app/bibles), then fall back to local dev path (../bibles)
_kjv_base_docker = Path('/app/bibles/kjv_json')
_kjv_base_local = Path(__file__).resolve().parent.parent / 'bibles' / 'kjv_json'
_kjv_base = _kjv_base_docker if _kjv_base_docker.exists() else _kjv_base_local

def load_kjv_index():
    global _kjv_index
    if _kjv_index is not None:
        return _kjv_index
    idx_path = _kjv_base / 'index.json'
    if not idx_path.exists():
        _kjv_index = None
        return None
    with open(idx_path, 'r', encoding='utf-8') as f:
        _kjv_index = json.load(f)
    return _kjv_index

def get_book_entry_by_slug(slug):
    idx = load_kjv_index()
    if not idx: return None
    for b in idx.get('books', []):
        if b.get('slug') == slug or b.get('book').lower() == slug.lower():
            return b
    return None

def read_book_file(book_entry):
    if not book_entry: return None
    fp = _kjv_base / book_entry.get('file')
    if not fp.exists(): return None
    with open(fp, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/api/local/versions', methods=['GET'])
def api_local_versions():
    idx = load_kjv_index()
    if not idx:
        return jsonify({'error': 'local kjv data not available'}), 500
    return jsonify({'version': idx.get('version', 'KJV'), 'source': idx.get('source', {})})

@app.route('/api/local/books', methods=['GET'])
def api_local_books():
    idx = load_kjv_index()
    if not idx:
        return jsonify({'error': 'local kjv data not available'}), 500
    return jsonify({'books': idx.get('books', [])})

@app.route('/api/local/<string:slug>/<int:chapter>', methods=['GET'])
def api_local_chapter(slug, chapter):
    book = get_book_entry_by_slug(slug)
    if not book:
        return jsonify({'error': 'book not found'}), 404
    data = read_book_file(book)
    if not data:
        return jsonify({'error': 'book file missing'}), 500
    # JSON structure: chapters: [ { chapter: n, verses: [ {verse, text}, ... ] }, ... ]
    for ch in data.get('chapters', []):
        if int(ch.get('chapter')) == int(chapter):
            return jsonify({
                'reference': f"{data.get('book')} {chapter}",
                'book_name': data.get('book'),
                'chapter': chapter,
                'verses': ch.get('verses', [])
            })
    return jsonify({'error': 'chapter not found'}), 404

@app.route('/api/local/search', methods=['GET'])
def api_local_search():
    q = request.args.get('q','').strip().lower()
    if not q:
        return jsonify({'results': []})
    idx = load_kjv_index()
    if not idx:
        return jsonify({'results': []})
    results = []
    # naive search: scan all books/chapters for matches (not optimized)
    for b in idx.get('books', []):
        data = read_book_file(b)
        if not data: continue
        for ch in data.get('chapters', []):
            for v in ch.get('verses', []):
                if q in (v.get('text','').lower()):
                    results.append({'book': data.get('book'), 'chapter': ch.get('chapter'), 'verse': v.get('verse'), 'text': v.get('text')})
                    if len(results) >= 200: break
            if len(results) >= 200: break
        if len(results) >= 200: break
    return jsonify({'results': results})

def escape_xml(unsafe):
    return (unsafe.replace('&', '&amp;')
                  .replace('<', '&lt;')
                  .replace('>', '&gt;')
                  .replace('"', '&quot;')
                  .replace("'", '&apos;'))

@app.route('/tts', methods=['POST'])
def tts():
    body = request.get_json() or {}
    text = body.get('text')
    provider = body.get('provider')
    voice = body.get('voice')
    rate = float(body.get('rate', 1.0))
    pitch = float(body.get('pitch', 1.0))

    if not text or not provider:
        return jsonify({'error':'missing text or provider'}), 400

    try:
        if provider == 'google':
            api_key = os.environ.get('GOOGLE_API_KEY')
            if not api_key:
                return jsonify({'error':'Google API key not configured (GOOGLE_API_KEY)'}), 500
            req = {
                'input': {'text': text},
                'voice': {'languageCode': 'en-US', 'name': voice or 'en-US-Wavenet-D'},
                'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': rate, 'pitch': (pitch-1.0)*2}
            }
            r = requests.post(f'https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}', json=req)
            j = r.json()
            if not j or 'audioContent' not in j:
                return jsonify({'error':'google tts failed', 'detail': j}), 500
            audio = base64.b64decode(j['audioContent'])
            return send_file(io.BytesIO(audio), mimetype='audio/mpeg')

        elif provider == 'azure':
            key = os.environ.get('AZURE_KEY')
            region = os.environ.get('AZURE_REGION')
            if not key or not region:
                return jsonify({'error':'Azure credentials not configured (AZURE_KEY + AZURE_REGION)'}), 500
            ssml = """<?xml version='1.0' encoding='utf-8'?><speak version='1.0' xml:lang='en-US'><voice name='{}'><prosody rate='{}%'>{}</prosody></voice></speak>""".format(
                voice or 'en-US-GuyNeural', int((rate-1.0)*50), escape_xml(text)
            )
            headers = {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            }
            r = requests.post(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', headers=headers, data=ssml)
            if not r.ok:
                return jsonify({'error':'azure tts failed', 'status': r.status_code, 'text': r.text}), 500
            return send_file(io.BytesIO(r.content), mimetype='audio/mpeg')

        else:
            return jsonify({'error':'unknown provider'}), 400

    except Exception as e:
        return jsonify({'error':'tts proxy error', 'detail': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
