(function(root){
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formula=s=>esc(s).replace(/(\d+)/g,'<sub>$1</sub>');
  const number=s=>{s=String(s).trim().replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296));if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);const m=s.match(/^(\d+)\/(\d+)$/);return m&&+m[2]!==0?+m[1]/+m[2]:NaN;};
  let target=null;
  function activate(el){showKeys();if(target)target.classList.remove('active');target=el;el.classList.add('active');const label=document.getElementById('active-label');if(label)label.textContent=el.getAttribute('aria-label')||'輸入數值';}
  function keypad(){const dock=document.getElementById('dock');if(!dock)return;document.getElementById('keypad').innerHTML=['7','8','9','⌫','4','5','6','清除','1','2','3','下一格','0','.','/','收起'].map(k=>`<button type="button" data-key="${esc(k)}" aria-label="${k==='⌫'?'退格':k}">${k}</button>`).join('');document.addEventListener('focusin',e=>{if(e.target.matches('.entry'))activate(e.target);});document.addEventListener('click',e=>{if(e.target.matches('.entry'))activate(e.target);const b=e.target.closest('[data-key]');if(!b)return;const key=b.dataset.key;if(key==='收起'){dock.classList.add('dock-hidden');return;}if(!target||!target.isConnected||target.disabled){target=[...document.querySelectorAll('.entry')].find(x=>!x.disabled);if(target)activate(target);}if(!target)return;if(key==='下一格'){const all=[...document.querySelectorAll('.entry')].filter(x=>!x.disabled);const i=all.indexOf(target);all[(i+1)%all.length]?.focus();return;}let s=target.value;if(key==='清除')s='';else if(key==='⌫')s=s.slice(0,-1);else if(s.length<12)s+=key;target.value=s;target.dispatchEvent(new Event('input',{bubbles:true}));});document.addEventListener('keydown',e=>{if(!e.target.matches('.entry'))return;if(/^[0-9./]$/.test(e.key)||e.key==='Backspace'||e.key==='Delete'){if(!e.target.readOnly)return;e.preventDefault();let s=e.target.value;e.target.value=e.key==='Backspace'?s.slice(0,-1):e.key==='Delete'?'':(s.length<12?s+e.key:s);e.target.dispatchEvent(new Event('input',{bubbles:true}));}if(e.key==='Enter'){e.preventDefault();document.getElementById('check')?.click();}});}
  function showKeys(){document.getElementById('dock')?.classList.remove('dock-hidden');}
  function feedback(text,good=null,id='feedback'){const el=document.getElementById(id);if(!el)return;el.textContent=text;el.className='feedback'+(good===null?'':good?' good':' bad');}
  function storage(key){let state={};try{const v=JSON.parse(localStorage.getItem(key)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))state=v;}catch{}return{get:()=>state,set:(id,value)=>{state[id]=value;try{localStorage.setItem(key,JSON.stringify(state));}catch{const el=document.querySelector('.storage');if(el)el.textContent='此瀏覽器無法儲存進度，關閉頁面後將重設。';}}};}
  function quiz(container,items,key){const save=storage(key);let index=0;const done=()=>items.filter(q=>save.get()[q.id]===true).length;
    function render(){const q=items[index];container.innerHTML=`<div class="eyebrow">自修模式 · 先預測，再看解釋</div><h2>觀念檢核</h2><div class="progress"><span style="width:${done()/items.length*100}%"></span></div><p class="muted">已通過 ${done()}／${items.length} 題</p><div class="study-track">${items.map((a,i)=>`<button data-q="${i}" aria-pressed="${i===index}" class="${save.get()[a.id]===true?'done':''}">${i+1}</button>`).join('')}</div><h3>${esc(q.question)}</h3><div class="choices">${q.options.map((o,i)=>`<button data-choice="${i}">${esc(o)}</button>`).join('')}</div><p id="quiz-feedback" class="feedback" role="status" aria-live="polite"></p><p id="quiz-explain" class="note" hidden></p><div class="actions"><button data-prev ${index===0?'disabled':''}>上一題</button><button data-next ${index===items.length-1?'disabled':''}>下一題</button><button data-reset>重做本組</button></div><p class="storage">進度只存於此瀏覽器；共用裝置會共用進度。</p>`;
      container.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{index=+b.dataset.q;render();});container.querySelector('[data-prev]').onclick=()=>{index--;render();};container.querySelector('[data-next]').onclick=()=>{index++;render();};container.querySelector('[data-reset]').onclick=()=>{items.forEach(x=>save.set(x.id,false));index=0;render();};container.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const ok=+b.dataset.choice===q.answer;feedback(ok?'答對了！看看原因，再進下一題。':'再想想：'+q.hint,ok,'quiz-feedback');if(ok){save.set(q.id,true);b.classList.add('correct');const ex=container.querySelector('#quiz-explain');ex.hidden=false;ex.textContent=q.explain;container.querySelector('.progress span').style.width=done()/items.length*100+'%';container.querySelector('.muted').textContent=`已通過 ${done()}／${items.length} 題`;container.querySelector(`[data-q="${index}"]`).classList.add('done');}});}
    render();return{render};
  }
  function guidedStudy(container,lessons,key,items,quizKey,active=()=>true){
    if(!root.ScienceGuideCore)return quiz(container,items,quizKey);
    const flow=root.ScienceGuideCore.create(lessons,storage(key));
    container.innerHTML='<div class="guide-workflow"></div><details class="guide-extra"><summary>觀念加練（原有題目）</summary><div class="guide-quiz"></div></details>';
    const panel=container.querySelector('.guide-workflow');quiz(container.querySelector('.guide-quiz'),items,quizKey);
    const operations=document.getElementById('lab-operations'),operationCheck=document.createElement('div');
    operationCheck.className='guide-operation-check';if(operations)operations.append(operationCheck);
    const stages=['先預測','操作驗證','記錄觀察','說明原因'];
    function message(value,good=false){const el=panel.querySelector('[data-guide-feedback]');el.textContent=value;el.className='feedback '+(good?'good':'bad');}
    function render(focus=false){
      const lesson=flow.lesson,stage=flow.stage;
      let body='';
      const choices=(q,kind)=>`<h3>${esc(q.question)}</h3><div class="choices">${q.options.map((o,i)=>`<button type="button" data-guide-${kind}="${i}">${esc(o)}</button>`).join('')}</div>`;
      if(stage===0)body='<p class="note">先說出你的想法，不必怕猜錯。預測會保留到最後，再與實驗結果比較。</p>'+choices(lesson.prediction,'predict');
      else if(stage===1)body=`<p class="guide-prediction">我的預測：${esc(lesson.prediction.options[flow.prediction])}</p><p>${esc(lesson.task)}</p><div class="actions"><button type="button" data-guide-prepare>${flow.prepared?'重新準備這個實驗':'準備這個實驗'}</button>${flow.prepared?'<button type="button" data-guide-capture class="primary">讀取目前結果</button>':''}</div><p class="muted">${flow.prepared?'請操作教具後再讀取結果；系統會核對目前的設定與操作。':'準備後會設定本任務的起始條件，接著由你操作。'}</p>${flow.prepared&&operations?'<a href="#lab-operations">前往操作區 ↓</a>':''}`;
      else if(stage===2)body=`<p class="note">剛才記錄的資料：${esc(flow.evidence)}</p>`+choices(lesson.observation,'observe');
      else if(stage===3)body=`<p class="note">我的觀察：${esc(lesson.observation.options[flow.observation])}</p>`+choices(lesson.reason,'reason');
      else body=`<div class="guide-complete"><h3>任務完成 ✓</h3><p>原本預測：${esc(lesson.prediction.options[flow.prediction])}</p><p>實際觀察：${esc(lesson.observation.options[flow.observation])}</p><p>${esc(lesson.conclusion)}</p></div><div class="actions">${flow.index<lessons.length-1?'<button type="button" data-guide-next class="primary">下一個任務</button>':''}<button type="button" data-guide-restart>再做一次</button></div>`;
      panel.innerHTML=`<div class="eyebrow">自修模式 · 跟著任務找答案</div><h2 tabindex="-1" data-guide-heading>${esc(lesson.title)}</h2><p class="muted">已完成 ${flow.completed}／${lessons.length} 個引導任務</p><nav class="study-track" aria-label="引導任務">${lessons.map((l,i)=>`<button type="button" data-guide-lesson="${i}" aria-pressed="${i===flow.index}" aria-label="任務 ${i+1}：${esc(l.title)}" class="${flow.records.some(r=>r.lesson.id===l.id)?'done':''}">${i+1}</button>`).join('')}</nav><ol class="guide-stages" aria-label="學習步驟">${stages.map((name,i)=>`<li ${i===stage?'aria-current="step"':''} class="${i<stage?'done':''}">${i+1} ${name}</li>`).join('')}</ol>${body}<p data-guide-feedback class="feedback" role="status" aria-live="polite"></p>${stage>0&&stage<4?'<button type="button" data-guide-restart>重新預測</button>':''}<details class="guide-notebook"><summary>我的學習紀錄（${flow.completed}）</summary>${flow.records.length?flow.records.map(({lesson:l,record:r})=>`<article><h3>${esc(l.title)}</h3><p>預測：${esc(l.prediction.options[r.prediction])}</p><p>資料：${esc(r.evidence)}</p><p>觀察：${esc(l.observation.options[r.observation])}</p><p>原因：${esc(l.reason.options[r.reason])}</p></article>`).join(''):'<p>完成操作、觀察與解釋後，紀錄會顯示在這裡。</p>'}<button type="button" data-guide-reset>清除本組引導紀錄</button></details><p class="storage">完成紀錄只存於此瀏覽器；共用裝置會共用紀錄。未完成的任務重新開啟後，從預測開始。</p>`;
      panel.querySelectorAll('[data-guide-lesson]').forEach(b=>b.onclick=()=>{flow.select(+b.dataset.guideLesson);render(true);});
      panel.querySelectorAll('[data-guide-predict]').forEach(b=>b.onclick=()=>{flow.predict(+b.dataset.guidePredict);render(true);});
      panel.querySelector('[data-guide-prepare]')?.addEventListener('click',()=>{flow.prepare();render(true);});
      function capture(fromOperation=false){const r=flow.capture();if(r.ok){render(true);if(fromOperation)panel.scrollIntoView({block:'start'});}else if(fromOperation){const el=operationCheck.querySelector('[role=status]');el.textContent=r.message;}else message(r.message);}
      panel.querySelector('[data-guide-capture]')?.addEventListener('click',()=>capture());
      operationCheck.hidden=!(stage===1&&flow.prepared);
      operationCheck.innerHTML=operationCheck.hidden?'':'<button type="button" class="primary">讀取結果並返回引導</button><p class="feedback" role="status" aria-live="polite"></p>';
      operationCheck.querySelector('button')?.addEventListener('click',()=>capture(true));
      panel.querySelectorAll('[data-guide-observe]').forEach(b=>b.onclick=()=>{if(flow.observe(+b.dataset.guideObserve))render(true);else message(lesson.observation.hint);});
      panel.querySelectorAll('[data-guide-reason]').forEach(b=>b.onclick=()=>{if(flow.explain(+b.dataset.guideReason))render(true);else message(lesson.reason.hint);});
      panel.querySelector('[data-guide-next]')?.addEventListener('click',()=>{flow.select(flow.index+1);render(true);});
      panel.querySelector('[data-guide-restart]')?.addEventListener('click',()=>{flow.select(flow.index);render(true);});
      panel.querySelector('[data-guide-reset]')?.addEventListener('click',()=>{flow.resetAll();render(true);});
      if(focus)panel.querySelector('[data-guide-heading]').focus({preventScroll:true});
    }
    const changed=e=>{if(active())flow.notify(e);};
    ['click','input','change'].forEach(name=>document.addEventListener(name,changed));render();
    return {destroy(){['click','input','change'].forEach(name=>document.removeEventListener(name,changed));operationCheck.remove();}};
  }
  root.ScienceLab={esc,formula,number,keypad,showKeys,feedback,storage,quiz,guidedStudy};
})(window);
