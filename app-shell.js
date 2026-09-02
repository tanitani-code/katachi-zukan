(() => {
  const isTop = /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith("/");
  const pageName = isTop
    ? "top"
    : (location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  document.documentElement.classList.add(isTop ? "zukan-top" : "zukan-category");
  document.body.classList.add(isTop ? "zukan-top" : "zukan-category");
  document.documentElement.classList.add(`zukan-page-${pageName}`);
  document.body.classList.add("zukan-scene", `zukan-page-${pageName}`);

  const controlIcons = {
    back: `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="icon-sketch" d="M18 17c9 9 18 20 29 31M47 16C38 26 28 38 17 48"/></svg>`,
    soundOn: `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="icon-fill" d="M14 27h10l13-11v32L24 38H14z"/><path class="icon-sketch" d="M43 25c5 4 5 10 0 14M49 19c10 8 10 19 0 27"/></svg>`,
    soundOff: `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="icon-fill" d="M14 27h10l13-11v32L24 38H14z"/><path class="icon-sketch" d="M44 25l13 14M57 25L44 39"/></svg>`,
    exit: `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="door" d="M17 10h29v44H17z"/><circle class="knob" cx="39" cy="33" r="3"/><path class="icon-sketch" d="M10 32h18M21 24l8 8-8 8"/></svg>`
  };

  const backControl = document.querySelector(".nav-back");
  if (backControl) {
    backControl.classList.add("illustrated-control", "illustrated-back");
    backControl.innerHTML = controlIcons.back;
    backControl.setAttribute("aria-label", "トップへ戻る");
  }

  const BGM_MUTED_KEY = "hajimete-zukan-bgm-muted";
  const bgmElement = document.getElementById("bgm");
  try {
    if (bgmElement) bgmElement.muted = localStorage.getItem(BGM_MUTED_KEY) === "true";
  } catch (_) {}

  const oldBgmControl = document.querySelector(".bgm-toggle");
  const bgmControl = oldBgmControl?.cloneNode(true) || null;
  if (oldBgmControl && bgmControl) oldBgmControl.replaceWith(bgmControl);

  function paintBgmControl() {
    if (!bgmControl) return;
    const bgm = document.getElementById("bgm");
    const muted = Boolean(bgm?.muted);
    bgmControl.classList.add("illustrated-control", "illustrated-bgm");
    bgmControl.innerHTML = muted ? controlIcons.soundOff : controlIcons.soundOn;
    bgmControl.setAttribute("aria-pressed", String(muted));
    bgmControl.setAttribute("aria-label", muted ? "BGMをつける" : "BGMを消す");
  }
  paintBgmControl();
  // Settings can change on the parent page while this page is in the back-forward cache.
  function restoreBgmPreference() {
    try {
      if (bgmElement) bgmElement.muted = localStorage.getItem(BGM_MUTED_KEY) === "true";
      paintBgmControl();
    } catch (_) {}
  }
  window.addEventListener('pageshow', restoreBgmPreference);
  window.addEventListener('storage', (event) => {
    if (event.key === BGM_MUTED_KEY || event.key === null) restoreBgmPreference();
  });
  bgmControl?.addEventListener("click", () => {
    const bgm = document.getElementById("bgm");
    if (!bgm) return;
    bgm.muted = !bgm.muted;
    try { localStorage.setItem(BGM_MUTED_KEY, String(bgm.muted)); } catch (_) {}
    if (!bgm.muted) bgm.play().catch(() => {});
    paintBgmControl();
  });

  const heading = document.querySelector("header h1");
  if (heading) {
    const titleImage = document.createElement("img");
    titleImage.className = "header-title-art";
    titleImage.src = `images/headers/${pageName}.png`;
    titleImage.alt = heading.textContent.trim();
    heading.classList.add("has-title-art");
    heading.textContent = "";
    heading.appendChild(titleImage);
  }

  if (!isTop) {
    const backButton = document.querySelector(".nav-back");
    const footer = document.querySelector("footer");
    if (backButton && footer) {
      footer.textContent = "";
      footer.classList.add("bottom-nav");
      footer.appendChild(backButton);
    }
  }

  const capacitor = window.Capacitor;
  const isAndroidApp =
    capacitor &&
    typeof capacitor.isNativePlatform === "function" &&
    capacitor.isNativePlatform() &&
    capacitor.getPlatform() === "android";

  const activeMedia = new Set();
  const nativePlay = HTMLMediaElement.prototype.play;

  HTMLMediaElement.prototype.play = function (...args) {
    activeMedia.add(this);
    return nativePlay.apply(this, args);
  };

  document.querySelectorAll("audio, video").forEach((media) => activeMedia.add(media));

  if (isTop) {
    const titleSounds = {
      umi: "sounds/title_umi.mp3",
      tabemono: "sounds/title_tabemono.mp3",
      mushi: "sounds/title_mushi.mp3",
      minomawari: "sounds/title_minomawari.mp3",
      katachi: "sounds/title_katachi.mp3",
      iro: "sounds/title_iro.mp3",
      kazu: "sounds/title_kazu.mp3",
      kudamono: "sounds/title_kudamono.mp3",
      yasai: "sounds/title_yasai.mp3",
      doubutsu: "sounds/title_doubutsu.mp3",
      norimono: "sounds/title_norimono.mp3"
    };
    const titleAudioCache = new Map();
    let currentTitleVoice = null;
    let titleSession = 0;
    let originalBgmVolume = null;
    let navigating = false;
    // Back/forward cache restores JavaScript state, including the navigation lock.
    window.addEventListener("pageshow", () => {
      navigating = false;
      titleSession++;
      currentTitleVoice?.pause();
      currentTitleVoice = null;
      if (originalBgmVolume !== null && bgmElement) bgmElement.volume = originalBgmVolume;
      originalBgmVolume = null;
      document.querySelectorAll(".category-announcing").forEach(card => card.classList.remove("category-announcing"));
    });

    function getTitleAudio(src) {
      if (!titleAudioCache.has(src)) {
        const audio = new Audio(src);
        audio.preload = "auto";
        titleAudioCache.set(src, audio);
        activeMedia.add(audio);
      }
      return titleAudioCache.get(src);
    }

    function playTitleVoice(src, onEnd, onStart) {
      const mySession = ++titleSession;
      if (currentTitleVoice) currentTitleVoice.pause();
      const voice = getTitleAudio(src);
      const bgm = document.getElementById("bgm");
      if (bgm && originalBgmVolume === null) originalBgmVolume = bgm.volume;
      if (bgm && !bgm.muted) bgm.volume = Math.min(bgm.volume, 0.06);
      currentTitleVoice = voice;
      voice.currentTime = 0;

      let finished = false;
      function finish() {
        if (finished || mySession !== titleSession) return;
        finished = true;
        if (bgm && originalBgmVolume !== null) bgm.volume = originalBgmVolume;
        originalBgmVolume = null;
        currentTitleVoice = null;
        onEnd?.();
      }

      voice.onended = finish;
      voice.onerror = finish;
      nativePlay.call(voice).then(() => onStart?.()).catch(finish);
      setTimeout(finish, 3500);
    }

    Object.values(titleSounds).forEach(getTitleAudio);
    getTitleAudio("sounds/title_top.mp3?v=20260828-accent");

    const introKey = "zukan-intro-played";
    function tryIntro(event) {
      if (sessionStorage.getItem(introKey) || event?.target?.closest?.(".card, button, a")) return;
      playTitleVoice(
        "sounds/title_top.mp3?v=20260828-accent",
        null,
        () => sessionStorage.setItem(introKey, "1")
      );
    }

    setTimeout(() => tryIntro(), 350);
    document.addEventListener("pointerdown", tryIntro, { once: true, passive: true });

    document.querySelectorAll(".card[data-cat]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (navigating) {
          event.preventDefault();
          return;
        }
        const category = card.dataset.cat;
        const src = titleSounds[category];
        if (!src) return;
        event.preventDefault();
        navigating = true;
        sessionStorage.setItem(introKey, "1");
        card.classList.add("category-announcing");
        navigator.vibrate?.(35);
        playTitleVoice(src, () => location.assign(card.href));
      });
    });
  }

  let resumeBgm = false;
  function pauseForBackground() {
    const bgm = document.getElementById("bgm");
    if (bgm && !bgm.paused && !bgm.muted) resumeBgm = true;
    document.querySelector("#overlay.active")?.click();
    const normalVolume = Number(bgm?.dataset.normalVolume);
    if (bgm && Number.isFinite(normalVolume)) bgm.volume = normalVolume;
    activeMedia.forEach((media) => {
      if (!media.paused) media.pause();
    });
  }

  function resumeAfterBackground() {
    const bgm = document.getElementById("bgm");
    if (resumeBgm && bgm && !bgm.muted) {
      resumeBgm = false;
      nativePlay.call(bgm).catch(() => {});
    }
  }

  if (!isAndroidApp) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseForBackground();
      else resumeAfterBackground();
    });
    window.addEventListener("pagehide", pauseForBackground);
    window.addEventListener("pageshow", () => {
      if (!document.hidden) resumeAfterBackground();
    });
    return;
  }

  const App = capacitor.Plugins.App;
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) resumeAfterBackground();
    else pauseForBackground();
  });

  const exitButton = document.createElement("button");
  exitButton.type = "button";
  exitButton.className = "app-exit-button";
  exitButton.classList.add("illustrated-control", "illustrated-exit");
  exitButton.innerHTML = `${controlIcons.exit}<span>おわる</span>`;
  exitButton.setAttribute("aria-label", "アプリを終了");

  if (isTop) {
    document.querySelector("header")?.prepend(exitButton);
  } else {
    const nav = document.querySelector("nav");
    nav?.classList.add("has-app-exit");
    nav?.prepend(exitButton);
  }

  let exiting = false;

  async function exitApp() {
    if (exiting) return;
    exiting = true;
    exitButton.querySelector("span").textContent = "またね";
    navigator.vibrate?.([80, 45, 80]);
    activeMedia.forEach((media) => media.pause());
    try {
      await App.exitApp();
    } catch {
      exiting = false;
      exitButton.querySelector("span").textContent = "おわる";
    }
  }

  exitButton.addEventListener("click", exitApp);
})();
