/* 因式分解（國二）核心：整數係數多項式運算、逐列步驟模板、十字交乘檢查與考試批改。
   不使用浮點數比對；所有題目都由產生器隨機換數字。 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Factorization=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MINUS='−';

/* ---------- 整數多項式（陣列索引＝次方） ---------- */
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;}
function trim(p){const r=p.map(c=>c===0?0:c);while(r.length>1&&r[r.length-1]===0)r.pop();return r;}
function padd(a,b){const r=[];for(let i=0;i<Math.max(a.length,b.length);i++)r.push((a[i]||0)+(b[i]||0));return trim(r);}
function pscale(a,k){return trim(a.map(c=>c*k));}
function pmul(a,b){const r=new Array(a.length+b.length-1).fill(0);a.forEach((x,i)=>b.forEach((y,j)=>{r[i+j]+=x*y;}));return trim(r);}
function ppow(a,e){let r=[1];for(let i=0;i<e;i++)r=pmul(r,a);return r;}
function peq(a,b){a=trim(a);b=trim(b);return a.length===b.length&&a.every((x,i)=>x===b[i]);}
function pdeg(a){a=trim(a);return a.length===1&&a[0]===0?-1:a.length-1;}

/* ---------- 運算式樹：可同時渲染成題目、留空格的模板，並可代值驗算 ---------- */
const N=v=>({t:'num',v});
const V=name=>({t:'var',name});
const add=(...terms)=>({t:'add',terms});            // terms: [sign, node]，sign 0＝空格自帶正負號
const mul=(...f)=>({t:'mul',f});
const neg=n=>({t:'neg',n});
const par=(n,br='()')=>({t:'par',n,br});
const pow=(n,e)=>({t:'pow',n,e});
class Alloc{constructor(){this.answers=[];this.meta=[];}
 slot(value,signed=false,coef=false){const i=this.answers.length;this.answers.push(value);this.meta.push({signed,coef});return {t:'slot',i,signed,coef};}}

function builder(sa,v){
 const X=V(v);
 const xp=p=>p===0?null:(p===1?X:pow(X,p));
 function coefTerm(c,p,mode='fixed'){
  if(mode==='slotIfNot1')mode=Math.abs(c)===1?'fixed':'slot';
  const base=xp(p),a=Math.abs(c),sign=c<0?-1:1;
  if(mode==='fixed')return [sign,base?(a===1?base:mul(N(a),base)):N(a)];
  if(mode==='slot')return [sign,base?mul(sa.slot(a,false,true),base):sa.slot(a)];
  if(mode==='signed')return [0,base?mul(sa.slot(c,true,true),base):sa.slot(c,true,false)];
  throw Error('unknown mode '+mode);
 }
 const constTerm=(c,mode='fixed')=>coefTerm(c,0,mode);
 const lin=(a,b,am='fixed',bm='fixed',order='xb')=>{const t1=coefTerm(a,1,am),t2=constTerm(b,bm);return add(...(order==='xb'?[t1,t2]:[t2,t1]));};
 const quad=(A,B,C,modes=['fixed','fixed','fixed'])=>add(...[[A,2,modes[0]],[B,1,modes[1]],[C,0,modes[2]]].filter(([c])=>c!==0).map(([c,p,m])=>coefTerm(c,p,m)));
 return {X,coefTerm,constTerm,lin,quad,xp};
}

function evaluate(node,vals){
 switch(node.t){
  case 'num':return [node.v];
  case 'slot':return [vals[node.i]];
  case 'var':return [0,1];
  case 'add':return node.terms.reduce((acc,[s,n])=>padd(acc,pscale(evaluate(n,vals),s===0?1:s)),[0]);
  case 'mul':return node.f.reduce((acc,n)=>pmul(acc,evaluate(n,vals)),[1]);
  case 'neg':return pscale(evaluate(node.n,vals),-1);
  case 'par':return evaluate(node.n,vals);
  case 'pow':return ppow(evaluate(node.n,vals),node.e);
 }
 throw Error('bad node');
}
const leadSlot=n=>n.t==='slot'?n:(n.t==='mul'&&n.f[0].t==='slot'?n.f[0]:null);
function render(node,vals){
 switch(node.t){
  case 'num':return String(node.v);
  case 'slot':return vals?String(vals[node.i]).replace('-',MINUS):`{{${node.i}}}`;
  case 'var':return `<i>${node.name}</i>`;
  case 'add':return node.terms.map(([s,n],k)=>renderTerm(s,n,vals,k===0)).join('');
  case 'mul':return node.f.map((f,k)=>{
    let s;
    if(vals&&f.t==='slot'&&f.coef&&k<node.f.length-1){const v=vals[f.i];s=v===1?'':v===-1?MINUS:render(f,vals);}
    else s=render(f,vals);
    const prev=node.f[k-1];
    if(prev&&(f.t==='num'||f.t==='slot')&&(prev.t==='num'||prev.t==='slot'))s=' × '+s;
    return s;}).join('');
  case 'neg':return MINUS+render(node.n,vals);
  case 'par':{const [o,c]=node.br==='[]'?['[',']']:['(',')'];return o+render(node.n,vals)+c;}
  case 'pow':return render(node.n,vals)+`<sup>${node.e}</sup>`;
 }
 throw Error('bad node');
}
function renderTerm(s,n,vals,first){
 if(s===0){
  if(!vals)return (first?'':' ')+render(n,vals);
  const slot=leadSlot(n),v=vals[slot.i],copy=vals.slice();copy[slot.i]=Math.abs(v);
  return (first?(v<0?MINUS:''):(v<0?` ${MINUS} `:' + '))+render(n,copy);
 }
 return (first?(s<0?MINUS:''):(s<0?` ${MINUS} `:' + '))+render(n,vals);
}
const plain=html=>html.replace(/<i>(\w)<\/i>/g,'$1').replace(/<sup>(\d+)<\/sup>/g,'^$1').replace(/<[^>]+>/g,'').replace(/−/g,'-').replace(/\s+/g,'');

