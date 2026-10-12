const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Q = require('../junior/math/integer_add_sub_core.js');
const config = (overrides = {}) => ({ mode: 'challenge', types: Q.TYPES.map(t => t.id), aRange: [1, 20], bRange: [1, 20], target: 30, ...overrides });
let seed = 87232;
const rng = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };

test('all eight sign/operator types compute correctly, stay in each range, and balance mixed practice', () => {
  const g = new Q.Generator(config({ aRange: [2, 7], bRange: [3, 8] }), rng), counts = {};
  const outcomes = new Set();
  for (let i = 0; i < 800; i++) {
    const q = g.next(), t = Q.TYPES.find(t => t.id === q.type);
    assert.ok(Math.abs(q.a) >= 2 && Math.abs(q.a) <= 7);
    assert.ok(Math.abs(q.b) >= 3 && Math.abs(q.b) <= 8);
    assert.equal(Math.sign(q.a), t.a); assert.equal(Math.sign(q.b), t.b); assert.equal(q.op, t.op);
    assert.equal(q.answer, q.op === '+' ? q.a + q.b : q.a - q.b);
    assert.ok(!Q.format(q).includes('--'));
    counts[q.type] = (counts[q.type] || 0) + 1; outcomes.add(Math.sign(q.answer));
  }
  assert.ok(Object.values(counts).every(n => n === 100));
  assert.deepEqual([...outcomes].sort(), [-1, 0, 1]);
  for (const op of ['+', '-']) {
    const selected = Q.TYPES.filter(t => t.op === op).map(t => t.id);
    const only = new Q.Generator(config({ types: selected }), rng);
    for (let i = 0; i < 100; i++) assert.equal(only.next().op, op);
  }
});

test('narrow ranges avoid repeats if possible and singleton domains never loop', () => {
  for (const ranges of [[[1, 2], [1, 1]], [[1, 1], [1, 2]]]) {
    const g = new Q.Generator(config({ types: ['pn_add'], aRange: ranges[0], bRange: ranges[1] }), () => 0);
    let previous = '';
    for (let i = 0; i < 40; i++) { const text = Q.format(g.next()); assert.notEqual(text, previous); previous = text; }
  }
  const g = new Q.Generator(config({ types: ['nn_sub'], aRange: [999, 999], bRange: [999, 999] }));
  assert.equal(g.next().answer, 0); assert.equal(g.next().answer, 0);
});

test('invalid settings and malformed answers are rejected; keyboard supports negative values and zero', () => {
  for (const changes of [{ types: [] }, { types: ['unknown'] }, { aRange: [2, 1] }, { bRange: [0, 20] }, { aRange: [1, 1000] }, { aRange: [1.5, 3] }, { target: 15 }]) assert.throws(() => Q.validate(config(changes)));
  for (const value of ['', '-', '1.2', '2abc', 'Infinity', '1e2', '--3']) assert.equal(Q.parseAnswer(value), null);
  assert.equal(Q.parseAnswer('−0'), 0); assert.equal(Q.parseAnswer('+7'), 7);
  let buffer = '';
  for (const key of ['sign', '1', '9', '9', '8']) buffer = Q.editBuffer(buffer, key);
  assert.equal(buffer, '-1998'); assert.equal(Q.editBuffer(buffer, '9'), buffer);
  assert.equal(Q.editBuffer(buffer, 'sign'), '1998'); assert.equal(Q.editBuffer(buffer, 'delete'), '-199');
  assert.equal(Q.editBuffer(buffer, 'clear'), '');
});

