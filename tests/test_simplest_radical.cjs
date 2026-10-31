const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Q = require('../junior/math/simplest_radical_core.js');
let seed = 301031;
const rng = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
function squareFree(n) { for(let d=2;d*d<=n;d++) if(n%(d*d)===0) return false; return true; }
function isSimplest(o) { return o.integer || (o.b > 1 && squareFree(o.b)); }

test('every integer 1–100 has one correct simplest choice and exact classification', () => {
  for(let n=1;n<=100;n++) {
    const {a,b} = Q.simplify(n);
    assert.equal(a*a*b,n); assert.ok(squareFree(b));
    for(let i=0;i<40;i++) {
      const q=Q.buildQuestion(n,'simplify',rng);
      assert.equal(q.options.length,4,`n=${n}`);
      assert.equal(new Set(q.options.map(o=>o.value)).size,4);
      const valid=q.options.filter(o=>o.a*o.a*o.b===n && isSimplest(o));
      assert.equal(valid.length,1,`unique simplest at n=${n}`);
      assert.equal(valid[0].value,q.answer);
    }
    const q=Q.buildQuestion(n,'judge');
    assert.equal(q.answer, n>1 && squareFree(n) ? 'yes' : 'no');
    assert.equal(q.options.length,2);
  }
  assert.equal(Q.buildQuestion(1).answer,'int:1');
  assert.equal(Q.buildQuestion(100).answer,'int:10');
  assert.equal(Q.buildQuestion(72).answer,'rad:6:2');
  assert.equal(Q.buildQuestion(48).answer,'rad:4:3');
  for(const n of [0,-1,101,2.5,NaN]) assert.throws(()=>Q.simplify(n));
});

test('both difficulties include full ranges, balance question types, and avoid repeated questions in a round',()=>{
  for(const [difficulty,limit] of Object.entries(Q.LIMITS)) for(const play of ['judge','simplify']) {
    const covered = new Set();
    for(let r=0;r<200;r++) {
      const round=Q.generateRound(play,difficulty,rng);
      assert.equal(round.length,20);assert.equal(new Set(round.map(q=>q.n)).size,20);
      for(const q of round) { assert.ok(q.n>=1&&q.n<=limit); covered.add(q.n); }
      if(play==='judge') assert.equal(round.filter(q=>q.answer==='yes').length,10);
      else {
        assert.equal(round.filter(q=>q.kind==='square').length,4);
        assert.equal(round.filter(q=>q.kind==='reducible').length,8);
        assert.equal(round.filter(q=>q.kind==='simple').length,8);
      }
    }
    assert.equal(covered.size,limit);
  }
});

