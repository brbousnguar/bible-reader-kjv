const booksUrl = 'books.json';
let booksList, chapterPicker, versesEl, searchInput, searchBtn;
let aiVoiceSelect, rateRange;
let settingsBtn, settingsPanel, rateValue;

// i18n stub (fixes renderNotes usage)
const i18n = { edit: 'Edit', delete: 'Delete', highlights: 'Highlights', noHighlights: 'No highlights yet.' };
function t(key){ return i18n[key] || key; }

// API helper — always uses the local FastAPI backend via relative paths
function getApiUrl(book, chapter){
  const slug = (book || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  return `/api/bible/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
}

// KJV display name (used by subtitle)
const currentBibleVersion = { name: 'King James Version' };

// Notes & highlights state
let notes = JSON.parse(localStorage.getItem('bible_notes') || '[]');
let highlights = JSON.parse(localStorage.getItem('bible_highlights') || '[]');
let currentNoteVerseId = null;

let books = [];
let activeBook = null;
let flatChapters = []; // flattened list of all chapters in order
let bookMeta = {};
let bookImages = {}; // Store fetched book images

function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text) e.textContent = text; return e }

async function loadBooks(){
  if(!booksList) {
    console.error('booksList is null in loadBooks!');
    return;
  }
  
  try {
    const res = await fetch(booksUrl);
    if(!res.ok) {
      console.error('Failed to load books.json:', res.status);
      booksList.innerHTML = '<p class="muted">Failed to load books. Please refresh the page.</p>';
      return;
    }
    const data = await res.json();
    books = data.categories || data; // Support both old and new format
    // try to load book metadata for quick reviews
    try{
      fetch('book_meta.json').then(r=> r.ok ? r.json() : {}).then(m=>{ bookMeta = m || {}; }).catch(()=>{});
    }catch(e){/*ignore*/}
    // build flat chapters array
    flatChapters = [];
    if(data.categories){
      // New categorized format
      data.categories.forEach(cat=>{
        cat.books.forEach(b=>{
          for(let i=1;i<=b.chapters;i++) flatChapters.push({book: b.name, chapter: i});
        });
      });
    } else {
      // Old flat format fallback
      books.forEach(b=>{
        for(let i=1;i<=b.chapters;i++) flatChapters.push({book: b.name, chapter: i});
      });
    }
    renderBooks();
  } catch(e) {
    console.error('Error loading books:', e);
    if(booksList) {
      booksList.innerHTML = '<p class="muted">Error loading books: ' + e.message + '</p>';
    }
  }
  renderBooks();
  // Fetch images for books
  await fetchBookImages();
}

// Event listeners will be set up in initializeApp()

function renderBooks(){
  if(!booksList) {
    console.error('booksList element not found in renderBooks!');
    return;
  }
  if(!books || (Array.isArray(books) && books.length === 0)) {
    console.error('No books data available');
    booksList.innerHTML = '<p class="muted">No books available.</p>';
    return;
  }
  
  booksList.innerHTML = '';
  
  if(books.categories || (Array.isArray(books) && books[0]?.books)){
    // Render categorized books
    const categories = books.categories || books;
    categories.forEach(category => {
      // Add category header
      const header = el('div', 'book-category', category.name);
      if(category.testament) header.setAttribute('data-testament', category.testament);
      booksList.appendChild(header);
      
      // Add books in this category with images
      category.books.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'book-btn';
        
        // Add image if available
        if(bookImages[b.name]){
          const img = document.createElement('img');
          img.src = bookImages[b.name];
          img.alt = b.name;
          img.className = 'book-img';
          img.onerror = function(){
            this.style.display = 'none';
          };
          btn.appendChild(img);
        } else {
          // Add icon placeholder
          const icon = document.createElement('span');
          icon.className = 'book-icon';
          icon.textContent = '📖';
          btn.appendChild(icon);
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'book-name';
        nameSpan.textContent = b.name;
        btn.appendChild(nameSpan);
        
        btn.addEventListener('click', ()=> showBookReview(b));
        booksList.appendChild(btn);
      });
    });
  } else {
    // Fallback for old flat format
    books.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'book-btn';
      
      if(bookImages[b.name]){
        const img = document.createElement('img');
        img.src = bookImages[b.name];
        img.alt = b.name;
        img.className = 'book-img';
        btn.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'book-icon';
        icon.textContent = '📖';
        btn.appendChild(icon);
      }
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'book-name';
      nameSpan.textContent = b.name;
      btn.appendChild(nameSpan);
      
      btn.addEventListener('click', ()=> showBookReview(b));
      booksList.appendChild(btn);
    });
  }
}

// Show a quick review for the book in the main content area
function showBookReview(book){
  activeBook = book;
  document.querySelectorAll('.book-btn').forEach(n=> n.classList.toggle('active', n.textContent.includes(book.name)));
  
  const meta = bookMeta && bookMeta[book.name];
  
  // Get book image or use first letter as fallback
  let imageHTML = '';
  if(bookImages[book.name]){
    imageHTML = `<img src="${bookImages[book.name]}" alt="${book.name}" class="book-review-img" onerror="this.style.display='none'; this.parentElement.textContent='${book.name.charAt(0).toUpperCase()}';">`;
  } else {
    imageHTML = book.name.charAt(0).toUpperCase();
  }
  
  // Build review HTML with circular image
  let reviewHTML = `
    <div class="book-review">
      <div class="book-review-header">
        <div class="book-review-image">${imageHTML}</div>
        <div class="book-review-title">
          <h2>${book.name} — Quick Review</h2>
        </div>
      </div>
      <div class="review-section">
        <p><strong>Author:</strong> ${meta && meta.author ? meta.author : 'Traditionally attributed authorship varies'}</p>
        <p><strong>When:</strong> ${meta && meta.when ? meta.when : '—'}</p>
        <p><strong>Celebrity:</strong> ${meta && meta.celebrity ? meta.celebrity : '—'}</p>
        <p><strong>Impact:</strong> ${meta && meta.impact ? meta.impact : '—'}</p>
      </div>
      <button id="showChaptersFromReview" class="show-chapters-btn">Show Chapters</button>
    </div>
  `;
  
  versesEl.innerHTML = reviewHTML;
  chapterPicker.innerHTML = '';
  
  // Wire up the show chapters button
  const showChaptersBtn = document.getElementById('showChaptersFromReview');
  if(showChaptersBtn){
    showChaptersBtn.addEventListener('click', ()=> selectBook(book));
  }
}

function selectBook(book){
  activeBook = book;
  document.querySelectorAll('.book-btn').forEach(n=> {
    n.classList.toggle('active', n.textContent === book.name);
  });
  renderChapters(book);
  versesEl.innerHTML = `<p class="muted">Select a chapter in ${book.name}.</p>`;
}

function renderChapters(book){
  chapterPicker.innerHTML = '';
  for(let i=1;i<=book.chapters;i++){
    const b = el('button','chapter-btn', i);
    b.addEventListener('click', ()=> fetchChapter(book.name, i, b));
    chapterPicker.appendChild(b);
  }
}

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
    displayVerses(data);
  }catch(e){
    console.error('Error fetching chapter:', e);
    versesEl.innerHTML = `<p class="muted">Could not load chapter. ${e.message}<br>Please check that the Bible version is supported by the API.</p>`;
  }
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
      // play button
      const play = el('button','play-btn');
      play.setAttribute('aria-label', `Play verse ${v.verse}`);
      play.innerHTML = '🔊';
      play.addEventListener('click', ()=>{
        speakVerse(v.text, id, play);
      });
      p.appendChild(play);
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
      const explainBtn = el('button', 'explain-btn');
      explainBtn.setAttribute('aria-label', `Explain verse ${v.verse}`);
      explainBtn.textContent = 'Explain';
      explainBtn.addEventListener('click', ()=>{
        explainBtn.classList.toggle('active', commentary.hidden);
        explainVerse(bookName, chapterNum, v.verse, v.text, commentary);
      });
      p.appendChild(explainBtn);
      const num = el('span','verse-num', v.verse);
      p.appendChild(num);
      const textNode = document.createElement('span');
      textNode.className = 'verse-text';
      textNode.textContent = v.text;
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
let searchSection, searchMeta, resultsList, paginationEl;

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

// Search event listeners will be set up in initializeApp()


function initializeApp(){
  // Get DOM elements
  booksList = document.getElementById('booksList');
  chapterPicker = document.getElementById('chapterPicker');
  versesEl = document.getElementById('verses');
  searchInput = document.getElementById('searchInput');
  searchBtn = document.getElementById('searchBtn');
  searchSection = document.getElementById('searchResults');
  searchMeta = document.getElementById('searchMeta');
  resultsList = document.getElementById('resultsList');
  paginationEl = document.getElementById('pagination');
  aiVoiceSelect = document.getElementById('aiVoiceSelect');
  rateRange = document.getElementById('rateRange');
  settingsBtn = document.getElementById('settingsBtn');
  settingsPanel = document.getElementById('settingsPanel');
  rateValue = document.getElementById('rateValue');
  
  if(!booksList) {
    console.error('booksList element not found!');
    return;
  }
  
  // Initialize document direction
  document.documentElement.setAttribute('dir', 'ltr');
  document.documentElement.setAttribute('lang', 'en');
  
  // Set initial verses message
  if(versesEl) versesEl.innerHTML = '<p class="muted">Select a book and chapter.</p>';
  
  // Display current version in header subtitle
  const subtitle = document.querySelector('.subtitle span:not(.subtitle-icon)');
  if(subtitle && currentBibleVersion){
    subtitle.textContent = currentBibleVersion.name;
  }

  // Make logo clickable to go to welcome page
  const logoContainer = document.querySelector('.logo-container');
  if(logoContainer){
    logoContainer.style.cursor = 'pointer';
    logoContainer.addEventListener('click', ()=>{
      localStorage.removeItem('bible_version_selected');
      window.location.href = 'welcome.html';
    });
  }

  // Setup event listeners
  setupEventListeners();
  
  // Setup voice controls
  setupVoiceControls();
  
  // Load books
  loadBooks();
}

// Wait for DOM to be ready before initializing
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded, initialize immediately
  initializeApp();
}

function setupEventListeners(){
  // Search button
  if(searchBtn && searchInput){
    searchBtn.addEventListener('click', async ()=>{
      const ref = tryParseReference(searchInput.value);
      if(!ref) return;
      const isRef = /\d?\s?[A-Za-z]+\s+\d/.test(ref);
      if(isRef){
        if(versesEl) versesEl.innerHTML = '<p class="muted">Loading...</p>';
        // Parse reference and build API URL directly
        const refParts = ref.trim().split(/\s+/);
        if(refParts.length >= 2){
          const bookName = refParts.slice(0, -1).join(' ');
          const chapterVerse = refParts[refParts.length - 1];
          const refStr = `${bookName} ${chapterVerse}`;
          fetchVerses(refStr)
            .then(data => {
              if(data && data.verses && data.verses.length > 0){
                displayVerses(data);
              } else {
                if(versesEl) versesEl.innerHTML = '<p class="muted">Not found.</p>';
              }
            })
            .catch(()=> { if(versesEl) versesEl.innerHTML = '<p class="muted">Not found.</p>'; });
        }
        return;
      }
      resetSearch(ref);
      if(resultsList) resultsList.innerHTML = '<div class="result-item">Searching…</div>';
      if(searchSection) searchSection.hidden = false;
      await ensureResultsForPage(1);
      renderSearchUI();
    });
    
    searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchBtn.click(); });
  }
  
  // Settings button
  if(settingsBtn && settingsPanel){
    settingsBtn.addEventListener('click', ()=>{
      const isHidden = settingsPanel.hasAttribute('hidden');
      if(isHidden){
        settingsPanel.removeAttribute('hidden');
        settingsBtn.textContent = '⚙️ Close';
      } else {
        settingsPanel.setAttribute('hidden', '');
        settingsBtn.textContent = '⚙️ Settings';
      }
    });
  }
  
  // Chapter playback buttons
  const readChapterBtn = document.getElementById('readChapterBtn');
  const pauseChapterBtn = document.getElementById('pauseChapterBtn');
  const stopChapterBtn = document.getElementById('stopChapterBtn');
  
  if(readChapterBtn){
    readChapterBtn.addEventListener('click', ()=>{
      if(lastChapter && lastChapter.book && lastChapter.chapter){
        playChapter(lastChapter.book, lastChapter.chapter);
      } else if(activeBook){
        playChapter(activeBook.name, 1);
      }
    });
  }
  if(pauseChapterBtn){
    pauseChapterBtn.addEventListener('click', ()=>{
      if(chapterPlaying) pauseChapter(); else resumeChapter();
    });
  }
  if(stopChapterBtn){
    stopChapterBtn.addEventListener('click', stopChapter);
  }
  
  // Notes page button
  const notesPageBtn = document.getElementById('notesPageBtn');
  if(notesPageBtn){
    notesPageBtn.addEventListener('click', ()=>{
      showNotesPage();
    });
  }
}

function setupVoiceControls(){
  if(aiVoiceSelect){
    const saved = localStorage.getItem('bible_ai_voice') || 'onyx';
    aiVoiceSelect.value = saved;
    aiVoiceSelect.addEventListener('change', ()=>{
      localStorage.setItem('bible_ai_voice', aiVoiceSelect.value);
    });
  }
  if(rateRange && rateValue){
    const savedRate = parseFloat(localStorage.getItem('bible_ai_speed') || '1.0');
    rateRange.value = savedRate;
    rateValue.textContent = savedRate.toFixed(2) + 'x';
    rateRange.addEventListener('input', ()=>{
      localStorage.setItem('bible_ai_speed', rateRange.value);
      rateValue.textContent = parseFloat(rateRange.value).toFixed(2) + 'x';
    });
  }
}

// ---------------- AI TTS (per-verse) ----------------
let currentAudio = null;
let currentVerseId = null;
// chapter playback state
let lastChapter = null; // {book, chapter, verses}
let chapterQueue = [];
let chapterIndex = 0;
let chapterPlaying = false;

async function speakVerse(text, verseId, btn){
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

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text, voice, speed}),
    });
    if(!res.ok) throw new Error('TTS request failed');
    const blob = await res.blob();
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
    const voice = localStorage.getItem('bible_ai_voice') || 'onyx';
    const speed = parseFloat(localStorage.getItem('bible_ai_speed') || '1.0');
    const node = document.getElementById(verseId);
    try{
      if(btn) btn.classList.add('playing');
      if(node) node.classList.add('speaking');
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text, voice, speed}),
      });
      if(!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
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

// ---------------- Notes & Highlights ----------------
const notesPageBtn = document.getElementById('notesPageBtn');
const backToReader = document.getElementById('backToReader');
const noteModal = document.getElementById('noteModal');
const noteModalTitle = document.getElementById('noteModalTitle');
const noteInput = document.getElementById('noteInput');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const cancelNoteBtn = document.getElementById('cancelNoteBtn');

function openNoteModal(verseId, verseData){
  currentNoteVerseId = verseId;
  const existing = notes.find(n=> n.id === verseId);
  noteModalTitle.textContent = existing ? 'Edit Note' : 'Add Note';
  noteInput.value = existing ? existing.note : '';
  noteInput.placeholder = 'Enter your note...';
  noteModal.hidden = false;
}

function saveNote(){
  const noteText = noteInput.value.trim();
  if(!noteText || !currentNoteVerseId) return;
  const verseEl = document.getElementById(currentNoteVerseId);
  if(!verseEl) return;
  const book = lastChapter?.book || '';
  const chapter = lastChapter?.chapter || '';
  const verseNum = verseEl.querySelector('.verse-num')?.textContent || '';
  const verseText = verseEl.querySelector('.verse-text')?.textContent || '';
  
  const existing = notes.find(n=> n.id === currentNoteVerseId);
  if(existing){
    existing.note = noteText;
    existing.updated = new Date().toISOString();
  } else {
    notes.push({
      id: currentNoteVerseId,
      book, chapter, verse: verseNum, text: verseText, note: noteText,
      created: new Date().toISOString()
    });
  }
  localStorage.setItem('bible_notes', JSON.stringify(notes));
  noteModal.hidden = true;
  currentNoteVerseId = null;
  // update button style
  const btn = verseEl.querySelector('.note-btn');
  if(btn) btn.classList.add('has-note');
}

function addHighlight(verseId, verseData){
  const sel = window.getSelection().toString().trim();
  if(!sel) return;
  const existing = highlights.find(h=> h.id === verseId && h.text === sel);
  if(existing) return; // already highlighted
  highlights.push({
    id: verseId,
    book: verseData.book, chapter: verseData.chapter, verse: verseData.verse,
    text: sel, created: new Date().toISOString()
  });
  localStorage.setItem('bible_highlights', JSON.stringify(highlights));
  window.getSelection().removeAllRanges();
}

function showNotesPage(){
  const mainContainer = document.getElementById('mainContainer');
  const mainContent = document.getElementById('mainContent');
  const mainSidebar = document.getElementById('mainSidebar');
  const notesPage = document.getElementById('notesPage');
  
  if(mainContent) mainContent.style.display = 'none';
  if(mainSidebar) mainSidebar.style.display = 'none';
  if(charactersPage){
    charactersPage.hidden = true;
    charactersPage.style.display = 'none';
  }
  if(notesPage) {
    notesPage.hidden = false;
    notesPage.style.display = 'block';
  }
  // Restore container defaults for notes
  if(mainContainer){
    mainContainer.style.maxWidth = '';
    mainContainer.style.padding = '';
  }
  renderNotes();
}

function showReaderPage(){
  const mainContent = document.getElementById('mainContent');
  const mainSidebar = document.getElementById('mainSidebar');
  const notesPage = document.getElementById('notesPage');
  const container = document.getElementById('mainContainer');
  
  if(notesPage) {
    notesPage.hidden = true;
    notesPage.style.display = 'none';
  }
  if(charactersPage){
    charactersPage.hidden = true;
    charactersPage.style.display = 'none';
  }
  if(mainContent) mainContent.style.display = 'block';
  if(mainSidebar) mainSidebar.style.display = 'block';
  // Restore container defaults
  if(container){
    container.style.maxWidth = '';
    container.style.padding = '';
  }
}

function renderNotes(){
  const notesList = document.getElementById('notesList');
  const highlightsList = document.getElementById('highlightsList');
  notesList.innerHTML = '<h3>📝 Notes (' + notes.length + ')</h3>';
  if(notes.length === 0){
    notesList.innerHTML += '<p class="note-text">No notes yet. Click the 📝 button on any verse to add one.</p>';
  } else {
    notes.forEach(n=>{
      const div = el('div','note-item');
      const ref = el('div','note-ref', `${n.book} ${n.chapter}:${n.verse}`);
      const txt = el('div','note-text', `"${n.text}"`);
      const content = el('div','note-content', n.note);
      const actions = el('div','note-actions');
      const editBtn = el('button','btn-small', t('edit'));
      editBtn.addEventListener('click', ()=>{
        currentNoteVerseId = n.id;
        openNoteModal(n.id, n);
      });
      const deleteBtn = el('button','btn-small', t('delete'));
      deleteBtn.addEventListener('click', ()=>{
        notes = notes.filter(x=> x.id !== n.id);
        localStorage.setItem('bible_notes', JSON.stringify(notes));
        renderNotes();
      });
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      div.appendChild(ref);
      div.appendChild(txt);
      div.appendChild(content);
      div.appendChild(actions);
      notesList.appendChild(div);
    });
  }
  
  highlightsList.innerHTML = `<h3>✨ ${t('highlights')} (${highlights.length})</h3>`;
  if(highlights.length === 0){
    highlightsList.innerHTML += `<p class="note-text">${t('noHighlights')}</p>`;
  } else {
    highlights.forEach(h=>{
      const div = el('div','highlight-item');
      const ref = el('div','note-ref', `${h.book} ${h.chapter}:${h.verse}`);
      const txt = el('div','note-content', `"${h.text}"`);
      const actions = el('div','note-actions');
      const deleteBtn = el('button','btn-small', t('delete'));
      deleteBtn.addEventListener('click', ()=>{
        highlights = highlights.filter(x=> !(x.id === h.id && x.text === h.text));
        localStorage.setItem('bible_highlights', JSON.stringify(highlights));
        renderNotes();
      });
      actions.appendChild(deleteBtn);
      div.appendChild(ref);
      div.appendChild(txt);
      div.appendChild(actions);
      highlightsList.appendChild(div);
    });
  }
}

if(notesPageBtn) notesPageBtn.addEventListener('click', showNotesPage);
if(backToReader) backToReader.addEventListener('click', showReaderPage);
if(saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
if(cancelNoteBtn) cancelNoteBtn.addEventListener('click', ()=>{ noteModal.hidden = true; currentNoteVerseId = null; });
if(noteModal) noteModal.addEventListener('click', (e)=>{ if(e.target === noteModal){ noteModal.hidden = true; currentNoteVerseId = null; }});

// ---------------- Characters Feature ----------------
let characters = [];
let bookGroups = [];
let filteredCharacters = [];

const charactersPageBtn = document.getElementById('charactersPageBtn');
const backToReaderFromCharacters = document.getElementById('backToReaderFromCharacters');
const charactersPage = document.getElementById('charactersPage');
const charactersList = document.getElementById('charactersList');
const characterDetail = document.getElementById('characterDetail');
const characterDetailContent = document.getElementById('characterDetailContent');
const backToCharactersList = document.getElementById('backToCharactersList');
const bookFilter = document.getElementById('bookFilter');

async function loadCharacters(){
  try{
    const res = await fetch('characters.json');
    const data = await res.json();
    characters = data.characters || [];
    bookGroups = data.bookGroups || [];
    // Sort characters by number of appearances (most first)
    characters.sort((a, b) => (b.appearances?.length || 0) - (a.appearances?.length || 0));
    filteredCharacters = [...characters];
    populateBookFilter();
    // Automatically fetch images for characters that don't have one
    await fetchCharacterImages();
  }catch(e){
    console.warn('Could not load characters', e);
  }
}

// Fetch images from Wikimedia Commons API
async function fetchCharacterImages(){
  const imageCacheKey = 'bible_character_images';
  let imageCache = JSON.parse(localStorage.getItem(imageCacheKey) || '{}');
  
  for(let char of characters){
    if(char.image === 'placeholder' || !char.image){
      // Check cache first
      if(imageCache[char.name]){
        char.image = imageCache[char.name];
        continue;
      }
      
      // Try to fetch from Wikimedia Commons
      try{
        const searchTerm = `${char.name} biblical`;
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(char.name)}&pithumbsize=400&origin=*`;
        const response = await fetch(wikiUrl);
        const wikiData = await response.json();
        
        const pages = wikiData.query?.pages;
        if(pages){
          const pageId = Object.keys(pages)[0];
          const imageUrl = pages[pageId]?.thumbnail?.source;
          
          if(imageUrl && pageId !== '-1'){
            char.image = imageUrl;
            imageCache[char.name] = imageUrl;
            localStorage.setItem(imageCacheKey, JSON.stringify(imageCache));
            continue;
          }
        }
        
        // Fallback: Try Wikimedia Commons search
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=1&origin=*`;
        const commonsResponse = await fetch(commonsUrl);
        const commonsData = await commonsResponse.json();
        
        if(commonsData.query?.search?.[0]){
          const fileName = commonsData.query.search[0].title;
          const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=400&titles=${encodeURIComponent(fileName)}&origin=*`;
          const imageInfoResponse = await fetch(imageInfoUrl);
          const imageInfoData = await imageInfoResponse.json();
          
          const imagePages = imageInfoData.query?.pages;
          if(imagePages){
            const imagePageId = Object.keys(imagePages)[0];
            const thumbUrl = imagePages[imagePageId]?.imageinfo?.[0]?.thumburl;
            if(thumbUrl){
              char.image = thumbUrl;
              imageCache[char.name] = thumbUrl;
              localStorage.setItem(imageCacheKey, JSON.stringify(imageCache));
            }
          }
        }
      }catch(e){
        console.warn(`Could not fetch image for ${char.name}`, e);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Update the display if we're on the characters page
  if(charactersPage && !charactersPage.hidden){
    renderCharactersList();
  }
}

