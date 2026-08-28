/* Shared photo-card interaction: per-page preload, cancellable narration/SE. */
(() => {
  const bgm = document.getElementById('bgm');
  bgm.volume = 0.25;
  bgm.dataset.normalVolume = '0.25';
  const tryPlayBgm = () => bgm.play().catch(() => {});
  tryPlayBgm();
  document.addEventListener('click', tryPlayBgm, { once: true });
  document.addEventListener('touchstart', tryPlayBgm, { once: true, passive: true });
  ZukanFX.initToggle(document.getElementById('fxToggle'));

  const audioCache = new Map();
  function getAudio(src) {
    if (!audioCache.has(src)) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioCache.set(src, audio);
    }
    return audioCache.get(src);
  }
  const cards = Array.from(document.querySelectorAll('main > .card'));
  function preloadCards(visibleCards) {
    const needed = new Set(visibleCards.flatMap(card =>
      [card.dataset.sound, card.dataset.se].filter(Boolean)));
    for (const [src, audio] of audioCache) {
      if (!needed.has(src)) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audioCache.delete(src);
      }
    }
    needed.forEach(getAudio);
  }
  const overlay = document.getElementById('overlay');
  const overlayImg = document.getElementById('overlay-img');
  const overlayLbl = document.getElementById('overlay-label');
  let isOpen = false;
  const playback = createVehiclePlayback({ bgm, getAudio, onClose: closeOverlay });
  function closeOverlay() {
    playback.stop();
    overlay.classList.remove('active');
    isOpen = false;
  }
  function openOverlay(card) {
    if (isOpen || card.hidden) return;
    isOpen = true;
    const img = card.querySelector('.card-img');
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
    overlayImg.style.animation = 'none';
    void overlayImg.offsetHeight;
    overlayImg.style.animation = '';
    overlayImg.src = img.src;
    overlayImg.alt = img.alt;
    overlayLbl.textContent = card.dataset.label;
    overlay.classList.add('active');
    ZukanFX.burst(overlay, card);
    playback.start(card.dataset.sound, card.dataset.se);
  }
  cards.forEach(card => card.addEventListener('click', () => {
    ZukanFX.tap(card);
    openOverlay(card);
  }));
  overlay.addEventListener('click', closeOverlay);
  document.addEventListener('visibilitychange', () => { if (document.hidden) closeOverlay(); });
  window.addEventListener('pagehide', closeOverlay);
  document.addEventListener('zukan-page-change', event => {
    closeOverlay();
    preloadCards(event.detail.visibleCards);
  });
  preloadCards(cards.slice(0, 6));
})();
