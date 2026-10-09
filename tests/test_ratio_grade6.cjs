const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../elementary/ratio_questions_grade6.js');
const vm = require('node:vm');
const fs = require('node:fs');
let seed = 82719;
const rng = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };

test('exact fractions, finite decimals and mixed numbers; reject approximate or malformed values', () => {
  const field = { expected: { n: 2, d: 3 }, type: 'rational' };
  for (const s of ['2/3', '4/6', '20/30']) assert.ok(Q.correct(s, field));
  for (const s of ['', '0.666667', '3/2', '2/0', '2//3', 'Infinity', '2abc', '2.', '-2/3']) assert.ok(!Q.correct(s, field), s);
  assert.ok(Q.correct('0.125', { expected: { n: 1, d: 8 } }));
  assert.ok(Q.correct('1 2/3', { expected: { n: 5, d: 3 } }));
  assert.ok(!Q.correct('1 3/3', { expected: 2 }));
});

test('all four kinds and all numerical forms generate valid steps and final answers', () => {
  for (const type of Object.keys(Q.categories)) for (let i = 0; i < 160; i++) {
    const q = Q.generate(type, ['integer', 'decimal', 'fraction', 'mixed'], rng, i);
    assert.ok(q.text && q.textHtml && q.explanation);
    assert.ok(q.steps.length && q.finalFields.length);
    const keys = q.steps.flatMap(s => s.fields.map(f => f.key));
    assert.equal(new Set(keys).size, keys.length);
    for (const s of q.steps) for (const f of s.fields) {
      assert.ok(s.pattern.includes(`{${f.key}}`));
      assert.ok(Q.correct(Q.format(f.expected), f), `${type}: ${f.label}`);
    }
    for (const f of q.finalFields) assert.ok(keys.includes(f.key));
    if (type === 'value') {
      const [a, b, value] = q.finalFields;
      assert.equal(a.expected * value.expected.d, b.expected * value.expected.n);
    }
    if (q.simplified) {
      const [a, b] = q.simplified, [x, y] = q.original;
      assert.equal(Q.gcd(a, b), 1);
      assert.equal(a * y.n * x.d, b * x.n * y.d);
      assert.ok(Number.isInteger(a) && Number.isInteger(b) && a > 0 && b > 0);
    }
  }
});

test('selected simplification forms respected; geometry, units, equality and simplest-ratio recognition covered', () => {
  for (const form of ['integer', 'decimal', 'fraction', 'mixed']) for (let i = 0; i < 80; i++) {
    const q = Q.generate('equal', [form], rng, 3);
    assert.equal(q.form, form);
    if (form === 'mixed') for (const x of q.original) assert.ok(x.n > x.d && x.d > 1);
    if (form === 'integer') for (const x of q.original) assert.equal(x.d, 1);
  }
  assert.match(Q.generate('ratio', ['integer'], rng, 1).text, /周長/);
  assert.match(Q.generate('ratio', ['integer'], rng, 2).text, /面積/);
  const distribution = Q.generate('apply', ['integer'], rng, 2);
  const total = distribution.steps[0].fields[0].expected;
  assert.equal(distribution.finalFields.reduce((sum, f) => sum + f.expected, 0), total);
  assert.match(distribution.text, /公尺/);
  assert.match(Q.generate('equal', ['integer'], rng, 1).text, /最簡整數比嗎/);
});

test('exam always has 10 questions with 2/2/4/2 distribution and selected number forms', () => {
  for (let i = 0; i < 60; i++) {
    const exam = Q.buildExam(['fraction', 'mixed'], rng);
    assert.equal(exam.length, 10);
    for (const [type, count] of Object.entries({ ratio: 2, value: 2, equal: 4, apply: 2 })) assert.equal(exam.filter(q => q.type === type).length, count);
    assert.deepEqual(exam.filter(q => q.form).map(q => q.form).sort(), ['fraction', 'mixed']);
  }
});

test('explicit grade metadata is valid for every school lesson and new lesson is sixth grade', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync('data.js', 'utf8') + '; globalThis.lessons = lessonData;', context);
  const limits = { elementary: [1, 6], junior: [7, 9], senior: [10, 12] };
  for (const lesson of context.lessons) {
    if (!limits[lesson.category]) continue;
    const [lo, hi] = limits[lesson.category];
    assert.ok(lesson.grades.length > 0, lesson.title);
    assert.ok(lesson.grades.every(g => g >= lo && g <= hi), lesson.title);
    assert.ok(fs.existsSync(lesson.url));
  }
  const q = context.lessons.find(l => l.url === 'elementary/ratio_value_grade6.html');
  assert.equal(q.title, '比與比值（六年級）'); assert.equal(q.grades[0], 6);
});
