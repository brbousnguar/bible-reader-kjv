// Set KJV as default version
localStorage.setItem('bible_version', 'kjv');
localStorage.setItem('bible_version_selected', 'true');

const booksUrl = 'books.json';
let booksList, chapterPicker, versesEl, searchInput, searchBtn;
let voiceSelect, rateRange, pitchRange, cloudToggle, cloudProvider, cloudVoice;
let settingsBtn, settingsPanel, rateValue, pitchValue, translationSelect;

// Bible Version configuration - King James Version only
const bibleVersions = {
  kjv: { 
    code: 'kjv', 
    name: 'King James Version', 
    displayName: 'KJV (English)',
    apiBase: 'https://bible-api.com',
    apiMethod: 'bible-api'
  }
};

// API helper functions
function getApiUrl(book, chapter, version){
  const v = bibleVersions[version] || bibleVersions.kjv;
  
  if(v.apiMethod === 'bible-api'){
    // bible-api.com format: https://bible-api.com/Genesis%201?translation=kjv
    const ref = `${book} ${chapter}`;
    return `${v.apiBase}/${encodeURIComponent(ref)}?translation=${v.code}`;
  }
  
  // Can add other API formats here in the future
  return null;
}

// Always use KJV
const currentBibleVersion = bibleVersions.kjv;

// Notes & highlights state
let notes = JSON.parse(localStorage.getItem('bible_notes') || '[]');
let highlights = JSON.parse(localStorage.getItem('bible_highlights') || '[]');
let currentNoteVerseId = null;

let books = [];
let activeBook = null;
let flatChapters = []; // flattened list of all chapters in order
let bookMeta = {};

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
}

// populate voice selector and wire controls
function populateVoiceList(){
  if(!voiceSelect) return;
  const voices = speechSynthesis.getVoices() || [];
  const cur = localStorage.getItem('bible_voice') || '';
  voiceSelect.innerHTML = '';
  voices.forEach(v=>{
    const opt = document.createElement('option');
    opt.value = v.name || `${v.lang}-${v.name}`;
    opt.textContent = `${v.name} (${v.lang})`;
    if(opt.value === cur) opt.selected = true;
    voiceSelect.appendChild(opt);
  });
  // set rate/pitch from storage
  const r = parseFloat(localStorage.getItem('bible_rate') || rateRange.value);
  const p = parseFloat(localStorage.getItem('bible_pitch') || pitchRange.value);
  rateRange.value = r;
  pitchRange.value = p;
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
      
      // Add books in this category
      if(category.books && Array.isArray(category.books)) {
        category.books.forEach(b => {
          const btn = el('button','book-btn', b.name);
          btn.addEventListener('click', ()=> {
            showBookReview(b);
          });
          booksList.appendChild(btn);
        });
      }
    });
  } else {
    // Fallback for old flat format
    if(Array.isArray(books)) {
      books.forEach(b => {
        const btn = el('button','book-btn', b.name);
        btn.addEventListener('click', ()=> {
          showBookReview(b);
        });
        booksList.appendChild(btn);
      });
    }
  }
}

