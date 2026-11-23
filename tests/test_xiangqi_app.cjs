/* 狀態回歸測試：輕量 DOM 替身，只驗證存檔生命週期與上榜條件。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const X=require('../games/xiangqi_engine.js'),D=require('../games/xiangqi_lessons.js'),B=require('../games/xiangqi_puzzles.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../games/xiangqi.js'),'utf8');
function app(initial={}){
  const store=new Map(Object.entries(initial)),listeners={},elements=new Map(),timeouts=new Map();let timer=0,fetches=0;
  class Element{constructor(id=''){this.id=id;this.hidden=false;this.isConnected=true;this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};this.innerHTML='';this.textContent='';this.disabled=false;this.scrollHeight=0;this.offsetWidth=500}
    setAttribute(){}focus(){}after(el){elements.set(el.id,el)}appendChild(){}remove(){}animate(){}getBoundingClientRect(){return {width:500,height:556}}
    querySelector(s){return s==='.player-mark'?new Element():null}querySelectorAll(){return []}}
  for(const id of fs.readFileSync(require('node:path').join(__dirname,'../games/xiangqi.html'),'utf8').matchAll(/id="([^"]+)"/g))elements.set(id[1],new Element(id[1]));
  const document={hidden:false,activeElement:null,documentElement:new Element(),getElementById:id=>elements.get(id)||null,querySelector:()=>new Element(),createElement:()=>new Element(),createElementNS:()=>new Element(),addEventListener:(n,f)=>listeners[n]=f};
  const context={window:{Xiangqi:X,XiangqiLessons:D,XiangqiPuzzles:B},document,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},matchMedia:()=>({matches:true}),innerWidth:1200,innerHeight:900,performance:{now:()=>0},navigator:{},console,
    addEventListener(){},setInterval(){},clearInterval(){},setTimeout:f=>{timeouts.set(++timer,f);return timer},clearTimeout:id=>timeouts.delete(id),fetch:()=>{fetches++;throw Error('unexpected external request')},AbortController,Worker:class{postMessage(){}terminate(){}}};
  vm.createContext(context);vm.runInContext(source,context);
  const action=(a,data={})=>{const el={dataset:{act:a,...data},disabled:false};listeners.click({target:{closest:s=>s==='[data-sq]'?null:el}})};
  const square=sq=>listeners.click({target:{closest:s=>s==='[data-sq]'?{dataset:{sq:String(sq)}}:null}});
  return {store,elements,action,square,get:k=>JSON.parse(store.get(k)||'null'),fetches:()=>fetches};
}
const oldSave={v:1,initial:{b:Array.from(X.start().b),side:1},moves:[],level:2,me:1,pvp:false,hc:'none',elapsed:1000};
let a=app({xq_save:JSON.stringify(oldSave)});assert.deepEqual(a.get('xq_save'),oldSave,'opening the menu must not overwrite an existing save');a.action('resume');assert.equal(a.elements.get('modal').hidden,true);assert.deepEqual(a.get('xq_save').initial,oldSave.initial);
a=app();assert.equal(a.get('xq_save'),null,'preview is not a started game');a.action('pvp');a.action('start');assert.equal(a.get('xq_save').pvp,true);a.square(70);a.square(67);a.square(7);a.square(24);assert.equal(a.get('xq_save').moves.length,2);a.action('undo');assert.equal(a.get('xq_save').moves.length,1);assert.equal(a.get('xq_save').undid,true);
const restore=app(Object.fromEntries(a.store));restore.action('resume');assert.equal(restore.get('xq_save').moves.length,1,'reload should replay the saved moves');assert.equal(restore.elements.get('app').inert,false);
function win(extra={}){const s={...oldSave,level:0,initial:{b:B[1][0].b,side:1},...extra},a=app({xq_save:JSON.stringify(s)});a.action('resume');const m=B[1][0].solution;a.square(X.from(m));a.square(X.to(m));return a}
a=win();assert.equal(a.get('xq_local_rank')[0].length,1);assert.equal(a.get('xq_record')[0].w,1);assert.equal(a.get('xq_save'),null,'finished games should not resume');assert.equal(a.fetches(),0,'a win should not publish a name or score automatically');
for(const extra of [{hinted:true},{undid:true},{hc:'rook'},{pvp:true},{lessonFree:true}]){const a=win(extra);assert.equal(a.get('xq_local_rank'),null,'ineligible win must not enter leaderboard: '+JSON.stringify(extra))}
console.log('Save lifecycle and leaderboard eligibility passed');
