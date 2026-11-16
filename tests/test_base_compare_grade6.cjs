const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../elementary/base_compare_questions_grade6.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const { F, add, sub, mul, div } = Q;
const value = a => a.n / a.d;
const raw = f => typeof f.expected === 'object' ? `${f.expected.n}/${f.expected.d}` : String(f.expected);

test('formula rules reproduce the worksheet answers (講義例題與學霸之路)', () => {
  const cases = [
    // [kind, dir, given, ratio text, answer]
    ['sum', 'fwd', F(28), '2 3/7', F(96)],          // 兩量之和 鳩-01
    ['sum', 'fwd', F(2400), '0.35', F(3240)],        // 鳩-02 成本加三成五
    ['sum', 'rev', F(104), '3/5', F(65)],            // 鳩-04
    ['sum', 'rev', F(520), '0.3', F(400)],           // 鳩-05
    ['diff', 'fwd', F(180), '2/3', F(60)],           // 兩量之差 鳩-01
    ['diff', 'fwd', F(140), '1.2', F(28)],           // 鳩-02
    ['diff', 'fwd', F(480000), '75%', F(120000)],    // 鳩-03
    ['diff', 'rev', F(72), '1.8', F(90)],            // 鳩-04
    ['diff', 'rev', F(8), '120%', F(40)],            // 鳩-05
    ['sum', 'rev', F(48), '5', F(8)],                // 學霸 35
    ['diff', 'rev', F(60), '20%', F(75)],            // 學霸 30（蘋果）
    ['diff', 'rev', F(18000), '5/8', F(48000)],      // 學霸 43（姐姐）
    ['diff', 'rev', F(45), '1 1/3', F(135)],         // 學霸 46
    ['sum', 'rev', F(2850), '1.5', F(1140)],         // 學霸 47
    ['sum', 'rev', F(3300), '5/6', F(1800)],         // 學霸 48
    ['diff', 'fwd', F(960), '0.65', F(336)],         // 學霸 34
    ['sum', 'fwd', F(375), '50%', F(1125, 2)],       // 學霸 29：562.5
    ['diff', 'rev', F(420), '0.3', F(600)]           // 學霸 45（原價，折後 180）
  ];
  for (const [kind, dir, given, ratio, answer] of cases) {
    const options = Q.formulaOptions({ kind, dir, given, r: Q.ratio(ratio), amountStyle: 'auto' });
    assert.deepEqual(options[0].v, answer, `${kind}/${dir}/${ratio}`);
    assert.equal(options.filter(o => o.correct).length, 1);
    assert.equal(new Set(options.map(o => o.text)).size, 4);
  }
  // 學霸 21、36、24：比較量、基準量與倍數
  assert.deepEqual(Q.formulaOptions({ kind: 'value', ask: 'comp', given: F(480), r: Q.ratio('6.5'), amountStyle: 'auto' })[0].v, F(3120));
  assert.deepEqual(Q.formulaOptions({ kind: 'value', ask: 'base', given: F(84), r: Q.ratio('0.7'), amountStyle: 'auto' })[0].v, F(120));
  assert.deepEqual(Q.formulaOptions({ kind: 'value', ask: 'times', baseV: F(1, 2), compV: F(7, 4), r: Q.ratio('3.5'), amountStyle: 'frac' })[0].v, F(7, 2));
  assert.equal(Q.cheng(35).text, '三成五'); assert.equal(Q.cheng(30).text, '三成'); assert.equal(Q.zhe(3).ft, '0.3');
});

