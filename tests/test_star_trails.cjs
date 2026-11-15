const test = require('node:test'), assert = require('node:assert/strict');
const S = require('../senior/earth/star_core.js');
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('天北極仰角＝緯度，且在正北方', () => {
  for (const lat of [90, 30, 25, 0, -60]) { const h = S.horizon(90, 0, lat); close(h.alt, lat, 1e-9); if (lat > -90 && lat < 90) close(h.az % 360, 0, 1e-9); }
});

test('上中天：仰角 90 − |φ − δ|，方位南或北', () => {
  close(S.horizon(0, 0, 30).alt, 60); close(S.horizon(0, 0, 30).az, 180);          // 天球赤道在正南
  close(S.horizon(60, 0, 30).alt, 60); close(S.horizon(60, 0, 30).az, 0);          // 赤緯 60° 上中天在北方仰角 60°
  close(S.horizon(-30, 180, 30).alt, -90 + 0, 1e-9);                                  // 赤緯 −30° 下中天在天底
});

test('東升西落：時角 −90° 在東、+90° 在西（赤道星）', () => {
  close(S.horizon(0, -90, 30).az, 90); close(S.horizon(0, 90, 30).az, 270); close(S.horizon(0, -90, 30).alt, 0);
});

test('拱極星、出沒星、恆隱星分類（講義五顆星）', () => {
  const at = lat => [80, 60, 0, -30, -70].map(d => S.classify(d, lat));
  assert.deepEqual(at(90), ['circumpolar', 'circumpolar', 'horizon', 'hidden', 'hidden']);
  assert.deepEqual(at(30), ['circumpolar', 'circumpolar', 'rise-set', 'rise-set', 'hidden']);
  assert.deepEqual(at(0), ['rise-set', 'rise-set', 'rise-set', 'rise-set', 'rise-set']);
  assert.deepEqual(at(-60), ['hidden', 'hidden', 'rise-set', 'circumpolar', 'circumpolar']);
  assert.ok(S.onBoundary(60, 30) && S.onBoundary(-30, -60) && !S.onBoundary(80, 30));
  assert.deepEqual(at(-90), ['hidden', 'hidden', 'horizon', 'circumpolar', 'circumpolar']);
});

test('出現在地平面上的時間比例', () => {
  close(S.fractionUp(0, 30), 0.5); close(S.fractionUp(0, 0), 0.5); close(S.fractionUp(30, 0), 0.5);
  assert.ok(S.fractionUp(20, 30) > 0.5 && S.fractionUp(-20, 30) < 0.5);
  const H = -S.riseHourAngle(20, 30); close(S.horizon(20, -H, 30).alt, 0, 1e-9);
});

test('可見星空範圍與比例', () => {
  close(S.visibleRange(90).fraction, 0.5); close(S.visibleRange(0).fraction, 1); close(S.visibleRange(-90).fraction, 0.5);
  const v = S.visibleRange(30); assert.equal(v.lo, -60); assert.equal(v.hi, 90); close(v.fraction, (1 + Math.cos(Math.PI / 6)) / 2);
  const s = S.visibleRange(-60); assert.equal(s.lo, -90); assert.equal(s.hi, 30);
});

test('講義填空答案', () => {
  const w = lat => Object.fromEntries(S.worksheet(lat));
  assert.equal(w(90)['北極星仰角'], '90°'); assert.equal(w(90)['星軌與地面'], '平行（夾角 0°）'); assert.equal(w(90)['拱極星'], '整個天空都是');
  assert.equal(w(30)['北極星仰角'], '30°'); assert.equal(w(30)['星軌與地面'], '斜交，夾角 60°'); assert.equal(w(30)['拱極星'], '與北極星之張角 < 30°');
  assert.match(w(30)['可見星空'], /赤緯 −60° ～ \+90°/);
  assert.equal(w(0)['星軌與地面'], '垂直（夾角 90°）'); assert.equal(w(0)['拱極星'], '沒有拱極星'); assert.equal(w(0)['可見星空'], '整個天球都看得到（100%）');
  assert.match(w(-60)['北極星仰角'], /看不到/); assert.equal(w(-60)['拱極星'], '與自轉軸（天南極）之張角 < 60°'); assert.equal(w(-60)['旋轉方向'], '繞天南極順時針轉');
  assert.equal(w(-90)['可見星空'], '只看得到南半天球（50%）');
});

test('背景星固定且分布在全天球', () => {
  const a = S.backgroundStars(), b = S.backgroundStars();
  assert.deepEqual(a, b); assert.equal(a.length, 220);
  assert.ok(a.some(s => s.dec > 60) && a.some(s => s.dec < -60));
});
