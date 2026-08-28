// Sequential speech/vehicle sound playback. Every callback belongs to one session.
window.createVehiclePlayback = function ({ bgm, getAudio, onClose }) {
  const normalVolume = Number(bgm.dataset.normalVolume || bgm.volume);
  let session = 0;
  let current = null;
  let timer = null;
  function stop() {
    session++;
    clearTimeout(timer);
    timer = null;
    if (current) {
      current.onended = current.onerror = null;
      current.pause();
      current.currentTime = 0;
      current = null;
    }
    bgm.volume = normalVolume;
  }
  function start(voiceSrc, effectSrc) {
    stop();
    const id = session;
    bgm.volume = Math.min(normalVolume, 0.04);
    function finished() {
      if (id !== session) return;
      bgm.volume = normalVolume;
      timer = setTimeout(() => { if (id === session) onClose(); }, 2000);
    }
    function playOne(src, next) {
      if (id !== session) return;
      if (!src) { next(); return; }
      const audio = getAudio(src);
      current = audio;
      let done = false;
      function advance() {
        if (done || id !== session) return;
        done = true;
        clearTimeout(timer);
        audio.onended = audio.onerror = null;
        audio.pause();
        current = null;
        next();
      }
      audio.onended = audio.onerror = advance;
      audio.currentTime = 0;
      timer = setTimeout(advance, 12000);
      audio.play().catch(advance);
    }
    playOne(voiceSrc, () => playOne(effectSrc, finished));
  }
  return { start, stop };
};
