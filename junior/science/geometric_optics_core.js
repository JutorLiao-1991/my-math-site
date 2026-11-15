(function (root) {
  'use strict';
  // 器材：f 以「1 格」為單位；平面鏡 f = ∞。
  const TYPES = {
    'convex-lens': { name: '凸透鏡', mirror: false, f: 1, group: '會聚', use: '放大鏡、相機鏡頭' },
    'concave-lens': { name: '凹透鏡', mirror: false, f: -1, group: '發散', use: '近視眼鏡' },
    'plane-mirror': { name: '平面鏡', mirror: true, f: Infinity, group: '平面', use: '穿衣鏡、潛望鏡' },
    'concave-mirror': { name: '凹面鏡', mirror: true, f: 1, group: '會聚', use: '化妝鏡、手電筒反射罩' },
    'convex-mirror': { name: '凸面鏡', mirror: true, f: -1, group: '發散', use: '道路轉角廣角鏡' }
  };
  // 常見介質的折射率（可見光近似值；本教具忽略色散）。
  const MEDIA = {
    air: { name: '空氣', n: 1.00, tint: '#f7fbff' },
    water: { name: '水', n: 1.33, tint: '#dcefff' },
    glass: { name: '玻璃', n: 1.50, tint: '#d9f0ea' },
    diamond: { name: '鑽石', n: 2.42, tint: '#ece3fa' }
  };
  const C = 3.00e8, HEIGHT = 0.65;
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const isPlane = optic => !Number.isFinite(optic.f);

  // ---------- 成像（薄透鏡、近軸球面鏡、平面鏡） ----------
  function image(type, distance, height = HEIGHT) {
    const optic = TYPES[type];
    if (!optic || !Number.isFinite(distance) || distance <= 0 || !Number.isFinite(height)) throw new RangeError('Invalid optical object');
    const direction = optic.mirror ? -1 : 1;
    if (Math.abs(distance - optic.f) < 1e-9) return { finite: false, optic, distance, height, direction };
    const q = isPlane(optic) ? -distance : optic.f * distance / (distance - optic.f), magnification = -q / distance;
    return { finite: true, optic, distance, height, direction, q, x: direction * q, y: magnification * height,
      magnification, real: q > 0, upright: magnification > 0,
      size: Math.abs(Math.abs(magnification) - 1) < 1e-8 ? '等大' : Math.abs(magnification) > 1 ? '放大' : '縮小' };
  }
  // 近軸追跡：在器材上高度 y、斜率 u 的光線，出射斜率 u′ = u − y/f；面鏡則水平方向反轉。
  function trace(type, distance, y, height = HEIGHT) {
    const optic = TYPES[type], s = optic.mirror ? -1 : 1, u = (y - height) / distance;
    return { source: { x: -distance, y: height }, hit: { x: 0, y }, vector: { x: s, y: u - (isPlane(optic) ? 0 : y / optic.f) } };
  }
  function rays(type, distance, height = HEIGHT) {
    const im = image(type, distance, height), { optic } = im;
    const make = (id, y) => Object.assign({ id }, trace(type, distance, y, height));
    const result = [make('parallel', height), make('central', 0)];
    if (im.finite && !isPlane(optic)) result.push(make('focal', im.y));
    if (optic.mirror && !isPlane(optic)) {
      const cx = -2 * optic.f;
      if (Math.abs(distance + cx) > 1e-9) result.push(make('curvature', height * cx / (distance + cx)));
    }
    return result;
  }
  // 「多條光線」：由物體頂端射向整個器材的一束光。
  function fan(type, distance, count = 9, aperture = 1.45, height = HEIGHT) {
    const list = [];
    for (let i = 0; i < count; i++) list.push(Object.assign({ id: 'fan' }, trace(type, distance, -aperture + 2 * aperture * i / (count - 1), height)));
    return list;
  }
  // Clip a parametric line to the visible rectangle. Works even when the hit is off-screen.
  function clip(origin, vector, bounds, start = 0, end = Infinity) {
    let lo = start, hi = end;
    for (const [axis, min, max] of [['x', bounds.xMin, bounds.xMax], ['y', bounds.yMin, bounds.yMax]]) {
      const v = vector[axis], p = origin[axis];
      if (Math.abs(v) < 1e-12) { if (p < min || p > max) return null; }
      else { const a = (min - p) / v, b = (max - p) / v; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
    }
    if (hi < lo || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return [{ x: origin.x + lo * vector.x, y: origin.y + lo * vector.y }, { x: origin.x + hi * vector.x, y: origin.y + hi * vector.y }];
  }
  function snap(distance, enabled = true) {
    const d = Math.max(0.25, Math.min(4, distance));
    return enabled && Math.abs(d - Math.round(d)) < 0.045 && (Math.round(d) === 1 || Math.round(d) === 2) ? Math.round(d) : d;
  }
  function screen(type, distance, x) {
    const im = image(type, distance);
    const correctSide = Math.abs(x) > 0.1 && x * im.direction > 0;
    const sharp = im.finite && im.real && correctSide && Math.abs(x - im.x) <= 0.035;
    const ys = rays(type, distance).slice(0, 2).map(r => r.hit.y + (x / r.vector.x) * r.vector.y);
    return { sharp, correctSide, possible: im.finite && im.real && correctSide, spread: Math.max(...ys) - Math.min(...ys) };
  }

  // ---------- 反射定律 ----------
  // 單位向量 d 遇到單位法向量 n：r = d − 2(d·n)n。
  function reflect(d, n) {
    const k = 2 * (d.x * n.x + d.y * n.y);
    return { x: d.x - k * n.x, y: d.y - k * n.y };
  }
  // 粗糙表面：各點法線的傾角（固定的偽隨機數，每次看到的畫面相同）。
  const ROUGH_TILTS = [-17, 12, -6, 18, -13, 4, -18, 15, -3];   // 傾角上限 18°，搭配入射角 ≤ 50°，反射光不會射入表面
  function diffuse(theta, offsets) {
    const d = { x: Math.sin(rad(theta)), y: -Math.cos(rad(theta)) };   // 向下射向鏡面（y 向上為正）
    return offsets.map((x, i) => {
      const tilt = ROUGH_TILTS[i % ROUGH_TILTS.length], n = { x: Math.sin(rad(tilt)), y: Math.cos(rad(tilt)) };
      const r = reflect(d, n), cosIn = -(d.x * n.x + d.y * n.y);
      return { x, tilt, normal: n, incident: d, reflected: r, angle: deg(Math.acos(Math.min(1, cosIn))) };
    });
  }

  // ---------- 折射與全反射 ----------
  function critical(n1, n2) { return n1 > n2 ? deg(Math.asin(n2 / n1)) : null; }
  // 角度皆由法線量起；theta 的正負代表在法線哪一側，折射角與入射角同號（光線越過法線前進）。
  function refract(n1, n2, theta) {
    if (!(n1 > 0 && n2 > 0) || !Number.isFinite(theta) || Math.abs(theta) >= 90) throw new RangeError('Invalid refraction input');
    const a = Math.abs(rad(theta)), sin2 = n1 / n2 * Math.sin(a), sign = theta < 0 ? -1 : 1;
    const result = { n1, n2, incidence: theta, reflection: theta, critical: critical(n1, n2), v1: C / n1, v2: C / n2 };
    if (sin2 >= 1 - 1e-12) return Object.assign(result, { refraction: null, total: true, R: 1, T: 0, toward: null });
    const c1 = Math.cos(a), c2 = Math.sqrt(1 - sin2 * sin2);
    const rs = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2), rp = (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2);
    // 穿透率由穿透係數獨立計算，供測試檢查 R + T = 1。
    const ts = 2 * n1 * c1 / (n1 * c1 + n2 * c2), tp = 2 * n1 * c1 / (n2 * c1 + n1 * c2), factor = n2 * c2 / (n1 * c1);
    const R = (rs * rs + rp * rp) / 2, T = factor * (ts * ts + tp * tp) / 2;
    return Object.assign(result, { refraction: sign * deg(Math.asin(sin2)), total: false, R, T,
      toward: n2 > n1 ? 'toward' : n2 < n1 ? 'away' : 'straight' });
  }
  // 看水中物體：物體在下方介質 (n2)、眼睛在上方介質 (n1)，界面 y = 0。
  function surfacePoint(n1, n2, object, eye) {
    const f = x => n2 * Math.sin(Math.atan2(x - object.x, -object.y)) - n1 * Math.sin(Math.atan2(eye.x - x, eye.y));
    let lo = Math.min(object.x, eye.x), hi = Math.max(object.x, eye.x);
    if (hi - lo < 1e-12) return object.x;
    let flo = f(lo);
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function apparent(n1, n2, object, eye, spread = 0.06) {
    if (!(object.y < 0 && eye.y > 0)) throw new RangeError('Object must be below and eye above the surface');
    const sight = Math.atan2(eye.y, eye.x - object.x), off = { x: -Math.sin(sight) * spread, y: Math.cos(sight) * spread };
    const paths = [-1, 1].map(k => {
      const e = { x: eye.x + k * off.x, y: eye.y + k * off.y }, x0 = surfacePoint(n1, n2, object, e);
      const out = { x: e.x - x0, y: e.y }, len = Math.hypot(out.x, out.y);
      return { surface: { x: x0, y: 0 }, eye: e, direction: { x: out.x / len, y: out.y / len } };
    });
    // 兩條出射光的反向延長線交點＝看到的像。
    const [a, b] = paths, det = a.direction.x * b.direction.y - a.direction.y * b.direction.x;
    let image = null;
    if (Math.abs(det) > 1e-14) {
      const dx = b.surface.x - a.surface.x, t = (dx * b.direction.y) / det;
      image = { x: a.surface.x + t * a.direction.x, y: t * a.direction.y };
    }
    const center = surfacePoint(n1, n2, object, eye);
    return { surface: { x: center, y: 0 }, paths, image };
  }

  const api = { TYPES, MEDIA, HEIGHT, C, image, trace, rays, fan, clip, snap, screen, reflect, diffuse, critical, refract, surfacePoint, apparent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GeometricOptics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
