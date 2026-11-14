const test = require('node:test'), assert = require('node:assert/strict');
const W = require('../senior/physics/wave_core.js'), S = require('../senior/physics/wave_surface.js');
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('lightReadout: 雙狹縫亮紋與暗紋判讀', () => {
  const base = { kind: 'interference', L: 1000, lambda: .55, d: 180, a: 40 };
  const m2 = W.orderPosition('interference', 2, 1000, .55, 180, 40), r = W.lightReadout({ ...base, p: m2 });
  close(r.orders, 2, 1e-9); close(r.path, 2 * .55, 1e-9); assert.equal(r.type, 'bright'); assert.equal(r.order, 2); close(r.intensity, 1, 1e-9);
  const dark = W.lightReadout({ ...base, p: W.orderPosition('interference', 1.5, 1000, .55, 180, 40) });
  assert.equal(dark.type, 'dark'); assert.equal(dark.order, 2); close(dark.intensity, 0, 1e-9); // 光程差 1.5λ：第 2 條暗紋
  assert.equal(W.lightReadout({ ...base, p: 0 }).type, 'bright'); // 中央亮紋
  close(W.lightReadout({ ...base, p: 0 }).approxSpacing, .55 * 1000 / 180, 1e-12);
});

test('lightReadout: 單狹縫中央亮帶與暗紋', () => {
  const o = { kind: 'diffraction', L: 1000, lambda: .55, a: 40 }, r0 = W.lightReadout({ ...o, p: 0 });
  assert.equal(r0.type, 'center'); close(r0.intensity, 1);
  const p1 = W.orderPosition('diffraction', 1, 1000, .55, null, 40), r1 = W.lightReadout({ ...o, p: p1 });
  assert.equal(r1.type, 'dark'); assert.equal(r1.order, 1); close(r1.intensity, 0, 1e-9);
  close(r1.centralWidthExact, 2 * p1, 1e-9); assert.ok(Math.abs(r1.centralWidthApprox - r1.centralWidthExact) < 0.01 * r1.centralWidthExact);
  // 縫越窄、中央亮帶越寬
  assert.ok(W.lightReadout({ ...o, a: 20, p: 0 }).centralWidthApprox > r1.centralWidthApprox);
});

test('lightReadout: 小角度近似與精確值差異很小；無效輸入', () => {
  const r = W.lightReadout({ kind: 'interference', L: 1000, lambda: .55, d: 180, a: 40, p: 10 });
  assert.ok(Math.abs(r.path - r.approxPath) / r.path < 1e-3);
  assert.equal(W.orderPosition('interference', 400, 1000, .55, 180, 40), null);
  assert.throws(() => W.lightReadout({ kind: 'interference', L: 0, lambda: .55, d: 180, a: 40, p: 1 }), Error);
  assert.throws(() => W.lightReadout({ kind: 'x', L: 1000, lambda: .55, d: 180, a: 40, p: 1 }), Error);
});

test('WaveSurface.camera：中心、俯視方向、側視高度、縮放', () => {
  const v = { yaw: 0, tilt: 0, zoom: 1 }, c = S.camera(v, 720, 420);
  close(c(0, 0, 0).x, 360); close(c(0, 0, 0).y, 210);
  assert.ok(c(0, 100, 0).y < 210 && c(100, 0, 0).x > 360); // 俯視：+y 在螢幕上方、+x 在右方
  const side = S.camera({ yaw: 0, tilt: 90, zoom: 1 }, 720, 420);
  assert.ok(side(0, 0, 50).y < side(0, 0, 0).y); // 側視：z 越大越高
  close(side(0, 100, 0).y, 210, 1e-6); // 側視時深度方向不改變螢幕高度
  const near = S.camera({ yaw: 0, tilt: 55, zoom: 1 }, 720, 420);
  assert.ok(near(0, -100, 0).depth < near(0, 100, 0).depth); // +y 較遠
  assert.ok(Math.abs(S.camera({ yaw: 0, tilt: 55, zoom: 2 }, 720, 420)(100, 0, 0).x - 360) > Math.abs(near(100, 0, 0).x - 360) * 1.9);
  const turned = S.camera({ yaw: 90, tilt: 0, zoom: 1 }, 720, 420); // 繞鉛直軸轉 90°：+x 變成 +y 方向
  assert.ok(turned(100, 0, 0).y < 210 && Math.abs(turned(100, 0, 0).x - 360) < 1e-6);
});

test('WaveSurface.render：畫出全部格子並回傳投影函式', () => {
  let fills = 0; const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() { fills++; }, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set lineJoin(v) {} };
  const out = S.render(ctx, { nx: 10, ny: 6, x0: -10, x1: 10, y0: 0, y1: 10, zAt: (x, y) => Math.sin(x / 3) * Math.cos(y / 3), zScale: 5, view: S.DEFAULT_VIEW, w: 720, h: 420 });
  assert.equal(fills, 60); assert.equal(typeof out.project, 'function');
});
