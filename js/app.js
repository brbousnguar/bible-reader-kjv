const booksUrl = 'books.json';
let booksList, chapterPicker, versesEl, searchInput, searchBtn;
let aiVoiceSelect, rateRange;
let settingsBtn, settingsPanel, rateValue;
let chapterDrawer, drawerSubtitle;
let recentBooksSection, recentBooksGrid;
let recentNotesSection, recentNotesList;
let searchSection, searchMeta, resultsList, paginationEl;

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
const recentKey = 'bible_recent_books';
const readKey = 'bible_read_chapters';

function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text) e.textContent = text; return e }

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (ch)=>({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function createBookButton(book){
  const btn = document.createElement('button');
  btn.className = 'book-btn';
  btn.dataset.book = book.name;

  if(bookImages[book.name]){
    const img = document.createElement('img');
    img.src = bookImages[book.name];
    img.alt = book.name;
    img.className = 'book-img';
    img.onerror = function(){
      this.style.display = 'none';
    };
    btn.appendChild(img);
  } else {
    const icon = document.createElement('span');
    icon.className = 'book-icon';
    icon.textContent = '📖';
    btn.appendChild(icon);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'book-name';
  nameSpan.textContent = book.name;
  btn.appendChild(nameSpan);

  const progress = getBookProgress(book.name, book.chapters);
  if(progress.percent > 0){
    const prog = document.createElement('div');
    prog.className = 'book-progress';
    prog.innerHTML = `<span>${progress.percent}%</span><div class="book-progress-track"><div class="book-progress-fill" style="width:${progress.percent}%"></div></div>`;
    btn.appendChild(prog);
  }

  btn.addEventListener('click', ()=> showBookReview(book));
  return btn;
}

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
    renderRecentBooks();
    renderRecentNotes();
  } catch(e) {
    console.error('Error loading books:', e);
    if(booksList) {
      booksList.innerHTML = '<p class="muted">Error loading books: ' + e.message + '</p>';
    }
    renderRecentBooks();
    renderRecentNotes();
  }
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
        const btn = createBookButton(b);
        booksList.appendChild(btn);
      });
    });
  } else {
    // Fallback for old flat format
    books.forEach(b => {
      const btn = createBookButton(b);
      booksList.appendChild(btn);
    });
  }
}

// Show a quick review for the book in the main content area
function showBookReview(book){
  activeBook = book;
  document.querySelectorAll('.book-btn').forEach(n=> n.classList.toggle('active', n.dataset.book === book.name));
  
  const meta = bookMeta && bookMeta[book.name];
  openChapterDrawer(`${book.name} chapters`);
  updateRecentBooks(book.name);
  
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
    n.classList.toggle('active', n.dataset.book === book.name);
  });
  renderChapters(book);
  versesEl.innerHTML = `<p class="muted">Select a chapter in ${book.name}.</p>`;
  openChapterDrawer(`${book.name} chapters`);
  updateRecentBooks(book.name);
}

function renderChapters(book){
  chapterPicker.innerHTML = '';
  for(let i=1;i<=book.chapters;i++){
    const b = el('button','chapter-btn', i);
    b.addEventListener('click', ()=> fetchChapter(book.name, i, b));
    chapterPicker.appendChild(b);
  }
}

function getRecentBooks(){
  try{
    const data = JSON.parse(localStorage.getItem(recentKey) || '[]');
    return Array.isArray(data) ? data : [];
  }catch(e){
    return [];
  }
}

function setRecentBooks(list){
  localStorage.setItem(recentKey, JSON.stringify(list.slice(0, 6)));
}

function getReadMap(){
  try{
    const data = JSON.parse(localStorage.getItem(readKey) || '{}');
    return data && typeof data === 'object' ? data : {};
  }catch(e){
    return {};
  }
}

function setReadMap(map){
  localStorage.setItem(readKey, JSON.stringify(map || {}));
}

function markChapterRead(bookName, chapter){
  if(!bookName || !chapter) return;
  const map = getReadMap();
  const list = Array.isArray(map[bookName]) ? map[bookName] : [];
  if(!list.includes(Number(chapter))){
    list.push(Number(chapter));
    list.sort((a, b) => a - b);
    map[bookName] = list;
    setReadMap(map);
  }
}

