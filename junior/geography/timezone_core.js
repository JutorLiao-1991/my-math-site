(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TimezoneCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const MINUTE=60000,DAY=1440;
  // Fixed STANDARD offsets for this teaching model, deliberately not live civil time.
  const cities=[
    {id:'taipei',name:'台北',lat:25.03,lon:121.56,offset:480},
    {id:'tokyo',name:'東京',lat:35.68,lon:139.69,offset:540},
    {id:'beijing',name:'北京',lat:39.90,lon:116.41,offset:480},
    {id:'singapore',name:'新加坡',lat:1.35,lon:103.82,offset:480},
    {id:'delhi',name:'新德里',lat:28.61,lon:77.21,offset:330},
    {id:'dubai',name:'杜拜',lat:25.20,lon:55.27,offset:240},
    {id:'london',name:'倫敦',lat:51.51,lon:-0.13,offset:0},
    {id:'paris',name:'巴黎',lat:48.86,lon:2.35,offset:60},
    {id:'newyork',name:'紐約',lat:40.71,lon:-74.01,offset:-300},
    {id:'la',name:'洛杉磯',lat:34.05,lon:-118.24,offset:-480},
    {id:'honolulu',name:'檀香山',lat:21.31,lon:-157.86,offset:-600},
    {id:'sydney',name:'雪梨',lat:-33.87,lon:151.21,offset:600},
    {id:'wellington',name:'威靈頓',lat:-41.29,lon:174.78,offset:720},
    {id:'kiritimati',name:'聖誕島（吉里巴斯）',lat:1.87,lon:-157.43,offset:840},
    {id:'pago',name:'帕哥帕哥',lat:-14.28,lon:-170.70,offset:-660}
  ];
  const city=id=>cities.find(c=>c.id===id);
  const mod=(n,m)=>((n%m)+m)%m;
  const pad=n=>String(n).padStart(2,'0');
  function parts(epoch,offset){const d=new Date(epoch+offset*MINUTE);return {date:d.toISOString().slice(0,10),year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),weekday:d.getUTCDay(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),dayIndex:Math.floor((epoch/MINUTE+offset)/DAY)};}
  function fromLocal(date,minutes,offset){return Date.parse(date+'T00:00:00Z')+(minutes-offset)*MINUTE;}
  function utcLabel(offset){if(!offset)return 'UTC±0';const a=Math.abs(offset);return 'UTC'+(offset>0?'+':'−')+Math.floor(a/60)+(a%60?':'+pad(a%60):'');}
  function timeLabel(p){return pad(p.hour)+':'+pad(p.minute);}
  function dateLabel(p){return p.month+'月'+p.day+'日（'+'日一二三四五六'[p.weekday]+'）';}
  function dayDifference(epoch,from,to){return parts(epoch,to).dayIndex-parts(epoch,from).dayIndex;}
  function relativeDay(n){return n===0?'同一天':n===-1?'前一天':n===1?'隔一天':n<0?'前'+(-n)+'天':'後'+n+'天';}
  function deltaLabel(minutes){const a=Math.abs(minutes),s=Math.floor(a/60)+' 小時'+(a%60?' '+a%60+' 分':'');return !minutes?'時間相同':(minutes>0?'快 ':'慢 ')+s;}
  function compare(epoch,from,to,duration=0){const arrival=epoch+duration*MINUTE,a=parts(epoch,from),b=parts(arrival,to);return {epoch:arrival,from:a,to:b,day:b.dayIndex-a.dayIndex,hour:b.hour,minute:b.minute,delta:to-from,duration};}
  function grade(expected,answer){const timeOK=Number(answer.hour)===expected.hour&&Number(answer.minute)===expected.minute&&answer.hour!==''&&answer.minute!=='';
    const dateOK=answer.day!==''&&Number(answer.day)===expected.day;return {ok:timeOK&&dateOK,timeOK,dateOK};}
  // Equinox illustration: solar declination and equation of time are both set to zero.
  function sunLongitude(epoch){const d=new Date(epoch),minutes=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60;return mod(180-minutes/4+180,360)-180;}
  function vector(lon,lat){const a=lon*Math.PI/180,b=lat*Math.PI/180;return {x:Math.cos(b)*Math.sin(a),y:Math.sin(b),z:Math.cos(b)*Math.cos(a)};}
  function project(lon,lat,yaw,pitch){const v=vector(lon-yaw,lat),p=pitch*Math.PI/180;return {x:v.x,y:v.y*Math.cos(p)-v.z*Math.sin(p),z:v.y*Math.sin(p)+v.z*Math.cos(p)};}
  function inverse(x,y,yaw,pitch){const z=Math.sqrt(Math.max(0,1-x*x-y*y)),p=pitch*Math.PI/180,Y=y*Math.cos(p)+z*Math.sin(p),Z=-y*Math.sin(p)+z*Math.cos(p);return {lon:mod(Math.atan2(x,Z)*180/Math.PI+yaw+180,360)-180,lat:Math.asin(Math.max(-1,Math.min(1,Y)))*180/Math.PI};}
  const missions=[
    {id:'instant',title:'同一瞬間',from:'taipei',to:'london',time:15*60,question:'台北下午 3 點，倫敦是幾點？先猜，再轉地球找到倫敦。',predictions:['同樣是 15:00','早上 07:00','晚上 23:00'],instruction:'時間先保持不動。拖曳地球，或按「看比較城市」，觀察倫敦與台北的時鐘。',observation:['倫敦 07:00，台北 15:00，同一天','倫敦比台北快 8 小時','兩座城市都是 15:00'],answer:0,reasons:['轉動視角會改變城市時間','同一瞬間，各地依 UTC 時差顯示不同時間','太陽靠近哪座城市，那裡的時鐘就比較快'],reason:1},
    {id:'offset',title:'誰快誰慢',from:'taipei',to:'dubai',time:15*60,question:'哪座城市比台北快 1 小時？先判斷，再從城市清單找找看。',predictions:['東京','杜拜','倫敦'],instruction:'從比較城市清單選出比台北快 1 小時的城市；保持台北 15:00。',observation:['東京 16:00，比台北快 1 小時','杜拜 16:00，比台北快 1 小時','東京 14:00，比台北慢 1 小時'],answer:0,reasons:['UTC＋9 比 UTC＋8 多 1，所以快 1 小時','所有城市都比台北慢','UTC 數字越大，時間越慢'],reason:0},
    {id:'midnight',title:'跨過午夜',from:'taipei',to:'tokyo',time:22*60,question:'台北 10 月 20 日 22:00，再過 1 小時，東京會是哪一天？',predictions:['仍是 10 月 20 日','變成 10 月 21 日','變成 10 月 19 日'],instruction:'把時間往前推 1 小時，停在東京剛好 00:00 的瞬間，再看兩地日期。',observation:['台北、東京都還是 10 月 20 日','台北 10/20 23:00；東京 10/21 00:00','台北也已經是 10 月 21 日'],answer:1,reasons:['全世界都跟著台北一起換日','東京每天會突然多出 1 小時','每座城市在自己的當地時間 00:00 換日'],reason:2},
    {id:'different',title:'不同的日期',from:'taipei',to:'newyork',time:15*60,question:'台北與紐約，有可能同一瞬間卻不是同一天嗎？',predictions:['不可能，世界日期一定相同','可能，紐約可能還在前一天','可能，但紐約一定是隔一天'],instruction:'調整台北時間，找到「台北是 10/20，紐約仍是 10/19」的一個瞬間。',observation:['找到紐約還在台北的前一天','紐約永遠和台北同一天','只要時間不同，日期就一定不同'],answer:0,reasons:['紐約慢 13 小時，換算時可能跨到前一天','紐約每天只有 11 小時','拖曳地球時會穿越日期'],reason:0},
    {id:'flight',title:'小鳩跨洋旅行',from:'taipei',to:'la',time:22*60,duration:13*60,question:'小鳩 10/20 22:00 從台北出發，飛行 13 小時到洛杉磯。抵達當地是？',predictions:['10/21 11:00','10/20 19:00','10/21 19:00'],instruction:'從出發瞬間向前推進 13 小時。可用「＋6 小時」兩次，再「＋1 小時」，觀察抵達時的洛杉磯。',observation:['洛杉磯 10/20 19:00；台北 10/21 11:00','洛杉磯 10/21 11:00','洛杉磯 10/20 06:00'],answer:0,reasons:['只要減去時差，不用管飛行時間','抵達時間一定是隔一天','先加飛行經過時間，再換成目的地時間'],reason:2}
  ];
  function missionStart(m){return fromLocal('2026-10-20',m.time,city(m.from).offset);}
  function checkMission(m,state){const start=missionStart(m),p=parts(state.epoch,480);if(!state.operated)return false;
    if(m.id==='instant')return state.to==='london'&&state.epoch===start;
    if(m.id==='offset')return state.to==='tokyo'&&state.epoch===start;
    if(m.id==='midnight')return state.to==='tokyo'&&state.epoch===start+60*MINUTE;
    if(m.id==='different')return state.to==='newyork'&&p.date==='2026-10-20'&&dayDifference(state.epoch,480,-300)===-1;
    return state.to==='la'&&state.epoch===start+m.duration*MINUTE;
  }
  function questionSet(kind='mixed',rng=Math.random){const pick=a=>a[Math.floor(rng()*a.length)],shuffled=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
    const concepts=[
      {prompt:'固定同一瞬間，只拖曳地球改變視角，城市時鐘會怎樣？',options:['時間維持不變','拖向東就加 1 小時','所有城市一起變成中午'],correct:0,explain:'拖曳只改變觀察角度；時間滑桿才會改變模擬時刻。'},
      {prompt:'UTC＋9 的東京，和 UTC＋8 的台北相比？',options:['快 1 小時','慢 1 小時','時間相同'],correct:0,explain:'目的地 UTC 時差減出發地 UTC 時差：9 − 8＝＋1 小時。'},
      {prompt:'同一瞬間，台北與紐約的日期一定相同嗎？',options:['不一定，要看換算後是否跨午夜','一定相同','一定不同'],correct:0,explain:'跨過當地午夜才會換日期；有時同一天，有時不同。'},
      {prompt:'把台北時間換成倫敦標準時間，正確做法是？',options:['減 8 小時，並檢查日期','加 8 小時','只換日期，不換時刻'],correct:0,explain:'倫敦 UTC±0，台北 UTC＋8；0 − 8＝−8 小時。'},
      {prompt:'同一座城市的日期，通常在哪個鐘錶時刻改變？',options:['00:00','日出時','12:00'],correct:0,explain:'鐘錶日期在當地午夜 00:00 改變，不是日出或正午。'},
      {prompt:'新德里 UTC＋5:30，台北 UTC＋8，台北比新德里？',options:['快 2 小時 30 分','快 3 小時','慢 2 小時 30 分'],correct:0,explain:'8:00 − 5:30＝2:30；時區也可能有半小時差。'},
      {prompt:'跨國飛行的抵達時間，需要考慮哪些項目？',options:['出發時刻、飛行時間與兩地時差','只要飛行時間','只要時差'],correct:0,explain:'先加經過的飛行時間，再換成目的地的當地時間，最後檢查日期。'},
      {prompt:'圖上聖誕島位於西經，卻採 UTC＋14，說明什麼？',options:['實際採用的時區不一定只由經度決定','城市時區一定標錯','西經一定只能是負 UTC'],correct:0,explain:'行政時區與日期安排不完全沿經線；換算請依題目標示的 UTC 時差。'},
      {prompt:'這個教具採固定標準時間。若想查倫敦暑假的實際時間？',options:['還需要確認當時是否實施夏令時間','直接把教具當即時世界鐘','所有地方都永遠沒有夏令時間'],correct:0,explain:'本教具不含夏令時間；真實行程應另查當日採用的時間。'},
      {prompt:'鐘錶顯示 12:00，代表太陽一定在當地最高處嗎？',options:['不一定，鐘錶時間與太陽位置有差異','一定','只有台北一定'],correct:0,explain:'時區使用共同標準時間；城市經度等因素會讓太陽正午與鐘錶中午不同。'}
    ];
    const conceptPool=shuffled(concepts),result=[];for(let i=0;i<10;i++){
      const type=kind==='concept'?'concept':kind==='conversion'?'conversion':kind==='life'?'life':i<3?'concept':i<7?'conversion':'life';
      if(type==='concept'){const q=conceptPool[i],options=shuffled(q.options.map((text,index)=>({text,index})));result.push({...q,options:options.map(o=>o.text),correct:options.findIndex(o=>o.index===q.correct),type,id:i});continue;}
      const route=type==='life'?pick([['taipei','la',780],['tokyo','la',600],['london','newyork',480],['newyork','paris',450],['dubai','delhi',210],['sydney','tokyo',600],['taipei','london',840],['honolulu','tokyo',540]]):null;
      const from=route?city(route[0]):pick(cities.slice(0,13)),to=route?city(route[1]):pick(cities.filter(c=>c.id!==from.id&&c.offset!==from.offset)),minutes=pick([0,30,60,390,720,930,1320,1410]);
      const date=pick(['2026-01-01','2026-10-20','2026-12-31']),epoch=fromLocal(date,minutes,from.offset),duration=route?route[2]:0;
      const p=parts(epoch,from.offset),expected=compare(epoch,from.offset,to.offset,duration);
      result.push({id:i,type,from:from.id,to:to.id,epoch,duration,expected,prompt:type==='life'?`小鳩於 ${dateLabel(p)} ${timeLabel(p)} 從${from.name}出發，經過 ${duration/60} 小時抵達${to.name}。抵達當地的日期與時間是？`:`${from.name}是 ${dateLabel(p)} ${timeLabel(p)}，同一瞬間的${to.name}是？`});
    }return result;
  }
  return {MINUTE,DAY,cities,city,mod,pad,parts,fromLocal,utcLabel,timeLabel,dateLabel,dayDifference,relativeDay,deltaLabel,compare,grade,sunLongitude,vector,project,inverse,missions,missionStart,checkMission,questionSet};
});