/* ---------- 列（步驟）的建構 ---------- */
function fillRow(label,hint,sa,build,extra={}){
 return {kind:'fill',label,hint,html:build(null),solved:build(sa.answers),answers:sa.answers.slice(),slots:sa.meta.slice(),alts:extra.alts||[sa.answers.slice()],eq:extra.eq||null,lead:extra.lead||null};
}
function eqRow(label,hint,sa,node,extra={}){
 const leadHTML=extra.lead?'＝ '+render(extra.lead,null)+'<br>':'';
 return fillRow(label,hint,sa,vals=>leadHTML+'＝ '+render(node,vals),{...extra,eq:node});
}
function choiceRow(label,hint,prompt,options,answer){return {kind:'choice',label,hint,html:prompt,options,answer,solved:(prompt?prompt+' ':'')+options[answer]};}
function crossRow(v,a,b,c,factors){
 const monic=a===1;const [[p,q],[r,s]]=factors;
 const term=(k)=>k===1?`<i>${v}</i>`:`${k}<i>${v}</i>`;
 const sg=n=>String(n).replace('-',MINUS);
 const solved=`十字交乘：${term(p)} 與 ${sg(q)}、${term(r)} 與 ${sg(s)}；交叉相乘相加 ${termB(p*s,v)} ${q*r<0?MINUS:'+'} ${termB(Math.abs(q*r),v)} ＝ ${termB(b,v)} ✓`;
 return {kind:'cross',monic,a,b,c,v,
  label:monic?`十字交乘：把末項 ${sg(c)} 拆成兩數，交叉相乘相加要等於 ${termB(b,v)}`:`十字交乘：拆首項 ${a}<i>${v}</i><sup>2</sup>、拆末項 ${sg(c)}，交叉相乘相加要等於 ${termB(b,v)}`,
  hint:monic?(c>0?`兩數相乘得 ${c}（同號），相加得 ${b}；同號時符號跟一次項相同。`:`兩數相乘得 ${sg(c)}（異號），相加得 ${sg(b)}；絕對值大的那個跟一次項同號。`)
       :`先列出 ${a} 的因數組（左邊直行）與 ${sg(c)} 的因數組（右邊直行），交叉相乘相加試出 ${termB(b,v)}。`,
  answers:monic?[q,s]:[p,q,r,s],solved};
}
function termB(b,v){return (b===1?'':b===-1?MINUS:String(b).replace('-',MINUS))+`<i>${v}</i>`;}
function checkCross(row,vals){
 if(vals.some(x=>!Number.isInteger(x)))return {ok:false,message:'請先填完十字圖的每一格。'};
 const [L1,R1,L2,R2]=row.monic?[1,vals[0],1,vals[1]]:vals;
 if(L1<=0||L2<=0)return {ok:false,message:'左邊直行放首項的因數，請用正數。'};
 if(L1*L2!==row.a)return {ok:false,message:`左邊直行相乘要等於首項係數 ${row.a}。`};
 if(R1*R2!==row.c)return {ok:false,message:`右邊直行相乘要等於末項 ${String(row.c).replace('-',MINUS)}。`};
 const cross=L1*R2+L2*R1;
 if(cross!==row.b){
  if(cross===-row.b)return {ok:false,message:'交叉相乘相加的大小對了，但正負號相反；把右邊兩數都變號試試。'};
  return {ok:false,message:`交叉相乘相加得 ${String(cross).replace('-',MINUS)}${row.v}，需要 ${String(row.b).replace('-',MINUS)}${row.v}，換一組因數試試。`};
 }
 return {ok:true,cross};
}
function parseSlot(raw,meta){
 const s=String(raw??'').trim().replace(/[−－–]/g,'-').replace(/＋/g,'+');
 if(meta.coef&&meta.signed&&(s==='-'||s==='+'))return s==='-'?-1:1;
 if(!/^[+-]?\d{1,4}$/.test(s))return null;
 return Number(s);
}
function checkFill(row,raws){
 const values=raws.map((r,i)=>parseSlot(r,row.slots[i]));
 let best=null,bestHits=-1;
 for(const alt of row.alts){const hits=alt.map((a,i)=>values[i]===a);const n=hits.filter(Boolean).length;if(n>bestHits){bestHits=n;best=hits;}}
 return {ok:bestHits===row.answers.length,perSlot:best,values};
}

/* ---------- 最後答案的標準形：負號提最前、括號內 x 係數為正 ---------- */
function sortFactors(fs){return fs.slice().sort((x,y)=>x[0]-y[0]||Math.abs(x[1])-Math.abs(y[1])||x[1]-y[1]);}
function answerNode(ans,v){
 const b=builder(new Alloc(),v),parts=[];
 if(ans.k!==1)parts.push(N(ans.k));
 if(ans.mono)parts.push(ans.mono===1?b.X:pow(b.X,ans.mono));
 const groups=[];ans.factors.forEach(([a,c])=>{const g=groups.find(q=>q.a===a&&q.c===c);if(g)g.e++;else groups.push({a,c,e:1});});
 groups.forEach(g=>{const p=par(b.lin(g.a,g.c));parts.push(g.e>1?pow(p,g.e):p);});
 const body=parts.length===1?parts[0]:mul(...parts);
 return ans.sign<0?neg(body):body;
}

