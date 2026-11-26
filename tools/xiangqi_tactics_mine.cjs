/* 中盤戰術題庫挖掘：用本站的象棋引擎自我對弈產生局面，再用固定深度搜尋篩出「有一步明顯最好」的戰術局面。
   不使用任何外部棋譜，沒有授權問題。
   用法：
     node tools/xiangqi_tactics_mine.cjs gen  <局數> <種子> <輸出.json>     自我對弈，輸出候選局面
     node tools/xiangqi_tactics_mine.cjs mine <輸入.json> <輸出.json>        篩選戰術題
     node tools/xiangqi_tactics_mine.cjs pack <輸入.json...> <輸出.js>       分類、挑選、輸出 games/xiangqi_tactics.js */
const X=require('../games/xiangqi_engine.js'),fs=require('fs'),L=require('../games/xiangqi_lessons.js');
const {legal,make,unmake,inCheck,evaluate,attacked,from,to,VALUE,MATE}=X;
const cmd=process.argv[2];
let seed=1;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%100000)/100000};
const flip=p=>({b:Int8Array.from(Array.from(p.b).reverse().map(v=>-v)),side:-p.side,quiet:0});
const sq2u=s=>String.fromCharCode(97+s%9)+(9-(s/9|0));
const mv2u=m=>sq2u(from(m))+sq2u(to(m));
const mat=p=>{let r=0;for(const v of p.b)if(v&&Math.abs(v)!==1)r+=(v>0?1:-1)*VALUE[Math.abs(v)];return r};
const cnt=p=>p.b.reduce((n,v)=>n+(v&&Math.abs(v)!==1?1:0),0);

/* ---------- 自我對弈 ----------
   對弈時偶爾「失手」：選一步會讓對方賺到 150～450 分的壞棋。失手之後輪到對方走的局面，就是戰術題候選。 */
function gen(n,out){const res=[],seen=new Set();
  for(let g=0;g<n;g++){let p=X.start();const op=L.openings[(rnd()*L.openings.length)|0],pre=4+((rnd()*5)|0);
    for(let i=0;i<pre&&i<op.moves.length;i++){if(!legal(p).includes(op.moves[i]))break;make(p,op.moves[i])}
    for(let ply=0;ply<80;ply++){const ms=legal(p);if(!ms.length||p.quiet>40)break;let m=0,blunder=false;
      if(ply>=6&&rnd()<.2){const r=rootScores(p,2),best=r[0][1],bad=r.filter(x=>x[1]<=best-150&&x[1]>=best-450&&!inCheck(p));if(bad.length){m=bad[(rnd()*bad.length)|0][0];blunder=true}}
      if(!m)m=X.think(p,{level:2,time:50}).m;if(!m)break;make(p,m);
      if(blunder&&cnt(p)>=11&&!inCheck(p)&&legal(p).length>8){const q=p.side===1?p:flip(p),k=Array.from(q.b).join();if(!seen.has(k)){seen.add(k);res.push(Array.from(q.b))}}
      if(X.status(p).over)break}
    if(g%10===9)process.stderr.write(`${g+1}/${n} 局，累計 ${res.length} 個局面\n`)}
  fs.writeFileSync(out,JSON.stringify(res))}

/* ---------- 搜尋 ---------- */
let nodes=0;
const mvv=(p,m)=>{const c=p.b[to(m)];return c?1e5+VALUE[Math.abs(c)]*10-VALUE[Math.abs(p.b[from(m)])]/10:0};
function qs(p,a,b,d){nodes++;const ck=inCheck(p),ms=legal(p);if(!ms.length)return -MATE;const st=evaluate(p);if(d>=6&&!ck||d>=12)return st;
  if(!ck){if(st>=b)return st;if(st>a)a=st}
  const list=(ck?ms:ms.filter(m=>p.b[to(m)])).sort((x,y)=>mvv(p,y)-mvv(p,x));
  for(const m of list){const u=make(p,m),v=-qs(p,-b,-a,d+1);unmake(p,m,u);if(v>=b)return v;if(v>a)a=v}return a}
function ab(p,d,a,b,ply=0){nodes++;if(d<=0)return qs(p,a,b,0);const ms=legal(p);if(!ms.length)return -MATE+ply;
  ms.sort((x,y)=>mvv(p,y)-mvv(p,x));let best=-1e9;
  for(const m of ms){const u=make(p,m),v=-ab(p,d-1,-b,-a,ply+1);unmake(p,m,u);if(v>best)best=v;if(v>a)a=v;if(a>=b)break}return best}