function populateBookFilter(){
  if(!bookFilter) return;
  bookFilter.innerHTML = '<option value="all">All Books</option>';
  
  // Add book groups
  bookGroups.forEach(group => {
    const opt = document.createElement('option');
    opt.value = 'group:' + group.name;
    opt.textContent = group.name;
    bookFilter.appendChild(opt);
  });
  
  // Add separator
  const separator = document.createElement('option');
  separator.disabled = true;
  separator.textContent = '───────────';
  bookFilter.appendChild(separator);
  
  // Add individual books (extract from characters' appearances)
  const booksSet = new Set();
  characters.forEach(char => {
    char.appearances?.forEach(app => {
      if(app.book) booksSet.add(app.book);
    });
  });
  const booksList = Array.from(booksSet).sort();
  booksList.forEach(book => {
    const opt = document.createElement('option');
    opt.value = 'book:' + book;
    opt.textContent = book;
    bookFilter.appendChild(opt);
  });
}

function filterCharacters(filterValue){
  if(filterValue === 'all'){
    filteredCharacters = [...characters];
  } else if(filterValue.startsWith('group:')){
    const groupName = filterValue.replace('group:', '');
    const group = bookGroups.find(g => g.name === groupName);
    if(group){
      filteredCharacters = characters.filter(char => {
        return char.appearances?.some(app => group.books.includes(app.book));
      });
    }
  } else if(filterValue.startsWith('book:')){
    const bookName = filterValue.replace('book:', '');
    filteredCharacters = characters.filter(char => {
      return char.appearances?.some(app => app.book === bookName);
    });
  }
  renderCharactersList();
}

