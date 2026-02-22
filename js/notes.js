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
  if(typeof window.scheduleUserStateSave === 'function') window.scheduleUserStateSave();
  noteModal.hidden = true;
  currentNoteVerseId = null;
  // update button style
  const btn = verseEl.querySelector('.note-btn');
  if(btn) btn.classList.add('has-note');
  renderRecentNotes();
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
  if(typeof window.scheduleUserStateSave === 'function') window.scheduleUserStateSave();
  const verseEl = document.getElementById(verseId);
  const textSpan = verseEl ? verseEl.querySelector('.verse-text') : null;
  if(textSpan){
    const rawText = textSpan.textContent || '';
    applyHighlightsToSpan(textSpan, verseId, rawText);
  }
  window.getSelection().removeAllRanges();
}

function showNotesPage(){
  const mainContainer = document.getElementById('mainContainer');
  const mainContent = document.getElementById('mainContent');
  const notesPage = document.getElementById('notesPage');
  
  if(mainContent) mainContent.style.display = 'none';
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
  renderRecentNotes();
}

function showReaderPage(){
  const mainContent = document.getElementById('mainContent');
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
  // Restore container defaults
  if(container){
    container.style.maxWidth = '';
    container.style.padding = '';
  }
  if(activeBook){
    openChapterDrawer(`${activeBook.name} chapters`);
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
        if(typeof window.scheduleUserStateSave === 'function') window.scheduleUserStateSave();
        renderNotes();
        renderRecentNotes();
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
        if(typeof window.scheduleUserStateSave === 'function') window.scheduleUserStateSave();
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
