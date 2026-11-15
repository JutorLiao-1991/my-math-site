const test = require('node:test'), assert = require('node:assert/strict');
const D = require('../senior/physics/doppler_core.js');
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('聲源移動：前短後長、波速不變、前高後低', () => {
  const r = D.sourceMoving({ f: 2, v: 340, vs: 120 });
  close(r.rest.lambda, 170); close(r.ahead.lambda, 110); close(r.behind.lambda, 230); // 與 Astro Ni 範例數值相同
  assert.equal(r.ahead.speed, 340); assert.equal(r.behind.speed, 340);
  assert.equal(D.compare(r.ahead.lambda, r.rest.lambda), 'down'); assert.equal(D.compare(r.behind.lambda, r.rest.lambda), 'up');
  assert.equal(D.compare(r.ahead.speed, r.rest.speed), 'same');
  assert.ok(r.ahead.freq > 2 && r.behind.freq < 2);
  close(r.ahead.freq, 2 * 340 / 220); close(r.behind.freq, 2 * 340 / 460);
});

test('觀察者移動：波長不變、視波速 v ± vo、頻率靠近高遠離低', () => {
  const near = D.observerMoving({ f: 2, v: 340, vo: 100, toward: true }), away = D.observerMoving({ f: 2, v: 340, vo: 100, toward: false });
  assert.equal(D.compare(near.moving.lambda, near.rest.lambda), 'same');
  close(near.moving.speed, 440); close(away.moving.speed, 240);
  close(near.moving.freq, 2 * 440 / 340); close(away.moving.freq, 2 * 240 / 340);
  // 同速率時，聲源移動與觀察者移動聽到的頻率不同（空氣是靜止的）
  const src = D.sourceMoving({ f: 2, v: 340, vs: 100 });
  close(src.ahead.freq, 2.8333333333, 1e-9); close(near.moving.freq, 2.5882352941, 1e-9);
});

test('速度為 0 時三個量都不變', () => {
  const s = D.sourceMoving({ f: 1.5, v: 100, vs: 0 }), o = D.observerMoving({ f: 1.5, v: 100, vo: 0, toward: true });
  for (const k of ['lambda', 'speed', 'freq']) { assert.equal(D.compare(s.ahead[k], s.rest[k]), 'same'); assert.equal(D.compare(o.moving[k], o.rest[k]), 'same'); }
});

test('arrivals：靜止與靠近的觀察者計數', () => {
  const v = 100, fronts = []; for (let k = 0; k < 40; k++) fronts.push({ te: k * 0.5, xe: 0 }); // f = 2
  const count = (xo, T) => { let n = 0; for (let t = 0; t < T; t += 0.01) n += D.arrivals(fronts, v, xo, t, t + 0.01); return n; };
  const still = count(() => 300, 13), moving = count(t => 300 - 50 * t, 5.9);
  // 靜止：3 s 後開始，每 0.5 s 一個 → 13 s 內 21 個
  assert.equal(still, 21);
  // 靠近（vo = 0.5 v）：頻率 3 /s，第一個在 2 s 抵達 → 5.9 s 前共 12 個
  assert.equal(moving, 12);
});

test('無效輸入會丟出 RangeError', () => {
  assert.throws(() => D.sourceMoving({ f: 2, v: 340, vs: 340 }), RangeError);
  assert.throws(() => D.observerMoving({ f: 2, v: 340, vo: -1, toward: true }), RangeError);
  assert.throws(() => D.sourceMoving({ f: 0, v: 340, vs: 10 }), RangeError);
});