function getBookProgress(bookName, totalChapters){
  const map = getReadMap();
  const list = Array.isArray(map[bookName]) ? map[bookName] : [];
  const total = Number(totalChapters) || 0;
  if(!total) return { percent: 0, read: 0, total: 0 };
  const percent = Math.min(100, Math.round((list.length / total) * 100));
  return { percent, read: list.length, total };
}

function updateRecentBooks(bookName){
  if(!bookName) return;
  const list = getRecentBooks().filter(n => n !== bookName);
  list.unshift(bookName);
  setRecentBooks(list);
  renderRecentBooks();
}

function renderRecentBooks(){
  if(!recentBooksSection || !recentBooksGrid) return;
  const list = getRecentBooks();
  if(list.length === 0){
    recentBooksSection.hidden = true;
    return;
  }
  recentBooksSection.hidden = false;
  recentBooksGrid.innerHTML = '';

  const allBooks = [];
  if(books.categories || books[0]?.books){
    const categories = books.categories || books;
    categories.forEach(category => category.books?.forEach(b => allBooks.push(b)));
  } else {
    allBooks.push(...books);
  }

  list.forEach(name => {
    const book = allBooks.find(b => b.name === name);
    if(book){
      recentBooksGrid.appendChild(createBookButton(book));
    }
  });
}

function renderRecentNotes(){
  if(!recentNotesSection || !recentNotesList) return;
  const sorted = [...notes].sort((a, b) => {
    const ad = new Date(a.updated || a.created || 0).getTime();
    const bd = new Date(b.updated || b.created || 0).getTime();
    return bd - ad;
  });
  const list = sorted.slice(0, 5);
  if(list.length === 0){
    recentNotesSection.hidden = true;
    recentNotesList.innerHTML = '';
    return;
  }
  recentNotesSection.hidden = false;
  recentNotesList.innerHTML = '';
  list.forEach(n => {
    const card = document.createElement('div');
    card.className = 'recent-note-card';
    card.innerHTML = `
      <div class="recent-note-ref">${escapeHtml(`${n.book} ${n.chapter}:${n.verse}`)}</div>
      <div class="recent-note-text">"${escapeHtml(n.text || '')}"</div>
      <div class="recent-note-content">${escapeHtml(n.note || '')}</div>
    `;
    card.addEventListener('click', ()=>{
      if(n.book && n.chapter){
        fetchChapter(n.book, n.chapter);
        setTimeout(()=>{
          const id = `verse-${slugify(n.book)}-${n.chapter}-${n.verse}`;
          const node = document.getElementById(id);
          if(node){
            node.scrollIntoView({behavior:'smooth', block:'center'});
            node.classList.add('highlight');
            setTimeout(()=> node.classList.remove('highlight'), 3000);
          }
        }, 800);
      }
    });
    recentNotesList.appendChild(card);
  });
}

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
  chapterDrawer = document.getElementById('chapterDrawer');
  drawerSubtitle = document.getElementById('drawerSubtitle');
  recentBooksSection = document.getElementById('recentBooks');
  recentBooksGrid = document.getElementById('recentBooksGrid');
  recentNotesSection = document.getElementById('recentNotes');
  recentNotesList = document.getElementById('recentNotesList');
  
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

function setupEventListeners(){
  // Search button
  if(searchBtn && searchInput){
    searchBtn.addEventListener('click', async ()=>{
      const ref = tryParseReference(searchInput.value);
      if(!ref) return;
      const refMatch = String(ref).trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if(refMatch){
        if(versesEl) versesEl.innerHTML = '<p class="muted">Loading...</p>';
        const bookName = refMatch[1];
        const chapterVerse = refMatch[2] + (refMatch[3] ? `:${refMatch[3]}` : '');
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

function openChapterDrawer(subtitleText){
  if(!chapterDrawer) return;
  if(drawerSubtitle) drawerSubtitle.textContent = subtitleText || 'Select a book to load chapters.';
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
    renderRecentBooks();
  }
}
