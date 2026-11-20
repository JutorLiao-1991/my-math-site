(() => {
  'use strict';
  const K = MoonCore, L = ScienceLab, $ = id => document.getElementById(id);
  const canvas = $('sky'), main = canvas.getContext('2d'), W = 800, H = 500, RAD = Math.PI / 180, LAT = K.LAT;
  let ctx = main;
  const fpCanvas = document.createElement('canvas'); fpCanvas.width = W * 2; fpCanvas.height = H * 2; const fctx = fpCanvas.getContext('2d');
  const TW_LON = 121, ORBIT = 4.2, MOON_R = 0.34, SUN_POS = [12.4, 0, 0], SUN_R = 2.4, T0 = [1.2, 0, 0], F_SPACE = 540;
  const DEFAULTS = { ring: true, look: true, path: true };
  const S = { ...DEFAULTS, e: 90, t: 12, view: 'space', way: 'four' };
  let picked = { moon: false, time: false };

  // ---------- 小工具 ----------
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = K.dot, cross = K.cross, unit = K.unit;
  const mixC = (a, b, k) => a.map((x, i) => Math.round(lerp(x, b[i], k)));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const mod = K.mod;

  // ---------- 狀態 ----------
  let tShown = 12, tFrom = 12, tTo = 12, tA = 1;      // 地球上的時間（動畫中）
  let eShown = 90, eFrom = 90, eTo = 90, eA = 1;      // 月亮位置（動畫中）
  let k = 0, kFrom = 0, kTo = 0, kA = 1, kDur = 3.6;   // 0＝北極上空，1＝第一人稱
  let orbit = { az: 0, el: 90, zoom: 1 }, orbitStart = { ...orbit };
  let look = { az: 180, alt: 30, fov: 112 };
  let playing = false, speed = 1, last = 0, running = false, modeName = 'free', reveal = new Set(), hits = [];

  // ---------- 貼圖 ----------
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 720; c.height = 360; const t = c.getContext('2d', { willReadFrequently: true });
    t.fillStyle = '#245f86'; t.fillRect(0, 0, 720, 360); t.fillStyle = '#6f9f67';
    for (const ring of window.TimezoneLand || []) { t.beginPath(); let ox = null; ring.forEach(([lo, la], i) => { const x = (lo + 180) * 2, y = (90 - la) * 2; if (i === 0 || (ox !== null && Math.abs(x - ox) > 360)) t.moveTo(x, y); else t.lineTo(x, y); ox = x; }); t.closePath(); t.fill(); }
    t.fillStyle = '#e8eef2'; t.fillRect(0, 0, 720, 14); t.fillRect(0, 336, 720, 24);
    return t.getImageData(0, 0, 720, 360).data;
  })();
  // 月海（以月面座標 a＝東西、b＝南北，−1～1）
  const MARIA = [[-.45, .3, .32, .25], [.12, .42, .17, .15], [.3, .18, .2, .16], [.66, .32, .1, .09], [.52, -.08, .13, .14], [-.2, -.38, .17, .12], [-.7, -.05, .2, .34], [.05, -.12, .1, .1]];
  const mariaDark = (a, b) => { let d = 0; for (const [x, y, rx, ry] of MARIA) { const q = ((a - x) / rx) ** 2 + ((b - y) / ry) ** 2; if (q < 1) d = Math.max(d, 1 - q * q); } return d; };
  // 固定亂數
  const rand = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11);
  const SPACE_STARS = Array.from({ length: 260 }, () => { const z = 2 * rand() - 1, a = rand() * 6.283, r = Math.sqrt(1 - z * z); return { v: [r * Math.cos(a), r * Math.sin(a), z], m: rand() }; });
  const SKY_STARS = Array.from({ length: 240 }, () => ({ dec: Math.asin(2 * rand() - 1) / RAD, H0: rand() * 360, m: rand() }));

  // ---------- 相機 ----------
  function makeCam(pos, f, u, F) { f = unit(f); const r = unit(cross(f, u)); u = cross(r, f); return { pos, f, r, u, F }; }
  function project(cam, p) { const d = sub(p, cam.pos), z = dot(d, cam.f); if (z < 1e-3) return null; return { x: W / 2 + cam.F * dot(d, cam.r) / z, y: H / 2 - cam.F * dot(d, cam.u) / z, z }; }
  function spaceCam(o) {
    const az = o.az * RAD, el = o.el * RAD, dist = 15 / o.zoom, back = [Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), Math.sin(el)];
    const r = [Math.cos(az), Math.sin(az), 0], f = mul(back, -1);
    return makeCam(add(T0, mul(back, dist)), f, cross(r, f), F_SPACE);
  }
  // 觀測者（台灣）在太空座標中的位置與東、北、天頂方向
  function frame(tt) {
    const th = K.observerAngle(tt) * RAD, c = Math.cos(LAT * RAD), s = Math.sin(LAT * RAD);
    const U = [c * Math.cos(th), c * Math.sin(th), s];
    return { th, U, O: U, E: [-Math.sin(th), Math.cos(th), 0], N: [-s * Math.cos(th), -s * Math.sin(th), c] };
  }
  const toWorld = (v, fr) => [0, 1, 2].map(i => v[0] * fr.E[i] + v[1] * fr.N[i] + v[2] * fr.U[i]);
  const lookVec = lk => { const a = lk.az * RAD, b = lk.alt * RAD; return [Math.cos(b) * Math.sin(a), Math.cos(b) * Math.cos(a), Math.sin(b)]; };
  const fpF = () => (W / 2) / Math.tan(look.fov * RAD / 2);
  // 四元數：在兩個相機姿態間平滑轉動
  function quat(c) {
    const m = [[c.r[0], c.u[0], -c.f[0]], [c.r[1], c.u[1], -c.f[1]], [c.r[2], c.u[2], -c.f[2]]], tr = m[0][0] + m[1][1] + m[2][2];
    let q;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]; }
    else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; q = [(m[2][1] - m[1][2]) / s, .25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s]; }
    else if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, .25 * s, (m[1][2] + m[2][1]) / s]; }
    else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, .25 * s]; }
    return q;
  }
  function slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; }
    if (d > .9995) { const q = a.map((x, i) => lerp(x, b[i], t)), l = Math.hypot(...q); return q.map(x => x / l); }
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s; return a.map((x, i) => x * wa + b[i] * wb);
  }
  function quatBasis(q) {
    const [w, x, y, z] = q;
    const r = [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], u = [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)], b = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];
    return { r, u, f: mul(b, -1) };
  }
  function slerpV(a, b, t) { const d = clamp(dot(a, b), -1, 1), th = Math.acos(d); if (th < 1e-4) return b; const s = Math.sin(th); return add(mul(a, Math.sin((1 - t) * th) / s), mul(b, Math.sin(t * th) / s)); }
  // 進入地球的鏡頭路徑：先飛到台灣上空俯看，再降落並抬頭
  const K1 = 0.55, HOVER = 2.4;
  function transCam(kk) {
    const c0 = spaceCam(orbitStart), fr = frame(tShown), h = toWorld([Math.sin(look.az * RAD), Math.cos(look.az * RAD), 0], fr);
    const hover = makeCam(mul(fr.U, HOVER), mul(fr.U, -1), h, 0), ground = makeCam(mul(fr.U, 1.0012), toWorld(lookVec(look), fr), fr.U, 0);
    const F = Math.exp(lerp(Math.log(c0.F), Math.log(fpF()), ease(kk)));
    if (kk <= K1) {
      const a = ease(kk / K1), d0 = Math.hypot(...c0.pos), pos = mul(slerpV(unit(c0.pos), fr.U, a), Math.exp(lerp(Math.log(d0), Math.log(HOVER), a)));
      const target = add(mul(T0, 1 - a), mul(fr.O, a)), up = quatBasis(slerp(quat(c0), quat(hover), a)).u;
      return makeCam(pos, sub(target, pos), up, F);
    }
    const b = ease((kk - K1) / (1 - K1)), pose = quatBasis(slerp(quat(hover), quat(ground), b));
    return makeCam(mul(fr.U, 1.0012 + (HOVER - 1.0012) * Math.pow(1 - b, 2.2)), pose.f, pose.u, F);
  }

  // ---------- 繪圖小工具 ----------
  let fs = 1;   // 小螢幕（手機）時放大畫布上的字
  const font = (size, w = '') => `${w} ${Math.round(size * fs * 10) / 10}px system-ui,'Microsoft JhengHei',sans-serif`;
  function text(str, x, y, color = '#d6e4f0', size = 13, align = 'center', weight = '', halo = true) {
    ctx.font = font(size, weight); ctx.textAlign = align;
    if (halo) { ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(4,10,20,.75)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function poly(pts, color, width = 2, dash = [], alpha = 1) { if (pts.length < 2) return; ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  function arrowHead(x, y, ang, color, size = 9) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + size * Math.cos(ang), y + size * Math.sin(ang)); ctx.lineTo(x + size * Math.cos(ang + 2.5), y + size * Math.sin(ang + 2.5)); ctx.lineTo(x + size * Math.cos(ang - 2.5), y + size * Math.sin(ang - 2.5)); ctx.closePath(); ctx.fill(); }
  function circle(x, y, r, fill, stroke, width = 1.5, dash = []) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.setLineDash(dash); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); ctx.setLineDash([]); } }
  // 畫一個月相：ang＝亮面（太陽）在畫面上的方向，psi＝日月角距，north＝月面北方在畫面上的方向
  function moonDisk(x, y, R, ang, psi, opt = {}) {
    const ca = Math.cos(ang), sa = Math.sin(ang), P = (a, b) => [x + a * ca - b * sa, y + a * sa + b * ca], cp = Math.cos(psi * RAD);
    ctx.save(); ctx.globalAlpha = opt.alpha ?? 1;
    circle(x, y, R, opt.dark || '#262c36');
    const pts = []; for (let i = 0; i <= 36; i++) { const th = (-90 + i * 5) * RAD; pts.push(P(R * Math.cos(th), R * Math.sin(th))); }
    for (let i = 0; i <= 36; i++) { const th = (90 - i * 5) * RAD; pts.push(P(R * cp * Math.cos(th), R * Math.sin(th))); }
    ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
    const g = ctx.createRadialGradient(x - R * .3, y - R * .3, R * .1, x, y, R); g.addColorStop(0, '#fffdf3'); g.addColorStop(1, '#ddd8c6'); ctx.fillStyle = g; ctx.fill();
    if (R >= 12 && opt.maria !== false) {
      ctx.clip(); const n = opt.north ?? -Math.PI / 2, cn = Math.cos(n), sn = Math.sin(n);
      ctx.fillStyle = 'rgba(120,118,108,.38)';
      for (const [a, b, rx, ry] of MARIA) { const px = x + R * (-a * sn + b * cn), py = y + R * (a * cn + b * sn); ctx.beginPath(); ctx.ellipse(px, py, rx * R, ry * R, n + Math.PI / 2, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    ctx.globalAlpha = (opt.alpha ?? 1) * .6; circle(x, y, R, null, 'rgba(230,230,220,.5)', 1); ctx.globalAlpha = 1;
  }

  // ---------- 光線追蹤：地球與月球 ----------
  const rbuf = document.createElement('canvas'), rctx = rbuf.getContext('2d');
  function sphereRaster(cam, C, Rr, shade) {
    const rel = sub(C, cam.pos), dist = Math.hypot(...rel), zc = dot(rel, cam.f);
    let bx = 0, by = 0, bw = W, bh = H;
    if (dist > 3 * Rr && zc > 1.5 * Rr) {
      const p = project(cam, C), rs = cam.F * Rr / Math.sqrt(Math.max(1e-6, zc * zc - Rr * Rr)) * 1.25 + 3;
      bx = Math.max(0, Math.floor(p.x - rs)); by = Math.max(0, Math.floor(p.y - rs)); bw = Math.min(W, Math.ceil(p.x + rs)) - bx; bh = Math.min(H, Math.ceil(p.y + rs)) - by;
    } else if (zc < -Rr) return;
    if (bw <= 0 || bh <= 0) return;
    const sc = clamp(Math.sqrt(240000 / (bw * bh)), .6, 2), pw = Math.max(1, Math.round(bw * sc)), ph = Math.max(1, Math.round(bh * sc));
    if (rbuf.width < pw) rbuf.width = pw; if (rbuf.height < ph) rbuf.height = ph;
    const img = rctx.createImageData(pw, ph), px = img.data, oc = sub(cam.pos, C), cc = dot(oc, oc) - Rr * Rr;
    for (let j = 0; j < ph; j++) {
      const sy = (H / 2 - (by + (j + .5) / sc)) / cam.F;
      for (let i = 0; i < pw; i++) {
        const sx = (bx + (i + .5) / sc - W / 2) / cam.F;
        const d = [cam.f[0] + sx * cam.r[0] + sy * cam.u[0], cam.f[1] + sx * cam.r[1] + sy * cam.u[1], cam.f[2] + sx * cam.r[2] + sy * cam.u[2]], dl = Math.hypot(d[0], d[1], d[2]);
        d[0] /= dl; d[1] /= dl; d[2] /= dl;
        const b = d[0] * oc[0] + d[1] * oc[1] + d[2] * oc[2], disc = b * b - cc; if (disc < 0) continue;
        const t = -b - Math.sqrt(disc); if (t < 0) continue;
        const n = [(oc[0] + t * d[0]) / Rr, (oc[1] + t * d[1]) / Rr, (oc[2] + t * d[2]) / Rr], c = shade(n, d), o = (j * pw + i) * 4;
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    }
    rctx.clearRect(0, 0, rbuf.width, rbuf.height); rctx.putImageData(img, 0, 0); ctx.drawImage(rbuf, 0, 0, pw, ph, bx, by, bw, bh);
  }
  function earthShade(th) {
    return (n, d) => {
      let lon = Math.atan2(n[1], n[0]) - th + TW_LON * RAD; lon = mod(lon / RAD + 180, 360); const lat = Math.asin(clamp(n[2], -1, 1)) / RAD;
      const ti = (Math.min(359, Math.floor((90 - lat) * 2)) * 720 + Math.min(719, Math.floor(lon * 2))) * 4;
      const day = smooth(-.07, .1, n[0]), br = lerp(.2, .62 + .38 * Math.sqrt(Math.max(0, n[0])), day), rim = Math.pow(1 + Math.min(0, dot(n, d)), 3) * 70;
      return [tex[ti] * br + rim * .3, tex[ti + 1] * br + rim * .6, tex[ti + 2] * br + 18 * (1 - day) + rim];
    };
  }
  function moonShade(M) {
    const x = unit(mul(M, -1)), z = [0, 0, 1], y = cross(z, x);   // x：朝向地球的月面中心
    return n => {
      const day = smooth(-.03, .03, n[0]), br = lerp(.12, .38 + .62 * Math.sqrt(Math.max(0, n[0])), day), md = dot(n, x) > 0 ? mariaDark(-dot(n, y), dot(n, z)) * .3 : 0, g = 212 * (1 - md) * br;
      return [g, g * .98, g * .92];
    };
  }
  function occluded(cam, p) {
    const d = sub(p, cam.pos), a = dot(d, d), b = 2 * dot(cam.pos, d), c = dot(cam.pos, cam.pos) - 1, disc = b * b - 4 * a * c; if (disc < 0) return false;
    const s = (-b - Math.sqrt(disc)) / (2 * a); return s > 1e-4 && s < .999;
  }
  // 3D 多邊形（裁掉鏡頭後方的部分）
  function poly3(cam, pts, fill, stroke, width = 1.5) {
    const z = p => dot(sub(p, cam.pos), cam.f), near = .004, out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], za = z(a), zb = z(b);
      if (za >= near) out.push(a);
      if ((za >= near) !== (zb >= near)) { const t = (near - za) / (zb - za); out.push(add(a, mul(sub(b, a), t))); }
    }
    const q = out.map(p => project(cam, p)).filter(Boolean); if (q.length < 3) return;
    ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  // 3D 折線：被地球擋住或在鏡頭後方的部分斷開
  function line3(cam, pts, color, width = 1.5, dash = [], alpha = 1) {
    let seg = [];
    const flush = () => { poly(seg, color, width, dash, alpha); seg = []; };
    for (const p of pts) { const q = project(cam, p); if (!q || occluded(cam, p) || Math.abs(q.x) > 4 * W) { flush(); continue; } seg.push(q); }
    flush();
  }

  // ---------- 太空視角（北極上空） ----------
  function drawSpace(cam, fade = 0) {
    const oa = 1 - smooth(0, .35, fade), fr = frame(tShown), M = [ORBIT * Math.cos(eShown * RAD), ORBIT * Math.sin(eShown * RAD), 0];
    hits = [];
    const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 560); bg.addColorStop(0, '#0d2036'); bg.addColorStop(1, '#040a14'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (const s of SPACE_STARS) { const q = project(cam, add(cam.pos, mul(s.v, 500))); if (!q) continue; ctx.globalAlpha = .35 + .5 * s.m; ctx.fillStyle = '#dbe8ff'; ctx.fillRect(q.x, q.y, .6 + s.m * 1.2, .6 + s.m * 1.2); }
    ctx.globalAlpha = 1;
    // 太陽與陽光
    const sp = project(cam, SUN_POS);
    if (sp && !occluded(cam, SUN_POS)) {
      const rs = cam.F * SUN_R / sp.z, g = ctx.createRadialGradient(sp.x, sp.y, rs * .2, sp.x, sp.y, rs * 1.9);
      g.addColorStop(0, 'rgba(255,214,120,.55)'); g.addColorStop(.5, 'rgba(255,170,60,.18)'); g.addColorStop(1, 'rgba(255,150,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp.x, sp.y, rs * 1.9, 0, 7); ctx.fill();
      const g2 = ctx.createRadialGradient(sp.x - rs * .3, sp.y - rs * .3, rs * .1, sp.x, sp.y, rs); g2.addColorStop(0, '#ffd77a'); g2.addColorStop(1, '#f08a2c'); circle(sp.x, sp.y, rs, g2);
      if (oa > .05) text('太陽', Math.min(sp.x, W - 30), sp.y + 5, '#fff2c8', 15, 'center', '700');
    }
    ctx.globalAlpha = oa;
    for (let yy = -4.5; yy <= 4.51; yy += 1.5) {
      const a = project(cam, [9.6, yy, 0]), b = project(cam, [7.9, yy, 0]);
      if (a && b) { poly([a, b], '#ffe08a', 1.6, [], .8 * oa); arrowHead(b.x, b.y, Math.atan2(b.y - a.y, b.x - a.x), '#ffe08a', 7); }
    }
    { const q = project(cam, [8.7, 5.25, 0]); if (q && oa > .05) text('陽光（平行光）', q.x, q.y, '#ffe08a', 13, 'center', '600'); }
    ctx.globalAlpha = 1;
    // 公轉軌道
    const ring = []; for (let a = 0; a <= 360; a += 3) ring.push([ORBIT * Math.cos(a * RAD), ORBIT * Math.sin(a * RAD), 0]);
    line3(cam, ring, '#c9d8ea', 1.4, [5, 6], .7);
    for (const a of [135, 315]) { const p = project(cam, [ORBIT * Math.cos(a * RAD), ORBIT * Math.sin(a * RAD), 0]), p2 = project(cam, [ORBIT * Math.cos((a + 4) * RAD), ORBIT * Math.sin((a + 4) * RAD), 0]); if (p && p2) arrowHead(p2.x, p2.y, Math.atan2(p2.y - p.y, p2.x - p.x), '#c9d8ea', 8); }
    { const q = project(cam, [ORBIT * Math.cos(135 * RAD) * 1.12, ORBIT * Math.sin(135 * RAD) * 1.12, 0]); if (q && oa > .05) { ctx.globalAlpha = oa; text('月球公轉（逆時針）', q.x - 6, q.y - 4, '#c9d8ea', 12, 'right'); ctx.globalAlpha = 1; } }
    // 地表時刻環（固定在太陽方向）
    if (S.ring) {
      ctx.globalAlpha = oa;
      const rr = 1.62, pts = []; for (let a = 0; a <= 360; a += 4) pts.push([rr * Math.cos(a * RAD), rr * Math.sin(a * RAD), 0]); line3(cam, pts, '#ffd27a', 1, [2, 4], .55 * oa);
      for (let hh = 0; hh < 24; hh += 3) { const a = K.observerAngle(hh) * RAD, p1 = project(cam, [rr * Math.cos(a), rr * Math.sin(a), 0]), p2 = project(cam, [(rr + (hh % 6 ? .1 : .18)) * Math.cos(a), (rr + (hh % 6 ? .1 : .18)) * Math.sin(a), 0]); if (p1 && p2) poly([p1, p2], '#ffd27a', hh % 6 ? 1 : 2, [], oa); }
      for (const hh of K.TIMES) {
        const a = K.observerAngle(hh) * RAD, q = project(cam, [(rr + .5) * Math.cos(a), (rr + .5) * Math.sin(a), 0]); if (!q) continue;
        hits.push({ x: q.x, y: q.y, r: 22, type: 'time', v: hh });
        if (picked.time && Math.abs(mod(tShown - hh + 12, 24) - 12) < 2) continue;   // 觀測者標籤會畫在這裡
        text(`${hh} 時`, q.x, q.y + 5, '#ffd27a', 14, 'center', '700');
      }
      ctx.globalAlpha = 1;
    }
    // 月亮的四個課本位置
    const slots = K.PHASES.map(p => ({ p, pos: [ORBIT * Math.cos(p.elong * RAD), ORBIT * Math.sin(p.elong * RAD), 0] }));
    for (const { p, pos } of slots) {
      const q = project(cam, pos); if (!q) continue; const rs = cam.F * MOON_R / q.z, on = picked.moon && Math.abs(mod(S.e, 360) - p.elong) < 1e-6;
      ctx.globalAlpha = oa; circle(q.x, q.y, rs + 4, on ? 'rgba(242,182,50,.18)' : null, on ? '#f2b632' : '#9fb4cc', on ? 2 : 1.3, on ? [] : [3, 3]);
      const la = (p.elong + 19) * RAD, lq = project(cam, [(ORBIT + .1) * Math.cos(la), (ORBIT + .1) * Math.sin(la), 0]);
      if (lq) { text(p.day, lq.x, lq.y - 2, on ? '#ffe08a' : '#dbe6f2', 14, 'center', '700'); text(p.short, lq.x, lq.y + 14, on ? '#ffe08a' : '#a9bdd2', 12); }
      ctx.globalAlpha = 1; hits.push({ x: q.x, y: q.y, r: Math.max(22, rs + 8), type: 'moon', v: p.elong });
    }
    // 從地球看到的月相（外圈）
    if (S.look) {
      ctx.globalAlpha = oa;
      const list = slots.map(s => s.p.elong); if (picked.moon && !list.some(x => Math.abs(x - mod(eShown, 360)) < .5)) list.push(mod(eShown, 360));
      for (const e of list) { const q = project(cam, [(ORBIT + 1.05) * Math.cos(e * RAD), (ORBIT + 1.05) * Math.sin(e * RAD), 0]); if (!q) continue; const ps = K.sepAngle(e); if (ps < 3) circle(q.x, q.y, 13, 'rgba(30,36,46,.9)', '#8fa2b8', 1.2, [3, 3]); else moonDisk(q.x, q.y, 13, Math.sin(e * RAD) >= 0 ? 0 : Math.PI, ps, { alpha: oa, maria: false }); }
      if (fade === 0) text('外圈小圖：在台灣看到的月相', 14, H - 62, '#a9bdd2', 12, 'left');
      ctx.globalAlpha = 1;
    }
    // 地球與月球（遠的先畫）
    const bodies = [{ c: [0, 0, 0], r: 1, shade: earthShade(fr.th) }]; if (picked.moon) bodies.push({ c: M, r: MOON_R, shade: moonShade(M) });
    bodies.sort((a, b) => Math.hypot(...sub(b.c, cam.pos)) - Math.hypot(...sub(a.c, cam.pos))).forEach(b => sphereRaster(cam, b.c, b.r, b.shade));
    // 赤道、北極與自轉方向
    const eq = []; for (let a = 0; a <= 360; a += 4) eq.push([Math.cos(a * RAD) * 1.001, Math.sin(a * RAD) * 1.001, 0]); line3(cam, eq, '#e8f2ff', 1, [3, 4], .45);
    { const np = [0, 0, 1.0]; const q = project(cam, np); if (q && !occluded(cam, add(np, [0, 0, .01]))) { circle(q.x, q.y, 3, '#ff6b6b'); if (oa > .05) text('北極', q.x + 7, q.y - 6, '#ffd0d0', 12, 'left', '600'); } }
    ctx.globalAlpha = oa;
    { const arc = []; for (let a = 205; a <= 250; a += 3) arc.push([1.3 * Math.cos(a * RAD), 1.3 * Math.sin(a * RAD), 0]); line3(cam, arc, '#6fc0ff', 3, [], oa); const p = project(cam, arc[arc.length - 1]), p0 = project(cam, arc[arc.length - 3]); if (p && p0) arrowHead(p.x, p.y, Math.atan2(p.y - p0.y, p.x - p0.x), '#6fc0ff', 10); const lq = project(cam, [1.55 * Math.cos(222 * RAD), 1.55 * Math.sin(222 * RAD), 0]); if (lq && !S.ring) text('自轉', lq.x, lq.y, '#6fc0ff', 12, 'center', '600'); }
    ctx.globalAlpha = 1;
    // 月亮名稱
    if (picked.moon && !K.PHASES.some(p => Math.abs(p.elong - mod(eShown, 360)) < .5)) { const q = project(cam, M); if (q && oa > .05) { ctx.globalAlpha = oa; const rs = cam.F * MOON_R / q.z, up = Math.sin(eShown * RAD) < -.3; text(K.phaseName(eShown), q.x, up ? q.y + rs + 18 : q.y - rs - 9, '#fff7d6', 14, 'center', '700'); ctx.globalAlpha = 1; } }
    // 觀測者：台灣、當地地平面與方位
    if (picked.time) {
      const O = mul(fr.O, 1.0005), facing = dot(sub(O, cam.pos), fr.U) < 0;
      const disk = []; for (let a = 0; a < 360; a += 10) disk.push(add(O, add(mul(fr.E, .32 * Math.cos(a * RAD)), mul(fr.N, .32 * Math.sin(a * RAD)))));
      if (facing) poly3(cam, disk, `rgba(96,170,96,${lerp(.42, .75, smooth(.3, .75, fade))})`, '#9be29b', 1.6);
      ctx.globalAlpha = oa;
      const hz = []; for (let s = -6; s <= 6.01; s += .25) hz.push(add(O, mul(fr.E, s))); line3(cam, hz, '#9be29b', 1.3, [6, 5], .75 * oa);
      const zen = project(cam, add(O, mul(fr.U, .45))), oq = project(cam, O);
      if (zen && oq && facing) { poly([oq, zen], '#ffffff', 1.6, [], oa); arrowHead(zen.x, zen.y, Math.atan2(zen.y - oq.y, zen.x - oq.x), '#ffffff', 7); if (orbit.el < 60 && fade === 0) text('頭頂', zen.x, zen.y - 8, '#ffffff', 12, 'center', '600'); }
      ctx.globalAlpha = 1;
      if (facing) for (const [v, name, big] of [[fr.E, '東', 1], [mul(fr.E, -1), '西', 1], ...(orbit.el < 60 || fade > 0 ? [[fr.N, '北', 0], [mul(fr.N, -1), '南', 0]] : [])]) { const q = project(cam, add(O, mul(v, .44))); if (q && !occluded(cam, add(O, mul(v, .44)))) text(name, q.x, q.y + 5, '#d4f7d4', big ? 15 : 12, 'center', '700'); }
      for (const [s, name] of [[5.6, '東方地平線'], [-5.6, '西方地平線']]) { const p = add(O, mul(fr.E, s)), q = project(cam, p); if (q && !occluded(cam, p) && oa > .05) { ctx.globalAlpha = oa; text(name, clamp(q.x, 45, W - 45), clamp(q.y - 6, 50, H - 58), '#9be29b', 12, 'center', '600'); ctx.globalAlpha = 1; } }
      if (oq && facing) { circle(oq.x, oq.y, 5, '#ff4d4d', '#fff', 1.5); if (oa > .05) { ctx.globalAlpha = oa; const rl = 2.05 + .85 * Math.abs(Math.cos(fr.th)), out = project(cam, [rl * Math.cos(fr.th), rl * Math.sin(fr.th), 0]); const lx = out ? out.x : oq.x, ly = out ? out.y : oq.y; text('你（台灣）', lx, ly - 3, '#ffd0d0', 12, 'center', '700'); text(K.clock(tShown), lx, ly + 12, '#ffe08a', 12, 'center', '700'); ctx.globalAlpha = 1; } }
    }
    // 標題與提示
    if (oa > .05) {
      ctx.globalAlpha = oa;
      text(orbit.el > 80 && fade === 0 ? '從地球北極上空俯瞰（太陽在右邊；大小、距離不按比例）' : '日、地、月的相對位置（大小、距離不按比例）', 14, 24, '#d6e4f0', 14, 'left', '600');
      const tip = !picked.moon ? '① 先選月亮的位置：右側按鈕，或點畫面上的虛線圈' : !picked.time ? '② 再選地球上的時間：右側按鈕，或點地球外圈的「時」' : S.view === 'space' ? '③ 按「進入地球」，看看這時候的月亮' : '';
      if (tip) { ctx.font = font(15, '700'); const w = ctx.measureText(tip).width + 28; ctx.fillStyle = 'rgba(10,22,38,.82)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, H - 46, w, 32, 10); ctx.fill(); text(tip, W / 2, H - 25, '#ffe08a', 15, 'center', '700', false); }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 第一人稱（站在台灣） ----------
  function fpCam() {
    const az = look.az * RAD, al = look.alt * RAD, f = [Math.cos(al) * Math.sin(az), Math.cos(al) * Math.cos(az), Math.sin(al)], r = [Math.cos(az), -Math.sin(az), 0], u = cross(r, f), F = fpF();
    const P = l => { const z = dot(l, f); if (z < .02) return null; return { x: W / 2 + F * dot(l, r) / z, y: H / 2 - F * dot(l, u) / z }; };
    P.f = f; return P;
  }
  const altAz = (al, az) => [Math.cos(al * RAD) * Math.sin(az * RAD), Math.cos(al * RAD) * Math.cos(az * RAD), Math.sin(al * RAD)];
  const starLocal = (dec, Hh) => { const c = Math.cos(dec * RAD), v = [c * Math.cos(Hh * RAD), -c * Math.sin(Hh * RAD), Math.sin(dec * RAD)], s = Math.sin(LAT * RAD), cl = Math.cos(LAT * RAD); return [v[1], -s * v[0] + cl * v[2], cl * v[0] + s * v[2]]; };
  const onScreen = q => q && q.x > -10 && q.x < W + 10 && q.y > -10 && q.y < H + 10;
  function drawFirst() {
    const Pr = fpCam(), sun = K.sun(tShown), m = K.describe(tShown, eShown), dayK = smooth(-9, 6, sun.alt), twK = clamp(1 - Math.abs(sun.alt) / 10, 0, 1);
    const top = mixC([5, 11, 28], [45, 116, 196], dayK), bot = mixC(mixC([16, 36, 70], [158, 206, 242], dayK), [236, 150, 90], twK * .6);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(top)); g.addColorStop(.8, rgb(bot)); g.addColorStop(1, rgb(bot)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sq = sun.alt > -4 ? Pr(sun.vec) : null;
    if (sq && twK > 0) { const gg = ctx.createRadialGradient(sq.x, sq.y, 10, sq.x, sq.y, 320); gg.addColorStop(0, `rgba(255,190,110,${.55 * twK})`); gg.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); }
    // 星星（白天看不到）
    const starA = clamp(1 - dayK * 1.4, 0, 1);
    if (starA > .02) for (const s of SKY_STARS) { const l = starLocal(s.dec, s.H0 + 15 * tShown); if (l[2] < 0) continue; const q = Pr(l); if (!q) continue; ctx.globalAlpha = starA * (.35 + .6 * s.m); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, .6 + s.m * 1.1, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const al of [30, 60]) { const pts = []; for (let z = 0; z <= 360; z += 3) { const p = Pr(altAz(al, z)); if (p) pts.push(p); else { poly(pts, 'rgba(200,220,240,.22)', 1, [3, 5]); pts.length = 0; } } poly(pts, 'rgba(200,220,240,.22)', 1, [3, 5]); }
    // 日月每天的路徑（天球赤道）
    if (S.path) {
      const pts = [], cand = {};
      for (let h = -180; h <= 180; h += 2) { const l = K.localVec(h); const p = l[2] >= -.002 ? Pr(l) : null; if (p) { pts.push(p); cand[h] = p; } else { poly(pts, '#ffe08a', 1.6, [7, 6], .65); pts.length = 0; } }
      poly(pts, '#ffe08a', 1.6, [7, 6], .65);
      const mp = Pr(m.vec), label = [-50, 50, -24, 24, -76, 76, -36, 36].map(h => cand[h]).find(p => p && p.x > 150 && p.x < W - 150 && p.y > 90 && p.y < H - 60 && (!mp || Math.hypot(p.x - mp.x, p.y + 22 - mp.y) > 70));
      if (label) text('日、月每天走的路線（東 → 南 → 西）', label.x, label.y + 22, '#ffe08a', 12, 'center', '600');
      for (const h of [-60, 60]) { const a = Pr(K.localVec(h)), b = Pr(K.localVec(h + 3)); if (a && b) arrowHead(b.x, b.y, Math.atan2(b.y - a.y, b.x - a.x), '#ffe08a', 8); }
    }
    // 太陽
    if (sq) {
      const gs = ctx.createRadialGradient(sq.x, sq.y, 4, sq.x, sq.y, 60); gs.addColorStop(0, 'rgba(255,245,200,.95)'); gs.addColorStop(.35, 'rgba(255,220,130,.45)'); gs.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sq.x, sq.y, 60, 0, 7); ctx.fill();
      circle(sq.x, sq.y, 20, '#fff4c4', '#ffd36b', 2); text('太陽', sq.x, sq.y + 40, '#fff2c8', 14, 'center', '700');
    }
    // 月亮
    const mq = Pr(m.vec), MR = 26;
    if (mq && m.state !== 'down') {
      if (m.dark) { circle(mq.x, mq.y, MR + 8, null, '#ffffff', 2, [5, 4]); const ty = mq.y < 140 ? mq.y + MR + 62 : mq.y - MR - 30; text('月亮在虛線圈這裡，但看不到', mq.x, ty, '#ffffff', 13, 'center', '700'); text('（亮面背對地球，又在太陽旁邊）', mq.x, ty + 17, '#ffffff', 12, 'center', '600'); }
      else {
        const b = K.brightSide(tShown, eShown), q2 = Pr(unit(add(m.vec, mul(b.vec, .03)))), nq = Pr(unit(add(m.vec, mul(starLocal(90, 0), .03))));
        const ang = q2 ? Math.atan2(q2.y - mq.y, q2.x - mq.x) : 0, north = nq ? Math.atan2(nq.y - mq.y, nq.x - mq.x) : -Math.PI / 2;
        if (dayK < .5) { const gm = ctx.createRadialGradient(mq.x, mq.y, MR * .8, mq.x, mq.y, MR * 3); gm.addColorStop(0, `rgba(230,236,255,${.25 * K.illum(eShown)})`); gm.addColorStop(1, 'rgba(230,236,255,0)'); ctx.fillStyle = gm; ctx.beginPath(); ctx.arc(mq.x, mq.y, MR * 3, 0, 7); ctx.fill(); }
        moonDisk(mq.x, mq.y, MR, ang, K.sepAngle(eShown), { north, dark: dayK > .5 ? 'rgba(120,150,190,.15)' : 'rgba(40,46,58,.95)', alpha: dayK > .5 ? .88 : 1 });
        text(K.phaseName(eShown), mq.x, mq.y < 70 ? mq.y + MR + 20 : mq.y - MR - 10, '#fff7d6', 14, 'center', '700');
      }
    }
    ground(Pr, dayK);
    // 地平線下的月亮：虛線圈＋說明
    if (m.state === 'down' && mq && onScreen(mq)) { circle(mq.x, mq.y, MR, null, 'rgba(255,255,255,.75)', 2, [5, 4]); text('月亮在地平線下（看不到）', mq.x, mq.y + MR + 20, '#ffffff', 13, 'center', '700'); }
    // 天頂
    { const zq = Pr([0, 0, 1]); if (zq) { circle(zq.x, zq.y, 6, null, '#fff', 1.5); text('天頂', zq.x, zq.y - 10, '#fff', 12); } }
    // 月亮不在畫面上：邊緣箭頭
    if (!onScreen(mq) || (m.state === 'down' && !mq)) {
      const rel = mod(m.az - look.az + 180, 360) - 180, msg = m.dark && m.state !== 'down' ? `月亮在${m.dir}方（看不到）` : m.state === 'down' ? `月亮在${m.dir}方地平線下 ${Math.round(-m.alt)}°（看不到）` : `月亮在${m.dir}方`;
      let x, y, ang;
      if (Math.abs(rel) > look.fov / 2 - 6) { x = rel > 0 ? W - 26 : 26; y = H / 2 - 20; ang = rel > 0 ? 0 : Math.PI; }
      else { x = W / 2 + clamp(rel / (look.fov / 2), -1, 1) * (W / 2 - 80); const up = m.alt > look.alt; y = up ? 70 : H - 70; ang = up ? -Math.PI / 2 : Math.PI / 2; }
      ctx.fillStyle = 'rgba(10,22,38,.75)'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); arrowHead(x + 4 * Math.cos(ang), y + 4 * Math.sin(ang), ang, '#ffe08a', 11);
      const tx = clamp(x + (Math.abs(Math.cos(ang)) > .5 ? -Math.sign(Math.cos(ang)) * 28 : 0), 90, W - 90), ty = Math.abs(Math.sin(ang)) > .5 ? y + (ang < 0 ? 34 : -28) : y + 40;
      text(msg, tx, ty, '#ffe08a', 13, Math.abs(Math.cos(ang)) > .5 ? (ang === 0 ? 'right' : 'left') : 'center', '700');
    }
    compass();
    const dir = look.alt > 80 ? '天頂' : K.dirName(look.az) + '方';
    text(`站在台灣・${K.clock(tShown)}・面向${dir}`, 14, 24, '#ffffff', 14, 'left', '700');
    const left = K.dirName(look.az - 90), right = K.dirName(look.az + 90);
    text(`左手邊：${left}｜右手邊：${right}`, W - 14, 74, '#e8f6e8', 13, 'right', '700');
  }
  function ground(Pr, dayK) {
    ctx.fillStyle = rgb(mixC([20, 40, 28], [62, 118, 66], dayK));
    for (let a = -90; a < 0; a += 10) for (let z = 0; z < 360; z += 10) {
      const q = [[a, z], [a, z + 10], [a + 10, z + 10], [a + 10, z]].map(([al, az]) => Pr(altAz(al, az)));
      if (q.some(p => !p)) continue; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
    }
    const hz = []; for (let z = 0; z <= 360; z += 2) { const p = Pr(altAz(0, z)); if (p) hz.push(p); else { poly(hz, '#a8e2a8', 2); hz.length = 0; } } poly(hz, '#a8e2a8', 2);
    for (const [z, name] of [[0, '北'], [45, '東北'], [90, '東'], [135, '東南'], [180, '南'], [225, '西南'], [270, '西'], [315, '西北']]) { const p = Pr(altAz(0, z)); if (p) { if (z % 90 === 0) poly([p, { x: p.x, y: p.y + 10 }], '#d4f7d4', 2); text(name, p.x, p.y + (z % 90 ? 22 : 30), '#d4f7d4', z % 90 ? 13 : 18, 'center', '700'); } }
  }
  function compass() {
    const w = 240, cx = W - 14 - w / 2 - 10, y = 14, span = 120, k2 = w / span;
    ctx.fillStyle = 'rgba(8,18,32,.72)'; ctx.beginPath(); ctx.roundRect(cx - w / 2 - 10, y - 6, w + 20, 40, 9); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2, y - 6, w, 40); ctx.clip();
    for (let d = Math.ceil((look.az - span / 2) / 15) * 15; d <= look.az + span / 2; d += 15) {
      const x = cx + (d - look.az) * k2, main45 = mod(d, 45) === 0; ctx.strokeStyle = '#cfe0ee'; ctx.lineWidth = main45 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + (main45 ? 9 : 5)); ctx.stroke();
      if (main45) text(K.dirName(d), x, y + 25, mod(d, 90) === 0 ? '#ffffff' : '#b9cde0', mod(d, 90) === 0 ? 14 : 12, 'center', '700', false);
    }
    ctx.restore(); ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(cx, y + 12); ctx.lineTo(cx - 6, y - 3); ctx.lineTo(cx + 6, y - 3); ctx.closePath(); ctx.fill();
  }

  function draw() {
    if (canvas.width !== W * 2) { canvas.width = W * 2; canvas.height = H * 2; }
    main.setTransform(2, 0, 0, 2, 0, 0); ctx = main; fs = canvas.clientWidth ? clamp(.62 * W / canvas.clientWidth, 1, 1.5) : 1;
    if (k <= 0) drawSpace(spaceCam(orbit));
    else if (k >= 1) drawFirst();
    else {
      drawSpace(transCam(k), k);
      const a = smooth(.8, .985, k);
      if (a > 0) { fctx.setTransform(2, 0, 0, 2, 0, 0); ctx = fctx; drawFirst(); ctx = main; main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.drawImage(fpCanvas, 0, 0); main.globalAlpha = 1; main.setTransform(2, 0, 0, 2, 0, 0); }
    }
    canvas.classList.toggle('fp', k >= 1);
  }

  // ---------- 讀數與講解表 ----------
  function readings() {
    const rows = [];
    if (!picked.moon) rows.push(['月亮位置', '請先選擇']);
    else rows.push(['月亮位置', `${K.phaseName(S.e)}<br><small>${K.lunarText(S.e)}</small>`]);
    rows.push(['地球上的時間', picked.time ? `${K.clock(S.t)}<br><small>${timeWord(S.t)}</small>` : '請選擇']);
    if (picked.moon && picked.time) {
      const d = K.describe(S.t, S.e), b = K.brightSide(S.t, S.e);
      const [a, ...rest] = d.text.split('，'); rows.push(['月亮在天空', rest.length ? `${a}<br><small>${rest.join('，')}</small>` : a]);
      rows.push(['亮的一側', d.state === 'down' ? '—（看不到）' : d.dark ? '—（亮面背對地球）' : K.illum(S.e) > .97 ? '整面都亮<br><small>正對太陽</small>' : `${b.side}${K.illum(S.e) > .3 && K.illum(S.e) < .7 ? '半邊' : '側'}<br><small>朝${b.compass}方的太陽</small>`]);
    } else { rows.push(['月亮在天空', '—'], ['亮的一側', '—']); }
    rows.push(['月出', picked.moon ? `${K.clock(K.riseTime(S.e))}<br><small>從東方升起</small>` : '—']);
    rows.push(['月落', picked.moon ? `${K.clock(K.setTime(S.e))}<br><small>從西方落下</small>` : '—']);
    $('readings').innerHTML = rows.map(([kk, v]) => `<div class="reading"><span class="muted">${kk}</span><strong>${v}</strong></div>`).join('');
  }
  const timeWord = t => { const h = mod(t, 24); return h < 4 || h >= 22 ? '半夜' : h < 8 ? '清晨' : h < 11 ? '上午' : h < 14 ? '中午' : h < 17 ? '下午' : '傍晚'; };
  function worksheet() {
    const tb = K.table(), cur = (pi, col) => picked.moon && picked.time && Math.abs(mod(S.e, 360) - K.PHASES[pi].elong) < 1e-6 && col < 4 && Math.abs(mod(S.t, 24) - K.TIMES[col]) < 1e-6;
    const cell = (id, val, cls, pi, col) => reveal.has(id) ? `<td class="ws-cell ${cls}${cur(pi, col) ? ' current' : ''}">${val}</td>` : `<td class="ws-cell hidden-cell ${cls}${cur(pi, col) ? ' current' : ''}" data-ws="${id}" tabindex="0" role="button" aria-label="揭曉">？</td>`;
    $('worksheet').innerHTML = `<table class="ws-table"><thead><tr><th></th>${K.TIMES.map(t => `<th>${t} 點</th>`).join('')}<th>月出</th><th>月落</th></tr></thead><tbody>${tb.map((row, pi) => `<tr><th class="row">${row.phase.day}<small>${row.phase.name}</small></th>${row.cells.map((c, col) => cell(`${pi}-${col}`, c, '', pi, col)).join('')}${cell(`${pi}-r`, row.rise, 'rs', pi, 9)}${cell(`${pi}-s`, row.set, 'rs', pi, 9)}</tr>`).join('')}</tbody></table>`;
    $('worksheet').querySelectorAll('[data-ws]').forEach(el => { const go = () => { reveal.add(el.dataset.ws); worksheet(); }; el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }; });
  }
  function revealHere() {
    if (!picked.moon || !picked.time) return;
    const pi = K.PHASES.findIndex(p => Math.abs(p.elong - mod(S.e, 360)) < 1e-6), col = K.TIMES.findIndex(t => Math.abs(t - mod(S.t, 24)) < 1e-6);
    if (pi >= 0 && col >= 0) reveal.add(`${pi}-${col}`); worksheet();
  }

  // ---------- 介面同步 ----------
  function syncUI() {
    const four = S.way === 'four';
    $('way-four').setAttribute('aria-pressed', String(four)); $('way-slider').setAttribute('aria-pressed', String(!four));
    $('four-tools').hidden = !four; $('slider-tools').hidden = four;
    document.querySelectorAll('[data-moon]').forEach(b => { const on = picked.moon && Math.abs(+b.dataset.moon - mod(S.e, 360)) < 1e-6; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('pulse', !picked.moon); });
    document.querySelectorAll('[data-time]').forEach(b => { const on = picked.time && Math.abs(+b.dataset.time - mod(S.t, 24)) < 1e-6; b.setAttribute('aria-pressed', String(on)); b.disabled = !picked.moon; b.classList.toggle('pulse', picked.moon && !picked.time); });
    $('age').value = K.ageDays(S.e).toFixed(2); $('age-out').textContent = `${K.ageDays(S.e).toFixed(1)} 天｜${K.phaseName(S.e)}（${K.lunarText(S.e).replace('農曆', '')}）`;
    $('clock').value = mod(S.t, 24); $('clock-out').textContent = `${K.clock(S.t)}（${timeWord(S.t)}）`;
    const ready = picked.moon && picked.time, inside = S.view === 'first';
    $('enter').disabled = !ready || inside; $('exit').disabled = !inside && k === 0;
    $('enter-hint').textContent = !picked.moon ? '先完成 ① 選月亮的位置。' : !picked.time ? '再完成 ② 選地球上的時間。' : inside ? '已在地球上。拖曳畫面轉頭，或改時間看月亮怎麼動。' : '準備好了！';
    $('look-tools').hidden = !inside; $('orbit-tools').hidden = inside;
    $('scene-title').textContent = inside ? '第一人稱：站在台灣看月亮' : '從北極上空看日、地、月';
    $('scene-caption').textContent = inside ? '地平線上標有方位；上方的指北針顯示你面向哪裡。拖曳轉頭，滾輪或雙指縮放。' : '太陽固定在右邊，地球與月亮都逆時針轉。選好月亮位置與時間後，按「進入地球」。';
    readings(); worksheet(); syncURL();
  }
  function syncURL() { const q = new URLSearchParams(); if (picked.moon) q.set('moon', +S.e.toFixed(2)); if (picked.time) q.set('time', +S.t.toFixed(2)); if (S.view === 'first') q.set('view', 'first'); if (S.way === 'slider') q.set('way', 'slider'); if (modeName !== 'free') q.set('mode', modeName); try { history.replaceState(null, '', q.toString() ? '?' + q : location.pathname); } catch (_) { /* 靜態檢視 */ } }

  // ---------- 動畫迴圈 ----------
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (playing && kA >= 1) { S.t = mod(S.t + dt * speed, 24); tShown = S.t; tA = 1; if (Math.floor(S.t * 4) !== Math.floor((S.t - dt * speed) * 4)) { readings(); worksheet(); $('clock').value = S.t; $('clock-out').textContent = `${K.clock(S.t)}（${timeWord(S.t)}）`; } }
    if (tA < 1) { tA = Math.min(1, tA + dt / 1.4); tShown = mod(lerp(tFrom, tTo, ease(tA)), 24); }
    if (eA < 1) { eA = Math.min(1, eA + dt / 1.4); eShown = mod(lerp(eFrom, eTo, ease(eA)), 360); }
    if (kA < 1) { kA = Math.min(1, kA + dt / kDur); k = lerp(kFrom, kTo, ease(kA)); if (kA >= 1) { k = kTo; syncUI(); } }
    draw();
    if (playing || tA < 1 || eA < 1 || kA < 1) requestAnimationFrame(tick); else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } }
  function setPlaying(v) { playing = v; $('play').textContent = playing ? '❚❚ 暫停' : '▶ 播放'; if (playing && !picked.time) { picked.time = true; syncUI(); } kick(); }

  // ---------- 操作 ----------
  function setMoon(e, animate = true) {
    e = mod(e, 360); const first = !picked.moon; picked.moon = true; S.e = e;
    if (animate && !first) { eFrom = eShown; let to = e; while (to < eFrom - 1e-9) to += 360; eTo = to; eA = 0; } else { eShown = e; eA = 1; }
    syncUI(); kick();
  }
  function setTime(t, animate = true) {
    t = mod(t, 24); const first = !picked.time; picked.time = true; S.t = t;
    if (animate) { tFrom = first ? 12 : tShown; let to = t; while (to < tFrom - 1e-9) to += 24; tTo = to; tA = tTo === tFrom ? 1 : 0; } else { tShown = t; tA = 1; }
    syncUI(); kick();
  }
  function lookAt(target) {
    const b = target === 'sun' ? K.sun(S.t) : K.describe(S.t, S.e);
    look.az = b.az; look.alt = b.alt <= 0 ? 8 : clamp(b.alt * .5, 8, 33); kick();
  }
  function enter() {
    if (!picked.moon || !picked.time || S.view === 'first') return;
    setPlaying(false); tShown = S.t; tA = 1; eShown = S.e; eA = 1;
    lookAt('moon'); orbitStart = { ...orbit }; kFrom = k; kTo = 1; kA = 0; kDur = 3.6; S.view = 'first'; syncUI(); kick();
  }
  function exit() {
    if (S.view !== 'first' && k === 0) return;
    setPlaying(false); orbit = { az: 0, el: 90, zoom: 1 }; orbitStart = { ...orbit }; kFrom = k; kTo = 0; kA = 0; kDur = 2.8; S.view = 'space'; syncUI(); kick();
  }
  function setWay(w) { S.way = w; if (w === 'slider') { if (!picked.moon) setMoon(90, false); if (!picked.time) setTime(18, false); } syncUI(); kick(); }

  $('moon-buttons').innerHTML = K.PHASES.map(p => `<button type="button" data-moon="${p.elong}" aria-pressed="false">${p.day}<small>${p.short}</small></button>`).join('');
  $('time-buttons').innerHTML = K.TIMES.map((t, i) => `<button type="button" data-time="${t}" aria-pressed="false">${t} 點<small>${['半夜', '清晨', '中午', '傍晚'][i]}</small></button>`).join('');
  document.querySelectorAll('[data-moon]').forEach(b => b.onclick = () => setMoon(+b.dataset.moon));
  document.querySelectorAll('[data-time]').forEach(b => b.onclick = () => setTime(+b.dataset.time));
  $('way-four').onclick = () => setWay('four'); $('way-slider').onclick = () => setWay('slider');
  $('age').addEventListener('input', e => setMoon(K.elongFromAge(+e.target.value), false));
  $('clock').addEventListener('input', e => setTime(+e.target.value === 24 ? 0 : +e.target.value, false));
  $('enter').onclick = enter; $('exit').onclick = exit;
  $('play').onclick = () => setPlaying(!playing); $('speed').onchange = e => { speed = +e.target.value; };
  const toggle = (id, key) => { $(id).onclick = () => { S[key] = !S[key]; $(id).setAttribute('aria-pressed', String(S[key])); kick(); }; };
  toggle('t-ring', 'ring'); toggle('t-look', 'look'); toggle('t-path', 'path');
  document.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { const v = b.dataset.look; if (v === 'moon' || v === 'sun') lookAt(v); else { look.az = +v; look.alt = 30; kick(); } });
  document.querySelectorAll('[data-orbit]').forEach(b => b.onclick = () => { orbit = b.dataset.orbit === 'top' ? { az: 0, el: 90, zoom: 1 } : { az: -20, el: 32, zoom: 1.05 }; kick(); });
  $('ws-here').onclick = revealHere; $('ws-all').onclick = () => { K.table().forEach((_, pi) => { for (const c of [0, 1, 2, 3, 'r', 's']) reveal.add(`${pi}-${c}`); }); worksheet(); }; $('ws-none').onclick = () => { reveal.clear(); worksheet(); };

  // 拖曳：太空中旋轉視角、第一人稱轉頭；滾輪／雙指縮放；在太空中點一下可選月亮或時間
  const pointers = new Map(); let pinch = 0, down = null;
  const local = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = pointers.size === 1 ? { x: e.clientX, y: e.clientY, moved: false } : null; if (pointers.size === 2) pinch = spread(); });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const d = spread(); if (pinch) zoomBy(d / pinch); pinch = d; return; }
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
    if (!down || !down.moved || (k > 0 && k < 1)) return;
    if (k >= 1) { look.az = mod(look.az - dx * .25, 360); look.alt = clamp(look.alt + dy * .25, -15, 85); }
    else { orbit.az -= dx * .35; orbit.el = clamp(orbit.el + dy * .3, 8, 90); }
    kick();
  });
  canvas.addEventListener('pointerup', e => {
    if (down && !down.moved && k === 0) { const p = local(e), hit = hits.filter(h => Math.hypot(h.x - p.x, h.y - p.y) < h.r).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (hit && S.way === 'four') { if (hit.type === 'moon') setMoon(hit.v); else if (picked.moon) setTime(hit.v); } }
    pointers.delete(e.pointerId); pinch = 0; down = null;
  });
  ['pointercancel', 'lostpointercapture'].forEach(n => canvas.addEventListener(n, e => { pointers.delete(e.pointerId); pinch = 0; }));
  function zoomBy(z) { if (k >= 1) look.fov = clamp(look.fov / z, 50, 120); else if (k === 0) orbit.zoom = clamp(orbit.zoom * z, .7, 2.6); kick(); }
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * .001)); }, { passive: false });

  // ---------- 自修任務 ----------
  const opt = (question, options, answer, hint) => ({ question, options, answer, hint });
  const inside = () => S.view === 'first' && k >= 1;
  const need = (e, t) => { if (!picked.moon || Math.abs(mod(S.e, 360) - e) > 1e-6) return `請在 ① 選月亮位置「${K.PHASES.find(p => p.elong === e).day}」。`; if (t !== null && (!picked.time || Math.abs(mod(S.t, 24) - t) > 1e-6)) return `請在 ② 選時間「${t} 點」。`; if (!inside()) return '請按「進入地球」，等畫面變成第一人稱。'; return ''; };
  const lessons = [
    { id: 'first-quarter-evening', title: '傍晚的上弦月', prediction: { question: '初七（上弦月）傍晚 18 點，月亮會在哪裡？', options: ['南方高空', '東方地平線，剛升起', '西方地平線，快落下'] },
      task: '按「準備這個實驗」後，選月亮位置「初七」、時間「18 點」，再按「進入地球」。',
      prepare() { resetScene(); },
      check() { const m = need(90, 18); if (m) return { ok: false, message: m }; return { ok: true, evidence: '初七 18 點：月亮在南方高空（仰角 66°），右半邊（西側）亮；太陽正在西方落下' }; },
      observation: opt('上弦月在傍晚的樣子？', ['在南方高空，右半邊亮', '在南方高空，左半邊亮', '在東方低空，整個都亮'], 0, '面向南方時，右手邊是西方。'),
      reason: opt('為什麼亮的是右半邊（西側）？', ['亮面永遠朝向太陽，傍晚太陽在西方', '月亮自己會發光，右邊比較亮', '地球的影子遮住了左半邊'], 0, '看看太陽此時在哪個方位。'),
      conclusion: '上弦月（初七、八）中午從東方升起、傍晚在南方高空、半夜從西方落下；亮面朝向西方的太陽，所以右半邊亮。' },
    { id: 'full-moon-rise', title: '滿月什麼時候升起？', prediction: { question: '十五的滿月，大約幾點從東方升起？', options: ['18 點（傍晚）', '0 點（半夜）', '6 點（清晨）'] },
      task: '準備後，選「十五」，再試不同的時間並進入地球，找出月亮剛好在東方地平線上的時刻。',
      prepare() { resetScene(); },
      check() { const m = need(180, null); if (m) return { ok: false, message: m }; const d = K.describe(S.t, S.e); if (d.state !== 'rising') return { ok: false, message: '月亮現在不在東方地平線上，換個時間再看看。' }; return { ok: true, evidence: `十五 ${K.clock(S.t)}：滿月剛從東方地平線升起，太陽同時從西方落下` }; },
      observation: opt('滿月在什麼時候從東方升起？', ['傍晚 18 點', '半夜 0 點', '中午 12 點'], 0, '看看你找到的時間。'),
      reason: opt('為什麼？', ['望時月亮在地球背對太陽的一側，太陽西落時它正好東升', '滿月比較重，升得比較慢', '滿月離地球比較近'], 0, '回到北極上空，看月亮和太陽分別在地球的哪一側。'),
      conclusion: '滿月（十五）傍晚東升、半夜在南方最高、清晨西落，整晚都看得到。' },
    { id: 'last-quarter-morning', title: '清晨的下弦月', prediction: { question: '廿二（下弦月）早上 6 點，看得到月亮嗎？', options: ['看得到，在南方高空', '看不到，在地平線下', '看得到，剛從東方升起'] },
      task: '準備後，選月亮位置「廿二」、時間「6 點」，再按「進入地球」。',
      prepare() { resetScene(); },
      check() { const m = need(270, 6); if (m) return { ok: false, message: m }; return { ok: true, evidence: '廿二 6 點：月亮在南方高空（仰角 66°），左半邊（東側）亮；太陽正從東方升起' }; },
      observation: opt('下弦月在清晨的樣子？', ['在南方高空，左半邊亮', '在南方高空，右半邊亮', '看不到'], 0, '面向南方時，左手邊是東方。'),
      reason: opt('為什麼亮的是左半邊（東側）？', ['亮面朝向太陽，清晨太陽在東方', '下弦月的亮面永遠朝右', '月亮被雲擋住一半'], 0, '太陽此時在哪個方位？'),
      conclusion: '下弦月（廿二、廿三）半夜從東方升起、清晨在南方高空、中午從西方落下；亮面朝向東方的太陽，所以左半邊亮。' },
    { id: 'new-moon-noon', title: '初一看得到月亮嗎？', prediction: { question: '初一中午 12 點，月亮在哪裡？看得到嗎？', options: ['在南方高空，但看不到', '在地平線下，看不到', '在南方高空，看得到細細的眉月'] },
      task: '準備後，選月亮位置「初一」、時間「12 點」，再按「進入地球」。',
      prepare() { resetScene(); },
      check() { const m = need(0, 12); if (m) return { ok: false, message: m }; return { ok: true, evidence: '初一 12 點：月亮和太陽一起在南方高空，亮面背對地球，看不到' }; },
      observation: opt('初一中午看到什麼？', ['月亮就在太陽旁邊，但看不到', '看到滿月', '看到上弦月'], 0, '看看虛線圈和說明。'),
      reason: opt('為什麼看不到？', ['朔時月亮在日、地之間，亮面背對地球，又淹沒在陽光裡', '月亮跑到地球背後了', '初一月亮會停止發光'], 0, '回到北極上空，看月亮在地球的哪一側。'),
      conclusion: '朔（初一）時月亮與太陽同升同落，亮面背對地球，所以整天都看不到月亮。' }
  ];
  const quiz = [
    { id: 'q1', question: '傍晚看到月亮正從東方升起，那天大約是農曆幾號？', options: ['十五', '初七', '廿二'], answer: 0, hint: '傍晚太陽在西方，月亮在它的正對面。', explain: '日、月在地球兩側時，太陽西落、月亮東升，這是望（十五）。' },
    { id: 'q2', question: '上弦月大約幾點從東方升起？', options: ['中午 12 點', '傍晚 18 點', '半夜 0 點'], answer: 0, hint: '上弦月比太陽晚 6 小時。', explain: '上弦月在太陽東邊 90°，比太陽晚 6 小時升起：12 點東升、18 點在南方、0 點西落。' },
    { id: 'q3', question: '半夜 0 點，月亮剛從東方升起，這時的月相是？', options: ['下弦月', '上弦月', '滿月'], answer: 0, hint: '0 點時，太陽在你腳下的正對面。', explain: '下弦月比太陽晚 18 小時（早 6 小時）：0 點東升、6 點在南方、12 點西落。' },
    { id: 'q4', question: '在台灣清晨 6 點看到南方高空的半個月亮，亮的是哪一半？', options: ['左半邊（東側）', '右半邊（西側）', '上半邊'], answer: 0, hint: '亮面朝向太陽，清晨太陽在哪？', explain: '清晨太陽在東方，亮面朝東；面向南方時東方在左手邊，所以左半邊亮（下弦月）。' },
    { id: 'q5', question: '從地球北極上空往下看，地球自轉與月球公轉的方向是？', options: ['都是逆時針', '都是順時針', '自轉逆時針、公轉順時針'], answer: 0, hint: '看看畫面上的箭頭。', explain: '從北極上空看，地球自轉與月球公轉都是逆時針（由西向東）。' }
  ];
  const tasks = ['哪一種月相整晚都看得到？哪一種只在傍晚前後看得到？', '中午看到月亮從東方升起，那天大約是農曆幾號？', '選「十五」後按播放，從 18 點看到 6 點，月亮在天空中怎麼移動？', '同一個時間，四個月亮位置裡哪些看得到？'];
  $('tasks').innerHTML = tasks.map(x => `<p>• ${x}</p>`).join('');
  L.guidedStudy($('study-panel'), lessons, 'jutor.moonphase.guide.v1', quiz, 'jutor.moonphase.quiz.v1', () => modeName === 'study');

  // ---------- 模式與快速鍵 ----------
  function resetScene() {
    Object.assign(S, DEFAULTS, { e: 90, t: 12, view: 'space', way: 'four' }); picked = { moon: false, time: false };
    ['t-ring', 't-look', 't-path'].forEach((id, i) => $(id).setAttribute('aria-pressed', String([S.ring, S.look, S.path][i])));
    tShown = 12; tA = 1; eShown = 90; eA = 1; k = 0; kA = 1; orbit = { az: 0, el: 90, zoom: 1 }; orbitStart = { ...orbit }; look = { az: 180, alt: 30, fov: 112 };
    setPlaying(false); syncUI(); kick();
  }
  function setMode(name) {
    if (name === 'study') resetScene();   // 進入自修模式：畫面全部回到初始狀態並停止
    modeName = name; document.body.dataset.study = String(name === 'study'); document.body.classList.toggle('projection', name === 'projection');
    $('study-panel').hidden = name !== 'study'; $('free-panel').hidden = name !== 'free'; $('worksheet-panel').hidden = name === 'study';
    $('proj-hint').hidden = name !== 'projection'; $('fullscreen').hidden = name !== 'projection';
    [['free-mode', 'free'], ['study-mode', 'study'], ['proj-mode', 'projection']].forEach(([id, n]) => $(id).setAttribute('aria-pressed', String(name === n)));
    if (name !== 'projection' && document.fullscreenElement) document.exitFullscreen?.();
    syncURL(); kick();
  }
  $('free-mode').onclick = () => setMode('free'); $('study-mode').onclick = () => setMode('study'); $('proj-mode').onclick = () => setMode('projection');
  $('fullscreen').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
  document.addEventListener('keydown', e => {
    if (modeName !== 'projection' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName; if (e.key === 'Escape') { setMode('free'); return; } if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (/^[1-4]$/.test(e.key)) setMoon(K.PHASES[+e.key - 1].elong);
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && picked.moon) {
      e.preventDefault(); const step = e.key === 'ArrowRight' ? 1 : -1, now = picked.time ? mod(S.t, 24) : 12;
      const i = Math.floor(now / 6 + 1e-9), exact = Math.abs(now - i * 6) < 1e-6, n = step > 0 ? (i + 1) % 4 : (exact ? i + 3 : i) % 4; setTime(K.TIMES[n]);
    }
    else if (e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); S.view === 'first' ? exit() : enter(); }
    else if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); setPlaying(!playing); }
  });

  // 以 ?moon=90&time=18&view=first&mode=projection 直接開啟
  const q = new URLSearchParams(location.search), qm = parseFloat(q.get('moon')), qt = parseFloat(q.get('time'));
  if (q.get('way') === 'slider') S.way = 'slider';
  if (Number.isFinite(qm)) setMoon(qm, false);
  if (Number.isFinite(qt) && picked.moon) setTime(qt, false);
  if (S.way === 'slider') setWay('slider');
  setMode(['study', 'projection'].includes(q.get('mode')) ? q.get('mode') : 'free');
  if (q.get('view') === 'first' && picked.moon && picked.time && modeName !== 'study') { lookAt('moon'); k = 1; kA = 1; S.view = 'first'; }
  addEventListener('resize', kick);
  syncUI(); kick();
  window.MoonPhaseDebug = { S, get k() { return k; }, enter, exit, setMoon, setTime, look };
})();
