// ==UserScript==
// @name         Leonardo.ai 本日分 一括ダウンロード
// @namespace    leonardo-bulk-dl
// @version      1.1
// @description  「Today」セクションの画像だけをまとめてダウンロードするボタンを追加します
// @match        https://app.leonardo.ai/*
// @grant        GM_xmlhttpRequest
// @downloadURL  https://raw.githubusercontent.com/asupon-tools/userscripts/main/leonardo-bulk-download/leonardo_bulk_download.user.js
// @updateURL    https://raw.githubusercontent.com/asupon-tools/userscripts/main/leonardo-bulk-download/leonardo_bulk_download.user.js
// ==/UserScript==

(function () {
  'use strict';

  function addButton() {
    if (document.getElementById('leo-bulk-dl-btn')) return; // 二重追加防止

    const btn = document.createElement('button');
    btn.id = 'leo-bulk-dl-btn';
    btn.textContent = '📥 今日の画像を一括DL';
    btn.style.cssText = `
      position: fixed;
      top: 90px;
      right: 20px;
      z-index: 999999;
      background: #22c55e;
      color: #fff;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    btn.onclick = downloadTodayImages;
    document.body.appendChild(btn);
  }

  // "Yesterday" や日付らしき見出し(=今日より古いセクションの境界)を画面内で探す
  function findOlderSectionBoundaryTop() {
    const candidates = document.querySelectorAll('h1, h2, h3, h4, div, span, p');
    for (const el of candidates) {
      if (el.children.length === 0) {
        const text = el.textContent.trim();
        if (
          text.length < 30 &&
          /^(Yesterday|\d{1,2}\s*(days?)?\s*ago|Last\s+\d+\s+days|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(text)
        ) {
          return el.getBoundingClientRect().top;
        }
      }
    }
    return null;
  }

  // 現在DOM上にある画像(cdn.leonardo.ai)を集める。境界より下(古いセクション)にあるものは除外
function collectVisibleImages(imageMap) {
  const boundaryTop = findOlderSectionBoundaryTop();
  document.querySelectorAll('img[src*="cdn.leonardo.ai"]').forEach((img) => {
    if (!img.src) return;

    // ★追加: 生成結果カード/リストアイテム配下の画像だけを対象にする
    const container = img.closest('[data-testid]');
    const testid = container?.getAttribute('data-testid') || '';
    if (!/^generation-(list-item|card)/.test(testid)) return;

    const top = img.getBoundingClientRect().top;
    if (boundaryTop !== null && top >= boundaryTop) return;
    const baseUrl = img.src.split('?')[0];
    if (!imageMap.has(baseUrl)) {
      imageMap.set(baseUrl, img.src);
    }
  });
  return boundaryTop !== null;
}

  async function downloadTodayImages() {
    const btn = document.getElementById('leo-bulk-dl-btn');
    const originalText = btn.textContent;

    const imageMap = new Map(); // baseUrl -> フルsrc
    window.scrollTo(0, 0);
    await sleep(500);

    let reachedBoundary = false;
    let lastScrollY = -1;
    let sameCount = 0;

    // 少しずつスクロールしながら画像を集める(仮想スクロール対策)
    while (!reachedBoundary && sameCount < 3) {
      reachedBoundary = collectVisibleImages(imageMap);
      btn.textContent = `収集中... (${imageMap.size}枚)`;

      window.scrollBy(0, 700);
      await sleep(500);

      if (window.scrollY === lastScrollY) {
        sameCount++; // これ以上スクロールできない = ページ最下部
      } else {
        sameCount = 0;
      }
      lastScrollY = window.scrollY;
    }
    // 最後にもう一度だけ収集(スクロール後の描画を反映)
    collectVisibleImages(imageMap);

    btn.textContent = originalText;

    const images = Array.from(imageMap.values());
    if (images.length === 0) {
      alert('画像が見つかりませんでした。ページを一番上までスクロールしてから、もう一度押してみてください。');
      return;
    }

    if (!confirm(`${images.length} 枚の画像が見つかりました。ダウンロードを開始しますか？`)) return;

    for (let i = 0; i < images.length; i++) {
      btn.textContent = `DL中 ${i + 1}/${images.length}`;
      const hiResUrl = images[i].split('?')[0]; // なるべく高画質(パラメータなし)で試す
      await downloadOne(hiResUrl, images[i], `leonardo_today_${Date.now()}_${i + 1}.jpg`);
      await sleep(400); // 連続リクエストの負荷軽減
    }

    btn.textContent = originalText;
    alert('ダウンロード完了しました。');
  }

  function fetchBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.response);
          } else {
            reject(new Error('status ' + response.status));
          }
        },
        onerror: reject,
      });
    });
  }

  // まず高画質(パラメータなし)URLを試し、失敗したら元のURLにフォールバックする
  async function downloadOne(preferredUrl, fallbackUrl, filename) {
    let blob;
    try {
      blob = await fetchBlob(preferredUrl);
    } catch (e) {
      try {
        blob = await fetchBlob(fallbackUrl);
      } catch (e2) {
        console.warn('ダウンロード失敗:', preferredUrl, fallbackUrl);
        return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ページ読み込み後にボタンを追加(SPAなので少し遅延させる + 定期チェック)
  window.addEventListener('load', () => setTimeout(addButton, 1500));
  setInterval(addButton, 3000);
})();
