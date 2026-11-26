/* 殺法圖鑑：從 wukong-xiangqi（MIT）實戰殺局中，依「最後將死那一步」的形狀分類，輸出 games/xiangqi_mates.js。
   用法：node tools/xiangqi_mate_patterns.cjs 路徑/puzzles.js
   只收能用機械條件明確判斷的殺法；一手、二手、三手殺（2n-1 步內）、首手唯一、沒有更短的殺法。 */
const X=require('../games/xiangqi_engine.js'),fs=require('fs');
const {legal,make,unmake,inCheck,attacked,from,to,mateMoves,escape}=X;
const src=fs.readFileSync(process.argv[2]||'puzzles.js','utf8');
const P=[...src.matchAll(/\{\s*"description":\s*"((?:[^"\\]|\\.)*)",\s*"fen":\s*"([^"]*)",\s*"id":\s*"([^"]*)",\s*"title":\s*"([^"]*)"\s*\}/g)].map(m=>({desc:m[1].replace(/\\n/g,'\n').trim(),fen:m[2]})).filter(q=>/^[1-9a-zA-Z/]+ [wb] - - \d+ \d+$/.test(q.fen));
const EV={'Hong Kong Team Champion':'香港象棋團體賽','China Team Championship':'全國象棋團體賽','World Xiangqi Championships':'世界象棋錦標賽','Chinese National Champion':'全國象棋個人賽','Hong Kong Individual Championship':'香港象棋個人賽','China National Xiangqi League':'全國象棋甲級聯賽','Asian Xiangqi Individual Championships':'亞洲象棋個人錦標賽','Asian xiangqi Championship':'亞洲象棋錦標賽','The world mind sports games':'世界智力運動會','Asian Indoor Games':'亞洲室內運動會','National Games':'全國運動會'};
const CODE={k:1,a:2,b:3,n:4,r:5,c:6,p:7};
function parse(fen){const [rows,side]=fen.split(' ');const b=new Int8Array(90);const R=rows.split('/');if(R.length!==10)return null;
  for(let y=0;y<10;y++){let x=0;for(const ch of R[y]){if(/\d/.test(ch)){x+=+ch;continue}const v=CODE[ch.toLowerCase()];if(!v||x>8)return null;b[y*9+x]=ch===ch.toUpperCase()?v:-v;x++}if(x!==9)return null}
  let p={b,side:side==='w'?1:-1,quiet:0};if(p.side===-1)p={b:Int8Array.from(Array.from(b).reverse().map(v=>-v)),side:1,quiet:0};return p}
const sq2u=s=>String.fromCharCode(97+s%9)+(9-(s/9|0)),mv2u=m=>sq2u(from(m))+sq2u(to(m));
const CAT={
  zp:['重炮','兩門炮排在同一條線，前炮當炮架，後炮隔著它將軍。'],
  mhp:['馬後炮','炮用自己的馬當炮架將軍，馬同時控制著黑將的退路。'],
  scc:['雙車錯','兩輛車在相鄰的兩條線上交錯：一輛將軍，另一輛封住退路。'],
  wcm:['臥槽馬','馬跳到象位前方的「槽」從側面將軍，黑將的身邊被自己的棋子擋住。'],
  bl:['白臉將','黑將想走的那一格會和紅帥照面，所以無路可逃。'],
  mg:['悶宮','黑將四周被自己的棋子堵死，被一擊將死。'],
  sj:['雙將','兩個子同時將軍，不能吃也不能擋，黑將只能自己走開。'],
  bing:['兵殺','別小看兵，兵也能把將軍死。']};
const ORDER=['zp','mhp','scc','wcm','bl','mg','sj','bing'];
function classify(p0,lm,pieceMoved){
  /* p0：最後一步之前（紅方走）的局面；lm：最後一步 */
  const p={b:Int8Array.from(p0.b),side:1,quiet:0};make(p,lm);
  const kb=p.b.findIndex(v=>v===-1),kx=kb%9,ky=kb/9|0,t=to(lm);
  const attackers=[];{const q={b:p.b,side:1,quiet:0};for(const m of X.pseudo(q))if(to(m)===kb)attackers.push(from(m))}
  const line=(a,b)=>{const out=[];const dx=Math.sign(b%9-a%9),dy=Math.sign((b/9|0)-(a/9|0));if(dx&&dy)return out;for(let x=a%9+dx,y=(a/9|0)+dy;x!==b%9||y!==(b/9|0);x+=dx,y+=dy)if(p.b[y*9+x])out.push(p.b[y*9+x]);return out};
  const reds=[];p.b.forEach((v,i)=>{if(v>0)reds.push([v,i])});
  if(pieceMoved===6){const sc=line(t,kb);if(sc.length===1&&sc[0]===6)return 'zp';if(sc.length===1&&sc[0]===4)return 'mhp'}
  if(pieceMoved===5){const r2=reds.filter(([v,i])=>v===5&&i!==t);if(r2.length===1){const i=r2[0][1],x1=t%9,y1=t/9|0,x2=i%9,y2=i/9|0;
    if((y1===ky&&Math.abs(y1-y2)===1)||(x1===kx&&Math.abs(x1-x2)===1))return 'scc'}}
  if(pieceMoved===4&&ky===0&&kx===4&&(t===1*9+2||t===1*9+6))return 'wcm';
  /* 白臉將：有一格黑將本來能走，但只因為會和紅帥照面而不能走 */
  const rk=p.b.findIndex(v=>v===1),noK=Int8Array.from(p.b);noK[rk]=0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=kx+dx,y=ky+dy;if(x<3||x>5||y<0||y>2)continue;const n=y*9+x;if(p.b[n]<0)continue;
    if(x===rk%9&&attacked(p,n,1)&&!attacked({b:noK,side:1,quiet:0},n,1))return 'bl'}
  const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[kx+dx,ky+dy]).filter(([x,y])=>x>=3&&x<=5&&y>=0&&y<=2);
  if(nb.length>=2&&nb.every(([x,y])=>p.b[y*9+x]<0)&&[6,4,7].includes(pieceMoved))return 'mg';
  if(attackers.length>=2)return 'sj';
  if(pieceMoved===7)return 'bing';
  return null}

