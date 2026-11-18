const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../elementary/circle_sector_questions_grade6.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const { F, evaluate } = Q;
const raw = f => typeof f.expected === 'object' ? `${f.expected.n}/${f.expected.d}` : String(f.expected);
const dec = x => F(Math.round(x * 1000), 1000);

test('expression evaluator follows left-to-right order with 3.14', () => {
  assert.deepEqual(evaluate('12×12×3.14'), dec(452.16));                    // 鳩-03
  assert.deepEqual(evaluate('25×25×3.14'), dec(1962.5));                    // 鳩-04
  assert.deepEqual(evaluate('0.5×0.5×3.14'), dec(0.785));                   // 鳩-07
  assert.deepEqual(evaluate('30×30×3.14×60/360'), F(471));                  // 鳩-22
  assert.deepEqual(evaluate('24×24×3.14×1/6'), dec(301.44));                // 鳩-23
  assert.deepEqual(evaluate('1570×144/360'), F(628));                       // 鳩-24
  assert.deepEqual(evaluate('628×240/360'), F(1256, 3));                    // 鳩-26(2) 418 2/3
  assert.deepEqual(evaluate('4×4×3.14×72/360'), dec(10.048));               // 鳩-27
  assert.deepEqual(evaluate('8×8×3.14×72/360'), dec(40.192));               // 鳩-28
  assert.deepEqual(evaluate('9×9×3.14×40/360'), dec(28.26));                // 鳩-29
  assert.deepEqual(evaluate('9×9×3.14×240/360'), dec(169.56));              // 鳩-31
  assert.deepEqual(evaluate('108×360/288'), F(135));                        // 鳩-39
  assert.deepEqual(evaluate('(5×5×3.14÷4－5×5÷2)×2'), dec(14.25));           // 鳩-37
  assert.deepEqual(evaluate('1/2×1/2'), F(1, 4));
  assert.throws(() => evaluate('3×'));
});

test('generated shaded figures reproduce the worksheet answers', () => {
  const targets = [
    ['三邊長是 6、8、10 公分', 0, '', 54.5],                       // 鳩-11
    ['對角線長 20 公分', 1, '', 114],                  // 鳩-12
    ['大圓的半徑是 5 公分', 2, '1 公分', 25.12],         // 鳩-13
    ['邊長是 12 公分，裡面', 3, '', 102.96],            // 鳩-14
    ['邊長 18 公尺的正方形牆壁，牆上排了 9 個', 4, '', 254.34], // 鳩-15
    ['長是 18 公分、寬是 12 公分', 4, '', 169.56],       // 鳩-16
    ['半徑 15 公分的大扇形挖掉一個半徑 8 公分、圓心角 90°', 5, '15°', 185.26], // 鳩-30
    ['邊長是 14 公分的正方形和一個扇形', 6, '', 42.14],    // 鳩-32
    ['半徑 12 公分的四分之一圓', 7, '', 41.04],          // 鳩-33
    ['正方形的邊長是 4 公分', 8, '', 9.12],             // 鳩-34
    ['半徑都是 5 公分', 9, '', 57],                    // 鳩-35
    ['半徑 2 公分的四分之一圓', 10, '', 12.56],          // 鳩-36
    ['正方形的邊長是 5 公分', 8, '', 14.25],            // 鳩-37
    ['邊長 20 公分的正三角形', 11, '', 157]             // 鳩-38
  ];
  for (const [needle, template, extra, expected] of targets) {
    let found = null;
    for (let seed = 1; seed < 6000 && !found; seed++) {
      const q = Q.generate('shaded', null, rng(seed), template);
      if (q.text.includes(needle) && (!extra || q.text.includes(extra) || q.scenario.options[0].text.includes(extra))) found = q;
    }
    assert.ok(found, needle);
    assert.deepEqual(found.finalFields[0].expected.n !== undefined ? found.finalFields[0].expected : F(found.finalFields[0].expected), dec(expected), needle);
  }
});

