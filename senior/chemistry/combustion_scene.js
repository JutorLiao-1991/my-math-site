/* 燃燒分析裝置的動畫層：2D（疊在 SVG 上）與 3D（Canvas，可旋轉縮放）共用同一套粒子模擬。
   粒子數與時間為示意；讀值仍由主程式依質量與計量關係計算。 */
(function (root) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const TUBE_X = [455, 610]; // 兩支 U 形吸收管左緣（SVG 座標）

  // ---------- 氣流路徑（SVG 座標）與弧長參數化 ----------
  function buildPath() {
    const arc = x => { const cx = x + 29, out = []; for (let i = 1; i <= 12; i++) { const t = Math.PI - Math.PI * i / 12; out.push([cx + 29 * Math.cos(t), 170 + 29 * Math.sin(t)]); } return out; };
    const pts = [[32, 150], [94, 150], [94, 115], [455, 115], [455, 170], ...arc(455), [513, 115], [610, 115], [610, 170], ...arc(610), [668, 115], [764, 115]];
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const at = (x, y) => cum[pts.findIndex(p => p[0] === x && p[1] === y)];
    return { pts, cum, total: cum[cum.length - 1], uSample: at(94, 115) + (157 - 94), tubes: [[at(455, 115), at(513, 115)], [at(610, 115), at(668, 115)]] };
  }
  const PATH = buildPath();
  function pointAt(u) {
    const { pts, cum } = PATH; u = clamp(u, 0, PATH.total);
    let i = 1; while (i < cum.length - 1 && cum[i] < u) i++;
    const f = (u - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  }

  // ---------- 分子外觀（CPK 配色：C 深灰、O 紅、H 白） ----------
  const ATOM = { C: ['#3a3f45', 3.6], O: ['#e0574c', 3.3], H: ['#f5f7f9', 2.3] };
  const SHAPE = {
    O2: [['O', -3, 0], ['O', 3, 0]],
    CO2: [['O', -6.5, 0], ['C', 0, 0], ['O', 6.5, 0]],
    H2O: [['O', 0, 0], ['H', -4.5, 3.2], ['H', 4.5, 3.2]]
  };

  function create({ svgHost, canvas, getState, onFrame }) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let parts = [], burn = 0, emitted = { H2O: 0, CO2: 0 }, total = { H2O: 0, CO2: 0 }, o2Timer = 0;
    let last = 0, running = false, countStart = null, countFrac = 0, seenPhase = 0, view3d = false;
    const view = { yaw: -24, tilt: 60, zoom: 1.12 };

    function plan() {
      const s = getState().sample, nW = s.water / 18, nC = s.co2 / 44, m = Math.max(nW, nC) || 1;
      total = { H2O: Math.max(1, Math.round(12 * nW / m)), CO2: Math.max(1, Math.round(12 * nC / m)) };
    }
    function reset() { parts = []; burn = 0; emitted = { H2O: 0, CO2: 0 }; o2Timer = 0; countStart = null; countFrac = 0; seenPhase = 0; running = false; plan(); render(); }

    function stick(p) {
      const [a, b] = PATH.tubes[p.kind === 'H2O' ? 0 : 1];
      p.target = a + (b - a) * (0.32 + Math.random() * 0.36); p.jx = (Math.random() - .5) * 7; p.jy = (Math.random() - .5) * 6; p.jz = (Math.random() - .5) * 10;
    }
    function spawn(kind, u) { const p = { kind, u, v: 95 + Math.random() * 30, stuck: false, jx: 0, jy: (Math.random() - .5) * 6, jz: (Math.random() - .5) * 10 }; if (kind !== 'O2') stick(p); parts.push(p); }
    function absorbAll() {
      for (const k of ['H2O', 'CO2']) while (emitted[k] < total[k]) { spawn(k, PATH.uSample); emitted[k]++; }
      parts = parts.filter(p => p.kind !== 'O2'); parts.forEach(p => { p.u = p.target; p.stuck = true; });
    }

    function step(dt) {
      const phase = getState().phase;
      if (phase >= 2 && phase <= 4) { o2Timer -= dt; if (o2Timer <= 0) { spawn('O2', 0); o2Timer = 0.22; } }
      if (phase === 3 || phase === 4) {
        burn = Math.min(1, burn + dt / (phase === 3 ? 3.2 : 1.2));
        for (const k of ['H2O', 'CO2']) while (emitted[k] < Math.floor(burn * total[k] + 1e-9)) { spawn(k, PATH.uSample + Math.random() * 120); emitted[k]++; }
      }
      for (const p of parts) if (!p.stuck) { p.u += p.v * dt; if (p.target !== undefined && p.u >= p.target) { p.u = p.target; p.stuck = true; } }
      parts = parts.filter(p => p.stuck || p.u < PATH.total);
    }
    function moving() { const ph = getState().phase; return (ph >= 2 && ph <= 4) || parts.some(p => !p.stuck) || (countStart !== null && countFrac < 1); }

    function frame(now) {
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      step(dt);
      if (countStart !== null) countFrac = clamp((now - countStart) / 1200, 0, 1);
      render(); onFrame?.(countFrac);
      if (moving()) requestAnimationFrame(frame); else { running = false; last = 0; }
    }
    function start() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }

    // 主程式每次換步驟後呼叫
    function sync() {
      const phase = getState().phase;
      if (phase === 0) { reset(); return; }
      if (phase === 5 && seenPhase < 5) { burn = 1; absorbAll(); countStart = reduce ? -1e9 : performance.now(); countFrac = reduce ? 1 : 0; }
      if (reduce && phase >= 3 && phase < 5) { burn = 1; absorbAll(); }
      seenPhase = phase;
      render(); onFrame?.(countFrac);
      if (!reduce && moving()) start();
    }

    // ---------- 2D：畫進 SVG 裡的 #fx 群組 ----------
    function glyph(kind, x, y) {
      return SHAPE[kind].map(([el, dx, dy]) => `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${ATOM[el][1]}" fill="${ATOM[el][0]}" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>`).join('');
    }
    function absorbedFrac(kind) { return total[kind] ? parts.filter(p => p.kind === kind && p.stuck).length / total[kind] : 0; }
    function render2d() {
      const fx = svgHost()?.querySelector('#fx'); if (!fx) return;
      const phase = getState().phase, flick = 0.25 + 0.15 * Math.sin(performance.now() / 90);
      let out = '';
      if (phase === 3 && burn < 1) out += `<ellipse cx="157" cy="114" rx="26" ry="14" fill="rgba(255,140,40,${flick.toFixed(2)})"/>`;
      const k = 1 - 0.85 * burn; // 試樣燒掉而變小
      out += `<g transform="translate(157 118) scale(${k.toFixed(3)})"><path d="M-15 0 Q0 -20 16 0Z" fill="#6c8294"/></g>`;
      TUBE_X.forEach((x, i) => { const f = absorbedFrac(i ? 'CO2' : 'H2O'); if (f > 0) out += `<path transform="translate(${x} 0)" d="M0 145 V170 A29 29 0 0 0 58 170 V145" fill="none" stroke="${i ? '#3d4d52' : '#2f78b8'}" stroke-opacity="${(0.8 * f).toFixed(2)}" stroke-width="9"/>`; });
      for (const p of parts) { const [x, y] = pointAt(p.u); out += glyph(p.kind, x + (p.stuck ? p.jx : 0), y + p.jy * (p.stuck ? .8 : .4)); }
      out += `<g font-size="13" fill="#25374b">${glyph('O2', 34, 268)}<text x="44" y="272">O₂</text>${glyph('CO2', 90, 268)}<text x="102" y="272">CO₂</text>${glyph('H2O', 154, 268)}<text x="166" y="272">H₂O</text></g>`;
      fx.innerHTML = out;
    }

    // ---------- 3D ----------
    const ctx = canvas.getContext('2d'), CW = 800, CH = 420;
    function cam() {
      const yaw = view.yaw * Math.PI / 180, phi = view.tilt * Math.PI / 180, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(phi), sp = Math.sin(phi), D = 1500, F = D * view.zoom * 0.95;
      return (x, y, z) => { const x1 = x * cy - y * sy, y1 = x * sy + y * cy, up = y1 * cp + z * sp, depth = y1 * sp - z * cp, s = F / (D + depth); return { x: CW / 2 + x1 * s, y: CH / 2 + 10 - up * s, depth, s }; };
    }
    const to3 = ([x, y], dy = 0, dz = 0) => [x - 400, dy, 150 - y + dz];
    function tubeStroke(P, pts3, r, color, highlight) {
      const q = pts3.map(p => P(...p));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < q.length; i++) { ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, r * (q[i].s + q[i - 1].s)); ctx.beginPath(); ctx.moveTo(q[i - 1].x, q[i - 1].y); ctx.lineTo(q[i].x, q[i].y); ctx.stroke(); }
      if (highlight) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, r * 0.35 * (q[0].s + q[q.length - 1].s) / 2); ctx.beginPath(); q.forEach((p, i) => { const yy = p.y - r * 0.45 * p.s; i ? ctx.lineTo(p.x, yy) : ctx.moveTo(p.x, yy); }); ctx.stroke(); }
    }
    function box(P, [x0, x1, y0, y1, z0, z1], rgb, alpha) {
      const v = []; for (const z of [z0, z1]) for (const y of [y0, y1]) for (const x of [x0, x1]) v.push(P(x, y, z));
      const faces = [[0, 1, 3, 2, .7], [4, 5, 7, 6, 1], [0, 1, 5, 4, .8], [2, 3, 7, 6, .9], [0, 2, 6, 4, .75], [1, 3, 7, 5, .85]];
      faces.map(f => ({ f, d: f.slice(0, 4).reduce((s, i) => s + v[i].depth, 0) / 4 })).sort((a, b) => b.d - a.d).forEach(({ f }) => {
        ctx.fillStyle = `rgba(${rgb.map(c => Math.round(c * f[4])).join(',')},${alpha})`; ctx.strokeStyle = `rgba(0,0,0,${alpha * .35})`; ctx.lineWidth = 1;
        ctx.beginPath(); f.slice(0, 4).forEach((i, n) => n ? ctx.lineTo(v[i].x, v[i].y) : ctx.moveTo(v[i].x, v[i].y)); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
    }
    function ball(p, el) {
      const [color, r0] = ATOM[el], r = r0 * 1.7 * p.s, g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .35, r * .15, p.x, p.y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.35, color); g.addColorStop(1, 'rgba(0,0,0,.65)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r), 0, 7); ctx.fill();
    }
    function text(P, s, xyz, color = '#d7e6f2', size = 14) { const p = P(...xyz); ctx.fillStyle = color; ctx.font = `${Math.round(size * clamp(p.s, .7, 1.4))}px system-ui,'Microsoft JhengHei',sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, p.x, p.y); }
    function render3d() {
      if (canvas.width !== CW * 2) { canvas.width = CW * 2; canvas.height = CH * 2; }
      ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.fillStyle = '#0f2333'; ctx.fillRect(0, 0, CW, CH);
      const P = cam(), st = getState(), heat = st.phase >= 3, rev = st.reversed, TABLE = -90;
      // 桌面
      ctx.strokeStyle = 'rgba(140,170,195,.25)'; ctx.lineWidth = 1;
      for (let x = -420; x <= 420; x += 60) { const a = P(x, -120, TABLE), b = P(x, 120, TABLE); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      for (let y = -120; y <= 120; y += 60) { const a = P(-420, y, TABLE), b = P(420, y, TABLE); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      // 支架
      for (const [x, y] of [[140, 115], [400, 115], [484, 199], [639, 199]]) tubeStroke(P, [to3([x, y]), [x - 400, 0, TABLE]], 1.6, '#5d6b77');
      // 導管
      const seg = (a, b) => PATH.pts.slice(a, b + 1).map(p => to3(p));
      tubeStroke(P, [to3([32, 150]), to3([94, 150]), to3([94, 115]), to3([115, 115])], 3.5, '#8ca2b5');
      tubeStroke(P, [to3([409, 115]), to3([455, 115])], 3.5, '#8ca2b5');
      tubeStroke(P, [to3([513, 115]), to3([610, 115])], 3.5, '#8ca2b5');
      tubeStroke(P, [to3([668, 115]), to3([764, 115])], 3.5, '#8ca2b5');
      // 兩支 U 形吸收管：玻璃＋下半段藥品；藥品顏色隨吸收量加深
      [0, 1].forEach(i => {
        const x = TUBE_X[i], ia = PATH.pts.findIndex(p => p[0] === x && p[1] === 115), ib = PATH.pts.findIndex(p => p[0] === x + 58 && p[1] === 115);
        const pts = seg(ia, ib), lower = pts.filter(p => p[2] <= 150 - 145);
        const water = rev ? i === 1 : i === 0, f = absorbedFrac(water ? 'H2O' : 'CO2');
        tubeStroke(P, pts, 8, 'rgba(190,215,232,.45)', true);
        const base = water ? [87, 155, 193] : [119, 138, 145], dark = water ? [47, 120, 184] : [61, 77, 82], mix = base.map((c, k) => Math.round(c + (dark[k] - c) * f));
        tubeStroke(P, lower, 5, `rgb(${mix.join(',')})`);
        text(P, water ? 'Mg(ClO₄)₂' : 'NaOH', [x + 29 - 400, 0, TABLE - 22], '#d7e6f2', 14);
        text(P, water ? '吸收 H₂O' : '吸收 CO₂', [x + 29 - 400, 0, TABLE - 42], '#9fb7cc', 12);
      });
      // 燃燒管與試樣舟
      tubeStroke(P, [to3([115, 115]), to3([409, 115])], 15, 'rgba(200,225,240,.42)', true);
      const k = 1 - 0.85 * burn; box(P, [-258, -227, -8, 8, 22, 22 + 9 * k + 1], [108, 130, 148], 1);
      box(P, [-140, -55, -10, 10, 24, 32], [60, 70, 81], 1); // CuO
      // 粒子（依深度由遠到近）
      const balls = [];
      for (const p of parts) {
        const [x, y] = pointAt(p.u), base = to3([x + (p.stuck ? p.jx : 0), y], p.jz * (p.stuck ? .6 : .3), -p.jy * .4);
        for (const [el, dx, dy] of SHAPE[p.kind]) { const pt = P(base[0] + dx, base[1], base[2] - dy); balls.push([pt, el]); }
      }
      balls.sort((a, b) => b[0].depth - a[0].depth).forEach(([pt, el]) => ball(pt, el));
      // 高溫爐（半透明，蓋在燃燒管外）
      box(P, [-160, -30, -42, 42, -12, 82], heat ? [244, 190, 120] : [214, 216, 200], heat ? .5 : .38);
      if (heat && burn < 1) { const g = P(-243, 0, 36); ctx.fillStyle = `rgba(255,140,40,${(.25 + .15 * Math.sin(performance.now() / 90)).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(g.x, g.y, 26 * g.s, 14 * g.s, 0, 0, 7); ctx.fill(); }
      text(P, '試樣', [-243, 0, 75]); text(P, heat ? '高溫 CuO 爐' : 'CuO 爐（待加熱）', [-95, 0, 102]); text(P, 'O₂ 入口', [-368, 0, 22], '#8cc4ec');
      text(P, '剩餘 O₂', [345, 0, 55], '#8cc4ec');
      ctx.fillStyle = '#9fb7cc'; ctx.font = "12px system-ui,'Microsoft JhengHei',sans-serif"; ctx.textAlign = 'left';
      ctx.fillText('拖曳旋轉・滾輪／雙指縮放；粒子數與時間為示意', 12, 20);
    }
    function render() { if (view3d) render3d(); else render2d(); }

    // 3D 拖曳、縮放
    const pointers = new Map(); let pinch = 0; const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) pinch = spread(); });
    canvas.addEventListener('pointermove', e => {
      const prev = pointers.get(e.pointerId); if (!prev) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) { view.yaw = (view.yaw + (e.clientX - prev.x) * .4 + 540) % 360 - 180; view.tilt = clamp(view.tilt - (e.clientY - prev.y) * .3, 5, 88); }
      else if (pointers.size === 2) { const d = spread(); if (pinch) view.zoom = clamp(view.zoom * d / pinch, .6, 2.5); pinch = d; }
      render();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => canvas.addEventListener(n, e => { pointers.delete(e.pointerId); pinch = 0; }));
    canvas.addEventListener('wheel', e => { e.preventDefault(); view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * .001), .6, 2.5); render(); }, { passive: false });

    function setView(on) { view3d = !!on; render(); }
    function preset(name) { Object.assign(view, name === 'front' ? { yaw: 0, tilt: 88 } : name === 'top' ? { yaw: 0, tilt: 8 } : { yaw: -24, tilt: 60, zoom: 1.12 }); render(); }
    plan();
    return { sync, reset, render, setView, preset, get countFrac() { return countFrac; }, get view3d() { return view3d; } };
  }

  root.CombustionScene = { create, buildPath, pointAt, PATH };
})(window);
