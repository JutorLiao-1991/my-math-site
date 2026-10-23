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
  const api = { CRITICAL, validBase, value, transform, point, properties, chord, mirror, positiveBaseIntersections };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpLog = api;
})(typeof globalThis === 'object' ? globalThis : this);
