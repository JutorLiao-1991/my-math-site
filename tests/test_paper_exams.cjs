const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../elementary/percentage_questions_grade5.js');
const I = require('../elementary/interval_problems_grade6.js');
const S = require('../elementary/paper_exam_status.js');
const E = require('../elementary/ratio_input_grade6.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const raw = f => typeof f.expected === 'object' ? `${f.expected.n}/${f.expected.d}` : String(f.expected);

test('Blank, partial and completed entries remain independent of the review flag', () => {
  const fields = [{key:'f0',type:'rational'}, {key:'f1',type:'number'}], values = {}, entries = {f0:E.fromValue()};
  assert.equal(S.classify(fields, values, entries).completion, 'empty');
  entries.f0.denominator = '4';
  assert.equal(S.classify(fields, values, entries).completion, 'partial');
  assert.deepEqual(S.classify(fields, values, entries, true), {completion:'partial',review:true,label:'部分作答・待檢查'});
  entries.f0.numerator = '0'; values.f1 = '0';
  assert.equal(S.classify(fields, values, entries, true).completion, 'complete');
  assert.equal(S.classify(fields, values, entries, false).review, false);
  entries.f0.numerator = '';
  assert.equal(S.classify(fields, values, entries, true).completion, 'partial');
  entries.f0.kind = 'mixed'; entries.f0.whole = '1'; entries.f0.numerator = '2';
  assert.equal(S.classify(fields, values, entries).completion, 'complete');
  entries.f0.whole = '';
  assert.equal(S.classify(fields, values, entries).completion, 'partial');
  assert.equal(S.classify([{key:'n',type:'number'}],{n:'.'}).completion,'partial');
  assert.equal(S.classify([{key:'n',type:'number'}],{}, {},true).label,'未作答・待檢查');
});

test('Percent questions and each application subtype use exact, unrounded arithmetic', () => {
  for (const topic of Object.keys(P.categories)) for (let v=0;v<120;v++) {
    const q = P.generate(topic, null, rng(100+v), v), d=q.data;
    assert.ok(q.text && q.textHtml && q.explanation);
    for (const f of q.steps.flatMap(s=>s.fields)) {
      assert.ok(P.correct(raw(f),f),`${topic}/${v}/${f.label}/${raw(f)}`);
      assert.ok(!P.correct(f.type==='decision'?'earn':'',f));
    }
    for (const f of q.finalFields) assert.ok(q.steps.some(s=>s.fields.includes(f)));
    if (d.n !== undefined) {
      const f=q.finalFields[0];
      assert.equal(typeof f.expected==='object' ? f.expected.n/f.expected.d : f.expected/100,d.n/d.d);
    } else if (d.operation==='profitLoss') {
      assert.equal(d.listed,d.base*1.2); assert.equal(d.sold,d.listed*.8);
      assert.ok(Math.abs(d.loss-(d.base-d.sold))<1e-8);
      assert.equal(q.finalFields[1].expected,'loss');
    } else if (d.operation==='discount') assert.equal(q.finalFields[0].expected,(100-d.pct)/10);
    else if (d.operation==='cheng') assert.equal(q.finalFields[0].expected,d.pct/10);
    else assert.ok(Math.abs(q.finalFields[0].expected-(d.operation==='divide'?d.base/(d.pct/100):d.base*d.pct/100))<1e-8);
  }
});

test('Equivalent unreduced fractions are accepted; malformed fractions are rejected', () => {
  const q=P.generate('mode1',null,rng(10)),f=q.finalFields[0],{n,d}=f.expected;
  assert.ok(P.correct(`${n*2}/${d*2}`,f));
  for (const raw of ['',`${n}/0`,`${n}/`,String(n/d),'1 1/2']) assert.ok(!P.correct(raw,f),raw);
  assert.ok(P.displayText(q.text).includes('分數'));
  const discount={type:'number',expected:8.5,discount:true};
  assert.ok(P.correct('85',discount)); assert.ok(P.correct('8.5',discount)); assert.ok(!P.correct('8',discount));
  assert.ok(P.correct('7.55',{type:'number',expected:7.55}));
  assert.ok(!P.correct('7.6',{type:'number',expected:7.55}));
});

test('Each percentage exam is fixed at ten questions with all six categories', () => {
  for(let seed=1;seed<=100;seed++) {
    const exam=P.buildExam(null,rng(seed)),counts={};
    exam.forEach(q=>counts[q.topic]=(counts[q.topic]||0)+1);
    assert.equal(exam.length,10);
    assert.deepEqual(counts,{...counts,mode1:2,mode2:1,mode3:1,mode4:2,mode5:3,mode6:1});
    assert.equal(new Set(exam.map(q=>q.text)).size,10);
  }
});

test('Interval adapter preserves all original solutions, units, difficulty and diagrams', () => {
  for(const difficulty of ['basic','advanced']) for(let seed=1;seed<=50;seed++) {
    const exam=I.buildExam(difficulty,rng(seed)); assert.equal(exam.length,10);
    for(const q of exam) {
      assert.equal(q.steps[0].fields[0].expected,q.source.intervals);
      assert.equal(q.finalFields[0].expected,q.source.answer);
      assert.equal(q.finalFields[0].unit,q.source.answerUnit);
      assert.ok(I.correct(raw(q.finalFields[0]),q.finalFields[0]));
      assert.equal(I.format(raw(q.finalFields[0])),raw(q.finalFields[0]));
      assert.ok(!I.correct('',q.finalFields[0]));
      assert.ok(q.explanation && q.source.diagramLabels);
    }
  }
});