const rootScores=(p,d,only)=>{const out=[];for(const m of legal(p)){const u=make(p,m);const v=-ab(p,d-1,-1e9,1e9,1);unmake(p,m,u);out.push([m,v])}return out.sort((a,b)=>b[1]-a[1])};

/* ---------- 篩選 ---------- */
const D=4,GAP=Number(process.env.GAP)||130;
function analyse(bd){const p={b:Int8Array.from(bd),side:1,quiet:0};
  if(inCheck(p))return null;
  const Q=qs(p,-1e9,1e9,0);
  /* 便宜的前置判斷：3 層搜尋要明顯高於靜態分數 */
  const ms=legal(p).sort((x,y)=>mvv(p,y)-mvv(p,x));
  /* 全部走法在 D 層的分數；用零寬視窗檢查「第二名」 */
  let best=-1e9,bm=0;
  for(const m of ms){const u=make(p,m),v=-ab(p,D-1,-1e9,-best+1,1);unmake(p,m,u);if(v>best){best=v;bm=m}}
  if(Math.abs(best)>MATE-1000)return null;
  const gain=best-Q;if(gain<120)return null;
  /* 其他走法都要比最佳差 GAP 以上 */
  for(const m of ms){if(m===bm)continue;const u=make(p,m),v=-ab(p,D-1,-(best-GAP)-1,-(best-GAP),1);unmake(p,m,u);if(v>best-GAP)return null}
  /* 殺棋題另有題庫，這裡不收 */
  if(X.mateMoves(p,3).length)return null;
  return {Q,best,bm,gain}}
function lineOf(p0,bm){const p={b:Int8Array.from(p0.b),side:1,quiet:0},line=[bm],alts=[[]];make(p,bm);
  /* 黑方最佳應對 */
  let r=rootScores(p,3);if(!r.length)return null;line.push(r[0][0]);make(p,r[0][0]);
  /* 紅方第二步：D-1 層最佳，並收集同樣好的等價走法 */
  const r2=rootScores(p,3);if(!r2.length)return {line,alts};
  const top=r2[0][1],m2=r2[0][0];
  if(!p.b[to(m2)]&&!(()=>{const u=make(p,m2);const c=inCheck(p);unmake(p,m2,u);return c})())return {line,alts}; // 第二步不是吃子也不是將軍就不要
  line.push(m2);alts.push(r2.filter(x=>x[0]!==m2&&x[1]>=top-40).map(x=>x[0]));return {line,alts}}
const NAME={2:'仕',3:'相',4:'傌',5:'俥',6:'炮',7:'兵'},BN={2:'士',3:'象',4:'馬',5:'車',6:'包',7:'卒'};
const nm=v=>v>0?NAME[Math.abs(v)]||'帥':BN[Math.abs(v)]||'將';
const cap1v=(bd,bm)=>bd[to(bm)];
function classify(bd,bm,line){const p={b:Int8Array.from(bd),side:1,quiet:0},mover=p.b[from(bm)],cap1=p.b[to(bm)],m0=mat(p);
  const u1=make(p,bm),chk=inCheck(p);
  /* 紅方下一手的威脅（把輪次換回紅方，看被攻擊的黑子） */
  const q={b:p.b,side:1,quiet:0},threats=new Set();for(const m of X.pseudo(q)){const t=to(m);if(p.b[t]<0&&from(m)===to(bm))threats.add(t)}
  const targets=[...threats].filter(t=>{const v=Math.abs(p.b[t]);if(v===1)return true;const def=attacked(p,t,-1);return !def||VALUE[v]>VALUE[Math.abs(mover)]+30}).length;
  const hang=attacked(p,to(bm),-1)&&!attacked(p,to(bm),1);
  unmake(p,bm,u1);
  /* 閃擊：移動後，另一顆紅子（俥或炮）新增了對黑子的攻擊 */
  const before=new Set(),after=new Set();{const a={b:p.b,side:1,quiet:0};for(const m of X.pseudo(a))if(a.b[to(m)]<0&&from(m)!==from(bm))before.add(from(m)+':'+to(m))}
  {const c={b:Int8Array.from(p.b),side:1,quiet:0};c.b[to(bm)]=c.b[from(bm)];c.b[from(bm)]=0;for(const m of X.pseudo(c))if(c.b[to(m)]<0&&from(m)!==to(bm)&&!before.has(from(m)+':'+to(m)))after.add(from(m)+':'+to(m))}
  const disc=[...after].filter(k=>{const t=+k.split(':')[1];return Math.abs(p.b[t])>=4||Math.abs(p.b[t])===1}).length>0;
  const fin={b:Int8Array.from(bd),side:1,quiet:0};for(const m of line)make(fin,m);
  const dm=mat(fin)-m0,capLater=line.length>=3&&bd[to(line[2])]!==0;
  const recap=cap1?attacked(Object.assign({},p,{b:(()=>{const c=Int8Array.from(bd);c[to(bm)]=c[from(bm)];c[from(bm)]=0;return c})(),side:-1}),to(bm),-1):false;
  let cat;
  if(chk&&line.length>=3&&dm>=150)cat='chk';
  else if(!cap1&&targets>=2)cat='fork';
  else if(disc&&!cap1&&dm>=150)cat='disc';
  else if(hang&&!cap1&&dm>=150)cat='sac';
  else if(cap1&&!recap&&dm>=150)cat='free';
  else if(cap1&&recap&&VALUE[Math.abs(cap1v(bd,bm))]>VALUE[Math.abs(mover)]+40&&dm>=150)cat='up';
  else if(cap1&&line.length>=3&&capLater)cat='trade';
  else if(!cap1&&line.length>=3&&capLater)cat='quiet';
  else cat='misc';
  return {cat,dm,mover:nm(mover),cap1:cap1?nm(cap1):'',cap2:line.length>=3&&bd[to(line[2])]?0:0}}

