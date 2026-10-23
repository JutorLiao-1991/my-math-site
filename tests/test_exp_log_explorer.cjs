const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../senior/math/exp_log_core.js');
const near = (a,b,tol=1e-9) => assert.ok(Math.abs(a-b) <= tol * Math.max(1,Math.abs(a),Math.abs(b)), `${a} ≠ ${b}`);
test('base restrictions and logarithm domain never silently accept 1 or nonpositive input', () => {
  for (const a of [0,-1,1,NaN,Infinity]) { assert.equal(M.validBase(a),false); assert.ok(Number.isNaN(M.value('exp',a,2))); }
  for (const a of [.05,.25,.5,1.2,2,10]) {
    assert.ok(M.validBase(a)); near(M.value('exp',a,0),1); near(M.value('log',a,1),0);
    for(const x of [0,-1]) assert.ok(Number.isNaN(M.value('log',a,x)));
  }
});
test('inverse composition and parametric points agree across normal and fractional bases', () => {
  for (const a of [.05,.25,.5,1.001,1.2,2,3,10]) for(const x of [-3,-1,0,1,4]) {
    near(M.value('log',a,M.value('exp',a,x)),x);
    const p=M.point('exp',a,x), q=M.point('log',a,x); near(p.x,q.y);near(p.y,q.x);
    near(M.value('log',a,q.x),q.y);
    for(const t of [0,.25,.5,1]) { const r=M.mirror(p,t); near(r.x+r.y,p.x+p.y); }
    const mid=M.mirror(p,.5); near(mid.x,mid.y);
  }
});
test('all reflected and translated curves have correct anchors, domains, monotonicity and curvature', () => {
  for(const kind of ['exp','log']) for(const a of [.5,2]) for(const sx of [-1,1]) for(const sy of [-1,1]) {
    const [h,k]=[3,-2], props=M.properties(kind,a,h,k,sx,sy), p=M.point(kind,a,kind==='exp'?0:0,h,k,sx,sy);
    near(p.x,props.anchor.x);near(p.y,props.anchor.y);near(M.transform(kind,a,p.x,h,k,sx,sy),p.y);
    const x=kind==='exp'?h:h+sx*2, eps=.01;
    const left=M.transform(kind,a,x-eps,h,k,sx,sy),mid=M.transform(kind,a,x,h,k,sx,sy),right=M.transform(kind,a,x+eps,h,k,sx,sy);
    assert.equal(right>left,props.increasing);assert.equal(Math.sign(left+right-2*mid),props.concavity);
    if(kind==='log') {assert.equal(props.domain.greater,sx>0);assert.ok(Number.isNaN(M.transform(kind,a,h-sx,h,k,sx,sy)));}
    else {assert.equal(props.range.greater,sy>0);assert.equal(props.asymptote.value,k);}
  }
});
test('handout translations and reciprocal-base reflections match equivalent expressions', () => {
  for(const x of [-2,0,1,4]) {
    near(M.transform('exp',2,x,3),Math.pow(2,x)/8);
    near(M.transform('exp',2,x,0,0,-1,1),Math.pow(.5,x));
  }
  for(const x of [.1,1,3,10]) {
    near(M.transform('log',3,x,0,-2),M.value('log',3,x/9));
    near(M.transform('log',3,x,0,0,1,-1),M.value('log',1/3,x));
  }
});
test('chord inequalities distinguish monotonicity from concavity', () => {
  for(const a of [.1,.5,1.2,2,5]) {
    const e=M.chord('exp',a,-1,2);assert.ok(e.average>e.curve);
    const l=M.chord('log',a,.5,4);assert.equal(l.average>l.curve,a<1);
    assert.equal(e.left<e.right,a>1);assert.equal(l.left<l.right,a>1);
  }
  assert.throws(()=>M.chord('log',2,0,3)); assert.throws(()=>M.chord('exp',2,3,2));
});
test('normal-base intersection solver includes tangent at (e,e) and off-screen second root', () => {
  assert.deepEqual(M.positiveBaseIntersections(M.CRITICAL),[Math.E]);
  near(M.value('exp',M.CRITICAL,Math.E),Math.E);
  assert.deepEqual(M.positiveBaseIntersections(2),[]);assert.equal(M.positiveBaseIntersections(.5),null);
  for(const a of [1.001,1.1,1.2,1.4,M.CRITICAL-1e-6]) {
    const roots=M.positiveBaseIntersections(a);assert.equal(roots.length,2);assert.ok(roots[0]<Math.E&&roots[1]>Math.E);
    for(const x of roots) {near(Math.log(x),x*Math.log(a)); near(M.value('log',a,x),x);}
  }
  assert.ok(M.positiveBaseIntersections(1.2)[1]>7);
});
test('homepage lists the grade-11 lesson and all local entrypoint assets exist', () => {
  const fs=require('node:fs'), vm=require('node:vm');
  const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('data.js','utf8')+';globalThis.lessons=lessonData',ctx);
  const entry=ctx.lessons.find(l=>l.url==='senior/math/exp_log_explorer.html');assert.ok(entry);assert.ok(entry.grades.includes(11));
  const html=fs.readFileSync(entry.url,'utf8');assert.equal((html.match(/data-topic=/g)||[]).length,5);
  for(const [,asset]of html.matchAll(/(?:src|href)="([^"?]+)(?:\?[^"]*)?"/g)) {
    if(asset.startsWith('http'))continue;assert.ok(fs.existsSync(require('node:path').resolve('senior/math',asset)),asset);
  }
});
