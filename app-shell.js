(() => {
  const isTop = /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith("/");
  const pageName = isTop
    ? "top"
    : (location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  document.documentElement.classList.add(isTop ? "zukan-top" : "zukan-category");
  document.body.classList.add(isTop ? "zukan-top" : "zukan-category");
  document.documentElement.classList.add(`zukan-page-${pageName}`);
  document.body.classList.add("zukan-scene", `zukan-page-${pageName}`);

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
