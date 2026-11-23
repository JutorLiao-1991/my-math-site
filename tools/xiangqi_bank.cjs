/* 離線產生殺局；上線時只載入已驗證的題庫，不在手機現場出題。 */
const fs=require('node:fs');
const X=require('../games/xiangqi_engine.js');
let seed=0x20261123;
const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)%n};
const at=(x,y)=>y*9+x;
const seen=new Set(),bank={1:[],3:[]};
function randomPosition(){const b=new Int8Array(90),put=(v,sqs)=>{for(let k=0;k<30;k++){const i=sqs[rnd(sqs.length)];if(!b[i]){b[i]=v;return true}}return false};
  put(1,[at(3,9),at(4,9),at(5,9),at(4,8)]);put(-1,[at(3,0),at(4,0),at(5,0),at(3,1),at(4,1),at(5,1),at(4,2)]);
  const zone=Array.from({length:54},(_,i)=>i),types=[5,4,6,7],count=[0,0,0,0,0,0,0,0];
  for(let i=0,n=2+rnd(3);i<n;i++){let t=types[rnd(4)];if(count[t]>=2)t=7;count[t]++;put(t,zone)}
  if(rnd(2))put(-2,[3,5,13,21,23]);
  if(rnd(3)===0)put(-3,[2,6,18,22,26,38,42]);
  if(rnd(3)===0)put(-7,Array.from({length:36},(_,i)=>i+27));
  if(rnd(5)===0)put(-4,Array.from({length:45},(_,i)=>i));
  return {b,side:1,quiet:0};
}
function check(p,n){if(X.inCheck(p,1)||X.inCheck(p,-1))return null;if(n===3&&X.mateMoves(p,1).length)return null;const sol=X.mateMoves(p,n);return sol.length===1?sol:null}
function compact(p,n,sol){for(let i=0;i<90;i++){if(!p.b[i]||Math.abs(p.b[i])===1)continue;const v=p.b[i];p.b[i]=0;const r=check(p,n);if(!r||r[0]!==sol[0])p.b[i]=v}return p}
function title(p,sol){const pieces=Array.from(p.b).filter(v=>v>0),count=t=>pieces.filter(v=>v===t).length,t=Math.abs(p.b[X.from(sol[0])]);
  if(count(5)===2)return '雙車協力';if(count(6)===2)return '雙炮配合';if(count(4)&&count(6))return '馬炮配合';if(count(5)&&count(4))return '車馬配合';if(count(5)&&count(6))return '車炮配合';if(count(7))return '兵力助攻';return {4:'躍馬攻殺',5:'車攻九宮',6:'炮架攻殺',7:'兵臨城下'}[t]||'九宮攻防'}
const target=50;
for(const n of [1,3]){let tries=0;while(bank[n].length<target){if(++tries>150000)throw new Error('題庫生成未完成 '+n);
  const p=randomPosition(),sol=check(p,n);if(!sol)continue;compact(p,n,sol);const k=X.key(p);if(seen.has(k))continue;
  const again=check(p,n);if(!again)continue;seen.add(k);bank[n].push({b:Array.from(p.b),solution:again[0],title:title(p,again)});
  if(bank[n].length%10===0)console.log(n+' 手殺 '+bank[n].length+' / '+target+'（嘗試 '+tries+'）');
}}
fs.writeFileSync(require('node:path').join(__dirname,'../games/xiangqi_puzzles.js'),'/* 由 tools/xiangqi_bank.cjs 產生；一手殺與三手殺各 50 題，每題驗證唯一首手。 */\n(function(r){const bank='+JSON.stringify(bank)+';r.XiangqiPuzzles=bank;if(typeof module!=="undefined")module.exports=bank})(typeof self!=="undefined"?self:globalThis);\n');
