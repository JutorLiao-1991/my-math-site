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