/* ---------- 題型 ---------- */
const TOPICS=[
 {id:'common',short:'提公因式',title:'利用提公因式做因式分解',ref:'講義主題 3：熟練 4、熟練 5',tip:'每一項都有的因式（數字、x 或整個括號）先提出來；括號只差一個負號時，先變號。'},
 {id:'diffsq',short:'平方差',title:'利用平方差公式做因式分解',ref:'講義主題 4：熟練 6、熟練 7',tip:'兩項相減、而且都是平方：a² − b² ＝ (a + b)(a − b)。括號可以整個看成 a。'},
 {id:'perfect',short:'完全平方',title:'利用和、差的平方公式做因式分解',ref:'講義主題 4：熟練 8、熟練 9',tip:'首末兩項是平方，中間項剛好是 2 × 首 × 末，就能寫成 (a ± b)²。'},
 {id:'cross',short:'十字交乘',title:'十字交乘法',ref:'十字交乘主題 1、主題 2：熟練 1～4',tip:'直的相乘得首項與末項，交叉相乘相加得中間項。'},
 {id:'mixed',short:'綜合應用',title:'十字交乘綜合應用',ref:'十字交乘主題 3：熟練 5、熟練 6',tip:'首項是負的先提出負號；三個係數有公因數先提出來，再十字交乘。'}
];
const MOVES=[
 {id:'common',label:'提公因式'},
 {id:'sign',label:'變號再提公因式'},
 {id:'diffsq',label:'平方差公式'},
 {id:'sumsq',label:'和的平方公式'},
 {id:'diffsqr',label:'差的平方公式'},
 {id:'cross',label:'十字交乘法'},
 {id:'neg',label:'先提出負號'}
];
const REF={
 common:'提公因式：ma ＋ mb ＝ m(a ＋ b)',
 sign:'變號：(b − a) ＝ −(a − b)；偶次方 (b − a)² ＝ (a − b)²',
 diffsq:'平方差：a² − b² ＝ (a ＋ b)(a − b)',
 sum:'和的平方：a² ＋ 2ab ＋ b² ＝ (a ＋ b)²',
 diff:'差的平方：a² − 2ab ＋ b² ＝ (a − b)²',
 cross:'十字交乘：直的相乘得首項、末項；交叉相乘相加得中間項',
 negLead:'先提出負號：−(x² …)，括號裡首項係數變成 1，再十字交乘',
 gcdFirst:'先提出三個係數的最大公因數，數字變小再十字交乘'
};

const ri=(rng,lo,hi)=>lo+Math.floor(rng()*(hi-lo+1));
const pick=(rng,a)=>a[Math.floor(rng()*a.length)];
const nz=(rng,lo,hi)=>{let v;do v=ri(rng,lo,hi);while(v===0);return v;};
const sgn=n=>String(n).replace('-',MINUS);

function finish(q){
 q.prompt=render(q.promptNode,null);
 q.target=evaluate(q.promptNode,[]);
 q.answerNode=answerNode(q.answer,q.v);
 q.answerHTML=render(q.answerNode,null);
 q.answerText=plain(q.answerHTML);
 q.solution=q.rows.map(r=>r.solved).join('<br>');
 return q;
}

function genMono(rng){
 const v='x';
 for(;;){
  const g=ri(rng,2,9),m=ri(rng,1,5),n=nz(rng,-9,9);
  if(gcd(m,n)!==1)continue;
  const order=rng()<0.65?'x2':'x1';
  if(order==='x1'&&n<0)continue;
  const b0=builder(new Alloc(),v);
  const promptNode=order==='x2'?add(b0.coefTerm(g*m,2),b0.coefTerm(g*n,1)):add(b0.coefTerm(g*n,1),b0.coefTerm(-g*m,2));
  const rows=[];
  {const sa=new Alloc(),b=builder(sa,v);const node=mul(sa.slot(g),b.X);
   rows.push(fillRow('找出各項的公因式','數字取各項係數的最大公因數，x 取最低的次方。',sa,vals=>'各項的公因式：'+render(node,vals)));}
  if(order==='x2'){
   const sa=new Alloc(),b=builder(sa,v);
   rows.push(eqRow('提出公因式','每一項除以公因式，剩下的放進括號。',sa,mul(N(g),b.X,par(b.lin(m,n,'slotIfNot1','signed')))));
  }else{
   {const sa=new Alloc(),b=builder(sa,v);
    rows.push(eqRow('提出公因式','每一項除以公因式，剩下的放進括號；x 項的係數是負的。',sa,mul(N(g),b.X,par(add(b.constTerm(n,'slot'),b.coefTerm(-m,1,'signed'))))));}
   {const sa=new Alloc(),b=builder(sa,v);
    rows.push(eqRow('負號提到最前面','括號內 x 係數要為正：(a − bx) ＝ −(bx − a)。',sa,neg(mul(N(g),b.X,par(b.lin(m,-n,'slotIfNot1','slot'))))));}
  }
  return {v,promptNode,rows,answer:order==='x2'?{sign:1,k:g,mono:1,factors:[[m,n]]}:{sign:-1,k:g,mono:1,factors:[[m,-n]]},
   moves:['common'],reason:`每一項都有 ${g}<i>x</i>，先把公因式提出來。`,reference:REF.common};
 }
}

