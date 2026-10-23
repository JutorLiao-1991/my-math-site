(function () {
  'use strict';
  const M = window.ExpLog, $ = id => document.getElementById(id);
  const colors = { exp: '#b34f1f', log: '#7441ae', green: '#1b725a', gold: '#8d6213', ink: '#25374b', muted: '#596c80', saved: ['#1b725a', '#34669c', '#a83e66'] };
  const titles = { base: '底數如何改變圖形？', compare: '輸入變大，函數值一定變大嗎？', chord: '弦線與曲線，誰比較高？', shift: '移動圖形，也移動公式', inverse: '沿著 y = x，交換兩個坐標' };
  const captions = { base: '先比較同一側，再跨過必過點看上下順序。', compare: '拖動 A、B，從圖上解釋不等式的方向。', chord: '在同一個橫坐標，比較弦中點與曲線上的點。', shift: '先對稱，再平移；原圖以灰色虛線保留。', inverse: '同一底數，指數與對數互為反函數。' };
  const prompts = { base: '把底數 2 留下，再改成 3。必過點左右兩側的高低順序相同嗎？', compare: '保持 m < n，把底數從 2 改成 ½。哪個點比較高？不等號為什麼改變方向？', chord: '連起 A、B，再看中央的兩個點。改變底數或切換指數／對數，誰在上方？', shift: '先向右移 3，再向上移 2。代表點與漸近線各移到哪裡？再試試三種對稱。', inverse: '拖動橘色 P，觀察紫色 Q。它們的連線與中點，和 y = x 有什麼關係？' };
  const notes = { base: '可保留 3 條曲線作比較。曲線上拖曳 P，或用右側滑桿讀取坐標。', compare: 'A、B 可左右拖動；對數的真數必須為正。滑桿也能操作觀察點。', chord: '金色為弦中點 C；綠色為曲線點 D。兩點的橫坐標都是 (m+n)/2。', shift: '公式採 y = sᵧ f(sₓ(x−h)) + k。對稱相對原點／坐標軸進行，再整體平移。', inverse: '橫縱軸每一格同長。播放時，橘色曲線上的點沿著垂直 y=x 的路徑移到紫色曲線。' };
  function defaults(topic = 'base') { return { topic, kind: 'exp', a: 2, h: 0, k: 0, sx: 1, sy: 1, t: 1, m: -1, n: 2, progress: 0, saved: [], revealed: false, original: true, asymptote: true, advanced: false }; }
  let s = defaults(), view = { min: -3, max: 7 }, frame = null, drag = null;
  let size = 600, padding = 33;
  const fmt = x => !Number.isFinite(x) ? '超出計算範圍' : Math.abs(x) < 1e-9 ? '0' : Math.abs(x) >= 1e5 || Math.abs(x) < 0.001 ? x.toExponential(2) : String(Number(x.toFixed(3)));
  const baseText = a => Math.abs(a - 1) < .001 ? String(a) : fmt(a);
  const exact = x => Math.abs(Math.abs(x) - Math.PI) < 1e-12 ? (x < 0 ? '−π' : 'π') : fmt(x);
  const af = () => Math.abs(s.a - M.CRITICAL) < 1e-12 ? 'e<sup>1/e</sup>' : s.a === .5 ? '½' : s.a === .25 ? '¼' : baseText(s.a);
  function equation(kind = s.kind, base = af(), h = 0, k = 0, sx = 1, sy = 1) {
    let inside = h === 0 ? 'x' : h > 0 ? `x − ${exact(h)}` : `x + ${exact(-h)}`;
    if (sx < 0) inside = h === 0 ? '−x' : `−(${inside})`;
    const fn = kind === 'exp' ? `(${base})<sup>${inside}</sup>` : `log<sub>${base}</sub>(${inside})`;
    return `y = ${sy < 0 ? '−' : ''}${fn}${k === 0 ? '' : k > 0 ? ` + ${fmt(k)}` : ` − ${fmt(-k)}`}`;
  }
  const interval = (prop, symbol) => prop.all ? `${symbol} ∈ ℝ` : `${symbol} ${prop.greater ? '>' : '<'} ${fmt(prop.bound)}`;
  const pointText = p => `(${fmt(p.x)}, ${fmt(p.y)})`;
  const legend = (color, label, dashed = false) => `<span><i style="border-color:${color}"${dashed ? ' class="dashed"' : ''}></i>${label}</span>`;
  function control(id, label, min, max, step, value) { return `<div class="control"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output id="${id}-output" for="${id}">${fmt(value)}</output></div>`; }
  function updateBase() {
    $('base-output').innerHTML = af(); $('base-input').value = Math.abs(s.a - M.CRITICAL) < 1e-12 ? s.a.toPrecision(15) : String(s.a);
    $('base-slider').value = s.a > 1 ? Math.max(.03, Math.log2(s.a)) : Math.min(-.03, Math.log2(s.a));
    document.querySelectorAll('[data-base]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.base) - s.a) < 1e-10)));
  }
  function normalizePoints() {
    if (s.kind === 'log') { s.m = Math.max(.5, s.m); s.n = Math.max(s.m + .1, s.n); }
    if (s.n - s.m < .1) s.n = s.m + .1;
  }
  function stopAnimation() { if (frame !== null) cancelAnimationFrame(frame); frame = null; if ($('animate')) $('animate').textContent = '播放坐標交換'; }
  function setBase(a) {
    if (!M.validBase(a) || a < .05 || a > 10) {
      $('base-error').textContent = a === 1 ? 'a = 1 時，指數變成 y = 1，無法反解成對數函數。本教具請選其他底數。' : '請輸入 0.05～10 之間且不等於 1 的底數。';
      return;
    }
    stopAnimation(); s.a = a; s.progress = 0; $('base-error').textContent = ''; updateBase(); syncOutputs(); render();
  }
  function setupControls() {
    const topic = s.topic;
    $('kind-controls').hidden = topic === 'inverse';
    document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === s.kind)));
    let html = '';
    if (topic === 'base') html = `<button id="save-curve">保留這條曲線</button><div id="saved-curves"></div>${control('probe-t', '觀察位置 t', -3, 4, .05, s.t)}<p class="muted small">${s.kind === 'exp' ? 't 是 P 的 x 坐標。' : 't 是 P 的 y 坐標，P = (aᵗ, t)。'}</p><label class="check-row"><input id="asymptote" type="checkbox"${s.asymptote ? ' checked' : ''}>顯示漸近線</label>`;
    if (topic === 'compare' || topic === 'chord') html = `${control('point-m', '左點 m', s.kind === 'log' ? .1 : -3, s.kind === 'log' ? 7 : 4, .1, s.m)}${control('point-n', '右點 n', s.kind === 'log' ? .2 : -2.9, 7, .1, s.n)}<p class="muted small">維持 m &lt; n，兩點至少相隔 0.1。</p>`;
    if (topic === 'shift') html = `${control('shift-h', '水平 h', -4, 4, .25, s.h)}${control('shift-k', '鉛直 k', -4, 4, .25, s.k)}<p class="section-label">先做哪一種對稱？</p><div class="reflection-buttons"><button data-reflect="none">原圖</button><button data-reflect="x">對稱 x 軸</button><button data-reflect="y">對稱 y 軸</button><button data-reflect="origin">對稱原點</button></div><label class="check-row"><input id="original" type="checkbox"${s.original ? ' checked' : ''}>保留未變換的原圖</label><label class="check-row"><input id="asymptote" type="checkbox"${s.asymptote ? ' checked' : ''}>顯示變換後的漸近線</label><p class="section-label">講義範例</p><div class="chips"><button data-example="right">2ˣ 右移 3</button><button data-example="up">2ˣ 上移 3</button><button data-example="log-left">log₃x 左移 π</button><button data-example="log-down">log₃x 下移 2</button></div>`;
    if (topic === 'inverse') html = `${control('probe-t', 'P 的 x 坐標', -3, 4, .05, s.t)}${control('mirror-progress', '坐標交換', 0, 1, .01, s.progress)}<div class="actions"><button id="animate" class="primary">播放坐標交換</button><button id="mirror-reset">回到原曲線</button></div><details id="advanced"${s.advanced ? ' open' : ''}><summary>進階：交點探索（a &gt; 1）</summary><p>同底指數與對數互為反函數，但交點數量會隨底數改變。先比較三個底數：</p><div class="chips"><button data-special="1.2">a = 1.2</button><button data-special="critical">a = e<sup>1/e</sup></button><button data-special="2">a = 2</button></div><div id="intersection-reading"></div></details>`;
    $('topic-controls').innerHTML = html;
    if ($('save-curve')) $('save-curve').addEventListener('click', () => {
      if (s.saved.some(c => c.kind === s.kind && c.a === s.a) || s.saved.length >= 3) return;
      s.saved.push({ kind: s.kind, a: s.a }); renderSaved(); render();
    });
    if ($('probe-t')) $('probe-t').addEventListener('input', e => { stopAnimation(); s.t = Number(e.target.value); syncOutputs(); render(); });
    ['point-m', 'point-n'].forEach(id => { if ($(id)) $(id).addEventListener('input', e => {
      if (id === 'point-m') s.m = Math.min(Number(e.target.value), s.n - .1); else s.n = Math.max(Number(e.target.value), s.m + .1);
      s.m = Number(s.m.toFixed(2)); s.n = Number(s.n.toFixed(2)); syncOutputs(); render();
    }); });
    ['shift-h', 'shift-k'].forEach((id, i) => { if ($(id)) $(id).addEventListener('input', e => { s[i ? 'k' : 'h'] = Number(e.target.value); syncOutputs(); render(); }); });
    ['original', 'asymptote'].forEach(id => { if ($(id)) $(id).addEventListener('change', e => { s[id] = e.target.checked; render(); }); });
    document.querySelectorAll('[data-reflect]').forEach(b => b.addEventListener('click', () => { s.sx = ['y', 'origin'].includes(b.dataset.reflect) ? -1 : 1; s.sy = ['x', 'origin'].includes(b.dataset.reflect) ? -1 : 1; render(); }));
    document.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => {
      const name = b.dataset.example; s.kind = name.startsWith('log') ? 'log' : 'exp'; s.a = s.kind === 'log' ? 3 : 2; s.sx = s.sy = 1;
      s.h = name === 'right' ? 3 : name === 'log-left' ? -Math.PI : 0; s.k = name === 'up' ? 3 : name === 'log-down' ? -2 : 0;
      updateBase(); setupControls(); render();
    }));
    if ($('mirror-progress')) $('mirror-progress').addEventListener('input', e => { stopAnimation(); s.progress = Number(e.target.value); syncOutputs(); render(); });
    if ($('animate')) $('animate').addEventListener('click', () => {
      if (frame !== null) { stopAnimation(); return; }
      if (s.progress >= 1) s.progress = 0;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { s.progress = 1; syncOutputs(); render(); return; }
      $('animate').textContent = '暫停'; let last = null;
      function tick(now) { if (last !== null) s.progress = Math.min(1, s.progress + (now - last) / 2400); last = now; syncOutputs(); render(); if (s.progress < 1) frame = requestAnimationFrame(tick); else stopAnimation(); }
      frame = requestAnimationFrame(tick);
    });
    if ($('mirror-reset')) $('mirror-reset').addEventListener('click', () => { stopAnimation(); s.progress = 0; syncOutputs(); render(); });
    if ($('advanced')) $('advanced').addEventListener('toggle', e => { s.advanced = e.target.open; render(); });
    document.querySelectorAll('[data-special]').forEach(b => b.addEventListener('click', () => { s.advanced = true; s.revealed = false; setBase(b.dataset.special === 'critical' ? M.CRITICAL : Number(b.dataset.special)); }));
    renderSaved(); syncOutputs();
  }
  function renderSaved() {
    if (!$('saved-curves')) return;
    $('saved-curves').innerHTML = s.saved.map((c, i) => `<div class="saved-row"><strong style="border-color:${colors.saved[i]}">${equation(c.kind, baseText(c.a))}</strong><button data-remove="${i}" aria-label="移除第 ${i + 1} 條保留曲線">移除</button></div>`).join('');
    $('save-curve').disabled = s.saved.length >= 3 || s.saved.some(c => c.a === s.a && c.kind === s.kind);
    document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { s.saved.splice(Number(b.dataset.remove), 1); renderSaved(); render(); }));
  }
  function syncOutputs() {
    const values = { 'probe-t': s.t, 'point-m': s.m, 'point-n': s.n, 'shift-h': s.h, 'shift-k': s.k, 'mirror-progress': s.progress };
    for (const [id, val] of Object.entries(values)) if ($(id)) { $(id).value = val; $(id + '-output').textContent = id === 'mirror-progress' ? `${Math.round(val * 100)}%` : fmt(val); }
  }
  function toPixel(p) { const unit = (size - 2 * padding) / (view.max - view.min); return { x: padding + (p.x - view.min) * unit, y: size - padding - (p.y - view.min) * unit }; }
  function fromPixel(x, y) { const unit = (size - 2 * padding) / (view.max - view.min); return { x: view.min + (x - padding) / unit, y: view.min + (size - padding - y) / unit }; }
  function line(p, q, color, dash = '', width = 1.6) { const a = toPixel(p), b = toPixel(q); return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`; }
  function label(p, text, color = colors.ink, dx = 9, dy = -12) {
    const c = toPixel(p); if (c.x < padding - 2 || c.x > size - padding + 2 || c.y < padding - 2 || c.y > size - padding + 2) return '';
    const x = Math.max(padding + 9, Math.min(size - padding - 9, c.x + dx)), y = Math.max(padding + 14, Math.min(size - padding - 4, c.y + dy));
    return `<text x="${x}" y="${y}" text-anchor="${x > size - 90 ? 'end' : 'start'}" font-size="${size < 450 ? 13 : 14}" font-weight="650" fill="${color}" stroke="white" stroke-width="4" paint-order="stroke">${text}</text>`;
  }
  function dot(p, color, name, handle = '') {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return '';
    const c = toPixel(p); const inner = `<circle cx="${c.x}" cy="${c.y}" r="5.5" fill="${color}" stroke="white" stroke-width="2"/>`;
    return (handle ? `<g data-handle="${handle}"><circle cx="${c.x}" cy="${c.y}" r="21" fill="transparent"/>${inner}</g>` : inner) + (name ? label(p, name, color) : '');
  }
  function axes() {
    let out = '', span = view.max - view.min;
    let step = span <= 12 ? 1 : span <= 24 ? 2 : Math.pow(10, Math.floor(Math.log10(span / 5)));
    if (span / step > 14) step *= 2;
    for (let n = Math.ceil(view.min / step) * step; n <= view.max; n += step) {
      if (Math.abs(n) > 1e-8) {
        out += line({ x: n, y: view.min }, { x: n, y: view.max }, '#e2e8ef', '3 4', 1);
        out += line({ x: view.min, y: n }, { x: view.max, y: n }, '#e2e8ef', '3 4', 1);
      }
      const px = toPixel({ x: n, y: 0 }), py = toPixel({ x: 0, y: n });
      if (n !== 0) out += `<text x="${px.x}" y="${Math.min(size - 10, px.y + 19)}" text-anchor="middle" font-size="11" fill="${colors.muted}">${fmt(n)}</text><text x="${Math.max(24, py.x - 9)}" y="${py.y + 4}" text-anchor="end" font-size="11" fill="${colors.muted}">${fmt(n)}</text>`;
    }
    out += line({ x: view.min, y: 0 }, { x: view.max, y: 0 }, '#596c80', '', 1.5) + line({ x: 0, y: view.min }, { x: 0, y: view.max }, '#596c80', '', 1.5);
    const origin = toPixel({ x: 0, y: 0 });
    out += `<text x="${origin.x - 12}" y="${origin.y + 18}" font-size="11" fill="${colors.muted}">0</text><text x="${size - 16}" y="${origin.y - 8}" font-size="13" fill="${colors.ink}">x</text><text x="${origin.x + 10}" y="20" font-size="13" fill="${colors.ink}">y</text>`;
    return out;
  }
  function curve(kind, a, color, opts = {}) {
    let d = '', open = false;
    // Sample the visible linear coordinate (x for exp, y for log). This remains
    // well-conditioned even for bases extremely close to one. Reflections and
    // translations change which parameter interval is visible.
    const shift = kind === 'exp' ? (opts.h || 0) : (opts.k || 0);
    const sign = kind === 'exp' ? (opts.sx || 1) : (opts.sy || 1);
    const lo = Math.min(sign * (view.min - shift), sign * (view.max - shift)) - 2;
    const hi = Math.max(sign * (view.min - shift), sign * (view.max - shift)) + 2;
    for (let i = 0; i <= 1800; i++) {
      const t = lo + (hi - lo) * i / 1800;
      let p = M.point(kind, a, t, opts.h || 0, opts.k || 0, opts.sx || 1, opts.sy || 1);
      if (opts.mirror !== undefined) p = M.mirror(p, opts.mirror);
      const q = toPixel(p), limit = size * 100;
      if (!Number.isFinite(q.x) || !Number.isFinite(q.y) || Math.abs(q.x) > limit || Math.abs(q.y) > limit) { open = false; continue; }
      d += `${open ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`; open = true;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${opts.width || 2.7}"${opts.dash ? ' stroke-dasharray="7 6"' : ''} stroke-linejoin="round"/>`;
  }
  function guides(p, color) { return line({ x: p.x, y: 0 }, p, color, '3 4', 1) + line({ x: 0, y: p.y }, p, color, '3 4', 1); }
  function asymptote(kind, h = 0, k = 0) { return kind === 'exp' ? line({ x: view.min, y: k }, { x: view.max, y: k }, colors.gold, '7 5', 2) : line({ x: h, y: view.min }, { x: h, y: view.max }, colors.gold, '7 5', 2); }
  function render() {
    const topic = s.topic, kind = s.kind, color = colors[kind], shift = topic === 'shift';
    $('scene-title').textContent = titles[topic]; $('scene-caption').textContent = captions[topic]; $('prompt').textContent = prompts[topic]; $('graph-note').textContent = notes[topic];
    $('formula').innerHTML = topic === 'inverse' ? `<span>${equation('exp')}</span>　<span class="log-color">${equation('log')}</span>` : shift ? `<span class="original">原圖 ${equation()}</span>${equation(kind, af(), s.h, s.k, s.sx, s.sy)}` : equation();
    $('formula').style.color = topic === 'inverse' ? colors.exp : color;
    $('reveal').textContent = s.revealed ? '隱藏性質' : '揭示性質'; $('reveal').setAttribute('aria-expanded', String(s.revealed)); $('findings').hidden = !s.revealed;
    let graph = '', keys = '', reading = '';
    if (topic === 'base') {
      s.saved.forEach((c, i) => { graph += curve(c.kind, c.a, colors.saved[i]); keys += legend(colors.saved[i], `${c.kind === 'exp' ? '指數' : '對數'} a = ${baseText(c.a)}`); });
      if (s.asymptote) graph += asymptote(kind);
      graph += curve(kind, s.a, color); const p = M.point(kind, s.a, s.t), anchor = M.properties(kind, s.a).anchor;
      graph += guides(p, color) + dot(anchor, colors.ink, pointText(anchor)) + dot(p, color, 'P', 't');
      reading = `<strong>P = ${pointText(p)}</strong>　${kind === 'exp' ? 'x 每增加 1，y 乘上底數 a。' : 'x 乘上底數 a，y 增加 1。'}`;
      keys += legend(color, `目前：a = ${baseText(s.a)}`) + (s.asymptote ? legend(colors.gold, `漸近線 ${kind === 'exp' ? 'y = 0' : 'x = 0'}`, true) : '');
      renderSaved();
    } else if (topic === 'compare' || topic === 'chord') {
      const c = M.chord(kind, s.a, s.m, s.n), a = { x: s.m, y: c.left }, b = { x: s.n, y: c.right };
      graph += curve(kind, s.a, color) + guides(a, color) + guides(b, colors.log);
      if (topic === 'chord') {
        const avg = { x: c.mid, y: c.average }, mid = { x: c.mid, y: c.curve };
        graph += line(a, b, colors.gold, '', 2) + line({ x: c.mid, y: 0 }, avg.y > mid.y ? avg : mid, '#9aabb9', '3 4', 1);
        graph += line(avg, mid, colors.green, '', 3) + dot(avg, colors.gold, 'C 弦中點') + dot(mid, colors.green, 'D 曲線點', 'mid');
        reading = `橫坐標 ${(fmt(c.mid))}：<strong>C 的高度 ${fmt(c.average)}</strong>；<strong>D 的高度 ${fmt(c.curve)}</strong>。`;
        keys = legend(color, '函數曲線') + legend(colors.gold, '弦線 AB 與中點 C') + legend(colors.green, '中間位置的曲線點 D');
      } else {
        reading = `m = ${fmt(s.m)} < n = ${fmt(s.n)}；<strong>f(m) = ${fmt(c.left)} ${c.left < c.right ? '<' : '>'} f(n) = ${fmt(c.right)}</strong>`;
        keys = legend(color, '函數曲線') + legend(color, 'A：左點') + legend(colors.log, 'B：右點');
      }
      graph += dot(a, color, 'A', 'm') + dot(b, colors.log, 'B', 'n');
    } else if (shift) {
      if (s.original) { graph += curve(kind, s.a, '#8091a2', { dash: true, width: 2 }); keys += legend('#8091a2', '未變換原圖', true); }
      if (s.asymptote) graph += asymptote(kind, s.h, s.k);
      graph += curve(kind, s.a, color, s);
      const old = M.properties(kind, s.a).anchor, now = M.properties(kind, s.a, s.h, s.k, s.sx, s.sy).anchor;
      if (s.original) graph += dot(old, '#8091a2', '原代表點');
      graph += dot(now, color, 'P（可拖曳）', 'shift');
      reading = `代表點 ${pointText(old)} → <strong>${pointText(now)}</strong><br>水平：${s.h === 0 ? '不移動' : s.h > 0 ? `右移 ${fmt(s.h)}` : `左移 ${fmt(-s.h)}`}；鉛直：${s.k === 0 ? '不移動' : s.k > 0 ? `上移 ${fmt(s.k)}` : `下移 ${fmt(-s.k)}`}。`;
      keys += legend(color, '變換後圖形') + (s.asymptote ? legend(colors.gold, `漸近線 ${kind === 'exp' ? 'y = ' + fmt(s.k) : 'x = ' + fmt(s.h)}`, true) : '');
      const selected = s.sx === 1 ? (s.sy === 1 ? 'none' : 'x') : s.sy === 1 ? 'y' : 'origin';
      document.querySelectorAll('[data-reflect]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.reflect === selected)));
    } else {
      graph += line({ x: view.min, y: view.min }, { x: view.max, y: view.max }, '#66798c', '6 5', 1.8);
      graph += curve('exp', s.a, colors.exp) + curve('log', s.a, colors.log);
      const p = M.point('exp', s.a, s.t), q = { x: p.y, y: p.x }, mid = M.mirror(p, .5);
      graph += line(p, q, colors.green, '4 4', 1.7) + dot(mid, colors.green, '中點');
      if (s.progress > 0 && s.progress < 1) graph += curve('exp', s.a, '#34669c', { mirror: s.progress, dash: true, width: 2 });
      graph += dot(p, colors.exp, 'P', 't') + dot(q, colors.log, 'Q', 'q');
      if (s.progress > 0 && s.progress < 1) graph += dot(M.mirror(p, s.progress), '#34669c', '交換中');
      reading = `<strong>P = ${pointText(p)} → Q = ${pointText(q)}</strong><br>連線中點 ${pointText(mid)} 在 y = x 上。`;
      keys = legend(colors.exp, '指數 y = aˣ') + legend(colors.log, '對數 y = logₐx') + legend('#66798c', '對稱軸 y = x', true);
      const roots = M.positiveBaseIntersections(s.a);
      $('fit-points').hidden = !s.advanced || !roots || !roots.length;
      if (s.advanced) {
        if (roots) roots.forEach((x, i) => { graph += dot({ x, y: x }, colors.gold, roots.length === 1 ? '(e, e)' : `交點 ${i + 1}`); });
        const outside = roots && roots.some(x => x < view.min || x > view.max);
        $('intersection-reading').innerHTML = roots === null ? '<p class="muted">這組進階比較聚焦 a &gt; 1。請選上方任一範例底數。</p>' : `<p class="discovery"><b>${roots.length} 個交點</b>${roots.length ? '<br>' + roots.map(x => pointText({ x, y: x })).join('、') : ''}${outside ? '<br>有交點在畫面外，可按「看全部交點」。' : ''}</p><p class="muted">${roots.length === 1 ? 'a = e^(1/e) ≈ 1.445 時，唯一交點是 (e, e)。' : '1 < a < e^(1/e)：兩個；a = e^(1/e)：一個；a > e^(1/e)：沒有。'}</p>`;
      }
    }
    if (topic !== 'inverse') $('fit-points').hidden = true;
    const bounds = { min: view.min, max: view.max };
    $('plot').setAttribute('viewBox', `0 0 ${size} ${size}`);
    const desc = `${titles[topic]}。底數 ${fmt(s.a)}。${topic === 'inverse' ? '指數與對數互為反函數。' : `${kind === 'exp' ? '指數' : '對數'}函數。`}目前座標視野 ${fmt(bounds.min)} 到 ${fmt(bounds.max)}。`;
    $('plot').innerHTML = `<title id="plot-title">${titles[topic]}</title><desc id="plot-description">${desc}</desc><defs><clipPath id="plot-clip"><rect x="${padding}" y="${padding}" width="${size - 2 * padding}" height="${size - 2 * padding}"/></clipPath></defs>${axes()}<g clip-path="url(#plot-clip)">${graph}</g>`;
    $('legend').innerHTML = keys; $('live-reading').innerHTML = reading;
    $('findings').innerHTML = findings();
  }
  function findings() {
    const kind = s.kind, shift = s.topic === 'shift', p = M.properties(kind, s.a, shift ? s.h : 0, shift ? s.k : 0, shift ? s.sx : 1, shift ? s.sy : 1);
    if (s.topic === 'inverse') return `<div class="discovery">指數的點 (t, aᵗ)，交換坐標後為 (aᵗ, t)，就在同底對數曲線上。</div><dl class="property-list"><dt>指數</dt><dd>定義域 ℝ；值域 y &gt; 0</dd><dt>對數</dt><dd>定義域 x &gt; 0；值域 ℝ</dd><dt>必過點</dt><dd>(0, 1) ↔ (1, 0)</dd><dt>漸近線</dt><dd>y = 0 ↔ x = 0</dd><dt>遞增遞減</dt><dd>${s.a > 1 ? '兩者皆嚴格遞增' : '兩者皆嚴格遞減'}</dd></dl><p class="math-line">log<sub>${af()}</sub>((${af()})<sup>x</sup>) = x（x ∈ ℝ）<br>(${af()})<sup>log<sub>${af()}</sub>x</sup> = x（x &gt; 0）</p><p class="muted">互為反函數：先做其中一個函數，再做另一個，回到原來的輸入。</p>`;
    if (s.topic === 'compare') return `<div class="discovery">${s.a > 1 ? 'a > 1：由左往右變高，保持比較方向。' : '0 < a < 1：由左往右變低，反轉比較方向。'}</div><p class="math-line">${kind === 'exp' ? `a<sup>m</sup> &gt; a<sup>n</sup>` : 'log<sub>a</sub>m &gt; log<sub>a</sub>n'} ⇔ m ${s.a > 1 ? '&gt;' : '&lt;'} n</p>${kind === 'log' ? '<p class="muted">前提：m、n 都要大於 0。</p>' : ''}`;
    if (s.topic === 'chord') {
      const c = M.chord(kind, s.a, s.m, s.n), up = p.concavity > 0;
      return `<div class="discovery">${kind === 'exp' ? '指數函數不論底數大於或小於 1，都凹口向上。' : s.a > 1 ? '對數底數大於 1，凹口向下。' : '對數底數介於 0、1 之間，凹口向上。'}</div><p><b>${up ? '弦中點 C 在曲線點 D 上方。' : '弦中點 C 在曲線點 D 下方。'}</b></p><p class="math-line">[f(m) + f(n)] / 2 ${up ? '&gt;' : '&lt;'} f((m+n)/2)</p><p>高度差 C − D = ${fmt(c.average - c.curve)}</p><p class="muted">m ≠ n；對數還需要 m、n &gt; 0。遞增遞減與凹口方向是不同的性質。</p>`;
    }
    let out = `<dl class="property-list"><dt>底數分類</dt><dd>${s.a > 1 ? 'a > 1（正常底數）' : '0 < a < 1（反常底數）'}</dd><dt>定義域</dt><dd>${interval(p.domain, 'x')}</dd><dt>值域</dt><dd>${interval(p.range, 'y')}</dd><dt>漸近線</dt><dd>${p.asymptote.axis} = ${fmt(p.asymptote.value)}</dd><dt>${shift ? '代表點' : '必過點'}</dt><dd>${pointText(p.anchor)}</dd><dt>圖形趨勢</dt><dd>嚴格遞${p.increasing ? '增' : '減'}</dd><dt>凹口方向</dt><dd>向${p.concavity > 0 ? '上' : '下'}</dd></dl>`;
    if (shift) {
      const reflection = s.sx === 1 ? s.sy === 1 ? '不對稱' : '對稱 x 軸：y 變號' : s.sy === 1 ? '對稱 y 軸：x 變號' : '對稱原點：x、y 都變號';
      out += `<div class="discovery">${reflection}，再平移 (h, k) = (${fmt(s.h)}, ${fmt(s.k)})。</div><p>原來的點 (u, v) → (${s.sx < 0 ? '−u' : 'u'} ${s.h < 0 ? '−' : '+'} ${fmt(Math.abs(s.h))}, ${s.sy < 0 ? '−v' : 'v'} ${s.k < 0 ? '−' : '+'} ${fmt(Math.abs(s.k))})</p>`;
      if (kind === 'exp' && s.sx === 1 && s.sy === 1 && s.k === 0 && s.h !== 0) out += `<p class="math-line">a<sup>x−h</sup> = a<sup>−h</sup> · a<sup>x</sup></p><p>此例也等於把 y 值乘上 ${fmt(Math.pow(s.a, -s.h))}。</p>`;
      if (kind === 'log' && s.sx === 1 && s.sy === 1 && s.h === 0 && s.k !== 0) out += '<p class="math-line">log<sub>a</sub>x + k = log<sub>a</sub>(a<sup>k</sup>x)</p>';
    } else out += `<div class="discovery">${kind === 'exp' ? '比較不同底數：x > 0 時，底數越大曲線越高；x < 0 時順序相反。' : '比較同一類底數：a > 1 時，底數越大，曲線越靠近 x 軸；0 < a < 1 時，底數越小，曲線越靠近 x 軸。x = 1 左右，高低順序相反。'}</div><p class="muted">a 必須大於 0。a = 1 時指數為常數 y = 1，無法建立對應的對數函數。</p>`;
    return out;
  }
  function selectTopic(topic) {
    stopAnimation(); s = defaults(topic); view = { min: topic === 'shift' ? -5 : -3, max: 7 };
    document.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.topic === topic)));
    $('base-error').textContent = ''; updateBase(); setupControls(); render();
  }
  document.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => selectTopic(b.dataset.topic)));
  document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { stopAnimation(); s.kind = b.dataset.kind; s.revealed = false; normalizePoints(); setupControls(); render(); }));
  document.querySelectorAll('[data-base]').forEach(b => b.addEventListener('click', () => setBase(Number(b.dataset.base))));
  $('base-slider').addEventListener('input', e => { let v = Number(e.target.value); if (Math.abs(v) < .03) v = v < 0 ? -.03 : .03; setBase(Math.pow(2, v)); });
  $('base-form').addEventListener('submit', e => { e.preventDefault(); const raw = $('base-input').value.trim(); if (!raw) { $('base-error').textContent = '請先輸入底數。'; return; } setBase(Number(raw)); });
  $('reset').addEventListener('click', () => selectTopic(s.topic));
  $('reveal').addEventListener('click', () => { s.revealed = !s.revealed; render(); });
  function zoom(factor) {
    const span = Math.max(4, Math.min(1000000, (view.max - view.min) * factor));
    view = { min: -.3 * span, max: .7 * span }; render();
  }
  $('zoom-in').addEventListener('click', () => zoom(.75)); $('zoom-out').addEventListener('click', () => zoom(1.4));
  $('home-view').addEventListener('click', () => { view = { min: s.topic === 'shift' ? -5 : -3, max: 7 }; render(); });
  $('fit-points').addEventListener('click', () => { const roots = M.positiveBaseIntersections(s.a); if (!roots || !roots.length) return; const max = Math.max(7, roots[roots.length - 1] * 1.18); view = { min: -max * .15, max }; render(); });
  const plot = $('plot');
  function eventPoint(e) { const r = plot.getBoundingClientRect(); return fromPixel((e.clientX - r.left) / r.width * size, (e.clientY - r.top) / r.height * size); }
  plot.addEventListener('pointerdown', e => {
    const target = e.target.closest('[data-handle]'); if (!target || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stopAnimation(); drag = { handle: target.dataset.handle, pointer: e.pointerId }; plot.classList.add('dragging'); plot.setPointerCapture(e.pointerId); e.preventDefault();
  });
  plot.addEventListener('pointermove', e => {
    if (!drag || drag.pointer !== e.pointerId) return;
    const p = eventPoint(e), handle = drag.handle;
    if (handle === 't') s.t = Math.max(-3, Math.min(4, s.topic === 'inverse' || s.kind === 'exp' ? p.x : p.y));
    if (handle === 'q') s.t = Math.max(-3, Math.min(4, p.y));
    if (handle === 'm') s.m = Math.max(s.kind === 'log' ? .1 : -3, Math.min(s.n - .1, s.kind === 'log' ? 7 : 4, p.x));
    if (handle === 'n') s.n = Math.max(s.m + .1, Math.min(7, p.x));
    if (handle === 'mid') { const width = (s.n - s.m) / 2, min = s.kind === 'log' ? .1 : -3, maxM = s.kind === 'log' ? 7 : 4; s.m = Math.max(min, Math.min(maxM, 7 - 2 * width, p.x - width)); s.n = s.m + 2 * width; }
    if (handle === 'shift') {
      s.h = Math.round(Math.max(-4, Math.min(4, s.kind === 'exp' ? p.x : p.x - s.sx)) * 4) / 4;
      s.k = Math.round(Math.max(-4, Math.min(4, s.kind === 'exp' ? p.y - s.sy : p.y)) * 4) / 4;
    }
    s.t = Math.round(s.t * 20) / 20;
    s.m = Math.round(s.m * 10) / 10; s.n = Math.round(s.n * 10) / 10;
    syncOutputs(); render(); e.preventDefault();
  });
  function endDrag() { drag = null; plot.classList.remove('dragging'); }
  plot.addEventListener('pointerup', endDrag); plot.addEventListener('pointercancel', endDrag); plot.addEventListener('lostpointercapture', endDrag);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAnimation(); });
  new ResizeObserver(entries => { const width = Math.round(entries[0].contentRect.width); if (width > 0 && width !== size) { size = width; padding = width < 400 ? 28 : 33; render(); } }).observe(plot.parentElement);
  updateBase(); setupControls(); render();
})();
