const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../elementary/ratio_self_study.js');
const Q = require('../elementary/ratio_questions_grade6.js');
const E = require('../elementary/ratio_input_grade6.js');

test('Checkpoints distinguish order, ratio value, whole-mixture proportion, and equivalent ratios', () => {
  const order = S.lessons[0].checks[0], value = S.lessons[1].checks[0], equivalent = S.lessons[2].checks[0];
  assert.equal(S.assess(order, ['3', '5']).status, 'success');
  assert.match(S.assess(order, ['5', '3']).message, /順序顛倒/);
  assert.notEqual(S.assess(order, ['6', '10']).status, 'success', 'The question requires original counts');
  for (const answer of ['2/3', '4/6', '8/12', '20/30']) assert.equal(S.assess(value, [answer]).status, 'success');
  assert.match(S.assess(value, ['3/2']).message, /順序顛倒/);
  assert.match(S.assess(value, ['2/5']).message, /占整杯/);
  for (const answer of ['', '□/6', '2/0', '0.666667', '-2/3', '2//3']) assert.notEqual(S.assess(value, [answer]).status, 'success');
  assert.equal(S.assess(equivalent, ['8']).status, 'success');
  assert.notEqual(S.assess(equivalent, ['11']).status, 'success', 'Adding 9 to both terms does not preserve 2:3');
});

test('Simplest integer checks cover exact decimal, fraction and mixed ratios without rounding', () => {
  const answers = [['2', '3'], ['3', '2'], ['4', '5'], ['2', '3']];
  S.lessons[3].checks.forEach((c, i) => {
    assert.equal(S.assess(c, answers[i]).status, 'success');
    assert.equal(S.assess(c, answers[i].map(v => String(+v * 2))).status, 'equivalent');
    assert.equal(S.assess(c, [answers[i][0], '0']).status, 'error');
    assert.equal(S.assess(c, [answers[i][0] + '.0', answers[i][1]]).status, 'format');
    assert.notEqual(S.assess(c, [String(+answers[i][0] + 1), answers[i][1]]).status, 'success');
    const [a, b] = c.original.map(Q.parse), [x, y] = answers[i].map(Number);
    assert.equal(a.n * b.d * y, b.n * a.d * x);
  });
});

test('Every displayed conversion multiplies both terms by the same exact factor', () => {
  for (const recipe of S.recipes) {
    const values = recipe.raw.map(Q.parse);
    values.forEach((value, i) => assert.equal(value.n * recipe.multiplier, recipe.integers[i] * value.d));
    const [a, b] = recipe.integers, g = Q.gcd(a, b);
    assert.equal(Q.gcd(a / g, b / g), 1);
  }
});

test('Restored progress preserves incomplete fraction parts and verifies completion against answers', () => {
  const state = S.createState(); state.lesson = 1;
  const p = state.progress[1]; p.phase = 2; p.prediction = 0; p.explored = true;
  p.entries[0][0].denominator = '6';
  let loaded = S.restore(JSON.parse(JSON.stringify(state)));
  assert.equal(loaded.lesson, 1); assert.equal(loaded.progress[1].entries[0][0].denominator, '6');
  assert.equal(loaded.progress[1].entries[0][0].numerator, '');
  assert.equal(E.complete(loaded.progress[1].entries[0][0]), false);
  p.entries[0][0].numerator = '4'; p.passed[0] = true; p.phase = 3;
  loaded = S.restore(state); assert.equal(loaded.progress[1].phase, 3); assert.equal(loaded.progress[1].passed[0], true);
  p.entries[0][0].numerator = '5';
  loaded = S.restore(state); assert.equal(loaded.progress[1].phase, 2); assert.equal(loaded.progress[1].passed[0], false);
});

test('Invalid stored state cannot inject markup, invalid recipe divisors, or out-of-range navigation', () => {
  for (const raw of [null, {}, { version: 99 }, { version: 1, progress: 'bad' }]) assert.deepEqual(S.restore(raw), S.createState());
  const state = S.createState(); state.lesson = 99;
  state.progress[0].entries[0][0].number = '<img src=x onerror=alert(1)>';
  state.progress[3].exploration = { recipe: 0, divisor: 3, factor: -1 };
  const restored = S.restore(state);
  assert.equal(restored.lesson, 0); assert.equal(restored.progress[0].entries[0][0].number, '');
  assert.equal(restored.progress[3].exploration.divisor, 1); assert.equal(restored.progress[3].exploration.factor, 1);
});