function genBinomial(rng){
 const v='x';
 for(;;){
  const pattern=pick(rng,['A','A','B','C']);
  const k=ri(rng,2,7),m1=pick(rng,[1,1,2]),m2=ri(rng,1,4),s=rng()<0.7?1:-1;
  if(gcd(m1,m2)!==1||(m1===1&&m2===1&&pattern!=='B'))continue;
  const f=nz(rng,-7,7);
  const G1=[ri(rng,1,2),nz(rng,-9,9)],G2=[ri(rng,1,2),nz(rng,-9,9)];
  if(gcd(...G1)!==1||gcd(...G2)!==1)continue;
  if(pattern!=='B'&&(G1[0]===G2[0]&&G1[1]===G2[1]))continue;
  if(pattern==='A'&&((G1[0]===1&&G1[1]===f)||(G2[0]===1&&G2[1]===f)))continue;
  let p,q;
  if(pattern==='B'){p=m1;q=m1*f+s*m2;}else{p=m1*G1[0]+s*m2*G2[0];q=m1*G1[1]+s*m2*G2[1];}
  if(p<=0||q===0)continue;
  const d=gcd(p,q),K=k*d;
  const b0=builder(new Alloc(),v);
  const F=pattern==='C'?b0.X:par(b0.lin(1,f));
  const g1=par(b0.lin(...G1)),g2=par(b0.lin(...G2));
  const promptNode=pattern==='B'
   ?add([1,mul(N(k*m1),pow(F,2))],[s,mul(N(k*m2),F)])
   :add([1,mul(N(k*m1),F,g1)],[s,mul(N(k*m2),F,g2)]);
  const Ftext=render(F,null);
  const rows=[];
  {const sa=new Alloc();const node=mul(sa.slot(k),F);
   rows.push(fillRow('找出共同的因式',`數字取 ${k*m1} 與 ${k*m2} 的最大公因數，再找每一項都有的 ${Ftext}。`,sa,vals=>'共同的因式：'+render(node,vals)));}
  {const sa=new Alloc();
   const tA=pattern==='B'?[1,m1===1?F:mul(sa.slot(m1),F)]:[1,m1===1?g1:mul(sa.slot(m1),g1)];
   const tB=pattern==='B'?[s,sa.slot(m2)]:[s,m2===1?g2:mul(sa.slot(m2),g2)];
   rows.push(eqRow('提出公因式',`每一項除以 ${k}${Ftext}，剩下的放進中括號。`,sa,mul(N(k),F,par(add(tA,tB),'[]'))));}
  {const sa=new Alloc(),b=builder(sa,v);
   rows.push(eqRow('中括號內化簡','把中括號展開，合併同類項。',sa,mul(N(k),F,par(b.lin(p,q,'slotIfNot1','signed')))));}
  if(d>1){const sa=new Alloc(),b=builder(sa,v);
   rows.push(eqRow('再檢查：括號裡還能提公因數',`${p}<i>x</i> 和 ${sgn(q)} 還有公因數 ${d}，提出來和前面的 ${k} 相乘。`,sa,mul(sa.slot(K),F,par(b.lin(p/d,q/d,'slotIfNot1','signed')))));}
  const answer=pattern==='C'?{sign:1,k:K,mono:1,factors:[[p/d,q/d]]}:{sign:1,k:K,mono:0,factors:[[1,f],[p/d,q/d]]};
  return {v,promptNode,rows,answer,moves:['common'],reason:`每一項都有 ${k}${Ftext}，把它整個當成公因式提出來。`,reference:REF.common};
 }
}

function genSign(rng){
 const v='x';
 for(;;){
  const u=pick(rng,[1,1,2,3]),w=ri(rng,1,8);if(gcd(u,w)!==1)continue;
  const pat=pick(rng,['P1','P2','P3','P4','P5']),s=rng()<0.5?1:-1;
  const G1=[ri(rng,1,4),nz(rng,-9,9)],G2=[ri(rng,1,4),nz(rng,-9,9)];
  if(gcd(...G1)!==1||gcd(...G2)!==1)continue;
  if((G1[0]===u&&G1[1]===-w)||(G2[0]===u&&G2[1]===-w))continue;
  const T={P1:[{s:1,fp:false,e:1,G:G1},{s,fp:true,e:1,G:G2}],
   P2:[{s:1,fp:false,e:2},{s,fp:true,e:1,G:G2}],
   P3:[{s:1,fp:false,e:1,G:G1},{s,fp:true,e:2}],
   P4:[{s:1,fp:true,e:1,G:G1},{s,fp:false,e:1,G:G2,gFirst:true}],
   P5:[{s:1,fp:true,e:2},{s,fp:false,e:1,G:G2,gFirst:true}]}[pat];
  const Fc=[u,-w];
  let p=0,q=0;
  T.forEach(t=>{t.c=t.s*(t.fp&&t.e===1?-1:1);const rest=t.e===2?Fc:t.G;p+=t.c*rest[0];q+=t.c*rest[1];});
  if(p===0||q===0||gcd(p,q)!==1)continue;
  if(T.every(t=>t.e===1)&&T[0].G[0]===T[1].G[0]&&T[0].G[1]===T[1].G[1])continue;
  const b0=builder(new Alloc(),v);
  const F=par(b0.lin(u,-w)),Fp=par(b0.lin(-u,w,'fixed','fixed','bx'));
  const gnode=G=>par(b0.lin(...G));
  const termNode=(t,useF)=>{const base=(t.fp&&!useF)?Fp:F;if(t.e===2)return pow(base,2);return t.gFirst?mul(gnode(t.G),base):mul(base,gnode(t.G));};
  const promptNode=add(...T.map(t=>[t.s,termNode(t,false)]));
  const fpTerm=T.find(t=>t.fp);
  const rows=[];
  const Fh=render(F,null),Fph=render(Fp,null);
  if(fpTerm.e===1)rows.push(choiceRow('變號：讓括號長得一樣',`(b − a) ＝ −(a − b)：前後對調要多一個負號。`,`${Fph} ＝ ？`,[Fh,MINUS+Fh],1));
  else rows.push(choiceRow('變號：讓括號長得一樣',`偶次方：(b − a)² ＝ (a − b)²，負號會消失。`,`${Fph}<sup>2</sup> ＝ ？`,[Fh+'<sup>2</sup>',MINUS+Fh+'<sup>2</sup>'],0));
  const rewrite=flip=>'＝ '+render(add(...T.map(t=>[t.fp&&flip?-(t.c):t.c,termNode(t,true)])),null);
  const correctFirst=rng()<0.5;
  rows.push(choiceRow('改寫原式','只有變號的那一項會改變正負，其他照抄。','',correctFirst?[rewrite(false),rewrite(true)]:[rewrite(true),rewrite(false)],correctFirst?0:1));
  {const sa=new Alloc(),b=builder(sa,v);
   const restNode=t=>t.e===2?F:gnode(t.G);
   const lead=mul(F,par(add(...T.map(t=>[t.c,restNode(t)])),'[]'));
   rows.push(eqRow('提出公因式，再化簡中括號',`提出 ${Fh} 後，把中括號展開、合併同類項（x 的係數也要填，1 就填 1）。`,sa,mul(F,par(b.lin(p,q,'signed','signed'))),{lead}));}
  if(p<0){const sa=new Alloc(),b=builder(sa,v);
   rows.push(eqRow('負號提到最前面','括號內 x 係數要為正，把負號提到最前面。',sa,neg(mul(F,par(b.lin(-p,-q,'slotIfNot1','signed'))))));}
  const answer=p>0?{sign:1,k:1,mono:0,factors:[[u,-w],[p,q]]}:{sign:-1,k:1,mono:0,factors:[[u,-w],[-p,-q]]};
  return {v,promptNode,rows,answer,moves:['sign'],reason:`${Fph} 和 ${Fh} 只差一個負號，先變號才看得出公因式。`,reference:REF.sign};
 }
}

