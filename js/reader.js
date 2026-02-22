// Helper function to fetch verses from the FastAPI backend
async function fetchVerses(ref){
  // ref expected like "BookName 3" or "BookName 3:16"
  const m = String(ref||'').trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if(!m) return null;
  const book = m[1];
  const chapter = m[2];
  const verseNum = m[3] ? parseInt(m[3],10) : null;

  const url = getApiUrl(book, chapter);
  if(!url) return null;

  try{
    const r = await fetch(url);
    if(!r.ok) return null;
    const data = await r.json();

    // If local backend returns {reference, book_name, chapter, verses}
    // and bible-api returns a similar shape with 'verses', normalize both.
    if(data && data.verses){
      // If a single verse requested, filter
      if(verseNum){
        const verses = (data.verses||[]).filter(v=> Number(v.verse) === Number(verseNum));
        return Object.assign({}, data, { verses });
      }
      return data;
    }

    // Some APIs return { text: '...' } or other shapes; try to normalize
    if(data && data.text){
      return { reference: ref, book_name: book, chapter: Number(chapter), verses: [{ verse: verseNum||1, text: data.text }] };
    }

    return null;
  }catch(e){
    console.error('fetchVerses error', e);
    return null;
  }
}

async function fetchChapter(book, chapter, btn){
  if(btn) document.querySelectorAll('.chapter-btn').forEach(n=> n.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // Enhanced loading state
  versesEl.innerHTML = '<div class="muted" style="text-align:center;padding:40px;"><div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(139,94,52,0.2);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;"></div><p style="margin-top:16px;">Loading chapter...</p></div>';
  
  const ref = `${book} ${chapter}`;
  try{
    const data = await fetchVerses(ref);
    
    if(!data || !data.verses || data.verses.length === 0){
      throw new Error('No verses returned from API');
    }
    markChapterRead(book, chapter);
    renderBooks();
    renderRecentBooks();
    displayVerses(data);
  }catch(e){
    console.error('Error fetching chapter:', e);
    versesEl.innerHTML = `<p class="muted">Could not load chapter. ${e.message}<br>Please check that the Bible version is supported by the API.</p>`;
  }
}

function buildHighlightRanges(text, items){
  const ranges = [];
  let cursor = 0;

  items.forEach(item => {
    if(!item.text) return;
    let idx = text.indexOf(item.text, cursor);
    if(idx === -1) idx = text.indexOf(item.text);
    if(idx === -1) return;
    ranges.push({ start: idx, end: idx + item.text.length });
    cursor = idx + item.text.length;
  });

  ranges.sort((a, b) => a.start - b.start);
  const merged = [];
  ranges.forEach(range => {
    const last = merged[merged.length - 1];
    if(!last || range.start >= last.end){
      merged.push(range);
    } else {
      last.end = Math.max(last.end, range.end);
    }
  });
  return merged;
}

function applyHighlightsToSpan(span, verseId, text){
  const verseHighlights = highlights.filter(h => h.id === verseId);
  if(!verseHighlights.length){
    span.textContent = text;
    return;
  }
  const ranges = buildHighlightRanges(text, verseHighlights);
  if(!ranges.length){
    span.textContent = text;
    return;
  }
  let html = '';
  let cursor = 0;
  ranges.forEach(r => {
    if(r.start > cursor) html += escapeHtml(text.slice(cursor, r.start));
    html += `<span class="verse-highlight">${escapeHtml(text.slice(r.start, r.end))}</span>`;
    cursor = r.end;
  });
  if(cursor < text.length) html += escapeHtml(text.slice(cursor));
  span.innerHTML = html;
}

function displayVerses(data){
  versesEl.innerHTML = '';
  versesEl.setAttribute('dir', 'ltr');
  versesEl.style.textAlign = 'left';
  
  if(data.reference) {
    const h = el('h2', null, data.reference);
    h.style.opacity = '0';
    h.style.transform = 'translateY(-10px)';
    versesEl.appendChild(h);
    setTimeout(()=>{
      h.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      h.style.opacity = '1';
      h.style.transform = 'translateY(0)';
    }, 50);
  }
  if(data.verses && data.verses.length){
    // store lastChapter for chapter playback
    lastChapter = { book: data.book_name || (data.reference||'').split(' ')[0], chapter: data.chapter || null, verses: data.verses };
    data.verses.forEach((v, index)=>{
      const bookName = data.book_name || (data.reference||'').split(' ')[0];
      const chapterNum = data.chapter || '';
      const id = `verse-${slugify(bookName)}-${chapterNum}-${v.verse}`;
      const p = el('p','verse');
      p.id = id;
      p.style.opacity = '0';
      p.style.transform = 'translateY(10px)';
      let play = null;
      if(window.ttsAuthEnabled){
        play = el('button','play-btn');
        play.setAttribute('aria-label', `Play verse ${v.verse}`);
        play.innerHTML = '🔊';
        play.addEventListener('click', ()=>{
          speakVerse(v.text, id, play);
        });
        p.appendChild(play);
      }
      // note button
      const noteBtn = el('button','note-btn');
      noteBtn.setAttribute('aria-label', `Add note to verse ${v.verse}`);
      noteBtn.innerHTML = '📝';
      const existingNote = notes.find(n=> n.id === id);
      if(existingNote) noteBtn.classList.add('has-note');
      noteBtn.addEventListener('click', ()=>{
        openNoteModal(id, {book: bookName, chapter: chapterNum, verse: v.verse, text: v.text});
      });
      p.appendChild(noteBtn);
      // explain button
      const commentary = el('div', 'verse-commentary');
      commentary.hidden = true;
      if(window.ttsAuthEnabled){
        const explainBtn = el('button', 'explain-btn');
        explainBtn.setAttribute('aria-label', `Explain verse ${v.verse}`);
        explainBtn.textContent = 'Explain';
        explainBtn.addEventListener('click', ()=>{
          explainBtn.classList.toggle('active', commentary.hidden);
          explainVerse(bookName, chapterNum, v.verse, v.text, commentary);
        });
        p.appendChild(explainBtn);
      }
      const num = el('span','verse-num', v.verse);
      p.appendChild(num);
      const textNode = document.createElement('span');
      textNode.className = 'verse-text';
      applyHighlightsToSpan(textNode, id, v.text);
      // enable text selection for highlighting
      textNode.addEventListener('mouseup', ()=>{
        const selection = window.getSelection();
        if(selection && selection.toString().trim().length > 0){
          addHighlight(id, {book: bookName, chapter: chapterNum, verse: v.verse, text: selection.toString()});
        }
      });
      p.appendChild(textNode);
      p.appendChild(commentary);
      versesEl.appendChild(p);
      // Staggered fade-in animation
      setTimeout(()=>{
        p.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        p.style.opacity = '1';
        p.style.transform = 'translateY(0)';
      }, 50 + (index * 20));
    })
  } else if(data.text){
    versesEl.textContent = data.text;
  } else {
    versesEl.textContent = 'No verses found.';
  }
}

function slugify(s){
  return String(s||'').replace(/\s+/g,'_').replace(/[^A-Za-z0-9_\-]/g,'');
}

function tryParseReference(text){
  // Accept formats like "John 3" or "John 3:16" or "1 John 2"
  const t = text.trim();
  if(!t) return null;
  return t;
}

// ---------------- Search implementation ----------------

let searchState = {
  term: '',
  page: 1,
  pageSize: 20,
  results: [],
  pointer: 0,
  done: false,
  fetching: false
};

function resetSearch(term){
  searchState.term = term.trim();
  searchState.page = 1;
  searchState.results = [];
  searchState.pointer = 0;
  searchState.done = false;
}

async function searchNextBatch(batchSize = 8){
  if(searchState.done || searchState.fetching) return;
  searchState.fetching = true;
  const toFetch = [];
  for(let i=0;i<batchSize && searchState.pointer < flatChapters.length;i++, searchState.pointer++){
    toFetch.push(flatChapters[searchState.pointer]);
  }
  try{
    const promises = toFetch.map(ch => {
      const ref = `${ch.book} ${ch.chapter}`;
      return fetchVerses(ref).catch(()=>null);
    });
    const results = await Promise.all(promises);
    results.forEach((r, idx)=>{
      if(!r || !r.verses) return;
      r.book_name = toFetch[idx].book;
      r.chapter = toFetch[idx].chapter;
      r.verses.forEach(v=>{
        if(v.text && v.text.toLowerCase().includes(searchState.term.toLowerCase())){
          searchState.results.push({book: r.book_name, chapter: r.chapter, verse: v.verse, text: v.text});
        }
      })
    })
    if(searchState.pointer >= flatChapters.length) searchState.done = true;
  }catch(e){
    if(searchState.pointer >= flatChapters.length) searchState.done = true;
  } finally{
    searchState.fetching = false;
  }
}

async function ensureResultsForPage(page){
  const need = page * searchState.pageSize;
  while(searchState.results.length < need && !searchState.done){
    await searchNextBatch(10);
  }
}

function renderSearchUI(){
  if(!searchState.term){
    searchSection.hidden = true;
    return;
  }
  searchSection.hidden = false;
  searchMeta.textContent = `Results for “${searchState.term}” — ${searchState.results.length}${searchState.done? ' (complete)':' (partial)'}`;
  renderResultsPage(searchState.page);
}

function renderResultsPage(page){
  resultsList.innerHTML = '';
  const start = (page-1)*searchState.pageSize;
  const pageItems = searchState.results.slice(start, start + searchState.pageSize);
  if(pageItems.length===0){
    resultsList.innerHTML = '<div class="result-item">No results on this page.</div>';
  }
  pageItems.forEach(item=>{
    const div = el('div','result-item');
    const ref = el('div','result-ref', `${item.book} ${item.chapter}:${item.verse}`);
    const snippet = el('div','result-snippet');
    const regex = new RegExp(`(${escapeRegExp(searchState.term)})`,`ig`);
    const highlighted = item.text.replace(regex, '<span class="highlight">$1</span>');
    snippet.innerHTML = highlighted;
    div.appendChild(ref);
    div.appendChild(snippet);
    div.addEventListener('click', ()=>{
      fetchChapter(item.book, item.chapter);
      setTimeout(()=>{
        const id = `verse-${slugify(item.book)}-${item.chapter}-${item.verse}`;
        const node = document.getElementById(id);
        if(node){ node.scrollIntoView({behavior:'smooth', block:'center'});
        node.classList.add('highlight');
        setTimeout(()=> node.classList.remove('highlight'), 3000);
        }
      }, 800);
    });
    resultsList.appendChild(div);
  });
  renderPagination();
}

function renderPagination(){
  paginationEl.innerHTML = '';
  const totalKnown = searchState.done ? searchState.results.length : Math.max(searchState.results.length, searchState.page * searchState.pageSize);
  const pages = Math.max(1, Math.ceil(totalKnown / searchState.pageSize));
  const createBtn = (p, label)=>{
    const b = el('button','page-btn', label||p);
    if(p===searchState.page) b.classList.add('active');
    b.addEventListener('click', async ()=>{
      if(p > pages) return;
      searchState.page = p;
      await ensureResultsForPage(p);
      renderSearchUI();
    });
    return b;
  }
  const prev = el('button','page-btn','Prev');
  prev.disabled = searchState.page===1;
  prev.addEventListener('click', ()=>{ if(searchState.page>1){ searchState.page--; renderSearchUI(); }});
  paginationEl.appendChild(prev);
  const startPage = Math.max(1, searchState.page - 3);
  const endPage = startPage + 6;
  for(let p=startPage;p<=endPage;p++){
    paginationEl.appendChild(createBtn(p));
  }
  const next = el('button','page-btn','Next');
  next.addEventListener('click', async ()=>{
    searchState.page++;
    await ensureResultsForPage(searchState.page);
    renderSearchUI();
  });
  paginationEl.appendChild(next);
}

function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// ---------------- AI TTS (per-verse) ----------------
let currentAudio = null;
let currentVerseId = null;
// chapter playback state
let lastChapter = null; // {book, chapter, verses}
let chapterQueue = [];
let chapterIndex = 0;
let chapterPlaying = false;

async function requestTtsAudio(text, voice, speed){
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    body: JSON.stringify({text, voice, speed}),
  });
  if(res.status === 401){
    window.ttsAuthEnabled = false;
    if(typeof window.requireTtsLogin === 'function') window.requireTtsLogin();
    throw new Error('Login required for TTS');
  }
  if(!res.ok) throw new Error('TTS request failed');
  return res.blob();
}

