/* 鳩特老師的互動教學網站・我的戰鬥紀錄（只存在這台裝置的瀏覽器裡）
 * 練習／考試頁面引入：<script src="/battle_log.js"></script>
 *   JutorLog.practice(true/false)                       練習答完一題（第一次就全對＝true）
 *   JutorLog.exam({ score, full, correct, count, secs }) 考試交卷
 *   JutorLog.step(true/false, { s: 步驟名稱, q: 題目 })  每一步判對錯（只送到教室監控，不存本機）
 * 首頁用 JutorLog.load() 讀出全部紀錄。
 *
 * 教室 iPad 監控：只有用 /classroom/setup.html 註冊過的裝置（補習班的 iPad）才會把作答狀況
 * 送到 Firebase element-uno 的 classroom/<教室代碼>/ 底下；一般使用者完全不送任何資料。
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
    cloud(ev);
  }

  /* ---------- 教室 iPad 監控 ---------- */
  const ROOM_KEY = 'jutor-classroom-v1';
  const CLOUD = 'https://element-uno-default-rtdb.firebaseio.com/classroom';
  const clip = (v, n) => (v === undefined || v === null ? undefined : String(v).replace(/\s+/g, ' ').trim().slice(0, n));
  function room() {
    try {
      const v = JSON.parse(localStorage.getItem(ROOM_KEY));
      if (v && /^[A-Za-z0-9]{20,40}$/.test(v.room) && /^[A-Za-z0-9]{8,40}$/.test(v.id) && typeof v.name === 'string' && v.name) return v;
    } catch (_) { /* 沒註冊 */ }
    return null;
  }
  function dayKey(t) {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function send(r, method, path, body) {
    try {
      return fetch(`${CLOUD}/${r.room}/${path}.json`, { method, body: JSON.stringify(body), keepalive: true, headers: { 'Content-Type': 'application/json' } })
        .then(res => res.ok).catch(() => false);
    } catch (_) { return Promise.resolve(false); }
  }
  /* 監控頁要看得出是哪一頁：「鳩特數理｜除法（三年級）」取後面那段 */
  function cloudTitle() {
    const parts = String(document.title || '').split(/[｜|]/).map(x => x.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : pageKey();
  }
  /* 時間用伺服器時間，避免 iPad 時鐘不準 */
  const NOW = { '.sv': 'timestamp' };
  function cloud(ev) {
    const r = room(); if (!r) return;
    const out = { t: NOW, p: pageKey(), n: clip(cloudTitle(), 40), m: ev.m };
    ['ok', 's', 'f', 'c', 'q', 'd'].forEach(k => { if (ev[k] !== undefined && typeof ev[k] !== 'string') out[k] = ev[k]; });
    if (typeof ev.s === 'string') out.s = clip(ev.s, 30);
    if (typeof ev.q === 'string') out.q = clip(ev.q, 80);
    if (ev.l) out.l = clip(ev.l, 30);
    send(r, 'POST', `log/${dayKey(Date.now())}/${r.id}`, out);
    live();
  }
  function live() {
    const r = room(); if (!r) return Promise.resolve(false);
    return send(r, 'PUT', `devices/${r.id}`, { name: clip(r.name, 20), p: pageKey(), n: clip(cloudTitle(), 40), t: NOW });
  }
  if (room()) {
    live();
    setInterval(() => { if (document.visibilityState === 'visible') live(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') live(); });
  }
  const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : undefined);

  window.JutorLog = {
    practice(ok, label) { add({ m: 'p', ok: ok ? 1 : 0, l: label ? String(label).slice(0, 30) : undefined }); },
    exam(o) {
      o = o || {};
      add({ m: 'e', s: num(o.score), f: num(o.full), c: num(o.correct), q: num(o.count), d: num(o.secs), l: o.label ? String(o.label).slice(0, 30) : undefined });
    },
    /* 每一步的對錯只送到教室監控（註冊過的 iPad），不寫進本機戰鬥紀錄 */
    step(ok, info) {
      info = info || {};
      cloud({ m: 's', ok: ok ? 1 : 0, s: typeof info.s === 'string' ? info.s : undefined, q: typeof info.q === 'string' ? info.q : undefined });
    },
    classroom: { room, live, ROOM_KEY },
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