function genDiffBasic(rng){
 for(;;){
  const v=rng()<0.2?'y':'x',m=ri(rng,1,12),n=ri(rng,1,13);
  if(gcd(m,n)!==1||(m===1&&n===1))continue;
  const order=rng()<0.7?'sq':'const';
  const b0=builder(new Alloc(),v);
  const promptNode=order==='sq'?add(b0.coefTerm(m*m,2),b0.constTerm(-n*n)):add(b0.constTerm(n*n),b0.coefTerm(-m*m,2));
  const rows=[];
  const mxSq=(sa,b)=>m===1?pow(b.X,2):pow(par(mul(sa.slot(m,false,true),b.X)),2);
  if(order==='sq'){
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('寫成平方相減',`${m*m}<i>${v}</i><sup>2</sup> 和 ${n*n} 各是誰的平方？`,sa,add([1,mxSq(sa,b)],[-1,pow(sa.slot(n),2)])));}
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('套用平方差公式','a² − b² ＝ (a + b)(a − b)',sa,mul(par(b.lin(m,n,'slotIfNot1','slot')),par(b.lin(m,-n,'slotIfNot1','slot')))));}
  }else{
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('寫成平方相減',`${n*n} 和 ${m*m}<i>${v}</i><sup>2</sup> 各是誰的平方？`,sa,add([1,pow(sa.slot(n),2)],[-1,mxSq(sa,b)])));}
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('套用平方差公式','a² − b² ＝ (a + b)(a − b)，這裡 a 是常數。',sa,mul(par(add(b.constTerm(n,'slot'),b.coefTerm(m,1,'slotIfNot1'))),par(add(b.constTerm(n,'slot'),b.coefTerm(-m,1,'slotIfNot1'))))));}
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('負號提到最前面',`(${n} − ${m===1?'':m}${v}) ＝ −(${m===1?'':m}${v} − ${n})，括號內 ${v} 係數要為正。`,sa,neg(mul(par(b.lin(m,n,'slotIfNot1','slot')),par(b.lin(m,-n,'slotIfNot1','slot'))))));}
  }
  const answer=order==='sq'?{sign:1,k:1,mono:0,factors:[[m,-n],[m,n]].sort((a,b)=>b[1]-a[1])}:{sign:-1,k:1,mono:0,factors:[[m,n],[m,-n]]};
  return {v,promptNode,rows,answer,moves:['diffsq'],reason:'只有兩項、中間相減，而且兩項都是平方：用平方差公式。',reference:REF.diffsq};
 }
}

function genDiffGroup(rng){
 const v='x';
 for(;;){
  const p=pick(rng,[1,1,2,3]),q=nz(rng,-9,9),n=ri(rng,1,15);
  if(gcd(p,q)!==1||n===Math.abs(q))continue;
  const pat=pick(rng,['G1','G1','G2','G3']);
  const b0=builder(new Alloc(),v);const L=par(b0.lin(p,q));const Lh=render(L,null);
  const rows=[];let promptNode,answer;
  if(pat==='G1'){
   const c1=q+n,c2=q-n;if(c1===0||c2===0)continue;
   const d1=gcd(p,c1),d2=gcd(p,c2);
   promptNode=add([1,pow(L,2)],b0.constTerm(-n*n));
   {const sa=new Alloc();rows.push(eqRow('看成平方相減',`把 ${Lh} 看成一個整體 a，${n*n} 是誰的平方？`,sa,add([1,pow(L,2)],[-1,pow(sa.slot(n),2)])));}
   {const sa=new Alloc();rows.push(eqRow('套用平方差公式','a² − b² ＝ (a + b)(a − b)，a 整個帶著括號。',sa,mul(par(add([1,L],[1,sa.slot(n)]),'[]'),par(add([1,L],[-1,sa.slot(n)]),'[]'))));}
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('去括號整理','中括號裡的常數合併。',sa,mul(par(b.lin(p,c1,'fixed','signed')),par(b.lin(p,c2,'fixed','signed')))));}
   if(d1>1||d2>1){const sa=new Alloc(),b=builder(sa,v);
    rows.push(eqRow('再提出公因數','括號裡的係數還有公因數，提出來放到最前面。',sa,mul(sa.slot(d1*d2),par(b.lin(p/d1,c1/d1,'slotIfNot1','signed')),par(b.lin(p/d2,c2/d2,'slotIfNot1','signed')))));}
   answer={sign:1,k:d1*d2,mono:0,factors:[[p/d1,c1/d1],[p/d2,c2/d2]]};
  }else{
   const c1=n+q,c2=n-q;if(c1===0||c2===0||gcd(p,c1)!==1||gcd(p,c2)!==1)continue;
   promptNode=pat==='G2'?add([-1,pow(L,2)],b0.constTerm(n*n)):add(b0.constTerm(n*n),[-1,pow(L,2)]);
   {const sa=new Alloc();rows.push(eqRow(pat==='G2'?'交換位置，寫成平方相減':'看成平方相減',pat==='G2'?'正的那項放前面：−A + B ＝ B − A。':`把 ${Lh} 看成一個整體，${n*n} 是誰的平方？`,sa,add([1,pow(sa.slot(n),2)],[-1,pow(L,2)])));}
   {const sa=new Alloc();rows.push(eqRow('套用平方差公式','a² − b² ＝ (a + b)(a − b)，b 整個帶著括號。',sa,mul(par(add([1,sa.slot(n)],[1,L]),'[]'),par(add([1,sa.slot(n)],[-1,L]),'[]'))));}
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('去括號整理','第二個中括號前面是減號，括號內每一項都要變號。',sa,mul(par(b.lin(p,c1,'fixed','signed')),par(add(b.constTerm(c2,'signed'),b.coefTerm(-p,1,'fixed'))))));}
   {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('負號提到最前面','括號內 x 係數要為正，把負號提到最前面。',sa,neg(mul(par(b.lin(p,c1,'fixed','signed')),par(b.lin(p,-c2,'fixed','signed'))))));}
   answer={sign:-1,k:1,mono:0,factors:[[p,c1],[p,-c2]]};
  }
  return {v,promptNode,rows,answer,moves:pat==='G2'?['diffsq','neg']:['diffsq'],reason:`把 ${Lh} 整個看成 a，題目就是「平方減平方」。`,reference:REF.diffsq};
 }
}

