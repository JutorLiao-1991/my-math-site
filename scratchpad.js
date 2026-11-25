/* 鳩特老師的互動教學網站・半透明計算紙
 * 練習／考試頁面引入：<script src="../scratchpad.js" defer></script>
 * 右側有「計算紙」標籤，點一下或往左滑拉出；半透明，看得到底下的題目，可用手指或觸控筆計算。
 * 推回去作答時筆跡都會保留，再拉出來接著算（同一個分頁重新整理也還在）。
 * 簡易幾何：「直線」從起點拖到終點（接近水平、垂直、45° 會自動吸附）；「圓」從圓心往外拖出半徑。
 */
(function () {
  'use strict';
  if (window.JutorScratch) return;
  const doc = document;
  const KEY = 'jutor-scratch:' + location.pathname.replace(/\.html?$/i, '');
  const OPT_KEY = 'jutor-scratch-opt';
  const COLORS = [{ c: '#1f2937', n: '黑' }, { c: '#1d4ed8', n: '藍' }, { c: '#dc2626', n: '紅' }];
  const ALPHAS = [{ a: .28, n: '淡' }, { a: .5, n: '中' }, { a: .78, n: '濃' }];
  const ss = { get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存不下就只留在記憶體 */ } } };
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 忽略 */ } } };
  const opt = Object.assign({ color: 0, width: 1, alpha: 1, grid: true, tabY: 0.3 }, ls.get(OPT_KEY, {}));
  const saveOpt = () => ls.set(OPT_KEY, opt);

  const css = `
.jsp-tab{position:fixed;right:0;z-index:2147483000;width:36px;padding:10px 0 8px;border:1px solid #94a3b8;border-right:0;border-radius:14px 0 0 14px;background:rgba(255,255,255,.92);color:#1e293b;box-shadow:-3px 3px 12px rgba(0,0,0,.25);display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;font:700 18px/1 -apple-system,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif}
.jsp-tab small{font-size:12px;writing-mode:vertical-rl;letter-spacing:3px;color:#334155}
.jsp-tab .dot{width:7px;height:7px;border-radius:50%;background:#f59e0b;display:none}
.jsp-tab.has .dot{display:block}
.jsp{position:fixed;inset:0;z-index:2147483001;pointer-events:none;visibility:hidden;transition:visibility 0s linear .32s}
.jsp.open{visibility:visible;transition-delay:0s}
.jsp-panel{position:absolute;top:0;right:0;bottom:0;width:calc(100vw - 30px);max-width:1200px;display:flex;flex-direction:column;pointer-events:auto;transform:translateX(104%);transition:transform .3s cubic-bezier(.2,.8,.2,1);box-shadow:-8px 0 28px rgba(0,0,0,.25);border-left:2px solid rgba(148,163,184,.8);padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
.jsp.open .jsp-panel{transform:none}
.jsp-bar{display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(255,255,255,.94);border-bottom:1px solid #cbd5e1;overflow-x:auto;scrollbar-width:none;touch-action:pan-x;flex:none;font:600 13px/1 -apple-system,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;color:#334155}
.jsp-bar::-webkit-scrollbar{display:none}
.jsp-bar b{font-size:15px;color:#0f172a;margin:0 4px 0 2px;white-space:nowrap}
.jsp-b{flex:none;min-width:40px;height:40px;padding:0 10px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#1e293b;font-family:inherit;font-size:14px;font-weight:700;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.jsp-b.on{background:#1e293b;color:#fff;border-color:#1e293b}
.jsp-b.close{margin-left:auto;background:#0ea5e9;border-color:#0284c7;color:#fff}
.jsp-sw{width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #94a3b8}
.jsp-b.on .jsp-sw{box-shadow:0 0 0 2px #fff}
.jsp-sep{flex:none;width:1px;height:26px;background:#cbd5e1;margin:0 2px}
.jsp-body{position:relative;flex:1;min-height:0}
.jsp-grip{position:absolute;left:0;top:0;bottom:0;width:22px;display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,.35);color:#1e293b;font:900 18px/1 sans-serif;cursor:pointer;touch-action:none;z-index:2}
.jsp-cv{position:absolute;left:22px;top:0;right:0;bottom:0;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:crosshair}
.jsp-cv canvas{position:absolute;inset:0;width:100%;height:100%}
.jsp-hint{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);padding:10px 16px;border-radius:99px;background:rgba(15,23,42,.7);color:#fff;font:600 14px/1.4 -apple-system,"PingFang TC","Noto Sans TC",sans-serif;pointer-events:none;transition:opacity .4s;white-space:nowrap}
@media (max-width:640px){.jsp-bar{flex-wrap:wrap;gap:5px}.jsp-bar b,.jsp-sep{display:none}.jsp-b{min-width:38px;height:38px;padding:0 8px}.jsp-b.close{margin-left:auto}}
@media (prefers-reduced-motion:reduce){.jsp-panel,.jsp{transition:none}}
@media print{.jsp,.jsp-tab{display:none!important}}`;

  let tab, wrap, panel, body, cvBox, canvas, ctx, hint;
  let strokes = ss.get(KEY, []), undoStack = [], cur = null, mode = 'pen', sawPen = false;
  let W = 0, H = 0, dpr = 1;
  const isOpen = () => wrap && wrap.classList.contains('open');

  function build() {
    const st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    tab = doc.createElement('div'); tab.className = 'jsp-tab'; tab.setAttribute('role', 'button'); tab.setAttribute('aria-label', '拉出計算紙'); tab.tabIndex = 0;
    tab.innerHTML = '✎<small>計算紙</small><span class="dot"></span>';
    wrap = doc.createElement('div'); wrap.className = 'jsp'; wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `<div class="jsp-panel" role="dialog" aria-label="計算紙">
      <div class="jsp-bar">
        <b>計算紙</b>
        ${COLORS.map((x, i) => `<button type="button" class="jsp-b" data-c="${i}" aria-label="${x.n}色筆"><span class="jsp-sw" style="background:${x.c}"></span></button>`).join('')}
        <button type="button" class="jsp-b" data-w aria-label="切換粗細">細</button>
        <span class="jsp-sep"></span>
        <button type="button" class="jsp-b" data-act="line" aria-label="畫直線：從起點拖到終點，接近水平、垂直或 45 度會自動吸附">╱ 直線</button>
        <button type="button" class="jsp-b" data-act="circle" aria-label="畫圓：從圓心往外拖出半徑">◯ 圓</button>
        <button type="button" class="jsp-b" data-act="eraser" aria-label="橡皮擦（整筆擦掉）">⌫ 橡皮擦</button>
        <span class="jsp-sep"></span>
        <button type="button" class="jsp-b" data-act="undo" aria-label="復原">↶ 復原</button>
        <button type="button" class="jsp-b" data-act="clear" aria-label="全部清除">清除</button>
        <span class="jsp-sep"></span>
        <button type="button" class="jsp-b" data-act="alpha" aria-label="切換底色深淺">底色：中</button>
        <button type="button" class="jsp-b" data-act="grid" aria-label="方格開關">方格</button>
        <button type="button" class="jsp-b close" data-act="close" aria-label="推回計算紙">推回 ›</button>
      </div>
      <div class="jsp-body"><div class="jsp-grip" aria-label="推回計算紙" role="button">›</div><div class="jsp-cv"><canvas></canvas><div class="jsp-hint">用手指寫算式，推回去作答也不會消失</div></div></div>
    </div>`;
    doc.body.append(tab, wrap);
    panel = wrap.querySelector('.jsp-panel'); body = wrap.querySelector('.jsp-body'); cvBox = wrap.querySelector('.jsp-cv');
    canvas = cvBox.querySelector('canvas'); ctx = canvas.getContext('2d'); hint = cvBox.querySelector('.jsp-hint');
    placeTab(); paintBar(); markTab();
    bindTab(); bindPanel(); bindDraw();
    window.addEventListener('resize', () => { placeTab(); if (isOpen()) resize(); });
    doc.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(); e.stopPropagation(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(); e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ---------- 標籤：點一下或往左滑拉出；上下拖可以換位置 ---------- */
  function placeTab() { const h = 100, y = Math.min(Math.max(opt.tabY * innerHeight, 8), innerHeight - h - 8); tab.style.top = y + 'px'; }
  function bindTab() {
    let s = null;
    tab.addEventListener('pointerdown', e => { s = { x: e.clientX, y: e.clientY, top: tab.offsetTop, moved: false }; try { tab.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } e.preventDefault(); });
    tab.addEventListener('pointermove', e => {
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.moved && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) s.moved = 'y';
      if (s.moved === 'y') { const y = Math.min(Math.max(s.top + dy, 8), innerHeight - 108); tab.style.top = y + 'px'; }
    });
    tab.addEventListener('pointerup', e => {
      if (!s) return;
      if (s.moved === 'y') { opt.tabY = tab.offsetTop / innerHeight; saveOpt(); }
      else open();
      s = null;
    });
    tab.addEventListener('pointercancel', () => { s = null; });
    tab.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }
  function open() {
    if (isOpen()) return;
    wrap.classList.add('open'); wrap.setAttribute('aria-hidden', 'false'); tab.style.visibility = 'hidden';
    requestAnimationFrame(resize);
    if (strokes.length) hint.style.opacity = 0; else flashHint();
  }
  let hintTimer = 0;
  function flashHint() { clearTimeout(hintTimer); hint.style.opacity = 1; hintTimer = setTimeout(() => { hint.style.opacity = 0; }, 1800); }
  function close() {
    if (!isOpen()) return;
    cur = null; wrap.classList.remove('open'); wrap.setAttribute('aria-hidden', 'true');
    setTimeout(() => { tab.style.visibility = ''; }, 280); markTab();
  }
  function markTab() { tab.classList.toggle('has', strokes.length > 0); tab.setAttribute('aria-label', strokes.length ? '拉出計算紙（上面有你的算式）' : '拉出計算紙'); }

  /* ---------- 工具列 ---------- */
  function paintBar() {
    panel.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', mode !== 'eraser' && +b.dataset.c === opt.color));
    panel.querySelector('[data-act=line]').classList.toggle('on', mode === 'line');
    panel.querySelector('[data-act=circle]').classList.toggle('on', mode === 'circle');
    panel.querySelector('[data-w]').textContent = opt.width ? '粗' : '細';
    panel.querySelector('[data-act=eraser]').classList.toggle('on', mode === 'eraser');
    panel.querySelector('[data-act=alpha]').textContent = '底色：' + ALPHAS[opt.alpha].n;
    panel.querySelector('[data-act=grid]').classList.toggle('on', !!opt.grid);
    panel.querySelector('[data-act=undo]').disabled = !undoStack.length;
    body.style.background = `rgba(255,255,255,${ALPHAS[opt.alpha].a})`;
    cvBox.style.backgroundImage = opt.grid ? 'linear-gradient(rgba(100,116,139,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.22) 1px,transparent 1px)' : 'none';
    cvBox.style.backgroundSize = '28px 28px';
    cvBox.style.cursor = mode === 'eraser' ? 'cell' : 'crosshair';
    hint.textContent = mode === 'line' ? '從起點拖到終點畫直線' : mode === 'circle' ? '從圓心往外拖，放開就畫好圓' : '用手指寫算式，推回去作答也不會消失';
  }
  function bindPanel() {
    panel.querySelector('.jsp-bar').addEventListener('click', e => {
      const b = e.target.closest('.jsp-b'); if (!b) return;
      /* 換顏色、粗細時保留目前的直線／圓工具；只有從橡皮擦切回來才變回畫筆 */
      if (b.dataset.c != null) { opt.color = +b.dataset.c; if (mode === 'eraser') mode = 'pen'; saveOpt(); }
      else if (b.dataset.w != null) { opt.width = opt.width ? 0 : 1; if (mode === 'eraser') mode = 'pen'; saveOpt(); }
      else {
        const a = b.dataset.act;
        if (a === 'eraser' || a === 'line' || a === 'circle') { mode = mode === a ? 'pen' : a; if (mode === 'line' || mode === 'circle') { paintBar(); flashHint(); } }
        else if (a === 'undo') undo();
        else if (a === 'clear') { if (strokes.length) { undoStack.push({ t: 'clear', s: strokes }); strokes = []; commit(); } }
        else if (a === 'alpha') { opt.alpha = (opt.alpha + 1) % ALPHAS.length; saveOpt(); }
        else if (a === 'grid') { opt.grid = !opt.grid; saveOpt(); }
        else if (a === 'close') { close(); return; }
      }
      paintBar();
    });
    /* 左邊的把手：點一下或往右滑推回；工具列往右滑也可以推回 */
    const grip = panel.querySelector('.jsp-grip');
    let gx = null;
    grip.addEventListener('pointerdown', e => { gx = e.clientX; e.preventDefault(); });
    grip.addEventListener('pointerup', e => { if (gx != null && e.clientX - gx > -10) close(); gx = null; });
    const bar = panel.querySelector('.jsp-bar');
    let bx = null, by = null;
    bar.addEventListener('pointerdown', e => { if (e.target.closest('.jsp-b')) return; bx = e.clientX; by = e.clientY; });
    bar.addEventListener('pointerup', e => { if (bx != null && e.clientX - bx > 70 && Math.abs(e.clientY - by) < 40) close(); bx = null; });
  }

  /* ---------- 畫圖 ---------- */
  function resize() {
    const r = cvBox.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    redraw();
  }
  const widthOf = s => (s.e ? 0 : s.w ? 4.2 : 2.4);
  const radiusOf = s => Math.hypot(s.p[2] - s.p[0], s.p[3] - s.p[1]);
  function drawStroke(s, live) {
    const p = s.p; if (!p.length) return;
    ctx.strokeStyle = COLORS[s.c] ? COLORS[s.c].c : '#1f2937'; ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = widthOf(s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.t === 'line') { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); return; }
    if (s.t === 'circle') {
      ctx.beginPath(); ctx.arc(p[0], p[1], radiusOf(s), 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fill(); /* 圓心 */
      if (live) { /* 拖曳中顯示半徑虛線 */
        ctx.save(); ctx.globalAlpha = .55; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); ctx.restore();
      }
      return;
    }
    if (p.length < 4) { ctx.beginPath(); ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length - 2; i += 2) { const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2; ctx.quadraticCurveTo(p[i], p[i + 1], mx, my); }
    ctx.lineTo(p[p.length - 2], p[p.length - 1]); ctx.stroke();
  }
  function redraw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    strokes.forEach(s => drawStroke(s)); if (cur) drawStroke(cur, true);
  }
  function commit() { ss.set(KEY, strokes); redraw(); markTab(); paintBar(); }
  function undo() {
    const a = undoStack.pop(); if (!a) return;
    if (a.t === 'add') strokes = strokes.filter(s => s !== a.s);
    else if (a.t === 'erase') { strokes = strokes.concat(a.s); strokes.sort((x, y) => x.k - y.k); }
    else if (a.t === 'clear') strokes = a.s;
    commit();
  }
  function hitStrokes(x, y) {
    const r = 14, out = [];
    for (const s of strokes) {
      const p = s.p; let hit = false;
      if (s.t === 'circle') { const d = Math.hypot(x - p[0], y - p[1]); if (Math.abs(d - radiusOf(s)) < r || d < r) out.push(s); continue; }
      for (let i = 0; i < p.length && !hit; i += 2) if (Math.abs(p[i] - x) < r && Math.abs(p[i + 1] - y) < r) hit = true;
      for (let i = 0; i < p.length - 2 && !hit; i += 2) {
        const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
        const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
        if (Math.hypot(ax + t * dx - x, ay + t * dy - y) < r) hit = true;
      }
      if (hit) out.push(s);
    }
    return out;
  }
  function bindDraw() {
    let pid = null, erased = null, seq = strokes.reduce((m, s) => Math.max(m, s.k || 0), 0);
    const pos = e => { const r = cvBox.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10]; };
    cvBox.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen') sawPen = true;
      if (sawPen && e.pointerType === 'touch') return; /* 用觸控筆時，手掌碰到不算 */
      if (pid != null || e.button > 0) return;
      pid = e.pointerId; try { cvBox.setPointerCapture(pid); } catch (x) { /* ignore */ }
      hint.style.opacity = 0; e.preventDefault();
      const [x, y] = pos(e);
      if (mode === 'eraser') { erased = []; eraseAt(x, y); }
      else if (mode === 'line' || mode === 'circle') { cur = { k: ++seq, t: mode, c: opt.color, w: opt.width, p: [x, y, x, y] }; redraw(); }
      else { cur = { k: ++seq, c: opt.color, w: opt.width, p: [x, y] }; redraw(); }
    });
    const eraseAt = (x, y) => { const hit = hitStrokes(x, y); if (hit.length) { strokes = strokes.filter(s => !hit.includes(s)); erased.push(...hit); redraw(); } };
    cvBox.addEventListener('pointermove', e => {
      if (e.pointerId !== pid) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = pos(ev);
        if (mode === 'eraser') { eraseAt(x, y); continue; }
        if (!cur) continue;
        if (cur.t) { setShapeEnd(cur, x, y); continue; }
        const p = cur.p, lx = p[p.length - 2], ly = p[p.length - 1];
        if (Math.abs(x - lx) + Math.abs(y - ly) >= 1.2) p.push(x, y);
      }
      if (mode !== 'eraser') redraw();
    });
    /* 直線接近水平、垂直或 45° 時自動吸附，方便畫出整齊的圖形 */
    const SNAP = 6 * Math.PI / 180;
    const setShapeEnd = (s, x, y) => {
      const p = s.p;
      if (s.t === 'line') {
        const dx = x - p[0], dy = y - p[1], len = Math.hypot(dx, dy), a = Math.atan2(dy, dx), q = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
        if (len > 0 && Math.abs(a - q) < SNAP) { x = Math.round((p[0] + len * Math.cos(q)) * 10) / 10; y = Math.round((p[1] + len * Math.sin(q)) * 10) / 10; }
      }
      p[2] = x; p[3] = y;
    };
    const end = e => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (mode === 'eraser') { if (erased && erased.length) undoStack.push({ t: 'erase', s: erased }); erased = null; commit(); return; }
      if (cur && cur.t && Math.hypot(cur.p[2] - cur.p[0], cur.p[3] - cur.p[1]) < 4) { cur = null; redraw(); return; } /* 只是點一下，不留下圖形 */
      if (cur) { strokes.push(cur); undoStack.push({ t: 'add', s: cur }); if (undoStack.length > 200) undoStack.shift(); cur = null; commit(); }
    };
    cvBox.addEventListener('pointerup', end); cvBox.addEventListener('pointercancel', end);
    cvBox.addEventListener('contextmenu', e => e.preventDefault());
  }

  window.JutorScratch = { open, close, clear() { strokes = []; undoStack = []; if (canvas) commit(); }, get count() { return strokes.length; } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build); else build();
})();
