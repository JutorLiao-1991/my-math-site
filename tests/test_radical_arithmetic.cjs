const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Q=require('../junior/math/radical_arithmetic_core.js');
const pool=Q.buildPool();
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
function numeric(e){if(e.op==='num')return e.r.n/e.r.d;if(e.op==='root')return Math.sqrt(e.r.n/e.r.d);if(e.op==='add')return e.args.reduce((s,a)=>s+numeric(a),0);if(e.op==='mul')return e.args.reduce((s,a)=>s*numeric(a),1);if(e.op==='div')return numeric(e.a)/numeric(e.b);if(e.op==='square')return numeric(e.a)**2;}
function polyValue(p){return Object.entries(p).reduce((s,[k,c])=>s+c.n/c.d*Math.sqrt(Number(k)),0);}

test('all lecture-shaped questions and every filled intermediate row preserve the original value',()=>{
 assert.ok(pool.length>=180);assert.equal(new Set(pool.map(q=>q.id)).size,pool.length);
 for(const q of pool){assert.ok(Math.abs(numeric(q.expression)-polyValue(q.answer))<1e-8,q.id);
   assert.ok(q.rows.length>=1);assert.equal(Q.checkAnswer(Q.polyText(q.answer),q.answer).kind,'correct',q.id);
   for(const row of q.rows){assert.equal(row.answers.length,row.rules.length);const slots=[...row.template.matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1]));assert.ok(slots.every(i=>i<row.answers.length));assert.equal(new Set(slots).size,row.answers.length);
     if(row.choices)continue;const result=Q.rowExpression(row);assert.ok(result,`${q.id}: ${row.template}`);assert.ok(Q.samePoly(result.value,q.answer),`${q.id}: ${row.label}`);
   }
   for(const [k,c]of Object.entries(q.answer)){assert.equal(Q.squareParts(Number(k)).a,1);assert.ok(c.d>0);}
 }
 const demo=pool[0];assert.deepEqual(demo.rows[0].answers,[Q.rat(6),Q.rat(48)]);assert.deepEqual(demo.rows[1].answers,[Q.rat(4),Q.rat(3)]);assert.deepEqual(demo.answer,{3:Q.rat(24)});
 const last=pool.at(-1);assert.deepEqual(last.answer,{1:Q.rat(6)});
 assert.deepEqual(pool.find(q=>q.variant==='三項式的平方差').answer,{1:Q.rat(-7),2:Q.rat(6)});
});

test('exact roots and quotients cover rational, mixed-number and decimal radicands and negative denominators',()=>{
 assert.deepEqual(Q.rootValue(Q.rat(8,9)),{2:Q.rat(2,3)});
 assert.deepEqual(Q.rootValue(Q.rat(6,10)),{15:Q.rat(1,5)});
 assert.deepEqual(Q.evaluate(Q.prod(Q.rad(125),Q.rad(18,5))),{2:Q.rat(15)});
 assert.deepEqual(Q.div(Q.scalar(1),Q.add(Q.rootValue(Q.rat(2)),Q.scale(Q.rootValue(Q.rat(5)),-1))),{2:Q.rat(-1,3),5:Q.rat(-1,3)});
 assert.equal(Q.parse('-0 1/2').n,-1);assert.equal(Q.parse('0.125').d,8);
 for(const raw of ['','-','1/0','1e2','2x','1 3/2','Infinity','1/'.repeat(100)])assert.equal(Q.parse(raw),null);
});