function renderCharactersList(){
  if(!charactersList) return;
  charactersList.innerHTML = '';
  
  if(filteredCharacters.length === 0){
    charactersList.innerHTML = '<p class="no-characters">No characters found for this filter.</p>';
    return;
  }
  
  filteredCharacters.forEach(char => {
    const card = el('div', 'character-card');
    card.addEventListener('click', () => showCharacterDetail(char));
    
    // Circle image (with real image support or letter fallback)
    const imageCircle = el('div', 'character-image');
    if(char.image && char.image !== 'placeholder'){
      const img = document.createElement('img');
      img.src = char.image;
      img.alt = char.name;
      img.className = 'character-img';
      img.onerror = function(){
        // Fallback to letter if image fails to load
        this.style.display = 'none';
        imageCircle.textContent = char.name.charAt(0).toUpperCase();
      };
      imageCircle.appendChild(img);
    } else {
      imageCircle.textContent = char.name.charAt(0).toUpperCase();
    }
    
    // Character name
    const name = el('div', 'character-name', char.name);
    
    // Appearance count
    const count = el('div', 'character-count', `${char.appearances?.length || 0} appearances`);
    
    card.appendChild(imageCircle);
    card.appendChild(name);
    card.appendChild(count);
    charactersList.appendChild(card);
  });
}

