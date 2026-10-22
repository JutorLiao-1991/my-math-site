(function () {
  'use strict';
  const S = window.RatioSelfStudy, Q = window.RatioQuestions, E = window.RatioInput;
  const $ = id => document.getElementById(id), root = $('self-study');
  const storageKey = 'jutor-ratio-self-study-v1';
  let state = S.createState(), active = false, activeField = 0, activePart = 'number', feedback = null, canStore = true;
  try { state = S.restore(JSON.parse(localStorage.getItem(storageKey))); } catch (_) { canStore = false; }
  const progress = () => state.progress[state.lesson], lesson = () => S.lessons[state.lesson];
  const check = () => lesson().checks[progress().checkpoint];
  const entries = () => progress().entries[progress().checkpoint];
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); canStore = true; }
    catch (_) { canStore = false; }
  }
  const num = value => Q.displayNumber(String(value));
  const pair = (a, b) => `<span class="study-pair">${num(a)}<span>：</span>${num(b)}</span>`;
  function dots(n, color) {
    return `<span class="study-balls" role="img" aria-label="${color === 'red' ? '紅球' : '藍球'} ${n} 顆">${Array.from({ length: n }, () => `<i class="study-ball ${color}" aria-hidden="true"></i>`).join('')}</span>`;
  }
  function bars(a, b, labels = ['原液', '水']) {
    return [a, b].map((n, i) => `<div class="study-bar-label"><span>${labels[i]}</span><strong>${n} 份</strong></div><div class="study-bar" role="img" aria-label="${labels[i]} ${n} 份">${Array.from({ length: n }, () => `<span class="study-unit ${i ? 'water' : 'juice'}"></span>`).join('')}</div>`).join('');
  }
  function explorationHtml() {
    const x = progress().exploration;
    if (state.lesson === 0) {
      const blue = x.order === 'blue';
      return `<div class="study-visual"><div class="study-ball-row"><strong>紅球 5 顆</strong>${dots(5, 'red')}</div><div class="study-ball-row"><strong>藍球 3 顆</strong>${dots(3, 'blue')}</div></div>
        <div class="study-local-controls" role="group" aria-label="切換比較順序"><button type="button" class="secondary-btn" data-order="blue" aria-pressed="${blue}">藍球對紅球</button><button type="button" class="secondary-btn" data-order="red" aria-pressed="${!blue}">紅球對藍球</button></div>
        <div class="study-relation"><div>${blue ? '藍球' : '紅球'}的數量 <span>對</span> ${blue ? '紅球' : '藍球'}的數量</div>${pair(blue ? 3 : 5, blue ? 5 : 3)}<div class="study-parts"><span>前項：${blue ? '藍球 3' : '紅球 5'}</span><span>後項：${blue ? '紅球 5' : '藍球 3'}</span></div></div><p>切換比較順序，看看前項與後項怎麼改變。</p>`;
    }
    if (state.lesson === 1) {
      const a = x.reverse ? 6 : 4, b = x.reverse ? 4 : 6;
      return `<div class="study-visual">${bars(4, 6)}<div class="study-comparison"><div><span>${x.reverse ? '水對原液' : '原液對水'}的比</span>${pair(a, b)}</div><div><span>對應的比值</span><strong>${a} ÷ ${b} ＝ ${num(`${a}/${b}`)} ＝ ${num(x.reverse ? '3/2' : '2/3')}</strong></div></div></div>
        <div class="study-local-controls"><button type="button" class="secondary-btn" id="study-reverse">交換比較順序</button></div><p>${x.reverse ? '水比原液多，所以水對原液的比值大於 1。' : '原液對水：用原液的 4 份除以水的 6 份。'}</p>
        <details class="study-detail"><summary>原液占整杯，為什麼不是這個比值？</summary><p>整杯共有 4＋6＝10 份。原液占整杯是 ${num('4/10')}，原液對水的比值是 ${num('4/6')}。比較的對象不同，分母也不同。</p></details>`;
    }
    if (state.lesson === 2) {
      const a = x.waterOnly ? 2 : 2 * x.factor, b = 3 * x.factor, g = Q.gcd(a, b), gTotal = Q.gcd(a, a + b);
      const same = !x.waterOnly || x.factor === 1;
      return `<div class="study-visual">${bars(a, b)}<div class="study-mixture"><div class="study-cup" aria-label="這杯果汁原液占 ${a}/${a + b}"><span style="height:${20 + (a + b) * 2}%;background:hsl(210 40% ${90 - a / (a + b) * 55}%)"></span></div><div><span>現在的比</span>${pair(a, b)}</div><div><span>原液占整杯</span><strong>${num(`${a / gTotal}/${(a + b) / gTotal}`)}</strong></div></div></div>
        <div class="study-factor"><label for="study-factor">${x.waterOnly ? '只把水變成' : '原液和水一起變成'} <output>${x.factor} 倍</output></label><div class="study-range"><button type="button" class="secondary-btn" id="study-factor-minus" aria-label="倍數減一" ${x.factor === 1 ? 'disabled' : ''}>−</button><input id="study-factor" type="range" min="1" max="6" step="1" value="${x.factor}"><button type="button" class="secondary-btn" id="study-factor-plus" aria-label="倍數加一" ${x.factor === 6 ? 'disabled' : ''}>＋</button></div></div>
        <div class="study-comparison"><div><span>原來的比值</span><strong>${num('2/3')}</strong></div><div><span>現在的比值</span><strong>${num(`${a}/${b}`)} ＝ ${num(`${a / g}/${b / g}`)}</strong></div></div><p class="study-observation">${same ? '比值相同，濃淡一樣；總份量可以不同。' : '只增加水，比值變小，果汁變淡。兩項要一起乘相同的倍數，才能維持等值比。'}</p>
        <button type="button" class="secondary-btn" id="study-free" aria-expanded="${x.free}">${x.free ? '收起自由探索' : '自由探索：只改一項會怎樣？'}</button><div class="study-local-controls" ${x.free ? '' : 'hidden'}><button type="button" class="secondary-btn" data-water="false" aria-pressed="${!x.waterOnly}">原液、水一起放大</button><button type="button" class="secondary-btn" data-water="true" aria-pressed="${x.waterOnly}">只增加水</button></div>`;
    }
    const recipe = S.recipes[x.recipe], [a, b] = recipe.integers, divisor = x.divisor;
    const divisors = Array.from({ length: Q.gcd(a, b) }, (_, i) => i + 1).filter(d => a % d === 0 && b % d === 0);
    return `<label class="study-select-label" for="study-recipe">選一種比來探索</label><select id="study-recipe">${S.recipes.map((r, i) => `<option value="${i}" ${x.recipe === i ? 'selected' : ''}>${r.title}</option>`).join('')}</select>
      <div class="study-relation"><span>原比</span>${pair(...recipe.raw)}</div><button type="button" class="secondary-btn" id="study-convert">${recipe.multiplier === 1 ? '兩項都是整數，接著找公因數' : `兩項同乘 ${recipe.multiplier}，化為整數`}</button>
      ${x.converted ? `<div class="study-relation"><span>${recipe.multiplier === 1 ? '兩項都是整數' : `兩項同乘 ${recipe.multiplier}`}</span>${pair(a, b)}</div><div class="study-local-controls" role="group" aria-label="選擇同除的公因數">${divisors.map(d => `<button type="button" class="secondary-btn" data-divisor="${d}" aria-pressed="${d === divisor}">同除以 ${d}</button>`).join('')}</div><div class="study-visual">${bars(a / divisor, b / divisor, ['前項', '後項'])}<div class="study-relation">${pair(a / divisor, b / divisor)}</div></div><p class="study-observation">${Q.gcd(a / divisor, b / divisor) === 1 ? '前項、後項都是整數，而且最大公因數是 1，已經最簡。' : `兩項仍有大於 1 的公因數，還可以繼續一起縮小。`}</p>` : '<p>先把兩項都化為整數，再一起除以公因數。</p>'}`;
  }
  function cell(field, part, label) {
    return `<input class="study-input" id="study-input-${field}-${part}" data-study-field="${field}" data-study-part="${part}" aria-label="${Q.displayText(label)}" type="text" readonly inputmode="none" autocomplete="off" placeholder="${part === 'numerator' ? '分子' : part === 'denominator' ? '分母' : '填數字'}">`;
  }
  function fieldsHtml() {
    const c = check();
    return c.fields.map((label, i) => {
      const entry = entries()[i];
      const fraction = `<span class="fraction entry-fraction"><span>${cell(i, 'numerator', label + '的分子')}</span><span>${cell(i, 'denominator', label + '的分母')}</span></span>`;
      const inputs = entry.kind === 'number' ? cell(i, 'number', label) : entry.kind === 'mixed' ? `<span class="mixed-number">${cell(i, 'whole', label + '的整數部分')}${fraction}</span>` : fraction;
      const formats = c.rational ? `<div class="entry-formats" role="group" aria-label="比值的表示方式">${[['number', '整數／小數'], ['fraction', '分數'], ['mixed', '帶分數']].map(([kind, text]) => `<button type="button" class="format-btn" data-study-format="${kind}" aria-pressed="${entry.kind === kind}">${text}</button>`).join('')}</div>` : '';
      return `${i ? '<span class="study-colon">：</span>' : ''}<div class="study-field"><label class="field-label" for="study-input-${i}-${E.parts(entry)[0]}">${label}</label>${formats}<div class="study-entry">${inputs}</div></div>`;
    }).join('');
  }
  function render() {
    if (!active) return;
    const p = progress(), l = lesson(), phaseNames = ['先猜一猜', '動手驗證', '自己做', '完成'];
    const finished = state.progress.filter(item => item.passed.every(Boolean)).length;
    root.innerHTML = `<div class="study-heading"><div><span class="study-eyebrow">🦔 自修模式</span><h2>${l.title}</h2></div><span class="study-completion">已學會 ${finished}／4 段</span></div>
      <nav class="study-lessons" aria-label="自修學習段落">${S.lessons.map((item, i) => `<button type="button" class="secondary-btn" data-study-lesson="${i}" aria-current="${i === state.lesson ? 'step' : 'false'}">${state.progress[i].passed.every(Boolean) ? '✓' : i + 1} ${item.title}</button>`).join('')}</nav>
      <div class="study-phase-track" aria-label="目前步驟">${phaseNames.map((name, i) => `<span ${i === p.phase ? 'aria-current="step"' : ''}>${name}</span>`).join('<span aria-hidden="true">›</span>')}</div>
      <p class="study-goal">${l.goal}</p><div id="study-content"></div><p class="study-storage">${canStore ? '自修進度保存在這台裝置的瀏覽器；共用裝置也會共用這份進度。' : '目前無法儲存到裝置；本次開啟期間仍會保留進度。'}</p>`;
    const body = $('study-content');
    if (p.phase === 0) {
      body.innerHTML = `<div class="study-question"><h3>${Q.displayText(l.prediction)}</h3><div class="study-choices">${l.choices.map((text, i) => `<button type="button" class="secondary-btn" data-study-choice="${i}" aria-pressed="${p.prediction === i}">${Q.displayText(text)}</button>`).join('')}</div><p>先保留你的想法，下一步用教具驗證。猜錯也沒關係。</p></div>`;
    } else if (p.phase === 1) {
      body.innerHTML = `<p class="study-prediction">你的猜測：${Q.displayText(l.choices[p.prediction])}</p><div class="study-exploration">${explorationHtml()}</div>${p.explored ? `<div class="study-finding"><strong>${p.prediction === l.answer ? '你的猜測和觀察一致。' : '把原來的猜測，和現在的觀察比較看看。'}</strong><p>${l.finding}</p></div>` : ''}`;
    } else if (p.phase === 2) {
      const c = check();
      body.innerHTML = `<div class="study-question"><span class="study-eyebrow">${c.form ? `${c.form}・` : ''}小檢核 ${p.checkpoint + 1}／${l.checks.length}</span><h3>${Q.displayText(c.text)}</h3><p class="requirement">（${c.requirement}）</p><div class="study-fields">${fieldsHtml()}</div></div>`;
      root.querySelectorAll('[data-study-field]').forEach(el => {
        el.value = entries()[Number(el.dataset.studyField)][el.dataset.studyPart];
        el.addEventListener('focus', () => activate(Number(el.dataset.studyField), el.dataset.studyPart));
        el.addEventListener('click', () => activate(Number(el.dataset.studyField), el.dataset.studyPart));
      });
      activate(activeField, activePart);
    } else {
      body.innerHTML = `<div class="study-finish"><span class="study-finish-mark" aria-hidden="true">✓</span><h3>${l.title}，完成了！</h3><p>${l.finding}</p><button type="button" class="secondary-btn" id="study-practice-topic">練習這個觀念</button></div>`;
    }
    bind(); updateDock();
  }
  function notify(text = '', status = '') {
    $('study-feedback').textContent = text; $('study-feedback').dataset.status = status;
  }
  function measure() {
    if (!active) return;
    document.documentElement.style.setProperty('--dock-space', `${$('study-dock').getBoundingClientRect().height + 16}px`);
    if (progress().phase === 2) revealInput();
  }
  function updateDock() {
    const p = progress(), l = lesson(), typing = p.phase === 2;
    $('study-dock').classList.toggle('study-navigation-only', !typing);
    $('study-numpad').hidden = !typing;
    $('study-back').hidden = p.phase < 2;
    $('study-back').textContent = feedback && feedback.revisit ? feedback.revisit : '回看教具';
    $('study-next').disabled = p.phase === 0 ? p.prediction === null : p.phase === 1 ? !p.explored : false;
    $('study-next').textContent = p.phase === 0 ? '開始驗證 →' : p.phase === 1 ? '我來試一題 →' : p.phase === 2 ? p.passed[p.checkpoint] ? p.checkpoint < l.checks.length - 1 ? '下一個小檢核 →' : '完成這一段 →' : '檢查答案' : state.lesson < S.lessons.length - 1 ? '接著學下一段 →' : '開始綜合練習 →';
    if (!typing) $('study-phase-note').textContent = `${state.lesson + 1}／4 ${l.title}・${['先猜一猜', '動手驗證', '自己做', '已完成'][p.phase]}`;
    else activate(activeField, activePart);
    notify(feedback ? feedback.message : p.phase === 1 && !p.explored ? '操作一次教具，再進入小檢核。' : p.phase === 2 && p.passed[p.checkpoint] ? '這題答對了，繼續下一步。' : '', feedback ? feedback.status === 'success' ? 'success' : 'error' : '');
    measure();
  }
  function activate(field, part) {
    if (!active || progress().phase !== 2) return;
    const row = entries(); activeField = row[field] ? field : 0;
    const parts = E.parts(row[activeField]); activePart = parts.includes(part) ? part : parts[0];
    root.querySelectorAll('[data-study-field]').forEach(el => el.classList.toggle('active', Number(el.dataset.studyField) === activeField && el.dataset.studyPart === activePart));
    const partNames = { number: '', whole: '整數部分', numerator: '分子', denominator: '分母' };
    $('study-phase-note').textContent = `目前作答：${check().fields[activeField]}${partNames[activePart] ? '・' + partNames[activePart] : ''}`;
    const rational = !!check().rational;
    $('study-numpad').querySelectorAll('[data-study-key]').forEach(el => {
      el.disabled = ['fraction', 'space'].includes(el.dataset.studyKey) ? !rational : el.dataset.studyKey === '.' ? !rational || activePart !== 'number' : false;
    });
  }
  function revealInput() {
    requestAnimationFrame(() => {
      if (!active || progress().phase !== 2) return;
      const el = $(`study-input-${activeField}-${activePart}`); if (!el) return;
      const rect = el.closest('.study-entry').getBoundingClientRect(), top = $('study-dock').getBoundingClientRect().top;
      if (rect.bottom > top - 12) window.scrollBy(0, rect.bottom - top + 24);
    });
  }
  function nextCell() {
    const cells = entries().flatMap((entry, i) => E.parts(entry).map(part => [i, part]));
    const current = cells.findIndex(([i, part]) => i === activeField && part === activePart);
    activate(...cells[(current + 1) % cells.length]); revealInput();
  }
  function changeFormat(kind) {
    if (!check().rational) return;
    const entry = entries()[activeField];
    if (entry.kind !== kind) {
      const value = E.complete(entry) && Q.parse(E.value(entry));
      if (value) {
        if (kind === 'fraction') { entry.numerator = String(value.n); entry.denominator = String(value.d); }
        else if (kind === 'mixed') { entry.whole = String(Math.floor(value.n / value.d)); entry.numerator = String(value.n % value.d); entry.denominator = String(value.d); }
        else { const decimal = String(value.n / value.d); entry.number = Q.correct(decimal, { expected: value }) ? decimal : ''; }
      }
      entry.kind = kind; activePart = E.parts(entry)[0];
    }
    progress().passed[progress().checkpoint] = false; feedback = null; save(); render(); revealInput();
  }
  function input(key) {
    if (!active || progress().phase !== 2 || $('mode-dialog').open) return;
    if (key === 'next') { nextCell(); return; }
    if (key === 'fraction' || key === 'space') { changeFormat(key === 'fraction' ? 'fraction' : 'mixed'); return; }
    if (key === 'separator') { if (!check().rational) return; if (entries()[activeField].kind === 'number') changeFormat('fraction'); activate(activeField, 'denominator'); revealInput(); return; }
    if (key === '.' && (!check().rational || activePart !== 'number')) return;
    E.edit(entries()[activeField], activePart, key);
    progress().passed[progress().checkpoint] = false; feedback = null;
    $(`study-input-${activeField}-${activePart}`).value = entries()[activeField][activePart];
    save(); updateDock();
  }
  function changed(action) {
    action(progress().exploration); progress().explored = true; feedback = null; save(); render();
  }
  function bind() {
    root.querySelectorAll('[data-study-lesson]').forEach(el => el.addEventListener('click', () => { state.lesson = Number(el.dataset.studyLesson); activeField = 0; activePart = 'number'; feedback = null; save(); render(); }));
    root.querySelectorAll('[data-study-choice]').forEach(el => el.addEventListener('click', () => { progress().prediction = Number(el.dataset.studyChoice); feedback = null; save(); render(); }));
    root.querySelectorAll('[data-order]').forEach(el => el.addEventListener('click', () => changed(x => { x.order = el.dataset.order; })));
    if ($('study-reverse')) $('study-reverse').onclick = () => changed(x => { x.reverse = !x.reverse; });
    const factor = n => changed(x => { x.factor = Math.max(1, Math.min(6, n)); });
    if ($('study-factor')) {
      // Keep the range element mounted while dragging with mouse or touch.
      $('study-factor').oninput = event => {
        const x = progress().exploration; x.factor = Number(event.target.value); progress().explored = true; save();
        const temporary = document.createElement('div'); temporary.innerHTML = explorationHtml();
        const exploration = root.querySelector('.study-exploration');
        ['.study-visual', '.study-comparison'].forEach(selector => {
          exploration.querySelector(selector).innerHTML = temporary.querySelector(selector).innerHTML;
        });
        exploration.querySelector('.study-observation').textContent = temporary.querySelector('.study-observation').textContent;
        exploration.querySelector('output').textContent = x.factor + ' 倍';
        $('study-factor-minus').disabled = x.factor === 1;
        $('study-factor-plus').disabled = x.factor === 6;
        updateFinding(); updateDock();
      };
      bindExplorationFactor(factor);
    }
    if ($('study-recipe')) $('study-recipe').onchange = event => changed(x => { x.recipe = Number(event.target.value); x.divisor = 1; x.converted = false; });
    if ($('study-convert')) $('study-convert').onclick = () => changed(x => { x.converted = true; });
    root.querySelectorAll('[data-divisor]').forEach(el => el.addEventListener('click', () => changed(x => { x.divisor = Number(el.dataset.divisor); })));
    root.querySelectorAll('[data-study-format]').forEach(el => el.addEventListener('click', () => changeFormat(el.dataset.studyFormat)));
    if ($('study-practice-topic')) $('study-practice-topic').onclick = () => window.PaperPractice.startPractice(lesson().practice);
  }
  function updateFinding() {
    const body = $('study-content');
    if (!body.querySelector('.study-finding')) {
      const finding = document.createElement('div'); finding.className = 'study-finding';
      const text = document.createElement('p'); text.textContent = lesson().finding; finding.append(text); body.append(finding);
    }
  }
  function bindExplorationFactor(factor) {
    $('study-factor-minus').onclick = () => factor(progress().exploration.factor - 1);
    $('study-factor-plus').onclick = () => factor(progress().exploration.factor + 1);
    $('study-free').onclick = () => changed(x => { x.free = !x.free; if (!x.free) x.waterOnly = false; });
    root.querySelectorAll('[data-water]').forEach(el => { el.onclick = () => changed(x => { x.waterOnly = el.dataset.water === 'true'; }); });
  }
  function advance() {
    if (!active || $('mode-dialog').open) return;
    const p = progress(); feedback = null;
    if (p.phase === 0) { if (p.prediction === null) return; p.phase = 1; }
    else if (p.phase === 1) { if (!p.explored) return; p.phase = 2; activeField = 0; activePart = E.parts(entries()[0])[0]; }
    else if (p.phase === 2) {
      if (p.passed[p.checkpoint]) {
        if (p.checkpoint < lesson().checks.length - 1) { p.checkpoint++; activeField = 0; activePart = 'number'; }
        else p.phase = 3;
      } else {
        feedback = S.assess(check(), entries().map(E.value));
        if (feedback.status === 'success') p.passed[p.checkpoint] = true;
      }
    } else if (state.lesson < S.lessons.length - 1) { state.lesson++; activeField = 0; activePart = 'number'; }
    else { window.PaperPractice.startPractice('mixed'); return; }
    save(); render(); revealInput();
  }
  function hide() {
    if (!active) return;
    save(); active = false; root.hidden = true; $('study-dock').hidden = true;
    $('resume-paper-session').hidden = true; window.PaperPractice.resume();
  }
  function start() {
    const previous = window.PaperPractice.suspend();
    active = true; feedback = null; root.hidden = false; $('study-dock').hidden = false;
    $('resume-paper-session').hidden = !previous;
    if ($('mode-dialog').open) $('mode-dialog').close();
    save(); render(); revealInput();
  }
  document.querySelectorAll('[data-start-study]').forEach(el => el.addEventListener('click', start));
  $('resume-paper-session').onclick = () => { hide(); if ($('mode-dialog').open) $('mode-dialog').close(); };
  $('study-next').onclick = advance;
  $('study-back').onclick = () => { progress().phase = 1; feedback = null; save(); render(); };
  document.querySelectorAll('[data-study-key]').forEach(el => el.addEventListener('click', () => input(el.dataset.studyKey)));
  document.addEventListener('paper-session-start', hide);
  document.addEventListener('keydown', event => {
    if (!active || progress().phase !== 2 || $('mode-dialog').open || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.target.matches('a, select, textarea, input:not(.study-input)')) return;
    if (/^[0-9.]$/.test(event.key)) { event.preventDefault(); input(event.key); }
    else if (event.key === '/') { event.preventDefault(); input('separator'); }
    else if (event.key === 'Backspace') { event.preventDefault(); input('delete'); }
    else if (event.key === 'Enter' && event.target.matches('.study-input')) { event.preventDefault(); advance(); }
  });
  if (window.ResizeObserver) new ResizeObserver(measure).observe($('study-dock'));
  window.addEventListener('resize', measure);
  if (new URLSearchParams(location.search).get('mode') === 'study') start();
})();
