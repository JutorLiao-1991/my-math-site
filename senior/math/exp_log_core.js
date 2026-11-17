/* Shared mathematical model. No browser or network dependencies. */
(function (root) {
  'use strict';
  const CRITICAL = Math.exp(1 / Math.E);
  function validBase(a) { return Number.isFinite(a) && a > 0 && a !== 1; }
  function value(kind, a, x) {
    if (!validBase(a)) return NaN;
    return kind === 'exp' ? Math.pow(a, x) : x > 0 ? Math.log(x) / Math.log(a) : NaN;
  }
  function transform(kind, a, x, h = 0, k = 0, sx = 1, sy = 1) {
    return sy * value(kind, a, sx * (x - h)) + k;
  }
  function point(kind, a, t, h = 0, k = 0, sx = 1, sy = 1) {
    // Logarithms are parameterized by y, so sampling never crosses their asymptote.
    return kind === 'exp' ? { x: sx * t + h, y: sy * Math.pow(a, t) + k }
      : { x: sx * Math.pow(a, t) + h, y: sy * t + k };
  }
  function properties(kind, a, h = 0, k = 0, sx = 1, sy = 1) {
    return {
      increasing: (a > 1 ? 1 : -1) * sx * sy > 0,
      concavity: (kind === 'exp' ? 1 : a > 1 ? -1 : 1) * sy,
      anchor: kind === 'exp' ? { x: h, y: k + sy } : { x: h + sx, y: k },
      domain: kind === 'exp' ? { all: true } : { bound: h, greater: sx > 0 },
      range: kind === 'log' ? { all: true } : { bound: k, greater: sy > 0 },
      asymptote: { axis: kind === 'exp' ? 'y' : 'x', value: kind === 'exp' ? k : h }
    };
  }
  function chord(kind, a, m, n) {
    if (!(m < n) || (kind === 'log' && m <= 0)) throw new RangeError('Require m < n in domain');
    const left = value(kind, a, m), right = value(kind, a, n);
    return { m, n, left, right, mid: (m + n) / 2, average: (left + right) / 2, curve: value(kind, a, (m + n) / 2) };
  }
  function mirror(p, progress) { return { x: p.x * (1 - progress) + p.y * progress, y: p.y * (1 - progress) + p.x * progress }; }
  function positiveBaseIntersections(a) {
    // For a>1 every intersection of a strictly increasing function and its inverse
    // lies on y=x. Solve log(x)/x=log(a), including the double root x=e.
    if (!validBase(a) || a < 1) return null;
    if (Math.abs(a - CRITICAL) < 1e-12) return [Math.E];
    if (a > CRITICAL) return [];
    const b = Math.log(a), f = x => Math.log(x) - b * x;
    function bisect(lo, hi) {
      const sign = Math.sign(f(lo));
      for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (Math.sign(f(mid)) === sign) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    }
    let upper = 2 * Math.E;
    while (f(upper) > 0 && upper < Number.MAX_VALUE / 4) upper *= 2;
    return [bisect(1, Math.E), bisect(Math.E, upper)];
  }
  function decreasingRoot(fn) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (fn(mid) > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function dualBaseIntersections(a, b, visible = {}) {
    if (!validBase(a) || a < 1 || !Number.isFinite(b) || b < .1 || b >= 1) throw new RangeError('Require a > 1 and 0.10 <= b < 1');
    const shown = id => visible[id] !== false;
    const result = [];
    function add(id, x, y, pair, exact = false) {
      const old = result.find(p => Math.hypot(p.x - x, p.y - y) < 1e-9);
      if (old) old.pairs.push(pair); else result.push({ id, x, y, pairs: [pair], exact });
    }
    if (shown('normal-exp') && shown('normal-log')) positiveBaseIntersections(a).forEach((x, i) => add('normal-pair-' + i, x, x, ['normal-exp', 'normal-log'], a === CRITICAL));
    if (shown('fractional-exp') && shown('fractional-log')) {
      // b >= 0.10 > exp(-e): the decreasing inverse pair has exactly one
      // intersection on y=x. The three-intersection regime is outside the UI.
      const x = decreasingRoot(x => Math.pow(b, x) - x);
      add('fractional-pair', x, x, ['fractional-exp', 'fractional-log']);
    }
    if (shown('normal-exp') && shown('fractional-exp')) add('exponentials', 0, 1, ['normal-exp', 'fractional-exp']);
    if (shown('normal-log') && shown('fractional-log')) add('logarithms', 1, 0, ['normal-log', 'fractional-log']);
    const first = shown('normal-exp') && shown('fractional-log');
    const second = shown('normal-log') && shown('fractional-exp');
    if (first || second) {
      const x = decreasingRoot(x => Math.log(x) / Math.log(b) - Math.pow(a, x));
      const y = Math.pow(a, x);
      if (first) add('mixed-upper', x, y, ['normal-exp', 'fractional-log']);
      if (second) add('mixed-lower', y, x, ['normal-log', 'fractional-exp']);
    }
    return result.sort((p, q) => p.x - q.x || p.y - q.y);
  }
  function fitIntersections(points) {
    if (!points.length) return { cx: 2.5, cy: 2.5, span: 9 };
    const low = Math.min(0, ...points.flatMap(p => [p.x, p.y]));
    const high = Math.max(1, ...points.flatMap(p => [p.x, p.y]));
    return { cx: (low + high) / 2, cy: (low + high) / 2, span: Math.max(6, (high - low) * 1.5) };
  }
  const api = { CRITICAL, validBase, value, transform, point, properties, chord, mirror, positiveBaseIntersections, dualBaseIntersections, fitIntersections };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpLog = api;
})(typeof globalThis === 'object' ? globalThis : this);