test('final answers accept term reordering and exact fractions but distinguish unfinished simplification',()=>{
 const expected=Q.parseExpression('3-2√5').value;
 for(const raw of ['3-2√5','-2sqrt(5)+3','3−2×√5'])assert.equal(Q.checkAnswer(raw,expected).kind,'correct',raw);
 const one=Q.parseExpression('√2/2').value;
 for(const raw of ['√2/2','(sqrt(2))/2','0.5√2','(1/2)√2'])assert.equal(Q.checkAnswer(raw,one).kind,'correct',raw);
 for(const raw of ['1/√2','2√2/4','√(1/2)'])assert.equal(Q.checkAnswer(raw,one).kind,'unfinished',raw);
 for(const [raw,correct]of [['2√18','6√2'],['√2+√2','2√2'],['√2*√3','√6'],['(√2+1)*2','2√2+2'],['√3^2','3'],['6/4','3/2']])assert.equal(Q.checkAnswer(raw,Q.parseExpression(correct).value).kind,'unfinished',raw);
 assert.equal(Q.checkAnswer('0',{}).kind,'correct');
 assert.equal(Q.checkAnswer('1',{}).kind,'wrong');
 const half=Q.parseExpression('(√2+√3)/2');assert.ok(half.simplest);
 for(const raw of ['','√','sqrt(','2/','1/0','Math.sqrt(2)','<img>','2**2','3^3','√(-2)','√(√2)','9'.repeat(161),'('.repeat(40)+'2'+')'.repeat(40)])assert.equal(Q.parseExpression(raw),null,raw);
 assert.equal(Q.checkAnswer('√(2+1)',Q.parseExpression('√3').value).kind,'unfinished');
});

test('each selected stage has ten unique questions; combined exams contain two per stage',()=>{
 for(let seed=1;seed<100;seed++)for(const topic of [...Q.TOPICS.map(t=>t.id),'all']){
 const questions=Q.selectRound(pool,topic,10,rng(seed));assert.equal(questions.length,10);assert.equal(new Set(questions.map(q=>q.id)).size,10);
 if(topic==='all')for(const t of Q.TOPICS)assert.equal(questions.filter(q=>q.kind===t.id).length,2);else assert.ok(questions.every(q=>q.kind===topic));
 }
});

test('exams keep raw answers and review flags when navigating, reveal no result before submission, grade once',()=>{
 let now=0;const qs=Q.selectRound(pool,'all',10,rng(8)),session=new Q.ExamSession(qs,()=>now);
 assert.equal(session.report,null);session.setAnswer('2√');session.toggleReview();session.goto(9);assert.equal(session.entries[0].raw,'2√');assert.ok(session.entries[0].review);
 for(let i=0;i<10;i++){session.goto(i);session.setAnswer(Q.polyText(qs[i].answer));}assert.equal(session.report,null);
 now=1000;const report=session.finish();assert.equal(report.score,100);assert.equal(report.correct,10);assert.equal(report.answered,10);assert.ok(!report.timedOut);
 assert.equal(session.setAnswer('0'),false);assert.equal(session.goto(3),false);assert.strictEqual(session.finish(),report);
});

test('deadline rejects late changes and grades partial or malformed answers as zero',()=>{
 let now=100;const qs=Q.selectRound(pool,'multiply',10,rng(9)),session=new Q.ExamSession(qs,()=>now);
 session.setAnswer(Q.polyText(qs[0].answer));session.goto(1);session.setAnswer('√');session.goto(2);session.setAnswer('1/0');
 now=session.deadline;assert.equal(session.setAnswer(Q.polyText(qs[2].answer)),false);assert.ok(session.finished);assert.equal(session.report.score,10);assert.ok(session.report.timedOut);assert.equal(session.entries[2].raw,'1/0');
 const blank=new Q.ExamSession(qs,()=>0);assert.equal(blank.finish().score,0);assert.equal(blank.report.results[0].kind,'empty');
});

test('page wiring registers a separate grade-eight lesson and exam has no step scaffolding',()=>{
 const ctx={};vm.runInNewContext(fs.readFileSync('data.js','utf8')+';globalThis.lessons=lessonData;',ctx);
 const matches=ctx.lessons.filter(l=>l.url==='junior/math/radical_arithmetic_grade8.html');assert.equal(matches.length,1);assert.equal(matches[0].grades[0],8);
 const html=fs.readFileSync('junior/math/radical_arithmetic_grade8.html','utf8'),js=fs.readFileSync('junior/math/radical_arithmetic_grade8.js','utf8');
 assert.ok(html.includes('id="exam-answer"'));assert.ok(js.includes("steps.classList.toggle('hidden',isExam)"));assert.ok(js.includes("if (isExam)"));assert.ok(js.includes("question.rows.forEach"));
 assert.ok(js.includes('交卷後統一評分'));assert.ok(!js.includes('eval('));
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const m of js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g))assert.ok(ids.has(m[1]),m[1]);
});
