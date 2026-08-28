(() => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'このアプリについて';
  button.style.cssText = 'display:block;flex-shrink:0;margin:8px auto 14px;padding:10px 18px;border:0;border-radius:16px;background:white;color:#36546b;font:inherit;cursor:pointer';
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'このアプリについて・効果音クレジット');
  dialog.style.cssText = 'margin:auto;width:min(90vw,480px);max-height:80dvh;overflow:auto;padding:24px;border:0;border-radius:22px;background:white;color:#263238;line-height:1.8';
  dialog.innerHTML = `<h2>効果音クレジット</h2>
    <p>のりもののサイレン：<a href="https://otologic.jp" target="_blank" rel="noopener noreferrer">OtoLogic</a></p>
    <p>使用素材：救急車 サイレン03／パトカー サイレン03／消防車 サイレン01</p>
    <p>ライセンス：<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>
    <p><a href="https://otologic.jp/free/se/transportation02.html" target="_blank" rel="noopener noreferrer">配布元</a>の音源を、長さ・音量の調整、モノラル化、フェード処理をして使用しています。</p>
    <hr><p>電車の効果音：<a href="https://taira-komori.net/transfer01.html" target="_blank" rel="noopener noreferrer">小森平「電車通過のみ」</a></p>
    <p><a href="https://taira-komori.net/welcome.html" target="_blank" rel="noopener noreferrer">配布元の利用規約</a>に基づき使用。長さ・音量の調整、モノラル化、フェード処理をしています。</p>
    <hr><p>飛行機の効果音：<a href="https://taira-komori.net/transfer01.html" target="_blank" rel="noopener noreferrer">小森平「飛行整備場１」</a>（airport1）</p>
    <p><a href="https://taira-komori.net/welcome.html" target="_blank" rel="noopener noreferrer">配布元の利用規約</a>に基づき使用。長さ・音量の調整、モノラル化、フェード処理をしています。</p>
    <form method="dialog"><button style="margin-top:18px;padding:12px 24px;font:inherit">閉じる</button></form>`;
  document.body.append(button, dialog);
  button.addEventListener('click', () => dialog.showModal());
})();