function harness() {
  const html=fs.readFileSync('junior/math/simplest_radical_challenge.html','utf8');
  const nodes=new Map(), tasks=new Map();let clock=0,next=0;
  class Element {
    constructor(id='',className='') { this.id=id;this.className=className;this.style={};this.dataset={};this.disabled=false;this.hidden=false;this.children=[];this.innerHTML='';this.innerText='';
      this.classList={add:c=>{if(!this.className.split(' ').includes(c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');},toggle:(c,on)=>on?this.classList.add(c):this.classList.remove(c)};
    }
    setAttribute(){} appendChild(el){this.children.push(el);} querySelector(s){return this.children.find(e=>'.'+e.className===s);} }
  for(const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const tag=match[0],cls=tag.match(/class="([^"]+)"/);
    nodes.set(match[1],new Element(match[1],cls?cls[1]:''));
  }
  const sp=Array.from({length:4},(_,i)=>nodes.get(`sp-option-${i}`));
  const sides={};
  for(const side of ['top','bottom']) {
    sides[side]=Array.from({length:4},()=>new Element('','pk-opt-btn pk-opt-'+side));
    const panel=new Element();panel.parentElement={id:'player-'+side};panel.children=sides[side];
    for(const btn of sides[side])btn.parentElement=panel;
    nodes.get('end-'+side).children=[new Element('','end-title'),new Element('','end-emoji')];
  }
  const extra=[...sides.top,...sides.bottom,new Element('','pk-prompt'),new Element('','pk-prompt')];
  function select(selector){return [...nodes.values(),...extra].filter(el=>selector.split(',').some(s=>el.className.split(' ').includes(s.trim().slice(1))));}
  const schedule=(fn,ms,repeat=false)=>{const id=++next;tasks.set(id,{fn,time:clock+ms,ms,repeat});return id;};
  const context=vm.createContext({RadicalChallenge:Q,console,window:{},document:{getElementById:id=>{assert.ok(nodes.has(id),'missing DOM '+id);return nodes.get(id);},querySelectorAll:select,createElement:()=>new Element()},performance:{now:()=>clock},setTimeout:(fn,ms)=>schedule(fn,ms),clearTimeout:id=>tasks.delete(id),setInterval:(fn,ms)=>schedule(fn,ms,true),clearInterval:id=>tasks.delete(id),requestAnimationFrame:()=>99999,cancelAnimationFrame:()=>{}});
  const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');vm.runInContext(inline,context);
  function advance(ms){const end=clock+ms;while(true){const entry=[...tasks.entries()].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];if(!entry)break;const [id,t]=entry;clock=t.time;if(t.repeat)t.time+=t.ms;else tasks.delete(id);t.fn();}clock=end;}
  return {run:code=>vm.runInContext(code,context),sp,sides,nodes,advance,tasks};
}

test('all four single-player settings: countdown locked, 20 answers, exact full score, hidden unused choices',()=>{
  for(const play of ['judge','simplify']) for(const level of ['basic','mastery']) {
    const h=harness();h.run(`setPlay('${play}');setDifficulty('${level}');startSinglePlayer()`);
    assert.ok(h.sp.every(b=>b.disabled));h.advance(3000);
    assert.equal(h.sp.filter(b=>!b.hidden).length,play==='judge'?2:4);
    for(let i=0;i<20;i++) {
      h.run("spCheckAnswer([...document.querySelectorAll('.sp-opt-btn')].find(b=>b.dataset.value===spQuestionsPool[spCurrentQIndex].answer))");
      assert.equal(h.run('spScore'),(i+1)*5);h.advance(1800);
    }
    assert.equal(h.run('spScore'),100);assert.equal(h.nodes.get('sp-end-overlay').style.display,'flex');
    assert.ok(h.sp.every(b=>b.disabled));
  }
});

test('wrong/late answers, double taps, and leaving during countdown or answer feedback are safe',()=>{
  const h=harness();h.run('startSinglePlayer()');h.advance(3000);
  h.run("spCheckAnswer([...document.querySelectorAll('.sp-opt-btn')].find(b=>!b.hidden&&b.dataset.value!==spQuestionsPool[0].answer))");
  assert.equal(h.run('spScore'),0);assert.equal(h.run('spMistakes.length'),1);
  h.run('spCheckAnswer(document.getElementById("sp-option-0"))');assert.equal(h.run('spCurrentQIndex'),1);
  h.advance(1800);h.advance(5000);
  h.run("spCheckAnswer([...document.querySelectorAll('.sp-opt-btn')].find(b=>!b.hidden))");
  assert.equal(h.run('spMistakes.length'),2);assert.equal(h.run('spMistakes[1].selectedText'),'逾時');
  h.run('returnToMenu()');assert.equal(h.tasks.size,0);h.advance(10000);assert.equal(h.nodes.get('mode-select-screen').style.display,'flex');
  h.run('startSinglePlayer();returnToMenu()');h.advance(10000);assert.equal(h.nodes.get('sp-container').style.display,'none');
});

test('all four PK settings share choices, block simultaneous answers, and keep scoring and victory rules',()=>{
  for(const play of ['judge','simplify']) for(const level of ['basic','mastery']) {
    const h=harness();h.run(`setPlay('${play}');setDifficulty('${level}');startPKGame()`);
    assert.equal(h.run('pkGameState'),'countdown');assert.ok(h.sides.top.every(b=>b.disabled));h.advance(3000);
    assert.equal(h.run('pkGameState'),'playing');
    const correct=()=>h.run("pkCheckAnswer('top',[...document.querySelectorAll('.pk-opt-top')].find(b=>b.dataset.value===pkCurrentQuestion.answer))");
    for(let i=0;i<3;i++) {
      assert.deepEqual(h.sides.top.map(b=>b.dataset.value),h.sides.bottom.map(b=>b.dataset.value));
      assert.equal(h.sides.top.filter(b=>!b.hidden).length,play==='judge'?2:4);
      correct();h.run("pkCheckAnswer('bottom',document.querySelectorAll('.pk-opt-bottom')[0])");assert.equal(h.run('pkScores.bottom'),0);h.advance(1000);
    }
    assert.equal(h.run('pkScores.top'),40);
    h.run('pkScores.bottom=200');correct();assert.equal(h.run('pkScores.top'),80);h.advance(1000);
    h.run('pkScores.top=0');h.run("pkCheckAnswer('top',[...document.querySelectorAll('.pk-opt-top')].find(b=>!b.hidden&&b.dataset.value!==pkCurrentQuestion.answer))");assert.equal(h.run('pkScores.top'),0);h.advance(1000);
    h.run('pkScores.top=290;pkScores.bottom=0');correct();h.advance(1000);assert.equal(h.run('pkGameState'),'ended');
    assert.equal(h.nodes.get('end-top').style.display,'flex');
    h.run('returnToMenu()');assert.equal(h.tasks.size,0);
  }
});

test('lesson is registered once under grade 8',()=>{
 const ctx={};vm.runInNewContext(fs.readFileSync('data.js','utf8')+';globalThis.lessons=lessonData;',ctx);
 const matches=ctx.lessons.filter(l=>l.url==='junior/math/simplest_radical_challenge.html');
 assert.equal(matches.length,1);assert.equal(matches[0].category,'junior');assert.equal(matches[0].grades[0],8);
});
