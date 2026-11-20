const test = require('node:test'), assert = require('node:assert/strict');
const M = require('../junior/science/moon_phase_core.js');
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} !≈ ${b}`);
const at = (k, t) => M.describe(t, M.PHASES.find(p => p.key === k).elong);

test('太陽：6 點東升、12 點在南方仰角 66°、18 點西落、0 點在地平線下', () => {
  close(M.sun(6).alt, 0); close(M.sun(6).az, 90);
  close(M.sun(12).alt, 66); close(M.sun(12).az, 180);
  close(M.sun(18).alt, 0); close(M.sun(18).az, 270);
  close(M.sun(0).alt, -66);
});

test('觀測者位置：12 點正對太陽，18 點轉到俯視圖上方（逆時針自轉）', () => {
  assert.equal(M.observerAngle(12), 0); assert.equal(M.observerAngle(18), 90);
  assert.equal(M.observerAngle(0), 180); assert.equal(M.observerAngle(6), 270);
});

test('四種月相 × 四個時刻（台灣，北緯 24°）', () => {
  const row = k => M.TIMES.map(t => at(k, t).state);
  assert.deepEqual(row('new'), ['down', 'rising', 'up', 'setting']);
  assert.deepEqual(row('first'), ['setting', 'down', 'rising', 'up']);
  assert.deepEqual(row('full'), ['up', 'setting', 'down', 'rising']);
  assert.deepEqual(row('last'), ['rising', 'up', 'setting', 'down']);
  // 上中天都在正南方、仰角 66°
  for (const [k, t] of [['first', 18], ['full', 0], ['last', 6], ['new', 12]]) { const d = at(k, t); close(d.alt, 66); close(d.az, 180); assert.equal(d.short, '南方高空' + (k === 'new' ? '（看不到）' : '')); }
  assert.equal(at('full', 18).short, '東方升起'); assert.equal(at('first', 0).short, '西方落下'); assert.equal(at('last', 18).short, '地平線下');
});

test('朔：月亮在地平面上也看不到', () => {
  const d = at('new', 12); assert.equal(d.state, 'up'); assert.equal(d.visible, false); assert.match(d.text, /看不到/);
  assert.equal(at('first', 18).visible, true); assert.equal(at('full', 12).visible, false);
});

test('月出、月落、上中天時刻', () => {
  const rs = e => [M.clock(M.riseTime(e)), M.clock(M.transitTime(e)), M.clock(M.setTime(e))];
  assert.deepEqual(rs(0), ['06:00', '12:00', '18:00']);
  assert.deepEqual(rs(90), ['12:00', '18:00', '00:00']);
  assert.deepEqual(rs(180), ['18:00', '00:00', '06:00']);
  assert.deepEqual(rs(270), ['00:00', '06:00', '12:00']);
  // 月出時刻真的在地平線上、方位正東
  for (const e of [37, 90, 200, 300]) { const m = M.moon(M.riseTime(e), e); close(m.alt, 0, 1e-9); close(m.az, 90, 1e-9); }
});

test('亮面朝向太陽：上弦傍晚右邊亮、下弦清晨左邊亮', () => {
  assert.equal(M.brightSide(18, 90).side, '右'); assert.equal(M.brightSide(18, 90).compass, '西');
  assert.equal(M.brightSide(6, 270).side, '左'); assert.equal(M.brightSide(6, 270).compass, '東');
  // 亮面方向必須與「月亮指向太陽」的大圓切線一致
  for (const [t, e] of [[15, 60], [20, 120], [3, 250], [9, 300]]) {
    const b = M.brightSide(t, e).vec, m = M.moon(t, e).vec, s = M.sun(t).vec;
    close(M.dot(b, m), 0, 1e-9); assert.ok(M.dot(b, s) > 0);
  }
});

test('月相名稱、照亮比例與農曆日期', () => {
  assert.deepEqual(M.PHASES.map(p => M.phaseName(p.elong)), ['朔（新月）', '上弦月', '望（滿月）', '下弦月']);
  assert.equal(M.phaseName(45), '眉月'); assert.equal(M.phaseName(135), '盈凸月'); assert.equal(M.phaseName(225), '虧凸月'); assert.equal(M.phaseName(315), '殘月');
  close(M.illum(0), 0); close(M.illum(90), .5); close(M.illum(180), 1); close(M.illum(270), .5);
  assert.equal(M.lunarText(0), '農曆初一'); assert.equal(M.lunarText(90), '農曆初七、初八'); assert.equal(M.lunarText(270), '農曆廿二、廿三');
  assert.equal(M.dayName(1), '初一'); assert.equal(M.dayName(10), '初十'); assert.equal(M.dayName(15), '十五'); assert.equal(M.dayName(20), '二十'); assert.equal(M.dayName(22), '廿二'); assert.equal(M.dayName(30), '三十');
  close(M.elongFromAge(M.ageDays(123)), 123, 1e-9);
});

test('講解表格：四列，每列四格加月出月落', () => {
  const t = M.table(); assert.equal(t.length, 4);
  assert.deepEqual(t[2].cells, ['南方高空', '西方落下', '地平線下', '東方升起']);
  assert.equal(t[1].rise, '12:00'); assert.equal(t[3].set, '12:00');
});