test('challenge resets on wrong answer; repeated corrections and duplicate taps cannot award a streak', () => {
  let now = 0;
  const s = new Q.Session(config({ target: 10 }), rng, () => now);
  const solve = () => { now += 1000; const result = s.submit(String(s.current.question.answer)); if (!s.ended) s.next(); return result; };
  solve(); solve(); assert.equal(s.streak, 2);
  assert.equal(s.submit(String(s.current.question.answer + 1)).kind, 'wrong'); assert.equal(s.streak, 0);
  assert.equal(s.submit(String(s.current.question.answer + 1)).kind, 'wrong');
  now += 2000; assert.equal(s.submit(String(s.current.question.answer)).kind, 'corrected'); assert.equal(s.streak, 0);
  assert.equal(s.submit(String(s.current.question.answer)).kind, 'ignored');
  s.next();
  for (let i = 0; i < 10; i++) solve();
  assert.ok(s.ended); assert.equal(s.reason, 'complete'); assert.equal(s.bestStreak, 10);
  assert.equal(s.completed, 13); assert.equal(s.attempted, 13); assert.equal(s.firstCorrect, 12);
  assert.equal(s.summary().averageMs, 14000 / 13);
  assert.equal(s.submit('0').kind, 'ignored');
});

test('exam has ten questions, retries cost one point, a question cannot go below zero', () => {
  let now = 0;
  const s = new Q.Session(config({ mode: 'exam' }), rng, () => now);
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < (i === 0 ? 12 : i === 1 ? 2 : 0); j++) {
      const r = s.submit(String(s.current.question.answer + 1)); assert.equal(r.reveal, false);
    }
    now += 500;
    s.submit(String(s.current.question.answer));
    if (i < 9) { assert.ok(!s.ended); s.next(); }
  }
  assert.ok(s.ended); assert.equal(s.score, 88); assert.equal(s.completed, 10);
  assert.equal(s.summary().accuracy, 80);
});

test('exam deadline survives a long background gap and unfinished questions earn zero', () => {
  let now = 100;
  const s = new Q.Session(config({ mode: 'exam' }), rng, () => now);
  now += 1000; s.submit(String(s.current.question.answer)); s.next();
  now += Q.EXAM_MS + 90000;
  assert.equal(s.submit(String(s.current.question.answer)).kind, 'finished');
  assert.equal(s.score, 10); assert.equal(s.completed, 1); assert.equal(s.reason, 'timeout');
  assert.equal(s.summary().elapsedMs, Q.EXAM_MS);
  const practice = new Q.Session(config({ mode: 'practice' }), rng, () => now);
  practice.finish(); assert.equal(practice.summary().accuracy, null); assert.equal(practice.summary().averageMs, null);
  assert.equal(practice.records.length, 0);
});

test('home menu puts this lesson first among grade-seven lessons', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync('data.js', 'utf8') + ';globalThis.lessons=lessonData;', context);
  const grade7 = context.lessons.filter(l => l.category === 'junior' && l.grades.includes(7));
  assert.equal(grade7[0].title, '整數加減闖關（國一）');
  assert.equal(grade7[0].url, 'junior/math/integer_add_sub_grade7.html');
});

