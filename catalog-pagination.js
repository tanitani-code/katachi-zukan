(() => {
  const PAGE_SIZE = document.body.classList.contains("zukan-page-kazu") ? 10 : 6;
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
  // Android WebViewに横方向の指操作を奪わせず、縦方向だけをブラウザへ委ねる。
  main.style.touchAction = "pan-y";

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
    dot.addEventListener("click", () => showPage(index, true));
    dots.appendChild(dot);
    return dot;
  });

  if (backButton) center.appendChild(backButton);
  center.appendChild(dots);
  footer.replaceChildren(previousButton, center, nextButton);

  let currentPage = 0;
  let animationTimer = 0;
  let pointerStart = null;
  let dragPreview = null;
  let dragging = false;
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

  function showPage(index, playSound = false, animateCards = true) {
    const destination = ((index % pageCount) + pageCount) % pageCount;
    if (destination === currentPage && cards.some((card) => !card.hidden)) return false;
    if (playSound) window.ZukanFX?.playTapSound?.();

    const wrappedForward = currentPage === pageCount - 1 && destination === 0;
    const wrappedBackward = currentPage === 0 && destination === pageCount - 1;
    const direction = wrappedForward ? "18px" : wrappedBackward ? "-18px" : destination > currentPage ? "18px" : "-18px";
    currentPage = destination;
    hydrateCards(pageCards(currentPage));

    cards.forEach((card, cardIndex) => {
      card.hidden = Math.floor(cardIndex / PAGE_SIZE) !== currentPage;
    });

    previousButton.disabled = false;
    nextButton.disabled = false;
    dotButtons.forEach((dot, dotIndex) => {
      const active = dotIndex === currentPage;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-current", active ? "page" : "false");
    });

    document.body.dataset.catalogPage = String(currentPage + 1);
    main.style.setProperty("--page-direction", direction);
    main.classList.remove("page-changing");
    clearTimeout(animationTimer);
    if (animateCards) {
      void main.offsetWidth;
      main.classList.add("page-changing");
      animationTimer = window.setTimeout(() => main.classList.remove("page-changing"), 200);
    }

    announcePage(currentPage);
    return true;
  }

  previousButton.addEventListener("click", () => showPage(currentPage - 1, true));
  nextButton.addEventListener("click", () => showPage(currentPage + 1, true));

  function removeDragPreview() {
    dragPreview?.remove();
    dragPreview = null;
  }

  function createDragPreview(direction) {
    removeDragPreview();
    const destination = ((currentPage + direction) % pageCount + pageCount) % pageCount;
    hydrateCards(pageCards(destination));
    const styles = getComputedStyle(main);
    dragPreview = document.createElement("div");
    dragPreview.className = "catalog-drag-preview";
    dragPreview.setAttribute("aria-hidden", "true");
    Object.assign(dragPreview.style, {
      position: "absolute",
      inset: "0",
      display: "grid",
      gridTemplateColumns: styles.gridTemplateColumns,
      gridTemplateRows: styles.gridTemplateRows,
      gap: styles.gap,
      padding: styles.padding,
      pointerEvents: "none",
      transform: `translate3d(${direction * main.clientWidth}px, 0, 0)`
    });
    pageCards(destination).forEach((card) => {
      const clone = card.cloneNode(true);
      clone.hidden = false;
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
      dragPreview.appendChild(clone);
    });
    main.appendChild(dragPreview);
  }

  function resetDragVisual(animate = true) {
    main.style.transition = animate ? "transform 170ms cubic-bezier(.22,.75,.3,1)" : "none";
    main.style.transform = "translate3d(0, 0, 0)";
    window.setTimeout(() => {
      main.style.removeProperty("transition");
      main.style.removeProperty("transform");
      removeDragPreview();
      dragging = false;
    }, animate ? 180 : 0);
  }

  main.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (document.querySelector("#overlay.active")) return;
    pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, direction: 0 };
    dragging = false;
  }, { passive: true });

  main.addEventListener("pointermove", (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    if (!dragging) {
      if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      dragging = true;
      // Capture only after horizontal dragging starts. Capturing on pointerdown
      // retargets an ordinary card click to main, so the card never opens.
      try { main.setPointerCapture(event.pointerId); } catch (_) {}
      suppressClickUntil = performance.now() + 500;
      main.classList.remove("page-changing");
    }
    const direction = deltaX < 0 ? 1 : -1;
    if (direction !== pointerStart.direction) {
      pointerStart.direction = direction;
      createDragPreview(direction);
    }
    event.preventDefault();
    main.style.transition = "none";
    main.style.transform = `translate3d(${deltaX}px, 0, 0)`;
  }, { passive: false });

  main.addEventListener("pointerup", (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const wasDragging = dragging;
    pointerStart = null;

    if (!wasDragging || Math.abs(deltaX) < Math.abs(deltaY) * 1.1) {
      resetDragVisual(wasDragging);
      return;
    }

    suppressClickUntil = performance.now() + 400;
    const switchPage = Math.abs(deltaX) >= Math.min(72, main.clientWidth * 0.2);
    if (!switchPage) {
      resetDragVisual(true);
      return;
    }

    const direction = deltaX < 0 ? 1 : -1;
    main.style.transition = "transform 190ms cubic-bezier(.22,.75,.3,1)";
    main.style.transform = `translate3d(${-direction * main.clientWidth}px, 0, 0)`;
    window.setTimeout(() => {
      // 旧ページを中央へ戻す前に、新ページを画面外で確定してちらつきを防ぐ。
      main.style.transition = "none";
      showPage(currentPage + direction, true, false);
      removeDragPreview();
      main.style.removeProperty("transform");
      main.style.removeProperty("transition");
      dragging = false;
    }, 195);
  }, { passive: true });

  main.addEventListener("pointercancel", () => {
    pointerStart = null;
    resetDragVisual(dragging);
  }, { passive: true });

  main.addEventListener("click", (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showPage(currentPage - 1, true);
    if (event.key === "ArrowRight") showPage(currentPage + 1, true);
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