function showCharacterDetail(char){
  if(!characterDetail || !characterDetailContent) return;
  
  let imageHTML = '';
  if(char.image && char.image !== 'placeholder'){
    imageHTML = `<img src="${char.image}" alt="${char.name}" class="character-img" onerror="this.style.display='none'; this.parentElement.textContent='${char.name.charAt(0).toUpperCase()}';">`;
  } else {
    imageHTML = char.name.charAt(0).toUpperCase();
  }
  
  let detailHTML = `
    <div class="character-detail-header">
      <div class="character-detail-image">${imageHTML}</div>
      <div class="character-detail-title">
        <h2>${char.name}</h2>
        <p class="character-detail-count">${char.appearances?.length || 0} appearances in the Bible</p>
      </div>
    </div>
    
    <div class="character-section">
      <h3>Description</h3>
      <p>${char.description || 'No description available.'}</p>
    </div>
    
    <div class="character-section">
      <h3>Key Facts</h3>
      <ul class="character-facts">
        ${char.facts?.map(fact => `<li>${fact}</li>`).join('') || '<li>No facts available.</li>'}
      </ul>
    </div>
    
    <div class="character-section">
      <h3>Bible Appearances</h3>
      <div class="character-appearances">
        ${char.appearances?.map(app => `
          <div class="appearance-item" data-book="${app.book}" data-chapter="${app.chapter}" data-verse="${app.verse}">
            <div class="appearance-ref">${app.book} ${app.chapter}:${app.verse}</div>
            <div class="appearance-text">"${app.text}"</div>
          </div>
        `).join('') || '<p>No appearances recorded.</p>'}
      </div>
    </div>
  `;
  
  characterDetailContent.innerHTML = detailHTML;
  charactersList.style.display = 'none';
  characterDetail.hidden = false;
  
  // Add click handlers to appearance items to navigate to verses
  document.querySelectorAll('.appearance-item').forEach(item => {
    item.addEventListener('click', () => {
      const book = item.getAttribute('data-book');
      const chapter = parseInt(item.getAttribute('data-chapter'));
      const verse = parseInt(item.getAttribute('data-verse'));
      
      // Go back to reader and load the chapter
      showReaderPage();
      fetchChapter(book, chapter);
      
      // Scroll to the specific verse after a delay
      setTimeout(() => {
        const bookSlug = slugify(book);
        const verseId = `verse-${bookSlug}-${chapter}-${verse}`;
        const verseEl = document.getElementById(verseId);
        if(verseEl){
          verseEl.scrollIntoView({behavior: 'smooth', block: 'center'});
          verseEl.classList.add('highlight');
          setTimeout(() => verseEl.classList.remove('highlight'), 3000);
        }
      }, 800);
    });
  });
}