function genPerfect(rng,sigma){
 const v='x';
 for(;;){
  const m=ri(rng,1,6),n=ri(rng,1,9);if(gcd(m,n)!==1||(m===1&&n===1&&rng()<0.8))continue;
  const b0=builder(new Alloc(),v);
  const promptNode=b0.quad(m*m,2*sigma*m*n,n*n);
  const rows=[];
  {const sa=new Alloc(),b=builder(sa,v);
   const first=m===1?pow(b.X,2):pow(par(mul(sa.slot(m,false,true),b.X)),2),last=pow(sa.slot(n),2);
   const firstFixed=render(add(b0.coefTerm(m*m,2)),null);
   rows.push(fillRow('檢查首末項是不是平方','首項、末項各是誰的平方？',sa,vals=>`首項 ${firstFixed} ＝ ${render(first,vals)}，末項 ${n*n} ＝ ${render(last,vals)}`));}
  {const sa=new Alloc(),b=builder(sa,v);
   const mx=render(add(b0.coefTerm(m,1)),null),node=mul(sa.slot(2*m*n,false,true),b.X);
   rows.push(fillRow('驗算中間項',`中間項（先不看正負）要剛好是 2 × 首 × 末。${sigma<0?'中間項是負的，所以用差的平方。':''}`,sa,vals=>`2 × ${mx} × ${n} ＝ ${render(node,vals)} ✓`));}
  {const sa=new Alloc(),b=builder(sa,v);
   rows.push(eqRow(sigma>0?'寫成和的平方':'寫成差的平方',sigma>0?'a² + 2ab + b² ＝ (a + b)²':'a² − 2ab + b² ＝ (a − b)²',sa,pow(par(b.lin(m,sigma*n,'slotIfNot1','slot')),2)));}
  return {v,promptNode,rows,answer:{sign:1,k:1,mono:0,factors:[[m,sigma*n],[m,sigma*n]]},
   moves:[sigma>0?'sumsq':'diffsqr','cross'],reason:`首末項是平方、中間項是 2 × 首 × 末：用${sigma>0?'和':'差'}的平方最快（十字交乘也做得出來）。`,reference:sigma>0?REF.sum:REF.diff};
 }
}

/* 十字交乘：先得到兩個一次因式，再出題 */
function crossFactors(rng,kind){
 for(;;){
  if(kind==='monicPos'||kind==='monicNeg'){
   const a=nz(rng,-12,12),b=nz(rng,-12,12);
   if(a===b||a+b===0)continue;
   if(kind==='monicPos'&&a*b<0)continue;
   if(kind==='monicNeg'&&a*b>0)continue;
   if(Math.abs(a*b)>84)continue;
   return sortFactors([[1,a],[1,b]]);
  }
  const p=ri(rng,1,6),r=ri(rng,1,6);if(p*r===1||p*r>30)continue;
  const q=nz(rng,-9,9),s=nz(rng,-9,9);
  if(gcd(p,q)!==1||gcd(r,s)!==1)continue;
  if(kind==='generalPos'&&q*s<0)continue;
  if(kind==='generalNeg'&&q*s>0)continue;
  if(p*s+q*r===0)continue;
  return sortFactors([[p,q],[r,s]]);
 }
}
const expandFactors=fs=>fs.reduce((acc,[a,c])=>pmul(acc,[c,a]),[1]);
function finalPairRow(v,fs,wrap){
 const sa=new Alloc(),b=builder(sa,v),monic=fs.every(f=>f[0]===1);
 const fnode=f=>par(monic?b.lin(1,f[1],'fixed','signed'):b.lin(f[0],f[1],'slot','signed'));
 const node=wrap(mul(fnode(fs[0]),fnode(fs[1])));
 const ans=sa.answers.slice(),half=ans.length/2,swapped=[...ans.slice(half),...ans.slice(0,half)];
 return eqRow('寫出因式分解的結果',monic?'十字圖的每一橫列就是一個因式。':'十字圖的每一橫列就是一個因式（係數是 1 也要填 1）。',sa,node,{alts:[ans,swapped]});
}
function genCross(rng,kind){
 const v='x',fs=crossFactors(rng,kind),[A,B,C]=[...expandFactors(fs)].reverse();
 const promptNode=builder(new Alloc(),v).quad(A,B,C);
 const rows=[crossRow(v,A,B,C,fs),finalPairRow(v,fs,n=>n)];
 const square=fs[0][0]===fs[1][0]&&fs[0][1]===fs[1][1];
 const moves=['cross'];if(square)moves.push(fs[0][1]>0?'sumsq':'diffsqr');
 return {v,promptNode,rows,answer:{sign:1,k:1,mono:0,factors:fs},moves,reason:'三項的二次式、看不出公式：用十字交乘，直的相乘得首末項，交叉相乘相加得中間項。',reference:REF.cross};
}
function genNegLead(rng){
 const v='x',fs=crossFactors(rng,rng()<0.5?'monicPos':'monicNeg'),[A,B,C]=[...expandFactors(fs)].reverse();
 const promptNode=builder(new Alloc(),v).quad(-A,-B,-C);
 const rows=[];
 {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('先提出負號','每一項都變號放進括號，括號內首項係數變成 1。',sa,neg(par(add([1,pow(b.X,2)],b.coefTerm(B,1,'signed'),b.constTerm(C,'signed'))))));}
 rows.push(crossRow(v,A,B,C,fs));
 rows.push(finalPairRow(v,fs,n=>neg(n)));
 return {v,promptNode,rows,answer:{sign:-1,k:1,mono:0,factors:fs},moves:['neg'],reason:'首項係數是負的，先提出負號，括號裡再十字交乘。',reference:REF.negLead};
}
function genGcdFirst(rng){
 const v='x',k=ri(rng,2,9),fs=crossFactors(rng,pick(rng,['monicPos','monicNeg','generalPos','generalNeg']));
 const [A,B,C]=[...expandFactors(fs)].reverse();
 if(A*k>60||Math.abs(B*k)>99||Math.abs(C*k)>99)return genGcdFirst(rng);
 const promptNode=builder(new Alloc(),v).quad(k*A,k*B,k*C);
 const rows=[];
 {const sa=new Alloc(),b=builder(sa,v);rows.push(eqRow('先提出係數的公因數',`${k*A}、${sgn(k*B)}、${sgn(k*C)} 的最大公因數是多少？`,sa,mul(sa.slot(k),par(add(b.coefTerm(A,2,'slotIfNot1'),b.coefTerm(B,1,'signed'),b.constTerm(C,'signed'))))));}
 rows.push(crossRow(v,A,B,C,fs));
 rows.push(finalPairRow(v,fs,n=>mul(N(k),...n.f)));
 return {v,promptNode,rows,answer:{sign:1,k,mono:0,factors:fs},moves:['common'],reason:`三個係數都有公因數 ${k}，先提出來，數字變小再十字交乘。`,reference:REF.gcdFirst};
}

