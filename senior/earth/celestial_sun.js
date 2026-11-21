(() => {
  'use strict';
  const K = StarCore, Su = SunCore, L = ScienceLab, $ = id => document.getElementById(id);
  const canvas = $('sky'), ctx = canvas.getContext('2d'), W = 800, H = 500, RAD = Math.PI / 180;
  const C = { sun: '#ffc93c', path: '#ffb020', ecl: '#ff5fa2', eq: '#5ad1e6', summer: '#ff8a3d', winter: '#8fb0ff', equi: '#c9d4de', horizon: '#8fd18f', twin: '#ffe7a3', trail: '#ffd24d' };
  const BG = K.backgroundStars(260, 11);
  const DEFAULTS = { lat: 25, day: Su.dayOf(6, 21), view: 'sphere', ecl: true, eq: true, cmp: false, bg: false, air: true, inset: true, frame: 'ground', year: 12 };
  const S = { ...DEFAULTS };

  // ---------- 狀態 ----------
  let clock = 9;                                             // 真太陽時（不歸零的小時數）
  let latShown = S.lat, latFrom = S.lat, latT = 1;
  let s = 0, sFrom = 0, sTo = 0, sT = 1, orbitFrom = null;  // 0＝天球，1＝局部地平線
  let kF = 0, kFrom = 0, kTo = 0, kT = 1, thetaRef = 0;     // 0＝站在地面看，1＝貼著星空看
  let spinning = false, orbiting = false, speed = 2, last = 0, running = false;
  let orbit = { az: 0, el: 0, zoom: 1 };
  let look = { az: 180, alt: 45, fov: 150 };
  const sp = { started: false, day0: 0, T0: 0, e: 0, playing: false, speed: 1, done: false };
  let reveal = [], modeName = 'free', guide = null, lastSlot = '';
  const AZ0 = -55;                                           // 進入地平線後轉到東南方看，日行軌跡才不會側成一條線
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hourNow = () => ((clock % 24) + 24) % 24;
  const dayInt = () => ((Math.round(S.day) - 1) % 365 + 365) % 365 + 1;

  // ---------- 時間、太陽、恆星時角 ----------
  function sunNow() { const lam = Su.lambdaOfDay(S.day), q = Su.eclToEq(lam); return { lam, ra: q.ra, dec: q.dec, H: 15 * (hourNow() - 12) }; }
  const thetaNow = () => sunNow().ra + 15 * (clock - 12);
  // ③ 足跡：經過 e 天（每天自轉一圈；一年長度由 S.year 決定）
  function spAt(e) {
    const cal = e * 365 / S.year, day = sp.day0 + cal, lam = Su.lambdaOfDay(day), q = Su.eclToEq(lam);
    const fromEq = ((sp.day0 - Su.dayOf(3, 21)) % 365 + 365) % 365, wraps = Math.floor((fromEq + cal) / 365) - Math.floor(fromEq / 365);
    const Hh = 15 * (sp.T0 - 12) + 360 * e;
    return { day, lam, ra: q.ra, dec: q.dec, H: Hh, theta: q.ra + 360 * wraps + Hh };
  }
  const theta = () => S.view === 'spiral' ? spAt(sp.e).theta : thetaNow();
  const frameK = () => (S.view === 'sphere' || S.view === 'spiral') ? kF : 0;
  // 依恆星時角 θ 與觀察者旋轉 ψ 決定的當地座標軸
  function axesAt(lat, psi) { return { U: K.starVec(lat, psi), N: K.starVec(90 - lat, 180 + psi), E: K.starVec(0, psi - 90) }; }

  // ---------- 外部視角（①②③）的 3D 投影（與星軌頁相同） ----------
  function place(v, lat) {
    const th = s * (90 - lat) * RAD, a = Math.atan2(v[0], v[2]) - th, r = Math.hypot(v[0], v[2]);
    return [r * Math.sin(a), v[1], r * Math.cos(a)];
  }
  function camera() {
    const az = (90 + AZ0 * s + orbit.az) * RAD, el = (lerp(30, 24, s) + orbit.el) * RAD, dist = lerp(4.3, 3.4, s) / orbit.zoom;
    const pos = [dist * Math.cos(el) * Math.cos(az), dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el)];
    const f = pos.map(x => -x / dist), rr = [f[1], -f[0], 0], rl = Math.hypot(rr[0], rr[1]) || 1, r = rr.map(x => x / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], F = lerp(640, 680, s), cy = H / 2 + 8 + lerp(0, 66, s);
    const P = p => { const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]], z = K.dot(d, f); return { x: W / 2 + F * K.dot(d, r) / z, y: cy - F * K.dot(d, u) / z, depth: z }; };
    P.radius = F / Math.sqrt(dist * dist - 1); P.center = P([0, 0, 0]); return P;
  }

  // ---------- 繪圖小工具 ----------
  const font = (size, w = '') => `${w} ${size}px system-ui,'Microsoft JhengHei',sans-serif`;
  function text(str, x, y, color = '#d6e4f0', size = 13, align = 'center', weight = '', halo = false) {
    ctx.font = font(size, weight); ctx.textAlign = align;
    if (halo) { ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(5,14,26,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function poly(pts, color, width = 2, dash = [], alpha = 1) { if (pts.length < 2) return; ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  function arrowHead(x, y, ang, color, size = 9) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + size * Math.cos(ang), y + size * Math.sin(ang)); ctx.lineTo(x + size * Math.cos(ang + 2.5), y + size * Math.sin(ang + 2.5)); ctx.lineTo(x + size * Math.cos(ang - 2.5), y + size * Math.sin(ang - 2.5)); ctx.closePath(); ctx.fill(); }
  function dot(x, y, r, color, stroke = null) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } }
  function ring(x, y, r, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); }
  function sunDisk(x, y, r, dim = false) {
    const g = ctx.createRadialGradient(x, y, r * .3, x, y, r * 2.6); g.addColorStop(0, dim ? 'rgba(255,201,60,.35)' : 'rgba(255,214,90,.75)'); g.addColorStop(1, 'rgba(255,201,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 7); ctx.fill(); dot(x, y, r, dim ? '#a8915a' : C.sun, dim ? '#6b5a2b' : '#b77b00');
  }
  function mix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`; }
  const signed = Su.signed;

  // 沿一串 3D 點畫線：地平面上實線、下方虛線；天球背面變淡
  function curve(vs, proj, altOf, center, color, width, opts = {}) {
    let seg = [], up = null, bk = null;
    const flush = () => { if (seg.length > 1) poly(seg, color, up ? width : Math.max(1, width * .6), up ? [] : [5, 5], (up ? (opts.alpha ?? 1) : (opts.downAlpha ?? .5)) * (bk ? (opts.backAlpha ?? .5) : 1)); };
    for (const v of vs) {
      const q = proj(v), u = opts.noHorizon ? true : altOf(v) >= -1e-6, b = q.depth > center.depth;
      if (up !== null && (u !== up || b !== bk)) { seg.push(q); flush(); seg = [seg[seg.length - 2] || q]; }
      seg.push(q); up = u; bk = b;
    }
    flush();
  }
  const decCircle = (dec, step = 3) => { const out = []; for (let h = 0; h <= 360; h += step) out.push(K.starVec(dec, h)); return out; };
  const eclPoints = (thEff, step = 2) => { const out = []; for (let l = 0; l <= 360; l += step) { const q = Su.eclToEq(l); out.push(K.starVec(q.dec, thEff - q.ra)); } return out; };
  const eclAt = (lam, thEff) => { const q = Su.eclToEq(lam); return K.starVec(q.dec, thEff - q.ra); };

  // ---------- 預備知識：公轉 → 太陽在星空背景中移動 ----------
  function drawPrep() {
    const cx = 268, cy = 252, Ro = 98, Rr = 178, lam = Su.lambdaOfDay(S.day);
    const at = (ang, r) => ({ x: cx + r * Math.cos(ang * RAD), y: cy - r * Math.sin(ang * RAD) });
    ctx.fillStyle = '#0b1d30'; ctx.fillRect(0, 0, W, H);
    // 黃道星座環
    const cur = Su.constellationOf(lam), opp = Su.constellationOf(lam + 180);
    Su.ZODIAC.forEach((z, i) => {
      const a0 = z.start, a1 = z.start + Su.norm(z.end - z.start);
      ctx.fillStyle = z.name === cur ? 'rgba(255,201,60,.28)' : i % 2 ? 'rgba(120,150,190,.13)' : 'rgba(120,150,190,.22)';
      ctx.beginPath(); ctx.arc(cx, cy, Rr + 46, -a0 * RAD, -a1 * RAD, true); ctx.arc(cx, cy, Rr + 4, -a1 * RAD, -a0 * RAD, false); ctx.closePath(); ctx.fill();
      const p = at(z.mid, Rr + 26); text(z.name.replace('座', ''), p.x, p.y + 4, z.name === cur ? '#ffe08a' : z.name === opp ? '#9fc3ff' : '#c4d3e2', z.name === cur ? 13 : 11.5, 'center', z.name === cur ? '700' : '');
    });
    // 黃道（星座環內緣）
    ring(cx, cy, Rr, C.ecl, 2.4);
    const past = []; for (let k = 0; k <= 30; k++) past.push(at(lam - k, Rr)); poly(past, C.sun, 5, [], .8);
    text('黃道：太陽在星空中一年走的路', cx, cy - Rr - 56, C.ecl, 14, 'center', '700');
    // 公轉軌道與二分二至的地球
    ctx.setLineDash([4, 5]); ring(cx, cy, Ro, 'rgba(160,200,240,.55)', 1.4); ctx.setLineDash([]);
    for (const [d, , n] of Su.CARDINAL) { const p = at(Su.lambdaOfDay(d) + 180, Ro), { m, d: dd } = Su.dateOf(d); dot(p.x, p.y, 4, 'rgba(90,170,240,.45)'); const lp = at(Su.lambdaOfDay(d) + 180, Ro - 26); text(`${n} ${m}/${dd}`, lp.x, lp.y + 4, '#8fb4d6', 11); }
    const ar = at(lam + 180 + 22, Ro), ar2 = at(lam + 180 + 27, Ro); arrowHead(ar2.x, ar2.y, Math.atan2(ar2.y - ar.y, ar2.x - ar.x), '#9fd0f5', 8);
    // 太陽
    sunDisk(cx, cy, 15); text('太陽', cx, cy + 34, '#ffe08a', 12);
    // 地球與視線
    const E = at(lam + 180, Ro), far = at(lam, Rr), back = at(lam + 180, Rr);
    poly([E, far], C.sun, 1.6, [6, 4]); poly([E, back], '#9fc3ff', 1.2, [3, 5], .7);
    dot(far.x, far.y, 7, C.sun, '#b77b00');
    dot(E.x, E.y, 9, '#3d9be0', '#cfe8ff'); text(`地球（${Su.dateName(S.day)}）`, E.x, E.y + (E.y > cy ? 24 : -14), '#9fd0f5', 12, 'center', '600', true);
    // 右側說明
    const x0 = 500; let y = 46;
    const line = (str, color = '#d6e4f0', size = 14, w = '') => { text(str, x0, y, color, size, 'left', w); y += size + 9; };
    line(`太陽在「${cur}」前面`, '#ffe08a', 17, '700');
    line(`黃經 ${K.fmt(lam)}°${Su.pointName(lam) ? `（${Su.pointName(lam)}）` : ''}`, '#ffe08a', 14);
    y += 6;
    line('地球每天公轉約 1°', '#d6e4f0', 14);
    line('→ 從地球看，太陽在星空背景中', '#d6e4f0', 14);
    line('　 每天向東移約 1°（逆時針）', '#d6e4f0', 14);
    line('→ 一年繞一圈，這條路就是黃道', C.ecl, 14, '700');
    line(`半夜看到的是對面的「${opp}」`, '#9fc3ff', 13);
    // 側視圖：黃道面與天球赤道面夾 23.44°
    const bx = 640, by = 392, rE = 30, tilt = 23.44 * RAD;
    text('側面看：為什麼黃道是斜的？', bx, by - 74, '#d6e4f0', 13, 'center', '700');
    poly([{ x: bx - 140, y: by }, { x: bx + 140, y: by }], C.ecl, 2.2); text('黃道面（公轉軌道面）', bx + 140, by - 8, C.ecl, 12, 'right');
    const ex = Math.cos(tilt), ey = Math.sin(tilt);
    poly([{ x: bx - 130 * ex, y: by + 130 * ey }, { x: bx + 130 * ex, y: by - 130 * ey }], C.eq, 2.2); text('天球赤道面', bx - 132 * ex, by + 132 * ey + 16, C.eq, 12, 'left');
    const g = ctx.createRadialGradient(bx - 8, by - 8, 4, bx, by, rE); g.addColorStop(0, '#3d86c6'); g.addColorStop(1, '#1d4f7d'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rE, 0, 7); ctx.fill();
    poly([{ x: bx + 52 * ey, y: by + 52 * ex }, { x: bx - 52 * ey, y: by - 52 * ex }], '#cfe0ee', 1.6, [5, 4]); text('地軸', bx - 56 * ey - 4, by - 56 * ex - 4, '#cfe0ee', 12);
    ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 74, 0, -tilt, true); ctx.stroke(); text('23.44°', bx + 82, by - 12, '#ffe08a', 13, 'left', '700');
    text('「上帝視角」示意，大小與距離未依比例', 14, H - 14, '#7f93a8', 11, 'left');
  }

  // ---------- ① 天球與黃道／② 局部地平線／③ 一年的足跡 ----------
  function drawOrbit() {
    const lat = latShown, P = camera(), c = P.center, view = S.view;
    const th = theta(), k = frameK(), ref = view === 'spiral' ? spAt(0).theta : thetaRef, thEff = th - k * (th - ref), psi = th - thEff;
    const ax = axesAt(lat, psi), proj = v => P(place(v, lat)), altOf = v => K.dot(v, ax.U);
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 520); g.addColorStop(0, '#12304b'); g.addColorStop(1, '#071321'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(207,224,238,.75)'; ctx.beginPath(); ctx.arc(c.x, c.y, P.radius, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.strokeStyle = `rgba(207,224,238,${lerp(.75, .18, s)})`; ctx.beginPath(); ctx.arc(c.x, c.y, P.radius, 0, Math.PI); ctx.stroke();
    if (S.bg) { for (const b of BG) { const v = K.starVec(b.dec, thEff - b.H0), q = proj(v); if (Math.hypot(q.x - c.x, q.y - c.y) > P.radius + 2) continue; ctx.globalAlpha = (altOf(v) >= 0 ? .8 : .25) * (q.depth > c.depth ? .5 : 1); dot(q.x, q.y, .7 + b.mag * 1.1, '#fff'); } ctx.globalAlpha = 1; }
    // 地平面
    const hz = []; for (let i = 0; i <= 72; i++) { const a = i * 5 * RAD; hz.push(proj([0, 1, 2].map(j => ax.N[j] * Math.cos(a) + ax.E[j] * Math.sin(a)))); }
    ctx.fillStyle = `rgba(92,150,96,${lerp(0.2, 0.4, s)})`; ctx.beginPath(); hz.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); poly(hz, C.horizon, 2);
    // 天軸
    const np = proj([0, 0, 1.28]), spole = proj([0, 0, -1.28]); poly([spole, np], '#cfe0ee', 1.5, [6, 5]); text('天北極', np.x, np.y - 10, '#cfe0ee', 13); text('天南極', spole.x, spole.y + 20, '#cfe0ee', 13);
    const sun = view === 'spiral' ? spAt(sp.e) : sunNow();
    // 天球赤道
    if (S.eq) { const vs = decCircle(0); curve(vs, proj, altOf, c, C.eq, 1.8, { alpha: .85, downAlpha: .45 }); labelLeft(vs.map(proj), '天球赤道', C.eq); }
    // 二分二至的日行軌跡（③ 一律顯示回歸線當作範圍）
    if (S.cmp || view === 'spiral') for (const [dec, color, name] of [[Su.OBL, C.summer, view === 'spiral' ? '赤緯 +23.4°（夏至）' : '夏至的日行軌跡'], [-Su.OBL, C.winter, view === 'spiral' ? '赤緯 −23.4°（冬至）' : '冬至的日行軌跡']]) { const vs = decCircle(dec); curve(vs, proj, altOf, c, color, 1.5, { alpha: .8, downAlpha: .35 }); labelRight(vs.map(proj), name, color); }
    // 黃道
    if (S.ecl) {
      const vs = eclPoints(thEff); curve(vs, proj, altOf, c, C.ecl, 2.4, { alpha: 1, downAlpha: .55 });
      for (const [, l, n] of Su.CARDINAL) { const q = proj(eclAt(l, thEff)), bk = q.depth > c.depth, nearSun = view !== 'spiral' && Math.abs(((sun.lam - l + 540) % 360) - 180) < 6; ctx.globalAlpha = bk ? .55 : 1; dot(q.x, q.y, 4.5, C.ecl, '#fff'); if (!nearSun) text(n + '點', q.x + 8, q.y - 7, '#ffb3d4', 12, 'left', '600', true); ctx.globalAlpha = 1; }
      if (view !== 'spiral') { const q1 = proj(eclAt(sun.lam + 42, thEff)), q0 = proj(eclAt(sun.lam + 36, thEff)); arrowHead(q1.x, q1.y, Math.atan2(q1.y - q0.y, q1.x - q0.x), C.ecl, 9); text('每天東移約 1°', q1.x + 8, q1.y - 10, '#ffb3d4', 11.5, 'left', '', true); }
    }
    if (view === 'spiral') drawTrail(proj, altOf, c, th, ref, k);
    else {
      // 今天的日行軌跡（太陽所在的赤緯圈）
      const vs = decCircle(sun.dec, 2); curve(vs, proj, altOf, c, C.path, 3.2, { alpha: 1, downAlpha: .55 });
      const hq = proj(K.starVec(sun.dec, thEff - sun.ra + 30)), hq0 = proj(K.starVec(sun.dec, thEff - sun.ra + 24)); arrowHead(hq.x, hq.y, Math.atan2(hq.y - hq0.y, hq.x - hq0.x), C.path, 9);
      { const upPts = vs.filter(v => altOf(v) >= 0), pts = (upPts.length > 3 ? upPts : vs).map(proj); if (s > .5) labelRight(pts, `今天的日行軌跡（赤緯 ${signed(sun.dec)}°）`, C.path, 1); else { const p = pts.reduce((m, q) => q.x < m.x ? q : m); text(`今天的日行軌跡（赤緯 ${signed(sun.dec)}°）`, p.x - 6, p.y - 12, C.path, 12, 'right', '600', true); } }
      // 與黃道的第二個交點
      const cr = Su.crossings(sun.lam);
      if (S.ecl && !cr.tangent) { const q = proj(eclAt(cr.twin, thEff)); ctx.globalAlpha = q.depth > c.depth ? .6 : 1; ring(q.x, q.y, 8, C.twin, 2.2); text(`${Su.dateName(cr.twinDay)}的太陽也在這`, q.x, q.y + 24, C.twin, 12, 'center', '600', true); ctx.globalAlpha = 1; }
      if (S.ecl && cr.tangent) { const q = proj(eclAt(sun.lam, thEff)); text('和黃道相切：只碰一點', q.x + 14, q.y + 22, C.twin, 12, 'left', '700', true); }
      // 正午仰角（②）
      if (s > .5) {
        const nn = Su.noon(S.lat, sun.dec);
        if (nn.alt > 0 && nn.alt < 89.5) {
          const top = K.starVec(sun.dec, 0), base = K.dot(top, ax.N) >= 0 ? ax.N : ax.N.map(x => -x), arc = [];
          for (let i = 0; i <= 20; i++) { const m = [0, 1, 2].map(j => base[j] * (1 - i / 20) + top[j] * (i / 20)), l = Math.hypot(...m); arc.push(proj(m.map(x => x * .36 / l))); }
          poly(arc, '#ff9c6b', 2.2); poly([c, proj(top)], '#ff9c6b', 1.2, [3, 4], .8); text(`正午仰角 ${K.fmt(nn.alt)}°`, arc[6].x - 8, arc[6].y + 16, '#ff9c6b', 12.5, 'right', '700', true);
        }
      }
    }
    // 太陽
    { const q = proj(K.starVec(sun.dec, thEff - sun.ra)), up = altOf(K.starVec(sun.dec, thEff - sun.ra)) >= 0, bk = q.depth > c.depth; sunDisk(q.x, q.y, 9, !up || bk); const pn = view !== 'spiral' && Su.pointName(sun.lam); text((up ? '太陽' : '太陽（地平面下）') + (pn ? `＝${pn}` : ''), q.x + 14, q.y - 10, '#ffe08a', 12.5, 'left', '700', true); }
    // 方位、天頂、觀察者
    for (const [v, name] of [[ax.N, '北 N'], [ax.N.map(x => -x), '南 S'], [ax.E, '東 E'], [ax.E.map(x => -x), '西 W']]) { const q = proj(v.map(x => x * 1.13)); text(name, q.x, q.y + 4, '#bfe8bf', 13, 'center', '600', true); }
    const zen = proj(ax.U.map(x => x * 1.22)); poly([c, zen], '#ffffff', 1.3, [3, 4], .8); text('天頂', zen.x, zen.y - 8, '#ffffff', 12);
    dot(c.x, c.y, 6, '#3d9be0'); text('觀察者', c.x, c.y + 20, '#9fd0f5', 12);
    const head = view === 'spiral' ? `③ ${K.latName(S.lat)}：太陽一年的足跡（${S.year === 12 ? '一年＝12 天，誇張' : '真實 365 天'}）` : s < 0.5 ? `① 天球：${Su.dateName(S.day)}，${K.latName(S.lat)}` : `② ${K.latName(S.lat)} 的地平線：${Su.dateName(S.day)}`;
    text(head, 14, 24, '#d6e4f0', 14, 'left', '600', true);
    if (k > .02) text(k > .98 ? '貼著星空看：星星和黃道不動，換地平面（地球）在轉' : '正在扣掉自轉……', 14, 44, '#ffd7c9', 13, 'left', '600', true);
    if (view === 'spiral') text(`已經過 ${K.fmt(sp.e)} 天（${Su.dateName(sun.day)}）${sp.done ? '　一年過完了！' : ''}`, 14, H - 16, '#ffe08a', 13, 'left', '700', true);
  }
  function labelLeft(pts, name, color) { const p = pts.reduce((m, q) => q.x < m.x ? q : m); text(name, p.x - 6, p.y + 4, color, 12, 'right', '600', true); }
  function labelRight(pts, name, color, prefer = 0) { const p = pts.reduce((m, q) => q.x > m.x ? q : m); text(name, p.x + 8, p.y + 4 + prefer * 14, color, 12, 'left', '600', true); }

  // ③ 足跡：同一組太陽位置，k＝0 站在地面看（螺旋），k＝1 扣掉自轉（黃道）
  function drawTrail(proj, altOf, c, th, ref, k) {
    const E = sp.e, from = Math.max(0, E - S.year), step = S.year === 12 ? 1 / 72 : 1 / 36;
    let seg = [], state = null;
    const flush = () => { if (seg.length > 1) { const [up, today] = state.split('|'); poly(seg, C.trail, today === '1' ? 3 : 1.6, [], up === '1' ? (today === '1' ? 1 : .8) : .28); } };
    for (let e = from; ; e += step) {
      const last = e >= E; if (last) e = E;
      const p = spAt(e), Hd = p.H - k * (p.theta - ref), v = K.starVec(p.dec, Hd);
      const up = K.horizon(p.dec, p.H, S.lat).alt >= 0 ? '1' : '0', today = E - e <= 1 ? '1' : '0', st = up + '|' + today, q = proj(v);
      if (state !== null && st !== state) { seg.push(q); flush(); seg = [seg[seg.length - 2] || q]; }
      seg.push(q); state = st; if (last) break;
    }
    flush();
  }

  // ---------- ④ 第一人稱 ----------
  function fpCamera() {
    const az = look.az * RAD, al = look.alt * RAD, f = [Math.cos(al) * Math.sin(az), Math.cos(al) * Math.cos(az), Math.sin(al)], r = [Math.cos(az), -Math.sin(az), 0];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], F = (W / 2) / (2 * Math.tan(look.fov * RAD / 4));
    // 立體投影（魚眼）：視野夠廣，能同時看到地平線與天頂
    return l => { const z = K.dot(l, f); if (z < -0.35) return null; const k = 2 / (1 + z); return { x: W / 2 + F * k * K.dot(l, r), y: H / 2 - F * k * K.dot(l, u) }; };
  }
  const localVec = (dec, Hh, ax) => { const v = K.starVec(dec, Hh); return [K.dot(v, ax.E), K.dot(v, ax.N), K.dot(v, ax.U)]; };
  const altAz = (alt, az) => [Math.cos(alt * RAD) * Math.sin(az * RAD), Math.cos(alt * RAD) * Math.cos(az * RAD), Math.sin(alt * RAD)];
  function fpCurve(Pr, ls, color, width, alpha = 1, dash = []) { let pts = []; for (const l of ls) { const q = l[2] >= -1e-6 ? Pr(l) : null; if (q) pts.push(q); else { poly(pts, color, width, dash, alpha); pts = []; } } poly(pts, color, width, dash, alpha); }
  function ground(Pr) {
    ctx.fillStyle = '#1d3a26';
    for (let a = -90; a < 0; a += 10) for (let z = 0; z < 360; z += 10) {
      const q = [[a, z], [a, z + 10], [a + 10, z + 10], [a + 10, z]].map(([al, az]) => Pr(altAz(al, az)));
      if (q.some(p => !p)) continue; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
    }
    fpCurve(Pr, Array.from({ length: 181 }, (_, i) => altAz(0, i * 2)), C.horizon, 2);
    for (const [z, name] of [[0, '北'], [45, '東北'], [90, '東'], [135, '東南'], [180, '南'], [225, '西南'], [270, '西'], [315, '西北']]) { const p = Pr(altAz(0, z)); if (p) text(name, p.x, p.y + 22, '#bfe8bf', z % 90 ? 12 : 16, 'center', '600'); }
  }
  function drawFirst() {
    const ax = K.localAxes(latShown), Pr = fpCamera(), th = thetaNow(), sun = sunNow(), sl = localVec(sun.dec, sun.H, ax), alt = Math.asin(clamp(sl[2], -1, 1)) / RAD;
    const f = S.air ? clamp((alt + 8) / 14, 0, 1) : 0, starA = S.air ? clamp(1 - f / .45, 0, 1) : 1;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix('#06142a', '#3f8fd6', f)); g.addColorStop(1, mix('#123459', '#cfe9f8', f)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const ink = f > .5 ? '#0d2a44' : '#d6e4f0';
    for (const al of [30, 60]) fpCurve(Pr, Array.from({ length: 121 }, (_, i) => altAz(al, i * 3)), f > .5 ? 'rgba(20,60,100,.25)' : 'rgba(160,190,220,.25)', 1, 1, [3, 5]);
    if (starA > 0) { ctx.globalAlpha = starA; for (const b of BG) { const l = localVec(b.dec, th - b.H0, ax), q = l[2] > 0 && Pr(l); if (q) dot(q.x, q.y, .7 + b.mag * 1.3, '#fff'); } ctx.globalAlpha = 1; }
    const sky = (dec, Hh) => localVec(dec, Hh, ax);
    if (S.eq) fpCurve(Pr, Array.from({ length: 121 }, (_, i) => sky(0, i * 3)), C.eq, 1.6, .8);
    if (S.cmp) for (const [dec, color] of [[Su.OBL, C.summer], [0, C.equi], [-Su.OBL, C.winter]]) fpCurve(Pr, Array.from({ length: 121 }, (_, i) => sky(dec, i * 3)), color, 1.5, .85, [6, 4]);
    if (S.ecl) {
      fpCurve(Pr, Array.from({ length: 181 }, (_, i) => { const q = Su.eclToEq(i * 2); return sky(q.dec, th - q.ra); }), C.ecl, 2.2, starA > .3 ? 1 : .6);
      if (starA > .3) for (const z of Su.ZODIAC) { const q = Su.eclToEq(z.mid), l = sky(q.dec, th - q.ra), p = l[2] > 0 && Pr(l); if (p) text(z.name, p.x, p.y - 8, '#ffb3d4', 11.5, 'center', '', true); }
    }
    // 今天的日行軌跡＋整點刻度
    fpCurve(Pr, Array.from({ length: 181 }, (_, i) => sky(sun.dec, i * 2)), C.path, 3);
    for (let h = 0; h < 24; h++) { const l = sky(sun.dec, 15 * (h - 12)), q = l[2] > 0 && Pr(l); if (q) { dot(q.x, q.y, 3, C.path); if (h % 3 === 0) text(`${h} 時`, q.x, q.y + 17, f > .5 ? '#6b4300' : '#ffd98a', 11.5, 'center', '600', f <= .5); } }
    { const q = sl[2] > -0.02 && Pr(sl); if (q) { sunDisk(q.x, q.y, 11); } }
    ground(Pr);
    const dir = look.alt > 80 ? '天頂' : ['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(((look.az % 360) + 360) % 360 / 45) % 8];
    text(`④ ${K.latName(S.lat)}，${Su.dateName(S.day)} ${Su.clock(hourNow())}，面向${dir}`, 14, 24, ink, 14, 'left', '600', f <= .5);
    if (S.air && f > .55) text('白天大氣散射陽光，看不到星星與黃道；可關掉「大氣」', W - 14, 24, ink, 12, 'right');
    if (S.inset) { drawAltGraph(12, H - 140, 232, 128, sun); drawShadow(W - 150, H - 150, 140, sun, ax); }
  }
  function panel(x, y, w, h) { ctx.fillStyle = 'rgba(6,16,28,.82)'; ctx.strokeStyle = 'rgba(160,190,220,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); }
  function drawAltGraph(x, y, w, h, sun) {
    panel(x, y, w, h); const l = x + 30, r = x + w - 10, t = y + 24, b = y + h - 22, X = T => l + (r - l) * T / 24, Y = a => t + (b - t) * (90 - a) / 180;
    text('太陽仰角—時間', x + 10, y + 16, '#d6e4f0', 12, 'left', '700');
    poly([{ x: l, y: Y(0) }, { x: r, y: Y(0) }], '#8fd18f', 1.2); for (const T of [0, 6, 12, 18, 24]) text(String(T), X(T), b + 14, '#9fb3c7', 10);
    for (const a of [90, -90]) text(`${a > 0 ? '+' : '−'}90°`, l - 4, Y(a) + 4, '#9fb3c7', 9.5, 'right');
    const curveOf = (dec, color, wd) => poly(Array.from({ length: 97 }, (_, i) => { const T = i / 4; return { x: X(T), y: Y(K.horizon(dec, 15 * (T - 12), S.lat).alt) }; }), color, wd);
    if (S.cmp) { curveOf(Su.OBL, C.summer, 1.2); curveOf(-Su.OBL, C.winter, 1.2); }
    curveOf(sun.dec, C.path, 2.2); const a = K.horizon(sun.dec, sun.H, S.lat).alt; dot(X(hourNow()), Y(a), 4, C.sun, '#b77b00');
    text(`${K.fmt(a)}°`, r, y + 16, '#ffe08a', 12, 'right', '700');
  }
  function drawShadow(x, y, size, sun, ax) {
    panel(x, y, size, size); const cx = x + size / 2, cy = y + size / 2 + 4, R = size / 2 - 26, unit = 14;
    text('竿影（由上往下看）', x + 8, y + 15, '#d6e4f0', 11.5, 'left', '700');
    ctx.setLineDash([2, 4]); ring(cx, cy, R, 'rgba(160,190,220,.4)', 1); ctx.setLineDash([]);
    text('N', cx, cy - R - 4, '#bfe8bf', 10.5); text('S', cx, cy + R + 10, '#bfe8bf', 10.5); text('E', cx + R + 7, cy + 4, '#bfe8bf', 10.5); text('W', cx - R - 7, cy + 4, '#bfe8bf', 10.5);
    const tip = Hh => { const l = localVec(sun.dec, Hh, ax); if (l[2] < Math.sin(4 * RAD)) return null; const dx = -l[0] / l[2] * unit, dy = l[1] / l[2] * unit, d = Math.hypot(dx, dy); return d > R ? null : { x: cx + dx, y: cy + dy }; };
    let pts = []; for (let T = 0; T <= 24; T += .1) { const p = tip(15 * (T - 12)); if (p) pts.push(p); else { poly(pts, '#ffd98a', 1.2, [], .7); pts = []; } } poly(pts, '#ffd98a', 1.2, [], .7);
    const l = localVec(sun.dec, sun.H, ax);
    if (l[2] > Math.sin(1 * RAD)) { const dx = -l[0] / l[2] * unit, dy = l[1] / l[2] * unit, d = Math.hypot(dx, dy), kk = d > R ? R / d : 1; poly([{ x: cx, y: cy }, { x: cx + dx * kk, y: cy + dy * kk }], '#0a0a0a', 4); poly([{ x: cx, y: cy }, { x: cx + dx * kk, y: cy + dy * kk }], '#5c6670', 2); text(`影長 ${K.fmt(d / unit)} 倍竿長`, cx, y + size - 4, '#d6e4f0', 10.5); }
    else text('太陽在地平面下', cx, y + size - 4, '#9fb3c7', 10.5);
    dot(cx, cy, 3.5, '#fff');
  }

  function draw() {
    if (canvas.width !== W * 2) { canvas.width = W * 2; canvas.height = H * 2; }
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    if (S.view === 'prep') drawPrep(); else if (S.view === 'first') drawFirst(); else drawOrbit();
  }

  // ---------- 讀值、圖例、講義 ----------
  function readings() {
    const sun = S.view === 'spiral' ? spAt(sp.e) : sunNow(), dec = sun.dec, nn = Su.noon(S.lat, dec), dl = Su.daylight(S.lat, dec), h = K.horizon(dec, 15 * (hourNow() - 12), S.lat);
    const rows = [['日期', Su.dateName(S.day)], ['太陽黃經', `${K.fmt(sun.lam)}°`], ['太陽赤緯', `${signed(dec)}°`], ['所在緯度', K.latName(S.lat)], ['現在', `${Su.clock(hourNow())}　仰角 ${K.fmt(h.alt)}°`], ['正午仰角', nn.alt > 0 ? `${K.fmt(nn.alt)}°（${nn.dir === '天頂' ? '天頂' : nn.dir + '方'}）` : '看不到'], ['晝長', dl.type === 'polar-day' ? '24 小時（永晝）' : dl.type === 'polar-night' ? '0（永夜）' : `${K.fmt(dl.hours)} 小時`]];
    $('readings').innerHTML = rows.map(([k, v]) => `<div class="reading"><span class="muted">${k}</span><strong>${v}</strong></div>`).join('');
    const items = [];
    if (S.view !== 'prep') { items.push([C.ecl, '黃道（一年的路）']); if (S.view === 'spiral') items.push([C.trail, '太陽的足跡']); else items.push([C.path, '今天的日行軌跡（一天的圈）']); if (S.eq) items.push([C.eq, '天球赤道']); if (S.cmp || S.view === 'spiral') items.push([C.summer, '夏至'], [C.winter, '冬至']); }
    $('legend').innerHTML = items.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
    const sunR = $('to-rise'), sunS = $('to-set'); sunR.disabled = dl.rise === null; sunS.disabled = dl.set === null;
  }
  function worksheet() {
    const rows = Su.worksheet(S.lat, dayInt()); $('ws-title').textContent = `鳩特講解：${K.latName(S.lat)}，${Su.dateName(S.day)}`;
    $('worksheet').innerHTML = `<div class="ws-grid">${rows.map(([k, v], i) => `<div class="k">(${i + 1}) ${k}</div>${reveal.includes(i) ? `<div class="ws-cell">${v}</div>` : `<div class="ws-cell hidden-cell" data-ws="${i}" tabindex="0" role="button" aria-label="揭曉 ${k}">？（點一下揭曉）</div>`}`).join('')}</div>`;
    $('worksheet').querySelectorAll('[data-ws]').forEach(el => { const go = () => { reveal.push(+el.dataset.ws); worksheet(); }; el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }; });
    $('ws-next').disabled = reveal.length >= rows.length;
  }
  function revealNext() { const n = Su.worksheet(S.lat, dayInt()).length; for (let i = 0; i < n; i++) if (!reveal.includes(i)) { reveal.push(i); break; } worksheet(); }
  function syncPanels() {
    const slot = `${dayInt()}|${Math.floor(hourNow() * 4)}|${S.lat}|${S.view}|${S.cmp}|${S.eq}`;
    if (slot === lastSlot) return; const dayChanged = lastSlot.split('|')[0] !== String(dayInt()); lastSlot = slot;
    $('day').value = dayInt(); $('day-out').textContent = Su.dateName(S.day); $('hour').value = hourNow(); $('hour-out').textContent = Su.clock(hourNow());
    document.querySelectorAll('[data-day]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.day === dayInt())));
    readings(); if (dayChanged) worksheet();
  }

  // ---------- 動畫迴圈 ----------
  function animating() { return (S.view === 'spiral' ? sp.playing : (spinning && S.view !== 'prep') || orbiting) || latT < 1 || sT < 1 || kT < 1; }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (S.view === 'spiral') {
      if (sp.playing) {
        const before = sp.e; sp.e += dt * sp.speed;
        if (Math.floor(sp.e / S.year + 1e-9) > Math.floor(before / S.year + 1e-9)) { sp.e = Math.floor(sp.e / S.year + 1e-9) * S.year; sp.playing = false; sp.done = true; spButtons(); }
        const p = spAt(sp.e); S.day = ((p.day - 1) % 365 + 365) % 365 + 1; clock = sp.T0 + 24 * sp.e;
      }
    } else {
      if (spinning && S.view !== 'prep') clock += dt * 1.5 * speed;
      if (orbiting) S.day = ((S.day - 1 + dt * 5 * speed) % 365 + 365) % 365 + 1;
    }
    if (latT < 1) { latT = Math.min(1, latT + dt / .8); latShown = lerp(latFrom, S.lat, ease(latT)); }
    if (sT < 1) { sT = Math.min(1, sT + dt / 2.2); s = lerp(sFrom, sTo, ease(sT)); if (orbitFrom && sTo === 0) { const k = ease(sT); orbit = { az: lerp(orbitFrom.az, 0, k), el: lerp(orbitFrom.el, 0, k), zoom: lerp(orbitFrom.zoom, 1, k) }; } if (sT >= 1) orbitFrom = null; }
    if (kT < 1) { kT = Math.min(1, kT + dt / 2.4); kF = lerp(kFrom, kTo, ease(kT)); }
    syncPanels(); draw();
    if (animating()) requestAnimationFrame(tick); else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } else draw(); }

  // ---------- 操作 ----------
  function setSpin(v) { spinning = v; $('spin').setAttribute('aria-pressed', String(v)); $('spin').textContent = v ? '⏸ 自轉中' : '↻ 自轉（一天）'; kick(); }
  function setOrbiting(v) { orbiting = v; $('orbit-play').setAttribute('aria-pressed', String(v)); $('orbit-play').textContent = v ? '⏸ 公轉中' : '☀ 公轉（一年）'; kick(); }
  function setLat(lat, animate = true) {
    lat = clamp(Math.round(lat * 2) / 2, -90, 90);
    if (lat !== S.lat) reveal = [];
    latFrom = animate ? latShown : lat; S.lat = lat; latT = animate ? 0 : 1; if (!animate) latShown = lat;
    $('lat').value = lat; $('lat-out').textContent = K.latName(lat);
    document.querySelectorAll('[data-lat]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lat === lat)));
    $('enter-dome').textContent = `▶ 旋轉、放大進入「${K.latName(lat)}」的地平線`;
    if (S.view === 'spiral') spReset();
    if (S.view === 'first') faceSun();
    lastSlot = ''; syncPanels(); worksheet(); syncURL(); kick();
  }
  function setDay(day, manual = true) {
    S.day = ((Math.round(day) - 1) % 365 + 365) % 365 + 1;
    if (manual) { reveal = []; setOrbiting(false); if (S.view === 'spiral') spReset(); }
    lastSlot = ''; syncPanels(); worksheet(); syncURL(); kick(); guide?.notify?.('day');
  }
  function setHour(T) { clock = 24 * Math.floor(clock / 24) + clamp(T, 0, 24); lastSlot = ''; syncPanels(); kick(); }
  function setFrame(f, animate = true) {
    if (f === 'stars' && S.frame !== 'stars') thetaRef = thetaNow();
    S.frame = f; kFrom = kF; kTo = f === 'stars' ? 1 : 0; kT = animate ? 0 : 1; if (!animate) kF = kTo;
    document.querySelectorAll('[data-frame]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.frame === f))); kick();
  }
  function spButtons() { $('sp-play').textContent = sp.playing ? '⏸ 暫停' : sp.done ? '▶ 再走一年' : '▶ 播放'; }
  function spReset() { sp.day0 = S.day; sp.T0 = hourNow(); sp.e = 0; sp.playing = false; sp.done = false; sp.started = true; clock = sp.T0; spButtons(); kick(); }
  function setYear(y) { S.year = y; document.querySelectorAll('[data-year]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.year === y))); spReset(); lastSlot = ''; syncPanels(); }
  function faceSun() { look = { ...look, az: S.lat >= Su.declination(Su.lambdaOfDay(S.day)) ? 180 : 0, alt: 45 }; }

  const CAPTION = {
    prep: ['預備知識：地球公轉，太陽在星空中移動', '拖動日期或按「公轉」：地球每天公轉約 1°，從地球看出去，太陽背後的星座跟著換，一年繞一圈就是黃道。'],
    sphere: ['① 天球與黃道：一年的路 vs. 一天的圈', '粉紅色黃道是太陽一年走的路；金色是今天的日行軌跡，它平行天球赤道，而且通過「今天太陽在黃道上的位置」。換日期看看金色圈怎麼移動。'],
    dome: ['② 局部地平線：今天的太陽怎麼走', '把當地地平面轉成水平：實線在地平面上方（白天），虛線在下方（夜晚）。黃道跟著星星每天轉一圈，所以它在天空中的斜度一直在變。'],
    spiral: ['③ 一年的足跡：自轉＋公轉', '按播放，把太陽每一刻的位置連起來。站在地面看是夾在 ±23.4° 之間的螺旋；切到「貼著星空看」扣掉自轉，螺旋就攤開成黃道。'],
    first: ['④ 第一人稱：抬頭看太陽', '站在觀察者的位置抬頭看。金色是今天的日行軌跡與整點位置；關掉「大氣」可以看到太陽背後的星座與黃道。拖曳轉頭、滾輪縮放。']
  };
  function setView(v, animate = true) {
    const prev = S.view; S.view = v;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    if (v === 'dome' || v === 'sphere') { const target = v === 'dome' ? 1 : 0; sFrom = s; sTo = target; sT = animate && (prev === 'sphere' || prev === 'dome') ? 0 : 1; if (sT === 1) s = target; }
    if (v === 'spiral') { s = 0; sT = 1; setSpin(false); setOrbiting(false); if (!sp.started) spReset(); }
    else if (prev === 'spiral') { sp.playing = false; spButtons(); }
    if (v === 'dome' || v === 'first') { if (S.frame !== 'ground') setFrame('ground', false); }
    if (v === 'spiral' && S.frame === 'stars') kF = kTo = 1;
    if (v === 'sphere' && S.frame === 'stars') thetaRef = thetaNow();
    if (v === 'first' && prev !== 'first') faceSun();
    $('scene-title').textContent = CAPTION[v][0]; $('scene-caption').textContent = CAPTION[v][1];
    $('look-tools').hidden = v !== 'first'; $('orbit-tools').hidden = !(v === 'sphere' || v === 'dome' || v === 'spiral');
    $('spiral-tools').hidden = v !== 'spiral'; $('time-tools').hidden = v === 'spiral'; $('frame-tools').hidden = !(v === 'sphere' || v === 'spiral');
    $('lat-tools').hidden = v === 'prep'; $('dome-buttons').hidden = !(v === 'sphere' || v === 'dome');
    lastSlot = ''; syncPanels(); syncURL(); kick(); guide?.notify?.('view');
  }
  function syncURL() { const q = new URLSearchParams({ lat: S.lat, day: dayInt(), view: S.view }); if (modeName !== 'free') q.set('mode', modeName); try { history.replaceState(null, '', '?' + q); } catch (_) { /* 靜態檢視 */ } }

  const today = (() => { const d = new Date(); return ((Su.dayOf(d.getMonth() + 1, d.getDate()) - 1) % 365) + 1; })();
  $('date-buttons').innerHTML = Su.DATES.map(([d, n]) => `<button type="button" data-day="${d}" aria-pressed="false">${n}</button>`).join('') + `<button type="button" data-day="${today}" aria-pressed="false">今天</button>`;
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => setDay(+b.dataset.day));
  $('day').addEventListener('input', e => setDay(+e.target.value));
  $('lat-buttons').innerHTML = Su.LATS.map(([v, n]) => `<button type="button" data-lat="${v}" aria-pressed="false">${n}</button>`).join('');
  document.querySelectorAll('[data-lat]').forEach(b => b.onclick = () => setLat(+b.dataset.lat));
  $('lat').addEventListener('input', e => setLat(+e.target.value, false));
  $('hour').addEventListener('input', e => { setSpin(false); setHour(+e.target.value); });
  const jump = key => { const dl = Su.daylight(S.lat, Su.declination(Su.lambdaOfDay(S.day))); const T = key === 'noon' ? 12 : dl[key]; if (T !== null) { setSpin(false); setHour(T); } };
  $('to-rise').onclick = () => jump('rise'); $('to-noon').onclick = () => jump('noon'); $('to-set').onclick = () => jump('set');
  $('spin').onclick = () => setSpin(!spinning); $('orbit-play').onclick = () => setOrbiting(!orbiting); $('speed').onchange = e => { speed = +e.target.value; };
  $('enter-dome').onclick = () => { if (S.view !== 'sphere') setView('sphere', false); setView('dome'); };
  function exitDome() { if (S.view !== 'dome') setView('dome', false); orbitFrom = { ...orbit }; setView('sphere'); }
  $('exit-dome').onclick = exitDome;
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  document.querySelectorAll('[data-frame]').forEach(b => b.onclick = () => setFrame(b.dataset.frame));
  document.querySelectorAll('[data-year]').forEach(b => b.onclick = () => setYear(+b.dataset.year));
  $('sp-play').onclick = () => { sp.playing = !sp.playing; if (sp.playing) sp.done = false; spButtons(); kick(); };
  $('sp-reset').onclick = () => { spReset(); lastSlot = ''; syncPanels(); };
  $('sp-speed').onchange = e => { sp.speed = +e.target.value; };
  const toggle = (id, key) => { $(id).onclick = () => { S[key] = !S[key]; $(id).setAttribute('aria-pressed', String(S[key])); lastSlot = ''; syncPanels(); kick(); guide?.notify?.(key); }; };
  [['t-ecl', 'ecl'], ['t-eq', 'eq'], ['t-cmp', 'cmp'], ['t-bg', 'bg'], ['t-air', 'air'], ['t-inset', 'inset']].forEach(([id, key]) => toggle(id, key));
  $('t-air').addEventListener('click', () => { $('t-air').textContent = S.air ? '大氣（白天看不到星星）' : '大氣已關（看得到星星）'; });
  document.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { const k = b.dataset.look; look = k === 'zenith' ? { ...look, az: 180, alt: 90 } : { ...look, az: +k, alt: 45 }; kick(); });
  document.querySelectorAll('[data-orbit]').forEach(b => b.onclick = () => { const o = b.dataset.orbit; orbit = o === 'top' ? { az: 0, el: 55, zoom: 1 } : o === 'side' ? { az: 0, el: -30 + 30 * s - 24 * s, zoom: 1 } : { az: 0, el: 0, zoom: 1 }; kick(); });
  $('ws-next').onclick = revealNext; $('ws-all').onclick = () => { reveal = Su.worksheet(S.lat, dayInt()).map((_, i) => i); worksheet(); }; $('ws-none').onclick = () => { reveal = []; worksheet(); };

  // 拖曳：①②③ 旋轉天球、④ 轉頭；滾輪／雙指縮放；預備知識拖曳換日期
  const pointers = new Map(); let pinch = 0; const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) pinch = spread(); });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const d = spread(); if (pinch) zoomBy(d / pinch); pinch = d; return; }
    if (S.view === 'prep') { const r = canvas.getBoundingClientRect(), sx = (e.clientX - r.left) * W / r.width - 268, sy = (e.clientY - r.top) * H / r.height - 252; if (Math.hypot(sx, sy) < 240) { const lam = Su.norm(Math.atan2(-sy, sx) / RAD + 180); setOrbiting(false); S.day = Su.dayOfLambda(lam); lastSlot = ''; syncPanels(); worksheet(); kick(); } return; }
    if (S.view === 'first') { look.az = (look.az - dx * .25 + 360) % 360; look.alt = clamp(look.alt + dy * .25, -10, 90); }
    else { orbit.az -= dx * .35; orbit.el = clamp(orbit.el + dy * .3, -30, 70); }
    kick();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => canvas.addEventListener(n, e => { pointers.delete(e.pointerId); pinch = 0; }));
  function zoomBy(k) { if (S.view === 'first') look.fov = clamp(look.fov / k, 40, 170); else if (S.view !== 'prep') orbit.zoom = clamp(orbit.zoom * k, .6, 2.2); kick(); }
  canvas.addEventListener('wheel', e => { if (S.view === 'prep') return; e.preventDefault(); zoomBy(Math.exp(-e.deltaY * .001)); }, { passive: false });

  // ---------- 自修任務 ----------
  const opt = (question, options, answer, hint) => ({ question, options, answer, hint });
  const near = (a, b) => Math.abs(dayInt() - Su.dayOf(a, b)) <= 1;
  const lessons = [
    { id: 'ecliptic-year', title: '黃道：太陽一年的路', prediction: { question: '地球繞太陽公轉。從地球看，太陽在星空背景中每天大約移動多少？', options: ['約 1°', '約 15°', '約 360°'] },
      task: '按「準備」後，在「預備知識」把日期從 3 月 21 日拖到 4 月 20 日（可拖下方日期滑桿，或在圖上拖動地球），看太陽背後的星座怎麼變。',
      prepare() { setView('prep', false); setDay(Su.dayOf(3, 21)); },
      check() { if (S.view !== 'prep') return { ok: false, message: '請切到「預備知識」。' }; if (!near(4, 20)) return { ok: false, message: '請把日期設成 4 月 20 日。' }; const l = Su.lambdaOfDay(S.day); return { ok: true, evidence: `3 月 21 日→4 月 20 日共 30 天：太陽從黃經 0°（雙魚座）移到黃經 ${K.fmt(l)}°（${Su.constellationOf(l)}），一天約 1°，方向和地球公轉相同（向東）` }; },
      observation: opt('一天大約移動多少？往哪個方向？', ['約 1°，向東', '約 1°，向西', '約 15°，向西'], 0, '30 天移了約 30°；看地球公轉的箭頭方向。'),
      reason: opt('為什麼太陽會在星空背景中移動？', ['地球繞太陽公轉，從地球看太陽的方向一直在變', '太陽自己繞著地球轉', '地球自轉造成的'], 0, '看「地球→太陽」那條虛線怎麼轉。'),
      conclusion: '太陽在星空背景中每天東移約 1°，一年繞一圈；這條路叫黃道。地軸傾斜，所以黃道和天球赤道夾 23.44°。' },
    { id: 'two-crossings', title: '日行軌跡與黃道的交點', prediction: { question: '5 月 21 日太陽一天的日行軌跡（金色圈），和黃道（粉紅色）有幾個交點？', options: ['1 個', '2 個', '0 個'] },
      task: '按「準備」後，在「① 天球與黃道」把日期設成 5 月 21 日，確認「黃道」有打開，看金色圈和粉紅色黃道交在哪裡。',
      prepare() { setView('sphere', false); setFrame('ground', false); setDay(Su.dayOf(3, 21)); },
      check() { if (S.view !== 'sphere') return { ok: false, message: '請切到「① 天球與黃道」。' }; if (!near(5, 21)) return { ok: false, message: '請把日期設成 5 月 21 日。' }; if (!S.ecl) return { ok: false, message: '請打開「黃道」。' }; const l = Su.lambdaOfDay(S.day), cr = Su.crossings(l); return { ok: true, evidence: `5 月 21 日：日行軌跡是赤緯 ${signed(Su.declination(l))}° 的圈，與黃道交於兩點——今天的太陽，以及約 ${Su.dateName(cr.twinDay)}的太陽位置` }; },
      observation: opt('第二個交點代表什麼？', ['一年中另有一天，太陽走同一條日行軌跡', '太陽一天會經過黃道兩次', '黃道每天換位置'], 0, '看第二個交點旁邊寫的日期。'),
      reason: opt('哪兩天的日行軌跡只碰黃道一點（相切）？', ['夏至與冬至', '春分與秋分', '每一天都只碰一點'], 0, '赤緯最大、最小的那兩天。'),
      conclusion: '今天的日行軌跡＝通過「今天太陽在黃道上位置」的赤緯圈，它與天球赤道平行。除了二至（相切），每條日行軌跡都經過黃道上的兩點，所以一年中兩天會走同一條路徑。' },
    { id: 'spiral-unwind', title: '一年的足跡', prediction: { question: '把太陽一整年每一刻的位置連起來（含每天的自轉），站在地面看會是什麼形狀？', options: ['夾在 ±23.4° 之間的螺旋', '一個大圓（黃道）', '一條直線'] },
      task: '按「準備」後，在「③ 一年的足跡」按播放走完一年，再按「貼著星空看（扣掉自轉）」，等動畫結束。',
      prepare() { setView('spiral', false); setFrame('ground', false); setYear(12); },
      check() { if (S.view !== 'spiral') return { ok: false, message: '請切到「③ 一年的足跡」。' }; if (sp.e < S.year - 1e-6) return { ok: false, message: '請按播放，走完一整年。' }; if (S.frame !== 'stars' || kT < 1) return { ok: false, message: '請按「貼著星空看（扣掉自轉）」，等動畫結束。' }; return { ok: true, evidence: '同一份足跡：站在地面看是夾在 ±23.4° 之間的螺旋；扣掉自轉後，整份足跡落在黃道上' }; },
      observation: opt('扣掉自轉後，足跡變成什麼？', ['黃道（與天球赤道夾 23.44°）', '天球赤道', '還是螺旋'], 0, '看金色足跡是否和粉紅色黃道重合。'),
      reason: opt('為什麼會這樣？', ['螺旋的每一圈都來自自轉；扣掉自轉，只剩公轉造成的黃道移動', '黃道自己會每天轉一圈', '太陽每天繞黃道一圈'], 0, '螺旋有幾圈？一年有幾天？'),
      conclusion: '太陽同時參與兩種運動：自轉讓它每天沿日行軌跡繞一圈；公轉讓它沿黃道每天東移約 1°，日行軌跡因此一天天上下平移。' }
  ];
  const quiz = [
    { id: 'q1', question: '夏至正午，台北（北緯 25°）的太陽仰角約為？', options: ['88.5°', '65°', '41.5°'], answer: 0, hint: '正午仰角＝90° −｜緯度 − 太陽赤緯｜。', explain: '夏至太陽赤緯約 +23.5°，90° − (25° − 23.5°)＝88.5°，在南方。' },
    { id: 'q2', question: '太陽一天東升西落的日行軌跡，與下列何者平行？', options: ['天球赤道', '黃道', '地平面'], answer: 0, hint: '周日運動繞著哪一條軸轉？', explain: '日行軌跡是繞天軸轉的赤緯圈，與天球赤道平行；黃道是太陽一年的路，和天球赤道夾 23.44°。' },
    { id: 'q3', question: '關於太陽沿黃道的運動，何者正確？', options: ['每天向東約 1°，一年一圈', '每小時向西 15°', '每天向西約 1°'], answer: 0, hint: '每小時 15° 是哪一種運動？', explain: '沿黃道是公轉造成的，每天向東約 1°；每小時向西 15° 是自轉造成的周日運動。' },
    { id: 'q4', question: '春分當天，太陽的日行軌跡與黃道交於幾點？', options: ['兩點：春分點與秋分點', '一點：只有春分點', '沒有交點'], answer: 0, hint: '春分的日行軌跡就是哪一條圈？', explain: '春分太陽赤緯 0°，日行軌跡就是天球赤道，它和黃道交於春分點與秋分點。' }
  ];
  const tasks = ['台北一年中有沒有哪天正午太陽在天頂？換成北回歸線呢？', '5 月 21 日和 7 月 23 日的日行軌跡有什麼關係？用 ① 天球驗證。', '在 ③ 換成「真實：365 天」，螺旋為什麼看起來像一整片？', '在 ④ 關掉「大氣」：夏至正午太陽背後是哪個星座？'];
  $('tasks').innerHTML = tasks.map(x => `<p>• ${x}</p>`).join('');
  guide = L.guidedStudy($('study-panel'), lessons, 'jutor.celestialsun.guide.v1', quiz, 'jutor.celestialsun.quiz.v1', () => modeName === 'study');

  // ---------- 模式與快速鍵 ----------
  function setMode(name) {
    // 進入自修模式：畫面全部回到初始狀態並停止
    if (name === 'study') {
      Object.assign(S, DEFAULTS); [['t-ecl', 'ecl'], ['t-eq', 'eq'], ['t-cmp', 'cmp'], ['t-bg', 'bg'], ['t-air', 'air'], ['t-inset', 'inset']].forEach(([id, k]) => $(id).setAttribute('aria-pressed', String(S[k])));
      clock = 9; orbit = { az: 0, el: 0, zoom: 1 }; look = { az: 180, alt: 45, fov: 150 }; setSpin(false); setOrbiting(false);
      sp.started = false; sp.playing = false; setFrame('ground', false); setYear(DEFAULTS.year); setLat(DEFAULTS.lat, false); setDay(DEFAULTS.day); setView('sphere', false); s = 0; sT = 1; orbitFrom = null;
    }
    modeName = name; document.body.dataset.study = String(name === 'study'); document.body.classList.toggle('projection', name === 'projection');
    $('study-panel').hidden = name !== 'study'; $('free-panel').hidden = name !== 'free'; $('worksheet-panel').hidden = name === 'study';
    $('proj-hint').hidden = name !== 'projection'; $('fullscreen').hidden = name !== 'projection';
    [['free-mode', 'free'], ['study-mode', 'study'], ['proj-mode', 'projection']].forEach(([id, n]) => $(id).setAttribute('aria-pressed', String(name === n)));
    if (name !== 'projection' && document.fullscreenElement) document.exitFullscreen?.();
    syncURL(); kick();
  }
  $('free-mode').onclick = () => setMode('free'); $('study-mode').onclick = () => setMode('study'); $('proj-mode').onclick = () => setMode('projection');
  $('fullscreen').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
  const VIEWS = ['prep', 'sphere', 'dome', 'spiral', 'first'];
  document.addEventListener('keydown', e => {
    if (modeName !== 'projection' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName; if (e.key === 'Escape') { setMode('free'); return; } if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (/^[1-5]$/.test(e.key)) setView(VIEWS[+e.key - 1]);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const list = Su.LATS.map(x => x[0]), i = list.indexOf(S.lat), n = i < 0 ? 0 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length; setLat(list[n]); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const list = Su.DATES.map(x => x[0]), i = list.indexOf(dayInt()), n = i < 0 ? 0 : (i + (e.key === 'ArrowUp' ? 1 : -1) + list.length) % list.length; setDay(list[n]); }
    else if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); if (S.view === 'spiral') $('sp-play').click(); else setSpin(!spinning); }
    else if (e.key.toLowerCase() === 'y') setOrbiting(!orbiting);
    else if (e.key.toLowerCase() === 'f' && (S.view === 'sphere' || S.view === 'spiral')) setFrame(S.frame === 'stars' ? 'ground' : 'stars');
    else if (e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); revealNext(); }
    else if (e.key.toLowerCase() === 'b') exitDome();
  });

  // 以 ?lat=25&day=172&view=dome&mode=projection 直接開啟
  const q = new URLSearchParams(location.search), qLat = parseFloat(q.get('lat')), qDay = parseInt(q.get('day'), 10), qView = VIEWS.includes(q.get('view')) ? q.get('view') : 'sphere';
  setLat(Number.isFinite(qLat) ? qLat : DEFAULTS.lat, false); setDay(Number.isFinite(qDay) ? qDay : DEFAULTS.day); setView(qView, false);
  setMode(['study', 'projection'].includes(q.get('mode')) ? q.get('mode') : 'free');
})();
