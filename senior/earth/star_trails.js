(() => {
  'use strict';
  const K = StarCore, L = ScienceLab, $ = id => document.getElementById(id);
  const canvas = $('sky'), ctx = canvas.getContext('2d'), W = 800, H = 500, RAD = Math.PI / 180;
  const COLOR = { circumpolar: '#f2b632', 'rise-set': '#5aa9ef', hidden: '#8a96a3', horizon: '#5aa9ef', plain: '#ffd84d' };
  const CLASS_NAME = { circumpolar: '拱極星', 'rise-set': '東升西落', hidden: '永遠看不到', horizon: '沿地平線轉' };
  const BG = K.backgroundStars();
  const DEFAULTS = { lat: 30, view: 'sphere', color: true, bound: true, bg: false, expo: 4 };

  // ---------- 狀態 ----------
  const S = { ...DEFAULTS };
  let latShown = S.lat, latFrom = S.lat, latT = 1;          // 緯度改變時的過場
  let orbitFrom = null;
  let s = 0, sFrom = 0, sTo = 0, sT = 1;                     // 0＝天球（天球不變），1＝局部地平線
  let t = 0, playing = true, speed = 1, last = 0, running = false;
  let orbit = { az: 0, el: 0, zoom: 1 };                     // 使用者在 ①② 拖曳的額外角度
  let look = { az: 0, alt: 35, fov: 90 };                   // 第一人稱面向
  let expoAnim = 1, reveal = [], modeName = 'free', guide = null;
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- 外部視角（①②）的 3D 投影 ----------
  // 天球座標 (Q,E,P) → 繪圖座標：過場時繞東西軸轉，讓天頂轉到正上方
  function place(v, lat) {
    const th = s * (90 - lat) * RAD, a = Math.atan2(v[0], v[2]) - th, r = Math.hypot(v[0], v[2]);
    return [r * Math.sin(a), v[1], r * Math.cos(a)];
  }
  function camera() {
    const az = (90 + orbit.az) * RAD, el = (lerp(12, 24, s) + orbit.el) * RAD, dist = lerp(4.3, 3.4, s) / orbit.zoom;
    const pos = [dist * Math.cos(el) * Math.cos(az), dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el)];
    const f = pos.map(x => -x / dist), rr = [f[1], -f[0], 0], rl = Math.hypot(rr[0], rr[1]) || 1, r = rr.map(x => x / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], F = lerp(640, 680, s), cy = H / 2 + 8 + lerp(0, 66, s);
    const P = p => { const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]], z = K.dot(d, f); return { x: W / 2 + F * K.dot(d, r) / z, y: cy - F * K.dot(d, u) / z, depth: z }; };
    P.radius = F / Math.sqrt(dist * dist - 1); P.center = P([0, 0, 0]); return P;
  }

  // ---------- 繪圖小工具 ----------
  const font = (size, w = '') => `${w} ${size}px system-ui,'Microsoft JhengHei',sans-serif`;
  function text(str, x, y, color = '#d6e4f0', size = 13, align = 'center', weight = '') { ctx.fillStyle = color; ctx.font = font(size, weight); ctx.textAlign = align; ctx.fillText(str, x, y); }
  function poly(pts, color, width = 2, dash = [], alpha = 1) { if (pts.length < 2) return; ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  function star(x, y, r, color) {
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)) : ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function arrowHead(x, y, ang, color, size = 9) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + size * Math.cos(ang), y + size * Math.sin(ang)); ctx.lineTo(x + size * Math.cos(ang + 2.5), y + size * Math.sin(ang + 2.5)); ctx.lineTo(x + size * Math.cos(ang - 2.5), y + size * Math.sin(ang - 2.5)); ctx.closePath(); ctx.fill(); }
  const starColor = dec => S.color ? COLOR[K.classify(dec, S.lat)] : COLOR.plain;
  const hourAngle = H0 => H0 + 15 * t;

  // ---------- 預備知識：北極星仰角＝緯度 ----------
  function drawPrep() {
    const lat = latShown, cx = 300, cy = 300, R = 140, th = lat * RAD, ox = cx + R * Math.cos(th), oy = cy - R * Math.sin(th);
    ctx.fillStyle = '#0b1d30'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, R); g.addColorStop(0, '#3d86c6'); g.addColorStop(1, '#1d4f7d');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    poly([{ x: cx, y: cy + R + 30 }, { x: cx, y: cy - R - 60 }], '#cfe0ee', 2, [6, 5]); arrowHead(cx, cy - R - 62, -Math.PI / 2, '#cfe0ee');
    text('地軸 → 指向北極星', cx, cy - R - 72, '#cfe0ee', 13);
    poly([{ x: cx - R - 20, y: cy }, { x: cx + R + 20, y: cy }], '#9fd4a8', 1.5); text('赤道', cx - R - 24, cy + 4, '#9fd4a8', 13, 'right');
    poly([{ x: cx, y: cy }, { x: ox, y: oy }], '#ffe08a', 1.5, [4, 4]);
    // 緯度角（地心）
    ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 42, 0, -th, lat > 0); ctx.stroke();
    text(`緯度 ${K.fmt(lat)}°`, cx + 62 * Math.cos(th / 2), cy - 62 * Math.sin(th / 2) + 5, '#ffe08a', 13);
    // 地平面（切線）與天頂
    const tN = [-Math.sin(th), Math.cos(th)], up = [Math.cos(th), Math.sin(th)], L1 = 150;
    poly([{ x: ox - tN[0] * L1, y: oy + tN[1] * L1 }, { x: ox + tN[0] * L1, y: oy - tN[1] * L1 }], '#8fd18f', 2.5);
    text('地平面', ox + tN[0] * (L1 + 8) + 4, oy - tN[1] * (L1 + 8), '#8fd18f', 13, 'left');
    poly([{ x: ox, y: oy }, { x: ox + up[0] * 110, y: oy - up[1] * 110 }], '#cfe0ee', 1.5, [3, 4]); text('天頂', ox + up[0] * 122, oy - up[1] * 122, '#cfe0ee', 13);
    // 北極星方向（與地軸平行）與仰角
    const visible = lat >= 0;
    poly([{ x: ox, y: oy }, { x: ox, y: oy - 140 }], visible ? '#ffd84d' : '#8a96a3', 2.5); arrowHead(ox, oy - 142, -Math.PI / 2, visible ? '#ffd84d' : '#8a96a3');
    star(ox, oy - 158, 9, visible ? '#ffd84d' : '#8a96a3'); text('北極星方向（非常遠，光線與地軸平行）', ox + 14, oy - 170, '#ffd84d', 12, 'left');
    const a0 = Math.atan2(-tN[1], tN[0]), a1 = -Math.PI / 2; ctx.strokeStyle = visible ? '#ff9c6b' : '#8a96a3'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox, oy, 52, a0, a1, a0 > a1); ctx.stroke();
    text(visible ? `仰角 ${K.fmt(lat)}°` : `在地平面下 ${K.fmt(-lat)}°`, ox - 64, oy - 58, visible ? '#ff9c6b' : '#c3ccd5', 14, 'right', '600');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, 7); ctx.fill(); text('觀察者', ox + 10, oy + 18, '#fff', 12, 'left');
    text(visible ? `北極星仰角 ＝ 緯度 ＝ ${K.fmt(lat)}°` : `南半球看不到北極星（它在地平面下 ${K.fmt(-lat)}°）`, W - 20, H - 24, '#ffe08a', 16, 'right', '700');
  }

  // ---------- ① 天球（天球不變）／② 局部地平線 ----------
  function drawOrbit() {
    const lat = latShown, P = camera(), ax = K.localAxes(lat), c = P.center;
    const sky = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 520); sky.addColorStop(0, '#12304b'); sky.addColorStop(1, '#071321');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const proj = v => P(place(v, lat)), alt = v => K.dot(v, ax.U);
    const back = q => q.depth > c.depth; // 天球背面
    // 天球輪廓
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(207,224,238,.75)'; ctx.beginPath(); ctx.arc(c.x, c.y, P.radius, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.strokeStyle = `rgba(207,224,238,${lerp(.75, .18, s)})`; ctx.beginPath(); ctx.arc(c.x, c.y, P.radius, 0, Math.PI); ctx.stroke();
    // 地平面（圓盤）
    const ring = []; for (let i = 0; i <= 72; i++) { const a = i * 5 * RAD, v = [0, 1, 2].map(k => ax.N[k] * Math.cos(a) + ax.E[k] * Math.sin(a)); ring.push(proj(v)); }
    ctx.fillStyle = `rgba(92,150,96,${lerp(0.22, 0.42, s)})`; ctx.beginPath(); ring.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
    poly(ring, '#8fd18f', 2);
    // 天軸
    const np = proj([0, 0, 1.28]), sp = proj([0, 0, -1.28]); poly([sp, np], '#cfe0ee', 1.5, [6, 5]);
    text('天北極', np.x, np.y - 10, '#cfe0ee', 13); text('天南極', sp.x, sp.y + 20, '#cfe0ee', 13);
    // 界線（拱極星／恆隱星）
    if (S.bound && Math.abs(S.lat) > 0.4 && Math.abs(S.lat) < 89.6) {
      const dc = Math.sign(S.lat) * (90 - Math.abs(S.lat));
      for (const [dec, color, name] of [[dc, '#f2b632', '拱極星界線'], [-dc, '#8a96a3', '恆隱星界線']]) {
        const pts = []; for (let h = 0; h <= 360; h += 4) pts.push(proj(K.starVec(dec, h)));
        poly(pts, color, 1.6, [5, 5], lerp(.9, .6, s)); const lab = pts.reduce((m, p) => p.x < m.x ? p : m); text(name, lab.x - 6, lab.y + 4, color, 12, 'right');
      }
    }
    // 背景星
    if (S.bg) for (const b of BG) { const v = K.starVec(b.dec, hourAngle(b.H0)), q = proj(v); if (Math.hypot(q.x - c.x, q.y - c.y) > P.radius + 2) continue; ctx.globalAlpha = (alt(v) >= 0 ? .85 : .25) * (back(q) ? .5 : 1); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, .8 + b.mag * 1.2, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // 講義五顆星的星軌
    for (const [dec, H0] of K.HANDOUT_STARS) {
      const color = starColor(dec);
      let seg = [], segUp = null, segBack = null;
      const flush = () => { if (seg.length > 1) poly(seg, color, segUp ? 2.6 : 1.4, segUp ? [] : [4, 5], (segUp ? 1 : lerp(.55, .2, s)) * (segBack ? .55 : 1)); };
      for (let h = 0; h <= 360; h += 3) {
        const v = K.starVec(dec, h), q = proj(v), up = alt(v) >= -1e-6, bk = back(q);
        if (segUp !== null && (up !== segUp || bk !== segBack)) { seg.push(q); flush(); seg = [seg[seg.length - 2] || q]; }
        seg.push(q); segUp = up; segBack = bk;
      }
      flush();
      const Hn = hourAngle(H0), v = K.starVec(dec, Hn), q = proj(v), q2 = proj(K.starVec(dec, Hn + 6)), up = alt(v) >= -1e-6;
      arrowHead(q2.x, q2.y, Math.atan2(q2.y - q.y, q2.x - q.x), color, 8);
      ctx.globalAlpha = up ? 1 : lerp(.45, .25, s); star(q.x, q.y, 9, color); ctx.globalAlpha = 1;
      const pts = []; for (let h = 0; h < 360; h += 10) pts.push(proj(K.starVec(dec, h)));
      const right = pts.reduce((m, p) => p.x > m.x ? p : m); text(`${dec > 0 ? '+' : dec < 0 ? '−' : ''}${Math.abs(dec)}°`, right.x + 8, right.y + 4, color, 13, 'left', '600');
    }
    // 北極星
    { const v = K.starVec(89.3, hourAngle(0)), q = proj(v); star(q.x, q.y, 7, '#fff3b0'); text('北極星', q.x + 10, q.y - 6, '#fff3b0', 12, 'left'); }
    // 方位
    for (const [v, name] of [[ax.N, '北 N'], [ax.N.map(x => -x), '南 S'], [ax.E, '東 E'], [ax.E.map(x => -x), '西 W']]) { const q = proj(v.map(x => x * 1.13)); text(name, q.x, q.y + 4, '#bfe8bf', 13, 'center', '600'); }
    // 天頂與北極星仰角（①）
    const zen = proj(ax.U.map(x => x * 1.22)); poly([c, zen], '#ffffff', 1.3, [3, 4], .8); text('天頂', zen.x, zen.y - 8, '#ffffff', 12);
    if (Math.abs(S.lat) < 89.6) {
      const arc = []; const top = S.lat >= 0 ? [0, 0, 1] : [0, 0, -1], base = S.lat >= 0 ? ax.N : ax.N.map(x => -x);
      for (let k = 0; k <= 20; k++) { const m = [0, 1, 2].map(i => base[i] * (1 - k / 20) + top[i] * (k / 20)), l = Math.hypot(...m); arc.push(proj(m.map(x => x * .32 / l))); }
      poly(arc, '#ff9c6b', 2.2); const mid = arc[10]; text(S.lat >= 0 ? `北極星仰角 ${K.fmt(S.lat)}°` : `天南極仰角 ${K.fmt(-S.lat)}°`, mid.x - 8, mid.y - 6, '#ff9c6b', 12, 'right', '600');
    }
    // 觀察者（地球縮成中央一點）
    ctx.fillStyle = '#3d9be0'; ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, 7); ctx.fill(); text('觀察者', c.x, c.y + 20, '#9fd0f5', 12);
    text(s < 0.5 ? `① 天球：緯度 ${K.latName(S.lat)}（天球不變，地平面跟著緯度傾斜）` : `② ${K.latName(S.lat)} 的局部地平線`, 14, 24, '#d6e4f0', 14, 'left', '600');
  }

  // ---------- ③ 第一人稱／④ 星軌照片 ----------
  function fpCamera() {
    const az = look.az * RAD, al = look.alt * RAD, f = [Math.cos(al) * Math.sin(az), Math.cos(al) * Math.cos(az), Math.sin(al)], r = [Math.cos(az), -Math.sin(az), 0];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], F = (W / 2) / Math.tan(look.fov * RAD / 2);
    return l => { const z = K.dot(l, f); if (z < 0.05) return null; return { x: W / 2 + F * K.dot(l, r) / z, y: H / 2 - F * K.dot(l, u) / z }; };
  }
  const localVec = (dec, Hh, ax) => { const v = K.starVec(dec, Hh); return [K.dot(v, ax.E), K.dot(v, ax.N), K.dot(v, ax.U)]; };
  const altAz = (alt, az) => [Math.cos(alt * RAD) * Math.sin(az * RAD), Math.cos(alt * RAD) * Math.cos(az * RAD), Math.sin(alt * RAD)];
  function trail(Pr, dec, H1, H2, ax, color, width, fade) {
    const step = 1.5, n = Math.max(2, Math.ceil(Math.abs(H2 - H1) / step));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const h = H1 + (H2 - H1) * i / n, l = localVec(dec, h, ax), q = l[2] > 0 ? Pr(l) : null;
      if (q && prev) { ctx.globalAlpha = fade ? .15 + .85 * i / n : .9; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      prev = q;
    }
    ctx.globalAlpha = 1;
  }
  function ground(Pr, photo) {
    ctx.fillStyle = photo ? '#05070a' : '#1d3a26';
    for (let a = -90; a < 0; a += 10) for (let z = 0; z < 360; z += 10) {
      const q = [[a, z], [a, z + 10], [a + 10, z + 10], [a + 10, z]].map(([al, az]) => Pr(altAz(al, az)));
      if (q.some(p => !p)) continue; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
    }
    const hz = []; for (let z = 0; z <= 360; z += 2) { const p = Pr(altAz(0, z)); if (p) hz.push(p); else { poly(hz, photo ? '#2a3440' : '#8fd18f', 2); hz.length = 0; } } poly(hz, photo ? '#2a3440' : '#8fd18f', 2);
    if (!photo) for (const [z, name] of [[0, '北'], [45, '東北'], [90, '東'], [135, '東南'], [180, '南'], [225, '西南'], [270, '西'], [315, '西北']]) { const p = Pr(altAz(0, z)); if (p) { text(name, p.x, p.y + 22, '#bfe8bf', z % 90 ? 12 : 16, 'center', '600'); } }
  }
  function drawFirst(photo) {
    const ax = K.localAxes(latShown), Pr = fpCamera();
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, photo ? '#02040a' : '#06142a'); g.addColorStop(1, photo ? '#0b1530' : '#123459'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!photo) for (const al of [30, 60]) { const pts = []; for (let z = 0; z <= 360; z += 3) { const p = Pr(altAz(al, z)); if (p) pts.push(p); else { poly(pts, 'rgba(160,190,220,.25)', 1, [3, 5]); pts.length = 0; } } poly(pts, 'rgba(160,190,220,.25)', 1, [3, 5]); }
    const now = h0 => hourAngle(h0);
    if (photo) {
      const T = S.expo * expoAnim;
      for (const b of BG) trail(Pr, b.dec, now(b.H0) - 15 * T, now(b.H0), ax, `hsl(${200 + b.mag * 60},70%,${70 + b.mag * 20}%)`, .6 + b.mag * 1.2, false);
      trail(Pr, 89.3, now(0) - 15 * T, now(0), ax, '#fff7d0', 1.8, false);
      for (const [dec, H0] of K.HANDOUT_STARS) trail(Pr, dec, now(H0) - 15 * T, now(H0), ax, '#fff', 1.4, false);
    } else {
      for (const b of BG) { trail(Pr, b.dec, now(b.H0) - 30, now(b.H0), ax, '#cfe0ff', .6, true); const l = localVec(b.dec, now(b.H0), ax), q = l[2] > 0 && Pr(l); if (q) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, .7 + b.mag * 1.3, 0, 7); ctx.fill(); } }
      for (const [dec, H0] of K.HANDOUT_STARS) {
        const color = starColor(dec); trail(Pr, dec, now(H0) - 60, now(H0), ax, color, 2.4, true);
        const l = localVec(dec, now(H0), ax), q = l[2] > 0 && Pr(l); if (q) { star(q.x, q.y, 9, color); text(`${dec > 0 ? '+' : dec < 0 ? '−' : ''}${Math.abs(dec)}°`, q.x + 11, q.y - 8, color, 12, 'left', '600'); }
      }
      { const l = localVec(89.3, now(0), ax), q = l[2] > 0 && Pr(l); if (q) { star(q.x, q.y, 7, '#fff3b0'); text('北極星', q.x + 10, q.y - 6, '#fff3b0', 12, 'left'); } }
      for (const [dec, name] of [[90, '天北極'], [-90, '天南極']]) { const l = localVec(dec, 0, ax), q = l[2] > 0 && Pr(l); if (q) { poly([{ x: q.x - 7, y: q.y }, { x: q.x + 7, y: q.y }], '#ff9c6b', 2); poly([{ x: q.x, y: q.y - 7 }, { x: q.x, y: q.y + 7 }], '#ff9c6b', 2); text(name, q.x, q.y + 20, '#ff9c6b', 12); } }
      const zq = Pr([0, 0, 1]); if (zq) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(zq.x, zq.y, 6, 0, 7); ctx.stroke(); text('天頂', zq.x, zq.y - 10, '#fff', 12); }
    }
    ground(Pr, photo);
    const dir = look.alt > 80 ? '天頂' : ['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(((look.az % 360) + 360) % 360 / 45) % 8];
    text(photo ? `📷 朝${dir}拍攝，曝光 ${K.fmt(S.expo * expoAnim)} 小時（${K.latName(S.lat)}）` : `③ 站在${K.latName(S.lat)}，面向${dir}（仰角 ${Math.round(look.alt)}°）`, 14, 24, '#fff', 14, 'left', '600');
  }

  function draw() {
    if (canvas.width !== W * 2) { canvas.width = W * 2; canvas.height = H * 2; }
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    if (S.view === 'prep') drawPrep(); else if (S.view === 'first') drawFirst(false); else if (S.view === 'photo') drawFirst(true); else drawOrbit();
  }

  // ---------- 讀值、圖例、講義填空 ----------
  function readings() {
    const v = K.visibleRange(S.lat), sg = x => (x > 0 ? '+' : x < 0 ? '−' : '') + K.fmt(Math.abs(x));
    const rows = [['所在緯度', K.latName(S.lat)], ['北極星仰角', S.lat >= 0 ? `${K.fmt(S.lat)}°` : '看不到'], ['星軌與地面夾角', `${K.fmt(K.trailAngle(S.lat))}°`], ['一天內可見的赤緯', `${sg(v.lo)}° ～ ${sg(v.hi)}°`], ['時間', `${K.fmt(((t % 24) + 24) % 24)} 小時`]];
    $('readings').innerHTML = rows.map(([k, val]) => `<div class="reading"><span class="muted">${k}</span><strong>${val}</strong></div>`).join('');
    const counts = {}; K.HANDOUT_STARS.forEach(([d]) => { const c = K.classify(d, S.lat); counts[c] = (counts[c] || []).concat(`${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}°`); });
    $('legend').innerHTML = S.color ? Object.entries(counts).map(([c, ds]) => `<span><i style="background:${COLOR[c]}"></i>${CLASS_NAME[c]}：${ds.join('、')}</span>`).join('') + (K.HANDOUT_STARS.some(([d]) => K.onBoundary(d, S.lat)) ? '<span>★ 剛好在界線上的星：下中天時擦過地平線</span>' : '') : '<span>星軌分色已關閉</span>';
  }
  function worksheet() {
    const rows = K.worksheet(S.lat); $('ws-title').textContent = `鳩特講解：${K.latName(S.lat)}的星空`;
    $('worksheet').innerHTML = `<div class="ws-grid">${rows.map(([k, v], i) => `<div class="k">(${i + 1}) ${k}</div>${reveal.includes(i) ? `<div class="ws-cell">${v}</div>` : `<div class="ws-cell hidden-cell" data-ws="${i}" tabindex="0" role="button" aria-label="揭曉 ${k}">？（點一下揭曉）</div>`}`).join('')}</div>`;
    $('worksheet').querySelectorAll('[data-ws]').forEach(el => { const go = () => { reveal.push(+el.dataset.ws); worksheet(); }; el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }; });
    $('ws-next').disabled = reveal.length >= rows.length;
  }
  function revealNext() { const n = K.worksheet(S.lat).length; for (let i = 0; i < n; i++) if (!reveal.includes(i)) { reveal.push(i); break; } worksheet(); }

  // ---------- 動畫迴圈 ----------
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (playing && S.view !== 'prep' && S.view !== 'photo') { t += dt * speed; if (Math.floor(t * 4) !== Math.floor((t - dt * speed) * 4)) readings(); }
    if (latT < 1) { latT = Math.min(1, latT + dt / .8); latShown = lerp(latFrom, S.lat, ease(latT)); }
    if (sT < 1) { sT = Math.min(1, sT + dt / 2.2); s = lerp(sFrom, sTo, ease(sT)); if (orbitFrom && sTo === 0) { const k = ease(sT); orbit = { az: lerp(orbitFrom.az, 0, k), el: lerp(orbitFrom.el, 0, k), zoom: lerp(orbitFrom.zoom, 1, k) }; } if (sT >= 1) orbitFrom = null; }
    if (expoAnim < 1) expoAnim = Math.min(1, expoAnim + dt / 2.5);
    draw();
    if ((playing && S.view !== 'prep' && S.view !== 'photo') || latT < 1 || sT < 1 || expoAnim < 1) requestAnimationFrame(tick); else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } else draw(); }
  function setPlaying(v) { playing = v; $('play').textContent = playing ? '暫停' : '播放'; kick(); }

  // ---------- 操作 ----------
  function setLat(lat, animate = true) {
    lat = Math.max(-90, Math.min(90, Math.round(lat * 2) / 2));
    if (lat !== S.lat) reveal = [];
    latFrom = animate ? latShown : lat; S.lat = lat; latT = animate ? 0 : 1; if (!animate) latShown = lat;
    $('lat').value = lat; $('lat-out').textContent = K.latName(lat);
    document.querySelectorAll('[data-lat]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lat === lat)));
    $('enter-dome').textContent = `▶ 旋轉、放大進入「${K.latName(lat)}」的地平線`;
    $('exit-dome').textContent = '◀ 縮小、旋轉回到天球';
    readings(); worksheet(); syncURL(); kick();
  }
  const CAPTION = {
    prep: ['預備知識：北極星仰角＝緯度', '拖動緯度，看地平面、天頂與北極星方向怎麼變。北極星非常遠，從地球各處看它的光線都與地軸平行。'],
    sphere: ['① 天球：緯度會變，但天球不變', '天軸固定直立，五顆星沿各自的赤緯圈由東向西轉；改變緯度時，傾斜的是綠色地平面。拖曳可旋轉、滾輪可縮放。'],
    dome: ['② 局部地平線：從地平線外看星軌', '把當地地平面轉成水平並放大，就是講義第 3 頁的半球圖。實線在地平面上方、虛線在下方。'],
    first: ['③ 第一人稱：站在中央看星軌', '你站在觀察者的位置抬頭看天。拖曳轉頭、滾輪縮放；星星後面拖著過去 4 小時的軌跡。'],
    photo: ['④ 星軌照片：相機長時間曝光', '選一個方向按「開始曝光」，看看相機拍到的星軌是同心圓、斜線還是弧線。']
  };
  function setView(v, animate = true) {
    const prev = S.view; S.view = v;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    const target = v === 'dome' ? 1 : v === 'sphere' ? 0 : s;
    if (v === 'dome' || v === 'sphere') { sFrom = s; sTo = target; sT = animate && (prev === 'sphere' || prev === 'dome') ? 0 : 1; if (sT === 1) s = target; }
    if (v === 'photo') { playing = false; $('play').textContent = '播放'; if (look.alt < 5) look.alt = 20; }
    $('scene-title').textContent = CAPTION[v][0]; $('scene-caption').textContent = CAPTION[v][1];
    $('look-tools').hidden = !(v === 'first' || v === 'photo'); $('photo-tools').hidden = v !== 'photo'; $('orbit-tools').hidden = !(v === 'sphere' || v === 'dome');
    syncURL(); kick();
  }
  function setLook(k) { if (k === 'zenith') look = { ...look, az: 0, alt: 90 }; else look = { ...look, az: +k, alt: +k === 0 ? Math.max(15, Math.min(70, Math.abs(S.lat) || 20)) : 25 }; if (S.view === 'photo') expoAnim = 1; kick(); }
  function syncURL() { const q = new URLSearchParams({ lat: S.lat, view: S.view }); if (modeName !== 'free') q.set('mode', modeName); try { history.replaceState(null, '', '?' + q); } catch (_) { /* 靜態檢視 */ } }

  $('lat-buttons').innerHTML = K.LATS.map(([v, n]) => `<button type="button" data-lat="${v}" aria-pressed="false">${n}</button>`).join('');
  document.querySelectorAll('[data-lat]').forEach(b => b.onclick = () => setLat(+b.dataset.lat));
  $('lat').addEventListener('input', e => setLat(+e.target.value, false));
  $('enter-dome').onclick = () => { if (S.view !== 'sphere') { setView('sphere', false); } setView('dome'); };
  // 反向：從局部地平線縮小、轉回最初的天球視角（與進入時對稱的縮放感）
  function exitDome() { if (S.view !== 'dome') setView('dome', false); orbitFrom = { ...orbit }; setView('sphere'); }
  $('exit-dome').onclick = exitDome;
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  $('play').onclick = () => setPlaying(!playing); $('reset-time').onclick = () => { t = 0; readings(); kick(); }; $('speed').onchange = e => { speed = +e.target.value; };
  const toggle = (id, key) => { $(id).onclick = () => { S[key] = !S[key]; $(id).setAttribute('aria-pressed', String(S[key])); readings(); kick(); }; };
  toggle('t-color', 'color'); toggle('t-bound', 'bound'); toggle('t-bg', 'bg');
  document.querySelectorAll('[data-look]').forEach(b => b.onclick = () => setLook(b.dataset.look));
  document.querySelectorAll('[data-orbit]').forEach(b => b.onclick = () => { orbit = b.dataset.orbit === 'top' ? { az: 0, el: 60, zoom: 1 } : { az: 0, el: 0, zoom: 1 }; kick(); });
  $('expo').oninput = e => { S.expo = +e.target.value; $('expo-out').textContent = `${S.expo} 小時`; expoAnim = 1; kick(); };
  $('shoot').onclick = () => { expoAnim = 0; kick(); };
  $('ws-next').onclick = revealNext; $('ws-all').onclick = () => { reveal = K.worksheet(S.lat).map((_, i) => i); worksheet(); }; $('ws-none').onclick = () => { reveal = []; worksheet(); };

  // 拖曳：①② 旋轉天球、③④ 轉頭；滾輪／雙指縮放
  const pointers = new Map(); let pinch = 0; const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => { if (S.view === 'prep') return; canvas.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) pinch = spread(); });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const d = spread(); if (pinch) zoomBy(d / pinch); pinch = d; return; }
    if (S.view === 'first' || S.view === 'photo') { look.az = (look.az - dx * .25 + 360) % 360; look.alt = Math.max(-10, Math.min(90, look.alt + dy * .25)); }
    else { orbit.az -= dx * .35; orbit.el = Math.max(-30, Math.min(70, orbit.el + dy * .3)); }
    kick();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => canvas.addEventListener(n, e => { pointers.delete(e.pointerId); pinch = 0; }));
  function zoomBy(k) { if (S.view === 'first' || S.view === 'photo') look.fov = Math.max(35, Math.min(120, look.fov / k)); else if (S.view !== 'prep') orbit.zoom = Math.max(.6, Math.min(2.2, orbit.zoom * k)); kick(); }
  canvas.addEventListener('wheel', e => { if (S.view === 'prep') return; e.preventDefault(); zoomBy(Math.exp(-e.deltaY * .001)); }, { passive: false });

  // ---------- 自修任務 ----------
  const opt = (question, options, answer, hint) => ({ question, options, answer, hint });
  const lessons = [
    { id: 'pole-altitude', title: '北極星的仰角', prediction: { question: '住在北緯 30° 的人看北極星，仰角是多少？', options: ['30°', '60°', '90°'] },
      task: '按「準備」後，切到「預備知識」，把緯度設成北緯 30°，看北極星方向與地平面的夾角。',
      prepare() { setLat(0, false); setView('prep', false); },
      check() { if (S.view !== 'prep') return { ok: false, message: '請切到「預備知識」。' }; if (S.lat !== 30) return { ok: false, message: '請把緯度設成北緯 30°。' }; return { ok: true, evidence: '北緯 30°：地平面與北極星方向的夾角（北極星仰角）為 30°，和緯度相同' }; },
      observation: opt('北極星仰角和緯度的關係？', ['相等', '互餘（加起來 90°）', '沒有關係'], 0, '比較橘色角度與黃色角度。'),
      reason: opt('為什麼？', ['北極星很遠，光線與地軸平行；地平面與地軸的夾角正好等於緯度', '北極星會跟著觀察者移動', '因為地球是平的'], 0, '平行線被地平面所截，同位角相等。'),
      conclusion: '北半球看北極星的仰角＝當地緯度；南半球看不到北極星。' },
    { id: 'equator-trail', title: '赤道的星軌', prediction: { question: '在赤道看星星東升西落，星軌和地面？', options: ['垂直', '平行', '斜交 45°'] },
      task: '按「準備」後，把緯度設成「赤道」，再按「旋轉、放大進入地平線」，看星軌和綠色地平面的關係。',
      prepare() { setLat(30, false); setView('sphere', false); },
      check() { if (S.lat !== 0) return { ok: false, message: '請把緯度設成「赤道」。' }; if (S.view !== 'dome' || sT < 1) return { ok: false, message: '請按「旋轉、放大進入地平線」，等動畫完成。' }; return { ok: true, evidence: '赤道：天北極與天南極都在地平面上，五顆星的星軌都垂直地面升起、落下' }; },
      observation: opt('赤道上的星軌和地面？', ['垂直（夾角 90°）', '平行（夾角 0°）', '斜交 45°'], 0, '看星軌與綠色圓盤的夾角。'),
      reason: opt('為什麼？', ['天軸躺在地平面上，星星繞著水平的天軸轉', '赤道的天空比較高', '星星在赤道轉得比較快'], 0, '天北極的仰角是多少？'),
      conclusion: '星軌與地面的夾角＝90° −｜緯度｜。赤道 90°（垂直），兩極 0°（平行）。' },
    { id: 'south-circumpolar', title: '南緯 60° 的拱極星', prediction: { question: '在南緯 60°，哪些星整晚都不會落下？', options: ['與天南極張角 60° 以內的星', '與天南極張角 30° 以內的星', '沒有這種星'] },
      task: '按「準備」後，把緯度設成南緯 60°，打開「星軌分色」與「拱極星界線」，看黃色（拱極星）的範圍。',
      prepare() { setLat(30, false); setView('sphere', false); S.color = false; S.bound = false; $('t-color').setAttribute('aria-pressed', 'false'); $('t-bound').setAttribute('aria-pressed', 'false'); readings(); kick(); },
      check() { if (S.lat !== -60) return { ok: false, message: '請把緯度設成南緯 60°。' }; if (!S.color || !S.bound) return { ok: false, message: '請打開「星軌分色」與「拱極星界線」。' }; return { ok: true, evidence: '南緯 60°：拱極星界線在赤緯 −30°，與天南極張角 60°；赤緯 −70° 的星永不落下、−30° 的星剛好擦過地平線' }; },
      observation: opt('南緯 60° 的拱極星範圍？', ['與天南極張角 60° 以內', '與天南極張角 30° 以內', '整個天空都是'], 0, '看黃色虛線「拱極星界線」。'),
      reason: opt('為什麼張角是 60°？', ['天南極仰角 60°，張角小於仰角的星，轉到最低點時仍在地平面上', '因為南半球看得到北極星', '張角永遠是 30°'], 0, '星星繞天南極轉，最低時距地平面多高？'),
      conclusion: '拱極星與（看得到的那個）天極的張角＜｜緯度｜。南半球的星繞天南極順時針轉。' }
  ];
  const quiz = [
    { id: 'q1', question: '水手在船上看北極星的仰角為 35°，船約在哪裡？（110 學測）', options: ['北緯 35°', '北緯 55°', '南緯 35°'], answer: 0, hint: '北極星仰角＝緯度。', explain: '北極星仰角等於所在緯度，所以是北緯 35°。' },
    { id: 'q2', question: '在台北（北緯 25°）看東方升起的星，星軌與地面的夾角約為？', options: ['65°', '25°', '90°'], answer: 0, hint: '90° −｜緯度｜。', explain: '星軌與地面夾角＝90° − 25°＝65°。' },
    { id: 'q3', question: '在南半球朝天南極拍攝星軌照片，星星繞天南極的方向是？', options: ['順時針', '逆時針', '不會繞圈'], answer: 0, hint: '北半球看北方是逆時針。', explain: '南半球面向天南極，星星繞天南極順時針轉。' }
  ];
  const tasks = ['北緯 30° 和南緯 30°，哪一顆星的命運（拱極、出沒、看不到）會互換？', '在 ④ 星軌照片朝北、朝東、朝南各拍一張，三張照片有什麼不同？', '緯度越高，拱極星越多還是越少？'];
  $('tasks').innerHTML = tasks.map(x => `<p>• ${x}</p>`).join('');
  guide = L.guidedStudy($('study-panel'), lessons, 'jutor.startrails.guide.v1', quiz, 'jutor.startrails.quiz.v1', () => modeName === 'study');

  // ---------- 模式與快速鍵 ----------
  function setMode(name) {
    // 進入自修模式：畫面全部回到初始狀態並停止
    if (name === 'study') { Object.assign(S, DEFAULTS); ['t-color', 't-bound', 't-bg'].forEach((id, i) => $(id).setAttribute('aria-pressed', String([S.color, S.bound, S.bg][i]))); t = 0; orbit = { az: 0, el: 0, zoom: 1 }; look = { az: 0, alt: 35, fov: 90 }; expoAnim = 1; setPlaying(false); setLat(DEFAULTS.lat, false); setView('sphere', false); s = 0; sT = 1; orbitFrom = null; }
    modeName = name; document.body.dataset.study = String(name === 'study'); document.body.classList.toggle('projection', name === 'projection');
    $('study-panel').hidden = name !== 'study'; $('free-panel').hidden = name !== 'free'; $('worksheet-panel').hidden = name === 'study';
    $('proj-hint').hidden = name !== 'projection'; $('fullscreen').hidden = name !== 'projection';
    [['free-mode', 'free'], ['study-mode', 'study'], ['proj-mode', 'projection']].forEach(([id, n]) => $(id).setAttribute('aria-pressed', String(name === n)));
    if (name !== 'projection' && document.fullscreenElement) document.exitFullscreen?.();
    syncURL(); kick();
  }
  $('free-mode').onclick = () => setMode('free'); $('study-mode').onclick = () => setMode('study'); $('proj-mode').onclick = () => setMode('projection');
  $('fullscreen').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
  const VIEWS = ['prep', 'sphere', 'dome', 'first', 'photo'];
  document.addEventListener('keydown', e => {
    if (modeName !== 'projection' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName; if (e.key === 'Escape') { setMode('free'); return; } if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (/^[1-5]$/.test(e.key)) setView(VIEWS[+e.key - 1]);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const list = K.LATS.map(x => x[0]), i = list.indexOf(S.lat), n = i < 0 ? 0 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length; setLat(list[n]); }
    else if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); revealNext(); }
    else if (e.key.toLowerCase() === 'r') { t = 0; readings(); kick(); }
    else if (e.key.toLowerCase() === 'b') exitDome();
  });

  // 以 ?lat=-60&view=dome&mode=projection 直接開啟
  const q = new URLSearchParams(location.search), qLat = parseFloat(q.get('lat')), qView = VIEWS.includes(q.get('view')) ? q.get('view') : 'sphere';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing = false;
  setLat(Number.isFinite(qLat) ? qLat : DEFAULTS.lat, false); setView(qView, false);
  setMode(['study', 'projection'].includes(q.get('mode')) ? q.get('mode') : 'free'); setPlaying(playing);
})();
