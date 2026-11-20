const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../junior/math/factorization_core.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const slotsIn=html=>[...String(html).matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1]));

test('every generated question: prompt, each equality row and the final answer all equal the original polynomial',()=>{
 const r=rng(20261120);
 for(const v of F.VARIANTS)for(let n=0;n<400;n++){
  const q=F.makeQuestion(v.id,r),id=`${v.id}#${n} ${F.plain(q.prompt)}`;
  assert.ok(F.peq(F.evaluate(q.promptNode,[]),q.target),id);
  assert.ok(F.peq(F.evaluate(q.answerNode,[]),q.target),id+' answer');
  assert.ok(q.rows.length>=2,id);
  // 標準形：負號提最前、括號內 x 係數為正且無公因數
  for(const [a,c] of q.answer.factors){assert.ok(a>0,id);assert.equal(F.gcd(a,c),1,id);}
  assert.ok(q.answer.k>=1,id);
  assert.equal(F.gradeAnswer(q.answerText,q).kind,'correct',id+' '+q.answerText);
  for(const row of q.rows){
   if(row.kind==='fill'){
    assert.equal(row.slots.length,row.answers.length,id);
    const used=slotsIn(row.html);assert.deepEqual([...new Set(used)].sort((a,b)=>a-b),row.answers.map((_,i)=>i),id+' '+row.html);
    assert.ok(F.checkFill(row,row.answers.map(String)).ok,id+' '+row.label);
    for(const alt of row.alts){assert.ok(F.checkFill(row,alt.map(String)).ok,id);if(row.eq)assert.ok(F.peq(F.evaluate(row.eq,alt),q.target),id+' '+row.label);}
    if(row.lead)assert.ok(F.peq(F.evaluate(row.lead,[]),q.target),id+' lead');
    assert.ok(!row.solved.includes('{{'),id);
   }else if(row.kind==='cross'){
    assert.ok(F.checkCross(row,row.answers).ok,id);
    const swapped=row.monic?[row.answers[1],row.answers[0]]:[row.answers[2],row.answers[3],row.answers[0],row.answers[1]];
    assert.ok(F.checkCross(row,swapped).ok,id+' swapped');
   }else{
    assert.equal(row.kind,'choice');assert.equal(row.options.length,2);assert.notEqual(row.options[0],row.options[1]);
   }
  }
  const last=q.rows.at(-1);assert.equal(last.kind,'fill');assert.ok(last.eq,id+' last row is an equality');
  assert.ok(q.moves.every(m=>F.MOVES.some(x=>x.id===m)),id);
 }
});

test('lecture examples are graded by value and by being completely factored',()=>{
 const q=(text,v='x')=>{const p=F.parseAnswer(text,v);assert.ok(p.ok,text);return {v,target:p.poly};};
 const a=q('-(2x+5)^2+36');
 assert.equal(F.gradeAnswer('-(2x+11)(2x-1)',a).kind,'correct');
 assert.equal(F.gradeAnswer('(2x+11)(1-2x)',a).kind,'correct');
 assert.equal(F.gradeAnswer('（2x＋11）（1－2x）',a).kind,'correct');
 assert.equal(F.gradeAnswer('-4x^2-20x+11',a).kind,'incomplete');
 assert.equal(F.gradeAnswer('(2x+11)(2x-1)',a).kind,'wrong');
 const b=q('(3x+2)^2-121');
 assert.equal(F.gradeAnswer('3(x-3)(3x+13)',b).kind,'correct');
 assert.equal(F.gradeAnswer('(3x+13)(3x-9)',b).kind,'incomplete');
 const c=q('6x^2+15x-9');
 assert.equal(F.gradeAnswer('3(x+3)(2x-1)',c).kind,'correct');
 assert.equal(F.gradeAnswer('3(2x²+5x−3)',c).kind,'incomplete');
 assert.equal(F.gradeAnswer('3(x+2)[(x-5)+2(x+7)]',q('3(x+2)(x-5)+6(x+2)(x+7)')).kind,'incomplete');
 assert.equal(F.gradeAnswer('9(x+2)(x+3)',q('3(x+2)(x-5)+6(x+2)(x+7)')).kind,'correct');
 assert.equal(F.gradeAnswer('(5x-2)²',q('25x^2-20x+4')).kind,'correct');
 assert.equal(F.gradeAnswer('(8-11y)(8+11y)',q('64-121y^2','y')).kind,'correct');
 assert.equal(F.gradeAnswer('(8-11x)(8+11x)',q('64-121y^2','y')).kind,'invalid');
 assert.equal(F.gradeAnswer('',a).kind,'empty');
 assert.equal(F.gradeAnswer('(2x+11',a).kind,'invalid');
});

test('row checking accepts signed blanks, coefficient shortcuts and swapped factors',()=>{
 const row={kind:'fill',slots:[{signed:true,coef:true},{signed:true,coef:false}],answers:[-1,3],alts:[[-1,3]]};
 assert.ok(F.checkFill(row,['−','+3']).ok);assert.ok(F.checkFill(row,['-1','3']).ok);assert.ok(!F.checkFill(row,['1','3']).ok);
 const cross={monic:false,a:6,b:13,c:5,v:'x'};
 assert.ok(F.checkCross(cross,[2,1,3,5]).ok);assert.ok(F.checkCross(cross,[3,5,2,1]).ok);
 assert.match(F.checkCross(cross,[2,-1,3,-5]).message,/正負號相反/);
 assert.match(F.checkCross(cross,[6,1,1,5]).message,/換一組/);
});

test('exam rounds: 10 questions, every stage twice in the mixed round, timer ends the session',()=>{
 const r=rng(5);
 const mixed=F.examVariantList('all',10,r);assert.equal(mixed.length,10);
 for(const t of F.TOPICS)assert.equal(mixed.filter(id=>F.VARIANTS.find(v=>v.id===id).topic===t.id).length,2);
 const cross=F.examVariantList('cross',10,r);assert.equal(cross.length,10);assert.equal(new Set(cross).size,4);
 let now=0;const qs=mixed.map(id=>F.makeQuestion(id,r));const s=new F.ExamSession(qs,600,()=>now);
 s.setAnswer(qs[0].answerText);s.goto(1);s.setAnswer('x');now=600000;assert.equal(s.setAnswer('1'),false);
 const rep=s.finish();assert.equal(rep.correct,1);assert.equal(rep.score,10);assert.ok(rep.timedOut);
 assert.equal(F.judgeVariantList(10,r).length,10);
});