const found=Object.fromEntries(ORDER.map(c=>[c,[]])),seen=new Set();let tried=0;
for(const q of P){const lines=q.desc.split('\n').map(s=>s.trim()).filter(Boolean),evl=(lines.at(-1)||'').trim(),m=/^(.*?)\s*(\d{4})\s*$/.exec(evl);if(!m||!EV[m[1].trim()])continue;
  const p0=parse(q.fen);if(!p0||inCheck(p0,1)||inCheck(p0,-1))continue;const k=X.key(p0);if(seen.has(k))continue;
  for(const n of [1,3,5]){const t0=Date.now();const ms=mateMoves(p0,n);if(Date.now()-t0>500)break;if(!ms.length)continue;if(ms.length!==1)break;seen.add(k);tried++;
    /* 沿著最頑強的抵抗走到將死 */
    const p={b:Int8Array.from(p0.b),side:1,quiet:0},line=[],alts=[];let plies=n,ok=true,last=0,pm=0;
    while(true){const mm=mateMoves(p,plies);if(!mm.length){ok=false;break}const a=mm[0];last=a;pm=Math.abs(p.b[from(a)]);line.push(mv2u(a));alts.push(mm.slice(1).map(mv2u));
      const before={b:Int8Array.from(p.b),side:1,quiet:0};make(p,a);const rs=legal(p);if(!rs.length){var finalBefore=before;break}
      const r=escape(p,plies-2)||rs[0];line.push(mv2u(r));alts.push([]);make(p,r);plies-=2;if(plies<1){ok=false;break}}
    if(!ok)break;const cat=classify(finalBefore,last,pm);if(!cat)break;
    found[cat].push({b:Array.from(p0.b),line,alts,n:(line.length+1)/2,year:+m[2],event:EV[m[1].trim()],players:lines[0]});break}}
const CODEL={1:'K',2:'A',3:'B',4:'N',5:'R',6:'C',7:'P'};
const pcsOf=b=>{const o=[];for(let i=0;i<90;i++){const v=b[i];if(!v)continue;const c=CODEL[Math.abs(v)];o.push((v>0?c:c.toLowerCase())+sq2u(i))}return o.join(' ')};
const res=[],stat={};
for(const c of ORDER){const list=found[c].sort((a,b)=>a.n-b.n||a.b.filter(Boolean).length-b.b.filter(Boolean).length);stat[c]=list.length;
  /* 一、二、三手各取一些，由簡單到複雜 */
  const pick=[];const by=[1,2,3].map(n=>list.filter(x=>x.n===n));let i=0;while(pick.length<14&&by.some(a=>a.length>i)){for(const a of by)if(a[i]&&pick.length<14)pick.push(a[i]);i++}
  pick.sort((a,b)=>a.n-b.n);
  pick.forEach((x,i)=>{const steps=[];x.line.forEach((u,j)=>{if(j%2===0){const last=j===x.line.length-1;
      steps.push({u,y:1,...(x.n===1?{k:'mate'}:{}),q:x.n===1?'找出一步將死黑方的殺著。':last?'最後一步，把黑將將死。':'找出連續將軍、最後將死的第一步。',s:last?CAT[c][0]+'！'+CAT[c][1]:'將軍！黑方只能這樣應對。',...(x.alts[j].length?{alt:x.alts[j]}:{})})}
      else steps.push({u,s:'黑方的最佳抵抗。'})});
    res.push({id:'m_'+c+'_'+(i+1),sec:'end',cat:c,t:CAT[c][0]+' '+(i+1),d:CAT[c][1]+'取自 '+x.year+' '+x.event+'的實戰，'+(x.n===1?'一步':x.n+' 步')+'將死。',pcs:pcsOf(x.b),steps})})}
const body='/* 殺法圖鑑：取自 wukong-xiangqi（Copyright (c) 2021 Maksym Korzh，MIT）的大師實戰殺局，依最後將死的形狀分類（tools/xiangqi_mate_patterns.cjs）。 */\n(function(root){\n  const CATS='+JSON.stringify(Object.fromEntries(ORDER.map(c=>[c,CAT[c][0]])))+';\n  const T='+JSON.stringify(res)+';\n  root.XiangqiMates={cats:CATS,list:T};if(typeof module!=="undefined")module.exports=root.XiangqiMates;\n})(typeof self!=="undefined"?self:globalThis);\n';
fs.writeFileSync(__dirname+'/../games/xiangqi_mates.js',body);console.log('唯一首手殺局',tried,'分類結果',stat,'輸出',res.length)