async function speakVerse(text, verseId, btn){
  if(typeof window.requireTtsLogin === 'function' && !window.requireTtsLogin()) return;
  // Toggle off if same verse clicked again
  if(currentVerseId === verseId && currentAudio){
    currentAudio.pause();
    currentAudio = null;
    currentVerseId = null;
    if(btn) btn.classList.remove('playing');
    const node = document.getElementById(verseId);
    if(node) node.classList.remove('speaking');
    return;
  }
  // Stop any previous audio
  if(currentAudio){
    currentAudio.pause();
    currentAudio = null;
  }
  document.querySelectorAll('.play-btn.playing').forEach(b=> b.classList.remove('playing'));
  document.querySelectorAll('.verse.speaking').forEach(n=> n.classList.remove('speaking'));

  const voice = localStorage.getItem('bible_ai_voice') || 'onyx';
  const speed = parseFloat(localStorage.getItem('bible_ai_speed') || '1.0');
  const node = document.getElementById(verseId);

  try{
    if(btn) btn.classList.add('playing');
    if(node) node.classList.add('speaking');
    currentVerseId = verseId;

    const blob = await requestTtsAudio(text, voice, speed);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    const cleanup = ()=>{
      if(btn) btn.classList.remove('playing');
      if(node) node.classList.remove('speaking');
      if(currentVerseId === verseId){ currentAudio = null; currentVerseId = null; }
      URL.revokeObjectURL(url);
    };
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
    await audio.play();
  }catch(err){
    console.warn('AI TTS error', err);
    if(btn) btn.classList.remove('playing');
    if(node) node.classList.remove('speaking');
    currentAudio = null;
    currentVerseId = null;
  }
}

