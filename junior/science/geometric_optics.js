(function () {
  'use strict';
  const G = window.GeometricOptics, L = window.ScienceLab, $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const rad = d => d * Math.PI / 180;
  const n2 = value => Number(value.toFixed(2));
  const fx = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
  const deg = v => `${fx(Math.abs(v))}°`;
  const sideText = t => `${deg(t)}${t > 0.01 ? '（雷射在左）' : t < -0.01 ? '（雷射在右）' : ''}`;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = $('optics');

  // ---------- 色彩 ----------
  const COLORS = { parallel: '#b87517', central: '#287eae', focal: '#895bb0', curvature: '#32847a', fan: '#c0567a', laser: '#14984a', incid: '#9a5b00', refr: '#0d7a6e', crit: '#d13a2f', glance: '#7c3aed', normal: '#6b7f92' };

  // ---------- 主題設定 ----------
  const TOPICS = {
    reflection: { title: '光的反射', ops: 'reflection', badge: '反射定律',
      caption: '綠色雷射射向鏡面。拖曳雷射（或用滑桿）改變入射角，比較入射角與反射角。',
      tip: '試試看：把入射角從 0° 慢慢加大，反射角會一直跟著它嗎？再切到「粗糙表面」看看。' },
    refraction: { title: '光的折射', ops: 'refraction', badge: '折射與全反射',
      caption: '選擇上下兩種介質，拖曳雷射改變入射角：觀察折射光偏向或偏離法線，並找出全反射。',
      tip: '試試看：上方選「玻璃」、下方選「空氣」，加大入射角，看折射光什麼時候消失。' },
    mirror: { title: '面鏡成像', ops: 'imaging', optics: ['plane-mirror', 'concave-mirror', 'convex-mirror'],
      tip: '試試看：先用平面鏡比較物距與像距；再選凹面鏡，把物體從 3f 拖向鏡子，越過 F 時像怎麼變？' },
    lens: { title: '透鏡成像', ops: 'imaging', optics: ['convex-lens', 'concave-lens'],
      tip: '試試看：把物體放在 2F 外，打開光屏，把光屏拖到接得到清晰像的位置。' }
  };
  const TOPIC_KEYS = Object.keys(TOPICS);
  const DEF = {
    refl: { theta: 35, rough: false, angles: true, protractor: true, glancing: false, normals: true },
    refr: { view: 'ray', n1: 'air', n2: 'glass', theta: 40, angles: true, protractor: true, critical: true, eye: 2.2, extension: true },
    img: { distance: 3, screen: 2, snap: true, extensions: true, showImage: true, showScreen: false, showPQ: true,
      rays: { parallel: true, central: true, focal: false, curvature: false, fan: false } }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const state = { topic: 'reflection', mode: 'free', optic: { mirror: 'concave-mirror', lens: 'convex-lens' }, playing: !reduced.matches,
    tipClosed: {}, refl: clone(DEF.refl), refr: clone(DEF.refr), img: clone(DEF.img) };
  const imaging = () => TOPICS[state.topic].ops === 'imaging';
  const typeNow = () => state.optic[state.topic];
  const opticNow = () => G.TYPES[typeNow()];
  const isPlane = () => typeNow() === 'plane-mirror';
  const unit = () => (isPlane() ? ' 格' : 'f');
  const ROUGH_MAX = 50;
  const reflTheta = () => (state.refl.rough ? clamp(state.refl.theta, -ROUGH_MAX, ROUGH_MAX) : state.refl.theta);

  // ---------- SVG 小工具 ----------
  const P = (x, y) => `${n2(x)},${n2(y)}`;
  const seg = (a, b) => `M${P(a.x, a.y)}L${P(b.x, b.y)}`;
  const add = (a, v, k = 1) => ({ x: a.x + v.x * k, y: a.y + v.y * k });
  const unitV = (deg0, up = true) => ({ x: Math.sin(rad(deg0)), y: up ? -Math.cos(rad(deg0)) : Math.cos(rad(deg0)) });
  function arcBetween(c, r, v1, v2, color, width = 3) {
    const a = add(c, v1, r), b = add(c, v2, r), cross = v1.x * v2.y - v1.y * v2.x;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 2) return '';
    return `<path d="M${P(a.x, a.y)}A${r},${r} 0 0 ${cross > 0 ? 1 : 0} ${P(b.x, b.y)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  }
  function tag(x, y, text, color, anchor = 'middle') {
    return `<text class="label tag" x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" style="fill:${color}">${text}</text>`;
  }
  function bisectLabel(c, r, v1, v2, text, color) {
    const m = { x: v1.x + v2.x, y: v1.y + v2.y }, len = Math.hypot(m.x, m.y) || 1;
    const u = { x: m.x / len, y: m.y / len }, p = add(c, u, r);
    return tag(p.x, p.y + 7, text, color, u.x < -0.12 ? 'end' : u.x > 0.12 ? 'start' : 'middle');
  }
  function mid(a, b, t = .55) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  function dirArrow(a, b, colorId, index) {
    if (Math.hypot(b.x - a.x, b.y - a.y) < 30) return '';
    return `<path data-direction="${index}" d="${seg(mid(a, b, .5), mid(a, b, .56))}" fill="none" stroke="${COLORS[colorId]}" stroke-width="2.5" marker-end="url(#tip-${colorId})"/>`;
  }
  function light(a, b, colorId, index, phase, style = '') {
    return `<path data-light="${index}" ${phase === undefined ? '' : `data-phase="${phase}"`} class="ray" d="${seg(a, b)}" stroke="${COLORS[colorId]}" style="${style}"/><circle data-photon="${index}" class="photon" r="6" fill="${COLORS[colorId]}"/>` + dirArrow(a, b, colorId, index);
  }
  function defs() {
    let s = '<defs><pattern id="grid" width="110" height="110" patternUnits="userSpaceOnUse" x="60" y="80"><path d="M110,0H0V110" fill="none" stroke="#e6edf3" stroke-width="1"/></pattern>';
    for (const [id, color] of Object.entries(COLORS)) s += `<marker id="tip-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1L9,5L0,9" fill="none" stroke="${color}" stroke-width="1.7"/></marker>`;
    return s + '<radialGradient id="coin" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffe9a3"/><stop offset="1" stop-color="#c8901d"/></radialGradient></defs>';
  }
  function protractor(c, r, full) {
    let s = `<g class="protractor" aria-hidden="true"><path d="M${c.x - r},${c.y}A${r},${r} 0 0 1 ${c.x + r},${c.y}${full ? `A${r},${r} 0 0 1 ${c.x - r},${c.y}` : 'Z'}" fill="#ffffff" fill-opacity=".45" stroke="#9fb2c3" stroke-width="1.5"/>`;
    for (const up of full ? [true, false] : [true]) for (let a = -90; a <= 90; a += 5) {
      const v = unitV(a, up), len = a % 30 === 0 ? 16 : a % 10 === 0 ? 10 : 5;
      s += `<path d="${seg(add(c, v, r), add(c, v, r - len))}" stroke="#8ea3b6" stroke-width="${a % 10 === 0 ? 1.6 : 1}"/>`;
      if (a % 30 === 0 && Math.abs(a) < 90) { const t = add(c, v, r + 15); s += `<text class="tick" x="${n2(t.x)}" y="${n2(t.y + 5)}" text-anchor="middle">${Math.abs(a)}°</text>`; }
    }
    return s + '</g>';
  }
  function laserBody(pos, theta, up = true) {
    // 雷射筆軸線指向入射點；rotate(-θ) 讓朝下的筆身轉向 (sinθ, cosθ)。
    const rot = up ? -theta : 180 + theta;
    return `<g id="laser-handle" class="handle laser" tabindex="0" role="slider" aria-label="雷射入射角：左右鍵沿圓弧移動，上鍵靠向法線、下鍵遠離法線；按住 Shift 每次 5°" aria-valuemin="-85" aria-valuemax="85" aria-valuenow="${n2(theta)}" aria-valuetext="入射角 ${fx(Math.abs(theta))} 度，雷射在法線${theta >= 0 ? '左' : '右'}側" transform="translate(${P(pos.x, pos.y)}) rotate(${n2(rot)})"><circle class="hit-area" r="52"/><rect x="-14" y="-68" width="28" height="74" rx="9" fill="#2f3b48"/><rect x="-14" y="-68" width="28" height="16" rx="6" fill="#56687a"/><rect x="-8" y="2" width="16" height="9" rx="2" fill="${COLORS.laser}"/><circle cx="0" cy="-30" r="4" fill="#9ae6b4"/></g>`;
  }

  // ---------- 動畫 ----------
  let frame = 0, elapsed = 0, lastTick = null, animated = [], drag = null, restartNext = true, guide = null;
  function revealEnd() { return animated.some(a => a.phase !== undefined) ? 1800 : Math.max(0, animated.length - 1) * 850 + 1400; }
  function drawFrame() {
    animated.forEach((ray, i) => {
      let progress, pos = null;
      if (ray.phase !== undefined) {
        const start = ray.phase * 900; progress = clamp((elapsed - start) / 900);
        if (state.playing && elapsed >= start) { const local = (elapsed % 1800) - start; if (local >= 0 && local < 900) pos = local / 900; }
      } else {
        progress = clamp((elapsed - i * 850) / 1400);
        if (state.playing && progress > 0) pos = progress < 1 ? progress : ((elapsed - i * 850 - 1400) % 3200) / 3200;
      }
      ray.path.style.strokeDasharray = `${ray.length} ${ray.length}`;
      ray.path.style.strokeDashoffset = ray.length * (1 - progress);
      ray.arrows.forEach(a => { a.style.opacity = progress >= 1 ? 1 : 0; });
      if (ray.extension) ray.extension.style.opacity = progress >= 1 ? '' : '0';
      if (!ray.dot) return;
      ray.dot.style.display = pos === null ? 'none' : '';
      if (pos !== null) { const p = ray.path.getPointAtLength(Math.max(0, pos) * ray.length); ray.dot.setAttribute('cx', p.x); ray.dot.setAttribute('cy', p.y); }
    });
  }
  function tick(time) {
    frame = 0;
    if (!state.playing || document.hidden) { lastTick = null; return; }
    if (lastTick !== null) elapsed += Math.min(time - lastTick, 100);
    lastTick = time; drawFrame(); frame = requestAnimationFrame(tick);
  }
  function run() { if (state.playing && !frame) frame = requestAnimationFrame(tick); }
  function setPlaying(on) {
    state.playing = on; lastTick = null;
    if (!on && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (!on) elapsed = Math.max(elapsed, 10000);
    $('play').textContent = on ? '暫停光線動畫' : '播放光線動畫'; $('play').setAttribute('aria-pressed', String(on));
    drawFrame(); run();
  }

  // ---------- 場景：光的反射 ----------
  const RP = { x: 500, y: 440 };
  function sceneReflection() {
    const S = state.refl, theta = reflTheta(), d = { x: Math.sin(rad(theta)), y: Math.cos(rad(theta)) };
    let s = '<rect width="1000" height="600" fill="url(#grid)"/>';
    if (S.protractor && !S.rough) s += protractor(RP, 178, false);
    s += `<path d="M${RP.x},${RP.y}V105" class="normal-line"/><text class="small-label" x="${RP.x}" y="92" text-anchor="middle">法線</text>`;
    let hatch = '';
    for (let x = 120; x <= 880; x += 24) hatch += `<path d="M${x},${RP.y + 6}l-14,18" stroke="#9fb0bf" stroke-width="2"/>`;
    if (!S.rough) {
      const laser = add(RP, d, -300), out = { x: d.x, y: -d.y }, end = add(RP, out, 335);
      s += hatch + `<path d="M110,${RP.y}H890" stroke="#6d8aa3" stroke-width="7" stroke-linecap="round"/><text class="small-label" x="880" y="${RP.y + 52}" text-anchor="end">平面鏡（光滑）</text>`;
      s += light(laser, RP, 'laser', 0, 0, 'stroke-width:5px') + light(RP, end, 'laser', 1, 1, 'stroke-width:5px');
      const up = { x: 0, y: -1 }, toLaser = { x: -d.x, y: -d.y };
      if (S.angles && Math.abs(theta) > 0.4) {
        s += arcBetween(RP, 96, up, toLaser, COLORS.incid) + arcBetween(RP, 96, up, out, COLORS.incid);
        s += bisectLabel(RP, 128, up, toLaser, `i ${deg(theta)}`, COLORS.incid) + bisectLabel(RP, 128, up, out, `r ${deg(theta)}`, COLORS.incid);
      } else if (S.angles) s += tag(RP.x + 70, RP.y - 140, 'i ＝ r ＝ 0°', COLORS.incid);
      if (S.glancing && Math.abs(theta) > 0.4) {
        const side = { x: theta > 0 ? -1 : 1, y: 0 };
        s += arcBetween(RP, 150, side, toLaser, COLORS.glance, 3) + bisectLabel(RP, 188, side, toLaser, `與鏡面夾 ${deg(90 - Math.abs(theta))}`, COLORS.glance);
      }
      s += tag(end.x + (out.x > 0 ? -10 : 10), Math.max(28, end.y - 14), '反射光', COLORS.laser, out.x > 0 ? 'end' : 'start');
      s += laserBody(laser, theta);
    } else {
      const offsets = [-3, -2, -1, 0, 1, 2, 3], spots = G.diffuse(theta, offsets);
      let surface = `M110,${RP.y}`; const bits = [];
      spots.forEach((p, i) => {
        const hit = { x: RP.x + p.x * 52, y: RP.y }, tan = { x: Math.cos(rad(p.tilt)), y: Math.sin(rad(p.tilt)) };
        const a = add(hit, tan, -23), b = add(hit, tan, 23); surface += `L${P(a.x, a.y)}L${P(b.x, b.y)}`;
        const start = add(hit, d, -330), outS = { x: p.reflected.x, y: -p.reflected.y }, end = add(hit, outS, 290);
        const w = i === 3 ? 'stroke-width:4.5px' : 'stroke-width:2.5px;stroke-opacity:.7';
        bits.push(light(start, hit, 'laser', i, 0, w) + light(hit, end, 'laser', i + offsets.length, 1, w));
        if (S.normals) {
          const nS = { x: p.normal.x, y: -p.normal.y };
          bits.push(`<path d="${seg(hit, add(hit, nS, 78))}" class="normal-line thin"/>`);
          if (i === 3 && S.angles) {
            const toSrc = { x: -d.x, y: -d.y };
            bits.push(arcBetween(hit, 58, nS, toSrc, COLORS.incid, 2.5) + arcBetween(hit, 58, nS, outS, COLORS.incid, 2.5));
            bits.push(bisectLabel(hit, 86, nS, toSrc, deg(p.angle), COLORS.incid) + bisectLabel(hit, 86, nS, outS, deg(p.angle), COLORS.incid));
          }
        }
      });
      surface += `L890,${RP.y}`;
      s += hatch + `<path d="${surface}" fill="none" stroke="#7e8f9f" stroke-width="6" stroke-linejoin="round"/><text class="small-label" x="880" y="${RP.y + 52}" text-anchor="end">粗糙表面（放大示意）</text>` + bits.join('');
      s += laserBody(add(RP, d, -330), theta);
      if (Math.abs(state.refl.theta) > ROUGH_MAX) s += tag(500, 40, `粗糙表面示範把入射角限制在 ${ROUGH_MAX}° 以內`, COLORS.crit);
    }
    return s;
  }

  // ---------- 場景：光的折射（雷射） ----------
  const FP = { x: 500, y: 300 };
  const medium = key => G.MEDIA[key];
  const speedText = n => `${(3 / n).toFixed(2)}×10⁸ m/s`;
  function mediumBands(top, bottom, interfaceY) {
    const a = medium(top), b = medium(bottom);
    return `<rect width="1000" height="${interfaceY}" fill="${a.tint}"/><rect y="${interfaceY}" width="1000" height="${600 - interfaceY}" fill="${b.tint}"/><rect width="1000" height="600" fill="url(#grid)" opacity=".7"/><path d="M0,${interfaceY}H1000" stroke="#7d93a8" stroke-width="2.5"/>`;
  }
  function mediumLabels(interfaceY) {
    const a = medium(state.refr.n1), b = medium(state.refr.n2);
    return `<text class="medium-label" x="18" y="34">${a.name}　n₁ = ${a.n.toFixed(2)}　光速 ${speedText(a.n)}</text><text class="medium-label" x="18" y="${interfaceY + 34}">${b.name}　n₂ = ${b.n.toFixed(2)}　光速 ${speedText(b.n)}</text>`;
  }
  function sceneRefraction() {
    const S = state.refr, a = medium(S.n1), b = medium(S.n2), theta = S.theta, r = G.refract(a.n, b.n, theta);
    const d = { x: Math.sin(rad(theta)), y: Math.cos(rad(theta)) }, laser = add(FP, d, -255);
    let s = mediumBands(S.n1, S.n2, FP.y);
    if (S.protractor) s += protractor(FP, 168, true);
    s += `<path d="M${FP.x},26V586" class="normal-line"/><text class="small-label" x="${FP.x + 10}" y="20">法線</text>`;
    const up = { x: 0, y: -1 }, down = { x: 0, y: 1 }, toLaser = { x: -d.x, y: -d.y }, reflDir = { x: d.x, y: -d.y };
    if (S.critical && r.critical !== null) {
      const sgn = theta >= 0 ? 1 : -1, cv = { x: -sgn * Math.sin(rad(r.critical)), y: -Math.cos(rad(r.critical)) }, cEnd = add(FP, cv, 236);
      s += `<path d="${seg(FP, cEnd)}" stroke="${COLORS.crit}" stroke-width="2" stroke-dasharray="7 6"/>` + tag(cEnd.x + (sgn > 0 ? 8 : -8), cEnd.y - 8, `臨界角 θc＝${deg(r.critical)}`, COLORS.crit, sgn > 0 ? 'start' : 'end');
    }
    const width = k => `stroke-width:${n2(1.5 + 4 * Math.sqrt(k))}px;stroke-opacity:${n2(0.18 + 0.82 * Math.sqrt(k))}`;
    const rEnd = add(FP, reflDir, 290);
    s += light(laser, FP, 'laser', 0, 0, 'stroke-width:5.5px') + light(FP, rEnd, 'laser', 1, 1, width(r.R));
    s += tag(rEnd.x + (reflDir.x >= 0 ? -6 : 6), rEnd.y - 14, `反射光 ${(r.R * 100).toFixed(1)}%`, COLORS.laser, reflDir.x >= 0 ? 'end' : 'start');
    let refrDir = null;
    if (!r.total) {
      refrDir = { x: Math.sin(rad(r.refraction)), y: Math.cos(rad(r.refraction)) };
      const tEnd = add(FP, refrDir, 300);
      s += light(FP, tEnd, 'laser', 2, 1, width(r.T)) + tag(tEnd.x + (refrDir.x >= 0 ? -8 : 8), Math.min(tEnd.y + 26, 560), `折射光 ${(r.T * 100).toFixed(1)}%`, COLORS.laser, refrDir.x >= 0 ? 'end' : 'start');
    } else s += tag(FP.x + (theta >= 0 ? 24 : -24), FP.y + 70, '全反射：沒有折射光', COLORS.crit, theta >= 0 ? 'start' : 'end');
    if (S.angles && Math.abs(theta) > 0.4) {
      s += arcBetween(FP, 92, up, toLaser, COLORS.incid) + arcBetween(FP, 92, up, reflDir, COLORS.incid);
      s += bisectLabel(FP, 124, up, toLaser, `θ₁ ${deg(theta)}`, COLORS.incid) + bisectLabel(FP, 124, up, reflDir, `θ₁′ ${deg(theta)}`, COLORS.incid);
      if (refrDir) s += arcBetween(FP, 104, down, refrDir, COLORS.refr) + bisectLabel(FP, 140, down, refrDir, `θ₂ ${deg(r.refraction)}`, COLORS.refr);
    }
    s += mediumLabels(FP.y) + laserBody(laser, theta);
    return s;
  }

  // ---------- 場景：看水中硬幣（視深） ----------
  const DK = 95, DY = 262, COIN = { x: 0, y: -2 }, EYE_Y = 2.0;
  const dx = x => 500 + x * DK, dy = y => DY - y * DK, dp = p => ({ x: dx(p.x), y: dy(p.y) });
  function depthView(spread) {
    const a = medium(state.refr.n1), b = medium(state.refr.n2);
    return G.apparent(a.n, b.n, COIN, { x: state.refr.eye, y: EYE_Y }, spread);
  }
  function sceneDepth() {
    const S = state.refr, view = depthView(0.32), exact = depthView();
    let s = mediumBands(S.n1, S.n2, DY) + `<path d="M0,${dy(-2.12)}H1000V600H0Z" fill="#e8dcc0"/><path d="M0,${dy(-2.12)}H1000" stroke="#c4b48f" stroke-width="2"/>`;
    const coin = dp(COIN), eye = dp({ x: S.eye, y: EYE_Y });
    view.paths.forEach((path, i) => {
      const sp = dp(path.surface), e = dp(path.eye);
      s += light(coin, sp, 'laser', i * 2, 0, 'stroke-width:3px') + light(sp, e, 'laser', i * 2 + 1, 1, 'stroke-width:3px');
      if (S.extension && view.image) s += `<path data-extension="${i * 2 + 1}" class="extension" d="${seg(sp, dp(view.image))}" stroke="${COLORS.laser}"/>`;
    });
    const nx = dx(exact.surface.x);
    s += `<path d="M${n2(nx)},${DY - 120}V${DY + 120}" class="normal-line thin"/>`;
    s += `<ellipse cx="${n2(coin.x)}" cy="${n2(coin.y)}" rx="30" ry="10" fill="url(#coin)" stroke="#9c6b10" stroke-width="2"/>` + tag(coin.x, coin.y + 38, '實際的硬幣', '#7a520c');
    if (exact.image) {
      const im = dp(exact.image);
      s += `<ellipse cx="${n2(im.x)}" cy="${n2(im.y)}" rx="30" ry="10" fill="#f5d27a" fill-opacity=".35" stroke="#b07d15" stroke-width="2" stroke-dasharray="6 4"/>` + tag(im.x + (S.eye >= 0 ? 40 : -40), im.y + 34, '看到的硬幣（虛像）', '#8a5d0c', S.eye >= 0 ? 'start' : 'end');
      const rx = S.eye >= 0 ? 210 : 790;
      s += `<path d="M${rx},${DY}V${n2(coin.y)}M${rx - 8},${n2(coin.y)}h16M${rx - 8},${DY}h16" stroke="#7a520c" stroke-width="2"/><text class="small-label" x="${rx + (S.eye >= 0 ? 14 : -14)}" y="${n2((DY + coin.y) / 2 + 6)}" text-anchor="${S.eye >= 0 ? 'start' : 'end'}">實際 ${(-COIN.y).toFixed(2)} 格</text>`;
      const rx2 = rx + (S.eye >= 0 ? 110 : -110);
      s += `<path d="M${rx2},${DY}V${n2(im.y)}M${rx2 - 8},${n2(im.y)}h16" stroke="#b07d15" stroke-width="2" stroke-dasharray="5 4"/><text class="small-label" x="${rx2 + (S.eye >= 0 ? 14 : -14)}" y="${n2((DY + im.y) / 2 + 6)}" text-anchor="${S.eye >= 0 ? 'start' : 'end'}">看起來 ${(-exact.image.y).toFixed(2)} 格</text>`;
    }
    const look = Math.atan2(dp(exact.surface).y - eye.y, dp(exact.surface).x - eye.x) * 180 / Math.PI;
    s += `<g id="eye-handle" class="handle eye" tabindex="0" role="slider" aria-label="眼睛位置，左右鍵移動" aria-valuemin="-3.6" aria-valuemax="3.6" aria-valuenow="${n2(S.eye)}" aria-valuetext="眼睛在 ${fx(S.eye, 2)} 格"><circle class="hit-area" cx="${n2(eye.x)}" cy="${n2(eye.y)}" r="50"/><g transform="translate(${P(eye.x, eye.y)}) rotate(${n2(look)})"><path d="M-30,0Q0,-24 30,0Q0,24 -30,0Z" fill="#fff" stroke="#2f3b48" stroke-width="3"/><circle cx="8" r="9" fill="#2f5d86"/><circle cx="10" r="4" fill="#0f1720"/></g><text class="small-label" x="${n2(eye.x)}" y="${n2(eye.y - 36)}" text-anchor="middle">眼睛 ↔ 拖曳</text></g>`;
    s += mediumLabels(DY);
    return s;
  }

  // ---------- 場景：面鏡與透鏡成像 ----------
  const bounds = { xMin: -4.4, xMax: 4.4, yMin: -2.5, yMax: 2.5 };
  const sx = x => 500 + x * 110, sy = y => 300 - y * 110;
  const point = p => `${n2(sx(p.x))},${n2(sy(p.y))}`;
  const line = pts => (pts ? `M${point(pts[0])}L${point(pts[1])}` : '');
  function annotation(x, text, y = -0.32) { return `<circle cx="${sx(x)}" cy="300" r="4" fill="#637b91"/><text class="label" x="${sx(x)}" y="${sy(y)}" text-anchor="middle">${text}</text>`; }
  function arrow(x, y, color, dashed = false) {
    const px = sx(x), py = sy(y), sign = y >= 0 ? 1 : -1;
    return `<path d="M${px},300V${py}" stroke="${color}" stroke-width="7" ${dashed ? 'stroke-dasharray="9 5"' : ''}/><path d="M${px - 11},${py + 18 * sign}L${px},${py}L${px + 11},${py + 18 * sign}" fill="none" stroke="${color}" stroke-width="6" stroke-linejoin="round"/>`;
  }
  function opticalElement(optic) {
    if (!optic.mirror) {
      const shape = optic.f > 0 ? 'M500,140Q542,300 500,460Q458,300 500,140Z' : 'M478,140Q502,300 478,460L522,460Q498,300 522,140Z';
      return `<path d="${shape}" fill="#cce7f2" fill-opacity=".75" stroke="#527d96" stroke-width="3"/><circle cx="500" cy="300" r="4" fill="#527d96"/><text class="label" x="510" y="330">O</text>`;
    }
    const control = Number.isFinite(optic.f) ? (optic.f > 0 ? 534 : 466) : 500;
    let hatch = '';
    for (let y = 152; y <= 448; y += 22) { const t = (y - 140) / 320, x = 500 + 2 * (control - 500) * t * (1 - t); hatch += `<path d="M${x + 3},${y}l13,-8" stroke="#8ca0b1" stroke-width="2"/>`; }
    return `${hatch}<path d="M500,140Q${control},300 500,460" fill="none" stroke="#527d96" stroke-width="6"/><circle cx="500" cy="300" r="4" fill="#527d96"/><text class="label" x="510" y="330">V</text><text class="small-label" x="500" y="122" text-anchor="middle">反射面朝左</text>`;
  }
  function dimension(x1, x2, y, text, color) {
    const a = clamp(x1, bounds.xMin, bounds.xMax), b = clamp(x2, bounds.xMin, bounds.xMax);
    if (Math.abs(sx(a) - sx(b)) < 8) return '';
    return `<g class="dimension"><path d="M${sx(a)},${y}H${sx(b)}M${sx(a)},${y - 8}v16M${sx(b)},${y - 8}v16" stroke="${color}" stroke-width="2"/><text class="small-label" x="${n2((sx(a) + sx(b)) / 2)}" y="${y - 9}" text-anchor="middle" style="fill:${color}">${text}</text></g>`;
  }
  function sceneImaging(im) {
    const S = state.img, type = typeNow();
    let svg = '<rect width="1000" height="600" fill="url(#grid)"/><path d="M16,300H984" stroke="#9caebe" stroke-width="2"/><text class="small-label" x="975" y="284" text-anchor="end">主軸</text>';
    if (isPlane()) for (let k = -4; k <= 4; k++) { if (k) svg += `<path d="M${sx(k)},294v12" stroke="#8ea3b6" stroke-width="2"/><text class="tick" x="${sx(k)}" y="326" text-anchor="middle">${Math.abs(k)}</text>`; }
    else if (im.optic.mirror) { const f = -im.optic.f; svg += annotation(f, 'F') + annotation(2 * f, 'C（2F）'); if (im.optic.f < 0) svg += '<text class="small-label" x="720" y="565" text-anchor="middle">鏡後：虛焦點與虛像所在側</text>'; }
    else svg += annotation(-1, 'F') + annotation(-2, '2F') + annotation(1, 'F′') + annotation(2, '2F′');
    svg += `<text class="small-label" x="500" y="592" text-anchor="middle">固定比例尺 · 每一大格為 ${isPlane() ? '1 格' : '1f'}</text>`;
    if (S.rays.fan) for (const ray of G.fan(type, S.distance)) {
      svg += `<path class="fan-ray" d="${line(G.clip(ray.source, { x: -ray.source.x, y: ray.hit.y - ray.source.y }, bounds, 0, 1))}${line(G.clip(ray.hit, ray.vector, bounds))}" stroke="${COLORS.fan}"/>`;
      if (im.finite && !im.real && S.extensions) svg += `<path class="extension fan-ext" d="${line(G.clip(ray.hit, { x: -ray.vector.x, y: -ray.vector.y }, bounds, 0, -im.q))}" stroke="${COLORS.fan}"/>`;
    }
    let index = 0;
    for (const ray of G.rays(type, S.distance).filter(r => S.rays[r.id])) {
      const incoming = G.clip(ray.source, { x: -ray.source.x, y: ray.hit.y - ray.source.y }, bounds, 0, 1), outgoing = G.clip(ray.hit, ray.vector, bounds);
      const d = line(incoming) + line(outgoing); if (!d) continue;
      const color = COLORS[ray.id];
      svg += `<path data-light="${index}" class="ray" d="${d}" stroke="${color}"/><circle data-photon="${index}" class="photon" r="6" fill="${color}"/>`;
      for (const part of [incoming, outgoing].filter(Boolean)) {
        const [a, b] = part, p = { x: a.x + (b.x - a.x) * .55, y: a.y + (b.y - a.y) * .55 }, tail = { x: a.x + (b.x - a.x) * .5, y: a.y + (b.y - a.y) * .5 };
        if (Math.hypot(b.x - a.x, b.y - a.y) > .15) svg += `<path data-direction="${index}" d="${line([tail, p])}" fill="none" stroke="${color}" stroke-width="2.5" marker-end="url(#tip-${ray.id})"/>`;
      }
      if (im.finite && !im.real && S.extensions) svg += `<path data-extension="${index}" class="extension" d="${line(G.clip(ray.hit, { x: -ray.vector.x, y: -ray.vector.y }, bounds, 0, -im.q))}" stroke="${color}"/>`;
      index++;
    }
    svg += opticalElement(im.optic);
    if (S.showImage && im.finite && im.x >= bounds.xMin && im.x <= bounds.xMax) {
      const y = clamp(im.y, bounds.yMin + .12, bounds.yMax - .12);
      svg += arrow(im.x, y, '#278264', !im.real) + `<text class="label" x="${sx(im.x)}" y="${sy(y) + (y >= 0 ? -15 : 32)}" text-anchor="middle">${im.real ? '實像' : '虛像'}${y !== im.y ? '（超出畫面）' : ''}</text>`;
    }
    if (S.showPQ) {
      svg += dimension(-S.distance, 0, 520, `p＝${S.distance.toFixed(2)}${unit()}`, '#287eae');
      if (S.showImage && im.finite) svg += dimension(0, im.x, 556, `${im.real ? 'q' : '|q|'}＝${Math.abs(im.q).toFixed(2)}${unit()}${im.real ? '' : '（虛像）'}`, '#278264');
    }
    if (S.showScreen) {
      const px = sx(S.screen), status = G.screen(type, S.distance, S.screen);
      svg += `<g id="screen-handle" class="handle" tabindex="0" role="slider" aria-label="光屏位置，負值在左側，正值在右側" aria-valuemin="-4" aria-valuemax="4" aria-valuenow="${n2(S.screen)}" aria-valuetext="${n2(S.screen)} ${isPlane() ? '格' : '倍焦距'}"><rect class="hit-area" x="${px - 32}" y="73" width="64" height="420" rx="20"/><rect x="${px - 6}" y="90" width="12" height="390" fill="${status.sharp ? '#79b8a3' : '#bdcbd8'}" fill-opacity=".45" stroke="#738b9e" stroke-width="2"/><rect x="${px - 28}" y="476" width="56" height="20" rx="6" fill="#738b9e"/><text class="label" x="${px}" y="65" text-anchor="middle">光屏 ↔</text></g>`;
    }
    svg += `<g id="object-handle" class="handle" tabindex="0" role="slider" aria-label="物距" aria-valuemin="0.25" aria-valuemax="4" aria-valuenow="${n2(S.distance)}" aria-valuetext="${n2(S.distance)} ${isPlane() ? '格' : '倍焦距'}"><rect class="hit-area" x="${sx(-S.distance) - 40}" y="${sy(G.HEIGHT) - 30}" width="80" height="155" rx="20"/>${arrow(-S.distance, G.HEIGHT, '#287eae')}<rect x="${sx(-S.distance) - 25}" y="300" width="50" height="20" rx="6" fill="#287eae"/><text class="label" x="${sx(-S.distance)}" y="${sy(G.HEIGHT) - 17}" text-anchor="middle">物體</text><text class="small-label" x="${sx(-S.distance)}" y="369" text-anchor="middle">↔ 拖曳</text></g>`;
    return svg;
  }

  function renderScene(im) {
    const focusId = scene.contains(document.activeElement) ? document.activeElement.id : null;
    let body;
    if (state.topic === 'reflection') body = sceneReflection();
    else if (state.topic === 'refraction') body = state.refr.view === 'ray' ? sceneRefraction() : sceneDepth();
    else body = sceneImaging(im);
    scene.setAttribute('viewBox', state.topic === 'reflection' ? '0 70 1000 450' : '0 0 1000 600');
    scene.innerHTML = defs() + body;
    if (focusId && !drag) $(focusId)?.focus({ preventScroll: true });
    animated = [...scene.querySelectorAll('[data-light]')].map(path => ({ path, length: path.getTotalLength(), phase: path.dataset.phase === undefined ? undefined : +path.dataset.phase,
      dot: scene.querySelector(`[data-photon="${path.dataset.light}"]`), arrows: [...scene.querySelectorAll(`[data-direction="${path.dataset.light}"]`)], extension: scene.querySelector(`[data-extension="${path.dataset.light}"]`) }));
    if (restartNext) elapsed = state.playing ? 0 : 10000;
    else if (elapsed < revealEnd()) elapsed = revealEnd();
    restartNext = false; lastTick = null;
    drawFrame();
  }

  // ---------- 側欄文字 ----------
  const row = (term, value, note = '') => `<dt>${term}</dt><dd>${value}${note ? `<small>${note}</small>` : ''}</dd>`;
  function readings(im) {
    if (state.topic === 'reflection') {
      const S = state.refl, t = reflTheta();
      if (!S.rough) return row('入射角 i', deg(t), '入射光與法線的夾角') + row('反射角 r', deg(t), 'r ＝ i') + row('入射光與鏡面的夾角', deg(90 - Math.abs(t)), '＝ 90° − i，不是入射角') + row('反射方式', '單向反射', '平行光反射後仍平行');
      const spots = G.diffuse(t, [-3, -2, -1, 0, 1, 2, 3]);
      return row('平行光的入射角（對整片表面）', deg(t)) + row('各點的入射角＝反射角', spots.map(p => deg(p.angle)).join('、'), '每一點都對自己的法線量起') + row('反射方式', '漫射', '各點法線方向不同，反射光散開');
    }
    if (state.topic === 'refraction') {
      const S = state.refr, a = medium(S.n1), b = medium(S.n2);
      if (S.view === 'depth') {
        const v = depthView(), depth = v.image ? -v.image.y : 2;
        return row('實際深度', '2.00 格') + row('看起來的深度', `${depth.toFixed(2)} 格`, depth < 2 - 1e-3 ? '比實際淺' : depth > 2 + 1e-3 ? '比實際深' : '和實際一樣') + row('深度比', (depth / 2).toFixed(2), `正上方往下看時 ≈ n₁ ÷ n₂ ＝ ${(a.n / b.n).toFixed(2)}`) + row('眼睛位置', `${fx(S.eye, 2)} 格`, '越斜著看，像越淺');
      }
      const r = G.refract(a.n, b.n, S.theta);
      return row('入射角 θ₁', deg(S.theta)) + row('反射角 θ₁′', deg(S.theta), '反射定律：θ₁′ ＝ θ₁') +
        row('折射角 θ₂', r.total ? '沒有折射光' : deg(r.refraction), r.total ? '全反射' : r.toward === 'toward' ? '偏向法線（θ₂ ＜ θ₁）' : r.toward === 'away' ? '偏離法線（θ₂ ＞ θ₁）' : '同一種介質，不偏折') +
        row('臨界角 θc', r.critical === null ? '無' : deg(r.critical), r.critical === null ? '光由光速慢射向光速快時才有' : '入射角超過它就全反射') +
        row('反射光／折射光', `${(r.R * 100).toFixed(1)}%／${(r.T * 100).toFixed(1)}%`, '兩者相加 100%') +
        row('光速 v₁、v₂', `${speedText(a.n)}、${speedText(b.n)}`, 'v ＝ c ÷ n');
    }
    const optic = im.optic, plane = isPlane();
    let s = row('器材', `${optic.name}（${optic.group}）`, optic.use) + row('焦距 f', plane ? '∞（不會聚也不發散）' : `${optic.f > 0 ? '' : '−'}1 格`, plane ? '' : optic.f > 0 ? '實焦點' : '虛焦點') + row('物距 p', `${state.img.distance.toFixed(2)}${unit()}`);
    if (!state.img.showImage) return s + row('像', '先預測，再勾選「顯示像與成像結果」');
    if (!im.finite) return s + row('像距 q', '無限遠', '出射光平行，不成像');
    const where = optic.mirror ? (im.real ? '鏡前' : '鏡後') : (im.real ? '透鏡另一側' : '與物體同側');
    s += row('像距 q', `${Math.abs(im.q).toFixed(2)}${unit()}`, `${im.real ? '實像' : '虛像'}，在${where}`) + row('像高倍率', `${Math.abs(im.magnification).toFixed(2)} 倍`, im.upright ? '正立' : '倒立') + row('像的性質', `${im.upright ? '正立' : '倒立'}・${im.size}・${im.real ? '實像' : '虛像'}`);
    if (!plane) { const p = state.img.distance, q = im.q; s += row('高中延伸：1/p ＋ 1/q', `${(1 / p).toFixed(3)} ＋ (${(1 / q).toFixed(3)}) ＝ ${(1 / p + 1 / q).toFixed(3)}`, `＝ 1/f ＝ ${(1 / optic.f).toFixed(3)}（實像 q＞0、虛像 q＜0）`); }
    return s;
  }
  function status(im) {
    if (state.topic === 'reflection') {
      const t = reflTheta();
      return state.refl.rough ? '平行光打到粗糙表面，各點法線方向不同，反射光往四面八方散開（漫射）；每一點仍遵守反射定律。' : Math.abs(t) < 0.4 ? '垂直入射：入射角 0°，光沿原路反射回去。' : `反射角 ＝ 入射角 ＝ ${deg(t)}；入射光與反射光分居法線兩側。`;
    }
    if (state.topic === 'refraction') {
      const S = state.refr, a = medium(S.n1), b = medium(S.n2);
      if (S.view === 'depth') return a.n < b.n ? `光從${b.name}射入${a.name}時偏離法線；眼睛沿著反向延長線看，以為硬幣在比較淺的地方。` : a.n > b.n ? `光從${b.name}射入${a.name}時偏向法線，硬幣反而看起來比較深。` : '兩邊是同一種介質，光不偏折，看到的位置就是實際位置。';
      const r = G.refract(a.n, b.n, S.theta);
      if (r.total) return `全反射：光由${a.name}射向${b.name}，入射角 ${deg(S.theta)} 已超過臨界角 ${deg(r.critical)}，光全部反射回${a.name}。`;
      if (Math.abs(S.theta) < 0.4) return '垂直入射：光速改變但方向不變，不偏折。';
      return r.toward === 'toward' ? `進入光速較慢的${b.name}：光變慢，折射光偏向法線（θ₂ ＜ θ₁）。` : r.toward === 'away' ? `進入光速較快的${b.name}：光變快，折射光偏離法線（θ₂ ＞ θ₁）。${r.critical !== null && Math.abs(S.theta) > r.critical - 6 ? '快到臨界角了，折射光越來越暗、越來越貼近界面。' : ''}` : '上下是同一種介質：光速不變，直直前進。';
    }
    if (!state.img.showImage) return '先預測：像在哪一側？正立或倒立？放大或縮小？實像或虛像？';
    if (!im.finite) return '物體在焦點上：出射光互相平行，不形成有限距離的像。';
    return `${im.upright ? '正立' : '倒立'}、${im.size}、${im.real ? '實像' : '虛像'}；像在${im.optic.mirror ? (im.real ? '鏡前' : '鏡後') : (im.real ? '透鏡另一側' : '物體同側')}。`;
  }
  const LEGENDS = {
    reflection: `<span><i style="border-color:${COLORS.laser};border-top-width:4px"></i>雷射光</span><span><i class="dashed" style="border-color:${COLORS.normal}"></i>法線</span><span><i style="border-color:${COLORS.incid}"></i>入射角、反射角</span><span><i style="border-color:${COLORS.glance}"></i>與鏡面的夾角</span>`,
    refraction: `<span><i style="border-color:${COLORS.laser};border-top-width:4px"></i>光線（越亮光越強）</span><span><i class="dashed" style="border-color:${COLORS.normal}"></i>法線</span><span><i style="border-color:${COLORS.incid}"></i>入射角、反射角</span><span><i style="border-color:${COLORS.refr}"></i>折射角</span><span><i class="dashed" style="border-color:${COLORS.crit}"></i>臨界角</span>`,
    depth: `<span><i style="border-color:${COLORS.laser};border-top-width:4px"></i>真實光線</span><span><i class="dashed" style="border-color:${COLORS.laser}"></i>反向延長線（不是真的光）</span><span><i style="border-color:#c8901d;border-top-width:4px"></i>硬幣與看到的像</span>`,
    imaging: '<span><i class="object-key"></i>物體</span><span><i class="image-key"></i>像（虛線：虛像）</span><span><i></i>實際光路</span><span><i class="dashed"></i>反向延長線</span>'
  };
  const HOWTO = {
    reflection: '<p>入射角、反射角都是光線與<strong>法線</strong>（垂直鏡面的虛線）的夾角。拖曳雷射或按方向鍵改變入射角；量角器的 0° 就是法線。</p><p>粗糙表面是把凹凸放大畫出來的示意：每一小片表面各有自己的法線，所以平行光反射後散開。</p>',
    refraction: '<p>拖曳界面上方的雷射改變入射角。光線的粗細與亮度代表光的強弱：大部分的光折射進入另一種介質，少部分反射。</p><p>紅色虛線是臨界角；只有光從折射率大（光速慢）射向折射率小（光速快）時才會出現。「看水中硬幣」用兩條光線找出眼睛看到的像。</p>',
    imaging: '<p>同一個物點射出的光，經反射或折射後若實際會聚，就形成實像；若光線發散，而反向延長線相交，交點就是虛像。圖中的像只畫出箭頭，方便比較位置、方向與大小。</p><p>實線箭頭表示光的行進方向；虛線只是找虛像的作圖工具，沒有光沿著虛線倒退行進。關閉輔助光線不會改變成像。</p>'
  };
  const PHYSICS = {
    reflection: '<h3>反射定律</h3><ul><li>入射光、反射光與法線在同一平面上，入射光與反射光分居法線兩側。</li><li>反射角 ＝ 入射角（都由法線量起）。</li></ul><h3>單向反射與漫射</h3><p>光滑的鏡面，各點法線方向相同：平行光反射後仍然平行，所以能清楚映出影像（單向反射）。粗糙表面上各點法線方向不同，平行光反射後散向各方（漫射）。漫射仍然遵守反射定律；正因為有漫射，我們才能從各個角度看見書本、黑板等不發光的物體。</p><h3>觀察重點</h3><ul><li><strong>常見陷阱</strong>：題目說「光與鏡面夾 30°」，入射角是 90° − 30° ＝ 60°。</li><li><strong>垂直入射</strong>：入射角 0°，光沿原路反射回來。</li><li><strong>光路可逆</strong>：把雷射移到反射光的位置，光會沿原來的入射路徑反射回去。</li></ul>',
    refraction: '<h3>為什麼會折射？</h3><p>光在不同介質中的速度不同。折射率 n ＝ 真空光速 c ÷ 介質中的光速 v，n 越大光越慢。光斜射進入另一種介質時，波前先進入的一側先變慢（或變快），整個前進方向就轉彎了；垂直入射則只改變速度、不改變方向。</p><ul><li>由光速快 → 慢（空氣 → 水、玻璃）：折射光<strong>偏向</strong>法線，折射角 ＜ 入射角。</li><li>由光速慢 → 快（水、玻璃 → 空氣）：折射光<strong>偏離</strong>法線，折射角 ＞ 入射角。</li></ul><h3>全反射</h3><p>光由慢射向快時，折射角比入射角大；入射角加大到<strong>臨界角</strong>時，折射角達到 90°。入射角再大，就沒有折射光，光全部反射，稱為全反射。光纖、鑽石閃閃發亮都是全反射的應用。</p><h3>高中延伸：司乃耳定律</h3><p>n₁ sin θ₁ ＝ n₂ sin θ₂；臨界角 sin θc ＝ n₂ ÷ n₁（n₁ ＞ n₂）。玻璃到空氣約 41.8°、水到空氣約 48.8°、鑽石到空氣只有約 24.4°。</p><h3>看水中硬幣</h3><p>硬幣反射的光從水射入空氣時偏離法線。眼睛（大腦）以為光是沿直線而來，所以沿著反向延長線，看到位置較高的虛像：水池看起來比實際淺、筷子插進水裡好像向上折。正上方往下看時，看起來的深度約為實際深度 × n空氣 ÷ n水 ≈ 0.75 倍。</p>',
    imaging: '<h3>成像規律</h3><ul><li><strong>平面鏡</strong>：正立、等大的虛像；像與物對稱於鏡面（像距 ＝ 物距）。</li><li><strong>凸透鏡、凹面鏡（會聚）</strong>：物體在 2F 外 → 倒立縮小實像；在 2F → 倒立等大實像；在 F 與 2F 間 → 倒立放大實像；在 F → 不成像；在 F 內 → 正立放大虛像。</li><li><strong>凹透鏡、凸面鏡（發散）</strong>：無論物體在哪裡，都是正立、縮小的虛像，像在器材與焦點之間。</li></ul><h3>實像與虛像</h3><p>實像是光線真的會聚的地方，可以用光屏接到；虛像只是反向延長線的交點，光屏接不到，只能透過鏡子或透鏡看到。打開「多條光線」可以看到：物體頂端射出的每一條光，都會交於（或反向延長交於）同一個像點。</p><h3>高中延伸：成像公式</h3><p>1/p ＋ 1/q ＝ 1/f，放大率 m ＝ −q/p。約定「實正虛負」：實像 q ＞ 0、虛像 q ＜ 0；會聚器材 f ＞ 0、發散器材 f ＜ 0。平面鏡相當於 f → ∞，所以 q ＝ −p。</p>'
  };
  function promptFor(im) {
    if (state.topic === 'reflection') return ['把入射角由 0° 加大到 80°，反射角怎麼變？', '光與鏡面夾 30° 時，入射角是幾度？', '切到粗糙表面，平行光反射後還平行嗎？'];
    if (state.topic === 'refraction') return state.refr.view === 'depth' ? ['把眼睛移到正上方和斜側，看到的硬幣深度一樣嗎？', '把下方換成玻璃或鑽石，硬幣看起來更淺還是更深？'] : ['空氣 → 玻璃，折射光偏向還是偏離法線？', '把上下介質對調，同樣的入射角折射角變多少？', '哪些組合找得到臨界角？'];
    if (isPlane()) return ['把物體往鏡子移近，像會往哪裡移動？像的大小會變嗎？', '光屏接得到平面鏡的像嗎？'];
    return im.optic.f > 0 ? ['從 3f 移到 2f、1.5f、f、0.5f，像的方向、大小與位置如何改變？', '什麼時候光屏接得到像？'] : ['從遠處逐漸靠近，像的方向、大小與所在側會改變嗎？'];
  }
  function discoveryFor(im) {
    if (state.topic === 'reflection') return '<p>無論入射角多大，反射角都等於入射角，且分居法線兩側。</p><p>光與鏡面夾 30°，入射角是 60°：角度永遠從法線量起。</p><p>粗糙表面讓平行光散開（漫射），但每一點仍遵守反射定律。</p>';
    if (state.topic === 'refraction') return state.refr.view === 'depth' ? '<p>由空氣看水中的物體，看起來都比實際淺；越斜著看，像越淺。</p><p>下方介質的折射率越大，看起來越淺。</p>' : '<p>空氣 → 玻璃：偏向法線；玻璃 → 空氣：偏離法線。對調後，原來的折射角變成入射角，原來的入射角變成折射角（光路可逆）。</p><p>只有由光速慢射向光速快（如玻璃 → 空氣、水 → 空氣）才有臨界角與全反射。</p>';
    if (isPlane()) return '<p>物體靠近，像也以同樣的距離靠近鏡子；像的大小始終和物體一樣。</p><p>平面鏡的像是虛像，光屏接不到。</p>';
    return im.optic.f > 0 ? '<p>物體在 2F 外：倒立、縮小的實像；在 2F：倒立、等大的實像。</p><p>物體在 F 與 2F 間：倒立、放大的實像；在 F：不形成有限距離的像。</p><p>物體在 F 內：正立、放大的虛像。只有實像能用光屏接到。</p>' : '<p>實物無論放在哪裡，都是正立、縮小的虛像。</p><p>物體越靠近器材，像逐漸變大，但仍比物體小；像位於器材與虛焦點之間。</p>';
  }
  function regimes() {
    const optic = opticNow();
    if (isPlane()) return [[1, '1 格'], [2, '2 格'], [3, '3 格']];
    return optic.f > 0 ? [[3, '2F 外', 'p＝3f'], [2, '2F 上', 'p＝2f'], [1.5, 'F～2F', 'p＝1.5f'], [1, 'F 上', 'p＝f'], [0.5, 'F 內', 'p＝0.5f']] : [[3, '遠', 'p＝3f'], [2, '2f'], [1, 'f'], [0.5, '近', 'p＝0.5f']];
  }

  // ---------- 主繪製 ----------
  function render(restart = false) {
    if (restart) restartNext = true;
    const topic = TOPICS[state.topic], ops = topic.ops, im = imaging() ? G.image(typeNow(), state.img.distance) : null;
    document.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.topic === state.topic)));
    document.querySelectorAll('[data-ops]').forEach(el => { el.hidden = el.dataset.ops !== ops; });
    document.body.classList.toggle('law-topic', !imaging());
    $('scene-title').textContent = imaging() ? `${im.optic.name}成像` : topic.title;
    $('optic-group').textContent = imaging() ? `${im.optic.group} · ${im.optic.mirror ? '反射' : '折射'}` : state.topic === 'refraction' && state.refr.view === 'depth' ? '視深' : topic.badge;
    $('scene-caption').textContent = imaging() ? '藍色箭頭是物體；拖曳底座可以改變物距。' : state.topic === 'refraction' && state.refr.view === 'depth' ? '硬幣反射的光經過水面折射進入眼睛。拖曳眼睛，比較實際的硬幣與看到的像。' : topic.caption;
    $('try-text').textContent = topic.tip; $('try-tip').hidden = !!state.tipClosed[state.topic] || state.mode === 'projection';
    $('legend').innerHTML = LEGENDS[imaging() ? 'imaging' : state.topic === 'refraction' && state.refr.view === 'depth' ? 'depth' : state.topic];
    $('howto-body').innerHTML = HOWTO[imaging() ? 'imaging' : state.topic];
    $('physics').innerHTML = PHYSICS[imaging() ? 'imaging' : state.topic];
    $('compare-panel').hidden = !imaging();
    $('status-line').textContent = status(im);
    $('readings').innerHTML = readings(im);
    $('observation-prompt').innerHTML = promptFor(im).map(t => `<p>• ${esc(t)}</p>`).join('');
    $('discovery').innerHTML = discoveryFor(im);

    if (state.topic === 'reflection') {
      const S = state.refl;
      document.querySelectorAll('[data-surface]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.surface === 'rough') === S.rough)));
      $('refl-theta').max = S.rough ? ROUGH_MAX : 85;
      $('refl-theta').value = Math.abs(reflTheta()); $('refl-theta-value').textContent = sideText(reflTheta());
      $('refl-theta').setAttribute('aria-valuetext', `入射角 ${deg(reflTheta())}`);
      document.querySelectorAll('[data-refl-angle]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Math.abs(reflTheta()) - +b.dataset.reflAngle) < 0.01)));
      for (const [id, key] of [['refl-angles', 'angles'], ['refl-protractor', 'protractor'], ['refl-glancing', 'glancing'], ['refl-normals', 'normals']]) $(id).checked = S[key];
      $('refl-normals-option').hidden = !S.rough; $('refl-glancing').closest('label').hidden = S.rough; $('refl-protractor').closest('label').hidden = S.rough;
    } else if (state.topic === 'refraction') {
      const S = state.refr, a = medium(S.n1), b = medium(S.n2), r = G.refract(a.n, b.n, S.theta);
      document.querySelectorAll('[data-view]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.view === S.view)));
      document.querySelectorAll('[data-view-only]').forEach(el => { el.hidden = el.dataset.viewOnly !== S.view; });
      for (const group of ['n1', 'n2']) document.querySelectorAll(`[data-medium-group="${group}"] button`).forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.medium === S[group])));
      $('n1-role').textContent = S.view === 'depth' ? '眼睛所在' : '入射光所在'; $('n2-role').textContent = S.view === 'depth' ? '（硬幣所在）' : '';
      $('refr-theta').value = Math.abs(S.theta); $('refr-theta-value').textContent = sideText(S.theta); $('refr-theta').setAttribute('aria-valuetext', `入射角 ${deg(S.theta)}`);
      $('to-critical').disabled = r.critical === null; $('critical-small').textContent = r.critical === null ? '無' : deg(r.critical);
      document.querySelectorAll('[data-refr-angle]').forEach(btn => btn.setAttribute('aria-pressed', String(Math.abs(Math.abs(S.theta) - +btn.dataset.refrAngle) < 0.01)));
      for (const [id, key] of [['refr-angles', 'angles'], ['refr-protractor', 'protractor'], ['refr-critical', 'critical'], ['depth-extension', 'extension']]) $(id).checked = S[key];
      $('eye-x').value = S.eye; $('eye-value').textContent = `${fx(S.eye, 2)} 格`;
    } else {
      const S = state.img, optic = im.optic, plane = isPlane();
      $('result').hidden = false;
      const choice = document.querySelector('.optic-choice');
      if (choice.dataset.topic !== state.topic) { choice.dataset.topic = state.topic; choice.innerHTML = topic.optics.map(t => `<button type="button" data-optic="${t}" aria-pressed="false">${G.TYPES[t].name}<small>${G.TYPES[t].group}</small></button>`).join(''); }
      choice.querySelectorAll('[data-optic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.optic === typeNow())));
      const refocus = document.activeElement?.closest?.('#regimes [data-distance]')?.dataset.distance;
      $('regimes').innerHTML = regimes().map(([d, label, sub]) => {
        const r = G.image(typeNow(), d), result = !S.showImage ? (sub || '') : !r.finite ? '不成像' : `${r.upright ? '正立' : '倒立'}・${r.size}・${r.real ? '實' : '虛'}像`;
        return `<button type="button" data-distance="${d}" aria-pressed="${Math.abs(d - S.distance) < 1e-8}"><span>${label}</span><small>${result}</small></button>`;
      }).join('');
      if (refocus) $('regimes').querySelector(`[data-distance="${refocus}"]`)?.focus({ preventScroll: true });
      $('distance').value = S.distance; $('distance-value').textContent = `${S.distance.toFixed(2)}${unit()}`;
      $('distance').setAttribute('aria-valuetext', `${S.distance.toFixed(2)} ${plane ? '格' : '倍焦距'}`);
      $('snap-option').hidden = plane; $('distance-help').textContent = plane ? '平面鏡沒有焦點；物距以「格」計。也可用方向鍵微調物距。' : '焦距固定；f 是一倍焦距，F 是焦點。也可用方向鍵微調物距。';
      $('parallel-rule').textContent = plane ? '垂直射向鏡面，沿原路反射' : optic.f > 0 ? `${optic.mirror ? '反射' : '折射'}後通過焦點` : `${optic.mirror ? '反射' : '折射'}後發散，反向延長線通過虛焦點`;
      $('central-label').innerHTML = optic.mirror ? '射向鏡面頂點 V<small>依入射角＝反射角反射</small>' : '通過光心 O<small>薄透鏡模型中，方向不變</small>';
      $('focal-rule').textContent = optic.f > 0 ? `入射線或其延長線通過物側焦點，${optic.mirror ? '反射' : '折射'}後平行主軸` : `朝向${optic.mirror ? '鏡後' : '另一側'}焦點入射，${optic.mirror ? '反射' : '折射'}後平行主軸`;
      $('focal-option').hidden = plane; $('curvature-option').hidden = !optic.mirror || plane;
      for (const id of ['parallel', 'central', 'focal', 'curvature', 'fan']) $('ray-' + id).checked = S.rays[id];
      for (const [id, key] of [['snap', 'snap'], ['extensions', 'extensions'], ['show-image', 'showImage'], ['show-screen', 'showScreen'], ['show-pq', 'showPQ']]) $(id).checked = S[key];
      $('screen-controls').hidden = !S.showScreen; $('screen-result').hidden = !S.showScreen;
      $('screen-position').value = S.screen; $('screen-value').textContent = `${S.screen > 0 ? '+' : ''}${S.screen.toFixed(2)}${unit()}`;
      const omitted = [];
      if (S.rays.focal && !im.finite) omitted.push('物體在 F 時，這條焦點光線與參考面平行，無法入射，暫不繪出。');
      if (optic.mirror && !plane && S.rays.curvature && Math.abs(S.distance - 2 * optic.f) < 1e-9) omitted.push('物體在 C 上方時，球心相關光線與參考面平行，暫不繪出。');
      if (!S.showImage) $('result').innerHTML = '<h3>先預測看看</h3><p>像在哪一側？正立或倒立？放大或縮小？是實像還是虛像？</p><p class="muted">勾選「顯示像與成像結果」即可核對。</p>';
      else if (!im.finite) $('result').innerHTML = '<h3>物距＝焦距</h3><p>出射光互相平行，不形成有限距離的像。</p><p class="measure">成像位置趨向無限遠，有限距離的光屏無法接到清晰的像。</p>';
      else $('result').innerHTML = `<div class="result-tags"><span>${im.upright ? '正立' : '倒立'}</span><span>${im.size}</span><span>${im.real ? '實像' : '虛像'}</span></div><p>${optic.mirror ? (im.real ? '像在鏡前，與物體同側。' : '像在鏡後。') : (im.real ? '像在透鏡另一側。' : '像在透鏡與物體同側。')}</p><p class="measure">像距 ${Math.abs(im.q).toFixed(2)}${unit()} · 像高為物高的 ${Math.abs(im.magnification).toFixed(2)} 倍${omitted.length ? ' · ' + omitted.join(' ') : ''}</p>`;
      const off = S.showImage && im.finite && (Math.abs(im.x) > bounds.xMax || Math.abs(im.y) > bounds.yMax - .12), edges = [];
      if (off && Math.abs(im.x) > bounds.xMax) edges.push(im.x < 0 ? '左側' : '右側');
      if (off && Math.abs(im.y) > bounds.yMax - .12) edges.push(im.y > 0 ? '上方' : '下方');
      $('edge-note').hidden = !off; $('edge-note').textContent = off ? `像超出畫面的${edges.join('與')}。像距 ${Math.abs(im.q).toFixed(2)}${unit()}；比例尺保持固定，可把物體移離 F 再觀察。` : '';
      if (S.showScreen) {
        const sc = G.screen(typeNow(), S.distance, S.screen);
        $('screen-status').textContent = sc.sharp ? '光屏接到清晰的像！' : '光屏上沒有清晰的像';
        $('screen-explain').textContent = sc.sharp ? '試著稍微移動光屏，比較清晰度。' : !sc.correctSide ? '把光屏移到實際出射光線行進的一側。' : !im.finite ? '出射光互相平行，有限距離的光屏無法使它們會聚。' : !im.real ? '虛像位置沒有光線實際會聚，光屏接不到這個像。' : '移動光屏，尋找光線實際會聚的位置。';
        $('screen-preview').innerHTML = sc.possible ? `<span class="screen-arrow" style="filter:blur(${sc.sharp ? 0 : Math.min(12, Math.max(2, sc.spread * 20))}px)">↑</span>` : '';
      }
    }
    if (!imaging()) { $('result').hidden = true; $('screen-result').hidden = true; $('edge-note').hidden = true; }
    renderScene(im); run();
    if (state.mode === 'study') document.dispatchEvent(new Event('change'));
  }

  // ---------- 狀態設定 ----------
  function setTopic(name, opts = {}) {
    if (!TOPICS[name]) return;
    state.topic = name;
    if (opts.optic && TOPICS[name].optics?.includes(opts.optic)) state.optic[name] = opts.optic;
    $('discovery').hidden = true; $('prediction-toggle').setAttribute('aria-expanded', 'false');
    if (state.mode === 'study') resetTopic(false);
    startGuide(); updateUrl(); render(true);
    if (state.mode === 'study') setPlaying(false);
  }
  function setOptic(type) {
    state.optic[state.topic] = type; state.img.screen = G.TYPES[type].mirror ? -2 : 2;
    $('discovery').hidden = true; $('prediction-toggle').setAttribute('aria-expanded', 'false'); updateUrl(); render(true);
  }
  function resetTopic(doRender = true) {
    if (state.topic === 'reflection') state.refl = clone(DEF.refl);
    else if (state.topic === 'refraction') state.refr = clone(DEF.refr);
    else { state.img = clone(DEF.img); state.img.screen = opticNow().mirror ? -2 : 2; }
    if (doRender) { $('discovery').hidden = true; render(true); }
  }
  const setReflTheta = v => { state.refl.theta = clamp(n2(v), state.refl.rough ? -ROUGH_MAX : -85, state.refl.rough ? ROUGH_MAX : 85); render(); };
  const setRefrTheta = v => { state.refr.theta = clamp(n2(v), -85, 85); render(); };
  const setEye = v => { state.refr.eye = clamp(n2(v), -3.6, 3.6); render(); };
  const setDistance = (v, snapIt = true) => { state.img.distance = isPlane() ? clamp(n2(v), .25, 4) : snapIt ? G.snap(v, state.img.snap) : clamp(n2(v), .25, 4); render(); };
  const setScreen = v => { state.img.screen = clamp(v, -4, 4); render(); };

  // ---------- 事件 ----------
  document.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => setTopic(b.dataset.topic)));
  document.querySelector('.optic-choice').addEventListener('click', e => { const b = e.target.closest('[data-optic]'); if (b) setOptic(b.dataset.optic); });
  $('regimes').addEventListener('click', e => { const b = e.target.closest('[data-distance]'); if (b) setDistance(+b.dataset.distance, false); });
  document.querySelectorAll('[data-surface]').forEach(b => b.addEventListener('click', () => { state.refl.rough = b.dataset.surface === 'rough'; if (state.refl.rough) state.refl.theta = clamp(state.refl.theta, -ROUGH_MAX, ROUGH_MAX); render(true); }));
  $('refl-theta').addEventListener('input', e => setReflTheta((state.refl.theta < 0 ? -1 : 1) * +e.target.value));
  document.querySelectorAll('[data-refl-angle]').forEach(b => b.addEventListener('click', () => setReflTheta((state.refl.theta < 0 ? -1 : 1) * +b.dataset.reflAngle)));
  for (const [id, key] of [['refl-angles', 'angles'], ['refl-protractor', 'protractor'], ['refl-glancing', 'glancing'], ['refl-normals', 'normals']]) $(id).addEventListener('change', e => { state.refl[key] = e.target.checked; render(); });
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { if (state.refr.view !== b.dataset.view && b.dataset.view === 'depth') { state.refr.n1 = 'air'; state.refr.n2 = 'water'; } state.refr.view = b.dataset.view; render(true); }));
  for (const group of ['n1', 'n2']) {
    const box = document.querySelector(`[data-medium-group="${group}"]`);
    box.innerHTML = Object.entries(G.MEDIA).map(([k, m]) => `<button type="button" data-medium="${k}" aria-pressed="false">${m.name}<small>n＝${m.n.toFixed(2)}</small></button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('[data-medium]'); if (!b) return; state.refr[group] = b.dataset.medium; render(); });
  }
  $('swap-media').addEventListener('click', () => { [state.refr.n1, state.refr.n2] = [state.refr.n2, state.refr.n1]; render(); });
  $('refr-theta').addEventListener('input', e => setRefrTheta((state.refr.theta < 0 ? -1 : 1) * +e.target.value));
  document.querySelectorAll('[data-refr-angle]').forEach(b => b.addEventListener('click', () => setRefrTheta((state.refr.theta < 0 ? -1 : 1) * +b.dataset.refrAngle)));
  $('to-critical').addEventListener('click', () => { const c = G.critical(medium(state.refr.n1).n, medium(state.refr.n2).n); if (c !== null) setRefrTheta((state.refr.theta < 0 ? -1 : 1) * (Math.floor(c * 100) / 100)); });
  for (const [id, key] of [['refr-angles', 'angles'], ['refr-protractor', 'protractor'], ['refr-critical', 'critical'], ['depth-extension', 'extension']]) $(id).addEventListener('change', e => { state.refr[key] = e.target.checked; render(); });
  $('eye-x').addEventListener('input', e => setEye(+e.target.value));
  $('distance').addEventListener('input', e => setDistance(+e.target.value));
  // Arrow keys bypass attraction so keyboard users can move past F and 2F.
  $('distance').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    setDistance(e.key === 'Home' ? .25 : e.key === 'End' ? 4 : state.img.distance + (['ArrowRight', 'ArrowUp'].includes(e.key) ? .01 : -.01), false);
  });
  $('screen-position').addEventListener('input', e => setScreen(+e.target.value));
  for (const id of ['parallel', 'central', 'focal', 'curvature', 'fan']) $('ray-' + id).addEventListener('change', e => { state.img.rays[id] = e.target.checked; render(); });
  for (const [id, key] of [['snap', 'snap'], ['extensions', 'extensions'], ['show-image', 'showImage'], ['show-screen', 'showScreen'], ['show-pq', 'showPQ']]) $(id).addEventListener('change', e => { state.img[key] = e.target.checked; render(); });
  $('play').addEventListener('click', () => setPlaying(!state.playing));
  $('replay').addEventListener('click', () => { restartNext = true; state.playing = true; setPlaying(true); render(true); });
  $('prediction-toggle').addEventListener('click', () => { $('discovery').hidden = !$('discovery').hidden; $('prediction-toggle').setAttribute('aria-expanded', String(!$('discovery').hidden)); });
  $('reset').addEventListener('click', () => resetTopic());
  $('try-close').addEventListener('click', () => { state.tipClosed[state.topic] = true; $('try-tip').hidden = true; });

  // 拖曳：雷射（角度）、眼睛、物體、光屏
  function svgPoint(e) { const p = scene.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(scene.getScreenCTM().inverse()); }
  function dragTo(e) {
    const p = svgPoint(e);
    if (drag === 'laser') {
      const c = state.topic === 'reflection' ? RP : FP;
      if (p.y > c.y - 4) p.y = c.y - 4;
      const a = Math.atan2(c.x - p.x, c.y - p.y) * 180 / Math.PI;
      state.topic === 'reflection' ? setReflTheta(a) : setRefrTheta(a);
    } else if (drag === 'eye') setEye((p.x - 500) / DK);
    else if (drag === 'object') setDistance(-((p.x - 500) / 110 - dragOffset));
    else if (drag === 'screen') setScreen((p.x - 500) / 110 - dragOffset);
  }
  let dragOffset = 0;
  scene.addEventListener('pointerdown', e => {
    const p = svgPoint(e), handle = e.target.closest('.handle');
    if (imaging()) {
      if (!handle) return;
      drag = handle.id === 'object-handle' ? 'object' : 'screen';
      dragOffset = (p.x - 500) / 110 - (drag === 'object' ? -state.img.distance : state.img.screen);
    } else if (state.topic === 'refraction' && state.refr.view === 'depth') {
      if (!handle && p.y > DY) return; drag = 'eye';
    } else {
      const c = state.topic === 'reflection' ? RP : FP;
      if (!handle && p.y > c.y) return; drag = 'laser';
    }
    e.preventDefault(); scene.setPointerCapture(e.pointerId);
    const focusId = drag === 'object' ? 'object-handle' : drag === 'screen' ? 'screen-handle' : drag === 'eye' ? 'eye-handle' : 'laser-handle';
    $(focusId)?.focus({ preventScroll: true });
    if (drag === 'laser' || drag === 'eye') dragTo(e);
  });
  scene.addEventListener('pointermove', e => { if (drag) dragTo(e); });
  function release(e) {
    if (!drag) return; const id = { object: 'object-handle', screen: 'screen-handle', eye: 'eye-handle', laser: 'laser-handle' }[drag];
    drag = null; if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
    $(id)?.focus({ preventScroll: true });
    if (state.mode === 'study') document.dispatchEvent(new Event('change'));
  }
  scene.addEventListener('pointerup', release); scene.addEventListener('pointercancel', release);
  scene.addEventListener('lostpointercapture', () => { drag = null; });
  scene.addEventListener('keydown', e => {
    const handle = e.target.closest('.handle'); if (!handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const big = e.shiftKey;
    if (handle.id === 'laser-handle') {
      const get = () => (state.topic === 'reflection' ? state.refl.theta : state.refr.theta), set = state.topic === 'reflection' ? setReflTheta : setRefrTheta, t = get(), step = big ? 5 : 0.5;
      if (e.key === 'Home') set(0);
      else if (e.key === 'ArrowLeft') set(t + step); else if (e.key === 'ArrowRight') set(t - step);
      else { const s = t >= 0 ? 1 : -1, mag = Math.abs(t) + (e.key === 'ArrowUp' ? -step : step); set(s * Math.max(0, mag)); }
    } else if (handle.id === 'eye-handle') setEye(e.key === 'Home' ? 0 : state.refr.eye + ((['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : -1) * (big ? .5 : .05)));
    else if (handle.id === 'object-handle') setDistance(e.key === 'Home' ? .25 : e.key === 'End' ? 4 : state.img.distance + (['ArrowLeft', 'ArrowUp'].includes(e.key) ? .05 : -.05), false);
    else setScreen(e.key === 'Home' ? -4 : e.key === 'End' ? 4 : n2(state.img.screen + (['ArrowRight', 'ArrowUp'].includes(e.key) ? .05 : -.05)));
  });
  document.addEventListener('visibilitychange', () => { lastTick = null; if (!document.hidden) run(); });

  // ---------- 自修任務（預測 → 操作驗證 → 記錄觀察 → 說明原因） ----------
  const opt = (question, options, answer, hint) => ({ question, options, answer, hint });
  const prep = fn => ctx => { fn(ctx); state.playing = true; render(true); setPlaying(true); };
  const imgPrep = (type, distance, extra = {}) => prep(ctx => { state.optic[state.topic] = type; state.img = Object.assign(clone(DEF.img), { distance, screen: G.TYPES[type].mirror ? -2 : 2 }, extra); Object.assign(ctx, { near: false, far: false, sides: {} }); });
  const needType = type => (typeNow() !== type ? { ok: false, message: `請選「${G.TYPES[type].name}」。` } : null);
  const LESSONS = {
    reflection: [
      { id: 'refl-law', title: '反射角和入射角的關係', prediction: { question: '把入射角加大，反射角會怎樣？', options: ['跟著變大，而且一樣大', '變小', '不變，永遠是 45°'] },
        task: '按「準備這個實驗」後，拖曳雷射（或用「入射角」滑桿），把入射角調到 50° 以上，再讀取結果。',
        prepare: prep(() => { state.refl = Object.assign(clone(DEF.refl), { theta: 20 }); }),
        check() { if (state.refl.rough) return { ok: false, message: '請切回「光滑鏡面」。' }; const t = Math.abs(state.refl.theta); if (t < 50) return { ok: false, message: `目前入射角 ${deg(t)}，請調到 50° 以上。` }; return { ok: true, evidence: `入射角 ${deg(t)}，反射角也是 ${deg(t)}；兩者都由法線量起，分居法線兩側` }; },
        observation: opt('入射角和反射角的大小？', ['永遠相等', '反射角比較大', '入射角比較大'], 0, '看圖上兩個角度標示。'),
        reason: opt('為什麼要從「法線」量角度？', ['法線垂直鏡面，是每一點固定的參考方向；入射光與反射光對稱分布在法線兩側', '因為鏡面剛好是水平的', '從哪裡量都可以，結果都一樣'], 0, '如果鏡子是斜的或彎的，什麼方向仍然有清楚的定義？'),
        conclusion: '反射定律：入射角＝反射角，入射光、反射光分居法線兩側，而且與法線在同一平面上。' },
      { id: 'refl-measure', title: '入射角從哪裡量？', prediction: { question: '雷射光與鏡面夾 30° 時，入射角是幾度？', options: ['30°', '60°', '90°'] },
        task: '按「準備」後，勾選「標示與鏡面的夾角」，把雷射調到與鏡面夾 30°（左右兩側皆可），再讀取結果。',
        prepare: prep(() => { state.refl = Object.assign(clone(DEF.refl), { theta: 10 }); }),
        check() { const S = state.refl; if (S.rough) return { ok: false, message: '請切回「光滑鏡面」。' }; if (!S.glancing) return { ok: false, message: '請勾選「標示與鏡面的夾角」。' }; const g = 90 - Math.abs(S.theta); if (Math.abs(g - 30) > 0.6) return { ok: false, message: `目前與鏡面夾 ${deg(g)}，請調到 30°。` }; return { ok: true, evidence: `雷射與鏡面夾 ${deg(g)}，入射角＝90° − ${deg(g)}＝${deg(S.theta)}` }; },
        observation: opt('此時入射角是多少？', ['60°，與鏡面的夾角才是 30°', '就是 30°', '90°'], 0, '看棕色的 i 標示。'),
        reason: opt('為什麼？', ['入射角是入射光與「法線」的夾角；法線垂直鏡面，所以兩個角加起來是 90°', '入射角就是入射光與鏡面的夾角', '反射後角度會變成兩倍'], 0, '法線與鏡面夾幾度？'),
        conclusion: '入射角、反射角都從法線量起。題目若給「與鏡面的夾角」，要先用 90° 減去它。' },
      { id: 'refl-diffuse', title: '漫射也遵守反射定律嗎？', prediction: { question: '光打在粗糙表面上，每一點還遵守反射定律嗎？', options: ['遵守，只是各點的法線方向不同', '不遵守，光被亂彈', '只有一部分的光遵守'] },
        task: '按「準備」後，切換到「粗糙表面（漫射）」，勾選「顯示各點法線」，觀察中間那條光線的兩個角，再讀取結果。',
        prepare: prep(() => { state.refl = Object.assign(clone(DEF.refl), { normals: false }); }),
        check() { const S = state.refl; if (!S.rough) return { ok: false, message: '請切換到「粗糙表面（漫射）」。' }; if (!S.normals) return { ok: false, message: '請勾選「顯示各點法線」。' }; const p = G.diffuse(reflTheta(), [-3, -2, -1, 0, 1, 2, 3])[3]; return { ok: true, evidence: `平行射入的光打到粗糙表面後往不同方向射出；中間那一點入射角 ${deg(p.angle)}、反射角也是 ${deg(p.angle)}` }; },
        observation: opt('看到什麼？', ['反射光朝不同方向，但每條都對稱於自己那一點的法線', '反射光仍然互相平行', '反射光全部原路彈回'], 0, '看每一點的灰色法線。'),
        reason: opt('反射光為什麼會散開？', ['粗糙表面上每一點的法線方向不同', '粗糙表面不遵守反射定律', '光在粗糙表面上會變慢'], 0, '比較各點法線的方向。'),
        conclusion: '單向反射與漫射都遵守反射定律。漫射讓我們能從各個方向看見書本、黑板等不發光的物體。' }
    ],
    refraction: [
      { id: 'refr-toward', title: '進入水或玻璃：偏向法線', prediction: { question: '光從空氣斜射入玻璃，折射光會？', options: ['偏向法線（折射角較小）', '偏離法線（折射角較大）', '直直前進不偏折'] },
        task: '按「準備」後，上方選空氣、下方選水或玻璃，把入射角調到 40° 以上，再讀取結果。',
        prepare: prep(() => { state.refr = Object.assign(clone(DEF.refr), { n2: 'air', theta: 20 }); }),
        check() { const S = state.refr, a = medium(S.n1), b = medium(S.n2); if (S.view !== 'ray') return { ok: false, message: '請切回「雷射光線」。' }; if (!(a.n < b.n)) return { ok: false, message: '請讓下方介質的折射率比上方大（例如上空氣、下玻璃）。' }; if (Math.abs(S.theta) < 40) return { ok: false, message: `目前入射角 ${deg(S.theta)}，請調到 40° 以上。` }; const r = G.refract(a.n, b.n, S.theta); return { ok: true, evidence: `${a.name} → ${b.name}：入射角 ${deg(S.theta)}，折射角 ${deg(r.refraction)}，折射光偏向法線` }; },
        observation: opt('折射角和入射角比較？', ['折射角比較小，光偏向法線', '折射角比較大', '兩個角一樣'], 0, '比較 θ₁ 與 θ₂。'),
        reason: opt('為什麼？', ['光在水、玻璃中比在空氣中慢；進入光速較慢的介質時偏向法線', '玻璃比較重，把光往下拉', '入射角大，光就一定偏向法線'], 0, '看讀數裡兩種介質的光速。'),
        conclusion: '光由光速快的介質斜射入光速慢的介質（如空氣 → 水），折射光偏向法線；垂直入射則不偏折。' },
      { id: 'refr-tir', title: '從玻璃射向空氣：全反射', prediction: { question: '光從玻璃射向空氣，入射角越來越大，會發生什麼事？', options: ['折射光越來越貼近界面，最後消失、全部反射', '折射光越來越靠近法線', '什麼都不會改變'] },
        task: '按「準備」後，上方選玻璃（或水、鑽石）、下方選空氣，慢慢加大入射角，直到折射光消失，再讀取結果。',
        prepare: prep(() => { state.refr = Object.assign(clone(DEF.refr), { n1: 'glass', n2: 'glass', theta: 20 }); }),
        check() { const S = state.refr, a = medium(S.n1), b = medium(S.n2); if (S.view !== 'ray') return { ok: false, message: '請切回「雷射光線」。' }; if (!(a.n > b.n)) return { ok: false, message: '請讓光從折射率大的介質射向小的（例如上玻璃、下空氣）。' }; const r = G.refract(a.n, b.n, S.theta); if (!r.total) return { ok: false, message: `目前入射角 ${deg(S.theta)}，折射光還在，繼續加大入射角。` }; return { ok: true, evidence: `${a.name} → ${b.name}：入射角 ${deg(S.theta)} 超過臨界角 ${deg(r.critical)}，沒有折射光，反射光 100%` }; },
        observation: opt('入射角超過臨界角之後？', ['光全部反射回原來的介質', '折射光變得更亮', '反射光消失'], 0, '看讀數的折射角與反射光比例。'),
        reason: opt('為什麼會全反射？', ['光由慢到快時偏離法線，折射角先到達 90°；入射角再大就折射不出去', '玻璃把光吸收了', '空氣擋住了光'], 0, '在快到臨界角時，折射角是多少？'),
        conclusion: '全反射只發生在光由光速慢射向光速快的介質、且入射角大於臨界角時。光纖、鑽石閃亮都是應用。' },
      { id: 'refr-depth', title: '水中硬幣看起來變淺', prediction: { question: '從岸上看水裡的硬幣，看起來比實際？', options: ['淺一些（位置較高）', '深一些', '一樣深'] },
        task: '按「準備」後，切換到「看水中硬幣」，上方選空氣、下方選水，拖曳眼睛到不同位置觀察，再讀取結果。',
        prepare: prep(() => { state.refr = Object.assign(clone(DEF.refr), { n2: 'water' }); }),
        check() { const S = state.refr; if (S.view !== 'depth') return { ok: false, message: '請切換到「看水中硬幣」。' }; if (!(medium(S.n1).n < medium(S.n2).n)) return { ok: false, message: '請上方選空氣、下方選水。' }; const v = depthView(); return { ok: true, evidence: `實際深度 2.00 格，眼睛看到的像在 ${(-v.image.y).toFixed(2)} 格深處，看起來比較淺` }; },
        observation: opt('看到的像在哪裡？', ['比實際硬幣高，水看起來變淺', '比實際硬幣低', '剛好在硬幣上'], 0, '比較實線硬幣與虛線硬幣。'),
        reason: opt('為什麼？', ['光從水射入空氣時偏離法線，眼睛沿出射光的反向延長線看，以為光來自較高的位置', '水會把硬幣往上推', '硬幣在水中變小了'], 0, '眼睛（大腦）以為光是怎麼走的？'),
        conclusion: '水池看起來變淺、筷子插入水中像向上折，都是光從水射入空氣時偏折，大腦以為光沿直線而來所看到的虛像。' }
    ],
    mirror: [
      { id: 'mirror-plane', title: '平面鏡：像在哪裡？', prediction: { question: '平面鏡的像在哪裡？', options: ['在鏡後，與物體到鏡面一樣遠', '就在鏡面上', '在鏡前'] },
        task: '按「準備」後，選「平面鏡」，把物體拖到 2 格以外，比較物距與像距，再讀取結果。',
        prepare: imgPrep('concave-mirror', 1),
        check() { const n = needType('plane-mirror'); if (n) return n; const d = state.img.distance; if (d < 2) return { ok: false, message: '請把物距調到 2 格以上。' }; return { ok: true, evidence: `物距 ${d.toFixed(2)} 格、像距 ${d.toFixed(2)} 格（鏡後），像高與物高相同` }; },
        observation: opt('平面鏡的像？', ['像距＝物距，正立、等大的虛像', '像距是物距的一半', '倒立的實像'], 0, '看 p、q 的標示。'),
        reason: opt('為什麼是虛像？', ['反射光的反向延長線交在鏡後；光並沒有真的到鏡後', '鏡子裡真的有一個物體', '光穿過鏡子在後方會聚'], 0, '鏡後有真的光嗎？'),
        conclusion: '平面鏡成正立、等大的虛像，像與物對稱於鏡面；光屏接不到。' },
      { id: 'mirror-concave', title: '凹面鏡：靠近鏡子會怎樣？', prediction: { question: '把物體從遠處移近凹面鏡，像會？', options: ['先是倒立實像，進到 F 內變正立放大虛像', '一直都是正立虛像', '一直都是倒立實像'] },
        task: '按「準備」後，物體在 3f（倒立實像）。把物體慢慢移到 F 內（小於 1f），再讀取結果。',
        prepare: imgPrep('concave-mirror', 3),
        check() { const n = needType('concave-mirror'); if (n) return n; const d = state.img.distance; if (d >= 1) return { ok: false, message: '請把物體移到 F 內（物距小於 1f）。' }; const im = G.image('concave-mirror', d); return { ok: true, evidence: `物距 ${d.toFixed(2)}f（F 內）：正立、放大 ${im.magnification.toFixed(2)} 倍的虛像，在鏡後` }; },
        observation: opt('物體在 F 內時？', ['正立、放大的虛像', '倒立、縮小的實像', '看不到任何像'], 0, '看像的箭頭方向與虛實線。'),
        reason: opt('為什麼？', ['物體在 F 內時反射光發散，只有反向延長線在鏡後相交', '凹面鏡在 F 內會變成凸面鏡', '光在 F 內跑得比較慢'], 0, '反射後的光線是會聚還是發散？'),
        conclusion: '化妝鏡是凹面鏡：臉靠得夠近（在 F 內）時，看到正立、放大的虛像。' },
      { id: 'mirror-convex', title: '凸面鏡：看得廣但變小', prediction: { question: '凸面鏡的像，近處和遠處有什麼不同？', options: ['都是正立、縮小的虛像', '近處放大、遠處縮小', '都是倒立實像'] },
        task: '按「準備」後，把物體分別放到 1f 以內和 2f 以外各一次，再讀取結果。',
        prepare: imgPrep('convex-mirror', 1.5),
        onChange(ctx) { if (typeNow() === 'convex-mirror') { if (state.img.distance < 1) ctx.near = true; if (state.img.distance > 2) ctx.far = true; } },
        check(ctx) { const n = needType('convex-mirror'); if (n) return n; if (!ctx.near || !ctx.far) return { ok: false, message: `還需要把物體移到${!ctx.near ? ' 1f 以內' : ''}${!ctx.near && !ctx.far ? ' 和' : ''}${!ctx.far ? ' 2f 以外' : ''}。` }; return { ok: true, evidence: '物體在 1f 以內與 2f 以外，都是正立、縮小的虛像，像在鏡後焦點以內' }; },
        observation: opt('結果？', ['無論遠近，都是正立、縮小的虛像', '近處是放大的像', '遠處是倒立的實像'], 0, '比較兩次的像。'),
        reason: opt('為什麼？', ['凸面鏡讓光發散，反射光只在鏡後有反向延長線的交點', '凸面鏡吸收了一半的光', '因為像在鏡前'], 0, '平行光打到凸面鏡後怎麼走？'),
        conclusion: '路口反光鏡用凸面鏡：像雖然小，但看得到的範圍廣。' }
    ],
    lens: [
      { id: 'lens-screen', title: '凸透鏡：用光屏接到實像', prediction: { question: '物體在 2F 外，光屏放在哪裡接得到像？', options: ['在透鏡另一側某個位置，接到倒立的像', '放在哪裡都接得到', '凸透鏡的像都接不到'] },
        task: '按「準備」後，勾選「加入可拖曳光屏」，移動光屏直到接到清晰的像，再讀取結果。',
        prepare: imgPrep('convex-lens', 3),
        check() { const n = needType('convex-lens'); if (n) return n; const S = state.img; if (!S.showScreen) return { ok: false, message: '請勾選「加入可拖曳光屏」。' }; if (S.distance <= 1) return { ok: false, message: '請把物體放在 F 外。' }; if (!G.screen('convex-lens', S.distance, S.screen).sharp) return { ok: false, message: '光屏上的像還不清晰，繼續移動光屏。' }; return { ok: true, evidence: `物距 ${S.distance.toFixed(2)}f，光屏在 +${S.screen.toFixed(2)}f 接到清晰、倒立的實像` }; },
        observation: opt('光屏的結果？', ['只有在像的位置，光屏才接到清晰的倒立像', '光屏放哪裡都清楚', '光屏上是正立的像'], 0, '看光屏預覽。'),
        reason: opt('為什麼接得到？', ['實像是光線真的會聚的地方', '光屏會吸引光線', '因為透鏡會發光'], 0, '在像的位置，光線有沒有真的經過？'),
        conclusion: '實像由真實光線會聚而成，可以用光屏接到；投影機、相機都是利用凸透鏡成實像。' },
      { id: 'lens-virtual', title: '放大鏡的虛像接得到嗎？', prediction: { question: '物體在凸透鏡 F 內，光屏接得到像嗎？', options: ['接不到，因為光線沒有真的會聚', '接得到，而且是放大的', '接得到，但會倒立'] },
        task: '按「準備」後，把物體移到 F 內（小於 1f），勾選光屏，在透鏡左右兩側都移動找找看，再讀取結果。',
        prepare: imgPrep('convex-lens', 1.5),
        onChange(ctx) { const S = state.img; if (S.showScreen && Math.abs(S.screen) > .3 && S.distance < 1) ctx.sides[S.screen > 0 ? 'right' : 'left'] = true; },
        check(ctx) { const n = needType('convex-lens'); if (n) return n; const S = state.img; if (S.distance >= 1) return { ok: false, message: '請把物體移到 F 內。' }; if (!S.showScreen) return { ok: false, message: '請勾選「加入可拖曳光屏」。' }; if (Object.keys(ctx.sides).length < 2) return { ok: false, message: '把光屏移到透鏡左、右兩側都試試看。' }; return { ok: true, evidence: `物距 ${S.distance.toFixed(2)}f：正立放大的虛像在透鏡左側；光屏移到左右兩側都接不到` }; },
        observation: opt('結果？', ['光屏接不到，只能透過透鏡看到正立放大的虛像', '在左側接到放大的像', '在右側接到倒立的像'], 0, '看光屏預覽與說明。'),
        reason: opt('為什麼？', ['物體在 F 內時折射光發散，虛像只是反向延長線的交點', '光屏太小', '虛像太暗'], 0, '折射後的光是會聚還是發散？'),
        conclusion: '放大鏡：物體放在凸透鏡 F 內，看到正立、放大的虛像，但光屏接不到。' },
      { id: 'lens-concave', title: '凹透鏡：一律正立縮小', prediction: { question: '凹透鏡的像，近處和遠處有什麼不同？', options: ['都是正立、縮小的虛像', '近處放大、遠處縮小', '遠處是倒立實像'] },
        task: '按「準備」後，選「凹透鏡」，把物體分別放到 1f 以內和 2f 以外各一次，再讀取結果。',
        prepare: imgPrep('convex-lens', 1.5),
        onChange(ctx) { if (typeNow() === 'concave-lens') { if (state.img.distance < 1) ctx.near = true; if (state.img.distance > 2) ctx.far = true; } },
        check(ctx) { const n = needType('concave-lens'); if (n) return n; if (!ctx.near || !ctx.far) return { ok: false, message: `還需要把物體移到${!ctx.near ? ' 1f 以內' : ''}${!ctx.near && !ctx.far ? ' 和' : ''}${!ctx.far ? ' 2f 以外' : ''}。` }; return { ok: true, evidence: '近處與遠處都是正立、縮小的虛像，像在透鏡與虛焦點之間、與物體同側' }; },
        observation: opt('結果？', ['無論遠近都是正立、縮小的虛像', '近處是放大的像', '遠處是倒立實像'], 0, '比較兩次的像。'),
        reason: opt('為什麼？', ['凹透鏡讓光發散，只有反向延長線相交成虛像', '凹透鏡把光擋掉一半', '凹透鏡的焦點在無限遠'], 0, '平行光穿過凹透鏡後怎麼走？'),
        conclusion: '近視眼鏡是凹透鏡：讓光先發散一些，再進入眼睛。' }
    ]
  };
  const QUIZ = {
    reflection: [
      { id: 'q1', question: '一束光與平面鏡夾 25°，反射角是多少？', options: ['65°', '25°', '50°'], answer: 0, hint: '先找出入射角。', explain: '入射角＝90° − 25°＝65°，反射角＝入射角＝65°。' },
      { id: 'q2', question: '為什麼我們能從教室各個位置看見黑板上的字？', options: ['黑板表面粗糙，產生漫射', '黑板會自己發光', '黑板表面光滑，只有單向反射'], answer: 0, hint: '黑板是光滑還是粗糙？', explain: '粗糙表面把光反射到各個方向，所以各位置都有光進入眼睛。' }
    ],
    refraction: [
      { id: 'q1', question: '光由水斜射入空氣，下列何者正確？', options: ['折射角大於入射角，偏離法線', '折射角小於入射角', '一定發生全反射'], answer: 0, hint: '水中的光速比較快還是慢？', explain: '水中光速較慢，射入空氣（較快）時偏離法線；入射角超過臨界角才會全反射。' },
      { id: 'q2', question: '下列哪一種情形「可能」發生全反射？', options: ['光由玻璃射向空氣', '光由空氣射向水', '光由空氣射向玻璃'], answer: 0, hint: '全反射需要由慢到快。', explain: '只有光由光速慢（折射率大）射向光速快（折射率小）的介質才有臨界角。' }
    ],
    mirror: [
      { id: 'q1', question: '小明站在平面鏡前 2 m，他和鏡中像的距離是？', options: ['4 m', '2 m', '1 m'], answer: 0, hint: '像在鏡後多遠？', explain: '像在鏡後 2 m，所以人和像相距 2＋2＝4 m。' },
      { id: 'q2', question: '汽車的後照鏡、路口的反光鏡多用凸面鏡，主要原因是？', options: ['視野較廣', '像比較大', '能成實像'], answer: 0, hint: '凸面鏡的像是放大還是縮小？', explain: '凸面鏡成正立縮小的虛像，雖然小但看得到的範圍廣。' }
    ],
    lens: [
      { id: 'q1', question: '用凸透鏡當放大鏡看字時，字應該放在哪裡？', options: ['焦點以內', '2 倍焦距外', '焦點與 2 倍焦距之間'], answer: 0, hint: '要正立、放大的虛像。', explain: '物體在 F 內，凸透鏡成正立、放大的虛像，就是放大鏡。' },
      { id: 'q2', question: '下列哪一種像可以用光屏接到？', options: ['凸透鏡成的倒立實像', '放大鏡看到的像', '凹透鏡成的像'], answer: 0, hint: '光屏只接得到哪一種像？', explain: '只有實像是光線真的會聚的地方，才能用光屏接到。' }
    ]
  };
  function startGuide() {
    guide?.destroy?.();
    if (!L) return;
    guide = L.guidedStudy($('study-panel'), LESSONS[state.topic], `jutor.optics.guide.${state.topic}.v1`, QUIZ[state.topic], `jutor.optics.quiz.${state.topic}.v1`, () => state.mode === 'study');
  }

  // ---------- 模式與網址 ----------
  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.set('topic', state.topic);
    imaging() ? url.searchParams.set('optic', typeNow()) : url.searchParams.delete('optic');
    state.mode === 'free' ? url.searchParams.delete('mode') : url.searchParams.set('mode', state.mode);
    try { history.replaceState(null, '', url); } catch (_) { /* 本機檔案檢視時不更新網址 */ }
  }
  function setMode(name) {
    // 進入自修模式：左側動畫全部回到初始狀態並停止，等學生按「準備」
    if (name === 'study') { resetTopic(false); restartNext = true; setPlaying(false); }
    state.mode = name; document.body.dataset.study = String(name === 'study'); document.body.classList.toggle('projection', name === 'projection');
    $('study-panel').hidden = name !== 'study'; $('free-panel').hidden = name !== 'free';
    $('proj-hint').hidden = name !== 'projection'; $('fullscreen').hidden = name !== 'projection';
    [['free-mode', 'free'], ['study-mode', 'study'], ['proj-mode', 'projection']].forEach(([id, n]) => $(id).setAttribute('aria-pressed', String(name === n)));
    if (name !== 'projection' && document.fullscreenElement) document.exitFullscreen?.();
    updateUrl(); render(name === 'study');
  }
  $('free-mode').onclick = () => setMode('free'); $('study-mode').onclick = () => setMode('study'); $('proj-mode').onclick = () => setMode('projection');
  $('fullscreen').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
  document.addEventListener('keydown', e => {
    if (state.mode !== 'projection' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName, typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.target.closest?.('.handle');
    if (e.key === 'Escape') { setMode('free'); return; }
    if (typing) return;
    if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); setPlaying(!state.playing); }
    else if (e.key.toLowerCase() === 'r') resetTopic();
    else if (/^[1-4]$/.test(e.key)) setTopic(TOPIC_KEYS[+e.key - 1]);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); const k = e.key === 'ArrowRight' ? 1 : -1, big = e.shiftKey;
      if (state.topic === 'reflection') setReflTheta(state.refl.theta - k * (big ? 5 : 1));
      else if (state.topic === 'refraction') state.refr.view === 'ray' ? setRefrTheta(state.refr.theta - k * (big ? 5 : 1)) : setEye(state.refr.eye + k * (big ? .5 : .1));
      else setDistance(state.img.distance - k * (big ? .25 : .05), false);
    }
  });
  document.addEventListener('pointerup', () => { if (state.mode === 'projection' && document.activeElement?.matches?.('input[type=range]')) document.activeElement.blur(); });

  // 以 ?topic=refraction&mode=projection 直接開啟（老師可存成書籤）
  const q = new URLSearchParams(location.search);
  if (TOPICS[q.get('topic')]) state.topic = q.get('topic');
  if (imaging() && TOPICS[state.topic].optics.includes(q.get('optic'))) state.optic[state.topic] = q.get('optic');
  startGuide();
  setPlaying(state.playing);
  setMode(['study', 'projection'].includes(q.get('mode')) ? q.get('mode') : 'free');
})();
