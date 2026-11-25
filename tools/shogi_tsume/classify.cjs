const fs=require('fs');
const page=fs.readFileSync(__dirname+'/../../games/shogi.html','utf8');
let src=/<script type="text\/plain" id="eng">([\s\S]*?)<\/script>/.exec(page)[1];
// 只在工具裡加上節點上限，避免單題卡住
src=src.replace(/function legal\(p,skipU\)\{/,'function legal(p,skipU){if(++globalThis.__n>globalThis.__cap)throw new Error("cap");');
if(!src.includes('__cap'))throw new Error('patch failed');
globalThis.__n=0;globalThis.__cap=1e12;
const E=new Function(src+';return ENGINE;')();
const CODE={P:1,L:2,N:3,S:4,G:5,B:6,R:7,K:8},PRO={P:9,L:10,N:11,S:12,B:14,R:15},HT={P:1,L:2,N:3,S:4,G:5,B:6,R:7};
const TOT={1:18,2:4,3:4,4:4,5:4,6:2,7:2,8:2},BASE={9:1,10:2,11:3,12:4,14:6,15:7};
function parse(line){const [bd,side,hand]=line.trim().split(/\s+/);if(!bd||!side)return null;const rows=bd.split('/');if(rows.length!==9)return null;
  let b=new Int8Array(81);for(let y=0;y<9;y++){let x=0,pro=false;for(const ch of rows[y]){if(ch==='+'){pro=true;continue}if(/\d/.test(ch)){x+=+ch;continue}const U=ch.toUpperCase();const t=pro?PRO[U]:CODE[U];if(!t||x>8)return null;b[y*9+x]=ch===U?t:-t;x++;pro=false}if(x!==9)return null}
  let h=[new Int8Array(9),new Int8Array(9)];if(hand&&hand!=='-'){const re=/(\d*)([PLNSGBRplnsgbr])/g;let m;while(m=re.exec(hand)){const U=m[2].toUpperCase();h[m[2]===U?0:1][HT[U]]+=m[1]?+m[1]:1}}
  if(side==='w'){const nb=new Int8Array(81);for(let i=0;i<81;i++)nb[80-i]=-b[i];b=nb;h=[h[1],h[0]]}
  const cnt={};b.forEach(v=>{if(v){const t=BASE[Math.abs(v)]||Math.abs(v);cnt[t]=(cnt[t]||0)+1}});for(let t=1;t<=7;t++)cnt[t]=(cnt[t]||0)+h[0][t]+h[1][t];
  for(const t in TOT)if(cnt[t]!==TOT[t])return null;
  return {W:9,b,h,side:1,flip:side==='w'}}
function run(fn,cap){globalThis.__n=0;globalThis.__cap=cap;try{return fn()}catch(e){if(e.message==='cap')return 'CAP';throw e}finally{globalThis.__cap=1e12}}
module.exports={E,parse,run};
if(require.main===module){
  const file=process.argv[2],want=+process.argv[3],limit=+process.argv[4]||3000,CAP=+process.argv[5]||60000;
  const lines=fs.readFileSync(file,'utf8').split('\n').filter(Boolean).slice(0,limit);
  const stats={ok:0,bad:0,check:0,cap:0,short:0,multi:0,none:0},out=[];const t0=Date.now();const costs=[];
  for(const L of lines){const p=parse(L);if(!p){stats.bad++;continue}
    p.side=-1;const defChk=E.inCheck(p);p.side=1;if(E.inCheck(p)||defChk){stats.check++;continue}
    if(want>1){const s=run(()=>E.mateIn(E.clone(p),want-2),CAP);if(s==='CAP'){stats.cap++;continue}if(s){stats.short++;continue}}
    const ms=run(()=>E.mateMoves(E.clone(p),want),CAP);if(ms==='CAP'){stats.cap++;continue}const cost=globalThis.__n;
    if(!ms.length){stats.none++;continue}if(ms.length>1){stats.multi++;continue}
    stats.ok++;costs.push(cost);out.push({sfen:L.trim(),m:ms[0],cost})}
  costs.sort((a,b)=>a-b);
  console.log(JSON.stringify(stats),'ms',Date.now()-t0,'cost median',costs[costs.length>>1],'max',costs.at(-1));
  if(process.argv[6])fs.writeFileSync(process.argv[6],JSON.stringify(out));
}