function mine(inp,out){const cand=JSON.parse(fs.readFileSync(inp,'utf8')),res=[];const t0=Date.now();
  cand.forEach((bd,i)=>{const a=analyse(bd);if(a){const p={b:Int8Array.from(bd),side:1,quiet:0};
    /* 加深確認：最佳走法在更深一層仍然維持 */
    const u=make(p,a.bm),deep=-ab(p,D+1,-1e9,1e9,1);unmake(p,a.bm,u);
    if(deep<a.best-110||deep-a.Q<GAP*0.7&&a.gain<GAP*0.7){}else{
      const L2=lineOf({b:Int8Array.from(bd)},a.bm);if(L2){const c=classify(bd,a.bm,L2.line);
        const fin={b:Int8Array.from(bd),side:1,quiet:0};for(const m of L2.line)make(fin,m);
        const defOnly=a.gain<120;if(process.env.DBG)console.error('cand',a.gain,c.cat,c.dm,deep,a.best);
        if(c.dm>=150||defOnly&&c.dm>=-60)res.push({b:Array.from(bd),line:L2.line.map(mv2u),alts:L2.alts.map(l=>l.map(mv2u)),Q:a.Q,best:a.best,deep,gain:a.gain,...c,def:defOnly})}}}
    if(i%25===24)process.stderr.write(`${i+1}/${cand.length}，入選 ${res.length}，${((Date.now()-t0)/1000)|0}s\n`)});
  fs.writeFileSync(out,JSON.stringify(res))}

if(cmd==='gen'){seed=Number(process.argv[4])||1;gen(Number(process.argv[3])||10,process.argv[5]||'cand.json')}
else if(cmd==="dbg"){const c=JSON.parse(fs.readFileSync(process.argv[3]));let n1=0,n2=0,stat=[];for(const bd of c){const p={b:Int8Array.from(bd),side:1,quiet:0};const r=rootScores(p,D),Q=qs(p,-1e9,1e9,0);stat.push([Q,r[0][1],r[1][1]])}console.log(stat.map(s=>s.join("/")).join("  "))}
else if(cmd==="mine")mine(process.argv[3],process.argv[4]);

/* ---------- 打包 ---------- */
const CATS={combo:['捉雙・閃擊・棄子','一步棋製造雙重威脅，或移開、犧牲一顆子換來更大的利益。'],free:['白吃無根子','找出對方沒有保護的子，白白吃掉。'],up:['以小換大','用價值低的子去吃價值高的子，就算被回吃也賺。'],chk:['將軍得子','先將軍逼對方應付，再趁機吃子。'],fork:['捉雙','一步棋同時攻擊兩個子，對方只能救一個。'],disc:['閃擊','移開一顆子，讓後面的俥或炮露出來攻擊，自己也同時有威脅。'],
  sac:['棄子取勢','主動把子送到對方吃得到的地方，換來更大的利益。'],trade:['連環吃子','連續吃子與回吃，算清楚誰淨賺。'],quiet:['無聲的一手','看似平淡的一步，卻讓對方失去防守。'],misc:['得子手段','找出能多賺子力的最佳一步。']};
