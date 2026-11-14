(() => {
  'use strict';
  const M = MotionCore, L = ScienceLab, $ = id => document.getElementById(id);
  const canvas = $('motion'), ctx = canvas.getContext('2d');
  const SCALE = 2, W = 720; // 畫布以 2 倍解析度繪製，投影到大螢幕也清晰
  const H = { linear: 540, proj: 440 };
  const C = { bg: '#102738', grid: '#2a465c', axis: '#7f9bb0', text: '#cfe0ee', blue: '#6cb4ff', orange: '#ffb067', purple: '#c9a2ff', green: '#5cdd9c', yellow: '#ffd866', red: '#ff7b86' };

  // ---------- 狀態 ----------
  const S = { x0: 0, v0: 4, a: 2, pv: 20, angle: 45, h0: 0, g: 9.8, compare: false, ghost: false };
  let topic = 'linear', modeName = 'free', t = 0, playing = false, speed = 1, last = 0, guide = null;

  const controlDefs = {
    linear: [
      { key: 'x0', label: '起點 x₀', min: -20, max: 20, step: 1, unit: ' m' },
      { key: 'v0', label: '初速 v₀', min: -20, max: 20, step: 1, unit: ' m/s' },
      { key: 'a', label: '加速度 a', min: -10, max: 10, step: 1, unit: ' m/s²' }
    ],
    proj: [
      { key: 'pv', label: '初速 v₀', min: 5, max: 40, step: 1, unit: ' m/s' },
      { key: 'angle', label: '拋射角 θ', min: 0, max: 90, step: 1, unit: '°' },
      { key: 'h0', label: '起始高度 h₀', min: 0, max: 50, step: 1, unit: ' m' }
    ]
  };
  const presets = {
    linear: [
      ['等速', { x0: 0, v0: 5, a: 0 }], ['等加速', { x0: 0, v0: 0, a: 2 }], ['減速折返', { x0: 0, v0: 10, a: -4 }]
    ],
    proj: [
      ['水平拋射', { pv: 12, angle: 0, h0: 30, ghost: false, compare: true }], ['45° 最遠', { pv: 20, angle: 45, h0: 0, ghost: false, compare: false }],
      ['30° 對 60°', { pv: 20, angle: 30, h0: 0, ghost: true, compare: false }]
    ]
  };

  // ---------- 小工具 ----------
  const fmt = x => { if (!Number.isFinite(x)) return '—'; const r = Math.abs(x) < 0.005 ? 0 : +x.toFixed(2); return String(r).replace('-', '−'); };
  const niceStep = raw => { const p = 10 ** Math.floor(Math.log10(raw)), n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; };
  const pParams = () => ({ v0: S.pv, angleDeg: S.angle, h0: S.h0, g: S.g });
  const lParams = () => ({ x0: S.x0, v0: S.v0, a: S.a });
  const pSummary = () => M.summary(pParams());
  const tmax = () => topic === 'linear' ? 10 : Math.max(pSummary().T, 0.01);
  const same = (o) => Object.keys(o).every(k => S[k] === o[k]);

  // ---------- 控制項 ----------
  function buildControls() {
    const defs = controlDefs[topic];
    let html = defs.map(d => `<div class="control"><label for="c-${d.key}">${d.label}</label><input id="c-${d.key}" data-key="${d.key}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${S[d.key]}"><output id="c-${d.key}-out" for="c-${d.key}">${fmt(S[d.key])}${d.unit}</output></div>`).join('');
    if (topic === 'proj') {
      html += `<div class="control"><label for="c-g">重力環境</label><select id="c-g"><option value="9.8">地球（g = 9.8）</option><option value="1.62">月球（g = 1.62）</option></select></div>
      <div class="actions motion-toggle" role="group" aria-label="對照顯示"><button type="button" id="t-compare" aria-pressed="${S.compare}">同時自由落下的球</button><button type="button" id="t-ghost" aria-pressed="${S.ghost}">疊加互補角軌跡</button></div>`;
    }
    $('controls').innerHTML = html;
    defs.forEach(d => $('c-' + d.key).addEventListener('input', e => { S[d.key] = +e.target.value; $('c-' + d.key + '-out').textContent = fmt(S[d.key]) + d.unit; changed(); }));
    if (topic === 'proj') {
      $('c-g').value = String(S.g);
      $('c-g').addEventListener('change', e => { S.g = +e.target.value; changed(); });
      $('t-compare').addEventListener('click', () => { S.compare = !S.compare; $('t-compare').setAttribute('aria-pressed', S.compare); draw(); });
      $('t-ghost').addEventListener('click', () => { S.ghost = !S.ghost; $('t-ghost').setAttribute('aria-pressed', S.ghost); draw(); });
    }
    $('presets').innerHTML = presets[topic].map((p, i) => `<button type="button" data-preset="${i}">${p[0]}</button>`).join('');
    $('presets').querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => { apply(presets[topic][+b.dataset.preset][1]); setTime(0); }));
  }
  // 以程式設定參數並同步畫面（自修任務與快速設定使用）
  function apply(values) {
    Object.assign(S, values);
    controlDefs[topic].forEach(d => { const el = $('c-' + d.key); if (el) { el.value = S[d.key]; $('c-' + d.key + '-out').textContent = fmt(S[d.key]) + d.unit; } });
    if ($('c-g')) $('c-g').value = String(S.g);
    if ($('t-compare')) $('t-compare').setAttribute('aria-pressed', S.compare);
    if ($('t-ghost')) $('t-ghost').setAttribute('aria-pressed', S.ghost);
    changed();
  }
  function changed() {
    const m = tmax(); $('time').max = m; $('time').step = topic === 'linear' ? 0.05 : Math.max(0.01, +(m / 200).toFixed(3));
    t = Math.min(t, m); $('time').value = t; $('time').disabled = m <= 0.01;
    $('time-out').textContent = fmt(t) + ' s'; draw();
  }
  function setTime(v) {
    t = Math.max(0, Math.min(tmax(), v)); $('time').value = t; $('time-out').textContent = fmt(t) + ' s';
    document.dispatchEvent(new Event('change')); // 讓自修任務知道時間改變了
    draw();
  }
  function setPlaying(v) { playing = v; $('play').textContent = playing ? '暫停' : (t >= tmax() - 1e-9 ? '重新播放' : '播放'); if (playing) { if (t >= tmax() - 1e-9) setTime(0); last = 0; requestAnimationFrame(tick); } }
  function tick(now) {
    if (!playing) return;
    if (last) { const next = t + (now - last) / 1000 * speed; if (next >= tmax()) { setTime(tmax()); setPlaying(false); return; } t = next; $('time').value = t; $('time-out').textContent = fmt(t) + ' s'; draw(); }
    last = now; requestAnimationFrame(tick);
  }

  // ---------- 繪圖 ----------
  function line(x1, y1, x2, y2, color = C.grid, width = 1, dash = []) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); }
  function label(s, x, y, color = C.text, size = 12, align = 'left') { ctx.fillStyle = color; ctx.font = `${size}px system-ui,'Microsoft JhengHei',sans-serif`; ctx.textAlign = align; ctx.fillText(s, x, y); }
  function dot(x, y, r, color, hollow = false) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); if (hollow) { ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); } }
  function arrow(x1, y1, x2, y2, color, width = 3) {
    const len = Math.hypot(x2 - x1, y2 - y1); if (len < 3) return; line(x1, y1, x2, y2, color, width);
    const a = Math.atan2(y2 - y1, x2 - x1); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 10 * Math.cos(a - 0.45), y2 - 10 * Math.sin(a - 0.45)); ctx.lineTo(x2 - 10 * Math.cos(a + 0.45), y2 - 10 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
  }
  function ticks(lo, hi, wanted) { const st = niceStep((hi - lo) / wanted), out = []; for (let i = Math.ceil(lo / st - 1e-9); i * st <= hi + 1e-9; i++) out.push(i * st); return out; }
  function range(values, pad = 0.1) { let lo = Math.min(0, ...values), hi = Math.max(0, ...values); if (hi - lo < 1e-6) { lo -= 1; hi += 1; } const d = (hi - lo) * pad; return [lo - d, hi + d]; }

  function graph(box, o) {
    const { x, y, w, h } = box, [lo, hi] = o.yr, X = s => x + s / o.xmax * w, Y = v => y + h - (v - lo) / (hi - lo) * h;
    ctx.fillStyle = '#0c2030'; ctx.fillRect(x, y, w, h);
    ticks(lo, hi, 5).forEach(v => { line(x, Y(v), x + w, Y(v), v === 0 ? C.axis : C.grid, v === 0 ? 1.5 : 1); label(fmt(v), x - 5, Y(v) + 4, C.axis, 11, 'right'); });
    ticks(0, o.xmax, 5).forEach(s => { line(X(s), y, X(s), y + h, C.grid); label(fmt(s), X(s), y + h + 14, C.axis, 11, 'center'); });
    label(o.title, x, y - 8, C.text, 13); label('t (s)', x + w, y + h + 28, C.axis, 11, 'right');
    if (o.shade) { const k = 60; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); for (let i = 0; i <= k; i++) { const s = t * i / k; ctx.lineTo(X(s), Y(o.fn(s))); } ctx.lineTo(X(t), Y(0)); ctx.closePath(); ctx.fillStyle = 'rgba(108,180,255,.28)'; ctx.fill(); }
    ctx.strokeStyle = o.color; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const s = o.xmax * i / 120; i ? ctx.lineTo(X(s), Y(o.fn(s))) : ctx.moveTo(X(s), Y(o.fn(s))); } ctx.stroke();
    if (o.tangent) { const v = o.tangent(t), cx = X(t), cy = Y(o.fn(t)), dx = 40; line(cx - dx, cy + v * (dx / w * o.xmax) * (h / (hi - lo)), cx + dx, cy - v * (dx / w * o.xmax) * (h / (hi - lo)), C.yellow, 2, [6, 4]); }
    line(X(t), y, X(t), y + h, C.yellow, 1.5, [4, 4]); dot(X(t), Y(o.fn(t)), 6, C.yellow);
    if (o.note) label(o.note, x + w - 6, y + 16, C.yellow, 12, 'right');
  }

  function drawLinear() {
    const p = lParams(), s = M.linear(p, t), samples = []; for (let i = 0; i <= 100; i++) samples.push(M.linear(p, i / 10));
    const xr = range(samples.map(q => q.x), 0.12), vr = range(samples.map(q => q.v), 0.15);
    // 軌道
    const left = 50, tw = W - 100, X = v => left + (v - xr[0]) / (xr[1] - xr[0]) * tw, ty = 112;
    label('軌道（x 軸，單位 m）', left, 24, C.text, 13); line(left, ty + 16, left + tw, ty + 16, C.axis, 2);
    ticks(xr[0], xr[1], 8).forEach(v => { line(X(v), ty + 10, X(v), ty + 22, C.axis, 1.5); label(fmt(v), X(v), ty + 38, C.axis, 11, 'center'); });
    for (let k = 0; k <= Math.floor(t + 1e-9) && k <= 10; k++) { const q = M.linear(p, k); dot(X(q.x), ty + 52, 3.5, 'rgba(255,216,102,.7)'); }
    label('黃點：每 1 秒的位置', left + tw, ty + 70, '#9fb4c5', 11, 'right');
    dot(X(S.x0), ty - 4, 4, C.green); label('x₀', X(S.x0), ty - 12, C.green, 11, 'center');
    const cx = X(s.x); ctx.fillStyle = C.blue; ctx.fillRect(cx - 20, ty - 18, 40, 24); dot(cx - 11, ty + 10, 5, '#d8e6f2'); dot(cx + 11, ty + 10, 5, '#d8e6f2');
    arrow(cx, ty - 28, cx + Math.max(-70, Math.min(70, s.v * 4)), ty - 28, C.orange); label(`v = ${fmt(s.v)}`, cx, ty - 38, C.orange, 12, 'center');
    // 圖形
    const gy = 205, gh = 270, gw = 280;
    graph({ x: 52, y: gy, w: gw, h: gh }, { title: 'x – t 圖（斜率 = 速度）', xmax: 10, yr: xr, fn: q => M.linear(p, q).x, color: C.blue, tangent: q => M.linear(p, q).v, note: `斜率 = ${fmt(s.v)} m/s` });
    graph({ x: 398, y: gy, w: gw, h: gh }, { title: 'v – t 圖（斜率 = 加速度，面積 = 位移）', xmax: 10, yr: vr, fn: q => M.linear(p, q).v, color: C.orange, shade: true, note: `面積 = ${fmt(s.displacement)} m` });
    label(`a = ${fmt(S.a)} m/s²（v–t 圖斜率）`, 398 + gw / 2, gy + gh + 44, C.text, 12, 'center');
    $('readings').innerHTML = [['時間 t', fmt(t) + ' s'], ['位置 x', fmt(s.x) + ' m'], ['速度 v', fmt(s.v) + ' m/s'], ['位移 Δx', fmt(s.displacement) + ' m'], ['路程', fmt(s.distance) + ' m'], ['加速度 a', fmt(S.a) + ' m/s²']].map(([k, v]) => `<div class="reading"><span class="muted">${k}</span><strong>${v}</strong></div>`).join('');
    const end = M.linear(p, 10);
    $('results').textContent = s.turn === null ? `0～10 s 內運動方向不變；10 s 時位置 ${fmt(end.x)} m。` : `折返時刻 t = ${fmt(s.turn)} s（v = 0），折返位置 x = ${fmt(s.turnX)} m；此時加速度仍是 ${fmt(S.a)} m/s²。`;
  }

  function trajectory(p, scale, ox, oy, color, dash, upTo) {
    const T = M.summary(p).T; ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash); ctx.beginPath();
    const end = upTo === undefined ? T : Math.min(T, upTo);
    for (let i = 0; i <= 160; i++) { const q = M.projectile(p, end * i / 160); i ? ctx.lineTo(ox + q.x * scale, oy - q.y * scale) : ctx.moveTo(ox + q.x * scale, oy - q.y * scale); } ctx.stroke(); ctx.setLineDash([]);
  }
  function drawProj() {
    const p = pParams(), sm = M.summary(p), tt = Math.min(t, sm.T), q = M.projectile(p, tt);
    const gp = { ...p, angleDeg: 90 - S.angle }, gs = M.summary(gp);
    const xmaxW = Math.max(sm.R, S.ghost ? gs.R : 0, 10) * 1.08, ymaxW = Math.max(sm.H, S.ghost ? gs.H : 0, 5) * 1.18;
    const ox = 56, oy = H.proj - 42, scale = Math.min((W - ox - 24) / xmaxW, (oy - 24) / ymaxW);
    label('水平 x (m)', W - 24, oy + 32, C.axis, 11, 'right'); label('高度 y (m)', 8, 14, C.axis, 11);
    ticks(0, ymaxW, 5).forEach(v => { line(ox, oy - v * scale, W - 24, oy - v * scale, C.grid); label(fmt(v), ox - 6, oy - v * scale + 4, C.axis, 11, 'right'); });
    ticks(0, xmaxW, 8).forEach(v => { line(ox + v * scale, oy, ox + v * scale, 24, C.grid); label(fmt(v), ox + v * scale, oy + 16, C.axis, 11, 'center'); });
    line(ox, oy, W - 24, oy, C.axis, 2.5); line(ox, oy, ox, 20, C.axis, 1.5);
    if (S.ghost) { trajectory(gp, scale, ox, oy, C.green, [7, 5]); label(`互補角 θ′ = ${fmt(90 - S.angle)}°　R′ = ${fmt(gs.R)} m`, Math.min(ox + gs.R * scale, W - 24), oy - 26, C.green, 12, 'right'); }
    if (sm.T > 0.01) { trajectory(p, scale, ox, oy, 'rgba(207,224,238,.3)', [5, 5]); trajectory(p, scale, ox, oy, C.blue, [], tt); }
    const step = sm.T > 6 ? 1 : 0.5; for (let k = step; k <= tt + 1e-9; k += step) { const d = M.projectile(p, k); dot(ox + d.x * scale, oy - d.y * scale, 3.5, 'rgba(255,216,102,.85)'); }
    if (sm.T > 0.01 && sm.vy > 0) { const pk = M.projectile(p, sm.tPeak); line(ox + pk.x * scale, oy - pk.y * scale, ox + pk.x * scale, oy, C.grid, 1, [3, 4]); label(`最高點 H = ${fmt(sm.H)} m`, ox + pk.x * scale, oy - pk.y * scale - 10, '#9fb4c5', 11, 'center'); }
    if (sm.T > 0.01) label(`R = ${fmt(sm.R)} m`, Math.min(ox + sm.R * scale, W - 24), oy - 10, C.blue, 12, 'right');
    const px = ox + q.x * scale, py = oy - q.y * scale;
    if (S.compare) { const fy = Math.max(0, S.h0 - 0.5 * S.g * tt * tt), fyp = oy - fy * scale; line(ox, fyp, px, py, 'rgba(255,255,255,.35)', 1.5, [6, 5]); dot(ox, fyp, 7, C.red, true); label('自由落體', ox + 12, fyp - 10, C.red, 11); }
    const k = Math.min(3.5, 150 / Math.max(sm.vx, Math.abs(sm.vy) + 1, q.speed, 1)); // 箭頭每 m/s 的像素長度
    arrow(px, py, px + q.vx * k, py, C.blue); arrow(px, py, px, py - q.vy * k, C.orange); arrow(px, py, px + q.vx * k, py - q.vy * k, C.purple, 3.5);
    dot(px, py, 7, C.yellow);
    label('vₓ', px + q.vx * k + 6, py + 4, C.blue, 12); if (Math.abs(q.vy) > 0.5) label('vᵧ', px + 8, py - q.vy * k, C.orange, 12); label('v', px + q.vx * k + 6, py - q.vy * k - 6, C.purple, 12);
    $('readings').innerHTML = [['時間 t', fmt(tt) + ' s'], ['水平位置 x', fmt(q.x) + ' m'], ['高度 y', fmt(Math.max(0, q.y)) + ' m'], ['水平速度 vₓ', fmt(q.vx) + ' m/s'], ['鉛直速度 vᵧ', fmt(q.vy) + ' m/s'], ['速率 |v|', fmt(q.speed) + ' m/s']].map(([k2, v]) => `<div class="reading"><span class="muted">${k2}</span><strong>${v}</strong></div>`).join('');
    $('results').textContent = sm.T <= 0.01 ? 'h₀ = 0 且水平拋射時不會飛行，請提高起始高度或調大拋射角。' : `飛行時間 T = ${fmt(sm.T)} s　射程 R = ${fmt(sm.R)} m　最大高度 H = ${fmt(sm.H)} m`;
  }

  function draw() {
    if (canvas.height !== H[topic] * SCALE) { canvas.height = H[topic] * SCALE; canvas.width = W * SCALE; }
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H[topic]);
    if (topic === 'linear') drawLinear(); else drawProj();
    if (!playing) $('play').textContent = t >= tmax() - 1e-9 && tmax() > 0.01 ? '重新播放' : '播放';
  }

  // ---------- 自修任務（預測 → 操作驗證 → 記錄觀察 → 說明原因） ----------
  const opt = (question, options, answer, hint) => ({ question, options, answer, hint });
  const near = (v, target, tol = 0.1) => Math.abs(v - target) <= tol + 1e-9;
  const lessonsFor = {
    linear: [
      { id: 'slope', title: 'x–t 圖的斜率是什麼？', prediction: { question: '等速直線運動的 x–t 圖是一條斜直線。把這條線畫得更陡，代表什麼變大？', options: ['速度', '加速度', '位移的方向'] },
        task: '按「準備」後，保持加速度 a = 0，把初速 v₀ 調到 8 m/s 以上，再讀取結果。',
        prepare() { apply({ x0: 0, v0: 2, a: 0 }); setTime(4); },
        check() { return S.a === 0 && S.v0 >= 8 ? { ok: true, evidence: `a = 0、v₀ = ${S.v0} m/s：x–t 直線每秒上升 ${S.v0} m，斜率 = ${S.v0} m/s` } : { ok: false, message: '請保持 a = 0，並把 v₀ 調到 8 m/s 以上。' }; },
        observation: opt('x–t 圖直線的斜率，數值上等於哪個量？', ['速度 v', '加速度 a', '位移 Δx'], 0, '斜率是縱軸變化量除以橫軸變化量：位置變化 ÷ 時間。'),
        reason: opt('為什麼？', ['斜率 = Δx ÷ Δt，正是速度的定義', '因為圖畫成這樣只是巧合', '斜率 = v² ÷ 2a'], 0, '想想「每秒走多遠」。'),
        conclusion: 'x–t 圖的斜率就是速度：線越陡，速度越大；線向下傾斜，速度為負。' },
      { id: 'area', title: 'v–t 圖下的面積是什麼？', prediction: { question: '加速的物體，v–t 圖和時間軸之間圍出的面積，代表哪個量？', options: ['位移', '加速度', '最後的速度'] },
        task: '按「準備」後，把時間 t 調到 5 秒（±0.1 秒），觀察藍色面積與位置 x 的關係。',
        prepare() { apply({ x0: 0, v0: 4, a: 2 }); setTime(0); },
        check() { if (!same({ x0: 0, v0: 4, a: 2 })) return { ok: false, message: '請先不要改 x₀、v₀、a；只調整時間。' }; if (!near(t, 5)) return { ok: false, message: '請把時間 t 調到 5 秒（±0.1 秒）。' }; const s = M.linear(lParams(), t); return { ok: true, evidence: `v₀ = 4、a = 2、t = ${fmt(t)} s：v 由 4 變成 ${fmt(s.v)}，梯形面積 ≈ ${fmt((4 + s.v) / 2 * t)} m，位移 Δx = ${fmt(s.displacement)} m` }; },
        observation: opt('v–t 圖下方的面積，和哪個量相等？', ['位移 Δx', '加速度 a', '初速 v₀'], 0, '比較「面積」與「位移 Δx」兩個讀數。'),
        reason: opt('為什麼面積會是這個量？', ['速度 × 時間 一小段一小段累積起來，就是走過的距離', '因為面積單位是 m/s²', '面積只是裝飾，沒有意義'], 0, '速度 × 時間 的單位是什麼？'),
        conclusion: 'v–t 圖的面積是位移：把每一小段「速度 × 時間」加起來。梯形面積 = （上底＋下底）× 高 ÷ 2。' },
      { id: 'turn', title: '速度為 0 時，加速度也是 0 嗎？', prediction: { question: '物體向右射出後減速、折返。折返的瞬間速度為 0，加速度呢？', options: ['仍不為 0', '也是 0', '變成正的'] },
        task: '按「準備」後，把時間 t 調到折返點 2.5 秒（±0.1 秒），讀取 v 與 a。',
        prepare() { apply({ x0: 0, v0: 10, a: -4 }); setTime(0); },
        check() { if (!same({ x0: 0, v0: 10, a: -4 })) return { ok: false, message: '請先不要改 x₀、v₀、a；只調整時間。' }; if (!near(t, 2.5)) return { ok: false, message: '請把時間 t 調到 2.5 秒（±0.1 秒）。' }; const s = M.linear(lParams(), t); return { ok: true, evidence: `t = ${fmt(t)} s：v ≈ ${fmt(s.v)} m/s，但 a = ${fmt(S.a)} m/s²；位置 x = ${fmt(s.x)} m` }; },
        observation: opt('速度為 0 的瞬間，加速度是？', ['仍是 −4 m/s²', '0', '+4 m/s²'], 0, '看 v–t 圖：直線在這一點仍然向下傾斜。'),
        reason: opt('為什麼？', ['加速度是速度的變化率；速度正由正變負，變化仍在進行', '速度為 0 就表示物體不再改變', '加速度永遠和速度同時歸零'], 0, '加速度看的是 v–t 圖的斜率，不是 v 的大小。'),
        conclusion: '速度為 0 不代表加速度為 0。折返點是速度改變正負的瞬間，加速度一直是 −4 m/s²。' },
      { id: 'distance', title: '位移與路程', prediction: { question: '物體向右走一段、折返後回到起點。位移與路程各是多少？', options: ['位移 0，路程不為 0', '位移不為 0，路程 0', '兩者都是 0'] },
        task: '按「準備」後，把時間 t 調到 5 秒（±0.1 秒），比較「位移」與「路程」。',
        prepare() { apply({ x0: 0, v0: 10, a: -4 }); setTime(0); },
        check() { if (!same({ x0: 0, v0: 10, a: -4 })) return { ok: false, message: '請先不要改 x₀、v₀、a；只調整時間。' }; if (!near(t, 5)) return { ok: false, message: '請把時間 t 調到 5 秒（±0.1 秒）。' }; const s = M.linear(lParams(), t); return { ok: true, evidence: `t = ${fmt(t)} s：位移 = ${fmt(s.displacement)} m，路程 = ${fmt(s.distance)} m` }; },
        observation: opt('此刻位移與路程的關係是？', ['位移約 0 m，路程約 25 m', '位移 25 m，路程 0 m', '兩者都是 0'], 0, '看「位移 Δx」與「路程」兩個讀數。'),
        reason: opt('為什麼兩者不同？', ['位移只看起點到終點；路程把來回走過的長度全部加起來', '路程一定比位移小', '兩者是同一個量'], 0, '回到起點時，起點到終點的距離是多少？'),
        conclusion: '位移是起點指向終點的改變量，路程是走過的總長度。有折返時，路程會大於位移的大小。' }
    ],
    proj: [
      { id: 'drop', title: '水平拋出與自由落下，誰先落地？', prediction: { question: '兩顆球同高度同時開始：一顆水平拋出，一顆自由落下。誰先落地？', options: ['同時落地', '水平拋出的較晚', '自由落下的較晚'] },
        task: '按「準備」後，播放或把時間拉到最後，看兩球是否同時落地。',
        prepare() { apply({ pv: 12, angle: 0, h0: 30, g: 9.8, compare: true, ghost: false }); setTime(0); setPlaying(false); },
        check() { if (!(S.angle === 0 && S.compare && S.h0 >= 10)) return { ok: false, message: '請保持 θ = 0°、h₀ ≥ 10 m，並開啟「同時自由落下的球」。' }; const sm = pSummary(); if (t < sm.T - 0.05) return { ok: false, message: '請播放或把時間拉到最後，直到球落地。' }; return { ok: true, evidence: `θ = 0°、h₀ = ${S.h0} m：兩球都在 t = ${fmt(sm.T)} s 落地；水平拋出的球已前進 ${fmt(sm.R)} m` }; },
        observation: opt('你看到的結果是？', ['兩球同高度、同時落地', '水平拋出的球較晚落地', '自由落下的球較晚落地'], 0, '看虛線：兩球在每個時刻是否同高？'),
        reason: opt('為什麼？', ['鉛直方向只受重力，兩球的鉛直運動完全相同；水平速度不影響下落', '水平拋出的球比較輕', '水平速度會讓球飛得更高'], 0, '把運動拆成水平與鉛直兩個方向分開看。'),
        conclusion: '水平與鉛直運動互相獨立。鉛直方向兩球都是從靜止自由落下，所以落地時間相同。' },
      { id: 'max-range', title: '射程最大的角度', prediction: { question: '從地面（h₀ = 0）用相同的速度拋出，哪個角度射程最遠？', options: ['30°', '45°', '60°'] },
        task: '按「準備」後，保持 v₀ = 20 m/s、h₀ = 0，至少試 4 個不同角度（含接近 45° 的），再讀取結果。',
        prepare(ctx) { apply({ pv: 20, angle: 20, h0: 0, g: 9.8, compare: false, ghost: false }); setTime(0); ctx.tried = {}; this.onChange(ctx); },
        onChange(ctx) { if (S.pv === 20 && S.h0 === 0 && S.g === 9.8) ctx.tried[S.angle] = pSummary().R; },
        check(ctx) { const keys = Object.keys(ctx.tried).map(Number); if (keys.length < 4) return { ok: false, message: `目前試了 ${keys.length} 個角度，請至少試 4 個（v₀ = 20、h₀ = 0、地球）。` }; const best = keys.reduce((a, b) => ctx.tried[b] > ctx.tried[a] ? b : a); if (best < 43 || best > 47) return { ok: false, message: '請也試試接近 45° 的角度，再比較射程。' }; return { ok: true, evidence: `試過 ${keys.sort((a, b) => a - b).map(k => k + '°').join('、')}；射程最大是 ${best}°（R = ${fmt(ctx.tried[best])} m）` }; },
        observation: opt('你試過的角度中，射程最大的是？', ['約 45°', '約 30°', '約 60°'], 0, '比較各角度的射程 R。'),
        reason: opt('為什麼 45° 最遠？', ['射程 R = v₀² sin 2θ ÷ g；2θ = 90° 時 sin 2θ 最大', '因為 45° 的飛行時間最長', '因為 45° 的水平速度最大'], 0, '角度太小飛不久，角度太大水平速度不夠，需要折衷。'),
        conclusion: '地面拋出時，R = v₀² sin 2θ ÷ g，θ = 45° 射程最大。高度 h₀ > 0 時，最遠角度會小於 45°。' },
      { id: 'complementary', title: '互補角的射程', prediction: { question: '從地面以相同速度拋出，30° 與 60°（加起來 90°）的射程如何？', options: ['一樣遠', '60° 較遠', '30° 較遠'] },
        task: '按「準備」後，依序把角度設為 30° 和 60°（v₀ = 20、h₀ = 0），再讀取結果。',
        prepare(ctx) { apply({ pv: 20, angle: 20, h0: 0, g: 9.8, compare: false, ghost: false }); setTime(0); ctx.r = {}; },
        onChange(ctx) { if (S.pv === 20 && S.h0 === 0 && S.g === 9.8 && (S.angle === 30 || S.angle === 60)) { const sm = pSummary(); ctx.r[S.angle] = { R: sm.R, T: sm.T }; } },
        check(ctx) { if (!ctx.r[30] || !ctx.r[60]) return { ok: false, message: '請把角度分別設為 30° 和 60°（v₀ = 20、h₀ = 0、地球）。' }; return { ok: true, evidence: `30°：R = ${fmt(ctx.r[30].R)} m、T = ${fmt(ctx.r[30].T)} s；60°：R = ${fmt(ctx.r[60].R)} m、T = ${fmt(ctx.r[60].T)} s` }; },
        observation: opt('兩個角度的比較結果是？', ['射程相同，60° 飛行時間較長', '射程相同，飛行時間也相同', '60° 射程較遠'], 0, '看 R 與 T 兩個數字。'),
        reason: opt('為什麼射程相同？', ['射程 = 水平速度 × 飛行時間；60° 水平速度較小但飛得久，乘積恰好相同（sin 2θ = sin(180° − 2θ)）', '兩個角度其實是同一個角度', '射程與角度完全無關'], 0, '互補角的 sin 2θ 相等。'),
        conclusion: '互補角（θ 與 90° − θ）在地面拋出時射程相同；角度較大者飛得較高、時間較長。' },
      { id: 'peak', title: '最高點的速度', prediction: { question: '斜拋物體到達最高點的瞬間，速度是多少？', options: ['0', '不為 0，只有水平方向', '等於初速'] },
        task: '按「準備」後，把時間 t 調到最高點（約 1.44 秒，±0.12 秒），讀取 vₓ、vᵧ 與速率。',
        prepare() { apply({ pv: 20, angle: 45, h0: 0, g: 9.8, compare: false, ghost: false }); setTime(0); },
        check() { if (!same({ pv: 20, angle: 45, h0: 0, g: 9.8 })) return { ok: false, message: '請先不要改 v₀、θ、h₀、重力；只調整時間。' }; const sm = pSummary(); if (!near(t, sm.tPeak, 0.12)) return { ok: false, message: `請把時間 t 調到最高點（約 ${fmt(sm.tPeak)} 秒）。` }; const q = M.projectile(pParams(), t); return { ok: true, evidence: `t = ${fmt(t)} s：vᵧ ≈ ${fmt(q.vy)} m/s，vₓ = ${fmt(q.vx)} m/s，速率 ≈ ${fmt(q.speed)} m/s` }; },
        observation: opt('最高點的速率是？', ['等於水平分速，不是 0', '0', '等於初速 20 m/s'], 0, '比較 vₓ 與 vᵧ。'),
        reason: opt('為什麼？', ['水平方向不受力、速度不變；只有鉛直分速在最高點變成 0', '最高點時物體停止了', '重力在最高點消失'], 0, '分開看水平與鉛直兩個方向。'),
        conclusion: '最高點只有鉛直分速為 0，水平分速不變，所以速率不為 0，加速度仍是向下的 g。' }
    ]
  };
  const quizFor = {
    linear: [
      { id: 'q1', question: '等加速度直線運動的 v–t 圖形狀是？', options: ['斜直線', '拋物線', '水平線'], answer: 0, hint: 'v = v₀ + at 對 t 是一次式。', explain: 'v = v₀ + at 是 t 的一次函數，圖形是斜直線，斜率為 a。' },
      { id: 'q2', question: 'x–t 圖是一條拋物線，頂點代表什麼？', options: ['速度為 0（折返）的瞬間', '加速度為 0', '位移為 0'], answer: 0, hint: '拋物線頂點的切線是水平的。', explain: '切線斜率為 0，表示速度為 0；此後運動方向改變。' },
      { id: 'q3', question: '物體 v > 0 而 a < 0，速率會怎樣？', options: ['變小', '變大', '不變'], answer: 0, hint: 'v 與 a 同號加速、異號減速。', explain: 'v 與 a 方向相反，速度的大小持續減小，直到折返。' }
    ],
    proj: [
      { id: 'q1', question: '忽略空氣阻力的斜拋運動，水平方向是什麼運動？', options: ['等速運動', '等加速度運動', '自由落體'], answer: 0, hint: '水平方向有沒有受力？', explain: '水平方向不受力，速度不變，是等速運動。' },
      { id: 'q2', question: '斜拋物體在最高點時，加速度是？', options: ['g，方向向下', '0', 'g，方向向上'], answer: 0, hint: '重力在最高點仍然存在。', explain: '只受重力，加速度始終是 g 向下；速度為 0 的是鉛直分量，不是加速度。' },
      { id: 'q3', question: '在月球（g 較小）以相同速度與角度拋出，射程會？', options: ['變大', '變小', '不變'], answer: 0, hint: 'R = v₀² sin 2θ ÷ g。', explain: 'g 變小，球在空中停留更久，射程變大。' }
    ]
  };
  const tasks = {
    linear: ['試著讓物體「先向右、再向左」。要調哪個數？', '怎樣的 v₀ 與 a，可以讓 t = 10 s 時回到起點？', '位移為 0 時，路程一定是 0 嗎？'],
    proj: ['要怎麼讓射程最遠？試試不同角度。', '起始高度增加，最遠的角度會變大還是變小？', '到了月球，哪些量會變、哪些量不會變？']
  };

  function startGuide() {
    guide?.destroy?.();
    guide = L.guidedStudy($('study-panel'), lessonsFor[topic], `jutor.motion.guide.${topic}.v1`, quizFor[topic], `jutor.motion.quiz.${topic}.v1`, () => modeName === 'study');
  }

  // ---------- 模式、主題、鍵盤 ----------
  function setMode(name) {
    if (name === 'study' && modeName !== 'study') { setPlaying(false); }
    modeName = name; document.body.dataset.study = String(name === 'study'); document.body.classList.toggle('projection', name === 'projection');
    $('study-panel').hidden = name !== 'study'; $('free-panel').hidden = name === 'study' || name === 'projection';
    $('proj-hint').hidden = name !== 'projection'; $('fullscreen').hidden = name !== 'projection';
    [['free-mode', 'free'], ['study-mode', 'study'], ['proj-mode', 'projection']].forEach(([id, n]) => $(id).setAttribute('aria-pressed', String(name === n)));
    if (name !== 'projection' && document.fullscreenElement) document.exitFullscreen?.();
    const url = new URL(location.href); url.searchParams.set('topic', topic); name === 'free' ? url.searchParams.delete('mode') : url.searchParams.set('mode', name);
    try { history.replaceState(null, '', url); } catch (_) { /* 靜態檢視時不更新網址 */ }
    draw();
  }
  function setTopic(name) {
    if (!controlDefs[name]) return; setPlaying(false); topic = name; t = 0;
    document.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.topic === name)));
    $('scene-title').textContent = name === 'linear' ? '直線運動：位置、速度、加速度的圖形' : '斜拋運動：水平與鉛直各自獨立';
    $('scene-caption').textContent = name === 'linear' ? '調整 x₀、v₀、a，拖動時間，觀察 x–t、v–t 圖與物體位置如何一起變化。' : '拖動時間看軌跡；箭頭分別是水平分速、鉛直分速與合速度。';
    $('tasks').innerHTML = tasks[name].map(s => `<p>• ${s}</p>`).join('');
    const defaults = name === 'linear' ? { x0: 0, v0: 4, a: 2 } : { pv: 20, angle: 45, h0: 0, g: 9.8, compare: false, ghost: false };
    Object.assign(S, defaults); buildControls(); startGuide(); changed(); setMode(modeName);
  }

  document.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => setTopic(b.dataset.topic)));
  $('free-mode').onclick = () => setMode('free'); $('study-mode').onclick = () => setMode('study'); $('proj-mode').onclick = () => setMode('projection');
  $('time').addEventListener('input', e => { setPlaying(false); setTime(+e.target.value); });
  $('play').onclick = () => setPlaying(!playing);
  $('step-back').onclick = () => { setPlaying(false); setTime(t - 0.1); }; $('step-fwd').onclick = () => { setPlaying(false); setTime(t + 0.1); };
  $('reset').onclick = () => { setPlaying(false); setTime(0); };
  $('speed').onchange = e => { speed = +e.target.value; };
  $('fullscreen').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
  document.addEventListener('keydown', e => {
    if (modeName !== 'projection' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName, typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if (e.key === 'Escape') { setMode('free'); return; }
    if (e.key === ' ' && tag !== 'BUTTON' && !typing) { e.preventDefault(); setPlaying(!playing); }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !typing) { e.preventDefault(); setPlaying(false); setTime(t + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 0.5 : 0.1)); }
    else if (e.key.toLowerCase() === 'r' && !typing) { setPlaying(false); setTime(0); }
    else if (e.key === '1' && !typing) setTopic('linear'); else if (e.key === '2' && !typing) setTopic('proj');
  });

  // 以 ?topic=proj&mode=projection 直接開啟（老師可存成書籤）
  const q = new URLSearchParams(location.search), startTopic = controlDefs[q.get('topic')] ? q.get('topic') : 'linear', startMode = ['study', 'projection'].includes(q.get('mode')) ? q.get('mode') : 'free';
  modeName = startMode; setTopic(startTopic);
})();
