const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../elementary/rate_questions_grade6.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const raw = f => typeof f.expected === 'object' ? `${f.expected.n}/${f.expected.d}` : String(f.expected);
const value = f => typeof f.expected === 'object' ? f.expected.n / f.expected.d : Number(f.expected);
const TYPES = Object.keys(Q.categories);

/* 獨立的算式計算（浮點數），用來檢查題庫給的算式和答案是否一致 */
function evaluate(text) {
  const js = text.replace(/(\d+) (\d+)\/(\d+)/g, '($1+$2/$3)').replace(/(\d+(?:\.\d+)?)\/(\d+)/g, '($1/$2)')
    .replace(/＋/g, '+').replace(/－/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d+\-*/().\s]+$/.test(js)) return null;
  return Function(`"use strict"; return (${js});`)();
}
const close = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

test('every question type builds consistent, answerable steps', () => {
  let checkedPatterns = 0, checkedFormulas = 0;
  for (const type of TYPES) for (let v = 0, random = rng(type.length * 131 + 7); v < 240; v++) {
    const q = Q.generate(type, { star: true }, random, v);
    assert.equal(q.topic, type);
    assert.ok(q.text && q.textHtml && q.explanation, type);
    assert.ok(!/undefined|NaN|Infinity/.test(q.text + q.explanation), q.text);
    assert.ok(q.steps.length >= 1 && q.steps.length <= 3, `${type} 步驟數 ${q.steps.length}`);
    if (!['judge', 'choice'].includes(type)) assert.ok(q.steps.length >= 2, type);
    for (const f of q.finalFields) assert.ok(q.steps.some(s => s.fields.includes(f)), `${type} final field`);
    for (const s of q.steps) {
      assert.ok(s.title && s.explanation && s.hint, `${type} step text`);
      for (const f of s.fields) {
        assert.ok(s.pattern.includes(`{${f.key}}`), `${type} pattern 缺 ${f.key}`);
        assert.ok(Q.correct(raw(f), f), `${q.text} ${f.label} ${raw(f)}`);
        if (f.type === 'decision') {
          assert.equal(new Set(Object.values(f.optionLabels)).size, f.options.length, q.text);
          assert.ok(!Q.correct('0', f));
        } else {
          assert.ok(value(f) > 0, `${q.text} ${f.label}`);
          assert.ok(!Q.correct('', f));
          if (f.type === 'number') assert.ok(Number.isInteger(f.expected));
        }
      }
      /* 「算式＝□」：算式的值就是格子的答案 */
      const m = s.pattern.match(/^(.+)＝\{(f\d+)\}$/);
      if (m && s.fields.length === 1) {
        const x = evaluate(m[1]);
        if (x !== null) { assert.ok(close(x, value(s.fields[0])), `${q.text}｜${m[1]}＝${raw(s.fields[0])}`); checkedPatterns++; }
      }
      s.pattern.split('　').forEach(piece => {
        const mm = piece.match(/(?:^|\s)([\d(][\d.＋－×÷() /]*)＝\{(f\d+)\}$/);
        if (!mm) return;
        const f = s.fields.find(x => x.key === mm[2]), x = evaluate(mm[1].trim());
        if (f && x !== null) { assert.ok(close(x, value(f)), `${q.text}｜${piece}`); checkedPatterns++; }
      });
    }
    if (q.formulaCheck) {
      const all = q.steps.flatMap(s => s.fields), c = all.find(f => f.key === q.formulaCheck.choice), a = all.find(f => f.key === q.formulaCheck.answer);
      const right = c.optionLabels[c.expected].slice(2), x = evaluate(right);
      assert.ok(close(x, value(a)), `${q.text}｜${right}`);
      const others = Object.keys(c.optionLabels).filter(k => k !== c.expected).map(k => evaluate(c.optionLabels[k].slice(2)));
      assert.ok(others.every(o => o === null || !close(o, value(a))), `錯誤選項算出正確答案：${q.text}`);
      checkedFormulas++;
    }
  }
  assert.ok(checkedPatterns > 5000, checkedPatterns);
  assert.ok(checkedFormulas > 2000, checkedFormulas);
});

test('worksheet examples follow the same rules (講義例題)', () => {
  const F = Q.F;
  assert.deepEqual(Q.convert(15, 'ms', 'kmh'), F(54));         // 秒速 15 公尺＝時速 54 公里
  assert.deepEqual(Q.convert(15, 'ms', 'kms'), F(3, 200));     // ＝秒速 0.015 公里
  assert.deepEqual(Q.convert(180, 'mmin', 'ms'), F(3));        // 分速 180 公尺＝秒速 3 公尺
  assert.deepEqual(Q.convert(180, 'mmin', 'kmh'), F(54, 5));   // ＝時速 10.8 公里
  assert.deepEqual(Q.convert(90, 'kmh', 'ms'), F(25));         // 時速 90 公里＝秒速 25 公尺
  assert.deepEqual(Q.convert(72, 'kmh', 'mmin'), F(1200));     // 甲車時速 72＝分速 1200
  assert.deepEqual(Q.evalExpr('815÷1 2/3'), F(489));           // 桃園到香港
  assert.deepEqual(Q.evalExpr('4800÷30'), F(160));
  assert.deepEqual(Q.evalExpr('100×1/3'), F(100, 3));          // 33 1/3 公里
  assert.deepEqual(Q.evalExpr('1080÷(75＋60)'), F(8));         // 相遇
  assert.deepEqual(Q.evalExpr('(74－63)×12'), F(132));         // 相距
  assert.deepEqual(Q.evalExpr('(4×6×2)÷(6＋4×6÷6)'), F(24, 5)); // 登山 4.8
  assert.deepEqual(Q.evalExpr('110×5÷(132－110)'), F(25));     // 追趕
  assert.deepEqual(Q.evalExpr('50－(16＋14.4)×1.5'), F(22, 5)); // 實力評量 4-(3)
  assert.equal(Q.show(F(15, 4)), '3.75'); assert.equal(Q.show(F(5, 3)), '1 2/3');
});

test('graph lines pass readable grid points', () => {
  for (const sc of Q.SCALES) for (const sp of [...sc.fast, ...sc.slow]) assert.ok(Q.gridPoint(sc, sp), `${sc.orient} ${sp}`);
  for (let v = 0, r = rng(5); v < 60; v++) {
    const q = Q.generate('graph', null, r, v);
    assert.ok(q.textHtml.includes('<svg class="q-figure q-graph"'));
    assert.ok(!/NaN/.test(q.textHtml));
  }
});

test('random pools respect topics, ※ and ★', () => {
  for (const tp of Q.TOPICS) {
    assert.ok(Q.pool(tp.key, { star: false }).every(x => tp.types.includes(x) && !Q.STAR.includes(x)));
    for (let i = 0, r = rng(9); i < 200; i++) {
      const q = Q.generate(tp.key, { star: false }, r);
      assert.ok(tp.types.includes(q.topic) && !Q.STAR.includes(q.topic) && !Q.ADVANCED.includes(q.topic), q.topic);
    }
  }
  const off = new Set(), on = new Set();
  for (let i = 0, r = rng(11); i < 1500; i++) { off.add(Q.generate('mixed', { star: false }, r).topic); on.add(Q.generate('mixed', { star: true }, r).topic); }
  assert.ok(!['flow', 'chase', 'drift', 'echo', 'earlier', 'segment', 'ringReverse'].some(x => off.has(x)));
  assert.ok(on.has('flow') && on.has('chase') && !on.has('drift') && !on.has('echo'));
  for (const x of ['judge', 'choice', 't1Compare', 'graph', 'unitCompare', 'threePlace']) assert.ok(off.has(x), x);
});

test('each exam has ten unique questions with the fixed mix', () => {
  const groups = { t1: ['t1Convert', 't1Compare'], basic: ['speed', 'time', 'dist', 'clock', 'twoStage'], meet: ['apart', 'meet', 'ring', 'remain'], star: ['flow', 'chase'], avg: ['roundTrip', 'threePlace'], concept: ['judge', 'choice'] };
  for (const star of [false, true]) for (let seed = 1; seed <= 150; seed++) {
    const exam = Q.buildExam({ star }, rng(seed)), count = name => exam.filter(q => groups[name] ? groups[name].includes(q.topic) : q.topic === name).length;
    assert.equal(exam.length, 10);
    assert.equal(new Set(exam.map(q => q.text)).size, 10);
    assert.equal(count('t1'), 1); assert.equal(count('basic'), 2); assert.equal(count('graph'), 1);
    assert.equal(count('unitConvert'), 1); assert.equal(count('unitCompare'), 1);
    assert.equal(count('meet'), star ? 1 : 2); assert.equal(count('star'), star ? 1 : 0);
    assert.equal(count('avg'), 1); assert.equal(count('concept'), 1);
    assert.ok(exam.every(q => !Q.ADVANCED.includes(q.topic)));
    for (const q of exam) for (const f of q.finalFields) assert.ok(Q.correct(raw(f), f));
  }
});

test('answers accept equivalent decimals and fractions', () => {
  const f = { type: 'rational', expected: Q.F(5, 4) };
  for (const ok of ['1.25', '5/4', '1 1/4', '10/8']) assert.ok(Q.correct(ok, f), ok);
  for (const bad of ['1.2', '4/5', '']) assert.ok(!Q.correct(bad, f), bad);
  assert.throws(() => Q.generate('missing'));
});