// For sequential chapter playback — resolves when audio finishes
function speakVerseAndWait(text, verseId, btn){
  return new Promise(async (resolve)=>{
    if(typeof window.requireTtsLogin === 'function' && !window.requireTtsLogin()){
      resolve();
      return;
    }
    const voice = localStorage.getItem('bible_ai_voice') || 'onyx';
    const speed = parseFloat(localStorage.getItem('bible_ai_speed') || '1.0');
    const node = document.getElementById(verseId);
    try{
      if(btn) btn.classList.add('playing');
      if(node) node.classList.add('speaking');
      const blob = await requestTtsAudio(text, voice, speed);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      const cleanup = ()=>{
        if(btn) btn.classList.remove('playing');
        if(node) node.classList.remove('speaking');
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.addEventListener('ended', cleanup);
      audio.addEventListener('error', cleanup);
      await audio.play();
    }catch(err){
      console.warn('TTS error', err);
      if(btn) btn.classList.remove('playing');
      if(node) node.classList.remove('speaking');
      resolve();
    }
  });
}

// ---------------- AI Commentary (SSE) ----------------
function explainVerse(book, chapter, verse, text, container){
  // Toggle: collapse if already visible
  if(!container.hidden){
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.innerHTML = '<p class="commentary-loading">Generating commentary…</p>';

  const params = new URLSearchParams({book, chapter, verse, text});
  const es = new EventSource(`/api/commentary?${params}`);
  let accumulated = '';
  let p = null;

  es.onmessage = (e)=>{
    if(e.data === '[DONE]'){ es.close(); return; }
    if(e.data.startsWith('[ERROR]')){
      container.innerHTML = '<p class="commentary-error">Could not load commentary.</p>';
      es.close();
      return;
    }
    if(!p){
      container.innerHTML = '';
      p = document.createElement('p');
      p.className = 'commentary-text';
      container.appendChild(p);
    }
    accumulated += e.data;
    p.textContent = accumulated;
  };
  es.onerror = ()=>{
    if(!accumulated){
      container.innerHTML = '<p class="commentary-error">Could not load commentary.</p>';
    }
    es.close();
  };
}

// ---------------- Chapter playback ----------------
async function playChapter(book, chapter){
  // Ensure we have the chapter data; if not, fetch it
  // 'book' parameter should be English name for API
  if(!lastChapter || lastChapter.book !== book || lastChapter.chapter !== chapter){
    try{
      const ref = `${book} ${chapter}`;
      const data = await fetchVerses(ref);
      if(!data || !data.verses || data.verses.length === 0){
        throw new Error('Not found');
      }
      lastChapter = { book: data.book_name || book, chapter: data.chapter || chapter, verses: data.verses || [] };
      displayVerses(data);
    }catch(e){ console.warn('Could not fetch chapter for playback', e); return; }
  }
  // build queue
  chapterQueue = lastChapter.verses.map(v=> ({verse: v.verse, text: v.text, id: `verse-${slugify(lastChapter.book)}-${lastChapter.chapter}-${v.verse}`}));
  chapterIndex = 0;
  chapterPlaying = true;
  readNextInChapter();
}

async function readNextInChapter(){
  while(chapterPlaying && chapterIndex < chapterQueue.length){
    const item = chapterQueue[chapterIndex];
    document.querySelectorAll('.verse.speaking').forEach(n=> n.classList.remove('speaking'));
    const node = document.getElementById(item.id);
    if(node){ node.classList.add('speaking'); node.scrollIntoView({behavior:'smooth', block:'center'}); }
    const playBtn = node ? node.querySelector('.play-btn') : null;
    await speakVerseAndWait(item.text, item.id, playBtn);
    document.querySelectorAll('.verse.speaking').forEach(n=> n.classList.remove('speaking'));
    chapterIndex++;
    if(chapterPlaying && chapterIndex < chapterQueue.length){
      await new Promise(r=> setTimeout(r, 220));
    }
  }
  chapterPlaying = false;
}

function pauseChapter(){
  chapterPlaying = false;
  if(currentAudio && !currentAudio.paused) currentAudio.pause();
}

function resumeChapter(){
  if(!chapterPlaying && chapterIndex < chapterQueue.length){
    chapterPlaying = true;
    if(currentAudio && currentAudio.paused){
      currentAudio.play();
    } else {
      readNextInChapter();
    }
  }
}

function stopChapter(){
  chapterPlaying = false;
  chapterQueue = [];
  chapterIndex = 0;
  if(currentAudio){ currentAudio.pause(); currentAudio = null; }
  currentVerseId = null;
  document.querySelectorAll('.verse.speaking').forEach(n=> n.classList.remove('speaking'));
  document.querySelectorAll('.play-btn.playing').forEach(b=> b.classList.remove('playing'));
}

// Chapter playback buttons are wired in setupEventListeners()
