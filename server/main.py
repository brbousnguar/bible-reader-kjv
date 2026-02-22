from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse, Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from openai import AsyncOpenAI
import json, os
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


@app.post('/api/tts')
async def api_tts(req: TTSRequest):
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
    book: str = Query(''),
    chapter: int = Query(0),
    verse: int = Query(0),
    text: str = Query(''),
):
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
