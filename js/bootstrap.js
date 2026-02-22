// Initialize after all scripts are loaded.
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
