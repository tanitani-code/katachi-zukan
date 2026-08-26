(() => {
  const isTop = /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith("/");
  const pageName = isTop
    ? "top"
    : (location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  document.documentElement.classList.add(isTop ? "zukan-top" : "zukan-category");
  document.body.classList.add(isTop ? "zukan-top" : "zukan-category");
  document.documentElement.classList.add(`zukan-page-${pageName}`);
  document.body.classList.add("zukan-scene", `zukan-page-${pageName}`);

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
    getTitleAudio("sounds/title_top.mp3");

    const introKey = "zukan-intro-played";
    function tryIntro(event) {
      if (sessionStorage.getItem(introKey) || event?.target?.closest?.(".card")) return;
      playTitleVoice(
        "sounds/title_top.mp3",
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
  exitButton.textContent = "おわる";
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
    exitButton.textContent = "またね";
    navigator.vibrate?.([80, 45, 80]);
    activeMedia.forEach((media) => media.pause());
    try {
      await App.exitApp();
    } catch {
      exiting = false;
      exitButton.textContent = "おわる";
    }
  }

  exitButton.addEventListener("click", exitApp);
})();