// Exercise actual UI event handlers without a browser: deterministic clock and minimal DOM.
function uiHarness() {
  const html = fs.readFileSync('junior/math/integer_add_sub_grade7.html', 'utf8');
  const nodes = new Map(), modeButtons = [], selectButtons = [], keys = [], tasks = new Map();
  let now = 0, nextTask = 0, lastSession;
  class Element {
    constructor(tag = 'DIV') { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = {}; this.style = {}; this.hidden = false; this.value = ''; this.classes = new Set(); this.classList = { add: c => this.classes.add(c), remove: c => this.classes.delete(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c) }; this.parentElement = { scrollTop: 0 }; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    get firstChild() { return this.children[0]; }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(type, cb) { (this.listeners[type] ||= []).push(cb); }
    fire(type, extra = {}) { const e = { target: this, preventDefault() {}, ...extra }; for (const cb of this.listeners[type] || []) cb(e); }
    closest() { return this.dataset.key ? this : null; }
    focus() {}
  }
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const e = new Element(match[1].toUpperCase()); e.hidden = /\bhidden\b/.test(match[2]); e.value = (match[2].match(/value="([^"]+)"/) || [])[1] || ''; nodes.set(match[3], e);
  }
  nodes.get('target').value = '30';
  for (const [attr, list] of [['mode', modeButtons], ['select', selectButtons], ['key', keys]]) for (const match of html.matchAll(new RegExp(`data-${attr}="([^"]+)"`, 'g'))) { const e = new Element('BUTTON'); e.dataset[attr] = match[1]; list.push(e); }
  const document = new Element(); document.body = new Element('BODY'); document.hidden = false;
  document.getElementById = id => { assert.ok(nodes.has(id), `Missing element ${id}`); return nodes.get(id); };
  document.createElement = tag => new Element(tag.toUpperCase()); document.createTextNode = text => ({ nodeValue: text });
  document.querySelectorAll = selector => ({ '[data-mode]': modeButtons, '[data-select]': selectButtons, '[data-type]': nodes.get('type-grid').children, '#numpad button': keys })[selector];
  const window = new Element();
  window.IntegerAddSub = { ...Q, Session: class extends Q.Session { constructor(c) { super(c, () => .4, () => now); lastSession = this; } } };
  vm.runInNewContext(fs.readFileSync('junior/math/integer_add_sub_grade7.js', 'utf8'), {
    document, window, setTimeout: cb => { tasks.set(++nextTask, cb); return nextTask; }, clearTimeout: id => tasks.delete(id), setInterval: cb => { tasks.set(++nextTask, cb); return nextTask; }, clearInterval: id => tasks.delete(id)
  });
  return {
    $: id => nodes.get(id), window, document,
    mode: m => modeButtons.find(b => b.dataset.mode === m).fire('click'),
    select: s => selectButtons.find(b => b.dataset.select === s).fire('click'),
    start: () => nodes.get('settings').fire('submit'),
    answer(value) { nodes.get('clear-answer').fire('click'); for (const char of String(value)) nodes.get('numpad').fire('click', { target: keys.find(b => b.dataset.key === (char === '-' ? 'sign' : char)) }); nodes.get('submit-answer').fire('click'); },
    flush() { for (const [id, cb] of [...tasks]) { tasks.delete(id); cb(); } },
    advance: ms => { now += ms; }, session: () => lastSession
  };
}

test('UI flows: empty selection validation, correction, auto-next, results, restart and settings', () => {
  const u = uiHarness(); u.select('none'); u.start(); assert.ok(!u.$('setup-error').hidden);
  u.select('all'); u.start(); assert.ok(u.$('settings').hidden); assert.ok(!u.$('keypad-panel').hidden);
  const s = u.session();
  u.advance(700); u.answer(s.current.question.answer + 1); assert.match(u.$('feedback').textContent, /正確答案/);
  u.answer(s.current.question.answer); u.flush(); assert.equal(s.completed, 1); assert.ok(!s.current.solved);
  u.$('end-session').fire('click'); assert.ok(!u.$('results').hidden); assert.ok(u.$('controls-panel').hidden);
  assert.match(u.$('accuracy').textContent, /0%/); assert.equal(u.$('completed').textContent, '1 題');
  u.$('retry').fire('click'); assert.equal(u.session().completed, 0); assert.ok(!u.$('workspace').hidden);
  u.$('end-session').fire('click'); u.$('change-settings').fire('click'); assert.ok(!u.$('settings').hidden);
});

test('UI challenge correction does not advance progress; deadline is enforced on foreground resume', () => {
  const u = uiHarness(); u.mode('challenge'); u.$('target').value = '10'; u.start();
  u.answer(u.session().current.question.answer); u.flush(); assert.equal(u.$('progress').attributes['aria-valuenow'], '1');
  u.answer(u.session().current.question.answer + 1); u.answer(u.session().current.question.answer); u.flush();
  assert.equal(u.$('progress').attributes['aria-valuenow'], '0');
  u.$('end-session').fire('click'); u.$('change-settings').fire('click'); u.mode('exam'); u.start();
  u.answer(u.session().current.question.answer + 1); assert.ok(!u.$('feedback').textContent.includes('正確答案'));
  u.advance(Q.EXAM_MS + 1000); u.document.fire('visibilitychange');
  assert.ok(!u.$('results').hidden); assert.match(u.$('result-heading').textContent, /時間到/);
  assert.equal(u.$('elapsed').textContent, '10:00'); assert.equal(u.$('result-score').textContent, '0 分');
});