function showCharactersPage(){
  const mainContent = document.getElementById('mainContent');
  const mainSidebar = document.getElementById('mainSidebar');
  const notesPage = document.getElementById('notesPage');
  const container = document.getElementById('mainContainer');
  
  if(mainContent) mainContent.style.display = 'none';
  if(mainSidebar) mainSidebar.style.display = 'none';
  if(notesPage){
    notesPage.hidden = true;
    notesPage.style.display = 'none';
  }
  if(charactersPage){
    charactersPage.hidden = false;
    charactersPage.style.display = 'block';
  }
  // Expand container for characters page
  if(container){
    container.style.maxWidth = '100%';
    container.style.padding = '0';
  }
  
  // Reset to characters list view
  if(charactersList) charactersList.style.display = 'grid';
  if(characterDetail) characterDetail.hidden = true;
  
  renderCharactersList();
}

if(charactersPageBtn){
  charactersPageBtn.addEventListener('click', showCharactersPage);
}

if(backToReaderFromCharacters){
  backToReaderFromCharacters.addEventListener('click', showReaderPage);
}

if(backToCharactersList){
  backToCharactersList.addEventListener('click', () => {
    if(charactersList) charactersList.style.display = 'grid';
    if(characterDetail) characterDetail.hidden = true;
  });
}

