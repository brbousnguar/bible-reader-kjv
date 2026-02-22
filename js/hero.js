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