// Show a quick review modal for the book; user can then choose to view chapters
function showBookReview(book){
  const modal = document.getElementById('reviewModal');
  const title = document.getElementById('reviewTitle');
  const author = document.getElementById('reviewAuthor');
  const when = document.getElementById('reviewWhen');
  const celeb = document.getElementById('reviewCeleb');
  const impact = document.getElementById('reviewImpact');
  title.textContent = `${book.name} — Quick Review`;
  const meta = bookMeta && bookMeta[book.name];
  author.textContent = meta && meta.author ? meta.author : 'No summary available';
  when.textContent = meta && meta.when ? meta.when : '—';
  celeb.textContent = meta && meta.celebrity ? meta.celebrity : '—';
  impact.textContent = meta && meta.impact ? meta.impact : '—';
  modal.removeAttribute('hidden');

  // wire buttons
  const showBtn = document.getElementById('showChaptersBtn');
  const closeBtn = document.getElementById('closeReviewBtn');

  function cleanup(){
    showBtn.removeEventListener('click', onShow);
    closeBtn.removeEventListener('click', onClose);
    modal.removeEventListener('click', onOutside);
  }

  function onShow(){
    cleanup();
    modal.setAttribute('hidden','');
    // Ensure book has originalName for API calls
    if(!book.originalName){
      book.originalName = book.name;
    }
    selectBook(book);
  }
  function onClose(){
    cleanup();
    modal.setAttribute('hidden','');
  }
  function onOutside(e){
    if(e.target === modal){
      onClose();
    }
  }

  showBtn.addEventListener('click', onShow);
  closeBtn.addEventListener('click', onClose);
  modal.addEventListener('click', onOutside);
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

// Helper function to fetch verses from bible-api.com
async function fetchVerses(ref){
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`;
  const r = await fetch(url);
  if(!r.ok) return null;
  return await r.json();
}

async function fetchChapter(book, chapter, btn){
  if(btn) document.querySelectorAll('.chapter-btn').forEach(n=> n.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // Enhanced loading state
  versesEl.innerHTML = '<div class="muted" style="text-align:center;padding:40px;"><div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(139,94,52,0.2);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;"></div><p style="margin-top:16px;">Loading chapter...</p></div>';
  
  const ref = `${book} ${chapter}`;
  const savedVersion = localStorage.getItem('bible_version') || 'kjv';
  
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
      const id = `verse-${slugify(data.book_name || data.reference || '')}-${data.chapter || ''}-${v.verse}`;
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
        openNoteModal(id, {book: data.book_name || (data.reference||'').split(' ')[0], chapter: data.chapter || '', verse: v.verse, text: v.text});
      });
      p.appendChild(noteBtn);
      const num = el('span','verse-num', v.verse);
      p.appendChild(num);
      const textNode = document.createElement('span');
      textNode.className = 'verse-text';
      textNode.textContent = v.text;
      // enable text selection for highlighting
      textNode.addEventListener('mouseup', ()=>{
        const selection = window.getSelection();
        if(selection && selection.toString().trim().length > 0){
          addHighlight(id, {book: data.book_name || (data.reference||'').split(' ')[0], chapter: data.chapter || '', verse: v.verse, text: selection.toString()});
        }
      });
      p.appendChild(textNode);
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
  voiceSelect = document.getElementById('voiceSelect');
  rateRange = document.getElementById('rateRange');
  pitchRange = document.getElementById('pitchRange');
  cloudToggle = document.getElementById('cloudToggle');
  cloudProvider = document.getElementById('cloudProvider');
  cloudVoice = document.getElementById('cloudVoice');
  settingsBtn = document.getElementById('settingsBtn');
  settingsPanel = document.getElementById('settingsPanel');
  rateValue = document.getElementById('rateValue');
  pitchValue = document.getElementById('pitchValue');
  translationSelect = document.getElementById('translationSelect');
  
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
  
  if(readChapterBtn && activeBook){
    readChapterBtn.addEventListener('click', ()=>{
      if(activeBook && activeBook.chapters){
        const firstChapter = 1;
        playChapter(activeBook.name, firstChapter);
      }
    });
  }
  if(pauseChapterBtn){
    pauseChapterBtn.addEventListener('click', pauseChapter);
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
  if(window.speechSynthesis){
    populateVoiceList();
    speechSynthesis.addEventListener('voiceschanged', populateVoiceList);
  }

  if(voiceSelect){
    voiceSelect.addEventListener('change', ()=>{
      localStorage.setItem('bible_voice', voiceSelect.value);
    });
  }
  if(rateRange && rateValue){ 
    rateRange.addEventListener('input', ()=> {
      localStorage.setItem('bible_rate', rateRange.value);
      rateValue.textContent = parseFloat(rateRange.value).toFixed(2) + 'x';
    });
    rateValue.textContent = parseFloat(rateRange.value).toFixed(2) + 'x';
  }
  if(pitchRange && pitchValue){ 
    pitchRange.addEventListener('input', ()=> {
      localStorage.setItem('bible_pitch', pitchRange.value);
      pitchValue.textContent = parseFloat(pitchRange.value).toFixed(2) + 'x';
    });
    pitchValue.textContent = parseFloat(pitchRange.value).toFixed(2) + 'x';
  }
}

// ---------------- Speech (per-verse) ----------------
let currentUtterance = null;
let currentVerseId = null;
// chapter playback state
let lastChapter = null; // {book, chapter, verses}
let chapterQueue = [];
let chapterIndex = 0;
let chapterPlaying = false;

function getPreferredMaleVoice(){
  const voices = speechSynthesis.getVoices() || [];
  const preferred = ['Daniel','David','John','Alex','Zachary','Fred','Google US English','Microsoft David'];
  for(const name of preferred){
    const v = voices.find(x=> x.name && x.name.includes(name));
    if(v) return v;
  }
  // fallback: first english voice
  const en = voices.find(x=> x.lang && x.lang.startsWith('en'));
  return en || voices[0] || null;
}

// expose available voices for debugging
window.__bible_voices = ()=> (speechSynthesis.getVoices()||[]).map(v=> ({name:v.name, lang:v.lang}));

function speakVerse(text, verseId, btn){
  // if cloud toggle enabled, use cloud TTS
  try{
    if(cloudToggle && cloudToggle.checked){
      const provider = (cloudProvider && cloudProvider.value) || 'google';
      const cv = (cloudVoice && cloudVoice.value) || '';
      fetchAndPlayCloud(text, provider, cv, verseId, btn);
      return;
    }
  }catch(e){}
  // stop if same verse is playing -> cancel
  if(currentVerseId === verseId){
    speechSynthesis.cancel();
    currentVerseId = null;
    if(btn) btn.classList.remove('playing');
    return;
  }
  // cancel any previous
  speechSynthesis.cancel();
  if(btn) document.querySelectorAll('.play-btn.playing').forEach(b=> b.classList.remove('playing'));

  const utter = new SpeechSynthesisUtterance(text);
  // use chosen rate/pitch if available
  const storedRate = parseFloat(localStorage.getItem('bible_rate')) || 0.95;
  const storedPitch = parseFloat(localStorage.getItem('bible_pitch')) || 1.0;
  utter.rate = storedRate;
  utter.pitch = storedPitch;
  utter.lang = 'en-US';
  // prefer selected voice
  let selectedVoice = null;
  try{
    const chosen = localStorage.getItem('bible_voice');
    if(chosen){
      const voices = speechSynthesis.getVoices() || [];
      selectedVoice = voices.find(v=> v.name === chosen || `${v.lang}-${v.name}` === chosen) || null;
    }
  }catch(e){ selectedVoice = null }
  if(selectedVoice) utter.voice = selectedVoice; else {
    const voice = getPreferredMaleVoice();
    if(voice) utter.voice = voice;
  }

  utter.onstart = ()=>{
    currentUtterance = utter;
    currentVerseId = verseId;
    if(btn) btn.classList.add('playing');
    const node = document.getElementById(verseId);
    if(node) node.classList.add('speaking');
  };
  utter.onend = ()=>{
    if(btn) btn.classList.remove('playing');
    const node = document.getElementById(verseId);
    if(node) node.classList.remove('speaking');
    currentUtterance = null;
    currentVerseId = null;
  };
  utter.onerror = ()=>{
    if(btn) btn.classList.remove('playing');
    const node = document.getElementById(verseId);
    if(node) node.classList.remove('speaking');
    currentUtterance = null;
    currentVerseId = null;
  };
  // ensure voices are loaded
  if((speechSynthesis.getVoices()||[]).length === 0){
    speechSynthesis.addEventListener('voiceschanged', ()=>{
      const v = getPreferredMaleVoice(); if(v) utter.voice = v; speechSynthesis.speak(utter);
    }, {once:true});
  } else {
    speechSynthesis.speak(utter);
  }
}

// ---------------- Cloud TTS client ----------------
async function fetchAndPlayCloud(text, provider, voiceName, verseId, btn){
  try{
    const body = { text, provider, voice: voiceName, rate: parseFloat(localStorage.getItem('bible_rate')||rateRange.value), pitch: parseFloat(localStorage.getItem('bible_pitch')||pitchRange.value) };
    const res = await fetch('http://localhost:3000/tts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if(!res.ok) throw new Error('TTS failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    // UI
    if(btn) btn.classList.add('playing');
    const node = document.getElementById(verseId); if(node) node.classList.add('speaking');
    await playAudioElement(audio);
    if(btn) btn.classList.remove('playing');
    if(node) node.classList.remove('speaking');
    URL.revokeObjectURL(url);
  }catch(err){
    console.warn('Cloud TTS error', err);
  }
}

function playAudioElement(audio){
  return new Promise((resolve,reject)=>{
    audio.addEventListener('ended', ()=> resolve());
    audio.addEventListener('error', (e)=> reject(e));
    audio.play().catch(reject);
  });
}

// ---------------- Chapter playback ----------------
const readBtn = document.getElementById('readChapterBtn');
const pauseBtn = document.getElementById('pauseChapterBtn');
const stopBtn = document.getElementById('stopChapterBtn');

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

function readNextInChapter(){
  if(!chapterPlaying) return;
  if(chapterIndex >= chapterQueue.length){ chapterPlaying = false; return; }
  const item = chapterQueue[chapterIndex];
  // highlight
  document.querySelectorAll('.verse.speaking').forEach(n=> n.classList.remove('speaking'));
  const node = document.getElementById(item.id);
  if(node) node.classList.add('speaking');
  // create utterance and play, advancing index on end
  const utter = new SpeechSynthesisUtterance(item.text);
  const storedRate = parseFloat(localStorage.getItem('bible_rate')) || 0.95;
  const storedPitch = parseFloat(localStorage.getItem('bible_pitch')) || 1.0;
  utter.rate = storedRate; utter.pitch = storedPitch; utter.lang = 'en-US';
  try{ const chosen = localStorage.getItem('bible_voice'); if(chosen){ const voices = speechSynthesis.getVoices()||[]; const sel = voices.find(v=> v.name===chosen||`${v.lang}-${v.name}`===chosen); if(sel) utter.voice = sel; } }catch(e){}
  utter.onend = ()=>{
    // remove speaking highlight
    const n = document.getElementById(item.id); if(n) n.classList.remove('speaking');
    chapterIndex++;
    // small gap between verses
    setTimeout(()=>{ if(chapterPlaying) readNextInChapter(); }, 220);
  };
  utter.onerror = ()=>{ chapterPlaying = false; };
  // play
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function pauseChapter(){
  if(speechSynthesis.speaking && !speechSynthesis.paused){ speechSynthesis.pause(); }
}
function resumeChapter(){
  if(speechSynthesis.paused){ speechSynthesis.resume(); }
}
function stopChapter(){
  chapterPlaying = false; chapterQueue = []; chapterIndex = 0; speechSynthesis.cancel();
  document.querySelectorAll('.verse.speaking').forEach(n=> n.classList.remove('speaking'));
}

if(readBtn) readBtn.addEventListener('click', ()=>{
  // if a chapter is currently shown, use it; otherwise use activeBook and first chapter
  if(lastChapter && lastChapter.book && lastChapter.chapter){ playChapter(lastChapter.book, lastChapter.chapter); }
  else if(activeBook){ playChapter(activeBook.name, 1); }
});
if(pauseBtn) pauseBtn.addEventListener('click', ()=>{
  if(speechSynthesis.paused) resumeChapter(); else pauseChapter();
});
if(stopBtn) stopBtn.addEventListener('click', ()=> stopChapter());

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
  if(notesPage) {
    notesPage.hidden = false;
    notesPage.style.display = 'block';
  }
  renderNotes();
}

function showReaderPage(){
  const mainContent = document.getElementById('mainContent');
  const mainSidebar = document.getElementById('mainSidebar');
  const notesPage = document.getElementById('notesPage');
  
  if(notesPage) {
    notesPage.hidden = true;
    notesPage.style.display = 'none';
  }
  if(mainContent) mainContent.style.display = 'block';
  if(mainSidebar) mainSidebar.style.display = 'block';
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

// Add spin animation for loading spinner
if(!document.getElementById('loadingStyles')){
  const style = document.createElement('style');
  style.id = 'loadingStyles';
  style.textContent = '@keyframes spin{to{transform:rotate(360deg);}}';
  document.head.appendChild(style);
}

// Enhanced button click feedback with ripple effect
document.addEventListener('click', (e)=>{
  if(e.target.matches('button, .book-btn, .chapter-btn, .nav-btn')){
    // Ripple effect for primary buttons
    if(e.target.matches('.btn-primary, .search button, .chapter-btn.active')){
      const ripple = document.createElement('span');
      const rect = e.target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255,255,255,0.4)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'ripple 0.6s ease-out';
      ripple.style.pointerEvents = 'none';
      ripple.style.zIndex = '1000';
      
      const originalPosition = e.target.style.position;
      const originalOverflow = e.target.style.overflow;
      e.target.style.position = 'relative';
      e.target.style.overflow = 'hidden';
      e.target.appendChild(ripple);
      
      setTimeout(()=> {
        ripple.remove();
        e.target.style.position = originalPosition;
        e.target.style.overflow = originalOverflow;
      }, 600);
    }
  }
});

// Add ripple animation
if(!document.getElementById('rippleStyles')){
  const style = document.createElement('style');
  style.id = 'rippleStyles';
  style.textContent = '@keyframes ripple{to{transform:scale(4);opacity:0;}}';
  document.head.appendChild(style);
}

// Enhanced search input with visual feedback
let searchTimeout;
if(searchInput){
  searchInput.addEventListener('input', ()=>{
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(()=>{
      if(searchInput.value.trim().length > 2){
        searchInput.style.borderColor = 'var(--accent)';
        setTimeout(()=>{
          if(document.activeElement !== searchInput){
            searchInput.style.borderColor = '';
          }
        }, 2000);
      }
    }, 300);
  });
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e)=>{
  // Escape to close modals
  if(e.key === 'Escape'){
    const noteModal = document.getElementById('noteModal');
    if(noteModal && !noteModal.hasAttribute('hidden')){
      noteModal.hidden = true;
      currentNoteVerseId = null;
    }
    const reviewModal = document.getElementById('reviewModal');
    if(reviewModal && !reviewModal.hasAttribute('hidden')){
      reviewModal.hidden = true;
    }
  }
  // Ctrl/Cmd + K to focus search
  if((e.ctrlKey || e.metaKey) && e.key === 'k'){
    e.preventDefault();
    if(searchInput) searchInput.focus();
  }
});
