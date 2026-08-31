(() => {
  const host = document.getElementById('sound-credits');
  if (!host) {
    const link = document.createElement('a');
    link.href = 'parents.html';
    link.textContent = '保護者の方へ';
    link.style.cssText = 'display:block;flex-shrink:0;margin:12px auto 24px;padding:14px 24px;border-radius:18px;background:white;color:#36546b;font:inherit;text-decoration:none;min-height:48px;box-sizing:border-box';
    document.body.appendChild(link);
    return;
  }
  host.innerHTML = `<p>効果音：<a href="https://otologic.jp" target="_blank" rel="noopener noreferrer">OtoLogic</a>、<a href="https://taira-komori.net/transfer01.html" target="_blank" rel="noopener noreferrer">小森平</a></p>`;
})();
