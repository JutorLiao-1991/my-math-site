const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../junior/science/geometric_optics_core.js');
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-8, `${msg || ''}: ${a} != ${b}`);

test('converging optics cover all five focal-distance regimes with correct image side', () => {
  for (const type of ['convex-lens', 'concave-mirror']) {
    for (const [d, q, m, real, size] of [[3, 1.5, -.5, true, '縮小'], [2, 2, -1, true, '等大'], [1.5, 3, -2, true, '放大'], [.5, -1, 2, false, '放大']]) {
      const im = G.image(type, d); near(im.q, q); near(im.magnification, m);
      near(im.x, (G.TYPES[type].mirror ? -1 : 1) * q);
      assert.equal(im.real, real); assert.equal(im.size, size); assert.equal(im.upright, !real);
    }
    assert.equal(G.image(type, 1).finite, false);
  }
});
test('diverging optics always form upright reduced virtual images between optic and focus', () => {
  for (const type of ['concave-lens', 'convex-mirror']) for (const d of [.25, .5, 1, 1.5, 2, 3, 4, 100]) {
    const im = G.image(type, d);
    assert.ok(im.q < 0 && im.q > -1); assert.ok(im.magnification > 0 && im.magnification < 1);
    assert.equal(im.real, false); assert.equal(im.upright, true); assert.equal(im.size, '縮小');
    assert.equal(Math.sign(im.x), G.TYPES[type].mirror ? 1 : -1);
  }
});
test('every construction ray or back-trace intersects the independently calculated image', () => {
  for (const type of Object.keys(G.TYPES)) for (const d of [.25, .5, .99, 1, 1.01, 1.5, 1.99, 2, 2.01, 3, 4]) {
    const im = G.image(type, d);
    for (const ray of G.rays(type, d)) {
      near(ray.source.x, -d); near(ray.source.y, G.HEIGHT);
      assert.equal(Math.sign(ray.vector.x), G.TYPES[type].mirror ? -1 : 1);
      if (im.finite) near(ray.hit.y + im.x / ray.vector.x * ray.vector.y, im.y, `${type} ${d} ${ray.id}`);
    }
    if (!im.finite) {
      const [a, b] = G.rays(type, d);
      near(a.vector.y / a.vector.x, b.vector.y / b.vector.x);
    }
  }
});
test('vertex ray obeys reflection and curvature ray reverses its incident direction', () => {
  for (const type of ['concave-mirror', 'convex-mirror']) for (const d of [.5, 1.5, 3, 4]) {
    const rays = G.rays(type, d), vertex = rays.find(r => r.id === 'central'), curve = rays.find(r => r.id === 'curvature');
    near(vertex.vector.y, -G.HEIGHT / d);
    near(curve.vector.y / curve.vector.x, (curve.hit.y - curve.source.y) / d);
    const cx = -2 * G.TYPES[type].f;
    near(curve.source.y + (cx + d) / d * (curve.hit.y - curve.source.y), 0);
  }
  assert.ok(!G.rays('concave-mirror', 2).some(r => r.id === 'curvature'));
});
test('a screen can collect only real images on the physical outgoing side', () => {
  assert.equal(G.screen('convex-lens', 3, 1.5).sharp, true);
  assert.equal(G.screen('concave-mirror', 3, -1.5).sharp, true);
  assert.equal(G.screen('convex-lens', 3, -1.5).sharp, false);
  assert.equal(G.screen('concave-mirror', 3, 1.5).sharp, false);
  assert.equal(G.screen('convex-lens', 3, 2).sharp, false);
  for (const type of Object.keys(G.TYPES)) for (const x of [-4, -1, 0, 1, 4]) {
    assert.equal(G.screen(type, .5, x).sharp, false);
    assert.equal(G.screen(type, 1, x).sharp, false);
  }
});
test('near-focus values remain finite, focal infinity is explicit, and clipping never emits nonfinite coordinates', () => {
  const box = { xMin: -4.4, xMax: 4.4, yMin: -2.5, yMax: 2.5 };
  for (const type of Object.keys(G.TYPES)) for (const d of [.25, .999999, 1, 1.000001, 1.999999, 2, 2.000001, 4]) for (const ray of G.rays(type, d)) {
    const segment = G.clip(ray.hit, ray.vector, box);
    if (segment) for (const p of segment) for (const axis of ['x', 'y']) assert.ok(Number.isFinite(p[axis]));
  }
  assert.equal(G.image('convex-lens', 1).finite, false);
  assert.ok(G.image('convex-lens', .999999).finite);
  assert.deepEqual(G.clip({ x: 0, y: 0 }, { x: 1, y: 0 }, box), [{ x: 0, y: 0 }, { x: 4.4, y: 0 }]);
  assert.equal(G.clip({ x: 0, y: 9 }, { x: 1, y: 0 }, box), null);
  assert.deepEqual(G.clip({ x: 0, y: 0 }, { x: 1, y: 0 }, box, 0, 1), [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
});
test('snapping is restricted to focal landmarks and can be disabled', () => {
  near(G.snap(.98), 1); near(G.snap(2.03), 2); near(G.snap(1.5), 1.5); near(G.snap(.98, false), .98);
  near(G.snap(0), .25); near(G.snap(9), 4);
  for (const d of [-1, 0, NaN, Infinity]) assert.throws(() => G.image('convex-lens', d));
});
test('plane mirror forms an upright, same-size virtual image as far behind the mirror as the object is in front', () => {
  for (const d of [.25, 1, 2, 3.7]) {
    const im = G.image('plane-mirror', d);
    assert.ok(im.finite); near(im.q, -d); near(im.x, d); near(im.magnification, 1); near(im.y, G.HEIGHT);
    assert.equal(im.real, false); assert.equal(im.upright, true); assert.equal(im.size, '等大');
    assert.deepEqual(G.rays('plane-mirror', d).map(r => r.id), ['parallel', 'central']);
  }
});
test('every ray of the fan passes (or back-traces) through the same image point', () => {
  for (const type of Object.keys(G.TYPES)) for (const d of [.3, .5, 1.5, 2, 3, 4]) {
    const im = G.image(type, d);
    if (!im.finite) continue;
    for (const ray of G.fan(type, d, 11)) near(ray.hit.y + im.x / ray.vector.x * ray.vector.y, im.y, `${type} ${d}`);
  }
});
test('law of reflection: reflected angle equals incident angle, also for every point of a rough surface', () => {
  const r = G.reflect({ x: Math.sin(Math.PI / 6), y: -Math.cos(Math.PI / 6) }, { x: 0, y: 1 });
  near(r.x, Math.sin(Math.PI / 6)); near(r.y, Math.cos(Math.PI / 6));
  for (const theta of [-70, -30, 0, 15, 45, 80]) for (const p of G.diffuse(theta, [-2, -1, 0, 1, 2])) {
    const out = Math.acos(p.reflected.x * p.normal.x + p.reflected.y * p.normal.y) * 180 / Math.PI;
    near(out, p.angle, `theta ${theta} tilt ${p.tilt}`);
    near(Math.hypot(p.reflected.x, p.reflected.y), 1);
  }
});
test("Snell's law, energy conservation, critical angle and total internal reflection", () => {
  const M = G.MEDIA;
  for (const a of Object.values(M)) for (const b of Object.values(M)) for (const theta of [-80, -45, -10, 0, 10, 30, 41, 42, 60, 89]) {
    const r = G.refract(a.n, b.n, theta);
    near(r.reflection, theta);
    if (r.total) { assert.ok(a.n > b.n); assert.ok(Math.abs(theta) >= r.critical - 1e-9); near(r.R, 1); near(r.T, 0); continue; }
    near(a.n * Math.sin(theta * Math.PI / 180), b.n * Math.sin(r.refraction * Math.PI / 180), 'snell');
    assert.ok(Math.sign(r.refraction) === Math.sign(theta) || theta === 0);
    near(r.R + r.T, 1, `R+T ${a.name}->${b.name} ${theta}`);
    if (a.n < b.n && theta !== 0) assert.ok(Math.abs(r.refraction) < Math.abs(theta));
    if (a.n > b.n && theta !== 0) assert.ok(Math.abs(r.refraction) > Math.abs(theta));
  }
  near(G.critical(1.5, 1), Math.asin(1 / 1.5) * 180 / Math.PI);
  assert.ok(Math.abs(G.critical(1.5, 1) - 41.81) < .01); assert.ok(Math.abs(G.critical(1.33, 1) - 48.75) < .01);
  assert.equal(G.critical(1, 1.33), null);
  assert.ok(Math.abs(G.refract(1, 1.5, 0).R - .04) < 1e-9);
  near(G.refract(1, 1.5, 40).v2, 2e8);
  assert.equal(G.refract(1.5, 1, 42).total, true); assert.equal(G.refract(1.5, 1, 41).total, false);
  assert.throws(() => G.refract(1, 1.5, 90));
});
test('an object under water looks shallower; looking straight down the depth shrinks by n_air/n_water', () => {
  const look = G.apparent(1, 1.33, { x: 0, y: -2 }, { x: 0, y: 3 });
  assert.ok(Math.abs(look.image.y - (-2 / 1.33)) < 1e-3); assert.ok(Math.abs(look.image.x) < 1e-6);
  for (const ex of [-3, -1, 1, 2.5]) {
    const o = { x: 0, y: -2 }, e = { x: ex, y: 2.5 }, view = G.apparent(1, 1.33, o, e);
    assert.ok(view.image.y > o.y && view.image.y < 0, `ex ${ex}`);
    const x0 = view.surface.x, s2 = (x0 - o.x) / Math.hypot(x0 - o.x, o.y), s1 = (e.x - x0) / Math.hypot(e.x - x0, e.y);
    near(1.33 * s2, 1 * s1, 'refraction at the surface point');
  }
  assert.ok(G.apparent(1.33, 1, { x: 0, y: -2 }, { x: 0, y: 3 }).image.y < -2);
});
