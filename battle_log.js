/* 鳩特老師的互動教學網站・我的戰鬥紀錄（只存在這台裝置的瀏覽器裡）
 * 練習／考試頁面引入：<script src="/battle_log.js"></script>
 *   JutorLog.practice(true/false)                       練習答完一題（第一次就全對＝true）
 *   JutorLog.exam({ score, full, correct, count, secs }) 考試交卷
 * 首頁用 JutorLog.load() 讀出全部紀錄。
 */
(function () {
  'use strict';
  const KEY = 'jutor-battle-log-v1';
  const KEEP_DAYS = 60, MAX = 6000;

  function pageKey(path) {
    let p = String(path || location.pathname).split(/[?#]/)[0].replace(/^\/+/, '');
    if (p === '' || p.endsWith('/')) p += 'index';
    return p.replace(/\.html?$/i, '');
  }
  function pageTitle() {
    return String(document.title || '').split(/[｜|]/)[0].trim().slice(0, 40);
  }
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && Array.isArray(v.e)) return v.e.filter(x => x && typeof x.t === 'number' && typeof x.p === 'string');
    } catch (_) { /* 壞掉的資料就重來 */ }
    return [];
  }
  function trim(list) {
    const cut = Date.now() - KEEP_DAYS * 864e5;
    list = list.filter(x => x.t >= cut).sort((a, b) => a.t - b.t);
    return list.length > MAX ? list.slice(list.length - MAX) : list;
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, e: trim(list) })); return true; } catch (_) { return false; }
  }
  function add(ev) {
    const list = read(); list.push(Object.assign({ t: Date.now(), p: pageKey(), n: pageTitle() }, ev)); save(list);
  }
  const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : undefined);

  window.JutorLog = {
    practice(ok, label) { add({ m: 'p', ok: ok ? 1 : 0, l: label ? String(label).slice(0, 30) : undefined }); },
    exam(o) {
      o = o || {};
      add({ m: 'e', s: num(o.score), f: num(o.full), c: num(o.correct), q: num(o.count), d: num(o.secs), l: o.label ? String(o.label).slice(0, 30) : undefined });
    },
    load: read,
    replace(list) { return save(Array.isArray(list) ? list : []); },
    merge(list) {
      const all = read(), seen = new Set(all.map(x => `${x.t}|${x.p}|${x.m}`));
      let added = 0;
      (Array.isArray(list) ? list : []).forEach(x => {
        if (!x || typeof x.t !== 'number' || typeof x.p !== 'string' || (x.m !== 'p' && x.m !== 'e')) return;
        const k = `${x.t}|${x.p}|${x.m}`; if (seen.has(k)) return; seen.add(k); all.push(x); added++;
      });
      save(all); return added;
    },
    clear() { try { localStorage.removeItem(KEY); } catch (_) { /* ignore */ } },
    pageKey
  };
})();
