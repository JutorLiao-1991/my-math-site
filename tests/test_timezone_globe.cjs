const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../junior/geography/timezone_core.js');
test('four seasonal presets have the correct subsolar latitude and overhead sunlight',()=>{
  assert.deepEqual(C.seasons.map(s=>[s.id,s.declination]),[['spring',0],['summer',23.44],['autumn',0],['winter',-23.44]]);
  const t=C.fromLocal('2026-10-20',720,0);
  for(const s of C.seasons){const v=C.solarVector(t,s.declination);assert.ok(Math.abs(Math.hypot(v.x,v.y,v.z)-1)<1e-12);assert.ok(Math.abs(C.solarCosine(C.sunLongitude(t),s.declination,t,s.declination)-1)<1e-12);}
});
test('solstice illumination produces polar day and night at every longitude and time',()=>{
  const start=C.fromLocal('2026-10-20',0,0);
  for(let minutes=0;minutes<1440;minutes+=60)for(let lon=-180;lon<180;lon+=15){const t=start+minutes*C.MINUTE;
    assert.ok(C.solarCosine(lon,75,t,23.44)>0);assert.ok(C.solarCosine(lon,-75,t,23.44)<0);
    assert.ok(C.solarCosine(lon,75,t,-23.44)<0);assert.ok(C.solarCosine(lon,-75,t,-23.44)>0);
  }
});
test('latitude-dependent day length matches the horizon crossings and hemispheric symmetry',()=>{
  for(const lat of [-80,-70,-60,-25,0,25,60,70,80]){
    assert.ok(Math.abs(C.dayLengthHours(lat,0)-12)<1e-10);
    assert.ok(Math.abs(C.dayLengthHours(lat,23.44)+C.dayLengthHours(-lat,23.44)-24)<1e-10);
    if(Math.abs(lat)<66.56){const halfAngle=C.dayLengthHours(lat,23.44)/24*180,t=C.fromLocal('2026-10-20',720,0);assert.ok(Math.abs(C.solarCosine(halfAngle,lat,t,23.44))<1e-10);}
  }
  assert.equal(C.dayLengthHours(75,23.44),24);assert.equal(C.dayLengthHours(75,-23.44),0);
  assert.equal(C.dayLengthHours(-90,-23.44),24);assert.equal(C.dayLengthHours(90,0),null);
  const t=C.fromLocal('2026-10-20',720,0);assert.ok(C.solarCosine(95,60,t,23.44)>0);assert.ok(C.solarCosine(95,-60,t,23.44)<0);
});
test('globe and flat-map renderers both reverse polar lighting between solstices',()=>{
  const fs=require('node:fs'),vm=require('node:vm');
  const context=()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},arc(){},drawImage(){},setLineDash(){},fillText(){},strokeText(){},createRadialGradient(){return {addColorStop(){}};},measureText(s){return {width:s.length*8};},getImageData(x,y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=100;data[i+1]=160;data[i+2]=200;data[i+3]=255;}return {data};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}});
  const canvas=()=>({width:760,height:600,getContext:context,addEventListener(){},getBoundingClientRect(){return {width:760,height:600};}});
  const sandbox={window:{TimezoneCore:C,TimezoneLand:[]},document:{createElement:canvas},ResizeObserver:class{observe(){}}};vm.runInNewContext(fs.readFileSync(require.resolve('../junior/geography/timezone_renderer.js'),'utf8'),sandbox);
  const map=canvas();map.width=900;map.height=270;const r=new sandbox.window.TimezoneRenderer(canvas(),map,()=>{}),t=C.fromLocal('2026-10-20',720,0);r.pitch=80;
  const sample=(lat,lon)=>{const x=Math.floor((lon+180)/360*450),y=Math.floor((90-lat)/180*135);return r.shadeImage.data[(y*450+x)*4+3];};
  r.update({epoch:t,from:'taipei',to:'london',season:'summer'});assert.equal(sample(75,0),0);assert.equal(sample(75,170),0);assert.ok(sample(-75,0)>150);const summerNorth=r.image.data[(195*390+195)*4];
  r.update({epoch:t,from:'taipei',to:'london',season:'winter'});assert.ok(sample(75,0)>150);assert.ok(sample(75,170)>150);assert.equal(sample(-75,0),0);const winterNorth=r.image.data[(195*390+195)*4];assert.ok(summerNorth>winterNorth*2);
  const summerSouth=sample(-75,0);r.pitch=-80;r.update({epoch:t,from:'taipei',to:'london',season:'winter'});assert.equal(sample(-75,0),summerSouth);assert.ok(r.image.data[(195*390+195)*4]>winterNorth*2);
});
test('all city pairs preserve the same instant, including half-hour and +14 offsets',()=>{
  for(const date of ['2026-01-01','2026-12-31','2028-02-29'])for(const a of C.cities)for(const b of C.cities)for(const t of [0,30,720,1439]){
    const instant=C.fromLocal(date,t,a.offset),p=C.parts(instant,b.offset);
    assert.equal(C.fromLocal(p.date,p.hour*60+p.minute,b.offset),instant);
    const e=C.compare(instant,a.offset,b.offset);assert.equal(e.day*1440+e.hour*60+e.minute-t,b.offset-a.offset);
  }
});
test('midnight, year boundaries, half hours and travel retain correct dates',()=>{
  let e=C.compare(C.fromLocal('2026-12-31',23*60,480),480,540);assert.deepEqual([e.to.date,e.hour,e.minute,e.day],['2027-01-01',0,0,1]);
  e=C.compare(C.fromLocal('2026-01-01',0,480),480,-300);assert.deepEqual([e.to.date,e.hour,e.day],['2025-12-31',11,-1]);
  e=C.compare(C.fromLocal('2026-10-20',900,480),480,330);assert.deepEqual([e.hour,e.minute],[12,30]);
  e=C.compare(C.fromLocal('2026-10-20',1320,480),480,-480,780);assert.deepEqual([e.to.date,e.hour,e.day],['2026-10-20',19,0]);
  e=C.compare(C.fromLocal('2026-10-20',1410,-660),-660,840);assert.equal(e.day,2);
});
test('grading identifies missing fields, time errors and date errors separately',()=>{
  const e={day:-1,hour:7,minute:30};assert.deepEqual(C.grade(e,{day:'0',hour:'7',minute:'30'}),{ok:false,timeOK:true,dateOK:false});
  assert.deepEqual(C.grade(e,{day:'-1',hour:'8',minute:'30'}),{ok:false,timeOK:false,dateOK:true});
  assert.equal(C.grade({day:0,hour:0,minute:0},{day:'',hour:'',minute:''}).ok,false);
  assert.equal(C.grade(e,{day:'-1',hour:'7',minute:'30'}).ok,true);
});
test('missions require operation and accept the intended experimental state',()=>{
  for(const m of C.missions){let state={epoch:C.missionStart(m),to:m.to,operated:false};assert.equal(C.checkMission(m,state),false);
    state.operated=true;if(m.id==='offset')state.to='tokyo';if(m.id==='midnight')state.epoch+=60*C.MINUTE;if(m.id==='different')state.epoch=C.fromLocal('2026-10-20',60,480);if(m.id==='flight')state.epoch+=780*C.MINUTE;
    assert.equal(C.checkMission(m,state),true,m.id);
    if(m.id!=='different'){state.epoch+=C.MINUTE;assert.equal(C.checkMission(m,state),false,m.id+' must record requested instant');}
  }
});
test('globe projection round-trips front-facing points at different view angles',()=>{
  for(const yaw of [-179,-70,0,121,179])for(const pitch of [-60,0,50])for(const c of C.cities){const p=C.project(c.lon,c.lat,yaw,pitch);if(p.z<=0)continue;const inv=C.inverse(p.x,p.y,yaw,pitch);assert.ok(Math.abs(C.mod(inv.lon-c.lon+180,360)-180)<1e-7);assert.ok(Math.abs(inv.lat-c.lat)<1e-7);}
  const instant=C.fromLocal('2026-10-20',12*60,0);assert.equal(C.sunLongitude(instant),0);assert.equal(C.sunLongitude(instant+6*60*C.MINUTE),-90);
});
test('generated practice sets use reproducible questions and valid independent answers',()=>{
  for(const kind of ['mixed','concept','conversion','life'])for(let seed=1;seed<30;seed++){
    let x=seed;const rng=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};const qs=C.questionSet(kind,rng);assert.equal(qs.length,10);
    for(const q of qs){if(q.type==='concept'){assert.ok(q.correct>=0&&q.correct<q.options.length);continue;}const a=C.city(q.from),b=C.city(q.to);const d=new Date(q.epoch+(q.duration+b.offset)*60000);assert.equal(q.expected.hour,d.getUTCHours());assert.equal(q.expected.minute,d.getUTCMinutes());const base=new Date(q.epoch+a.offset*60000);const day=Math.floor(d.getTime()/86400000)-Math.floor(base.getTime()/86400000);assert.equal(q.expected.day,day);assert.ok(Math.abs(day)<=2);assert.ok(C.grade(q.expected,{day:String(day),hour:String(d.getUTCHours()),minute:String(d.getUTCMinutes())}).ok);}
  }
});