test('every step question is internally consistent and uses exact arithmetic', () => {
  const seen = new Set();
  for (const type of ['value', 'sum', 'sumBase', 'diff', 'diffBase']) for (let v = 0, random = rng(type.length * 97); v < 400; v++) {
    const q = Q.generate(type, null, random, v), s = q.scenario;
    seen.add(`${type}:${s.business || s.ask || 'pair'}`);
    assert.ok(q.text && q.textHtml && q.explanation && !/undefined|NaN|Infinity/.test(q.text + q.explanation), q.text);
    assert.equal(q.steps.length, 3);
    // 比較量 = 基準量 × 比值；和、差依定義計算。
    assert.deepEqual(s.compV, mul(s.baseV, s.r.v));
    if (s.kind === 'sum') assert.deepEqual(s.total, add(s.baseV, s.compV));
    if (s.kind === 'diff') assert.equal(value(s.total), Math.abs(value(s.compV) - value(s.baseV)));
    // Step 1：正解永遠是基準量。
    const baseField = q.steps[0].fields[0];
    assert.equal(baseField.optionLabels[baseField.expected].slice(2), s.baseLabel);
    // Step 2：正確算式的值就是最後答案。
    const formula = q.steps[1].fields[0], options = Q.formulaOptions(s);
    assert.equal(formula.optionLabels[formula.expected].slice(2), options.find(o => o.correct).text);
    assert.deepEqual(options.find(o => o.correct).v, s.answer[0].v);
    // Step 3：答案與題意一致。
    const expectedMain = s.kind === 'value' ? { times: div(s.compV, s.baseV), comp: s.compV, base: s.baseV }[s.ask] : s.dir === 'fwd' ? s.total : s.baseV;
    assert.deepEqual(s.answer[0].v, expectedMain);
    for (const f of q.steps.flatMap(st => st.fields)) {
      assert.ok(Q.correct(raw(f), f), `${q.text} ${f.label}`);
      assert.ok(!Q.correct(f.type === 'decision' ? '0' : '', f));
    }
    if (s.kind !== 'value') assert.ok(s.answer.every(a => a.v.d === 1), q.text); // 和差題答案皆為整數
    assert.deepEqual(q.finalFields, q.steps[2].fields);
  }
  for (const k of ['sum:markup', 'sum:price', 'sum:sales', 'sum:volume', 'diff:spend', 'diff:book', 'diff:save', 'diff:decrease', 'diff:discount', 'diff:flood', 'value:times', 'value:comp', 'value:base', 'sum:pair', 'diffBase:pair'])
    assert.ok(seen.has(k), k);
});

test('true/false and multiple-choice answers match an independent check', () => {
  let trueCount = 0, wrongMath = 0;
  const random = rng(42);
  for (let v = 0; v < 600; v++) {
    const j = Q.generate('judge', null, random, v), f = j.finalFields[0];
    assert.ok(['yes', 'no'].includes(f.expected));
    if (f.expected === 'yes') trueCount++;
    if (j.scenario) {
      const options = Q.formulaOptions(j.scenario), right = options[0];
      const m = j.text.match(/列式為 (.+)＝([^＝]+)。$/);
      const shownCorrect = m[1] === right.text && m[2] === Q.show(right.v, j.scenario.amountStyle);
      assert.equal(f.expected === 'yes', shownCorrect, j.text);
      if (m[1] === right.text && !shownCorrect) wrongMath++;
    }
    const c = Q.generate('choice', null, random, v), cf = c.finalFields[0];
    assert.equal(cf.options.length, 4); assert.equal(new Set(Object.values(cf.optionLabels)).size, 4);
    if (c.scenario && /正確算式/.test(c.text)) assert.equal(cf.optionLabels[cf.expected].slice(2), Q.formulaOptions(c.scenario)[0].text);
    if (c.scenario && !/正確算式/.test(c.text)) assert.ok(cf.optionLabels[cf.expected].startsWith(`${cf.optionLabels[cf.expected][0]} ${Q.show(c.scenario.answer[0].v, c.scenario.amountStyle)}`));
  }
  assert.ok(trueCount > 200 && trueCount < 400, trueCount);
  assert.ok(wrongMath > 10);
});

test('each exam has ten unique questions with the fixed type mix', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const exam = Q.buildExam(null, rng(seed)), counts = {};
    exam.forEach(q => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    assert.equal(exam.length, 10);
    assert.deepEqual(counts, { value: 1, sum: 1, sumBase: 2, diff: 1, diffBase: 1, judge: 2, choice: 2 });
    assert.equal(new Set(exam.map(q => q.text)).size, 10);
    for (const q of exam) for (const f of q.finalFields) assert.ok(Q.correct(raw(f), f));
  }
});

test('answers accept equivalent decimals and fractions but reject near misses', () => {
  const ratioField = { type: 'rational', expected: F(4, 5) };
  for (const ok of ['0.8', '4/5', '8/10', '.8']) assert.ok(Q.correct(ok, ratioField), ok);
  for (const bad of ['0.08', '5/4', '', '1']) assert.ok(!Q.correct(bad, ratioField), bad);
  const mixed = { type: 'rational', expected: F(66, 25) };
  for (const ok of ['2 16/25', '66/25', '2.64']) assert.ok(Q.correct(ok, mixed), ok);
  assert.equal(Q.format(F(66, 25)), '2 16/25'); assert.equal(Q.format(1140), '1140');
  assert.equal(Q.show(F(1125, 2)), '562.5'); assert.equal(Q.show(F(13, 8), 'frac'), '1 5/8');
  assert.throws(() => Q.generate('missing'));
});
