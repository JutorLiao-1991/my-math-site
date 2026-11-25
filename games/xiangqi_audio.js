/* 鳩特象棋音效與配樂：全部以 Web Audio 即時合成，不需下載音檔。
   - 落子：木質棋子敲棋盤；吃子：兩顆硬木棋子相撞的清脆「喀」＋被吃子滑出場外
   - 將軍：京劇小鑼「鏘」（明亮的金屬泛音、敲下後音高上揚）
   - 配樂：竹笛主奏（連音、倚音、吐音、延遲顫音、笛膜沙沙聲），弦樂空五度墊底、阮咚低音、碰鈴；
           旋律只用宮商角徵羽（G 宮：G A B D E）。將軍時進入「緊張模式」：加速並加入堂鼓與木魚。 */
(function(){
  'use strict';
  let ctx=null,master,sfxBus,musicBus,rev,noiseBuf=null,wave=null,curve=null;
  let musicOn=false,timer=0,schedTime=0,schedBeat=0,bpm=78,targetBpm=78,tense=0,score=[],evIdx=0,loopLen=0,loopNo=0,flute=null;
  const BASE_BPM=78,TENSE_BPM=120;

  function init(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    try{ctx=new AC()}catch(e){return null}
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.18;
    master=ctx.createGain();master.gain.value=.8;master.connect(comp).connect(ctx.destination);
    rev=ctx.createConvolver();rev.buffer=impulse(2.8,2.6);const ro=ctx.createGain();ro.gain.value=.5;rev.connect(ro).connect(master);
    sfxBus=ctx.createGain();sfxBus.connect(master);const ss=ctx.createGain();ss.gain.value=.14;sfxBus.connect(ss).connect(rev);
    newMusicBus();return ctx}
  function newMusicBus(){musicBus=ctx.createGain();musicBus.gain.value=0;musicBus.connect(master);const s=ctx.createGain();s.gain.value=.42;musicBus.connect(s).connect(rev)}
  function unlock(){const a=init();if(a&&a.state==='suspended')a.resume().catch(()=>{});return a}
  function impulse(sec,decay){const r=ctx.sampleRate,n=Math.floor(r*sec),b=ctx.createBuffer(2,n,r);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<n;i++){const x=Math.random()*2-1;lp+=(x-lp)*.5;d[i]=lp*Math.pow(1-i/n,decay)*(i<r*.015?i/(r*.015):1)}}return b}
  function noise(){if(noiseBuf)return noiseBuf;const n=ctx.sampleRate*2;noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return noiseBuf}

  /* ---------- 基本元件 ---------- */
  function env(g,t,peak,attack,decay){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay)}
  function noiseHit(t,{freq=2000,q=2,vol=.5,decay=.05,type='bandpass',out=sfxBus,rate=1}={}){
    const s=ctx.createBufferSource();s.buffer=noise();s.playbackRate.value=rate*(.85+Math.random()*.3);
    const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();env(g,t,vol,.0012,decay);
    s.connect(f).connect(g).connect(out);s.start(t,Math.random()*1.5);s.stop(t+decay+.06)}
  function tone(t,f0,f1,vol,decay,type='sine',out=sfxBus,attack=.0015){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+Math.min(decay,.25));
    env(g,t,vol,attack,decay);o.connect(g).connect(out);o.start(t);o.stop(t+attack+decay+.05)}

  /* 木質棋子落在棋盤上：低沉的「啪」＋木體共鳴＋細小回彈 */
  function clack(t,{pitch=1,vol=1,heavy=0}={}){
    vol*=1.7;const p=pitch*(.96+Math.random()*.08);
    noiseHit(t,{freq:2200*p,q:1.5,vol:.5*vol,decay:.045});
    noiseHit(t,{freq:5000*p,q:3,vol:.15*vol,decay:.016});
    tone(t,860*p,690*p,.2*vol,.055);
    tone(t,1700*p,1480*p,.07*vol,.03,'triangle');
    tone(t,170*p+heavy*20,85,(.24+heavy*.2)*vol,.12+heavy*.05);
    noiseHit(t+.05,{freq:2700*p,q:2,vol:.09*vol,decay:.025});
    tone(t+.05,900*p,760*p,.045*vol,.03)}
  /* 兩顆硬木棋子相撞：短、亮、清脆的「喀」，帶一點回彈的二次碰撞 */
  function knock(t,vol=1){
    noiseHit(t,{freq:3600,q:4,vol:.75*vol,decay:.022});
    noiseHit(t,{freq:7200,q:2,vol:.32*vol,decay:.012});
    tone(t,2650,2500,.42*vol,.045);tone(t,4100,3950,.2*vol,.03);tone(t,1320,1240,.24*vol,.06,'triangle');
    tone(t,190,95,.32*vol,.13);
    noiseHit(t+.034,{freq:3900,q:5,vol:.25*vol,decay:.016});tone(t+.034,2750,2600,.13*vol,.03);
    noiseHit(t+.058,{freq:4200,q:5,vol:.1*vol,decay:.012})}
  /* 被吃的棋子沿著棋盤滑出去 */
  function slide(t,dur=.42,vol=.5){
    const s=ctx.createBufferSource();s.buffer=noise();const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(900,t);f.frequency.linearRampToValueAtTime(650,t+dur);f.Q.value=.9;
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.09*vol,t+.04);g.gain.linearRampToValueAtTime(.05*vol,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f).connect(g).connect(sfxBus);s.start(t,Math.random());s.stop(t+dur+.05)}
  /* 京劇小鑼：亮、脆、敲下後音高往上揚 */
  function luo(t,vol=1,out=sfxBus){
    const base=780,parts=[[1,1,1.25],[1.465,.62,1],[2.09,.55,.85],[2.57,.42,.7],[3.18,.34,.55],[3.9,.26,.45],[4.66,.2,.35],[5.52,.14,.28],[6.4,.1,.22]];
    for(const [r,a,d] of parts)for(const det of [1,1.0045]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
      o.frequency.setValueAtTime(base*r*det*.94,t);o.frequency.exponentialRampToValueAtTime(base*r*det*1.05,t+.13);o.frequency.setValueAtTime(base*r*det*1.05,t+.14);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(a*.15*vol,t+.0015);g.gain.exponentialRampToValueAtTime(a*.07*vol,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g).connect(out);o.start(t);o.stop(t+d+.05)}
    noiseHit(t,{freq:7500,q:.7,vol:.55*vol,decay:.035,type:'highpass',out});
    noiseHit(t,{freq:3200,q:1.2,vol:.28*vol,decay:.09,out});
    tone(t,3100,3000,.18*vol,.012,'sine',out)}
  function bigGong(t,vol=1){
    const base=150;[[1,.3],[1.41,.18],[2.03,.12],[2.71,.08],[3.6,.05],[4.9,.03]].forEach(([r,v],i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(base*r*1.02,t);o.frequency.exponentialRampToValueAtTime(base*r*.97,t+2.4);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*vol,t+.02+i*.03);g.gain.exponentialRampToValueAtTime(.0001,t+2.6);o.connect(g).connect(sfxBus);o.start(t);o.stop(t+2.7)});
    noiseHit(t,{freq:1200,q:.6,vol:.3*vol,decay:.4})}
  function drum(t,vol=1,out=sfxBus){tone(t,140,66,.55*vol,.2,'sine',out);noiseHit(t,{freq:500,q:1,vol:.22*vol,decay:.06,type:'lowpass',out})}
  function muyu(t,vol=.4,out=sfxBus){tone(t,880,810,vol,.06,'sine',out);noiseHit(t,{freq:1800,q:5,vol:vol*.25,decay:.015,out})}
  function bell(t,f=2350,vol=.05,out=musicBus){[[1,1,1.6],[2.76,.4,.9],[5.4,.18,.5]].forEach(([r,a,d])=>tone(t,f*r,f*r,vol*a,d,'sine',out,.002))}

  /* ---------- 竹笛 ---------- */
  function diziWave(){if(wave)return wave;const amp=[0,1,.46,.33,.2,.15,.09,.065,.04,.028,.018,.012,.008],re=new Float32Array(amp.length),im=new Float32Array(amp.length);amp.forEach((a,i)=>im[i]=a);wave=ctx.createPeriodicWave(re,im);return wave}
  function buzzCurve(){if(curve)return curve;const n=1024;curve=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;curve[i]=Math.tanh(5*x+.35)-Math.tanh(.35)}return curve}
  function makeFlute(out){
    const osc=ctx.createOscillator();osc.setPeriodicWave(diziWave());osc.frequency.value=440;
    const lfo=ctx.createOscillator();lfo.frequency.value=5.4;const lfoG=ctx.createGain();lfoG.gain.value=0;lfo.connect(lfoG).connect(osc.frequency);
    const body=ctx.createBiquadFilter();body.type='peaking';body.frequency.value=1250;body.Q.value=1.1;body.gain.value=3;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5600;lp.Q.value=.4;
    const sh=ctx.createWaveShaper();sh.curve=buzzCurve();const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2600;const bz=ctx.createGain();bz.gain.value=.11;
    const amp=ctx.createGain();amp.gain.value=0;
    osc.connect(body).connect(lp).connect(amp);osc.connect(sh).connect(hp).connect(bz).connect(amp);amp.connect(out);
    const n=ctx.createBufferSource();n.buffer=noise();n.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=2.5;bp.frequency.value=1600;
    const air=ctx.createBiquadFilter();air.type='highpass';air.frequency.value=5500;const ng=ctx.createGain();ng.gain.value=0;
    n.connect(bp).connect(ng);n.connect(air).connect(ng);ng.connect(out);
    osc.start();lfo.start();n.start();
    return {osc,lfoG,amp,ng,bp,stop(t){[osc,lfo,n].forEach(x=>{try{x.stop(t)}catch(e){}})}}}
  function fluteNote(v,t,f,d,{vol=.15,slur=false,grace=0,stacc=false}={}){
    const fr=v.osc.frequency,a=v.amp.gain,ng=v.ng.gain,start=grace?t-.06:t;
    if(!slur){a.setTargetAtTime(.0001,start-.03,.007);a.setTargetAtTime(vol*1.2,start,.01);a.setTargetAtTime(vol,start+.07,.06);ng.setTargetAtTime(vol*.5,start,.005);ng.setTargetAtTime(vol*.05,start+.04,.05)}
    else{a.setTargetAtTime(vol,t,.03);ng.setTargetAtTime(vol*.05,t,.05)}
    if(grace){fr.setValueAtTime(grace,start);fr.setTargetAtTime(f,t,.005)}
    else if(slur)fr.setTargetAtTime(f,t,.016);
    else{fr.setValueAtTime(f*.983,t);fr.setTargetAtTime(f,t,.016)}
    v.bp.frequency.setTargetAtTime(f*2,t,.02);
    v.lfoG.gain.setTargetAtTime(0,t,.01);if(d>.34&&!stacc)v.lfoG.gain.setTargetAtTime(f*.012,t+Math.min(.22,d*.4),.12);
    if(stacc){a.setTargetAtTime(.0001,t+d*.55,.02);ng.setTargetAtTime(.0001,t+d*.55,.02)}}
  function fluteRest(v,t){v.amp.gain.setTargetAtTime(.0001,t,.05);v.ng.gain.setTargetAtTime(.0001,t,.04);v.lfoG.gain.setTargetAtTime(0,t,.05)}

  /* ---------- 伴奏 ---------- */
  function pad(t,freqs,dur,vol,bright){
    for(const f of freqs)for(const det of [-7,7]){const o=ctx.createOscillator(),lp=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;
      lp.type='lowpass';lp.frequency.value=bright?1500:820;lp.Q.value=.3;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(.5,dur*.3));g.gain.setValueAtTime(vol,t+dur*.8);g.gain.linearRampToValueAtTime(.0001,t+dur+.35);
      o.connect(lp).connect(g).connect(musicBus);o.start(t);o.stop(t+dur+.4)}}
  function ruan(t,f,vol=.14){const o=ctx.createOscillator(),o2=ctx.createOscillator(),lp=ctx.createBiquadFilter(),g=ctx.createGain();o.type='triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*2;
    lp.type='lowpass';lp.frequency.setValueAtTime(1800,t);lp.frequency.exponentialRampToValueAtTime(500,t+.25);env(g,t,vol,.004,.9);const g2=ctx.createGain();g2.gain.value=.25;
    o.connect(lp);o2.connect(g2).connect(lp);lp.connect(g).connect(musicBus);[o,o2].forEach(x=>{x.start(t);x.stop(t+1)});noiseHit(t,{freq:2500,q:2,vol:vol*.25,decay:.012,out:musicBus})}

  /* ---------- 譜（簡譜：1=G，' 高八度，, 低八度；e 八分、q 四分、h 二分、w 全音符、. 附點；0 休止） ---------- */
  const SEC={
    A :'3e 5e 6e 1\'e 6q 5q | 3q. 2e 1h | 2e 3e 5e 6e 5q 3q | 2h. 0q',
    A2:'3e 5e 6e 1\'e 6q 5q | 3q 2q 1q 6,q | 5,e 6,e 1e 2e 3q 2e 1e | 1w',
    B :'5e 6e 1\'e 2\'e 1\'q 6q | 5q. 6e 5q 3q | 2e 3e 5q 6e 1\'e 6q | 5w',
    B2:'6e 1\'e 6e 5e 3q 5q | 6q. 5e 3q 2q | 1e 2e 3e 5e 2q 3e 2e | 1h. 0q',
    C :'6,q 1e 2e 3q 2e 1e | 6,h. 0q | 3q 5e 6e 5q 3e 2e | 3w',
    C2:'5q 3e 5e 6q 5e 3e | 2q. 3e 1q 6,q | 2e 3e 1e 2e 6,q 5,q | 6,w'};
  const ROOTS={A:[1,6,2,5],A2:[1,6,5,1],B:[5,6,2,5],B2:[6,6,2,1],C:[6,1,2,6],C2:[5,2,1,6]};
  const FORM=['A','A2','B','B2','C','C2','B','B2'];
  const SEMI={1:0,2:2,3:4,5:7,6:9},LEN={e:.5,q:1,h:2,w:4},PENT=[0,2,4,7,9];
  const midi=(d,oct)=>67+SEMI[d]+12*oct,hz=m=>440*Math.pow(2,(m-69)/12);
  const stepPent=(m,dir)=>{for(let k=1;k<5;k++){const x=m+dir*k;if(PENT.includes(((x-67)%12+12)%12))return x}return m};
  function parse(str){const out=[];for(const tok of str.replace(/\|/g,' ').split(/\s+/).filter(Boolean)){const r=/^([0-7])([',]*)([eqhw])(\.?)$/.exec(tok);if(!r)continue;
    const oct=(r[2].match(/'/g)||[]).length-(r[2].match(/,/g)||[]).length,len=LEN[r[3]]*(r[4]?1.5:1);out.push(r[1]==='0'?{rest:1,len}:{m:midi(+r[1],oct),len})}return out}
  function buildLoop(){
    const ev=[];let beat=0;
    for(const name of FORM){const notes=parse(SEC[name]),roots=ROOTS[name],up=loopNo%2===1&&name[0]==='B'&&Math.random()<.5?12:0;
      for(let bar=0;bar<4;bar++){const rm=midi(roots[bar],-2);ev.push({beat:beat+bar*4,pad:[hz(rm),hz(rm+7),hz(rm+12)],len:4});ev.push({beat:beat+bar*4,ruan:hz(rm)});ev.push({beat:beat+bar*4+2,ruan:hz(rm+7),soft:1})}
      ev.push({beat,bell:1});
      let b=beat,pairStart=true;
      for(let i=0;i<notes.length;i++){const n=notes[i];
        if(n.rest){ev.push({beat:b,rest:1});b+=n.len;pairStart=true;continue}
        const m=n.m+up,short=n.len<=.5,slur=short&&!pairStart&&notes[i-1]&&!notes[i-1].rest&&notes[i-1].len<=.5;
        const grace=n.len>=1.5&&Math.random()<.55?hz(stepPent(m,1)):0;
        if(n.len===1&&!grace&&Math.random()<.16&&loopNo>0){const nb=stepPent(m,Math.random()<.5?1:-1);ev.push({beat:b,m:hz(m),len:.5});ev.push({beat:b+.5,m:hz(nb),len:.5,slur:1})}
        else ev.push({beat:b,m:hz(m),len:n.len,slur:slur?1:0,grace});
        pairStart=short?!pairStart:true;b+=n.len}
      beat+=16}
    ev.sort((a,b)=>a.beat-b.beat);loopLen=beat;loopNo++;return ev}

  function scheduleEvent(e,t,spb){
    if(e.pad){pad(t,e.pad,e.len*spb,tense?.012:.014,tense);return}
    if(e.ruan){ruan(t,e.ruan,e.soft?.07:.1);return}
    if(e.bell){bell(t);bell(t+spb*.5,2350*1.122,.03);return}
    if(!flute)return;
    if(e.rest){fluteRest(flute,t);return}
    fluteNote(flute,t,e.m,e.len*spb,{vol:.17,slur:!!e.slur,grace:e.grace,stacc:tense&&e.len<=.5&&!e.slur})}
  function percussion(t,beatPos){
    if(!tense)return;const sub=Math.round(beatPos*2)%8;
    drum(t,sub%4===0?.5:sub%2===0?.32:.2,musicBus);if(sub%2===1)muyu(t,.13,musicBus);
    if(sub===0&&Math.round(beatPos)%8===0)luo(t,.18,musicBus)}
  function schedule(){
    if(!ctx||!musicOn)return;
    if(document.hidden){if(flute)fluteRest(flute,ctx.currentTime);schedTime=Math.max(schedTime,ctx.currentTime+.15);return}
    if(schedTime<ctx.currentTime)schedTime=ctx.currentTime+.08;
    const horizon=ctx.currentTime+.3;
    while(schedTime<horizon){
      if(!score.length){score=buildLoop();evIdx=0;schedBeat=0}
      bpm+=(targetBpm-bpm)*.12;const spb=60/bpm,step=.5,end=schedBeat+step;
      while(evIdx<score.length&&score[evIdx].beat<end){const e=score[evIdx++];scheduleEvent(e,schedTime+(e.beat-schedBeat)*spb,spb)}
      percussion(schedTime,schedBeat);
      schedTime+=step*spb;schedBeat=end;
      if(schedBeat>=loopLen&&evIdx>=score.length)score=[];
    }}
  function music(on){
    musicOn=!!on;if(!init())return;
    const t=ctx.currentTime;musicBus.gain.cancelScheduledValues(t);musicBus.gain.setValueAtTime(musicBus.gain.value,t);
    if(musicOn){unlock();musicBus.gain.linearRampToValueAtTime(.6,t+.8);
      if(!timer){flute=makeFlute(musicBus);score=[];evIdx=0;schedBeat=0;loopNo=0;bpm=targetBpm=tense?TENSE_BPM:BASE_BPM;schedTime=t+.2;timer=setInterval(schedule,70);schedule()}}
    else{musicBus.gain.linearRampToValueAtTime(0,t+.5);clearInterval(timer);timer=0;const old=musicBus,f=flute;flute=null;
      setTimeout(()=>{if(f)f.stop(ctx.currentTime);if(!musicOn&&old===musicBus){old.disconnect();newMusicBus()}},650)}}
  function tension(on){tense=on?1:0;targetBpm=on?TENSE_BPM:BASE_BPM}

  /* ---------- 音效入口 ---------- */
  function diziPhrase(t,notes,vol=.16){const v=makeFlute(sfxBus);let tt=t;notes.forEach(([m,len,slur])=>{fluteNote(v,tt,hz(m),len,{vol,slur});tt+=len});fluteRest(v,tt);v.stop(tt+.6)}
  function sfx(type){
    if(!init())return;unlock();const t=ctx.currentTime+.01;
    switch(type){
      case 'tap':noiseHit(t,{freq:3600,q:3,vol:.16,decay:.018});tone(t,1300,1150,.05,.025);break;
      case 'select':noiseHit(t,{freq:4200,q:3,vol:.12,decay:.015});break;
      case 'lift':noiseHit(t,{freq:2600,q:2,vol:.07,decay:.02});break;
      case 'move':clack(t);break;
      case 'knock':knock(t);break;
      case 'slide':slide(t);break;
      case 'capture':knock(t);clack(t+.02,{pitch:.9,vol:.6,heavy:1});break;
      case 'check':luo(t,1.15);break;
      case 'wrong':muyu(t,.32);muyu(t+.13,.26);break;
      case 'lesson':bell(t,2350,.09,sfxBus);diziPhrase(t+.05,[[74,.18],[76,.18,1],[79,.5]]);break;
      case 'win':[0,.16,.32,.4,.48].forEach((d,i)=>drum(t+d,i>2?.65:.9));luo(t+.24,.8);bigGong(t+1.0,.85);
        diziPhrase(t+.62,[[74,.13],[76,.13,1],[79,.13,1],[81,.13,1],[83,.26],[86,.9]]);break;
      case 'lose':diziPhrase(t,[[76,.4],[74,.4,1],[71,.4],[69,.4,1],[67,1.2]],.13);bigGong(t+1.6,.4);break;
      case 'draw':diziPhrase(t,[[74,.3],[76,.3,1],[74,.3],[71,.8]],.13);luo(t+1.4,.45);break;
      case 'mate':drum(t,1);drum(t+.12,.8);bigGong(t+.24,1);break;
      default:noiseHit(t,{freq:3000,q:3,vol:.1,decay:.02});
    }}
  window.XiangqiAudio={sfx,music,unlock,tension};
})();