const VARIANTS=[
 {id:'mono',topic:'common',title:'提出單項公因式',gen:genMono},
 {id:'binomial',topic:'common',title:'提出多項式公因式',gen:genBinomial},
 {id:'sign',topic:'common',title:'變號再提公因式',gen:genSign},
 {id:'diffBasic',topic:'diffsq',title:'平方差（基本型）',gen:genDiffBasic},
 {id:'diffGroup',topic:'diffsq',title:'平方差（整個括號看成一個數）',gen:genDiffGroup},
 {id:'perfectSum',topic:'perfect',title:'和的平方',gen:r=>genPerfect(r,1)},
 {id:'perfectDiff',topic:'perfect',title:'差的平方',gen:r=>genPerfect(r,-1)},
 {id:'monicPos',topic:'cross',title:'首項係數 1、末項為正',gen:r=>genCross(r,'monicPos')},
 {id:'monicNeg',topic:'cross',title:'首項係數 1、末項為負',gen:r=>genCross(r,'monicNeg')},
 {id:'generalPos',topic:'cross',title:'首項係數不為 1、末項為正',gen:r=>genCross(r,'generalPos')},
 {id:'generalNeg',topic:'cross',title:'首項係數不為 1、末項為負',gen:r=>genCross(r,'generalNeg')},
 {id:'negLead',topic:'mixed',title:'首項係數為負',gen:genNegLead},
 {id:'gcdFirst',topic:'mixed',title:'先提係數的公因數',gen:genGcdFirst}
];
let serial=0;
function makeQuestion(variantId,rng=Math.random){
 const variant=VARIANTS.find(x=>x.id===variantId);if(!variant)throw Error('unknown variant '+variantId);
 const topic=TOPICS.find(t=>t.id===variant.topic);
 const q=variant.gen(rng);
 Object.assign(q,{id:`${variant.id}-${++serial}`,variant:variant.id,variantTitle:variant.title,kind:topic.id,topicTitle:topic.short});
 return finish(q);
}
function variantsOf(topic){return VARIANTS.filter(x=>topic==='all'||x.topic===topic);}
function shuffled(items,rng=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function examVariantList(topic,count=10,rng=Math.random){
 const list=[];
 if(topic==='all'){TOPICS.forEach(t=>{const vs=shuffled(variantsOf(t.id),rng);list.push(vs[0].id,vs[1%vs.length].id);});}
 else{const vs=variantsOf(topic);while(list.length<count)shuffled(vs,rng).forEach(x=>{if(list.length<count)list.push(x.id);});}
 return shuffled(list.slice(0,count),rng);
}
function judgeVariantList(count=10,rng=Math.random){
 const all=VARIANTS.map(x=>x.id),list=[];
 while(list.length<count)shuffled(all,rng).forEach(id=>{if(list.length<count)list.push(id);});
 return list;
}

/* ---------- 考試：解析學生寫的因式分解 ---------- */
function normalizeInput(s){
 return String(s||'').replace(/[−－﹣–]/g,'-').replace(/＋/g,'+').replace(/[×·＊]/g,'*').replace(/[［\[｛{（]/g,'(').replace(/[］\]｝}）]/g,')')
  .replace(/²/g,'^2').replace(/³/g,'^3').replace(/\s+/g,'').toLowerCase();
}
function tokenize(s){
 const t=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/\d/.test(ch)){let j=i;while(j<s.length&&/\d/.test(s[j]))j++;t.push({k:'num',v:Number(s.slice(i,j))});i=j;}
  else if(/[a-z]/.test(ch)){t.push({k:'var',v:ch});i++;}
  else if('+-*^()'.includes(ch)){t.push({k:ch});i++;}
  else throw Error(`看不懂「${ch}」`);
 }
 return t;
}
function parseTokens(tokens){
 let i=0;const peek=()=>tokens[i],eat=k=>{if(tokens[i]&&tokens[i].k===k){i++;return true;}return false;};
 function expr(){const terms=[];let sign=1;if(eat('-'))sign=-1;else eat('+');terms.push({sign,term:term()});
  while(peek()&&(peek().k==='+'||peek().k==='-')){const s=tokens[i++].k==='+'?1:-1;terms.push({sign:s,term:term()});}
  return {type:'sum',terms};}
 function term(){const factors=[factor()];while(peek()&&['*','num','var','('].includes(peek().k)){eat('*');factors.push(factor());}return {type:'prod',factors};}
 function factor(){const base=primary();let exp=1;if(eat('^')){const t=tokens[i++];if(!t||t.k!=='num')throw Error('次方後面要接數字');exp=t.v;if(exp<1||exp>6)throw Error('次方太大了');}return {base,exp};}
 function primary(){const t=tokens[i++];if(!t)throw Error('式子還沒打完');
  if(t.k==='num')return {type:'num',v:t.v};if(t.k==='var')return {type:'var',v:t.v};
  if(t.k==='('){const e=expr();if(!eat(')'))throw Error('括號沒有配對好');return {type:'group',expr:e};}
  throw Error('式子格式不正確');}
 const e=expr();if(i!==tokens.length)throw Error(tokens[i].k===')'?'括號沒有配對好':'式子格式不正確');return e;
}
function evalAst(node,v){
 if(node.type==='sum')return node.terms.reduce((acc,{sign,term})=>padd(acc,pscale(evalAst(term,v),sign)),[0]);
 if(node.type==='prod')return node.factors.reduce((acc,f)=>pmul(acc,ppow(evalBase(f.base,v),f.exp)),[1]);
 throw Error('bad ast');
}
function evalBase(b,v){if(b.type==='num')return [b.v];if(b.type==='var'){if(b.v!==v)throw Error(`這題的變數是 ${v}，不是 ${b.v}`);return [0,1];}return evalAst(b.expr,v);}
function parseAnswer(raw,v){
 try{const tokens=tokenize(normalizeInput(raw));if(!tokens.length)return {ok:false,error:'未作答'};const ast=parseTokens(tokens);return {ok:true,ast,poly:evalAst(ast,v)};}
 catch(e){return {ok:false,error:e.message};}
}
const hasGroup=node=>node.type==='sum'?node.terms.some(t=>hasGroup(t.term)):node.factors.some(f=>f.base.type==='group');
function factoredIssue(ast,v){
 if(ast.terms.length!==1)return '還不是乘積的形式：最外層不能有加減。';
 for(const f of ast.terms[0].term.factors){
  if(f.base.type!=='group')continue;
  if(hasGroup(f.base.expr))return '括號裡面還沒整理完。';
  const g=evalAst(f.base.expr,v),d=pdeg(g);
  if(d>=2)return '括號裡還是二次式，還能再分解。';
  if(d===1){const nzc=g.filter(c=>c!==0);if(nzc.length>1&&nzc.reduce((a,c)=>gcd(a,c))>1)return '括號裡還有公因數，要再提出來。';}
 }
 return null;
}
function gradeAnswer(raw,q){
 const text=String(raw||'').trim();if(!text)return {kind:'empty',message:'未作答'};
 const parsed=parseAnswer(text,q.v);if(!parsed.ok)return {kind:'invalid',message:parsed.error};
 if(!peq(parsed.poly,q.target))return {kind:'wrong',message:'展開後和原式不相等'};
 const issue=factoredIssue(parsed.ast,q.v);if(issue)return {kind:'incomplete',message:issue};
 return {kind:'correct',message:'答對'};
}
function astHTML(node){
 if(node.type==='sum')return node.terms.map(({sign,term},k)=>(k===0?(sign<0?MINUS:''):(sign<0?` ${MINUS} `:' + '))+astHTML(term)).join('');
 return node.factors.map((f,k)=>{let s=f.base.type==='num'?String(f.base.v):f.base.type==='var'?`<i>${f.base.v}</i>`:`(${astHTML(f.base.expr)})`;
  if(k>0&&f.base.type==='num')s=' × '+s;if(f.exp!==1)s+=`<sup>${f.exp}</sup>`;return s;}).join('');
}
function previewHTML(raw,v){const p=parseAnswer(raw,v);return p.ok?astHTML(p.ast):null;}

