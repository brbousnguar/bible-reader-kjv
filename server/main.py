from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.responses import StreamingResponse, Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
from openai import AsyncOpenAI
import base64
import hashlib
import hmac
import json
import os
import sqlite3
import socket
import subprocess
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bible Reader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Bible data paths
# ---------------------------------------------------------------------------
_bibles_docker = Path('/app/bibles/kjv_json')
_bibles_local  = Path(__file__).resolve().parent.parent / 'bibles' / 'kjv_json'
_kjv_base      = _bibles_docker if _bibles_docker.exists() else _bibles_local

_kjv_index = None
_auth_cookie_name = 'bible_auth'
_auth_secret = os.environ.get('AUTH_SECRET')
_auth_user = os.environ.get('APP_LOGIN_USER')
_auth_pass_hash = os.environ.get('APP_LOGIN_PASSWORD_HASH')

if not _auth_secret:
    raise RuntimeError('AUTH_SECRET must be set')
if not _auth_user:
    raise RuntimeError('APP_LOGIN_USER must be set')
if not _auth_pass_hash:
    raise RuntimeError('APP_LOGIN_PASSWORD_HASH must be set')

_db_path_default = Path('/var/data/bible_app.db') if Path('/var/data').exists() else (Path(__file__).resolve().parent / 'bible_app.db')
_db_path = Path(os.environ.get('APP_DATA_DB_PATH', str(_db_path_default)))


