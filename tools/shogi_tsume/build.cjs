const fs=require('fs');const {E,parse,run}=require('./shogi_classify.cjs');
const DIR=(process.argv[3]||'.')+'/';const CAP=60000,STEP_MS=+process.argv[2]||120;
const ms=(f)=>{const t=Date.now();const r=f();return [r,Date.now()-t]};
// 模擬遊戲裡實際會跑的計算：提示（mateIn）、走對後玉方判斷與應手（defMated＋defReply），取最重的一步
function flowCost(p0,n,m0){let worst=0,p=E.clone(p0),rem=n,m=m0;
  let [,t]=ms(()=>E.mateIn(E.clone(p),rem));worst=Math.max(worst,t);
  while(true){E.doMove(p,m);if(!E.legal(p).length)return worst;
    let [ok,t1]=ms(()=>E.defMated(E.clone(p),rem-1));if(!ok)return 1e9;let [r,t2]=ms(()=>E.defReply(E.clone(p),rem-1));worst=Math.max(worst,t1+t2);
    E.doMove(p,r);rem-=2;const [mm,t3]=ms(()=>E.mateIn(E.clone(p),rem));worst=Math.max(worst,t3);if(!mm)return 1e9;m=mm}}
function checks(p){let c=0;for(const m of E.legal(p)){const u=E.doMove(p,m);if(E.inCheck(p))c++;E.undoMove(p,m,u)}return c}
function enc(p,m){const b=[];p.b.forEach((v,s)=>{if(v)b.push([s,v])});const h=[];for(let t=1;t<=7;t++)if(p.h[0][t])h.push([t,p.h[0][t]]);return {b,h,m}}
const pool={1:[],3:[],5:[],7:[]},seen=new Set();
for(const n of [3,5,7]){const lines=fs.readFileSync(DIR+`mate${n}_20k.sfen`,'utf8').split('\n').filter(Boolean);let i=0;
  for(const L of lines){if(pool[n].length>=(n===7?140:220))break;i++;
    const p=parse(L);if(!p)continue;p.side=-1;const dc=E.inCheck(p);p.side=1;if(dc||E.inCheck(p))continue;const k=E.key(p);if(seen.has(k))continue;
    if(run(()=>E.mateIn(E.clone(p),n-2),CAP)!==0)continue;const mm=run(()=>E.mateMoves(E.clone(p),n),CAP);if(mm==='CAP'||mm.length!==1)continue;
    const fc=flowCost(p,n,mm[0]);if(fc>STEP_MS)continue;seen.add(k);pool[n].push({p,m:mm[0],d:checks(p),fc});
    // 一手詰：取這個實戰局面走一步、玉方應一步之後的局面
    if(n===3&&pool[1].length<220){const q=E.clone(p);E.doMove(q,mm[0]);for(const r of E.legal(q)){const z=E.clone(q);E.doMove(z,r);z.side=-1;const dz=E.inCheck(z);z.side=1;if(dz||E.inCheck(z))continue;const one=E.mateMoves(E.clone(z),1);if(one.length===1&&!seen.has(E.key(z))){seen.add(E.key(z));pool[1].push({p:z,m:one[0],d:checks(z),fc:0});break}}}
  }
  console.log('n',n,'scanned',i,'kept',pool[n].length,'pool1',pool[1].length)}
const out={};for(const n of [1,3,5,7]){const L=pool[n].sort((a,b)=>a.d-b.d);const N=100;if(L.length<N)throw new Error('not enough '+n+' '+L.length);
  const pick=[];for(let i=0;i<N;i++)pick.push(L[Math.round(i*(L.length-1)/(N-1))]);out[n]=pick.map(q=>enc(q.p,q.m));
  console.log(n,'max step ms',Math.max(...pick.map(q=>q.fc)))}
fs.writeFileSync(DIR+'tsume_bank.json',JSON.stringify(out));
console.log('bytes',JSON.stringify(out).length);
