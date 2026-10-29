const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../junior/geography/timezone_core.js');
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
