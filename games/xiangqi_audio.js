/* 鳩特象棋音效與配樂：全部以 Web Audio 即時合成，不需下載音檔。
   - 落子／吃子：木質棋子敲擊棋盤（帶通雜訊＋木體共鳴＋落地回彈）
   - 將軍：京劇小鑼（音高上揚）＋堂鼓
   - 勝負：鑼鼓點＋古箏刮奏
   - 配樂：Karplus-Strong 撥弦合成的古箏，五聲音階生成式樂句，搭配簫的長音與殘響 */
(function(){
  'use strict';
  let ctx=null,master,sfxBus,musicBus,revSend,rev,noiseBuf=null;
  const plucks=new Map();
  let musicOn=false,timer=0,nextTime=0,queue=[],phraseNo=0,section=null;

  function init(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    try{ctx=new AC()}catch(e){return null}
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.2;
    master=ctx.createGain();master.gain.value=.75;master.connect(comp).connect(ctx.destination);
    rev=ctx.createConvolver();rev.buffer=impulse(2.6,2.4);const revOut=ctx.createGain();revOut.gain.value=.55;rev.connect(revOut).connect(master);
    sfxBus=ctx.createGain();sfxBus.gain.value=1;sfxBus.connect(master);
    revSend=ctx.createGain();revSend.gain.value=.16;sfxBus.connect(revSend).connect(rev);
    newMusicBus();
    return ctx;
  }
  function newMusicBus(){musicBus=ctx.createGain();musicBus.gain.value=0;musicBus.connect(master);const send=ctx.createGain();send.gain.value=.5;musicBus.connect(send).connect(rev)}
  function unlock(){const a=init();if(a&&a.state==='suspended')a.resume().catch(()=>{});return a}
  function impulse(sec,decay){const r=ctx.sampleRate,n=Math.floor(r*sec),b=ctx.createBuffer(2,n,r);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<n;i++){const x=Math.random()*2-1;lp+= (x-lp)*.55;d[i]=lp*Math.pow(1-i/n,decay)*(i<r*.012?i/(r*.012):1)}}return b}
  function noise(){if(noiseBuf)return noiseBuf;const n=ctx.sampleRate*1.2;noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return noiseBuf}

  /* ---------- 打擊類 ---------- */
  function env(g,t,peak,attack,decay){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay)}
  function noiseHit(t,{freq=2000,q=2,vol=.5,decay=.05,type='bandpass',out=sfxBus}={}){
    const s=ctx.createBufferSource();s.buffer=noise();s.playbackRate.value=.8+Math.random()*.4;
    const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();env(g,t,vol,.0015,decay);
    s.connect(f).connect(g).connect(out);s.start(t,Math.random()*.5);s.stop(t+decay+.05)}
  function body(t,f0,f1,vol,decay,type='sine',out=sfxBus){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+decay);
    env(g,t,vol,.002,decay);o.connect(g).connect(out);o.start(t);o.stop(t+decay+.05)}
  /* 木質棋子落在棋盤上：清脆的「啪」＋木體共鳴＋一次細小回彈 */
  function clack(t,{pitch=1,vol=1,heavy=0}={}){
    vol*=1.8;const p=pitch*(.96+Math.random()*.08);
    noiseHit(t,{freq:2300*p,q:1.6,vol:.55*vol,decay:.045});
    noiseHit(t,{freq:5200*p,q:3,vol:.18*vol,decay:.018});
    body(t,880*p,700*p,.22*vol,.055,'sine');
    body(t,1730*p,1500*p,.07*vol,.03,'triangle');
    body(t,170*p+heavy*20,85,(.22+heavy*.18)*vol,.11+heavy*.05,'sine');
    noiseHit(t+.052,{freq:2800*p,q:2,vol:.1*vol,decay:.025});
    body(t+.052,900*p,760*p,.05*vol,.03,'sine');
  }
  /* 京劇小鑼：敲下後音高往上揚 */
  function smallGong(t,vol=1){
    const base=640;[[1,.28],[1.52,.12],[2.24,.07],[2.92,.04]].forEach(([r,v])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(base*r*.93,t);o.frequency.linearRampToValueAtTime(base*r*1.06,t+.22);
      env(g,t,v*vol,.004,1.1);o.connect(g).connect(sfxBus);o.start(t);o.stop(t+1.2)});
    noiseHit(t,{freq:4500,q:.8,vol:.25*vol,decay:.12})}
  /* 大鑼：低沉、音高略往下滑、尾音長 */
  function bigGong(t,vol=1){
    const base=150;[[1,.3],[1.41,.18],[2.03,.12],[2.71,.08],[3.6,.05],[4.9,.03]].forEach(([r,v],i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(base*r*1.02,t);o.frequency.exponentialRampToValueAtTime(base*r*.97,t+2.4);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*vol,t+.02+i*.03);g.gain.exponentialRampToValueAtTime(.0001,t+2.6);o.connect(g).connect(sfxBus);o.start(t);o.stop(t+2.7)});
    noiseHit(t,{freq:1200,q:.6,vol:.3*vol,decay:.4})}
  function drum(t,vol=1){body(t,128,62,.55*vol,.22,'sine');noiseHit(t,{freq:420,q:1,vol:.25*vol,decay:.08,type:'lowpass'})}
  function block(t,f=820,vol=.4){body(t,f,f*.92,vol,.07,'sine');noiseHit(t,{freq:f*2,q:4,vol:vol*.3,decay:.02})}

  /* ---------- 撥弦（古箏）：Karplus-Strong ---------- */
  function pluckBuffer(freq){
    const key=Math.round(freq);if(plucks.has(key))return plucks.get(key);
    const sr=ctx.sampleRate,dur=freq<200?3.2:2.4,len=Math.floor(sr*dur),N=Math.max(2,Math.round(sr/freq-.5));
    const buf=ctx.createBuffer(1,len,sr),d=buf.getChannelData(0),ring=new Float32Array(N);
    for(let i=0;i<N;i++)ring[i]=Math.random()*2-1;
    for(let k=0;k<2;k++)for(let i=0;i<N;i++)ring[i]=(ring[i]*.6+ring[(i+1)%N]*.4); // 指甲撥弦：略帶明亮
    const pick=Math.floor(N*.13);for(let i=N-1;i>=pick;i--)ring[i]-=ring[i-pick]*.7; // 撥弦位置靠近岳山
    const decay=Math.min(.9995,.9985-freq/90000*.7+.0009);let idx=0,mx=0;
    for(let i=0;i<len;i++){const a=ring[idx],b=ring[(idx+1)%N];d[i]=a;ring[idx]=(a+b)*.5*decay;idx=(idx+1)%N;if(i<N*4)mx=Math.max(mx,Math.abs(a))}
    const s=1/(mx||1);for(let i=0;i<len;i++)d[i]*=s;
    plucks.set(key,buf);return buf}
  function pluck(t,freq,{vol=.3,bend=0,dur=2.2,out}={}){
    const s=ctx.createBufferSource();s.buffer=pluckBuffer(freq);
    if(bend){s.playbackRate.setValueAtTime(1,t+.12);s.playbackRate.linearRampToValueAtTime(Math.pow(2,bend/12),t+.32);s.playbackRate.linearRampToValueAtTime(1,t+.7)}
    const body=ctx.createBiquadFilter();body.type='peaking';body.frequency.value=260;body.Q.value=1;body.gain.value=4;
    const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=Math.min(9000,freq*9);
    const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.setValueAtTime(vol,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(body).connect(tone).connect(g).connect(out||sfxBus);s.start(t);s.stop(t+dur+.05)}
  /* 簫：柔和長音，帶氣聲與遲到的顫音 */
  function xiao(t,freq,len,vol=.05){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=ctx.createGain(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='triangle';o2.type='sine';o.frequency.value=freq;o2.frequency.value=freq*2;lfo.frequency.value=4.8;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(freq*.006,t+Math.min(len*.6,1.2));
    lfo.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);f.type='lowpass';f.frequency.value=freq*3.2;
    const g2=ctx.createGain();g2.gain.value=.18;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.35);g.gain.setValueAtTime(vol,t+len-.5);g.gain.exponentialRampToValueAtTime(.0001,t+len+.4);
    o.connect(f);o2.connect(g2).connect(f);f.connect(g).connect(musicBus);
    const n=ctx.createBufferSource();n.buffer=noise();const nf=ctx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=freq*2;nf.Q.value=6;const ng=ctx.createGain();
    ng.gain.setValueAtTime(.0001,t);ng.gain.exponentialRampToValueAtTime(vol*.35,t+.2);ng.gain.exponentialRampToValueAtTime(.0001,t+len+.3);n.connect(nf).connect(ng).connect(musicBus);
    [o,o2,lfo].forEach(x=>{x.start(t);x.stop(t+len+.5)});n.loop=true;n.start(t);n.stop(t+len+.4)}

  /* ---------- 音階：G 宮五聲（宮商角徵羽 = G A B D E） ---------- */
  const hz=m=>440*Math.pow(2,(m-69)/12);
  const PENT=[];for(let o=2;o<=6;o++)for(const s of [7,9,11,14,16])PENT.push(12*o+s); // 由 G2 起
  const deg=i=>hz(PENT[Math.max(0,Math.min(PENT.length-1,i))]);
  const HOME=10; // G4

  /* ---------- 音效入口 ---------- */
  function sfx(type){
    if(!init())return;unlock();const t=ctx.currentTime+.01;
    switch(type){
      case 'tap':noiseHit(t,{freq:3600,q:3,vol:.16,decay:.018});body(t,1300,1150,.05,.025);break;
      case 'move':clack(t);break;
      case 'capture':clack(t,{pitch:.92,vol:1.15,heavy:1});clack(t+.07,{pitch:1.18,vol:.45});noiseHit(t+.02,{freq:900,q:.7,vol:.12,decay:.18});break;
      case 'check':clack(t);drum(t+.09,.8);smallGong(t+.2,.9);break;
      case 'wrong':block(t,560,.32);block(t+.13,470,.26);break;
      case 'select':noiseHit(t,{freq:4200,q:3,vol:.12,decay:.015});break;
      case 'lesson':[0,2,4].forEach((s,i)=>pluck(t+i*.11,deg(HOME+s),{vol:.28}));pluck(t+.4,deg(HOME+5),{vol:.32,dur:2.4});break;
      case 'win':{
        [0,.16,.32,.4,.48].forEach((d,i)=>drum(t+d,i>2?.65:.9));smallGong(t+.24,.6);
        for(let i=0;i<9;i++)pluck(t+.62+i*.045,deg(HOME-4+i),{vol:.2,dur:1.6});
        bigGong(t+1.06,.9);[5,7,9].forEach((s,i)=>pluck(t+1.1+i*.2,deg(HOME+s-4),{vol:.3,dur:2.6}));break}
      case 'lose':{
        [3,2,0,-1,-3].forEach((s,i)=>pluck(t+i*.32,deg(HOME+s),{vol:.26,dur:2.4,bend:i===4?-1:0}));bigGong(t+1.6,.45);break}
      case 'draw':[0,2,1,0].forEach((s,i)=>pluck(t+i*.26,deg(HOME+s),{vol:.24,dur:2}));smallGong(t+1.05,.4);break;
      case 'mate':drum(t,1);drum(t+.12,.8);bigGong(t+.24,1);break;
      default:noiseHit(t,{freq:3000,q:3,vol:.1,decay:.02});
    }
  }

  /* ---------- 生成式古箏配樂 ---------- */
  const RHYTHMS=[[2,2,2,2],[3,1,2,2],[2,1,1,4],[4,2,2],[1,1,2,4],[2,2,4],[3,1,4],[2,1,1,2,2]];
  const BASS=[[0,3],[0,2],[3,1],[4,0],[2,0],[3,0]]; // 每兩小節的低音：宮、徵、角、羽…（以 PENT 索引表示）
  const rnd=a=>a[Math.random()*a.length|0];
  function walk(cur,len,lo,hi){const out=[];for(let i=0;i<len;i++){const r=Math.random();let step=r<.34?1:r<.68?-1:r<.8?2:r<.92?-2:r<.96?3:-3;if(cur+step<lo||cur+step>hi)step=-step;cur+=step;out.push(cur)}return out}
  function makeSection(){
    const r1=rnd(RHYTHMS),r2=rnd(RHYTHMS),start=HOME+rnd([-2,-1,0,1,2]);
    return {r1,r2,motif:walk(start,r1.length,HOME-3,HOME+5)}}
  function buildPhrase(){
    // 兩小節一句；四句一段，第 1、3 句用同一動機（換高度），第 2 句收在徵、第 4 句收在宮
    if(phraseNo%4===0)section=makeSection();
    const n=phraseNo%4,eighth=60/66/2,notes=[];let t=0;
    const shift=n===2?rnd([1,2,-1]):0;
    const bar1=n===1||n===3?walk(section.motif.at(-1)+shift,section.r2.length,HOME-3,HOME+6):section.motif.map(x=>x+shift);
    const rhy1=n===1||n===3?section.r2:section.r1;
    rhy1.forEach((d,i)=>{notes.push({t,f:deg(bar1[i]),dur:d,v:i===0?.3:.24,bend:d>=3&&Math.random()<.35?rnd([1,2]):0});t+=d});
    const target=n===3?HOME:n===1?HOME-2:HOME+rnd([0,2,3]),r2=rnd([[2,2,4],[1,1,2,4],[3,1,4],[2,6],[8]]);
    let cur=bar1.at(-1);const path=[];for(let i=0;i<r2.length-1;i++){cur+=Math.sign(target-cur)*(Math.abs(target-cur)>2?2:1)||rnd([1,-1]);path.push(cur)}path.push(target);
    r2.forEach((d,i)=>{const last=i===r2.length-1;notes.push({t,f:deg(path[i]),dur:d,v:last?.28:.22,trem:last&&d>=6&&Math.random()<.45,bend:last&&n!==3&&Math.random()<.3?-1:0});t+=d});
    const bass=rnd(BASS);bass.forEach((b,i)=>{notes.push({t:i*8,f:deg(b+(i?0:0)),dur:8,v:.2,low:1});notes.push({t:i*8+4,f:deg(b+3),dur:4,v:.1,low:1})});
    if(n===0&&phraseNo%8===0)notes.push({t:0,gliss:1});
    if(n===2&&Math.random()<.7)notes.push({t:0,xiao:deg(HOME-5+rnd([0,1,3])),len:16*eighth});
    phraseNo++;return {notes,len:16,eighth}}
  function schedule(){
    if(!ctx||!musicOn)return;
    if(document.hidden){nextTime=Math.max(nextTime,ctx.currentTime+.2);return}
    if(nextTime<ctx.currentTime)nextTime=ctx.currentTime+.1;
    while(nextTime<ctx.currentTime+1.2){
      const ph=buildPhrase(),e=ph.eighth;
      for(const n of ph.notes){const at=nextTime+n.t*e;
        if(n.gliss){for(let i=0;i<10;i++)pluck(at+i*.038,deg(HOME-6+i),{vol:.08,dur:1.6,out:musicBus});continue}
        if(n.xiao){xiao(at,n.xiao,n.len,.045);continue}
        if(n.trem){const d=n.dur*e;for(let k=0;k*0.085<d;k++)pluck(at+k*.085,n.f,{vol:n.v*(k?.45:1),dur:k*0.085+.6<d?.35:1.8,out:musicBus});continue}
        pluck(at,n.low?n.f:n.f,{vol:n.low?n.v*.8:n.v,bend:n.bend||0,dur:n.low?3:Math.max(1.4,n.dur*e*1.3),out:musicBus})}
      nextTime+=ph.len*e+(phraseNo%4===0?e*2:0);
    }
  }
  function music(on){
    musicOn=!!on;
    if(!init())return;
    const t=ctx.currentTime;musicBus.gain.cancelScheduledValues(t);musicBus.gain.setValueAtTime(musicBus.gain.value,t);
    if(musicOn){unlock();musicBus.gain.linearRampToValueAtTime(.95,t+.6);if(!timer){nextTime=t+.25;phraseNo=0;timer=setInterval(schedule,200);schedule()}}
    else{musicBus.gain.linearRampToValueAtTime(0,t+.5);clearInterval(timer);timer=0;
      const old=musicBus;setTimeout(()=>{if(!musicOn&&old===musicBus){old.disconnect();newMusicBus()}},700)}
  }
  window.XiangqiAudio={sfx,music,unlock};
})();
