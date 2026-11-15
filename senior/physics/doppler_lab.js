(() => {
  'use strict';
  const D = DopplerCore, L = ScienceLab, $ = id => document.getElementById(id);
  const canvas = $('doppler'), ctx = canvas.getContext('2d');
  const W = 720, H = 440, ROAD = 250, V = 110; // V：畫面上的波速（px/s）
  const C = { bg: '#102738', grid: '#1f3a50', road: '#3b5a72', text: '#cfe0ee', muted: '#9fb4c5', front: '108,180,255', src: '#ffb067', obs: '#5cdd9c', ref: '#c3ccd5', purple: '#c9a2ff', yellow: '#ffd866' };

  // ---------- 狀態 ----------
  const DEFAULTS = { vs: 0.5, vo: 0.5, toward: true, f: 1, lambda: true, arrows: false, ratio: false };
  const S = { ...DEFAULTS };
  let topic = 'source', modeName = 'free', playing = true, speed = 1, last = 0, guide = null;
  const sim = { t: 0, fronts: [], next: 0, loop0: 0, hold: 0, counts: { a: 0, b: 0 }, flash: { a: 0, b: 0 }, elapsed: 0 };

  const SRC_START = 150, SRC_END = 560, OBS_AHEAD = 680, OBS_BEHIND = 40; // 聲源移動
  const SRC_FIXED = 330, REF_X = 60, NEAR = 420, FAR = 700;               // 觀察者移動
  const vsPx = () => S.vs * V, voPx = () => S.vo * V;
  const sourceX = t => topic === 'source' ? SRC_START + vsPx() * t : SRC_FIXED;
  // 觀察者移動：每一趟從 loop0 開始；靠近時由遠處往聲源走，遠離時由聲源附近往外走
  const movingX = t => S.toward ? FAR - voPx() * (t - sim.loop0) : NEAR + voPx() * (t - sim.loop0);
  const obsA = t => topic === 'source' ? OBS_AHEAD : movingX(t); // a：前方／移動的觀察者
  const obsB = () => topic === 'source' ? OBS_BEHIND : REF_X;    // b：後方／靜止觀察者（對照）

  function restart() {
    Object.assign(sim, { t: 0, fronts: [], next: 0, loop0: 0, hold: 0, counts: { a: 0, b: 0 }, flash: { a: 0, b: 0 }, elapsed: 0 });
    draw();
  }
  function resetCounts() { sim.counts = { a: 0, b: 0 }; sim.elapsed = 0; }

  // ---------- 模擬 ----------
  function step(dt) {
    if (sim.hold > 0) { sim.hold -= dt; if (sim.hold <= 0) { const keep = sim.counts, el = sim.elapsed; restart(); sim.counts = keep; sim.elapsed = el; } return; }
    const t0 = sim.t, t1 = t0 + dt;
    while (sim.next <= t1) { sim.fronts.push({ te: sim.next, xe: sourceX(sim.next) }); sim.next += 1 / S.f; }
    const a = D.arrivals(sim.fronts, V, obsA, t0, t1), b = D.arrivals(sim.fronts, V, obsB, t0, t1);
    if (a) { sim.counts.a += a; sim.flash.a = 0.22; beep('a'); }
    if (b) { sim.counts.b += b; sim.flash.b = 0.22; beep('b'); }
    sim.flash.a = Math.max(0, sim.flash.a - dt); sim.flash.b = Math.max(0, sim.flash.b - dt);
    sim.t = t1; sim.elapsed += dt;
    sim.fronts = sim.fronts.filter(fr => V * (sim.t - fr.te) < 900);
    if (topic === 'source' && sourceX(sim.t) >= SRC_END) sim.hold = 1.2; // 開到終點：停一下讓學生看清楚，再重新開始
    if (topic === 'observer') {
      const x = movingX(sim.t);
      if ((S.toward && x <= NEAR) || (!S.toward && x >= FAR)) sim.loop0 = sim.t; // 觀察者回到起點，波前保留
    }
  }
  function tick(now) {
    if (!playing) { last = 0; return; }
    if (last) { const dt = Math.min((now - last) / 1000, 0.05) * speed; step(dt); draw(); }
    last = now; requestAnimationFrame(tick);
  }
  function setPlaying(v) { playing = v; $('play').textContent = playing ? '暫停' : '播放'; if (playing) { last = 0; requestAnimationFrame(tick); } }

  // ---------- 繪圖 ----------
  const font = size => `${size}px system-ui,'Microsoft JhengHei',sans-serif`;
  function label(s, x, y, color = C.text, size = 13, align = 'left') { ctx.fillStyle = color; ctx.font = font(size); ctx.textAlign = align; ctx.fillText(s, x, y); }
  function line(x1, y1, x2, y2, color, width = 1, dash = []) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); }
  function arrow(x1, y, x2, color, text, below = false) {
    if (Math.abs(x2 - x1) < 4) return; line(x1, y, x2, y, color, 3);
    const d = Math.sign(x2 - x1); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 10 * d, y - 6); ctx.lineTo(x2 - 10 * d, y + 6); ctx.closePath(); ctx.fill();
    if (text) label(text, (x1 + x2) / 2, below ? y + 18 : y - 8, color, 12, 'center');
  }
  function bracket(xa, xb, y, color, text) {
    if (!(Number.isFinite(xa) && Number.isFinite(xb)) || Math.abs(xb - xa) < 6) return;
    const l = Math.min(xa, xb), r = Math.max(xa, xb);
    if (l < 0 || r > W) return; // 有一端在畫面外就不畫，避免看到被截短的波長
    line(l, y, r, y, color, 2); line(l, y - 7, l, y + 7, color, 2); line(r, y - 7, r, y + 7, color, 2);
    label(text, (l + r) / 2, y + 22, color, 12, 'center');
  }
  function person(x, color, name, flash, moving, who) {
    if (sounding(who)) note(x);
    if (flash > 0) { ctx.strokeStyle = `rgba(255,216,102,${flash / 0.22})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, ROAD, 22 - flash * 30, 0, 7); ctx.stroke(); }
    ctx.fillStyle = flash > 0 ? C.yellow : color;
    ctx.beginPath(); ctx.arc(x, ROAD - 28, 7, 0, 7); ctx.fill();               // 頭
    ctx.fillRect(x - 5, ROAD - 20, 10, 18);                                       // 身體
    ctx.beginPath(); ctx.arc(x, ROAD, 4, 0, 7); ctx.fill();                       // 耳朵位置（接收點）
    label(name, x, ROAD + 44, color, 13, 'center');
    if (moving) label(moving, x, ROAD + 60, C.muted, 11, 'center');
  }
  function note(x) { ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, ROAD - 12, 34, 0, 7); ctx.stroke(); ctx.setLineDash([]); label('♪ 播放中', x, ROAD - 52, C.yellow, 13, 'center'); }
  function speaker(x) {
    if (sounding('src')) note(x);
    ctx.fillStyle = C.src; ctx.fillRect(x - 14, ROAD - 12, 16, 24);
    ctx.beginPath(); ctx.moveTo(x + 2, ROAD - 12); ctx.lineTo(x + 14, ROAD - 22); ctx.lineTo(x + 14, ROAD + 22); ctx.lineTo(x + 2, ROAD + 12); ctx.closePath(); ctx.fill();
  }
  const radius = fr => V * (sim.t - fr.te);
  const visible = () => sim.fronts.filter(fr => fr.te <= sim.t).sort((a, b) => b.te - a.te); // 新到舊

  function draw() {
    if (canvas.width !== W * 2) { canvas.width = W * 2; canvas.height = H * 2; }
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    line(0, ROAD, W, ROAD, C.road, 2, [8, 6]);
    const fronts = visible();
    fronts.forEach((fr, i) => {
      const r = radius(fr), alpha = Math.max(0.25, 1 - i * 0.07);
      ctx.strokeStyle = `rgba(${C.front},${alpha})`; ctx.lineWidth = i === 0 ? 2.6 : 2; ctx.beginPath(); ctx.arc(fr.xe, ROAD, r, 0, 7); ctx.stroke();
    });
    topic === 'source' ? drawSource(fronts) : drawObserver(fronts);
    const lam0 = V / S.f; // 靜止時的波長（灰色參考尺）
    line(20, 26, 20 + lam0, 26, C.ref, 3); line(20, 20, 20, 32, C.ref, 2); line(20 + lam0, 20, 20 + lam0, 32, C.ref, 2);
    label('靜止時的波長', 28 + lam0, 31, C.ref, 12);
    label('點聲源或觀察者，聽他聽到的聲音', W / 2, H - 12, C.muted, 12, 'center');
    if (sim.hold > 0) label('聲源到達終點，即將重新開始', W / 2, 60, C.yellow, 14, 'center');
    renderTable();
  }

  function drawSource(fronts) {
    const xs = sourceX(Math.min(sim.t, 1e9));
    const k = fronts.length && radius(fronts[0]) > 25 ? 0 : 1; // 用最新、完整的一對波前量波長
    if (S.lambda && fronts.length >= k + 2) {
      const r1 = radius(fronts[k]), r2 = radius(fronts[k + 1]);
      bracket(fronts[k].xe + r1, fronts[k + 1].xe + r2, ROAD + 92, C.obs, '前方波長');
      bracket(fronts[k].xe - r1, fronts[k + 1].xe - r2, ROAD + 92, C.obs, '後方波長');
    }
    if (S.arrows && fronts.length >= k + 1) {
      const f = fronts[k], r = radius(f), len = V * 0.5;
      if (f.xe + r + len < W) arrow(f.xe + r, ROAD - 70, f.xe + r + len, '#6cb4ff', '波速 v');
      if (f.xe - r - len > 0) arrow(f.xe - r, ROAD - 70, f.xe - r - len, '#6cb4ff', '波速 v');
      arrow(xs, ROAD - 64, xs + vsPx() * 0.5, C.src, S.vs > 0 ? '聲源速度' : '');
    }
    speaker(xs); label('聲源', xs, ROAD - 30, C.src, 13, 'center');
    person(OBS_AHEAD, C.obs, '前方觀察者', sim.flash.a, '', 'a'); person(OBS_BEHIND, C.obs, '後方觀察者', sim.flash.b, '', 'b');
    label(S.vs > 0 ? `聲源向右移動，速率 ${S.vs.toFixed(2)} v` : '聲源靜止（對照）', W - 14, 31, C.text, 13, 'right');
  }

  function drawObserver(fronts) {
    const xo = movingX(sim.t);
    if (S.lambda && fronts.length >= 2) {
      const edges = fronts.map(fr => fr.xe + radius(fr)).filter(e => e > SRC_FIXED + 2).sort((a, b) => a - b);
      let i = edges.findIndex(e => e > xo); if (i <= 0) i = edges.length - 1;
      if (i > 0) bracket(edges[i - 1], edges[i], ROAD + 92, C.obs, '觀察者遇到的波長');
    }
    if (S.arrows) {
      const d = S.toward ? -1 : 1, rel = (S.toward ? V + voPx() : V - voPx()) * 0.5;
      arrow(xo, ROAD - 60, xo + d * voPx() * 0.5, C.src, S.vo > 0 ? '觀察者速度' : '');
      arrow(xo - V * 0.5 - 14, ROAD - 84, xo - 14, '#6cb4ff', '波速 v（對地）');
      arrow(xo + 14, ROAD + 138, xo + 14 + rel, C.purple, '波相對觀察者', true);
    }
    speaker(SRC_FIXED); label('聲源（靜止）', SRC_FIXED, ROAD - 30, C.src, 13, 'center');
    person(xo, C.obs, '移動的觀察者', sim.flash.a, S.vo > 0 ? (S.toward ? '← 靠近聲源' : '遠離聲源 →') : '', 'a');
    person(REF_X, C.ref, '靜止觀察者', sim.flash.b, '（對照）', 'b');
    label(S.vo > 0 ? `觀察者${S.toward ? '靠近' : '遠離'}聲源，速率 ${S.vo.toFixed(2)} v` : '觀察者靜止（對照）', W - 14, 31, C.text, 13, 'right');
  }

  // ---------- 定性比較表 ----------
  const WORDS = { lambda: ['變長', '變短'], speed: ['變快', '變慢'], freq: ['變高', '變低'] };
  function cell(kind, value, ref) {
    const c = D.compare(value, ref), ratio = value / ref, word = c === 'same' ? '不變' : WORDS[kind][c === 'up' ? 0 : 1] + (c === 'up' ? ' ↑' : ' ↓');
    return `<td class="${c}">${word}${S.ratio ? `<small>× ${ratio.toFixed(2)}</small>` : ''}<div class="bar" aria-hidden="true"><i style="width:${Math.min(100, ratio * 50)}%"></i><b></b></div></td>`;
  }
  function renderTable() {
    let cols, a, b, ref;
    if (topic === 'source') { const r = D.sourceMoving({ f: S.f, v: V, vs: vsPx() }); cols = ['前方觀察者', '後方觀察者']; a = r.ahead; b = r.behind; ref = r.rest; }
    else { const r = D.observerMoving({ f: S.f, v: V, vo: voPx(), toward: S.toward }); cols = [`移動的觀察者（${S.toward ? '靠近' : '遠離'}）`, '靜止觀察者（對照）']; a = r.moving; b = r.rest; ref = r.rest; }
    const row = (name, kind) => `<tr><th scope="row">${name}</th>${cell(kind, a[kind], ref[kind])}${cell(kind, b[kind], ref[kind])}</tr>`;
    $('compare-table').innerHTML = `<table><caption class="muted" style="text-align:left">和「聲源、觀察者都靜止」相比（灰線＝靜止時）</caption><thead><tr><th></th><th scope="col">${cols[0]}</th><th scope="col">${cols[1]}</th></tr></thead><tbody>${row('視波長', 'lambda')}${row('視波速', 'speed')}${row('視頻率', 'freq')}</tbody></table>`;
  }

  // ---------- 聲音：點動畫裡的圖案播放；新的聲音覆蓋正在播的 ----------
  let audio = null, voices = [], playing_ = null, playTimer = 0;
  const ac = () => { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); return audio; };
  function tone(freq, start, dur, gain = 0.18, keep = true) {
    const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + start;
    o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.03); g.gain.setValueAtTime(gain, t + dur - 0.06); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    if (keep) { const v = { o, g }; voices.push(v); o.onended = () => { voices = voices.filter(x => x !== v); }; }
  }
  function stopSound() {
    if (audio) { const now = audio.currentTime; voices.forEach(({ o, g }) => { try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.03); o.stop(now + 0.04); } catch (_) { /* 已停止 */ } }); }
    voices = []; clearTimeout(playTimer); playing_ = null;
  }
  const sounding = who => playing_ !== null && playing_ === who;
  function setSounding(who, ms) { playing_ = who; clearTimeout(playTimer); playTimer = setTimeout(() => { playing_ = null; draw(); }, ms); draw(); }
  // 各圖案「聽到」的頻率倍率（相對發聲頻率）
  function ratioFor(who) {
    if (who === 'src') return 1;
    if (topic === 'source') { const r = D.sourceMoving({ f: S.f, v: V, vs: vsPx() }); return (who === 'a' ? r.ahead.freq : r.behind.freq) / S.f; }
    const r = D.observerMoving({ f: S.f, v: V, vo: voPx(), toward: S.toward }); return who === 'a' ? r.moving.freq / S.f : 1;
  }
  function listen(who) { seqTimers.forEach(clearTimeout); seqTimers = []; stopSound(); try { tone(440 * ratioFor(who), 0, 1.2); } catch (_) { return; } setSounding(who, 1200); }
  let seqTimers = [];
  function stopAll() { seqTimers.forEach(clearTimeout); seqTimers = []; stopSound(); draw(); }
  function playSequence() {
    stopAll(); const order = topic === 'source' ? ['src', 'a', 'b'] : ['b', 'a'];
    try { order.forEach((w, i) => tone(440 * ratioFor(w), i * 1.3, 1.2)); } catch (_) { return; }
    seqTimers = order.map((w, i) => setTimeout(() => setSounding(w, 1200), i * 1300));
  }
  function hitTest(e) {
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * H / b.height;
    const spots = [['src', sourceX(sim.t)], ['a', obsA(sim.t)], ['b', obsB()]];
    let best = null, dist = 46;
    for (const [who, sx] of spots) { const d = Math.hypot(x - sx, y - (ROAD - 12)); if (d < dist) { dist = d; best = who; } }
    return best;
  }
  canvas.addEventListener('click', e => { const who = hitTest(e); if (who) { seqTimers.forEach(clearTimeout); seqTimers = []; listen(who); } });
  canvas.addEventListener('pointermove', e => { canvas.style.cursor = hitTest(e) ? 'pointer' : ''; });
  function buildSound() {
    $('tone-buttons').innerHTML = '<button type="button" id="tone-all">▶ 依序比較</button><button type="button" id="tone-stop">■ 停止聲音</button>';
    $('tone-all').onclick = playSequence;
    $('tone-stop').onclick = stopAll;
    const opts = topic === 'source' ? [['off', '關閉'], ['a', '前方觀察者'], ['b', '後方觀察者']] : [['off', '關閉'], ['a', '移動的觀察者'], ['b', '靜止觀察者']];
    $('beep').innerHTML = opts.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  }
  function beep(who) { if ($('beep').value === who && playing) { try { tone(880, 0, 0.07, 0.15, false); } catch (_) { /* 瀏覽器不支援音訊 */ } } }

  // ---------- 控制項 ----------
  const defs = {
    source: [{ key: 'vs', label: '聲源速率', min: 0, max: 0.7, step: 0.05, show: x => `${x.toFixed(2)} v` }],
    observer: [{ key: 'vo', label: '觀察者速率', min: 0, max: 0.7, step: 0.05, show: x => `${x.toFixed(2)} v` }]
  };
  const freqDef = { key: 'f', label: '發聲頻率（示意）', min: 0.6, max: 1.6, step: 0.1, show: x => `${x.toFixed(1)} 次/秒` };
  const presets = {
    source: [['聲源靜止', { vs: 0 }], ['慢慢移動', { vs: 0.3 }], ['快速移動', { vs: 0.6 }]],
    observer: [['觀察者靜止', { vo: 0 }], ['靠近聲源', { vo: 0.5, toward: true }], ['遠離聲源', { vo: 0.5, toward: false }]]
  };
  function buildControls() {
    const list = [...defs[topic], freqDef];
    $('controls').innerHTML = list.map(d => `<div class="control"><label for="c-${d.key}">${d.label}</label><input id="c-${d.key}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${S[d.key]}"><output id="c-${d.key}-out" for="c-${d.key}">${d.show(S[d.key])}</output></div>`).join('')
      + (topic === 'observer' ? '<div class="actions" role="group" aria-label="觀察者方向"><button type="button" id="dir-near">靠近聲源</button><button type="button" id="dir-far">遠離聲源</button></div>' : '');
    list.forEach(d => $('c-' + d.key).addEventListener('input', e => { S[d.key] = +e.target.value; $('c-' + d.key + '-out').textContent = d.show(S[d.key]); changed(d.key); }));
    if (topic === 'observer') { $('dir-near').onclick = () => apply({ toward: true }); $('dir-far').onclick = () => apply({ toward: false }); }
    $('presets').innerHTML = presets[topic].map((p, i) => `<button type="button" data-preset="${i}">${p[0]}</button>`).join('');
    $('presets').querySelectorAll('[data-preset]').forEach(b => b.onclick = () => apply(presets[topic][+b.dataset.preset][1]));
    syncControls();
  }
  function syncControls() {
    [...defs[topic], freqDef].forEach(d => { const el = $('c-' + d.key); if (el) { el.value = S[d.key]; $('c-' + d.key + '-out').textContent = d.show(S[d.key]); } });
    if ($('dir-near')) { $('dir-near').setAttribute('aria-pressed', String(S.toward)); $('dir-far').setAttribute('aria-pressed', String(!S.toward)); }
    $('t-lambda').setAttribute('aria-pressed', String(S.lambda)); $('t-arrows').setAttribute('aria-pressed', String(S.arrows)); $('t-ratio').setAttribute('aria-pressed', String(S.ratio));
    buildSound.keep = $('beep').value; buildSound(); if ([...$('beep').options].some(o => o.value === buildSound.keep)) $('beep').value = buildSound.keep;
  }
  // 聲源速率或頻率改變：重新開始（避免舊波前混在一起）；觀察者的設定改變只重算計數
  function changed(key) {
    if (topic === 'source' || key === 'f') restart();
    else { if (key === 'toward') { sim.loop0 = sim.t; } resetCounts(); draw(); }
    syncControls();
  }
  function apply(values) { const keys = Object.keys(values); Object.assign(S, values); syncControls(); changed(keys.includes('f') ? 'f' : keys.includes('toward') ? 'toward' : keys[0]); }
  $('t-lambda').onclick = () => { S.lambda = !S.lambda; syncControls(); draw(); };
  $('t-arrows').onclick = () => { S.arrows = !S.arrows; syncControls(); draw(); };
  $('t-ratio').onclick = () => { S.ratio = !S.ratio; syncControls(); draw(); };

  // ---------- 自修任務（預測 → 操作驗證 → 記錄觀察 → 說明原因） ----------
  const opt = (question, options, answer, hint) => ({ question, options, answer, hint });
  const lessonsFor = {
    source: [
      { id: 'src-lambda', title: '聲源移動：視波長', prediction: { question: '聲源向右移動時，前方與後方的波前間距會怎樣？', options: ['前方較密、後方較疏', '前後一樣', '前方較疏、後方較密'] },
        task: '按「準備」後，把聲源速率調到 0.4 v 以上，看「前方波長」「後方波長」標記和左上的灰色參考尺，再讀取結果。',
        prepare() { apply({ vs: 0.1, f: 1 }); S.lambda = true; syncControls(); setPlaying(true); },
        check() { if (S.vs < 0.4) return { ok: false, message: '請把聲源速率調到 0.4 v 以上。' }; if (visible().length < 3) return { ok: false, message: '請讓動畫多播放一下，至少出現 3 個波前。' }; return { ok: true, evidence: `聲源速率 ${S.vs.toFixed(2)} v：前方的波前擠在一起，波長比灰色參考尺短；後方的波前被拉開，波長比參考尺長` }; },
        observation: opt('前方與後方的波長，和聲源靜止時相比？', ['前方變短、後方變長', '前後都變短', '前後都不變'], 0, '拿標記和左上的灰色參考尺比長短。'),
        reason: opt('為什麼會這樣？', ['聲源追著前一個波前跑，下一個波前從更前面發出，前方被擠短；後方則被拉開', '聲源把前方的空氣壓縮，聲音變慢', '波長由觀察者決定'], 0, '看每個圓的圓心（發出的位置）怎麼移動。'),
        conclusion: '聲源移動時，每個波前從不同位置發出：前方的波長變短，後方的波長變長。' },
      { id: 'src-speed', title: '聲源移動：視波速', prediction: { question: '聲源移動時，聲波在空氣中前進的速率會改變嗎？', options: ['不變', '前方變快', '後方變快'] },
        task: '按「準備」後，打開「速度箭頭」並讓動畫播放，比較前方與後方「波速 v」箭頭的長度。',
        prepare(ctx) { apply({ vs: 0.5, f: 1 }); S.arrows = false; syncControls(); setPlaying(true); ctx.t0 = sim.elapsed; },
        check(ctx) { if (!S.arrows) return { ok: false, message: '請打開「速度箭頭」。' }; if (S.vs < 0.3) return { ok: false, message: '請讓聲源速率保持在 0.3 v 以上。' }; if (sim.elapsed - (ctx.t0 || 0) < 1.5) return { ok: false, message: '請讓動畫再播放一下，觀察箭頭。' }; return { ok: true, evidence: `聲源速率 ${S.vs.toFixed(2)} v：前方和後方的波速箭頭一樣長；每個圓都以相同速率向外擴大` }; },
        observation: opt('前方與後方的波速，和聲源靜止時相比？', ['都一樣，等於原本的波速 v', '前方較快', '後方較快'], 0, '比較兩個藍色箭頭。'),
        reason: opt('為什麼波速不變？', ['波速由介質（空氣）決定；聲源只決定波前從哪裡發出', '聲源把聲波往前推，所以會變快', '後方的空氣比較稀薄'], 0, '聲波離開聲源之後，還跟聲源有關係嗎？'),
        conclusion: '聲源移動不會改變聲波在空氣中的速率；對靜止的觀察者來說，視波速仍是 v。' },
      { id: 'src-freq', title: '聲源移動：視頻率', prediction: { question: '前方與後方的觀察者，誰聽到的音比較高？', options: ['前方較高', '後方較高', '一樣高'] },
        task: '按「準備」後播放動畫，等前方與後方觀察者各收到至少 4 個波前（看人的閃光），再讀取結果。可以打開嗶聲，或按「依序比較」用耳朵聽。',
        prepare() { apply({ vs: 0.5, f: 1 }); setPlaying(true); },
        check() { if (S.vs < 0.3) return { ok: false, message: '請讓聲源速率保持在 0.3 v 以上。' }; if (sim.counts.a < 4 || sim.counts.b < 4) return { ok: false, message: `前方收到 ${sim.counts.a} 個、後方收到 ${sim.counts.b} 個波前，請各收到至少 4 個。` }; return { ok: true, evidence: '前方觀察者閃得比較快（每秒收到的波前較多），後方觀察者閃得比較慢；兩邊的波速相同' }; },
        observation: opt('比較兩位觀察者，結果是？', ['前方頻率較高、後方較低', '後方頻率較高', '兩邊一樣'], 0, '看誰閃得比較快。'),
        reason: opt('為什麼？', ['頻率＝視波速 ÷ 視波長；波速不變，前方波長變短，每秒遇到的波前就變多', '前方比較近，所以音比較高', '聲源發出的頻率改變了'], 0, '聲源本身的發聲頻率有改變嗎？'),
        conclusion: '聲源靠近你時聽到的音變高、遠離你時變低。原因是波長被擠短或拉長，波速並沒有改變。' }
    ],
    observer: [
      { id: 'obs-lambda', title: '觀察者移動：視波長', prediction: { question: '觀察者向聲源跑過去，他遇到的波前間距會變嗎？', options: ['不變', '變短', '變長'] },
        task: '按「準備」後，選「靠近聲源」，把觀察者速率調到 0.4 v 以上，看「觀察者遇到的波長」和灰色參考尺。',
        prepare() { apply({ vo: 0.1, toward: true, f: 1 }); S.lambda = true; syncControls(); setPlaying(true); },
        check() { if (!S.toward) return { ok: false, message: '請選「靠近聲源」。' }; if (S.vo < 0.4) return { ok: false, message: '請把觀察者速率調到 0.4 v 以上。' }; return { ok: true, evidence: `觀察者速率 ${S.vo.toFixed(2)} v：波前仍是以聲源為中心的同心圓，觀察者附近的間距和灰色參考尺一樣長` }; },
        observation: opt('觀察者遇到的波長，和靜止時相比？', ['不變', '變短', '變長'], 0, '和灰色參考尺比較。'),
        reason: opt('為什麼？', ['聲源沒有動，波前是同心圓，間距只由波速和發聲頻率決定', '觀察者跑步會把空氣壓縮', '波長會跟著觀察者改變'], 0, '這些波前是誰發出的？聲源有移動嗎？'),
        conclusion: '只有觀察者移動時，空氣中的波長不變。' },
      { id: 'obs-speed', title: '觀察者移動：視波速', prediction: { question: '對向聲源跑的觀察者來說，波前迎面而來的速度？', options: ['變快', '不變', '變慢'] },
        task: '按「準備」後，打開「速度箭頭」，比較藍色「波速 v（對地）」和紫色「波相對觀察者」兩個箭頭。',
        prepare() { apply({ vo: 0.5, toward: true, f: 1 }); S.arrows = false; syncControls(); setPlaying(true); },
        check() { if (!S.arrows) return { ok: false, message: '請打開「速度箭頭」。' }; if (!S.toward || S.vo < 0.3) return { ok: false, message: '請選「靠近聲源」，速率 0.3 v 以上。' }; return { ok: true, evidence: `觀察者以 ${S.vo.toFixed(2)} v 迎向聲波：紫色箭頭（波相對觀察者）比藍色箭頭（波速 v）長，長度約為 v + vo` }; },
        observation: opt('對觀察者來說，波前迎面而來的速度？', ['變快，等於 v + vo', '不變，仍是 v', '變慢，等於 v − vo'], 0, '比較紫色與藍色箭頭。'),
        reason: opt('為什麼？', ['他自己迎向波前，兩者相向而行，相對速度相加', '空氣跟著他一起跑', '聲波在空氣中的速率變快了'], 0, '想想兩台車相向而行時的相對速度。'),
        conclusion: '觀察者移動不改變聲波在空氣中的速率，但會改變「波相對觀察者」的速度：靠近時變快、遠離時變慢。' },
      { id: 'obs-freq', title: '觀察者移動：視頻率', prediction: { question: '觀察者遠離聲源時，聽到的音高？', options: ['變低', '變高', '不變'] },
        task: '按「準備」後，切換成「遠離聲源」並播放，等移動的觀察者和靜止觀察者各收到至少 4 個波前，再讀取結果。',
        prepare() { apply({ vo: 0.4, toward: true, f: 1 }); setPlaying(true); },
        check() { if (S.toward) return { ok: false, message: '請切換成「遠離聲源」。' }; if (S.vo < 0.3) return { ok: false, message: '請讓觀察者速率保持在 0.3 v 以上。' }; if (sim.counts.a < 4 || sim.counts.b < 4) return { ok: false, message: `移動的觀察者收到 ${sim.counts.a} 個、靜止觀察者收到 ${sim.counts.b} 個波前，請各收到至少 4 個。` }; return { ok: true, evidence: '遠離時，移動的觀察者閃得比靜止觀察者慢（每秒遇到的波前較少）；波長不變，波相對他的速度變小' }; },
        observation: opt('遠離聲源的觀察者，聽到的頻率？', ['變低', '變高', '不變'], 0, '看誰閃得比較慢。'),
        reason: opt('為什麼？', ['波長不變，但波相對他的速度變成 v − vo，每秒遇到的波前變少', '聲源發出的頻率變低了', '遠離會讓波長變長'], 0, '頻率＝視波速 ÷ 視波長，哪一個變了？'),
        conclusion: '觀察者靠近聲源，視波速變大、頻率變高；遠離時視波速變小、頻率變低。波長都不變。' }
    ]
  };
  const quizFor = {
    source: [
      { id: 'q1', question: '救護車鳴笛向你開來，你聽到的音比司機聽到的？', options: ['較高', '較低', '一樣'], answer: 0, hint: '你在聲源的前方。', explain: '前方的波長被擠短，波速不變，所以頻率較高、音較高。' },
      { id: 'q2', question: '聲源移動時，下列哪一個量「不」改變？', options: ['聲波在空氣中的速率', '前方的波長', '後方聽到的頻率'], answer: 0, hint: '波速由什麼決定？', explain: '波速由介質決定；聲源移動只改變波長，進而改變頻率。' }
    ],
    observer: [
      { id: 'q1', question: '你騎車遠離一個靜止的警報器，下列何者正確？', options: ['波長不變、視波速變小、頻率變低', '波長變長、波速不變、頻率變低', '三個量都不變'], answer: 0, hint: '聲源沒有動。', explain: '聲源靜止，空氣中的波長不變；你遠離它，波相對你的速度變小，每秒遇到的波前變少。' },
      { id: 'q2', question: '「聲源靠近你」和「你靠近聲源」，兩者有什麼不同？', options: ['前者改變波長，後者改變視波速', '兩者都改變波長', '兩者都改變波速'], answer: 0, hint: '分別看波長與視波速。', explain: '聲源移動：波長變、波速不變；觀察者移動：波長不變、視波速變。兩者都讓頻率改變。' }
    ]
  };
  const tasks = {
    source: ['聲源越快，前方的波長會越來越短嗎？試試看。', '把聲源速率調到 0，三個量會怎樣？', '按「依序比較」，耳朵聽到的高低和表格一致嗎？'],
    observer: ['觀察者跑得越快，他遇到的波長會變嗎？', '靠近與遠離時，紫色箭頭有什麼不同？', '和「聲源移動」相比，哪一個量的變化不一樣？']
  };
  function startGuide() {
    guide?.destroy?.();
    guide = L.guidedStudy($('study-panel'), lessonsFor[topic], `jutor.doppler.guide.${topic}.v1`, quizFor[topic], `jutor.doppler.quiz.${topic}.v1`, () => modeName === 'study');
  }

  // ---------- 模式、主題、鍵盤 ----------
  function setMode(name) {
    // 進入自修模式：動畫全部回到初始狀態並停止，等學生按「準備」
    if (name === 'study') { stopAll(); Object.assign(S, DEFAULTS); syncControls(); restart(); setPlaying(false); }
    modeName = name; document.body.dataset.study = String(name === 'study'); document.body.classList.toggle('projection', name === 'projection');
    $('study-panel').hidden = name !== 'study'; $('free-panel').hidden = name !== 'free';
    $('proj-hint').hidden = name !== 'projection'; $('fullscreen').hidden = name !== 'projection';
    [['free-mode', 'free'], ['study-mode', 'study'], ['proj-mode', 'projection']].forEach(([id, n]) => $(id).setAttribute('aria-pressed', String(name === n)));
    if (name !== 'projection' && document.fullscreenElement) document.exitFullscreen?.();
    const url = new URL(location.href); url.searchParams.set('topic', topic); name === 'free' ? url.searchParams.delete('mode') : url.searchParams.set('mode', name);
    try { history.replaceState(null, '', url); } catch (_) { /* 靜態檢視時不更新網址 */ }
    draw();
  }
  function setTopic(name) {
    if (!defs[name]) return; topic = name;
    document.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.topic === name)));
    $('scene-title').textContent = name === 'source' ? '聲源移動：波長被擠短或拉長' : '觀察者移動：波長不變，迎面的波變快或變慢';
    $('scene-caption').textContent = name === 'source' ? '每個圓是一個波前，圓心是它被發出時聲源的位置。觀察者收到波前時會閃一下：閃得越快，聽到的頻率越高。' : '聲源靜止，波前是同心圓。移動的觀察者收到波前時會閃一下，和左邊靜止的觀察者比一比誰閃得快。';
    $('tasks').innerHTML = tasks[name].map(s => `<p>• ${s}</p>`).join('');
    stopAll(); buildControls(); startGuide(); restart(); setMode(modeName);
  }
  document.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => setTopic(b.dataset.topic)));
  $('free-mode').onclick = () => setMode('free'); $('study-mode').onclick = () => setMode('study'); $('proj-mode').onclick = () => setMode('projection');
  $('play').onclick = () => setPlaying(!playing); $('restart').onclick = () => restart();
  $('speed').onchange = e => { speed = +e.target.value; };
  $('fullscreen').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
  document.addEventListener('keydown', e => {
    if (modeName !== 'projection' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName, typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if (e.key === 'Escape') { setMode('free'); return; }
    if (typing) return;
    if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key.toLowerCase() === 'r') restart();
    else if (e.key === '1') setTopic('source'); else if (e.key === '2') setTopic('observer');
  });
  document.addEventListener('pointerup', () => { if (modeName === 'projection' && document.activeElement?.matches?.('input[type=range]')) document.activeElement.blur(); });

  // 以 ?topic=observer&mode=projection 直接開啟（老師可存成書籤）
  const q = new URLSearchParams(location.search);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing = false;
  modeName = ['study', 'projection'].includes(q.get('mode')) ? q.get('mode') : 'free';
  setTopic(defs[q.get('topic')] ? q.get('topic') : 'source');
  setPlaying(playing);
})();
