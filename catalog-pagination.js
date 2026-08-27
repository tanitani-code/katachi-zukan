(() => {
  const PAGE_SIZE = 6;
  const main = document.querySelector("main");
  const footer = document.querySelector("footer.bottom-nav");
  if (!main || !footer || !document.body.classList.contains("zukan-category")) return;

  const cards = Array.from(main.children).filter((element) => element.classList.contains("card"));
  const pageCount = Math.ceil(cards.length / PAGE_SIZE);
  if (pageCount <= 1) {
    window.ZukanPagination = {
      page: 0,
      pageCount: 1,
      goTo: () => false,
      refresh: () => false
    };
    return;
  }

  footer.classList.add("paginated");

  const backButton = footer.querySelector(".nav-back");
  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "catalog-page-arrow catalog-page-previous";
  previousButton.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="arrow-board" d="M51 12L20 32l31 20V42L35 32l16-10z"/><path class="arrow-grain" d="M43 24L31 32l12 8"/></svg>`;
  previousButton.setAttribute("aria-label", "前のページ");

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "catalog-page-arrow catalog-page-next";
  nextButton.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="arrow-board" d="M13 12l31 20-31 20V42l16-10-16-10z"/><path class="arrow-grain" d="M21 24l12 8-12 8"/></svg>`;
  nextButton.setAttribute("aria-label", "次のページ");

  const center = document.createElement("div");
  center.className = "catalog-page-center";

  const dots = document.createElement("div");
  dots.className = "catalog-page-dots";
  dots.setAttribute("aria-label", "ページ");

  const dotButtons = Array.from({ length: pageCount }, (_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "catalog-page-dot";
    dot.setAttribute("aria-label", `${index + 1}ページ目`);
    dot.addEventListener("click", () => showPage(index));
    dots.appendChild(dot);
    return dot;
  });

  if (backButton) center.appendChild(backButton);
  center.appendChild(dots);
  footer.replaceChildren(previousButton, center, nextButton);

  let currentPage = 0;
  let animationTimer = 0;
  let pointerStart = null;
  let suppressClickUntil = 0;

  function pageCards(index) {
    const start = index * PAGE_SIZE;
    return cards.slice(start, start + PAGE_SIZE);
  }

  function hydrateCards(items) {
    items.forEach((card) => {
      card.querySelectorAll("[data-src]").forEach((asset) => {
        asset.src = asset.dataset.src;
        asset.removeAttribute("data-src");
      });
    });
  }

  function announcePage(index) {
    const detail = {
      page: index,
      pageNumber: index + 1,
      pageCount,
      visibleCards: pageCards(index),
      nextCards: pageCards(index + 1)
    };
    document.dispatchEvent(new CustomEvent("zukan-page-change", { detail }));
  }

  function showPage(index) {
    const destination = Math.max(0, Math.min(pageCount - 1, index));
    if (destination === currentPage && cards.some((card) => !card.hidden)) return false;

    const direction = destination > currentPage ? "18px" : "-18px";
    currentPage = destination;
    hydrateCards(pageCards(currentPage));

    cards.forEach((card, cardIndex) => {
      card.hidden = Math.floor(cardIndex / PAGE_SIZE) !== currentPage;
    });

    previousButton.disabled = currentPage === 0;
    nextButton.disabled = currentPage === pageCount - 1;
    dotButtons.forEach((dot, dotIndex) => {
      const active = dotIndex === currentPage;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-current", active ? "page" : "false");
    });

    document.body.dataset.catalogPage = String(currentPage + 1);
    main.style.setProperty("--page-direction", direction);
    main.classList.remove("page-changing");
    void main.offsetWidth;
    main.classList.add("page-changing");
    clearTimeout(animationTimer);
    animationTimer = window.setTimeout(() => main.classList.remove("page-changing"), 200);

    announcePage(currentPage);
    return true;
  }

  previousButton.addEventListener("click", () => showPage(currentPage - 1));
  nextButton.addEventListener("click", () => showPage(currentPage + 1));

  main.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (document.querySelector("#overlay.active")) return;
    pointerStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  main.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    suppressClickUntil = performance.now() + 350;
    if (deltaX < 0) showPage(currentPage + 1);
    else showPage(currentPage - 1);
  }, { passive: true });

  main.addEventListener("pointercancel", () => {
    pointerStart = null;
  }, { passive: true });

  main.addEventListener("click", (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showPage(currentPage - 1);
    if (event.key === "ArrowRight") showPage(currentPage + 1);
  });

  window.ZukanPagination = {
    get page() { return currentPage; },
    pageCount,
    goTo: showPage,
    refresh: () => showPage(currentPage)
  };

  cards.forEach((card) => { card.hidden = true; });
  showPage(0);
})();