def _db_connect():
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _db_connect()
    try:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS user_state (
                username TEXT PRIMARY KEY,
                notes TEXT NOT NULL DEFAULT '[]',
                highlights TEXT NOT NULL DEFAULT '[]',
                recent_books TEXT NOT NULL DEFAULT '[]',
                read_map TEXT NOT NULL DEFAULT '{}',
                updated_at INTEGER NOT NULL
            )
            '''
        )
        conn.commit()
    finally:
        conn.close()


_init_db()


def load_kjv_index():
    global _kjv_index
    if _kjv_index is not None:
        return _kjv_index
    idx_path = _kjv_base / 'index.json'
    if not idx_path.exists():
        return None
    with open(idx_path, 'r', encoding='utf-8') as f:
        _kjv_index = json.load(f)
    return _kjv_index


def get_book_by_slug(slug: str):
    idx = load_kjv_index()
    if not idx:
        return None
    for b in idx.get('books', []):
        if b.get('slug') == slug or b.get('book', '').lower() == slug.lower():
            return b
    return None


def read_book_file(book_entry):
    if not book_entry:
        return None
    fp = _kjv_base / book_entry['file']
    if not fp.exists():
        return None
    with open(fp, 'r', encoding='utf-8') as f:
        return json.load(f)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')


def _b64url_decode(data: str) -> bytes:
    pad = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_auth_token(username: str) -> str:
    payload = {
        'u': username,
        'exp': int(time.time()) + (60 * 60 * 24 * 30),  # 30 days
    }
    payload_raw = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = _b64url(payload_raw)
    sig = hmac.new(_auth_secret.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    return f'{payload_b64}.{_b64url(sig)}'


def parse_auth_token(token: str):
    try:
        payload_b64, sig_b64 = token.split('.', 1)
        expected = hmac.new(_auth_secret.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        provided = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected, provided):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode('utf-8'))
        if int(payload.get('exp', 0)) < int(time.time()):
            return None
        if payload.get('u') != _auth_user:
            return None
        return payload
    except Exception:
        return None


def require_auth(request: Request):
    token = request.cookies.get(_auth_cookie_name, '')
    payload = parse_auth_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=401, detail='Authentication required for TTS')
    return payload


def verify_password(password: str, stored_hash: str) -> bool:
    # Format: pbkdf2_sha256$<iterations>$<salt>$<hash_b64url>
    try:
        algo, rounds, salt, expected_b64 = stored_hash.split('$', 3)
        if algo != 'pbkdf2_sha256':
            return False
        iterations = int(rounds)
        expected = _b64url_decode(expected_b64)
        actual = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations,
            dklen=len(expected),
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


class LoginRequest(BaseModel):
    username: str
    password: str


class UserStateRequest(BaseModel):
    notes: list = Field(default_factory=list)
    highlights: list = Field(default_factory=list)
    recent_books: list = Field(default_factory=list)
    read_map: dict = Field(default_factory=dict)


@app.get('/api/auth/status')
def auth_status(request: Request):
    token = request.cookies.get(_auth_cookie_name, '')
    payload = parse_auth_token(token) if token else None
    return {'authenticated': bool(payload), 'username': payload.get('u') if payload else None}


@app.post('/api/auth/login')
def auth_login(req: LoginRequest, request: Request):
    if req.username != _auth_user or not verify_password(req.password, _auth_pass_hash):
        raise HTTPException(status_code=401, detail='Invalid username or password')
    token = create_auth_token(req.username)
    res = Response(content=json.dumps({'ok': True}), media_type='application/json')
    res.set_cookie(
        key=_auth_cookie_name,
        value=token,
        httponly=True,
        secure=(request.url.scheme == 'https'),
        samesite='lax',
        max_age=60 * 60 * 24 * 30,
        path='/',
    )
    return res


@app.post('/api/auth/logout')
def auth_logout():
    res = Response(content=json.dumps({'ok': True}), media_type='application/json')
    res.delete_cookie(_auth_cookie_name, path='/')
    return res


def _safe_json_loads(raw: str, fallback):
    try:
        return json.loads(raw)
    except Exception:
        return fallback


@app.get('/api/user/state')
def get_user_state(request: Request):
    payload = require_auth(request)
    username = payload['u']
    conn = _db_connect()
    try:
        row = conn.execute(
            'SELECT notes, highlights, recent_books, read_map FROM user_state WHERE username = ?',
            (username,),
        ).fetchone()
        if not row:
            return {
                'notes': [],
                'highlights': [],
                'recent_books': [],
                'read_map': {},
            }
        return {
            'notes': _safe_json_loads(row['notes'], []),
            'highlights': _safe_json_loads(row['highlights'], []),
            'recent_books': _safe_json_loads(row['recent_books'], []),
            'read_map': _safe_json_loads(row['read_map'], {}),
        }
    finally:
        conn.close()


@app.post('/api/user/state')
def save_user_state(req: UserStateRequest, request: Request):
    payload = require_auth(request)
    username = payload['u']
    now = int(time.time())
    conn = _db_connect()
    try:
        conn.execute(
            '''
            INSERT INTO user_state (username, notes, highlights, recent_books, read_map, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                notes=excluded.notes,
                highlights=excluded.highlights,
                recent_books=excluded.recent_books,
                read_map=excluded.read_map,
                updated_at=excluded.updated_at
            ''',
            (
                username,
                json.dumps(req.notes),
                json.dumps(req.highlights),
                json.dumps(req.recent_books[:6]),
                json.dumps(req.read_map),
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return {'ok': True, 'updated_at': now}


# ---------------------------------------------------------------------------
# Bible API routes
# ---------------------------------------------------------------------------

@app.get('/api/bible/books')
def api_books():
    idx = load_kjv_index()
    if not idx:
        raise HTTPException(status_code=500, detail='KJV data not available')
    return {'books': idx.get('books', [])}


@app.get('/api/bible/search')
def api_search(q: str = Query('', alias='q')):
    q = q.strip().lower()
    if not q:
        return {'results': []}
    idx = load_kjv_index()
    if not idx:
        return {'results': []}
    results = []
    for b in idx.get('books', []):
        data = read_book_file(b)
        if not data:
            continue
        for ch in data.get('chapters', []):
            for v in ch.get('verses', []):
                if q in v.get('text', '').lower():
                    results.append({
                        'book': data['book'],
                        'chapter': ch['chapter'],
                        'verse': v['verse'],
                        'text': v['text'],
                    })
                    if len(results) >= 200:
                        return {'results': results}
    return {'results': results}


@app.get('/api/bible/{slug}/{chapter}')
def api_chapter(slug: str, chapter: int):
    book = get_book_by_slug(slug)
    if not book:
        raise HTTPException(status_code=404, detail='Book not found')
    data = read_book_file(book)
    if not data:
        raise HTTPException(status_code=500, detail='Book file missing')
    for ch in data.get('chapters', []):
        if int(ch['chapter']) == chapter:
            return {
                'reference': f"{data['book']} {chapter}",
                'book_name': data['book'],
                'chapter': chapter,
                'verses': ch['verses'],
            }
    raise HTTPException(status_code=404, detail='Chapter not found')


# ---------------------------------------------------------------------------
# TTS (OpenAI)
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str
    voice: str = 'onyx'
    speed: float = 1.0


class BookChatRequest(BaseModel):
    book: str
    user_message: str
    chapter_count: int = 0
    quick_review: dict = Field(default_factory=dict)
    history: list = Field(default_factory=list)


@app.post('/api/tts')
async def api_tts(req: TTSRequest, request: Request):
    require_auth(request)
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail='OPENAI_API_KEY not configured')
    client = AsyncOpenAI(api_key=api_key)
    response = await client.audio.speech.create(
        model='tts-1',
        voice=req.voice,
        input=req.text,
        speed=max(0.25, min(4.0, req.speed)),
        response_format='mp3',
    )
    audio_bytes = response.content
    return Response(content=audio_bytes, media_type='audio/mpeg')


# ---------------------------------------------------------------------------
# AI commentary (SSE, GPT-4o-mini)
# ---------------------------------------------------------------------------

@app.get('/api/commentary')
async def api_commentary(
    request: Request,
    book: str = Query(''),
    chapter: int = Query(0),
    verse: int = Query(0),
    text: str = Query(''),
):
    require_auth(request)
    api_key = os.environ.get('OPENAI_API_KEY')

    if not api_key:
        async def err():
            yield 'data: [ERROR] OPENAI_API_KEY not configured\n\n'
            yield 'data: [DONE]\n\n'
        return StreamingResponse(err(), media_type='text/event-stream')

    client = AsyncOpenAI(api_key=api_key)
    prompt = (
        f'Briefly explain {book} {chapter}:{verse} ("{text}") in 2-3 sentences. '
        'Focus on historical context, theological meaning, and practical relevance. '
        'Be concise, clear, and respectful.'
    )

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {
                        'role': 'system',
                        'content': (
                            'You are a knowledgeable biblical scholar providing brief, '
                            'accurate commentary on Bible verses.'
                        ),
                    },
                    {'role': 'user', 'content': prompt},
                ],
                stream=True,
                max_tokens=200,
                temperature=0.7,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    safe = delta.replace('\n', ' ')
                    yield f'data: {safe}\n\n'
            yield 'data: [DONE]\n\n'
        except Exception as e:
            yield f'data: [ERROR] {str(e)}\n\n'
            yield 'data: [DONE]\n\n'

    return StreamingResponse(
        generate(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )


@app.post('/api/book-chat')
async def api_book_chat(req: BookChatRequest, request: Request):
    require_auth(request)
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail='OPENAI_API_KEY not configured')

    raw_book = (req.book or '').strip()
    user_message = (req.user_message or '').strip()
    if not raw_book:
        raise HTTPException(status_code=400, detail='Book is required')
    if not user_message:
        raise HTTPException(status_code=400, detail='Message is required')

    # Normalize user-entered names to the canonical KJV entry when possible.
    slug = raw_book.lower().replace(' ', '-')
    book_entry = get_book_by_slug(raw_book) or get_book_by_slug(slug)
    book_data = read_book_file(book_entry) if book_entry else None
    book_name = (book_data or {}).get('book', raw_book)
    chapter_count = len((book_data or {}).get('chapters', [])) or int(req.chapter_count or 0)

    quick_review = req.quick_review if isinstance(req.quick_review, dict) else {}
    review_bits = []
    for key in ('author', 'when', 'celebrity', 'impact'):
        value = quick_review.get(key)
        if isinstance(value, str) and value.strip():
            review_bits.append(f'{key}: {value.strip()}')
    quick_review_text = '; '.join(review_bits) if review_bits else 'No extra quick-review metadata provided.'

    clean_history = []
    for item in req.history[-12:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get('role', '')).strip().lower()
        content = str(item.get('content', '')).strip()
        if role not in ('user', 'assistant') or not content:
            continue
        clean_history.append({'role': role, 'content': content[:800]})

    client = AsyncOpenAI(api_key=api_key)
    context_prompt = (
        f'Book context:\n'
        f'- Name: {book_name}\n'
        f'- Chapters: {chapter_count if chapter_count > 0 else "unknown"}\n'
        f'- Quick review: {quick_review_text}\n'
        f'Answer only about this selected biblical book unless the user asks to compare books.'
    )

    try:
        completion = await client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are a Bible study assistant. Give clear, accurate, respectful answers in short paragraphs '
                        'or bullet points. Use the provided book context and mention uncertainty if needed.'
                    ),
                },
                {'role': 'system', 'content': context_prompt},
                *clean_history,
                {'role': 'user', 'content': user_message[:1200]},
            ],
            max_tokens=350,
            temperature=0.4,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Chat generation failed: {str(e)}')

    reply = ((completion.choices or [{}])[0].message.content or '').strip()
    if not reply:
        raise HTTPException(status_code=500, detail='Empty chat response')
    return {
        'book': book_name,
        'chapter_count': chapter_count,
        'reply': reply,
    }


def _resolve_lan_ip():
    # Optional manual override for complex network setups (VPN, multiple NICs).
    forced_host = os.environ.get('SHARE_PUBLIC_HOST', '').strip()
    if forced_host:
        return forced_host
    # Prefer active LAN interfaces on macOS/Linux.
    try:
        output = subprocess.check_output(['ifconfig'], text=True)
        blocks = output.split('\n\n')
        preferred = []
        fallback = []
        for block in blocks:
            lines = [ln for ln in block.splitlines() if ln.strip()]
            if not lines:
                continue
            iface = lines[0].split(':', 1)[0].strip()
            if iface.startswith(('lo', 'utun', 'awdl', 'llw', 'bridge', 'ap', 'gif', 'stf', 'anpi')):
                continue
            is_active = any('status: active' in ln for ln in lines)
            ips = []
            for ln in lines:
                part = ln.strip()
                if part.startswith('inet '):
                    ip = part.split()[1]
                    if ip.startswith('127.'):
                        continue
                    ips.append(ip)
            if not ips:
                continue
            target = preferred if iface in ('en0', 'en7', 'wlan0', 'eth0', 'en1') else fallback
            for ip in ips:
                if is_active:
                    target.append(ip)
                else:
                    fallback.append(ip)
        if preferred:
            return preferred[0]
        if fallback:
            return fallback[0]
    except Exception:
        pass
    # Fallback to routing-based detection.
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(('8.8.8.8', 80))
        ip = sock.getsockname()[0]
        sock.close()
        if ip and not ip.startswith('127.'):
            return ip
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
            if ip and not ip.startswith('127.'):
                return ip
        except Exception:
            pass
    return None


@app.get('/api/share-url')
def api_share_url(request: Request):
    host = request.headers.get('host', '')
    scheme = request.headers.get('x-forwarded-proto') or request.url.scheme or 'http'
    hostname = request.url.hostname or ''
    port = request.url.port

    if hostname in ('localhost', '127.0.0.1', '::1'):
        lan_ip = _resolve_lan_ip()
        if lan_ip:
            if port:
                return {'base_url': f'http://{lan_ip}:{port}'}
            return {'base_url': f'http://{lan_ip}'}
    if host:
        return {'base_url': f'{scheme}://{host}'}
    return {'base_url': str(request.base_url).rstrip('/')}


# ---------------------------------------------------------------------------
# Static files — catch-all route (avoids StaticFiles lifespan assertion bug)
# ---------------------------------------------------------------------------
_static_docker = Path('/app/static')
_static_local  = Path(__file__).resolve().parent.parent
_static_dir    = _static_docker if _static_docker.exists() else _static_local


@app.get('/{full_path:path}', include_in_schema=False)
async def serve_spa(full_path: str):
    target = (_static_dir / full_path).resolve()
    # Safety: prevent path traversal outside static dir
    if not str(target).startswith(str(_static_dir)):
        raise HTTPException(status_code=403)
    if target.is_file():
        return FileResponse(target)
    return FileResponse(_static_dir / 'index.html')
