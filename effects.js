/*
 * はじめて図鑑 共通タップエフェクト
 * - 即時フィードバック（tap）: カードタップ直後に再生
 * - 拡大時パーティクル（burst）: オーバーレイ表示直後に再生
 * - A案「スターバースト」/ B案「キラキラシャワー」を localStorage で切替
 * - 色はカードのラベル（またはかず図鑑の .num）の文字色を自動採用 → カテゴリごとに自然に変わる
 */
(function () {
  const KEY = 'zukanFxVariant';
  function getVariant() { return localStorage.getItem(KEY) || 'A'; }
  function setVariant(v) { localStorage.setItem(KEY, v); }

  if (!document.getElementById('zk-fx-style')) {
    const style = document.createElement('style');
    style.id = 'zk-fx-style';
    style.textContent = `
      .zk-ripple {
        position: absolute; left: 50%; top: 50%;
        width: 14px; height: 14px; margin: -7px 0 0 -7px;
        border: 3px solid currentColor; border-radius: 50%;
        opacity: 0.85; pointer-events: none; z-index: 5;
        animation: zk-ripple-anim 0.45s ease-out forwards;
      }
      @keyframes zk-ripple-anim {
        to { width: 160%; height: 160%; margin: -80% 0 0 -80%; opacity: 0; }
      }

      .zk-spark {
        position: absolute; left: 50%; top: 50%;
        font-size: clamp(16px, 5vw, 22px); line-height: 1; pointer-events: none; z-index: 5;
        transform: translate(-50%, -50%) scale(0.3);
        animation: zk-spark-anim 0.4s ease-out forwards;
      }
      @keyframes zk-spark-anim {
        0%   { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1.7) rotate(45deg); opacity: 0; }
      }

      .zk-particle { position: absolute; left: 50%; top: 50%; pointer-events: none; z-index: 5; will-change: transform, opacity; }

      .zk-star {
        font-size: clamp(18px, 5.5vw, 26px); line-height: 1;
        animation: zk-star-fly 0.75s cubic-bezier(.2,.8,.3,1) forwards;
      }
      @keyframes zk-star-fly {
        0%   { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 1; }
        65%  { opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.15) rotate(260deg); opacity: 0; }
      }

      .zk-confetti {
        width: clamp(8px, 2vw, 12px); height: clamp(8px, 2vw, 12px); border-radius: 2px;
        animation: zk-confetti-fall 0.9s ease-in forwards;
      }
      @keyframes zk-confetti-fall {
        0%   { transform: translate(-50%, -50%) scale(0.6) rotate(0deg); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.9) rotate(300deg); opacity: 0; }
      }

      .zk-twinkle {
        font-size: clamp(14px, 4.5vw, 18px); line-height: 1;
        animation: zk-twinkle-fly 0.85s ease-out forwards;
      }
      @keyframes zk-twinkle-fly {
        0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
        25%  { opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); opacity: 0; }
      }

      .fx-toggle {
        display: inline-flex; align-items: center; justify-content: center;
        height: clamp(34px, 8vw, 42px); padding: 0 clamp(10px, 3vw, 14px);
        font-size: clamp(0.8rem, 3.4vw, 0.95rem); font-weight: 700;
        color: #6d4c41; background: #fff; border: none; border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12); cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  function getAccentColor(card) {
    if (!card) return '#ff7043';
    const label = card.querySelector && card.querySelector('.label');
    if (label) {
      const c = getComputedStyle(label).color;
      if (c) return c;
    }
    const num = card.querySelector && card.querySelector('.num');
    if (num) return getComputedStyle(num).color;
    return '#ff7043';
  }

  // 即時タップフィードバック（card は position:relative + overflow:hidden 前提）
  function tap(card) {
    if (!card) return;
    const color = getAccentColor(card);
    const el = document.createElement('div');
    if (getVariant() === 'B') {
      el.className = 'zk-spark';
      el.style.color = color;
      el.textContent = '✨';
    } else {
      el.className = 'zk-ripple';
      el.style.color = color;
    }
    card.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // 拡大表示時のパーティクルバースト（container は position:relative/fixed かつ overflow制限なし推奨）
  function burst(container, card) {
    if (!container) return;
    const color = getAccentColor(card);
    const variant = getVariant();
    const count = variant === 'B' ? 12 : 9;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'zk-particle';
      let dx, dy;

      if (variant === 'B') {
        const spread = (Math.random() - 0.5) * 220;
        dx = spread;
        dy = 90 + Math.random() * 70;
        if (i % 2 === 0) {
          p.classList.add('zk-twinkle');
          p.textContent = '✨';
          p.style.color = color;
        } else {
          p.classList.add('zk-confetti');
          p.style.background = i % 3 === 0 ? '#ffd54f' : color;
        }
        p.style.left = (50 + (Math.random() - 0.5) * 40) + '%';
        p.style.top = '18%';
      } else {
        const angle = (360 / count) * i + (Math.random() * 16 - 8);
        const dist = 70 + Math.random() * 55;
        dx = Math.cos(angle * Math.PI / 180) * dist;
        dy = Math.sin(angle * Math.PI / 180) * dist;
        p.classList.add('zk-star');
        p.textContent = '★';
        p.style.color = color;
      }

      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.animationDelay = (Math.random() * 0.08) + 's';
      container.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  function initToggle(btn) {
    if (!btn) return;
    function render() { btn.textContent = '✨' + getVariant(); }
    render();
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setVariant(getVariant() === 'A' ? 'B' : 'A');
      render();
    });
  }

  window.ZukanFX = { tap, burst, getVariant, setVariant, initToggle, getAccentColor };
})();
