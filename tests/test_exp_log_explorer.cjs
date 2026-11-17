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
  const html=fs.readFileSync(entry.url,'utf8');
  assert.match(html,/id="normal-base"[^>]*min="1.1"[^>]*max="5"[^>]*step="0.1"/);
  assert.match(html,/id="fractional-base"[^>]*min="0.10"[^>]*max="0.95"[^>]*step="0.05"/);
  for(const id of ['normal-exp','normal-log']) assert.match(html,new RegExp('id="'+id+'"[^>]*checked'));
  for(const id of ['fractional-exp','fractional-log']) assert.doesNotMatch(html,new RegExp('id="'+id+'"[^>]*checked'));
  for(const id of ['critical-mode','symmetry-toggle','fit-points','pan-toggle']) assert.ok(html.includes('id="'+id+'"'));
  for(const [,asset]of html.matchAll(/(?:src|href)="([^"?]+)(?:\?[^"]*)?"/g)) {
    if(asset.startsWith('http'))continue;assert.ok(fs.existsSync(require('node:path').resolve('senior/math',asset)),asset);
  }
});
test('every slider combination finds all six curve-pair intersections without duplicates', () => {
  const all=['normal-exp','normal-log','fractional-exp','fractional-log'];
  for(let ai=11;ai<=50;ai++) for(let bi=2;bi<=19;bi++) {
    const a=ai/10,b=bi/20,points=M.dualBaseIntersections(a,b);
    assert.equal(points.length,a<M.CRITICAL?7:5);
    for(const p of points) {
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
      for(const pair of p.pairs) for(const id of pair) near(M.value(id.endsWith('exp')?'exp':'log',id.startsWith('normal')?a:b,p.x),p.y);
    }
    for(let i=0;i<points.length;i++) for(let j=0;j<i;j++) assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>1e-7);
  }
  const exact=M.dualBaseIntersections(M.CRITICAL,.5);
  assert.equal(exact.length,6);assert.equal(exact.filter(p=>p.exact).length,1);
  const p=exact.find(p=>p.exact);near(p.x,Math.E);near(p.y,Math.E);
});
test('visibility filters include cross-base intersections and never invent symmetry-axis points', () => {
  const ids=['normal-exp','normal-log','fractional-exp','fractional-log'];
  for(const a of [1.1,1.4,M.CRITICAL,2,5]) for(let mask=0;mask<16;mask++) {
    const visible=Object.fromEntries(ids.map((id,i)=>[id,!!(mask&(1<<i))]));
    const expected=M.dualBaseIntersections(a,.5).filter(p=>p.pairs.some(pair=>pair.every(id=>visible[id])));
    const actual=M.dualBaseIntersections(a,.5,visible);
    assert.deepEqual(actual.map(p=>p.id),expected.map(p=>p.id));
  }
  const onlyNormal={'normal-exp':true,'normal-log':true,'fractional-exp':false,'fractional-log':false};
  assert.equal(M.dualBaseIntersections(2,.5,onlyNormal).length,0);
  assert.equal(M.dualBaseIntersections(1.4,.5,onlyNormal).length,2);
  assert.throws(()=>M.dualBaseIntersections(1,.5));
  assert.throws(()=>M.dualBaseIntersections(2,.05));
});
test('fit view encloses far intersections with an equal-scale square and origin margin', () => {
  const points=M.dualBaseIntersections(1.1,.1),v=M.fitIntersections(points);
  assert.ok(points.some(p=>p.x>38));
  for(const p of [...points,{x:0,y:0}]){assert.ok(Math.abs(p.x-v.cx)<v.span/2);assert.ok(Math.abs(p.y-v.cy)<v.span/2);}
  assert.deepEqual(M.fitIntersections([]),{cx:2.5,cy:2.5,span:9});
});
