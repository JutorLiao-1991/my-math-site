const fs=require('fs');const B=JSON.parse(fs.readFileSync((process.argv[2]||'.')+'/tsume_bank.json','utf8'));
const L={1:'P',2:'L',3:'N',4:'S',5:'G',6:'B',7:'R',8:'K',9:'+P',10:'+L',11:'+N',12:'+S',14:'+B',15:'+R'};
function pack(q){const b=new Array(81).fill(0);q.b.forEach(([s,v])=>b[s]=v);const rows=[];
  for(let y=0;y<9;y++){let r='',e=0;for(let x=0;x<9;x++){const v=b[y*9+x];if(!v){e++;continue}if(e){r+=e;e=0}const c=L[Math.abs(v)];r+=v>0?c:c.toLowerCase()}if(e)r+=e;rows.push(r)}
  const h=q.h.map(([t,c])=>(c>1?c:'')+L[t]).join('')||'-';return rows.join('/')+' '+h+' '+q.m}
const out={};for(const n of [1,3,5,7])out[n]=B[n].map(pack);
const s='const TSUME_SRC='+JSON.stringify(out).replace(/"(\d)":/g,'$1:')+';';
fs.writeFileSync((process.argv[2]||'.')+'/tsume_src.js',s);console.log(s.length,s.slice(0,200));
