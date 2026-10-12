(function () {
  'use strict';
  const Q = window.PaperQuestions, E = window.RatioInput, $ = id => document.getElementById(id);
  const partLabels = { number: '整數／小數', whole: '整數', numerator: '分子', denominator: '分母' };
  const state = { mode: 'idle', type: Q.defaultType || 'ratio', question: null, number: 0, step: 0, done: false,
    questions: [], answers: [], review: [], examEntries: [], entries: {}, equations: {}, index: 0, activeKey: null, activePart: null,
    values: {}, forms: ['integer', 'decimal', 'fraction', 'mixed'], deadline: 0, timer: null };
  function message(text, status = '') { $('feedback').textContent = text; $('feedback').dataset.status = status; }
  function forms() { return Q.settings ? Q.settings() : [...document.querySelectorAll('.number-forms input:checked')].map(el => el.value); }
  function stopTimer() { if (state.timer !== null) clearInterval(state.timer); state.timer = null; }
  function availableFields() {
    if (!state.question || state.done) return [];
    return state.mode === 'exam' ? state.question.finalFields : state.question.steps[state.step].fields;
  }
  function entry(f) { return state.entries[f.key] || (state.entries[f.key] = E.fromValue(state.values[f.key] || '')); }
  function openModes() {
    $('mode-error').textContent = '';
    if (!$('mode-dialog').open) $('mode-dialog').showModal();
  }
  function closeModes() { $('mode-dialog').close(); }
  function start(mode, type = state.type) {
    const chosen = forms();
    if (Array.isArray(chosen) && !chosen.length) { $('mode-error').textContent = '請至少勾選一種化簡題的數字類型。'; return; }
    if (state.mode === 'exam' && !state.done && !confirm('切換模式會結束目前尚未交卷的測驗，確定切換嗎？')) return;
    stopTimer(); state.mode = mode; state.type = type; state.forms = chosen;
    state.number = 0; state.index = 0; state.done = false;
    state.questions = mode === 'exam' ? Q.buildExam(state.forms) : [];
    state.review = state.questions.map(() => false);
    state.answers = state.questions.map(() => ({})); state.examEntries = state.questions.map(() => ({}));
    closeModes();
    $('welcome').hidden = true; $('results').hidden = true; $('workspace').hidden = false;
    $('game-status').hidden = false; $('keyboard-dock').hidden = false;
    $('timer').hidden = mode !== 'exam'; $('exam-actions').hidden = mode !== 'exam'; $('exam-overview').hidden = mode !== 'exam';
    document.querySelectorAll('[data-type]').forEach(el => {
      const active = mode === 'practice' && type === el.dataset.type;
      el.classList.toggle('active', active); el.setAttribute('aria-pressed', String(active));
    });
    $('start-exam').classList.toggle('active', mode === 'exam');
    if (mode === 'exam') {
      state.deadline = Date.now() + 600000; state.question = state.questions[0]; render(); updateTimer();
      state.timer = setInterval(updateTimer, 500);
    } else newPractice();
  }
  function newPractice() {
    let q; const previous = state.question && state.question.text;
    for (let i = 0; i < 10; i++) { q = Q.generate(state.type, state.forms, Math.random, state.number); if (q.text !== previous) break; }
    state.question = q; state.number++; render();
  }
  function inputHtml(f, part, locked, rational = false) {
    const suffix = rational ? `-${part}` : '', label = rational ? `${f.label}的${partLabels[part]}` : f.label;
    return `<input id="input-${f.key}${suffix}" class="answer-input ${rational && part !== 'number' ? 'part-input' : ''}" data-field="${f.key}" data-part="${part}" type="text" readonly inputmode="none" autocomplete="off" aria-label="${label}" placeholder="${rational ? partLabels[part] : '填數字'}" ${locked ? 'disabled' : ''}>`;
  }
  function entryMarkup(f, locked) {
    const model = entry(f);
    const formats = `<span class="entry-formats" role="group" aria-label="${f.label}的表示方式">${[['number', '整數／小數'], ['fraction', '分數'], ['mixed', '帶分數']].filter(([kind]) => !f.formats || f.formats.includes(kind)).map(([kind, label]) => `<button type="button" class="format-btn" data-field="${f.key}" data-form="${kind}" aria-pressed="${kind === model.kind}" ${locked ? 'disabled' : ''}>${label}</button>`).join('')}</span>`;
    const fraction = `<span class="fraction entry-fraction"><span>${inputHtml(f, 'numerator', locked, true)}</span><span>${inputHtml(f, 'denominator', locked, true)}</span></span>`;
    const cells = model.kind === 'number' ? inputHtml(f, 'number', locked, true) : model.kind === 'mixed' ? `<span class="mixed-number">${inputHtml(f, 'whole', locked, true)}${fraction}</span>` : fraction;
    const equation = state.equations[f.key] || { before: '', after: '' };
    return `${formats}<span class="number-entry">${equation.before ? `<span class="equation-text">${Q.displayText(equation.before)}</span>` : ''}${cells}${equation.after ? `<span class="equation-text">${Q.displayText(equation.after)}</span>` : ''}</span>`;
  }
  function fieldHtml(f, locked, showNote = true) {
    const note = f.requirement && showNote ? `<span class="requirement">（${f.requirement}）</span>` : '';
    const label = `<span class="field-label">${f.label}${note}</span>`;
    if (f.type === 'decision') return `<span class="field-box">${label}<span class="decision" role="group" aria-label="${f.label}">${(f.options || ['yes', 'no']).map(v => `<button type="button" class="secondary-btn" data-field="${f.key}" data-decision="${v}" aria-pressed="false" ${locked ? 'disabled' : ''}>${f.optionLabels ? f.optionLabels[v] : v === 'yes' ? '是' : '不是'}</button>`).join('')}</span></span>`;
    return `<span class="field-box">${label}${f.type === 'rational' ? `<span id="entry-${f.key}" class="rational-entry">${entryMarkup(f, locked)}</span>` : `<span class="number-entry">${inputHtml(f, 'number', locked)}${f.unit ? `<span>${Q.displayText(f.unit)}</span>` : ''}</span>`}</span>`;
  }
  function bindField(f) {
    document.querySelectorAll(`input[data-field="${f.key}"]`).forEach(el => {
      el.value = f.type === 'rational' ? entry(f)[el.dataset.part] : state.values[f.key] || '';
      const select = () => { if (!el.disabled && !expired()) activate(f.key, el.dataset.part); };
      el.addEventListener('focus', select); el.addEventListener('click', select);
    });
    document.querySelectorAll(`[data-form][data-field="${f.key}"]`).forEach(el => el.addEventListener('click', () => changeForm(f, el.dataset.form)));
    document.querySelectorAll(`[data-decision][data-field="${f.key}"]`).forEach(el => {
      el.setAttribute('aria-pressed', String(state.values[f.key] === el.dataset.decision));
      el.addEventListener('click', () => {
        if (el.disabled || expired()) return;
        state.values[f.key] = el.dataset.decision;
        document.querySelectorAll(`[data-decision][data-field="${f.key}"]`).forEach(b => b.setAttribute('aria-pressed', String(b === el)));
        message('已選擇，按確認繼續。'); updateJump();
      });
    });
  }
  function render() {
    const q = state.question, exam = state.mode === 'exam'; state.step = 0; state.done = false;
    state.values = exam ? state.answers[state.index] : {};
    state.entries = exam ? state.examEntries[state.index] : {};
    state.equations = {};
    $('mode-label').textContent = exam ? '綜合測驗' : '分步練習'; $('category-label').textContent = exam ? '' : q.category;
    $('question-text').innerHTML = q.textHtml;
    $('question-number').textContent = exam ? `題號：${state.index + 1} / ${state.questions.length}` : `練習第 ${state.number} 題`;
    const steps = exam ? (q.type === 'value' ? [
      { title: '填入比', fields: q.finalFields.slice(0, 2), pattern: `{${q.finalFields[0].key}}：{${q.finalFields[1].key}}` },
      { title: '填入比值', fields: [q.finalFields[2]], pattern: `{${q.finalFields[2].key}}` }
    ] : [{ title: '填入答案', fields: q.finalFields, pattern: q.finalFields.map(f => `{${f.key}}`).join('　') }]) : q.steps;
    $('steps').innerHTML = steps.map((s, i) => {
      const sharedNote = s.fields.length === 2 && s.fields[0].requirement && s.fields.every(f => f.requirement === s.fields[0].requirement) ? s.fields[0].requirement : '';
      let pattern;
      if (s.fields.length === 1 && s.fields[0].type === 'rational') {
        const f = s.fields[0], [before, after] = s.pattern.split(`{${f.key}}`);
        state.equations[f.key] = { before, after };
        pattern = fieldHtml(f, !exam && i > 0);
      } else {
        pattern = s.pattern.split(/(\{f\d+\})/).map(piece => {
          const f = s.fields.find(f => piece === `{${f.key}}`);
          return f ? fieldHtml(f, !exam && i > 0, !sharedNote) : piece.trim() ? `<span class="equation-text">${Q.displayText(piece)}</span>` : '';
        }).join('');
      }
      if (sharedNote) pattern += `<span class="ratio-note requirement">（${sharedNote}）</span>`;
      return `<section class="step ${!exam && i > 0 ? 'locked' : ''}" id="step-${i}"><h3>${exam ? '' : `${i + 1}. `}${s.title}</h3><div class="lock-note">完成前一步後，開啟這一步。</div><div class="field-row">${pattern}</div><div class="solution" hidden></div></section>`;
    }).join('');
    steps.flatMap(s => s.fields).forEach(bindField);
    $('hint-button').hidden = exam; $('hint').hidden = true; $('hint-button').setAttribute('aria-expanded', 'false');
    $('check-answer').hidden = false; $('next-question').hidden = true;
    $('check-answer').textContent = exam ? state.index === state.questions.length - 1 ? '儲存答案並交卷' : '儲存答案，下一題' : '確認這一步';
    $('previous-question').disabled = state.index === 0;
    message(''); activate(availableFields()[0].key); updateJump();
    if (Q.renderExtra) Q.renderExtra(q, exam);
    measureDock();
  }
  function activeElement() {
    const f = availableFields().find(f => f.key === state.activeKey);
    if (!f || f.type === 'decision') return null;
    return $(`input-${f.key}${f.type === 'rational' ? `-${state.activePart}` : ''}`);
  }
  function ensureVisible() {
    if ($('mode-dialog').open) return;
    const el = activeElement(); if (!el) return;
    const rect = el.getBoundingClientRect(), dockTop = $('keyboard-dock').getBoundingClientRect().top;
    const headerBottom = document.querySelector('.nav-bar').getBoundingClientRect().bottom;
    if (rect.bottom > dockTop - 10) window.scrollBy(0, rect.bottom - dockTop + 20);
    else if (rect.top < Math.max(0, headerBottom) + 10) window.scrollBy(0, rect.top - Math.max(0, headerBottom) - 20);
  }
  function measureDock() {
    const height = $('keyboard-dock').hidden ? 0 : $('keyboard-dock').getBoundingClientRect().height + 16;
    document.documentElement.style.setProperty('--dock-space', `${height}px`);
    requestAnimationFrame(ensureVisible);
  }
  function activate(key, part) {
    if (state.done) return;
    const f = availableFields().find(f => f.key === key); if (!f) return;
    state.activeKey = key;
    state.activePart = f.type === 'rational' ? (E.parts(entry(f)).includes(part) ? part : E.parts(entry(f))[0]) : 'number';
    document.querySelectorAll('.answer-input').forEach(el => el.classList.toggle('active', el.dataset.field === key && el.dataset.part === state.activePart));
    $('phase-note').textContent = `目前作答：${f.label}${f.type === 'rational' ? `・${partLabels[state.activePart]}` : ''}`;
    $('numpad').hidden = f.type === 'decision'; $('key-hint').hidden = f.type !== 'rational';
    document.querySelectorAll('[data-key="fraction"], [data-key="space"]').forEach(el => { el.disabled = f.type !== 'rational' || (f.formats && !f.formats.includes(el.dataset.key === 'space' ? 'mixed' : 'fraction')); });
    $('numpad').querySelectorAll('button').forEach(el => {
      if (!['fraction', 'space'].includes(el.dataset.key)) el.disabled = false;
    });
    $('numpad').querySelector('[data-key="."]').disabled = f.type === 'rational' ? state.activePart !== 'number' : !!f.integerOnly;
    measureDock();
  }
  function expired() {
    if (state.mode === 'exam' && !state.done && Date.now() >= state.deadline) { finish(true); return true; }
    return state.done;
  }
  function changeForm(f, kind) {
    if (expired() || !availableFields().includes(f) || (f.formats && !f.formats.includes(kind))) return;
    const model = entry(f), oldKind = model.kind;
    if (oldKind !== kind) {
      const parsed = E.complete(model) && Q.parse(E.value(model));
      if (parsed) {
        if (kind === 'fraction') {
          model.numerator = String(oldKind === 'mixed' ? Number(model.whole) * Number(model.denominator) + Number(model.numerator) : parsed.n);
          model.denominator = oldKind === 'mixed' ? model.denominator : String(parsed.d);
        } else if (kind === 'mixed') {
          const n = oldKind === 'fraction' ? Number(model.numerator) : parsed.n, d = oldKind === 'fraction' ? Number(model.denominator) : parsed.d;
          model.whole = String(Math.floor(n / d)); model.numerator = String(n % d); model.denominator = String(d);
        } else {
          const decimal = String(parsed.n / parsed.d);
          model.number = Q.correct(decimal, { expected: parsed }) ? decimal : '';
        }
      }
      model.kind = kind;
      state.values[f.key] = E.value(model);
      $(`entry-${f.key}`).innerHTML = entryMarkup(f, false); bindField(f);
    }
    activate(f.key, E.parts(model)[0]); updateJump(); message('點選想填的格子即可輸入或修改。');
  }
  function nextCell() {
    const cells = availableFields().flatMap(f => f.type === 'decision' ? [] : (f.type === 'rational' ? E.parts(entry(f)) : ['number']).map(part => ({ key: f.key, part })));
    if (!cells.length) return;
    const i = cells.findIndex(cell => cell.key === state.activeKey && cell.part === state.activePart), next = cells[(i + 1) % cells.length];
    activate(next.key, next.part);
  }
  function inputKey(key) {
    if ($('mode-dialog').open || !state.question || expired()) return;
    const f = availableFields().find(f => f.key === state.activeKey); if (!f || f.type === 'decision') return;
    if (key === 'next') { nextCell(); return; }
    if (f.type === 'rational' && ['fraction', 'space'].includes(key)) { changeForm(f, key === 'space' ? 'mixed' : 'fraction'); return; }
    if (f.type === 'rational' && key === 'separator') { if (entry(f).kind === 'number') changeForm(f, 'fraction'); activate(f.key, 'denominator'); return; }
    const el = activeElement(); if (!el || el.disabled) return;
    if (f.type === 'rational') {
      E.edit(entry(f), state.activePart, key); state.values[f.key] = E.value(entry(f)); el.value = entry(f)[state.activePart];
    } else {
      let value = state.values[f.key] || '';
      if (key === 'delete') value = value.slice(0, -1);
      else if (key === 'clear') value = '';
      else if (value.length < 8 && (/^[0-9]$/.test(key) || (key === '.' && !f.integerOnly && !value.includes('.')))) value += key;
      state.values[f.key] = value; el.value = value;
    }
    updateJump(); message('');
  }
  function hasAnswer(f, values, entries) { return window.PaperExamStatus.filled(f, values, entries); }
  function check() {
    if ($('mode-dialog').open || !state.question || expired()) return;
    const fields = availableFields(), empty = fields.find(f => !hasAnswer(f, state.values, state.entries));
    if (empty) {
      const part = empty.type === 'rational' ? E.parts(entry(empty)).find(p => entry(empty)[p] === '') : undefined;
      activate(empty.key, part); message(`請先填寫「${empty.label}${part ? `的${partLabels[part]}` : ''}」。`, 'error'); return;
    }
    if (state.mode === 'exam') { move(1); return; }
    const wrong = fields.find(f => !Q.correct(state.values[f.key], f));
    if (wrong) { activate(wrong.key); message(`「${wrong.label}」再想一想。可按「看提示」查看這一步的方向。`, 'error'); return; }
    const s = state.question.steps[state.step], card = $(`step-${state.step}`);
    card.querySelectorAll('input, button').forEach(el => { el.disabled = true; el.classList.remove('active'); });
    const solution = card.querySelector('.solution'); solution.hidden = false; solution.innerHTML = Q.displayText(`✓ ${s.explanation}`);
    state.step++; $('hint').hidden = true; $('hint-button').setAttribute('aria-expanded', 'false');
    if (state.step === state.question.steps.length) {
      state.done = true; $('numpad').hidden = true; $('key-hint').hidden = true; $('hint-button').hidden = true;
      $('check-answer').hidden = true; $('next-question').hidden = false; $('phase-note').textContent = '這一題完成了！';
      message('答對了！按「下一題」繼續練習。', 'success'); playSuccess(); measureDock();
    } else {
      const next = $(`step-${state.step}`); next.classList.remove('locked'); next.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
      activate(availableFields()[0].key); message('這一步正確，繼續完成下一步。', 'success');
    }
  }
  function move(delta, target) {
    if (state.mode !== 'exam' || expired()) return;
    const next = target === undefined ? state.index + delta : target;
    if (next < 0) return;
    if (next >= state.questions.length) { finish(false); return; }
    state.index = next; state.question = state.questions[next]; render();
  }
  function questionStatus(i) {
    return window.PaperExamStatus.classify(state.questions[i].finalFields, state.answers[i], state.examEntries[i], state.review[i]);
  }
  function updateJump() {
    if (state.mode !== 'exam') return;
    const box = $('exam-jump'); box.replaceChildren();
    const statuses = state.questions.map((_, i) => questionStatus(i));
    state.questions.forEach((q, i) => {
      const el = document.createElement('button'), status = statuses[i];
      el.type = 'button'; el.textContent = i + 1;
      el.classList.toggle('answered', status.completion === 'complete');
      el.classList.toggle('partial', status.completion === 'partial');
      el.classList.toggle('flagged', status.review); el.classList.toggle('current', i === state.index);
      el.setAttribute('aria-label', `第${i + 1}題・${status.label}`);
      if (i === state.index) el.setAttribute('aria-current', 'true');
      el.addEventListener('click', () => move(0, i)); box.append(el);
    });
    const current = statuses[state.index];
    $('mark-review').setAttribute('aria-pressed', String(current.review));
    $('mark-review').textContent = current.review ? '取消待檢查標記' : '標記待檢查';
    $('answer-status').textContent = current.label;
    const complete = statuses.filter(s => s.completion === 'complete').length;
    $('exam-summary').textContent = `已填完 ${complete}／${statuses.length} 題・未完成 ${statuses.length - complete} 題・待檢查 ${statuses.filter(s => s.review).length} 題。紫色標記會保留原本的作答狀態。`;
  }
  function finish(timedOut) {
    if (state.mode !== 'exam' || state.done) return;
    const unanswered = state.questions.filter((q, i) => q.finalFields.some(f => !hasAnswer(f, state.answers[i], state.examEntries[i]))).length;
    const pendingReview = state.review.filter(Boolean).length;
    const warnings = [unanswered ? `還有${unanswered}題未完成` : '', pendingReview ? `還有${pendingReview}題標記待檢查` : ''].filter(Boolean);
    if (!timedOut && !confirm(warnings.length ? `${warnings.join('，')}，確定交卷嗎？` : '確定交卷並查看成績嗎？')) return;
    stopTimer(); state.done = true; $('workspace').hidden = true; $('game-status').hidden = true; $('keyboard-dock').hidden = true; $('results').hidden = false;
    const correct = state.questions.filter((q, i) => q.finalFields.every(f => Q.correct(state.answers[i][f.key] || '', f))).length;
    $('result-heading').textContent = timedOut ? '時間到，已交卷' : '測驗完成'; $('final-score').textContent = `${correct * 10} 分`;
    $('result-summary').textContent = `答對${correct}／${state.questions.length}題。每題全部答案正確得10分。點開各題查看解析。`;
    const list = $('review-list'); list.replaceChildren();
    state.questions.forEach((q, i) => {
      const details = document.createElement('details'), summary = document.createElement('summary'), question = document.createElement('p'), solution = document.createElement('div');
      summary.textContent = `${i + 1}. ${q.finalFields.every(f => Q.correct(state.answers[i][f.key] || '', f)) ? '✓ 答對' : '✕ 未答對'}${state.review[i] ? '・待檢查' : ''}｜${q.category}`;
      question.innerHTML = q.textHtml; details.append(summary, question);
      q.finalFields.forEach(f => {
        const p = document.createElement('p'); p.className = 'review-answer'; const v = state.answers[i][f.key];
        const display = f.type === 'decision' ? x => f.optionLabels ? f.optionLabels[x] : x === 'yes' ? '是' : '不是' : Q.format;
        const answer = f.type === 'rational' && v ? Q.displayNumber(E.visual(state.examEntries[i][f.key]), true) : Q.displayText(v ? display(v) : '未作答');
        p.innerHTML = `${Q.displayText(f.label + (f.requirement ? `（${f.requirement}）` : '') + '：你的答案 ')}${answer}${Q.displayText(`；正確答案 ${display(f.expected)}${f.unit ? ' ' + f.unit : ''}`)}`;
        details.append(p);
      });
      solution.className = 'solution'; solution.innerHTML = Q.displayText(q.explanation); details.append(solution); list.append(details);
    });
    measureDock(); $('work-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function updateTimer() {
    if (state.done) return;
    const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (!seconds) finish(true);
  }
  let audio;
  function playSuccess() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      if (!audio) audio = new Audio(); audio.resume().catch(() => {});
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const tone = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .1;
        tone.frequency.value = frequency; tone.connect(gain); gain.connect(audio.destination);
        gain.gain.setValueAtTime(.1, t); gain.gain.exponentialRampToValueAtTime(.001, t + .2); tone.start(t); tone.stop(t + .2);
      });
    } catch (_) { /* Optional audio. */ }
  }
  document.querySelectorAll('[data-open-modes]').forEach(el => el.addEventListener('click', openModes));
  $('close-modes').addEventListener('click', closeModes);
  document.querySelectorAll('[data-type]').forEach(el => el.addEventListener('click', () => start('practice', el.dataset.type)));
  document.querySelectorAll('[data-key]').forEach(el => el.addEventListener('click', () => inputKey(el.dataset.key)));
  $('start-exam').addEventListener('click', () => start('exam')); $('retry-exam').addEventListener('click', () => start('exam'));
  $('check-answer').addEventListener('click', check);
  $('next-question').addEventListener('click', () => { if (state.mode === 'practice' && state.done) newPractice(); });
  $('previous-question').addEventListener('click', () => move(-1)); $('skip-question').addEventListener('click', () => move(1));
  $('mark-review').addEventListener('click', () => {
    if (state.mode !== 'exam' || expired()) return;
    state.review[state.index] = !state.review[state.index]; updateJump();
  });
  $('finish-exam').addEventListener('click', () => { if (!expired()) finish(false); });
  $('hint-button').addEventListener('click', () => {
    if (state.mode !== 'practice' || state.done) return;
    $('hint').hidden = !$('hint').hidden; $('hint').innerHTML = Q.displayText(state.question.steps[state.step].hint);
    $('hint-button').setAttribute('aria-expanded', String(!$('hint').hidden));
    if (Q.showHint) Q.showHint(state.question, !$('hint').hidden);
  });
  document.addEventListener('keydown', event => {
    if ($('mode-dialog').open || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || !state.question || state.done || event.target.matches('a, select, textarea, input[type="checkbox"]')) return;
    if (/^[0-9.]$/.test(event.key)) { event.preventDefault(); inputKey(event.key); }
    else if (event.key === '/') { event.preventDefault(); inputKey('separator'); }
    else if (event.key === 'Backspace') { event.preventDefault(); inputKey('delete'); }
    else if (event.key === 'Enter' && event.target.matches('.answer-input')) { event.preventDefault(); check(); }
  });
  document.addEventListener('visibilitychange', () => { if (state.mode === 'exam' && !state.done) updateTimer(); });
  if (window.ResizeObserver) new ResizeObserver(measureDock).observe($('keyboard-dock'));
  window.addEventListener('resize', measureDock);
})();
