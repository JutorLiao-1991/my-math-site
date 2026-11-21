const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../senior/earth/star_core.js');
const S = require('../senior/earth/sun_core.js');
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);

test('二分二至日期對應黃經 0°、90°、180°、270°，正反換算一致', () => {
  close(S.lambdaOfDay(S.dayOf(3, 21)), 0); close(S.lambdaOfDay(S.dayOf(6, 21)), 90);
  close(S.lambdaOfDay(S.dayOf(9, 23)), 180); close(S.lambdaOfDay(S.dayOf(12, 22)), 270);
  for (let d = 1; d <= 365; d += 7) close(S.dayOfLambda(S.lambdaOfDay(d)), d, 1e-9);
  assert.equal(S.dateName(S.dayOf(6, 21)), '6 月 21 日'); assert.equal(S.dateName(1), '1 月 1 日'); assert.equal(S.dateName(365), '12 月 31 日');
});

test('太陽沿黃道每天東移約 1°，一年繞一圈', () => {
  for (let d = 1; d < 365; d++) { const step = S.norm(S.lambdaOfDay(d + 1) - S.lambdaOfDay(d)); assert.ok(step > 0.9 && step < 1.05, `day ${d}: ${step}`); }
});

test('黃道上的赤緯：二分 0°、二至 ±23.44°，黃道點是單位向量', () => {
  close(S.declination(0), 0); close(S.declination(90), 23.44, 1e-9); close(S.declination(270), -23.44, 1e-9);
  for (let l = 0; l < 360; l += 15) { const v = S.eclVec(l); close(Math.hypot(...v), 1); close(S.eclToEq(l).dec, S.declination(l)); }
  close(S.eclToEq(90).ra, 90); close(S.eclToEq(180).ra, 180);
});

test('日行軌跡與黃道交於 λ 與 180°−λ；二至相切', () => {
  const c = S.crossings(S.lambdaOfDay(S.dayOf(5, 21)));
  close(S.declination(c.today), S.declination(c.twin), 1e-9); assert.equal(c.tangent, false);
  assert.ok(Math.abs(c.twinDay - S.dayOf(7, 23)) <= 1.5, String(c.twinDay));
  assert.equal(S.crossings(90).tangent, true); assert.equal(S.crossings(270).tangent, true); assert.equal(S.crossings(0).tangent, false);
});

test('正午仰角 90° − |φ − δ|，方向與講義一致', () => {
  assert.deepEqual(S.noon(25, 23.44), { alt: 90 - 1.56, dir: '南' }); close(S.noon(25, -23.44).alt, 41.56, 1e-9);
  assert.equal(S.noon(0, 23.44).dir, '北'); assert.equal(S.noon(23.44, 23.44).dir, '天頂');
  for (const lat of [25, 0, -35]) for (const day of [80, 172, 356]) { const s = S.sunAt(lat, day, 12); close(s.alt, S.noon(lat, s.dec).alt, 1e-9); }
});

test('白晝：春分各地 12 小時正東升起；夏至北半球晝長、極區永晝', () => {
  for (const lat of [0, 25, 60, -35]) { const d = S.daylight(lat, 0); close(d.hours, 12, 1e-9); close(d.riseAz, 90, 1e-9); }
  assert.ok(S.daylight(25, 23.44).hours > 13 && S.daylight(25, -23.44).hours < 11);
  assert.equal(S.daylight(70, 23.44).type, 'polar-day'); assert.equal(S.daylight(70, -23.44).type, 'polar-night');
  assert.ok(S.daylight(25, 23.44).riseAz < 90 && S.daylight(25, -23.44).riseAz > 90);
  assert.equal(S.riseDirection(90), '正東'); assert.match(S.riseDirection(64.5), /東偏北 25\.5°/);
  const d = S.daylight(25, 23.44), H0 = 15 * (12 - d.rise); close(K.horizon(23.44, -H0, 25).alt, 0, 1e-9);
});

test('太陽時角：正午在子午線、6 點在東邊（春分赤道）', () => {
  const dawn = S.sunAt(0, 80, 6), noon = S.sunAt(0, 80, 12), dusk = S.sunAt(0, 80, 18);
  close(dawn.alt, 0, 1e-9); close(dawn.az, 90, 1e-9); close(noon.alt, 90, 1e-9); close(dusk.az, 270, 1e-9);
});

test('黃道十三星座首尾相接，春分在雙魚座、夏至在雙子座', () => {
  assert.equal(S.ZODIAC.length, 13); assert.equal(S.constellationOf(0), '雙魚座'); assert.equal(S.constellationOf(91), '雙子座');
  assert.equal(S.constellationOf(S.lambdaOfDay(S.dayOf(12, 5))), '蛇夫座');
  for (let l = 0; l < 360; l += 0.5) assert.ok(S.constellationOf(l));
});

test('講義填空答案', () => {
  const w = (lat, day) => Object.fromEntries(S.worksheet(lat, day));
  const summer = w(25, S.dayOf(6, 21));
  assert.match(summer['太陽在黃道上'], /黃經 90°（夏至點）/); assert.equal(summer['太陽赤緯'], '+23.4°');
  assert.match(summer['與黃道的交點'], /相切於夏至點/); assert.equal(summer['正午太陽'], '在南方，仰角 88.4°');
  assert.match(summer['日出與晝長'], /東偏北/);
  const may = w(25, S.dayOf(5, 21)); assert.match(may['與黃道的交點'], /兩點/); assert.match(may['與黃道的交點'], /7 月 2[234] 日/);
  assert.equal(w(0, S.dayOf(3, 21))['正午太陽'], '仰角 90°（正好在天頂）');
  assert.match(w(80, S.dayOf(12, 22))['日出與晝長'], /永夜/); assert.match(w(80, S.dayOf(12, 22))['正午太陽'], /地平面下/);
  assert.match(w(-35, S.dayOf(6, 21))['正午太陽'], /北方/);
});
