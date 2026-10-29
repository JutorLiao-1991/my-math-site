(()=>{
  'use strict';
  const C=window.TimezoneCore,$=id=>document.getElementById(id),KEY='jutor.timezone.v1';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={mode:'explore',epoch:C.fromLocal('2026-10-20',15*60,480),from:'taipei',to:'london',playing:false,operated:false};
  let completed=[],missionIndex=0,stage='predict',prediction=-1,observation=-1,evidence='',practice=null,frame=null,lastFrame=0;
  const validKinds=['mixed','concept','conversion','life'];
  function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  function read(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}
  function restore(){const saved=read();completed=Array.isArray(saved.completed)?saved.completed.filter(id=>C.missions.some(m=>m.id===id)):[];const p=saved.practice;if(!p||!Number.isSafeInteger(p.seed)||!validKinds.includes(p.kind))return;
    practice={seed:p.seed,kind:p.kind,questions:C.questionSet(p.kind,random(p.seed)),answers:Array.from({length:10},(_,i)=>{const a=p.answers?.[i]||{};return {day:['-2','-1','0','1','2'].includes(String(a.day))?String(a.day):'',hour:/^(?:[01]?\d|2[0-3])$/.test(String(a.hour))?String(a.hour):'',minute:/^[0-5]?\d$/.test(String(a.minute))?String(a.minute):'',choice:Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3?a.choice:null,errors:Number.isInteger(a.errors)?Math.max(0,Math.min(10,a.errors)):0,flag:!!a.flag,done:!!a.done};}),index:Number.isInteger(p.index)?Math.max(0,Math.min(9,p.index)):0,submitted:!!p.submitted};
    // A saved completion is trusted only if its answer still validates against the regenerated question.
    practice.answers.forEach((a,i)=>{const q=practice.questions[i];a.done=a.done&&(q.type==='concept'?a.choice===q.correct:C.grade(q.expected,a).ok);});
    $('practice-kind').value=p.kind;
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,completed,practice:practice?{seed:practice.seed,kind:practice.kind,answers:practice.answers,index:practice.index,submitted:practice.submitted}:null}));}catch{$('live-status').textContent='此瀏覽器無法儲存進度；仍可完成本次操作。';}}
  function announce(message){$('live-status').textContent=message;}
  const renderer=new window.TimezoneRenderer($('globe'),$('world-map'),action=>{
    if(action.type==='city'&&state.mode==='explore'){state.to=action.city;renderer.focus(state.to);}
    else if(action.type==='city'&&state.mode==='mission'&&stage==='experiment'){state.to=action.city;}
    state.operated=true;renderScene();
  });
  const cityOptions=C.cities.map(c=>`<option value="${c.id}">${c.name} ${C.utcLabel(c.offset)}</option>`).join('');
  $('reference-city').innerHTML=cityOptions;$('target-city').innerHTML=cityOptions;
  $('quick-cities').innerHTML=['tokyo','dubai','london','newyork','la','sydney','delhi','wellington'].map(id=>{const c=C.city(id);return `<button data-city="${id}">${c.name}<small>${C.utcLabel(c.offset)}</small></button>`;}).join('');
  function stop(){state.playing=false;if(frame)cancelAnimationFrame(frame);frame=null;lastFrame=0;}
  function togglePlay(){if(state.playing){stop();renderScene();return;}state.playing=true;lastFrame=0;function tick(t){if(!state.playing)return;if(!lastFrame)lastFrame=t;if(t-lastFrame>=200){const delta=(t-lastFrame)/1000*30*C.MINUTE;state.epoch+=delta;state.epoch=Math.floor(state.epoch/C.MINUTE)*C.MINUTE;lastFrame=t;state.operated=true;renderScene();}frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);renderScene();}
  function clockSvg(p,color,hidden){const ticks=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<line x1="${60+Math.sin(a)*47}" y1="${60-Math.cos(a)*47}" x2="${60+Math.sin(a)*(i%3?43:40)}" y2="${60-Math.cos(a)*(i%3?43:40)}" stroke="#7e96a8" stroke-width="${i%3?1.5:2.5}"/>`;}).join('');const a=(p.hour%12+p.minute/60)*Math.PI/6,b=p.minute*Math.PI/30;
    return `<svg class="clock" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="white" stroke="#c8d7df" stroke-width="2"/>${ticks}<g fill="#435c70" font-size="11" text-anchor="middle" font-family="system-ui"><text x="60" y="25">12</text><text x="97" y="64">3</text><text x="60" y="102">6</text><text x="24" y="64">9</text></g>${hidden?`<text x="60" y="79" fill="${color}" font-size="49" text-anchor="middle" font-weight="700">?</text>`:`<line x1="60" y1="60" x2="${60+Math.sin(a)*25}" y2="${60-Math.cos(a)*25}" stroke="${color}" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="60" x2="${60+Math.sin(b)*37}" y2="${60-Math.cos(b)*37}" stroke="#3d5468" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#d49a37"/>`}</svg>`;
  }
  function clockCard(c,hidden,target){const p=C.parts(state.epoch,c.offset);return `<div class="clock-card${target?' target':''}"><h3>${c.name}</h3><span class="utc">${C.utcLabel(c.offset)}</span><div class="clock-date">${hidden?'日期待揭曉':C.dateLabel(p)}</div>${clockSvg(p,target?'#b35628':'#277965',hidden)}<div class="digital-time">${hidden?'?':C.timeLabel(p)}</div><div class="ampm">${hidden?'先預測，再觀察':p.hour<12?'上午':'下午'}</div></div>`;}
  function hideTimes(){if(state.mode==='mission')return stage==='predict';if(state.mode==='practice'&&practice){return !practice.submitted&&!practice.answers[practice.index].done;}return false;}
  function renderScene(){const from=C.city(state.from),to=C.city(state.to),p=C.parts(state.epoch,from.offset),hidden=hideTimes();
    $('reference-city').value=state.from;$('target-city').value=state.to;$('reference-date').value=p.date;$('reference-time').value=C.timeLabel(p);$('time-slider').value=p.hour*60+p.minute;$('slider-value').textContent=C.timeLabel(p);$('utc-readout').textContent='UTC '+C.timeLabel(C.parts(state.epoch,0));
    const locked=state.mode==='practice'||state.mode==='mission'&&stage!=='experiment';
    $('reference-city').disabled=state.mode!=='explore';$('target-city').disabled=locked;
    ['reference-date','reference-time','time-slider','play'].forEach(id=>$(id).disabled=locked);document.querySelectorAll('[data-shift]').forEach(b=>b.disabled=locked);
    $('play').textContent=state.playing?'Ⅱ 暫停時間':'▶ 時間前進';$('scene-state').textContent=state.playing?'時間前進中':'時間已暫停';
    $('comparison-panel').hidden=state.mode==='practice'&&(!practice||hidden);
    $('comparison-clocks').innerHTML=clockCard(from,false,false)+clockCard(to,hidden,true);
    $('difference').hidden=hidden;$('timeline').hidden=hidden;
    if(!hidden){const d=C.dayDifference(state.epoch,from.offset,to.offset);$('difference').innerHTML=`${to.name}比${from.name}${C.deltaLabel(to.offset-from.offset)}<span class="date-diff">${to.name}的日期：${C.relativeDay(d)}</span>`;
      const t=C.parts(state.epoch,to.offset);$('timeline').innerHTML=`<div class="timeline-row"><span>${from.name}</span><strong>${p.date} ${C.timeLabel(p)}</strong></div><div class="timeline-row${d?' timeline-midnight':''}"><span>${to.name}</span><strong>${t.date} ${C.timeLabel(t)}${d?' · '+C.relativeDay(d):''}</strong></div>`;}
    document.querySelectorAll('[data-city]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.city===state.to)));
    $('explore-prompt').textContent=to.offset===from.offset?'這兩座城市的標準時間相同。即使經度不同，也可能採用同一個時區。':`先猜：${to.name}比${from.name}快還是慢？把${from.name}時間推到接近午夜，觀察哪座城市先換日期。`;
    renderer.update({...state,hideTimes:hidden});
    if(state.mode==='mission'&&stage==='experiment')$('mission-live').textContent=state.operated?'已操作。符合任務條件後，按「記錄觀察」。':'請先操作地球、城市或時間，再記錄觀察。';
  }
  function setMode(mode){stop();state.mode=mode;document.body.dataset.mode=mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));['explore','mission','practice'].forEach(m=>$(m+'-panel').hidden=m!==mode);document.querySelector('.lab-sidebar-content').scrollTop=0;
    if(mode==='mission')prepareMission(missionIndex);else if(mode==='practice'){renderPractice();syncPracticeScene();}else{state.operated=false;renderScene();}
  }
  function prepareMission(index){stop();missionIndex=index;stage='predict';prediction=-1;observation=-1;evidence='';const m=C.missions[index];state.from=m.from;state.to=m.to;state.epoch=C.missionStart(m);state.operated=false;renderMission();renderer.focus(state.from);renderScene();}
  function choiceButtons(options,group,selected=-1){return `<div class="choice-list">${options.map((v,i)=>`<button data-${group}="${i}" aria-pressed="${selected===i}">${escape(v)}</button>`).join('')}</div>`;}
  function renderMission(){const m=C.missions[missionIndex];$('mission-progress').textContent=`${completed.length} / ${C.missions.length} 完成`;$('mission-nav').innerHTML=C.missions.map((m,i)=>`<button data-mission="${i}" aria-pressed="${i===missionIndex}" class="${completed.includes(m.id)?'done':''}">${i+1} ${m.title}</button>`).join('');
    const steps={predict:'① 先預測',experiment:'② 動手驗證',observe:'③ 整理觀察',explain:'④ 說出原因',done:'✓ 任務完成'};
    let html=`<div class="task-step">${steps[stage]}</div><h3 class="task-title">${missionIndex+1}. ${m.title}</h3>`;
    if(stage==='predict')html+=`<p class="task-question">${m.question}</p><p class="muted small">先選出你的預測。猜錯也沒關係，接著用地球驗證。</p>${choiceButtons(m.predictions,'prediction')}`;
    else{html+=`<div class="prediction-record">我的預測：${escape(m.predictions[prediction])}</div>`;
      if(stage==='experiment')html+=`<p>${m.instruction}</p>${m.id==='flight'?'<p class="note">出發：台北 10/20 22:00；目標：向前經過 13 小時。</p>':''}<p class="muted small" id="mission-live"></p><button id="capture-mission" class="primary">記錄觀察</button><p id="mission-feedback" class="feedback" role="status"></p>`;
      else html+=`<div class="evidence">${escape(evidence)}</div>`;
      if(stage==='observe')html+=`<p>哪一句符合你剛才看到的結果？</p>${choiceButtons(m.observation,'observation')}<p id="mission-feedback" class="feedback" role="status"></p>`;
      if(stage==='explain')html+=`<p>這個結果為什麼會發生？</p>${choiceButtons(m.reasons,'reason')}<p id="mission-feedback" class="feedback" role="status"></p>`;
      if(stage==='done')html+=`<div class="task-complete"><strong>任務完成 ✓</strong><p>${escape(m.reasons[m.reason])}</p><p class="small">回頭比較你的預測與實際觀察，找出想法改變的地方。</p></div><div class="task-actions"><button id="retry-mission">重做這個任務</button>${missionIndex<4?'<button id="next-mission" class="primary">下一個任務 →</button>':'<button data-go-practice class="primary">進入練習 →</button>'}</div>`;
    }$('mission-body').innerHTML=html;document.querySelector('.lab-sidebar-content').scrollTop=0;
  }
  function captureMission(){stop();const m=C.missions[missionIndex];if(!C.checkMission(m,state)){$('mission-feedback').className='feedback bad';$('mission-feedback').textContent=!state.operated?'先動手操作，再記錄觀察。':m.id==='instant'?'保持台北 10/20 15:00，並比較倫敦。':m.id==='offset'?'保持台北 10/20 15:00，找出比它快 1 小時的城市。':m.id==='midnight'?'再調整一下，讓東京剛好停在 10/21 00:00。':m.id==='different'?'請保持台北 10/20，並找到紐約仍是 10/19 的時刻。':'目標是出發後 13 小時，台北應為 10/21 11:00。';renderScene();return;}
    const a=C.parts(state.epoch,C.city(state.from).offset),b=C.parts(state.epoch,C.city(state.to).offset);evidence=`我觀察到：${C.city(state.from).name} ${a.date} ${C.timeLabel(a)}；${C.city(state.to).name} ${b.date} ${C.timeLabel(b)}。`;stage='observe';renderMission();renderScene();
  }
  function feedbackMission(message){$('mission-feedback').className='feedback bad';$('mission-feedback').textContent=message;announce(message);}
  function startPractice(){const seed=Math.floor(Math.random()*2147483646)+1,kind=$('practice-kind').value;practice={seed,kind,questions:C.questionSet(kind,random(seed)),answers:Array.from({length:10},()=>({day:'',hour:'',minute:'',choice:null,errors:0,flag:false,done:false})),index:0,submitted:false};save();renderPractice();syncPracticeScene();}
  function partial(a){return a.day!==''||a.hour!==''||a.minute!==''||a.choice!==null;}
  function score(){return practice.answers.reduce((sum,a)=>sum+(a.done?10-a.errors:0),0);}
  function selectOptions(values,selected){return '<option value="">—</option>'+values.map(([v,label])=>`<option value="${v}"${String(v)===selected?' selected':''}>${label}</option>`).join('');}
  function syncPracticeScene(){if(!practice){renderScene();return;}const q=practice.questions[practice.index];state.from=q.from||'taipei';state.to=q.to||'london';state.epoch=q.epoch||C.fromLocal('2026-10-20',900,480);if((practice.submitted||practice.answers[practice.index].done)&&q.duration)state.epoch+=q.duration*C.MINUTE;renderer.focus(state.from);renderScene();}
  function explanation(q){if(q.type==='concept')return `<div class="explanation"><strong>解析</strong><p>${escape(q.explain)}</p></div>`;const from=C.city(q.from),to=C.city(q.to),e=q.expected,a=C.parts(q.epoch,from.offset),b=e.to,delta=(to.offset-from.offset)/60;return `<div class="explanation"><strong>破題 SOP</strong>${q.duration?'<p class="muted small">下方時鐘顯示抵達瞬間；答案的日期關係以題目的出發日為準。</p>':''}<p>① ${C.utcLabel(to.offset)} − ${C.utcLabel(from.offset)} ＝ ${delta>0?'+':''}${delta} 小時。</p><p>② ${q.duration?`先加飛行 ${q.duration/60} 小時，再${C.deltaLabel(to.offset-from.offset).startsWith('快')?'加':'減'}時差。`:'基準時間加上兩地時差。'}</p><p>③ ${C.timeLabel(a)} ${q.duration?'＋ '+q.duration/60+' 小時 ':''}${delta<0?'−':'＋'} ${Math.abs(delta)} 小時，整理為 <strong>${C.relativeDay(e.day)} ${C.timeLabel(b)}</strong>。</p><svg viewBox="0 0 340 80" role="img" aria-label="從${from.name}出發時間換算為${to.name}的當地時間"><line x1="30" y1="37" x2="310" y2="37" stroke="#b7c9d5" stroke-width="3"/><circle cx="35" cy="37" r="6" fill="#2c8871"/><circle cx="305" cy="37" r="6" fill="#bb6033"/><g font-family="system-ui" font-size="12" fill="#304e63"><text x="8" y="18">${from.name} ${C.timeLabel(a)}</text><text x="180" y="18">${to.name} ${C.timeLabel(b)}</text><text x="8" y="65">${a.date}</text><text x="220" y="65">${b.date}</text></g></svg><p>答案：${C.dateLabel(b)} ${C.timeLabel(b)}。</p></div>`;}
  function renderPractice(message='',bad=false){$('start-practice').textContent=practice?'重新出 10 題':'開始 10 題練習';if(!practice){$('practice-body').innerHTML='<p class="note">先選題型，再開始練習。換算題需同時回答日期、時、分。</p>';return;}
    const p=practice,q=p.questions[p.index],a=p.answers[p.index],review=p.submitted||a.done;
    let html=p.submitted?`<p class="result-score">${score()}<small> / 100 分</small></p><p class="muted">完成 ${p.answers.filter(a=>a.done).length} 題。點題號查看答案與解析。</p>`:'';
    html+=`<p class="muted small">完成 ${p.answers.filter(a=>a.done).length} / 10 題 · 目前 ${score()} 分</p><nav class="question-nav" aria-label="題號">${p.answers.map((a,i)=>`<button data-question="${i}" aria-label="第 ${i+1} 題，${a.done?'已完成':partial(a)?'部分作答':'未作答'}${a.flag?'，待檢查':''}" aria-pressed="${i===p.index}" class="${i===p.index?'current ':''}${a.done?'answered ':partial(a)?'partial ':''}${a.flag?'flagged':''}">${i+1}</button>`).join('')}</nav><p class="practice-legend">淡黃＝部分作答 · 綠＝完成 · 紫框＝待檢查</p><div class="row spread"><strong>第 ${p.index+1} 題</strong><button id="flag-question" aria-pressed="${a.flag}">${a.flag?'取消待檢查':'標記待檢查'}</button></div><p class="task-question">${escape(q.prompt)}</p>`;
    if(q.type==='concept')html+=choiceButtons(q.options,'practice-choice',a.choice);
    else{html+=`<div class="practice-city-info"><span>${C.city(q.from).name} ${C.utcLabel(C.city(q.from).offset)}</span><span>${C.city(q.to).name} ${C.utcLabel(C.city(q.to).offset)}</span></div><p class="muted small">日期以題目給的${C.city(q.from).name}日期為基準。</p><div class="answer-row"><label>目的地日期<select id="answer-day"${review?' disabled':''}>${selectOptions([[-2,'前兩天'],[-1,'前一天'],[0,'同一天'],[1,'隔一天'],[2,'後兩天']],a.day)}</select></label><label>時（24 小時制）<select id="answer-hour"${review?' disabled':''}>${selectOptions(Array.from({length:24},(_,i)=>[i,C.pad(i)]),a.hour)}</select></label><label>分<select id="answer-minute"${review?' disabled':''}>${selectOptions(Array.from({length:60},(_,i)=>[i,C.pad(i)]),a.minute)}</select></label></div>`;}
    html+=`<p id="practice-feedback" role="status" class="feedback ${bad?'bad':'good'}">${escape(message|| (a.done?'答對了！本題 '+(10-a.errors)+' 分。':''))}</p><div class="task-actions">${!review?'<button id="check-answer" class="primary">檢查答案</button>':''}<button id="next-question">${p.index===9?'回到第 1 題':'下一題 →'}</button>${!p.submitted?'<button id="submit-practice">交卷看成績</button>':''}</div>`;
    if(review)html+=explanation(q);
    if(!p.submitted&&p.answers.every(a=>a.done))html+=`<div class="task-complete">10 題完成！目前 ${score()} 分。按「交卷看成績」整理本次結果。</div>`;
    $('practice-body').innerHTML=html;if(review)document.querySelectorAll('[data-practice-choice]').forEach(b=>b.disabled=true);
  }
  function checkAnswer(){const q=practice.questions[practice.index],a=practice.answers[practice.index];if(a.done||practice.submitted)return;let result;
    if(q.type==='concept'){if(a.choice===null){renderPractice('先選一個答案。',true);return;}result={ok:a.choice===q.correct};}
    else{if(a.day===''||a.hour===''||a.minute===''){renderPractice('請把日期、時、分三個欄位填完整；未填完不扣分。',true);return;}result=C.grade(q.expected,a);}
    if(result.ok){a.done=true;save();renderPractice('答對了！本題 '+(10-a.errors)+' 分。');syncPracticeScene();}
    else{a.errors=Math.min(10,a.errors+1);save();renderPractice(q.type==='concept'?'再想想看，這次扣 1 分。':result.timeOK?'時間算對了，日期需要再檢查；這次扣 1 分。':result.dateOK?'日期選對了，時與分需要再檢查；這次扣 1 分。':'先算 UTC 時差，再檢查跨午夜；這次扣 1 分。',true);}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.mode){setMode(b.dataset.mode);return;}
    if(b.dataset.city){state.to=b.dataset.city;renderer.focus(state.to);renderScene();return;}
    if(b.dataset.shift){state.epoch+=Number(b.dataset.shift)*C.MINUTE;state.operated=true;renderScene();return;}
    if(b.dataset.mission!==undefined){prepareMission(Number(b.dataset.mission));return;}
    if(b.dataset.prediction!==undefined){prediction=Number(b.dataset.prediction);stage='experiment';state.operated=false;renderMission();renderScene();return;}
    if(b.dataset.observation!==undefined){const m=C.missions[missionIndex];if(Number(b.dataset.observation)!==m.answer){feedbackMission('回頭看看記錄中的時間與日期，再選一次。');return;}observation=Number(b.dataset.observation);stage='explain';renderMission();return;}
    if(b.dataset.reason!==undefined){const m=C.missions[missionIndex];if(Number(b.dataset.reason)!==m.reason){feedbackMission('這個原因還不能解釋剛才的觀察，再想想。');return;}stage='done';if(!completed.includes(m.id))completed.push(m.id);save();renderMission();renderScene();return;}
    if(b.dataset.goPractice!==undefined){setMode('practice');return;}
    if(b.dataset.question!==undefined){practice.index=Number(b.dataset.question);save();renderPractice();syncPracticeScene();return;}
    if(b.dataset.practiceChoice!==undefined){practice.answers[practice.index].choice=Number(b.dataset.practiceChoice);save();renderPractice();return;}
    switch(b.id){
      case'play':togglePlay();break;
      case'view-home':renderer.focus(state.from);state.operated=true;renderScene();break;
      case'view-target':renderer.focus(state.to);state.operated=true;renderScene();break;
      case'view-rotate':renderer.yaw+=90;state.operated=true;renderScene();break;
      case'capture-mission':captureMission();break;
      case'retry-mission':prepareMission(missionIndex);break;
      case'next-mission':prepareMission(missionIndex+1);break;
      case'start-practice':stop();startPractice();break;
      case'flag-question':{const a=practice.answers[practice.index];a.flag=!a.flag;save();renderPractice();break;}
      case'check-answer':checkAnswer();break;
      case'next-question':practice.index=(practice.index+1)%10;save();renderPractice();syncPracticeScene();break;
      case'submit-practice':{const remaining=practice.answers.filter(a=>!a.done).length;if(remaining){$('practice-feedback').innerHTML=`<span class="practice-notice">還有 ${remaining} 題未完成，交卷後這些題目為 0 分。</span> <button id="confirm-submit">確認交卷</button>`;}else{practice.submitted=true;save();renderPractice();syncPracticeScene();}break;}
      case'confirm-submit':practice.submitted=true;save();renderPractice();syncPracticeScene();break;
    }
  });
  $('reference-city').addEventListener('change',()=>{state.from=$('reference-city').value;renderer.focus(state.from);renderScene();});
  $('target-city').addEventListener('change',()=>{state.to=$('target-city').value;state.operated=true;renderer.focus(state.to);renderScene();});
  function setLocal(){const date=$('reference-date').value,time=$('reference-time').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||date<'2000-01-01'||date>'2099-12-31')return;const [h,m]=time.split(':').map(Number);state.epoch=C.fromLocal(date,h*60+m,C.city(state.from).offset);state.operated=true;renderScene();}
  $('reference-date').addEventListener('change',setLocal);$('reference-time').addEventListener('change',setLocal);
  $('time-slider').addEventListener('input',()=>{const p=C.parts(state.epoch,C.city(state.from).offset);state.epoch=C.fromLocal(p.date,Number($('time-slider').value),C.city(state.from).offset);state.operated=true;renderScene();});
  $('show-grid').addEventListener('change',()=>{renderer.grid=$('show-grid').checked;renderer.draw();});$('show-labels').addEventListener('change',()=>{renderer.labels=$('show-labels').checked;renderer.draw();});
  $('practice-body').addEventListener('change',e=>{if(!e.target.id.startsWith('answer-'))return;const key=e.target.id.slice(7);practice.answers[practice.index][key]=e.target.value;save();renderPractice();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();renderScene();}});
  restore();setMode('explore');
})();