if(bookFilter){
  bookFilter.addEventListener('change', (e) => {
    filterCharacters(e.target.value);
  });
}

// Fetch images for Bible books from Wikipedia
async function fetchBookImages(){
  const imageCacheKey = 'bible_book_images';
  bookImages = JSON.parse(localStorage.getItem(imageCacheKey) || '{}');
  
  const allBooks = [];
  if(books.categories || books[0]?.books){
    const categories = books.categories || books;
    categories.forEach(category => {
      category.books?.forEach(b => allBooks.push(b));
    });
  } else {
    allBooks.push(...books);
  }
  
  let needsUpdate = false;
  
  for(let book of allBooks){
    if(!bookImages[book.name]){
      try{
        // Search Wikipedia for "Book of [Name]" or just the book name
        const searchTerm = book.name.includes('Psalm') ? 'Book of Psalms' : 
                          book.name.includes('Song') ? 'Song of Solomon' :
                          `Book of ${book.name}`;
        
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(searchTerm)}&pithumbsize=200&origin=*`;
        const response = await fetch(wikiUrl);
        const wikiData = await response.json();
        
        const pages = wikiData.query?.pages;
        if(pages){
          const pageId = Object.keys(pages)[0];
          const imageUrl = pages[pageId]?.thumbnail?.source;
          
          if(imageUrl && pageId !== '-1'){
            bookImages[book.name] = imageUrl;
            needsUpdate = true;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      }catch(e){
        console.warn(`Could not fetch image for ${book.name}`, e);
      }
    }
  }
  
  if(needsUpdate){
    localStorage.setItem(imageCacheKey, JSON.stringify(bookImages));
    renderBooks(); // Re-render to show images
  }
}

// Load characters data on startup
loadCharacters();

// Hero video controls
const heroVideo = document.getElementById('heroVideo');
const heroPlayPause = document.getElementById('heroPlayPause');
const heroMute = document.getElementById('heroMute');
const playPauseIcon = document.getElementById('playPauseIcon');
const muteIcon = document.getElementById('muteIcon');
const startReadingBtn = document.getElementById('startReadingBtn');

// Start Reading button - scroll to reading section
if(startReadingBtn){
  startReadingBtn.addEventListener('click', () => {
    const mainContent = document.getElementById('mainContent');
    if(mainContent){
      const headerHeight = document.querySelector('.topbar')?.offsetHeight || 0;
      const targetPosition = mainContent.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      
      // Focus search input after scroll
      setTimeout(() => {
        const searchInput = document.getElementById('searchInput');
        if(searchInput){
          searchInput.focus();
        }
      }, 600);
    }
  });
}

if(heroVideo && heroPlayPause){
  heroPlayPause.addEventListener('click', () => {
    if(heroVideo.paused){
      heroVideo.play();
      playPauseIcon.textContent = '⏸';
      heroPlayPause.setAttribute('aria-label', 'Pause video');
    } else {
      heroVideo.pause();
      playPauseIcon.textContent = '▶';
      heroPlayPause.setAttribute('aria-label', 'Play video');
    }
  });
}

if(heroVideo && heroMute){
  heroMute.addEventListener('click', () => {
    if(heroVideo.muted){
      heroVideo.muted = false;
      muteIcon.textContent = '🔊';
      heroMute.setAttribute('aria-label', 'Mute video');
    } else {
      heroVideo.muted = true;
      muteIcon.textContent = '🔇';
      heroMute.setAttribute('aria-label', 'Unmute video');
    }
  });
}

// Pause video when user scrolls away (performance)
let heroObserver = null;
if(heroVideo && 'IntersectionObserver' in window){
  heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting && !heroVideo.paused){
        heroVideo.pause();
        if(playPauseIcon) playPauseIcon.textContent = '▶';
      } else if(entry.isIntersecting && heroVideo.paused && !document.hidden){
        heroVideo.play().catch(() => {});
        if(playPauseIcon) playPauseIcon.textContent = '⏸';
      }
    });
  }, { threshold: 0.3 });
  
  heroObserver.observe(heroVideo);
}

// Pause video when page is hidden (battery saving)
document.addEventListener('visibilitychange', () => {
  if(heroVideo){
    if(document.hidden){
      heroVideo.pause();
    } else if(heroObserver && heroVideo.getBoundingClientRect().top < window.innerHeight * 0.7){
      heroVideo.play().catch(() => {});
    }
  }
});
