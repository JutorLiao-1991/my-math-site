const{test}=require('node:test');const assert=require('node:assert/strict');const C=require('../senior/chemistry/chemistry_core.js');
const W=require('../senior/physics/wave_core.js');
test('node meeting preset places an actual crest and trough at P, then swaps them after half a cycle',()=>{
  for(const [d,lambda,y]of [[120,40,180],[60,80,180],[220,16,100]]){
    const x=W.pointAtDifference(lambda/2,y,d);
    const r=W.point(x,y,d,lambda);
    const t=W.timeAtCrest(r.r1,lambda);
    const p=W.point(x,y,d,lambda,t);
    assert.ok(Math.abs(p.u1-1)<1e-10);
    assert.ok(Math.abs(p.u2+1)<1e-10);
    assert.ok(Math.abs(p.displacement)<1e-10);
    assert.ok(Math.abs((p.r1/lambda-t)-Math.round(p.r1/lambda-t))<1e-10);
    const swapped=W.point(x,y,d,lambda,t+.5);
    assert.ok(Math.abs(swapped.u1+1)<1e-10);
    assert.ok(Math.abs(swapped.u2-1)<1e-10);
    assert.ok(Math.abs(swapped.displacement)<1e-10);
  }
});
test('water antinode can have zero instantaneous displacement while amplitude stays two',()=>{const y=180,d=120,lambda=40,r=Math.hypot(d/2,y),time=r/lambda-.25;const p=W.point(0,y,d,lambda,time);assert.ok(Math.abs(p.displacement)<1e-10);assert.equal(p.amplitude,2);assert.equal(p.type,'constructive');});
test('water node cancels at all times and becomes an antinode after frequency doubles',()=>{const x=W.pointAtDifference(20,180,120);for(const t of[0,.125,.25,.7,1.25]){const p=W.point(x,180,120,40,t);assert.ok(Math.abs(p.displacement)<1e-10);assert.ok(p.amplitude<1e-10);}const p=W.point(x,180,120,20,.3);assert.ok(Math.abs(p.amplitude-2)<1e-10);assert.equal(p.type,'constructive');});
test('single-slit minima bound a central band twice the adjacent-band width in sin(theta)',()=>{const a=40,lambda=.55;assert.equal(W.singleIntensity(0,a,lambda),1);for(const m of[-2,-1,1,2])assert.ok(W.singleIntensity(m*lambda/a,a,lambda)<1e-20);const central=2*lambda/a,side=2*lambda/a-lambda/a;assert.ok(Math.abs(central/side-2)<1e-10);assert.ok(W.singleIntensity(1.5*lambda/a,a,lambda)<.05);});
test('double-slit equal maxima and finite-width envelope use separate physical controls',()=>{const d=180,lambda=.55;for(const m of[-3,-2,-1,0,1,2,3])assert.ok(Math.abs(W.doubleIntensity(m*lambda/d,d,lambda)-1)<1e-10);assert.ok(W.doubleIntensity(.5*lambda/d,d,lambda)<1e-20);assert.ok(W.doubleIntensity(3*lambda/d,d,lambda,40)<W.doubleIntensity(0,d,lambda,40));});
test('narrower aperture and longer wavelength broaden diffraction',()=>{assert.ok(W.spread(80,40)>W.spread(160,40));assert.ok(W.spread(80,60)>W.spread(80,40));assert.equal(W.spread(20,40),Math.PI/2);});
test('chemical formula parser handles parentheses, repeated elements, and rejects invalid forms',()=>{assert.deepEqual(C.parseFormula('Ca(OH)2'),{Ca:1,O:2,H:2});assert.deepEqual(C.parseFormula('C2H5OH'),{C:2,H:6,O:1});assert.deepEqual(C.parseFormula('Al2(SO4)3'),{Al:2,S:3,O:12});for(const s of['','H0','(OH','H2)','()','2H2O','h2o','H2+O2'])assert.throws(()=>C.parseFormula(s));});
test('all reaction solutions conserve every element and use smallest integers',()=>{for(const r of C.reactions){const s=C.balance(r,r.solution);assert.equal(s.minimal,true,r.id);assert.equal(s.conserved,true,r.id);const doubled=C.balance(r,r.solution.map(n=>2*n));assert.equal(doubled.conserved,true,r.id);assert.equal(doubled.minimal,false,r.id);assert.equal(doubled.divisor,2,r.id);assert.equal(C.balance(r,r.solution.map((n,i)=>i? n:n+1)).conserved,false,r.id);}});
test('zero, negative, fractional and missing coefficients cannot pass',()=>{const r=C.reactions[0];for(const c of[[0,0,0],[-2,-1,-2],[1,.5,1],[NaN,1,1]])assert.equal(C.balance(r,c).conserved,false);assert.throws(()=>C.balance(r,[1]));});
test('teacher combustion example gives CH2O with oxygen by mass difference',()=>{const d=C.combustion(4.5,2.7,6.6);const expected={nWater:.15,nH:.3,mH:.3,nCO2:.15,nC:.15,mC:1.8,mO:2.4,nO:.15};for(const[k,v]of Object.entries(expected))assert.ok(Math.abs(d[k]-v)<1e-10,k);assert.equal(C.empirical([1,2,1]),'CH2O');});
test('all unknown samples are internally consistent with empirical and molecular formulas',()=>{for(const s of C.samples){const d=C.combustion(s.mass,s.water,s.co2);assert.equal(d.physical,true,s.id);assert.ok(Math.abs(d.mC+d.mH+d.mO-s.mass)<1e-10,s.id);const ns=[d.nC,d.nH,d.nO];const scale=d.nC/s.ratio[0];s.ratio.forEach((n,i)=>assert.ok(Math.abs(ns[i]-n*scale)<1e-10,s.id));assert.equal(d.mO>1e-9,s.containsO,s.id);if(s.molarMass)assert.ok(Number.isInteger(s.molarMass/C.empiricalMass(s.ratio)),s.id);}});
test('measurement errors produce correct direction of bias',()=>{const ideal=C.combustion(4.5,2.7,6.6),waterLoss=C.combustion(4.5,2.16,6.6),co2Loss=C.combustion(4.5,2.7,5.28),wet=C.combustion(4.5,3.0,6.6);assert.ok(waterLoss.mH<ideal.mH&&waterLoss.mO>ideal.mO);assert.ok(co2Loss.mC<ideal.mC&&co2Loss.mO>ideal.mO);assert.ok(wet.mH>ideal.mH&&wet.mO<ideal.mO);assert.equal(C.combustion(1,18,44).physical,false);for(const x of[-1,NaN,Infinity])assert.throws(()=>C.combustion(x,1,1));});
