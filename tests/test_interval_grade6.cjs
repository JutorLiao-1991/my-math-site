const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../elementary/interval_questions_grade6.js');

function randomFor(seed) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('the twelve supplied worksheet examples have their independently calculated answers', () => {
  const cases = [
    [{type:'index', intervals:10, spacingCm:75, unit:'公分', start:7}, 750],
    [{type:'index', intervals:8, spacingCm:250, start:10}, 20],
    [{type:'index', intervals:16, spacingCm:50, start:6}, 8],
    [{type:'both', query:'gap', intervals:50, spacingCm:4800, lengthUnit:'公里'}, 48],
    [{type:'both', query:'count', intervals:8, spacingCm:20, unit:'公分'}, 9],
    [{type:'one', query:'count', intervals:30, spacingCm:4000}, 30],
    [{type:'both', query:'count', intervals:50, spacingCm:3000}, 51],
    [{type:'neither', query:'count', intervals:12, spacingCm:300}, 11],
    [{type:'neither', query:'count', intervals:15, spacingCm:1200}, 14],
    [{type:'neither', query:'gap', intervals:21, spacingCm:600}, 6],
    [{type:'loop', query:'gap', intervals:120, spacingCm:800}, 8],
    [{type:'loop', query:'gap', intervals:60, spacingCm:1200, shape:'square'}, 12]
  ];
  cases.forEach(([options, answer]) => assert.equal(Q.makeQuestion(options).answer, answer));
});

test('sampled questions obey the physical placement and unit relationships', () => {
  const seen = new Set();
  for (let seed=1;seed<=250;seed++) {
    const random = randomFor(seed);
    for (const difficulty of ['basic','advanced']) {
      for (const type of Object.keys(Q.TYPES)) {
        for (const query of ['count','gap','length']) {
          const q = Q.generate(type,difficulty,random,query);
          seen.add([difficulty,q.type,q.query].join(':'));
          assert.ok(Number.isInteger(q.count) && q.count>0);
          assert.ok(Number.isInteger(q.lengthCm) && q.lengthCm>0);
          // Enumerate positions, then remove excluded endpoints or the repeated closing point.
          const positions = Array.from({length:q.intervals+1},(_,i)=>i*q.spacingCm);
          const placed = positions.filter((_,i)=>
            q.type==='neither' ? i!==0 && i!==positions.length-1 :
            ['one','loop'].includes(q.type) ? i!==positions.length-1 : true);
          assert.equal(placed.length,q.count);
          assert.equal(positions.at(-1),q.lengthCm);
          if (q.type==='index') {
            assert.ok(q.text.includes(`第 ${q.start} `));
            assert.ok(q.text.includes(`第 ${q.start+q.intervals} `));
          }
          if (q.type==='loop' && q.shape==='square') {
            const side=q.lengthCm/4;
            [0,side,2*side,3*side].forEach(corner=>assert.ok(placed.includes(corner)));
          }
          const expected = q.query==='count' ? placed.length :
            q.query==='gap' ? (positions[1]-positions[0])/Q.UNITS[q.unit] : positions.at(-1)/Q.UNITS[q.unit];
          assert.equal(q.answer,expected);
          assert.ok(Q.isCorrect(Q.format(expected),q.answer));
          if(difficulty==='basic') assert.ok(Number.isInteger(q.answer));
          if(q.lengthUnit!==q.unit) {
            const source=q.lengthCm/Q.UNITS[q.lengthUnit], target=q.lengthCm/Q.UNITS[q.unit];
            assert.ok(q.explanation.includes(`${Q.format(source)} ${q.lengthUnit} ＝ ${Q.format(target)} ${q.unit}`));
          }
        }
      }
    }
  }
  assert.equal(seen.size,26); // Two index directions plus 4 types × 3 queries × 2 levels.
});

test('every exam balances all five types, covers all inverse questions and avoids duplicates', () => {
  for(let seed=1;seed<=500;seed++) {
    for(const difficulty of ['basic','advanced']) {
      const questions=Q.buildExam(difficulty,randomFor(seed));
      assert.equal(questions.length,10);
      assert.equal(new Set(questions.map(q=>q.text)).size,10);
      for(const type of Object.keys(Q.TYPES)) assert.equal(questions.filter(q=>q.type===type).length,2);
      assert.equal(new Set(questions.map(q=>q.query)).size,3);
    }
  }
  assert.equal(new Set(Q.buildExam('basic',()=>0).map(q=>q.text)).size,10);
});

test('numeric grading accepts equivalent decimal writing without accepting invalid or near answers', () => {
  for(const input of ['0.5','.5','00.500',' 0.50 ']) assert.ok(Q.isCorrect(input,.5));
  for(const input of ['6','6.','06.000']) assert.ok(Q.isCorrect(input,6));
  for(const input of ['', ' ', '.', 'Infinity', 'NaN', '6公尺', '6e0','6..0','-6']) assert.equal(Q.isCorrect(input,6),false);
  assert.equal(Q.isCorrect('6.000001',6),false);
  assert.equal(Q.isCorrect('0.50',5),false);
});

test('impossible square corners and invalid generators are rejected', () => {
  assert.throws(()=>Q.makeQuestion({type:'loop',shape:'square',intervals:10,spacingCm:100}));
  assert.throws(()=>Q.makeQuestion({type:'both',intervals:2.5,spacingCm:100}));
  assert.throws(()=>Q.generate('missing'));
  assert.throws(()=>Q.generate('both','missing'));
});
