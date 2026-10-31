/* Exact rational and square-root arithmetic. No floating-point answer matching. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RadicalArithmetic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TOPICS=[{id:'multiply',title:'乘除法',short:'乘除',tip:'根號外算係數，根號內做乘除，最後化簡。'},{id:'rationalize',title:'有理化',short:'有理化',tip:'分母有根號，分子分母同乘適當的根式。'},{id:'add',title:'加減法',short:'加減',tip:'先化簡、找同類，再合併係數；不同類不能硬加。'},{id:'mixed',title:'四則運算',short:'四則',tip:'先括號、再乘除、後加減，展開時每一項都要乘到。'},{id:'formula',title:'乘法公式',short:'公式',tip:'和平方、差平方、平方差；共軛式有理化用平方差。'}];
const REFERENCES={multiply:'√a × √b ＝ √(ab)；√a ÷ √b ＝ √(a/b)（a ≥ 0、b > 0）',rationalize:'1/√a ＝ √a/a（a > 0）。先把分母的根號消掉，再約分。',add:'a√c ＋ b√c ＝ (a＋b)√c。先化成最簡根式，才能判斷是否同類。',mixed:'先乘除後加減；a(b＋c)＝ab＋ac，括號前的負號也要分配。',formula:'(a±b)²＝a²±2ab＋b²；(a＋b)(a−b)＝a²−b²。共軛式的乘積沒有中間項。'};
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1;}
function rat(n,d=1){if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d===0)throw Error('Invalid rational');if(d<0){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
const asRat=x=>typeof x==='number'?rat(x):rat(x.n,x.d);
function plus(a,b){a=asRat(a);b=asRat(b);return rat(a.n*b.d+b.n*a.d,a.d*b.d);}
function times(a,b){a=asRat(a);b=asRat(b);return rat(a.n*b.n,a.d*b.d);}
function over(a,b){a=asRat(a);b=asRat(b);return rat(a.n*b.d,a.d*b.n);}
function equalRat(a,b){return !!a&&!!b&&a.n===b.n&&a.d===b.d;}
function parse(raw){const s=String(raw??'').trim().replace(/−/g,'-').replace(/／/g,'/');if(s.length>32)return null;let m;
try{if((m=s.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/))){const w=Number(m[1]),n=Number(m[2]),d=Number(m[3]);if(n>=d||!d)return null;return rat((m[1].startsWith('-')?-1:1)*(Math.abs(w)*d+n),d);}
if((m=s.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/)))return rat(Number(m[1]),Number(m[2]));
if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;const [w,f='']=s.replace(/^[+-]/,'').split('.');if(f.length>8)return null;return rat((s.startsWith('-')?-1:1)*(Number(w||0)*10**f.length+Number(f||0)),10**f.length);
}catch{return null;}}
function squareParts(n){if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid radicand');if(n===0)return {a:0,b:1};let a=1,b=n;for(let p=2;p*p<=b;p++){while(b%(p*p)===0){a*=p;b/=p*p;}}return {a,b};}
function clean(p){const result={};for(const k of Object.keys(p).map(Number).sort((a,b)=>a-b))if(p[k].n)result[k]=asRat(p[k]);return result;}
function scalar(n,d=1){const r=rat(n,d);return r.n?{1:r}:{};}
function rootValue(r){r=asRat(r);if(r.n<0)throw Error('Negative root');const {a,b}=squareParts(r.n*r.d);return a?{[b]:rat(a,r.d)}:{};}
function add(a,b){const out={...a};for(const [k,c]of Object.entries(b))out[k]=plus(out[k]||rat(0),c);return clean(out);}
function scale(p,r){return clean(Object.fromEntries(Object.entries(p).map(([k,c])=>[k,times(c,r)])));}
function mul(a,b){let out={};for(const [ka,ca]of Object.entries(a))for(const [kb,cb]of Object.entries(b)){const {a:s,b:r}=squareParts(Number(ka)*Number(kb));out=add(out,{[r]:times(times(ca,cb),s)});}return clean(out);}
function div(a,b){const terms=Object.entries(b);if(!terms.length)throw Error('Zero denominator');if(terms.length===1){const [k,c]=terms[0];return scale(mul(a,{[k]:rat(1)}),over(rat(1),times(c,Number(k))));}if(terms.length===2){const [[k1,c1],[k2,c2]]=terms,conj={[k1]:c1,[k2]:times(c2,-1)},den=mul(b,conj);if(Object.keys(den).length!==1||!den[1])throw Error('Unsupported denominator');return scale(mul(a,conj),over(1,den[1]));}throw Error('Use a monomial or binomial denominator');}
const num=(n,d=1,label=null)=>({op:'num',r:rat(n,d),label});
const rad=(n,d=1,label=null)=>({op:'root',r:rat(n,d),label});
const sum=(...args)=>({op:'add',args});const prod=(...args)=>({op:'mul',args});const quotient=(a,b)=>({op:'div',a,b});const sq=a=>({op:'square',a});const neg=a=>prod(num(-1),a);
function evaluate(e){if(e.op==='num')return scalar(e.r.n,e.r.d);if(e.op==='root')return rootValue(e.r);if(e.op==='add')return e.args.reduce((p,a)=>add(p,evaluate(a)),{});if(e.op==='mul')return e.args.reduce((p,a)=>mul(p,evaluate(a)),scalar(1));if(e.op==='div')return div(evaluate(e.a),evaluate(e.b));if(e.op==='square'){const a=evaluate(e.a);return mul(a,a);}throw Error('Unknown expression');}
const frac=(a,b)=>`<span class="inline-fraction"><span>${a}</span><span>${b}</span></span>`;
const rootHTML=a=>`<span class="radical"><span class="root-symbol">√</span><span class="radicand">${a}</span></span>`;
function rationalHTML(r,label=null){if(label)return String(label).replace(/-/g,'−');r=asRat(r);return r.d===1?String(r.n).replace('-','−'):(r.n<0?'−':'')+frac(Math.abs(r.n),r.d);}
function show(e){if(e.op==='num')return rationalHTML(e.r,e.label);if(e.op==='root')return rootHTML(e.argumentAST?show(e.argumentAST):rationalHTML(e.r,e.label));if(e.op==='add')return e.args.map((a,i)=>{if(a.op==='num'&&a.r.n<0)return (i?' − ':'−')+rationalHTML(rat(-a.r.n,a.r.d));if(a.op==='mul'&&a.args[0].op==='num'&&a.args[0].r.n<0){const [n,...rest]=a.args;return(i?' − ':'−')+show(prod(num(-n.r.n,n.r.d),...rest));}return(i?' ＋ ':'')+show(a);}).join('');if(e.op==='mul'){
 const args=e.args.filter(a=>!(a.op==='num'&&a.r.n===a.r.d));
 if(!args.length)return '1';if(args.length===1)return show(args[0]);
 if(args[0].op==='num'&&args[0].r.n===-args[0].r.d)return '−'+show(prod(...args.slice(1)));
 if(args.length===2&&args[0].op==='num'&&args[1].op==='root')return show(args[0])+show(args[1]);
 return args.map(a=>a.op==='add'||a.op==='div'||a.op==='num'&&a.r.n<0?`(${show(a)})`:show(a)).join(' × ');
}if(e.op==='div')return frac(show(e.a),show(e.b));if(e.op==='square')return `(${show(e.a)})<sup>2</sup>`;}
function polyHTML(p){const terms=Object.entries(clean(p));if(!terms.length)return '0';return terms.map(([k,c],i)=>{const sign=c.n<0?(i?' − ':'−'):(i?' ＋ ':'');const a=Math.abs(c.n),body=Number(k)===1?String(a):(a===1?'':a)+rootHTML(k);return sign+(c.d===1?body:frac(body,c.d));}).join('');}
function expr(p){return sum(...Object.entries(clean(p)).map(([k,c])=>Number(k)===1?num(c.n,c.d):prod(num(c.n,c.d),rad(Number(k)))));}
function fillRow(label,parts,values,options={}){return {label,parts,answers:values.map(asRat),rules:values.map(()=>options.integer?'integer':'rational'),...options};}
function templateRow(label,template,values,options={}){return {label,template,answers:values.map(asRat),rules:values.map(()=>options.integer?'integer':'rational'),...options};}
function finalRow(p,knownRoots=false,carried={}){const entries=Object.entries(clean(p)),values=[];if(!entries.length)return templateRow('得到最簡答案','＝ {{0}}',[0],{integer:true,final:true});
const blank=n=>{const i=values.length;values.push(n);return `{{${i}}}`;};
const pieces=entries.map(([k,c],i)=>{const sign=c.n<0?(i?' − ':'−'):(i?' ＋ ':'');const n=carried[k]&&equalRat(carried[k],c)?String(Math.abs(c.n)):blank(Math.abs(c.n));let body=Number(k)===1?n:n+rootHTML(knownRoots?k:blank(Number(k)));if(c.d!==1)body=frac(body,carried[k]&&equalRat(carried[k],c)?c.d:blank(c.d));return sign+body;});if(!values.length)return null;return templateRow('得到最簡答案（分數約分；係數 1 也請填 1）','＝ '+pieces.join(''),values,{integer:true,final:true});}
function coefficientsRow(label,expressions,fillRoots=true){const p=expressions.map(evaluate);const vals=[],pieces=p.map(poly=>{const terms=Object.entries(poly);if(!terms.length){vals.push(rat(0));return `{{${vals.length-1}}}`;}return terms.map(([k,c],i)=>{vals.push(c);return(i?' ＋ ':'')+`{{${vals.length-1}}}`+(Number(k)===1?'':rootHTML(fillRoots?(()=>{vals.push(rat(Number(k)));return `{{${vals.length-1}}}`;})():k));}).join('');});const row=templateRow(label,'＝ '+pieces.map(s=>`(${s})`).join(' ＋ '),vals);row.termPolys=p;row.baseTemplate=row.template;return row;}
function stepExpression(label,e){return coefficientsRow(label,[e]);}
let serial=0;
function question(topic,variant,expression,steps,meta={}){const answer=evaluate(expression),last=steps.at(-1),carried={},counts={};if(last?.termPolys&&last.template===last.baseTemplate){for(const term of last.termPolys)for(const [k,c]of Object.entries(term)){counts[k]=(counts[k]||0)+1;carried[k]=c;}for(const k of Object.keys(carried))if(counts[k]!==1)delete carried[k];}const final=finalRow(answer,true,carried),rows=final?[...steps,final]:[...steps];return {id:`${topic}-${serial++}`,kind:topic,topicTitle:TOPICS.find(t=>t.id===topic).title,variant,prompt:show(expression),expression,answer,rows,solution:[show(expression),...steps.filter(row=>!row.choices).map(row=>row.template.replace(/^＝ /,'').replace(/\{\{(\d+)\}\}/g,(_,i)=>rationalHTML(row.answers[Number(i)]))),polyHTML(answer)].join(' ＝ '),reference:REFERENCES[topic],...meta};}
function rawMono(e){
 if(e.op==='num')return {c:e.r,r:rat(1)};
 if(e.op==='root')return {c:rat(1),r:e.r};
 if(e.op==='mul')return e.args.map(rawMono).reduce((a,b)=>({c:times(a.c,b.c),r:times(a.r,b.r)}),{c:rat(1),r:rat(1)});
 if(e.op==='div'){const a=rawMono(e.a),b=rawMono(e.b);return {c:over(a.c,b.c),r:over(a.r,b.r)};}
 throw Error('Not a raw monomial');
}
function rawTermsRow(label,terms){const values=[];const slot=r=>{values.push(asRat(r));return '{{'+(values.length-1)+'}}';};
 const pieces=terms.map(e=>{const {c,r}=rawMono(e);return '('+slot(c)+(r.n===r.d?'':rootHTML(r.d===1?slot(r.n):frac(slot(r.n),slot(r.d))))+')';});return templateRow(label,'＝ '+pieces.join(' ＋ '),values);
}
function productQuestion(a,b,op='mul',variant='根式乘法'){
 const original=op==='div'?quotient(a,b):prod(a,b),{c,r}=rawMono(original);
 const row=templateRow('分開計算：根號外的係數、根號內的數','＝ {{0}} × '+rootHTML(r.d===1?'{{1}}':frac('{{1}}','{{2}}')),r.d===1?[c,r.n]:[c,r.n,r.d]);
 const {a:factor,b:remaining}=squareParts(r.n*r.d);
 const extraction=templateRow('拆出最大的平方因數，準備提出根號','＝ '+rationalHTML(c)+' × '+(r.d===1?rootHTML('{{0}}<sup>2</sup> × {{1}}'):frac(rootHTML('{{0}}<sup>2</sup> × {{1}}'),r.d)),[factor,remaining],{integer:true});
 return question('multiply',variant,original,[row,extraction]);
}
function rationalQuestion(e,variant){const result=evaluate(e);let rows=[];
if(e.op==='div'){
 const {c,r}=rawMono(e.b),k=r.n*r.d;
 rows.push(templateRow('同乘分母上的根式，根號內的數是多少？兩格連動','＝ '+show(e)+' × '+frac(rootHTML('{{0}}'),rootHTML('{{0}}')),[k],{integer:true,linked:true}));
 const top=mul(evaluate(e.a),rootValue(rat(k))),bottom=times(c,r.n);
 if(e.a.op==='num'&&squareParts(k).a===1){rows.push(templateRow('分子沿用已選的根式，算出分母','＝ '+frac(polyHTML(top),'{{0}}'),[bottom]));return question('rationalize',variant,e,rows);}
 const topFields=coefficientsRow('分子、分母同乘分母的根式，再計算分子',[expr(top)]);
 const numTemplate=coefficientsRow('',[expr(top)]).template.replace(/^＝ /,'');
 topFields.template='＝ '+frac(numTemplate,`{{${topFields.answers.length}}}`);topFields.answers.push(bottom);topFields.rules.push('rational');topFields.display=frac(polyHTML(top),rationalHTML(bottom));rows.push(topFields);
}else{const r=e.r;rows.push(templateRow('把根號內改成「整數 ÷ 平方數」', '＝ '+frac(rootHTML('{{0}}'),'{{1}}'),[r.n*r.d,r.d],{integer:true}));}
return question('rationalize',variant,e,rows);}
function additionQuestion(terms,variant='先化簡，再找同類'){
 const e=sum(...terms),rows=[coefficientsRow('先將每一項化成最簡根式（負號保留在係數）',terms)];
 return question('add',variant,e,rows);
}
function distributionQuestion(factor,terms,divide=false){const e=divide?quotient(sum(...terms),factor):prod(factor,sum(...terms));const expanded=terms.map(t=>divide?quotient(t,factor):prod(factor,t));return question('mixed',divide?'和差除以根式':'分配律',e,[rawTermsRow('分配到每一項，先完成乘除（負號保留在係數）',expanded),coefficientsRow('分別化簡每一項，再找同類',expanded)]);}
function binomialQuestion(a,b,c,d){const e=prod(sum(a,b),sum(c,d)),expanded=[prod(a,c),prod(a,d),prod(b,c),prod(b,d)];return question('mixed','雙括號展開',e,[rawTermsRow('前後逐項相乘：第一×第一、第一×第二、第二×第一、第二×第二',expanded),coefficientsRow('分別化簡這四個乘積',expanded)]);}
function formulaQuestion(a,b,kind){const sign=kind==='minus'?-1:1;
 const original=kind==='difference'?prod(sum(a,b),sum(a,neg(b))):sq(sum(a,prod(num(sign),b)));
 const components=kind==='difference'?[sq(a),neg(sq(b))]:[sq(a),prod(num(2*sign),a,b),sq(b)];
 return question('formula',kind==='difference'?'平方差':kind==='minus'?'差的平方':'和的平方',original,[templateRow('辨認本題適用的乘法公式','本題使用：{{0}}',[kind==='plus'?0:kind==='minus'?1:2],{choices:['和的平方','差的平方','平方差']}),coefficientsRow(kind==='difference'?'套用平方差：第一項平方 − 第二項平方':'套用完全平方：第一項平方、正負 2ab、第二項平方',components)]);
}
function conjugateQuestion(n,a,b,minus=false){const signedB=minus?neg(b):b,den=sum(a,signedB),conj=sum(a,minus?b:neg(b)),e=quotient(num(n),den),denResult=evaluate(prod(den,conj)),top=prod(num(n),conj);
 const d=denResult[1];if(!d||!d.n)return null;
 const options=[polyText(evaluate(conj)),polyText(evaluate(den))],swap=(n+Number(Object.keys(evaluate(a))[0]))%2===1;if(swap)options.reverse();
 const choice=templateRow('找出分母的共軛式','上下同乘：{{0}}',[swap?1:0],{choices:options});
 const rr=coefficientsRow('分子展開，分母用平方差',[top]);
 rr.template='＝ '+frac(rr.template.replace(/^＝ /,''),`{{${rr.answers.length}}}`);rr.answers.push(d);rr.rules.push('rational');rr.display=frac(polyHTML(evaluate(top)),rationalHTML(d));
 return question('formula','共軛式有理化',e,[choice,rr],{reference:'根式二項式的共軛式：保留兩項，將兩項之間的加減號互換。乘積使用平方差公式。'});}
function shuffled(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function buildPool(){serial=0;const pool=[];const put=q=>{if(q)pool.push(q);};
put(productQuestion(prod(num(3),rad(8)),prod(num(2),rad(6)),'mul','入門示例'));
put(rationalQuestion(quotient(num(3),rad(6)),'入門示例'));
put(additionQuestion([rad(12),rad(27)],'入門示例'));
put(distributionQuestion(rad(3),[num(2),prod(num(-3),rad(6))]));
put(formulaQuestion(prod(num(3),rad(2)),prod(num(2),rad(3)),'minus'));

for(const [i,r]of [2,3,5,6,7,10].entries()){
 const s=[3,5,2,3,2,3][i],a=i%2?-3:2,b=i%3?-2:3;
 put(productQuestion(prod(num(a),rad(r)),prod(num(b),rad(s))));
 put(productQuestion(prod(num(a,2),rad(4*r)),prod(num(b,3),rad(9*s)),'mul','分數係數與負號'));
 put(productQuestion(prod(num(7,10,'0.7'),rad(r)),prod(num(2),rad(5*s)),'mul','小數係數'));
 put(productQuestion(prod(num(-4),rad(r)),num(3,4),'mul','有理數乘根式'));
 put(productQuestion(rad(12*r),rad(3*s),'div','根式除法'));
 put(productQuestion(prod(num(4),rad(r)),prod(num(6),rad(s)),'div','係數與根式的除法'));
 put(productQuestion(rad(18,5,'3'+frac(3,5)),rad(5*r),'mul','根號內的帶分數'));
 put(productQuestion(neg(rad(8,3,'2'+frac(2,3))),rad(9*r),'mul','根號內的帶分數與負號'));
 put(productQuestion(rad(r,10),rad(s,5),'div','分數根式除法'));
 const chain=quotient(prod(prod(num(a),rad(4*r)),rad(3*s)),prod(num(b),rad(r)));
 const cr=stepExpression('先算分子乘法，分母保持原樣',prod(prod(num(a),rad(4*r)),rad(3*s)));cr.template='＝ '+frac(cr.template.replace(/^＝ /,''),show(prod(num(b),rad(r))));put(question('multiply','乘除混合，依序運算',chain,[cr]));
 put(rationalQuestion(quotient(num(i+1),rad(4*r)),'單項分母有理化'));
 put(rationalQuestion(quotient(prod(num(2),rad(s)),prod(num(3),rad(r))),'分子也有根式'));
 put(rationalQuestion(rad(i+2,3*r),'根號內的分數'));
 put(rationalQuestion(rad(i+2,10,(i+2)/10+''),'根號內的小數'));
 put(additionQuestion([prod(num(a),rad(4*r)),prod(num(b),rad(9*r))]));
 put(additionQuestion([prod(num(7,4),rad(r)),prod(num(-3,2),rad(r)),prod(num(2,5),rad(r))],'分數係數的加減'));
 put(additionQuestion([prod(num(a),rad(r)),prod(num(b),rad(s)),prod(num(-a),rad(4*r))],'不同類根式與負號'));
 const paren=sum(num(8),neg(rad(9*r)),prod(num(-4),sum(num(2),neg(rad(4*r)))));
 put(question('add','去括號，留意負號',paren,[coefficientsRow('去括號：負號與係數都要分配',[num(8),neg(rad(9*r)),num(-8),prod(num(4),rad(4*r))])]));
 const ra=quotient(num(i+1),rad(r));put(question('add','有理化後再合併',sum(ra,neg(rad(4*r))),[coefficientsRow('先有理化、化簡，再找同類',[ra,neg(rad(4*r))])]));
 put(distributionQuestion(rad(r),[num(a),prod(num(b),rad(2*s))]));
 put(distributionQuestion(rad(r),[prod(num(-2),rad(s)),prod(num(3),rad(2*r))],true));
 put(binomialQuestion(num(a),rad(r),num(b),neg(rad(s))));
 const prec=sum(num(3),prod(rad(r),rad(4*r)),neg(rad(9*s)));put(question('mixed','先乘除，後加減',prec,[coefficientsRow('先算乘法，再化簡其餘項',[num(3),prod(rad(r),rad(4*r)),neg(rad(9*s))])]));
 for(const kind of ['plus','minus','difference'])put(formulaQuestion(prod(num(2),rad(r)),prod(num(3),rad(s)),kind));
 put(conjugateQuestion(1,rad(r),num(1),i%2===0));put(conjugateQuestion(2,rad(r),rad(s),i%2===1));
 const e=prod(sq(sum(rad(r),num(2))),sq(sum(rad(r),num(-2))));const sr=stepExpression('先用平方差計算括號乘積，外面的平方要保留',prod(sum(rad(r),num(2)),sum(rad(r),num(-2))));sr.template='＝ ('+sr.template.replace(/^＝ /,'')+')<sup>2</sup>';put(question('formula','先平方差，再平方',e,[sr]));
}
// Lecture checkpoints and exact structures from the final comprehensive section.
put(productQuestion(rad(125),rad(18,5,'3'+frac(3,5)),'mul','根號內的帶分數'));
put(productQuestion(rad(12,7,'1'+frac(5,7)),neg(rad(35,6,'5'+frac(5,6))),'mul','兩個帶分數根式'));
put(additionQuestion([rad(8),neg(rad(18))],'同類相消與負係數'));
put(additionQuestion([rad(8),neg(prod(num(2),rad(2)))],'相消為零'));
for(const [r,s,t]of [[2,3,6],[3,18,6]]){const x=rad(r),y=sum(rad(s),neg(rad(t))),e=prod(sum(x,y),sum(x,neg(y)));put(question('formula','三項式的平方差',e,[coefficientsRow('看成 x² − y²；先分別計算兩個平方',[sq(x),neg(sq(y))])]));}
const left=quotient(num(1),sum(rad(5),rad(2))),right=quotient(num(3),sum(rad(2),neg(rad(5))));
put(question('formula','兩個分式先有理化再合併',sum(left,neg(right)),[coefficientsRow('分別有理化，注意減號',[left,neg(right)])]));
const u=quotient(num(1),sum(rad(7),rad(5))),v=quotient(num(1),sum(rad(7),neg(rad(5))));
const pr1=coefficientsRow('分別有理化，外面的平方要保留',[u]),pr2=coefficientsRow('',[v]);const offset=pr1.answers.length;pr1.template='＝ ('+pr1.template.replace(/^＝ /,'')+')<sup>2</sup> ＋ ('+pr2.template.replace(/^＝ /,'').replace(/\{\{(\d+)\}\}/g,(_,i)=>'{{'+(Number(i)+offset)+'}}')+')<sup>2</sup>';pr1.answers.push(...pr2.answers);pr1.rules.push(...pr2.rules);put(question('formula','有理化後平方、再相加',sum(sq(u),sq(v)),[pr1,coefficientsRow('將兩個分式各自平方',[sq(u),sq(v)])]));
const seen=new Set();return pool.filter(q=>{if(seen.has(q.prompt))return false;seen.add(q.prompt);return true;});}
function polyText(p){const terms=Object.entries(clean(p));if(!terms.length)return '0';return terms.map(([k,c],i)=>{const sign=c.n<0?'-':i?'+':'';const n=Math.abs(c.n),body=Number(k)===1?String(n):(n===1?'':n)+'√'+k;return sign+(c.d===1?body:'('+body+')/'+c.d);}).join('');}
function samePoly(a,b){a=clean(a);b=clean(b);const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>equalRat(a[k],b[k]));}
function parseExpression(raw){
 const source=String(raw??'').trim().replace(/[−–]/g,'-').replace(/[＋]/g,'+').replace(/[×·]/g,'*').replace(/[÷／]/g,'/').replace(/（/g,'(').replace(/）/g,')').replace(/sqrt/gi,'√').replace(/²/g,'^2');
 if(!source||source.length>160)return null;
 const tokens=[];let at=0;
 while(at<source.length){if(/\s/.test(source[at])){at++;continue;}const n=source.slice(at).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(n){if(n[0].length>12||Math.abs(Number(n[0]))>1000000)return null;tokens.push(n[0]);at+=n[0].length;}else if('+-*/()√^'.includes(source[at]))tokens.push(source[at++]);else return null;}
 if(tokens.length>100)return null;let i=0,depth=0;
 const peek=()=>tokens[i];const take=()=>tokens[i++];
 function atom(){if(++depth>16)throw Error('Too deep');let e;const t=take();
 if(t==='('){e=addition();if(take()!==')')throw Error('Missing bracket');}
 else if(t==='√'){let a;if(peek()==='('){take();a=addition();if(take()!==')')throw Error('Missing root bracket');}else{const n=take(),r=parse(n);if(!r)throw Error('Missing radicand');a=num(r.n,r.d);}
 const v=evaluate(a),ks=Object.keys(v);if(ks.some(k=>k!=='1'))throw Error('Nested radicals');const r=v[1]||rat(0);if(r.n<0||r.n*r.d>1000000)throw Error('Radicand out of range');e=rad(r.n,r.d);e.argumentPending=a.op!=='num';e.argumentAST=a;}
 else{const r=parse(t);if(!r)throw Error('Invalid number');e=num(r.n,r.d,t);}
 depth--;return e;}
 function power(){let e=atom();if(peek()==='^'){take();if(take()!=='2')throw Error('Only square allowed');e=sq(e);}return e;}
 function unary(){if(peek()==='+'){take();return unary();}if(peek()==='-'){take();return neg(unary());}return power();}
 function term(){let e=unary();while(true){const op=peek();if(op==='*'||op==='/'){take();const b=unary();e=op==='*'?prod(e,b):quotient(e,b);}else if(op==='√'||op==='('){e=prod(e,unary());}else break;}return e;}
 function addition(){let e=term();while(peek()==='+'||peek()==='-'){const op=take(),b=term();e=sum(e,op==='+'?b:neg(b));}return e;}
 try{const ast=addition();if(i!==tokens.length)return null;const value=evaluate(ast);return {ast,value,...simpleForm(ast)};}catch{return null;}
}
function simpleForm(ast){let reason='';const fail=text=>{reason=reason||text;};
 function terms(e){
 if(e.op==='num')return [{k:1,c:e.r}];
 if(e.op==='root'){if(e.argumentPending)fail('根號內還有運算，請算完。');if(e.r.d!==1||e.r.n<=1||squareParts(e.r.n).a!==1)fail('根號內還能化簡，或可直接開成整數。');return Object.entries(rootValue(e.r)).map(([k,c])=>({k:Number(k),c}));}
 if(e.op==='square'){fail('答案仍有平方運算，請算完。');return Object.entries(evaluate(e)).map(([k,c])=>({k:Number(k),c}));}
 if(e.op==='add'){const items=e.args.flatMap(terms),seen=new Set();for(const t of items){if(seen.has(t.k))fail('還有同類項可以合併。');seen.add(t.k);}return items;}
 if(e.op==='mul'){const groups=e.args.map(terms);if(groups.some(g=>g.length>1))fail('括號內的和差還需要展開。');const radicals=groups.flat().filter(t=>t.k!==1);if(radicals.length>1)fail('根式相乘還需要算完。');const factors=groups.flat().filter(t=>t.k===1&&Math.abs(t.c.n)!==t.c.d);if(factors.length>1)fail('係數相乘還需要算完。');return Object.entries(evaluate(e)).map(([k,c])=>({k:Number(k),c}));}
 if(e.op==='div'){const a=terms(e.a),b=terms(e.b),den=evaluate(e.b);if(b.some(t=>t.k!==1))fail('分母還有根號，請有理化。');if(!den[1]||den[1].d!==1)fail('分式還需要整理。');
 if(den[1]&&a.length&&a.every(t=>t.c.d===1)&&gcd(a.reduce((g,t)=>gcd(g,Math.abs(t.c.n)),Math.abs(den[1].n)),Math.abs(den[1].n))>1)fail('分子、分母還能約分。');
 if(den[1]&&den[1].n<0)fail('請將負號移到分子。');return Object.entries(evaluate(e)).map(([k,c])=>({k:Number(k),c}));}
 return [];}
 try{terms(ast);}catch{fail('式子無法判讀。');}return {simplest:!reason,reason};}
