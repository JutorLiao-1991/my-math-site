const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../elementary/division_questions_grade3.js');
const S = require('../elementary/paper_exam_status.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const nums = text => (text.match(/\d+/g) || []).map(Number);

test('every generated answer is accepted and every final field belongs to a step', () => {
  for (const type of Q.PRACTICE_TYPES) for (let v = 0; v < 400; v++) {
    const q = Q.generate(type, null, rng(v * 13 + 7), v);
    assert.ok(q.text && q.textHtml && q.explanation, `${type}/${v}`);
    for (const f of q.steps.flatMap(s => s.fields)) {
      assert.ok(Q.correct(String(f.expected), f), `${type}/${v}/${f.label}`);
      if (f.type === 'number') assert.ok(f.integerOnly && !Q.correct(String(f.expected + 1), f));
    }
    for (const f of q.finalFields) assert.ok(q.steps.some(s => s.fields.includes(f)) || (q.examSteps || []).some(s => s.fields.includes(f)));
    const exam = q.examSteps ? q.examSteps.flatMap(s => s.fields) : q.finalFields;
    assert.deepEqual(new Set(exam), new Set(q.finalFields), `${type}: exam layout shows exactly the scored fields`);
    const values = Object.fromEntries(q.finalFields.map(f => [f.key, String(f.expected)]));
    assert.equal(S.classify(q.finalFields, values).completion, 'complete');
  }
});

test('division facts stay in the grade-3 range: divisor 2-9, one-digit quotient, remainder smaller than divisor', () => {
  for (const type of ['meaning', 'remainder', 'calc', 'vertical', 'verticalWord']) for (let v = 0; v < 400; v++) {
    const q = Q.generate(type, null, rng(v + 1), v), fields = q.steps.flatMap(s => s.fields);
    const quotient = fields.find(f => f.label === '商').expected, remainder = (fields.find(f => f.label === '餘數') || { expected: 0 }).expected;
    const formula = q.explanation.match(/(\d+)÷(\d+)＝(\d+)/);
    const [a, b] = [Number(formula[1]), Number(formula[2])];
    assert.ok(b >= 2 && b <= 9, `${type}/${v} divisor ${b}`);
    assert.ok(quotient >= 1 && quotient <= 9, `${type}/${v} quotient ${quotient}`);
    assert.ok(remainder < b, `${type}/${v} remainder ${remainder} < ${b}`);
    assert.equal(b * quotient + remainder, a, `${type}/${v} ${a}÷${b}`);
    if (type === 'meaning') assert.equal(remainder, 0);
    if (type === 'remainder') assert.ok(remainder > 0);
    if (type === 'vertical' || type === 'verticalWord') {
      const product = fields.find(f => f.label === '乘出來的數').expected;
      assert.equal(product, b * quotient);
    }
  }
});

test('the first step of word problems asks for the division sentence', () => {
  for (const type of ['meaning', 'remainder', 'verticalWord']) for (let v = 0; v < 100; v++) {
    const q = Q.generate(type, null, rng(v + 50), v), f = q.steps[0].fields[0];
    const [, a, b] = q.explanation.match(/(\d+)÷(\d+)/), label = f.optionLabels[f.expected];
    assert.ok(label.endsWith(` ${a}÷${b}`), `${q.text} → ${label}`);
    assert.ok(nums(q.text).includes(Number(a)) && nums(q.text).includes(Number(b)), q.text);
    assert.equal(new Set(Object.values(f.optionLabels)).size, 4);
  }
});

test('wrong quotients and remainders get specific hints', () => {
  const q = Q.generate('vertical', null, rng(3), 0), [qf, pf, rf] = q.finalFields;
  const n = { q: qf.expected, b: pf.expected / qf.expected, r: rf.expected };
  assert.match(qf.feedback(String(qf.expected + 1)), /比 \d+ 還大/);
  if (qf.expected > 1) assert.match(qf.feedback(String(qf.expected - 1)), /商可以再大一點/);
  assert.match(rf.feedback(String(n.b)), /不能比除數/);
});

test('0 and 1 division, parity and multiple-choice items are unambiguous', () => {
  for (let v = 0; v < 300; v++) {
    const z = Q.generate('zeroOne', null, rng(v + 9), v);
    z.finalFields.forEach(f => { const [x, y] = f.label.split('÷').map(Number); assert.equal(f.expected, x / y); });
    const p = Q.generate('parity', null, rng(v + 99), v);
    assert.equal(p.finalFields.length, 6);
    p.finalFields.forEach(f => assert.equal(f.expected, Number(f.label) % 2 ? 'odd' : 'even'));
    assert.ok(p.finalFields.some(f => f.expected === 'even') && p.finalFields.some(f => f.expected === 'odd'));
    const c = Q.generate('choice', null, rng(v + 999), v), f = c.finalFields[0];
    assert.equal(new Set(Object.values(f.optionLabels).map(x => x.slice(2))).size, 4, c.text);
  }
});

test('exam has ten questions covering every section', () => {
  for (let s = 0; s < 30; s++) {
    const exam = Q.buildExam(null, rng(s + 1));
    assert.equal(exam.length, 10);
    assert.deepEqual([...new Set(exam.map(q => q.topic))].sort(), [...new Set(Q.EXAM_TYPES)].sort());
  }
});

test('vertical layout places the divisor, dividend and answer cells', () => {
  const q = Q.generate('vertical', null, rng(11), 0), html = Q.layoutStep(q.examSteps[0], f => `<i data-k="${f.key}"></i>`);
  assert.match(html, /class="vd-side vd-divisor">\d/);
  assert.equal((html.match(/data-k=/g) || []).length, 3);
  const step2 = Q.layoutStep(q.steps[1], f => `<i data-k="${f.key}"></i>`);
  assert.equal((step2.match(/data-k=/g) || []).length, 1);
  assert.ok(step2.includes(`vd-q">${q.finalFields[0].expected}<`));
});
