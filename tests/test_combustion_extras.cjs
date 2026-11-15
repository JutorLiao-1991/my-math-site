const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../senior/chemistry/chemistry_core.js');
const isInt = x => Math.abs(x - Math.round(x)) < 1e-9;

test('除講義例題外，所有試樣都是整數莫耳且自洽', () => {
  for (const s of C.samples.filter(s => s.id !== 'lecture')) {
    const d = C.combustion(s.mass, s.water, s.co2);
    for (const [k, v] of [['H2O', d.nWater], ['CO2', d.nCO2], ['O', d.nO]]) assert.ok(isInt(v), `${s.id} ${k} = ${v}`);
    assert.deepEqual(C.ratioFromMoles(d.nC, d.nH, d.nO), s.ratio, s.id);
    if (s.molarMass) assert.ok(isInt(s.molarMass / C.empiricalMass(s.ratio)), s.id);
  }
});

test('乘 2、乘 3 的題目', () => {
  const b = C.samples.find(s => s.id === 'butane'), g = C.samples.find(s => s.id === 'glycerol');
  let d = C.combustion(b.mass, b.water, b.co2); assert.equal(C.multiplierFor(d.nC, d.nH, d.nO), 2); assert.equal(C.empirical(b.ratio), 'C2H5');
  d = C.combustion(g.mass, g.water, g.co2); assert.equal(C.multiplierFor(d.nC, d.nH, d.nO), 3); assert.equal(C.empirical(g.ratio), 'C3H8O3');
});

test('出新題：所有題庫化合物都產生整數莫耳數據', () => {
  for (const f of C.pool) for (const n of [1, 2]) {
    const s = C.sampleFromFormula(f, n), d = C.combustion(s.mass, s.water, s.co2);
    assert.ok(isInt(d.nWater) && isInt(d.nCO2) && isInt(d.nO) && d.physical, String(f));
    assert.deepEqual(C.ratioFromMoles(d.nC, d.nH, d.nO), s.ratio, String(f));
    assert.ok(isInt(s.molarMass / C.empiricalMass(s.ratio)));
  }
  let seed = 1; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 200; i++) { const s = C.randomSample(rand); assert.ok(s.water % 18 === 0 && s.co2 % 44 === 0); }
});

test('自訂數據：可用、可抓錯', () => {
  const s = C.customSample(4.5, 2.7, 6.6, null); assert.deepEqual(s.ratio, [1, 2, 1]); assert.equal(s.molarMass, null);
  assert.deepEqual(C.customSample(180, 108, 264, 180).ratio, [1, 2, 1]);
  assert.throws(() => C.customSample(10, 18, 44, null), /超過/);
  assert.throws(() => C.customSample(180, 108, 264, 100), /整數倍/);
  assert.equal(C.ratioFromMoles(1, 2.5, 0).join(), '2,5,0');
  assert.equal(C.ratioFromMoles(1, 1.37, 0), null);
});
