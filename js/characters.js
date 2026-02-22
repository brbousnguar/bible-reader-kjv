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
  const notesPage = document.getElementById('notesPage');
  const container = document.getElementById('mainContainer');

  if(mainContent) mainContent.style.display = 'none';
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

// Load characters data on startup
loadCharacters();
