/* 鳩特老師的互動教學網站・瀏覽次數
 * 每個頁面引入：<script src="/page_views.js" defer></script>
 * 同一台裝置同一天，同一頁只算一次。資料存在 Firebase element-uno 的 page_views 底下。
 * 用 REST 呼叫：一次請求就結束，不佔用即時連線數。
 */
(function () {
  'use strict';
  const DB = 'https://element-uno-default-rtdb.firebaseio.com/page_views';
  const SEEN = 'jutor-pv-seen';

  /* '/games/minesweeper.html'、'/games/minesweeper'、'games/minesweeper.html' 都變成 'games__minesweeper' */
  function keyOf(path) {
    let p = String(path || '').split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
    if (p === '' || p.endsWith('/')) p += 'index';
    p = p.replace(/\.html?$/i, '');
    return p.split('/').map(s => s.replace(/[^A-Za-z0-9]+/g, '_')).join('__').toLowerCase().slice(0, 100);
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function seenToday() {
    try {
      const v = JSON.parse(localStorage.getItem(SEEN));
      if (v && v.d === today() && Array.isArray(v.k)) return v;
    } catch (_) { /* 讀不到就當今天還沒看過 */ }
    return { d: today(), k: [] };
  }
  function markSeen(key) {
    try { const v = seenToday(); if (!v.k.includes(key)) v.k.push(key); localStorage.setItem(SEEN, JSON.stringify(v)); } catch (_) { /* 無法儲存時下次會再算一次 */ }
  }

  async function hit(path) {
    const key = keyOf(path === undefined ? location.pathname : path);
    if (!key || seenToday().k.includes(key)) return null;
    try {
      const res = await fetch(`${DB}/${key}.json`, { method: 'PUT', body: JSON.stringify({ '.sv': { increment: 1 } }), keepalive: true });
      if (!res.ok) return null;
      markSeen(key);
      return await res.json();
    } catch (_) { return null; }
  }
  async function all() {
    try {
      const res = await fetch(`${DB}.json`, { cache: 'no-store' });
      if (!res.ok) return null;
      return (await res.json()) || {};
    } catch (_) { return null; }
  }

  window.JutorViews = { keyOf, hit, all };
  if (!document.currentScript || document.currentScript.dataset.auto !== 'off') hit();
})();
