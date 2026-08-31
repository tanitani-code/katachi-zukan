(() => {
  const key = 'hajimete-zukan-bgm-muted';
  const control = document.getElementById('bgm-setting');
  const status = document.getElementById('setting-status');
  function paint(muted) {
    control.setAttribute('aria-checked', String(!muted));
    control.textContent = muted ? 'OFF' : 'ON';
  }
  function restore() {
    try { paint(localStorage.getItem(key) === 'true'); }
    catch (_) { status.textContent = 'この環境では設定を保存できません。'; control.disabled = true; }
  }
  restore();
  window.addEventListener('pageshow', restore);
  window.addEventListener('storage', restore);
  control.addEventListener('click', () => {
    const muted = control.getAttribute('aria-checked') === 'true';
    try {
      localStorage.setItem(key, String(muted));
      paint(muted);
      status.textContent = `BGMを${muted ? 'OFF' : 'ON'}にしました。図鑑に戻ると反映されます。`;
    } catch (_) { status.textContent = '設定を保存できませんでした。'; }
  });
  const gate = document.getElementById('external-gate');
  const input = document.getElementById('gate-answer');
  const error = document.getElementById('gate-error');
  let destination = null;
  let answer = 0;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || !/^https?:/.test(link.href) || new URL(link.href).origin === location.origin) return;
    event.preventDefault();
    destination = link.href;
    const a = 12 + Math.floor(Math.random() * 8);
    const b = 3 + Math.floor(Math.random() * 7);
    answer = a + b;
    document.getElementById('gate-question').textContent = `${a} ＋ ${b} は？`;
    document.getElementById('destination').textContent = new URL(destination).hostname;
    input.value = '';
    error.textContent = '';
    gate.showModal();
    input.focus();
  });
  document.getElementById('gate-cancel').addEventListener('click', () => gate.close());
  gate.addEventListener('close', () => { destination = null; input.value = ''; });
  document.getElementById('gate-form').addEventListener('submit', event => {
    event.preventDefault();
    const value = input.value.trim().replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 65248));
    if (!/^\d+$/.test(value) || Number(value) !== answer) {
      error.textContent = '答えが違うようです。もう一度お試しください。';
      input.focus();
      return;
    }
    if (destination) location.assign(destination);
  });
})();