class ExamSession{
 constructor(questions,seconds=600,clock=()=>Date.now()){this.now=clock;this.questions=questions;this.entries=questions.map(()=>({raw:'',review:false}));this.index=0;this.deadline=clock()+seconds*1000;this.finished=false;this.report=null;}
 expired(){return this.now()>=this.deadline;}
 setAnswer(raw){if(this.finished||this.expired())return false;this.entries[this.index].raw=String(raw).slice(0,120);return true;}
 goto(i){if(this.finished||this.expired())return false;this.index=i;return true;}
 toggleReview(){if(this.finished||this.expired())return false;const e=this.entries[this.index];e.review=!e.review;return true;}
 finish(timedOut=false){
  if(this.report)return this.report;this.finished=true;
  const results=this.questions.map((q,i)=>({question:q,raw:this.entries[i].raw,...gradeAnswer(this.entries[i].raw,q)}));
  const correct=results.filter(r=>r.kind==='correct').length;
  this.report={timedOut:timedOut||this.expired(),results,correct,answered:results.filter(r=>r.raw.trim()).length,score:correct*10};
  return this.report;
 }
}

/* ---------- 代數磚題目 ---------- */
function tileProblem(rng=Math.random){
 for(;;){const P=pick(rng,[1,1,1,2,2,3]),R=pick(rng,[1,1,2]),Q=ri(rng,1,5),S=ri(rng,1,5);
  const a=P*R,b=P*S+Q*R,c=Q*S;if(a>4||b>12||c>15)continue;
  return {a,b,c,P,Q,R,S};}
}

return {TOPICS,VARIANTS,MOVES,REF,gcd,padd,pmul,pscale,ppow,peq,pdeg,trim,evaluate,render,plain,builder,Alloc,
 makeQuestion,variantsOf,shuffled,examVariantList,judgeVariantList,checkCross,checkFill,parseSlot,
 parseAnswer,gradeAnswer,factoredIssue,previewHTML,ExamSession,answerNode,tileProblem,MINUS};
});