const CODE={1:'K',2:'A',3:'B',4:'N',5:'R',6:'C',7:'P'};
const pcsOf=b=>{const o=[];for(let i=0;i<90;i++){const v=b[i];if(!v)continue;const c=CODE[Math.abs(v)];o.push((v>0?c:c.toLowerCase())+sq2u(i))}return o.join(' ')};
const dmText=d=>d>=850?'淨賺一輛車的子力。':d>=420?'淨賺一個馬或炮的子力。':d>=200?'淨賺一個仕或相的子力。':'子力上佔到便宜。';
function pack(files,out){let all=[];for(const f of files)all=all.concat(JSON.parse(fs.readFileSync(f,'utf8')));
  const u2m=u=>X.move((9-Number(u[1]))*9+u.charCodeAt(0)-97,(9-Number(u[3]))*9+u.charCodeAt(2)-97);
  for(const x of all){const ml=x.line.map(u2m);Object.assign(x,classify(x.b,ml[0],ml));x.c0=x.cat;x.cat=({fork:'combo',disc:'combo',sac:'combo',misc:'quiet'})[x.cat]||x.cat}
  const seen=new Set(),items=[];
  for(const x of all.sort((a,b)=>b.dm-a.dm)){if(x.def)continue;const k=x.b.join();if(seen.has(k))continue;seen.add(k);
    const p={b:Int8Array.from(x.b),side:1,quiet:0};let ok=true;for(const u of x.line){const m=X.move((9-Number(u[1]))*9+u.charCodeAt(0)-97,(9-Number(u[3]))*9+u.charCodeAt(2)-97);if(!legal(p).includes(m)){ok=false;break}make(p,m)}
    if(ok)items.push(x)}
  const per={};const pick=[];for(const x of items){const c=x.cat;per[c]=per[c]||[];if(per[c].length<30){per[c].push(x);pick.push(x)}}
  const order=['free','up','chk','combo','trade','quiet'],res=[];
  for(const c of order){const arr=per[c]||[];arr.forEach((x,i)=>{const nameC=CATS[c][0],id='t_'+c+'_'+(i+1);
    const steps=[{u:x.line[0],y:1,q:'找出紅方最好的一步。',s:({chk:'將軍！黑方必須先應付，沒空顧其他的子。',fork:x.mover+'同時攻擊黑方兩個子，黑方只能救一個。',disc:x.mover+'一走開，後面的子露出來攻擊黑方，同時'+x.mover+'自己也有威脅。',sac:'把'+x.mover+'送到對方吃得到的位置，卻能換到更大的利益。',free:'這顆子沒有人保護，吃下去不會被回吃。',up:'用價值較低的子換掉對方更值錢的子，就算被回吃也賺。',trade:'先吃子，算準對方回吃之後還能再賺。',quiet:'看似平淡的一步，卻讓黑方的子無處可逃。',misc:'這一步先奪取優勢。'})[x.c0]},{u:x.line[1],s:'黑方的最佳應對。'}];
    if(x.line[2])steps.push({u:x.line[2],y:1,q:'再找出最好的一步，收下戰果。',s:dmText(x.dm),...(x.alts[2]&&x.alts[2].length?{alt:x.alts[2]}:{})});
    else steps[1].s='黑方的最佳應對；紅方已經佔到便宜：'+dmText(x.dm);
    res.push({id,sec:'mid',cat:c,t:nameC+' '+(i+1),d:CATS[c][1]+'請找出紅方最好的一步。',pcs:pcsOf(x.b),steps})})}
  const body='/* 中盤戰術題庫：由本站引擎自我對弈、固定深度搜尋篩出（tools/xiangqi_tactics_mine.cjs），紅方先行，每題只有一個明顯最好的第一步。 */\n(function(root){\n  const CATS='+JSON.stringify(Object.fromEntries(order.map(c=>[c,CATS[c][0]])))+';\n  const T='+JSON.stringify(res)+';\n  root.XiangqiTactics={cats:CATS,list:T};if(typeof module!=="undefined")module.exports=root.XiangqiTactics;\n})(typeof self!=="undefined"?self:globalThis);\n';
  fs.writeFileSync(out,body);console.log(Object.fromEntries(order.map(c=>[c,(per[c]||[]).length])),'共',res.length)}
if(cmd==='pack')pack(process.argv.slice(3,-1),process.argv.at(-1));