test('arc length and composite perimeter reproduce textbook answers', () => {
  const targets = [
    ['perimeter', 0, '每段虛線都是 5 公分', 31.4],          // 課本範例 2
    ['perimeter', 1, '正方形的邊長是 4 公分', 12.56],
    ['perimeter', 2, '邊長是 14 公分的正方形', 49.98],      // 21.98＋28
    ['perimeter', 3, '邊長 20 公分的正三角形', 91.4],        // 31.4＋60
    ['perimeter', 4, '長方形的長是 100 公尺，半圓的直徑是 40 公尺', 325.6],
    ['perimeter', 5, '邊長 4 公分的正方形四邊', 25.12],
    ['arc', 3, '直徑 10 公分的半圓形', 25.7]
  ];
  for (const [type, variant, needle, expected] of targets) {
    let found = null;
    for (let seed = 1; seed < 6000 && !found; seed++) { const q = Q.generate(type, null, rng(seed), variant); if (q.text.includes(needle)) found = q; }
    assert.ok(found, needle);
    const e = found.finalFields[0].expected;
    assert.deepEqual(typeof e === 'object' ? e : F(e), dec(expected), needle);
  }
  assert.deepEqual(evaluate('8×2×3.14×72/360'), dec(10.048));   // 分針尖端 12 分鐘
});

test('every step question is consistent: formula value = answer, one correct option, inputs accepted', () => {
  const seenShaded = new Set(), seenPerimeter = new Set();
  for (const type of ['area', 'ratio', 'sector', 'sectorWhole', 'shaded', 'arc', 'perimeter']) for (let v = 0, random = rng(type.length * 31); v < 360; v++) {
    const q = Q.generate(type, null, random, v), s = q.scenario;
    if (type === 'shaded') { seenShaded.add(s.template); assert.ok(q.textHtml.includes('<svg'), q.text); }
    if (type === 'perimeter') { seenPerimeter.add(s.template); assert.ok(q.textHtml.includes('<svg'), q.text); }
    assert.ok(!/\d\/\d/.test(q.text), q.text);
    assert.ok(q.text && !/undefined|NaN|Infinity/.test(q.text + q.explanation + q.textHtml), q.text);
    assert.equal(q.steps.length, 3);
    assert.equal(s.options.length, 4);
    assert.equal(new Set(s.options.map(o => o.text)).size, 4);
    assert.equal(new Set(s.options.map(o => `${o.v.n}/${o.v.d}`)).size, 4, q.text);
    assert.deepEqual(evaluate(s.options[0].text), s.answer.v);
    const formula = q.steps[1].fields[0];
    assert.equal(formula.optionLabels[formula.expected].slice(2), s.options[0].text);
    assert.ok(s.answer.v.n > 0);
    for (const f of q.steps.flatMap(st => st.fields)) {
      assert.ok(Q.correct(raw(f), f), `${q.text} ${f.label}`);
      if (f.type === 'decision') assert.ok(!Q.correct('9', f));
    }
    assert.deepEqual(q.finalFields, q.steps[2].fields);
  }
  assert.equal(seenShaded.size, Q.SHADED_COUNT);
  assert.equal(seenPerimeter.size, Q.PERIMETER_COUNT);
});

test('true/false and multiple-choice answers match an independent check', () => {
  const random = rng(77);
  let trueCount = 0;
  for (let v = 0; v < 600; v++) {
    const j = Q.generate('judge', null, random, v), f = j.finalFields[0];
    if (f.expected === 'yes') trueCount++;
    if (j.scenario) {
      const m = j.text.match(/列式為 (.+)＝([^＝]+)。$/), right = j.scenario.options[0];
      assert.ok(m, j.text);
      assert.equal(f.expected === 'yes', m[1] === right.text && m[2] === Q.show(right.v), j.text);
    }
    const c = Q.generate('choice', null, random, v), cf = c.finalFields[0];
    assert.equal(cf.options.length, 4);
    assert.equal(new Set(Object.values(cf.optionLabels)).size, 4, c.text);
    if (c.scenario) assert.ok(cf.optionLabels[cf.expected].slice(2).startsWith(Q.show(c.scenario.answer.v)), c.text);
  }
  assert.ok(trueCount > 200 && trueCount < 400, trueCount);
});

test('each exam has ten unique questions with the fixed type mix', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const exam = Q.buildExam(null, rng(seed)), counts = {};
    exam.forEach(q => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    assert.equal(exam.length, 10);
    assert.deepEqual(counts, { area: 1, ratio: 1, sector: 1, sectorWhole: 1, arc: 1, shaded: 2, perimeter: 1, judge: 1, choice: 1 });
    assert.equal(new Set(exam.map(q => q.text)).size, 10);
    assert.equal(new Set(exam.filter(q => q.topic === 'shaded').map(q => q.scenario.template)).size, 2);
    for (const q of exam) for (const f of q.finalFields) assert.ok(Q.correct(raw(f), f));
  }
});