function checkAnswer(raw,expected){if(!String(raw??'').trim())return {kind:'empty',message:'尚未作答'};const parsed=parseExpression(raw);if(!parsed)return {kind:'invalid',message:'式子尚未輸入完整，請檢查根號、分母與括號。'};if(!samePoly(parsed.value,expected))return {kind:'wrong',message:'計算結果不正確。'};if(!parsed.simplest)return {kind:'unfinished',message:'數值相等，但尚未最簡：'+parsed.reason};return {kind:'correct',message:'答對了！'};}
// Convert only our generated math markup; never execute user text or HTML.
function mathHTMLText(html){const root={tag:'root',children:[]},stack=[root];for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</')){if(stack.length>1)stack.pop();}else if(token.startsWith('<')){const tag=token.match(/^<([a-z]+)/i)?.[1],cls=token.match(/class="([^"]*)"/)?.[1]||'';const node={tag,cls,children:[]};stack[stack.length-1].children.push(node);if(!token.endsWith('/>'))stack.push(node);}else stack[stack.length-1].children.push(token);}
function render(n){if(typeof n==='string')return n.replace(/＝/g,'').replace(/&nbsp;/g,' ');const has=c=>(n.cls||'').split(' ').includes(c);if(has('root-symbol'))return '';if(has('radical'))return '√('+n.children.filter(c=>typeof c!=='string'&&(c.cls||'').includes('radicand')).map(render).join('')+')';if(has('inline-fraction'))return '('+render(n.children[0])+')/('+render(n.children[1])+')';if(n.tag==='sup')return '^'+n.children.map(render).join('');return n.children.map(render).join('');}return render(root);}
function rowExpression(row,values=row.answers){if(row.choices)return null;const html=row.template.replace(/\{\{(\d+)\}\}/g,(_,i)=>rationalHTML(asRat(values[Number(i)])));return parseExpression(mathHTMLText(html));}
class ExamSession{
 constructor(questions,now=()=>Date.now()){if(questions.length!==10)throw Error('Exam requires 10 questions');this.questions=questions;this.now=now;this.deadline=now()+600000;this.entries=questions.map(()=>({raw:'',review:false}));this.index=0;this.finished=false;this.report=null;}
 guard(){if(this.finished)return false;if(this.now()>=this.deadline){this.finish(true);return false;}return true;}
 setAnswer(raw){if(!this.guard())return false;this.entries[this.index].raw=String(raw).slice(0,160);return true;}
 goto(index){if(!this.guard()||!Number.isInteger(index)||index<0||index>=10)return false;this.index=index;return true;}
 toggleReview(){if(!this.guard())return false;this.entries[this.index].review=!this.entries[this.index].review;return true;}
 finish(timedOut=false){if(this.finished)return this.report;this.finished=true;const results=this.questions.map((q,i)=>({...checkAnswer(this.entries[i].raw,q.answer),raw:this.entries[i].raw,question:q}));this.report={timedOut:timedOut||this.now()>=this.deadline,results,correct:results.filter(r=>r.kind==='correct').length,answered:this.entries.filter(e=>e.raw.trim()).length};this.report.score=this.report.correct*10;return this.report;}
}
function selectRound(pool,topic,count=10,random=Math.random){if(topic!=='all'&&!TOPICS.some(t=>t.id===topic))throw Error('Unknown topic');const groups=topic==='all'?TOPICS.map(t=>pool.filter(q=>q.kind===t.id)):[pool.filter(q=>q.kind===topic)];if(groups.some(g=>!g.length))throw Error('Empty topic');let out=[];for(const group of groups)out.push(...shuffled(group,random).slice(0,Math.floor(count/groups.length)));const ids=new Set(out.map(q=>q.id));out.push(...shuffled(pool.filter(q=>(topic==='all'||q.kind===topic)&&!ids.has(q.id)),random).slice(0,count-out.length));return shuffled(out,random);}
return {TOPICS,REFERENCES,rat,plus,times,over,equalRat,parse,squareParts,rootValue,scalar,add,scale,mul,div,num,rad,sum,prod,quotient,sq,neg,evaluate,show,polyHTML,rationalHTML,rootHTML,frac,expr,buildPool,selectRound,shuffled,finalRow,rawMono,polyText,samePoly,parseExpression,checkAnswer,mathHTMLText,rowExpression,ExamSession};
});
