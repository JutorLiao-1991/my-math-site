const test = require('node:test'), assert = require('node:assert/strict');
const M = require('../senior/physics/motion_core.js');
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('linear: 公式、折返與路程', () => {
  const p = { x0: 0, v0: 10, a: -4 };
  close(M.linear(p, 2.5).v, 0); close(M.linear(p, 2.5).x, 12.5);
  assert.equal(M.linear(p, 0).turn, 2.5);
  const s = M.linear(p, 5); close(s.x, 0); close(s.displacement, 0); close(s.distance, 25);
  assert.equal(M.linear({ x0: 0, v0: 5, a: 0 }, 3).turn, null); // 等速不會折返
  close(M.linear({ x0: 0, v0: 5, a: 0 }, 3).distance, 15);
  assert.equal(M.linear({ x0: 0, v0: 4, a: 2 }, 5).turn, null); // v、a 同號不折返
  close(M.linear({ x0: 0, v0: 4, a: 2 }, 5).x, 45); // v–t 梯形面積 (4+14)/2×5
  close(M.linear({ x0: 3, v0: -6, a: 3 }, 2).turn, 2);
});

test('linear: v–t 面積等於位移', () => {
  const p = { x0: 2, v0: -3, a: 1.5 };
  let area = 0; const n = 100000, t = 7;
  for (let i = 0; i < n; i++) area += M.linear(p, (i + 0.5) * t / n).v * t / n;
  close(area, M.linear(p, t).displacement, 1e-6);
});

test('projectile: 飛行時間、射程、最高點', () => {
  const g = 9.8, s = M.summary({ v0: 20, angleDeg: 45, h0: 0, g });
  close(s.T, 2 * 20 * Math.sin(Math.PI / 4) / g); close(s.R, 400 / g, 1e-9); close(s.H, (20 * Math.sin(Math.PI / 4)) ** 2 / (2 * g));
  close(s.tPeak, 20 * Math.sin(Math.PI / 4) / g);
  const end = M.projectile({ v0: 20, angleDeg: 45, h0: 0, g }, s.T); close(end.y, 0, 1e-9); close(end.x, s.R, 1e-9);
});

test('projectile: 互補角射程相同，45° 最大（h0 = 0）', () => {
  const R = a => M.summary({ v0: 20, angleDeg: a, h0: 0, g: 9.8 }).R;
  for (const a of [10, 20, 30, 40]) close(R(a), R(90 - a), 1e-9);
  for (let a = 0; a <= 90; a++) assert.ok(R(a) <= R(45) + 1e-9);
});

test('projectile: 水平拋射與自由落體同時落地；起始高度', () => {
  const g = 9.8, h0 = 30, s = M.summary({ v0: 12, angleDeg: 0, h0, g });
  close(s.T, Math.sqrt(2 * h0 / g)); close(s.R, 12 * s.T);
  assert.equal(s.H, h0); assert.equal(s.tPeak, 0);
  const t = 1.3; close(M.projectile({ v0: 12, angleDeg: 0, h0, g }, t).y, h0 - 0.5 * g * t * t);
  // h0 > 0 時最遠角度小於 45°
  let best = 0, bestR = 0; for (let a = 0; a <= 90; a += 0.5) { const r = M.summary({ v0: 20, angleDeg: a, h0: 20, g }).R; if (r > bestR) { bestR = r; best = a; } }
  assert.ok(best < 45);
});

test('projectile: 最高點速率等於水平分速；月球射程較大', () => {
  const p = { v0: 20, angleDeg: 45, h0: 0, g: 9.8 }, s = M.summary(p), q = M.projectile(p, s.tPeak);
  close(q.vy, 0, 1e-9); close(q.speed, q.vx, 1e-9);
  assert.ok(M.summary({ ...p, g: 1.62 }).R > s.R);
});

test('無效輸入會丟出 RangeError', () => {
  assert.throws(() => M.summary({ v0: 20, angleDeg: 45, h0: -1, g: 9.8 }), RangeError);
  assert.throws(() => M.summary({ v0: 20, angleDeg: 45, h0: 0, g: 0 }), RangeError);
  assert.throws(() => M.linear({ x0: 0, v0: 1, a: NaN }, 1), RangeError);
  assert.throws(() => M.linear({ x0: 0, v0: 1, a: 1 }, -1), RangeError);
});
