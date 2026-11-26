// 戰術學習：每一課的棋步都合法；標了 mate／mate3 的步驟要真的能將死。
const assert=require('node:assert/strict');
const X=require('../games/xiangqi_engine.js'),S0=require('../games/xiangqi_studies.js'),TAC=require('../games/xiangqi_tactics.js'),MAT=require('../games/xiangqi_mates.js'),S=[...S0,...TAC.list,...MAT.list];
const CODE={K:1,A:2,B:3,N:4,R:5,C:6,P:7},sq=s=>(9-Number(s[1]))*9+s.charCodeAt(0)-97,mv=u=>X.move(sq(u.slice(0,2)),sq(u.slice(2,4)));
const ids=new Set();assert.ok(S.length>=15);for(const t of MAT.list){assert.ok(MAT.cats[t.cat],t.id);assert.equal(t.sec,'end');assert.ok(t.steps[0].y&&t.steps[0].q,t.id)}for(const t of TAC.list){assert.ok(TAC.cats[t.cat],t.id);assert.equal(t.sec,'mid');assert.ok(t.steps[0].y&&t.steps[0].q,t.id+' 第一步要換你走並有提示文字（不能洩題）')}
for(const st of S){
  assert.ok(!ids.has(st.id),'duplicate id '+st.id);ids.add(st.id);assert.ok(['open','mid','end'].includes(st.sec));assert.ok(st.t&&st.d,st.id);
  let p;if(st.std)p=X.start();else{const b=new Int8Array(90);for(const t of st.pcs.split(/\s+/)){const L=t[0];assert.ok(CODE[L.toUpperCase()],t);b[sq(t.slice(1))]=CODE[L.toUpperCase()]*(L===L.toUpperCase()?1:-1)}p={b,side:1,quiet:0}}
  assert.ok(!X.inCheck(p),st.id+' starts in check');
  const steps=st.steps||st.line.split(' ').map((u,i)=>({u,y:i%2===0?1:0,s:st.s[i]}));
  if(st.line)assert.equal(st.s.length,steps.length,st.id+' text count');
  for(const [i,step] of steps.entries()){const m=mv(step.u);assert.ok(X.legal(p).includes(m),`${st.id} step ${i} ${step.u} illegal`);assert.ok(step.s,`${st.id} step ${i} text`);
    if(step.y&&step.k==='mate3')assert.ok(X.mateMoves(p,3).includes(m),st.id+' not mate3');
    X.make(p,m);if(MAT.list.includes(st)&&i===steps.length-1)assert.ok(X.inCheck(p)&&!X.legal(p).length,st.id+' 最後一步沒有將死');if(step.k==='mate')assert.ok(X.inCheck(p)&&!X.legal(p).length,st.id+' not mate')}
}
console.log(`${S.length} Xiangqi studies passed`);
