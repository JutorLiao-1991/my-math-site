(function (root) {
  'use strict';
  const TYPES = {
    'convex-lens': { name: '凸透鏡', mirror: false, f: 1, group: '會聚', use: '放大鏡、相機鏡頭' },
    'concave-lens': { name: '凹透鏡', mirror: false, f: -1, group: '發散', use: '近視眼鏡' },
    'concave-mirror': { name: '凹面鏡', mirror: true, f: 1, group: '會聚', use: '化妝鏡、反射式望遠鏡' },
    'convex-mirror': { name: '凸面鏡', mirror: true, f: -1, group: '發散', use: '道路轉角廣角鏡' }
  };
  const HEIGHT = 0.65;
  function image(type, distance, height = HEIGHT) {
    const optic = TYPES[type];
    if (!optic || !Number.isFinite(distance) || distance <= 0 || !Number.isFinite(height)) throw new RangeError('Invalid optical object');
    const direction = optic.mirror ? -1 : 1;
    if (Math.abs(distance - optic.f) < 1e-9) return { finite: false, optic, distance, height, direction };
    const q = optic.f * distance / (distance - optic.f), magnification = -q / distance;
    return { finite: true, optic, distance, height, direction, q, x: direction * q, y: magnification * height,
      magnification, real: q > 0, upright: magnification > 0,
      size: Math.abs(Math.abs(magnification) - 1) < 1e-8 ? '等大' : Math.abs(magnification) > 1 ? '放大' : '縮小' };
  }
  function rays(type, distance, height = HEIGHT) {
    const im = image(type, distance, height), { optic, direction: s } = im;
    const source = { x: -distance, y: height };
    const make = (id, y, dx, dy) => ({ id, source, hit: { x: 0, y }, vector: { x: dx, y: dy } });
    const result = [make('parallel', height, s, -height / optic.f), make('central', 0, s, -height / distance)];
    if (im.finite) result.push(make('focal', im.y, s, 0));
    if (optic.mirror) {
      const cx = -2 * optic.f;
      if (Math.abs(distance + cx) > 1e-9) {
        const y = height * cx / (distance + cx);
        result.push(make('curvature', y, -1, -(y - height) / distance));
      }
    }
    return result;
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
    return { sharp, correctSide, possible: im.finite && im.real && correctSide,
      spread: Math.max(...rays(type, distance).slice(0, 2).map(r => r.hit.y + (x / r.vector.x) * r.vector.y)) -
        Math.min(...rays(type, distance).slice(0, 2).map(r => r.hit.y + (x / r.vector.x) * r.vector.y)) };
  }
  const api = { TYPES, HEIGHT, image, rays, clip, snap, screen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GeometricOptics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
