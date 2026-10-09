(function () {
  'use strict';
  const Q = window.RatioQuestions, $ = id => document.getElementById(id);
  const state = { mode: 'idle', type: 'ratio', question: null, number: 0, step: 0, done: false,
    questions: [], answers: [], index: 0, activeKey: null, values: {}, deadline: 0, timer: null };
  function message(text, status = '') { $('feedback').textContent = text; $('feedback').dataset.status = status; }
  function forms() { return [...document.querySelectorAll('.number-forms input:checked')].map(el => el.value); }
  function stopTimer() { if (state.timer !== null) clearInterval(state.timer); state.timer = null; }
  function canRestart() { return state.mode === 'idle' || state.done || confirm('要結束目前的練習或測驗，重新開始嗎？'); }
  function start(mode, type = state.type) {
    if (!forms().length) { alert('請至少勾選一種化簡題的數字類型。'); return; }
    if (!canRestart()) return;
    stopTimer(); state.mode = mode; state.type = type; state.number = 0; state.index = 0; state.done = false;
    state.questions = mode === 'exam' ? Q.buildExam(forms()) : [];
    state.answers = state.questions.map(() => ({}));
    $('welcome').hidden = true; $('results').hidden = true; $('workspace').hidden = false; $('game-status').hidden = false;
    $('timer').hidden = mode !== 'exam'; $('exam-actions').hidden = mode !== 'exam'; $('exam-jump').hidden = mode !== 'exam';
    document.querySelectorAll('.number-forms input').forEach(el => { el.disabled = true; });
    $('settings').open = !matchMedia('(max-width: 800px)').matches;
    document.querySelectorAll('[data-type]').forEach(el => { const active = mode === 'practice' && type === el.dataset.type; el.classList.toggle('active', active); el.setAttribute('aria-pressed', String(active)); });
    $('start-exam').classList.toggle('active', mode === 'exam');
    if (mode === 'exam') {
      state.deadline = Date.now() + 600000; state.question = state.questions[0]; render(); updateTimer();
      state.timer = setInterval(updateTimer, 500);
    } else newPractice();
  }
  function newPractice() {
    let q; const previous = state.question && state.question.text;
    for (let i = 0; i < 10; i++) { q = Q.generate(state.type, forms(), Math.random, state.number); if (q.text !== previous) break; }
    state.question = q; state.number++; render();
  }
  function availableFields() { return state.mode === 'exam' ? state.question.finalFields : state.question.steps[state.step].fields; }
  function fieldHtml(f, locked) {
    const label = `<label for="input-${f.key}">${f.label}</label>`;
    if (f.type === 'decision') return `<span class="field-box"><span>${f.label}</span><span class="decision" role="group" aria-label="${f.label}">${['yes', 'no'].map(v => `<button type="button" class="secondary-btn" data-field="${f.key}" data-decision="${v}" aria-pressed="false" ${locked ? 'disabled' : ''}>${v === 'yes' ? '是' : '不是'}</button>`).join('')}</span></span>`;
    return `<span class="field-box">${label}<input id="input-${f.key}" class="answer-input ${f.type === 'rational' ? 'rational' : ''}" data-field="${f.key}" type="text" readonly inputmode="none" autocomplete="off" ${locked ? 'disabled' : ''}></span>`;
  }
  function render() {
    const q = state.question, exam = state.mode === 'exam'; state.step = 0; state.done = false;
    state.values = exam ? state.answers[state.index] : {};
    $('mode-label').textContent = exam ? '綜合測驗' : '分步練習'; $('category-label').textContent = exam ? '' : q.category;
    $('question-text').innerHTML = q.textHtml;
    $('question-number').textContent = exam ? `題號：${state.index + 1} / 10` : `練習第 ${state.number} 題`;
    const steps = exam ? [{ title: '填入答案', fields: q.finalFields, pattern: q.finalFields.map(f => `{${f.key}}`).join('　') }] : q.steps;
    $('steps').innerHTML = steps.map((s, i) => {
      let pattern = s.pattern; s.fields.forEach(f => { pattern = pattern.replace(`{${f.key}}`, fieldHtml(f, !exam && i > 0)); });
      return `<section class="step ${!exam && i > 0 ? 'locked' : ''}" id="step-${i}"><h3>${exam ? '' : `${i + 1}. `}${s.title}</h3><div class="lock-note">完成前一步後，開啟這一步。</div><div class="field-row">${pattern}</div><div class="solution" hidden></div></section>`;
    }).join('');
    $('steps').querySelectorAll('input').forEach(el => { el.value = state.values[el.dataset.field] || ''; el.addEventListener('click', () => activate(el.dataset.field)); });
    $('steps').querySelectorAll('[data-decision]').forEach(el => {
      el.setAttribute('aria-pressed', String(state.values[el.dataset.field] === el.dataset.decision));
      el.addEventListener('click', () => { if (expired() || state.done) return; state.values[el.dataset.field] = el.dataset.decision; document.querySelectorAll(`[data-decision][data-field="${el.dataset.field}"]`).forEach(b => b.setAttribute('aria-pressed', String(b === el))); message('已選擇，按確認繼續。'); updateJump(); });
    });
    $('hint-button').hidden = exam; $('hint').hidden = true; $('hint-button').setAttribute('aria-expanded', 'false');
    $('check-answer').hidden = false; $('next-question').hidden = true;
    $('check-answer').textContent = exam ? state.index === 9 ? '儲存答案並交卷' : '儲存答案，下一題' : '確認這一步';
    $('previous-question').disabled = state.index === 0;
    message(''); activate(availableFields()[0].key); updateJump();
  }
  function activate(key) {
    if (state.done) return;
    state.activeKey = key;
    document.querySelectorAll('.answer-input').forEach(el => el.classList.toggle('active', el.dataset.field === key));
    const f = availableFields().find(f => f.key === key);
    if (!f) return;
    $('phase-note').textContent = `目前作答：${f.label}`;
    $('numpad').hidden = f.type === 'decision'; $('key-hint').hidden = f.type !== 'rational';
    document.querySelectorAll('[data-key="/"], [data-key="space"]').forEach(el => { el.disabled = f.type !== 'rational'; });
  }
  function expired() { if (state.mode === 'exam' && !state.done && Date.now() >= state.deadline) { finish(true); return true; } return state.done; }
  function inputKey(key) {
    if (!state.question || expired()) return;
    const fields = availableFields(), f = fields.find(f => f.key === state.activeKey); if (!f || f.type === 'decision') return;
    const el = $(`input-${f.key}`); if (!el || el.disabled) return;
    if (key === 'next') { const i = fields.indexOf(f); const next = fields[(i + 1) % fields.length]; activate(next.key); return; }
    let value = state.values[f.key] || '';
    if (key === 'delete') value = value.slice(0, -1);
    else if (key === 'clear') value = '';
    else if (value.length < 18 && (/^[0-9.]$/.test(key) || (f.type === 'rational' && (key === '/' || key === 'space')))) value += key === 'space' ? ' ' : key;
    state.values[f.key] = value; el.value = value; updateJump(); message('');
  }
  function check() {
    if (!state.question || expired()) return;
    const fields = availableFields(), empty = fields.find(f => !(state.values[f.key] || '').trim());
    if (empty) { activate(empty.key); message(`請先填寫「${empty.label}」。`, 'error'); return; }
    if (state.mode === 'exam') { move(1); return; }
    const wrong = fields.find(f => !Q.correct(state.values[f.key], f));
    if (wrong) { activate(wrong.key); message(`「${wrong.label}」再想一想。可按「看提示」查看這一步的方向。`, 'error'); return; }
    const s = state.question.steps[state.step], card = $(`step-${state.step}`);
    card.querySelectorAll('input, button').forEach(el => { el.disabled = true; el.classList.remove('active'); });
    const solution = card.querySelector('.solution'); solution.hidden = false; solution.textContent = `✓ ${s.explanation}`;
    state.step++; $('hint').hidden = true; $('hint-button').setAttribute('aria-expanded', 'false');
    if (state.step === state.question.steps.length) {
      state.done = true; $('numpad').hidden = true; $('key-hint').hidden = true; $('hint-button').hidden = true;
      $('check-answer').hidden = true; $('next-question').hidden = false; $('phase-note').textContent = '這一題完成了！'; message('答對了！按「下一題」繼續練習。', 'success'); playSuccess();
      document.querySelectorAll('.number-forms input').forEach(el => { el.disabled = false; });
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
  function updateJump() {
    if (state.mode !== 'exam') return;
    const box = $('exam-jump'); box.replaceChildren();
    state.questions.forEach((q, i) => { const el = document.createElement('button'); el.type = 'button'; el.textContent = i + 1;
      const answered = q.finalFields.every(f => (state.answers[i][f.key] || '').trim());
      el.classList.toggle('answered', !!answered); el.classList.toggle('current', i === state.index); el.setAttribute('aria-label', `第${i + 1}題${answered ? '已作答' : '未完成'}`); if (i === state.index) el.setAttribute('aria-current', 'true'); el.addEventListener('click', () => move(0, i)); box.append(el); });
  }
  function finish(timedOut) {
    if (state.mode !== 'exam' || state.done) return;
    const unanswered = state.questions.filter((q, i) => q.finalFields.some(f => !(state.answers[i][f.key] || '').trim())).length;
    if (!timedOut && !confirm(unanswered ? `還有${unanswered}題未完成，確定交卷嗎？` : '確定交卷並查看成績嗎？')) return;
    stopTimer(); state.done = true; $('workspace').hidden = true; $('game-status').hidden = true; $('results').hidden = false;
    document.querySelectorAll('.number-forms input').forEach(el => { el.disabled = false; });
    const correct = state.questions.filter((q, i) => q.finalFields.every(f => Q.correct(state.answers[i][f.key] || '', f))).length;
    $('result-heading').textContent = timedOut ? '時間到，已交卷' : '測驗完成'; $('final-score').textContent = `${correct * 10} 分`;
    $('result-summary').textContent = `答對${correct}／10題。每題全部答案正確得10分。點開各題查看解析。`;
    const list = $('review-list'); list.replaceChildren();
    state.questions.forEach((q, i) => {
      const details = document.createElement('details'), summary = document.createElement('summary'), question = document.createElement('p'), solution = document.createElement('div');
      summary.textContent = `${i + 1}. ${q.finalFields.every(f => Q.correct(state.answers[i][f.key] || '', f)) ? '✓ 答對' : '✕ 未答對'}｜${q.category}`;
      question.innerHTML = q.textHtml; details.append(summary, question);
      q.finalFields.forEach(f => { const p = document.createElement('p'); p.className = 'review-answer'; const v = state.answers[i][f.key]; const display = f.type === 'decision' ? x => x === 'yes' ? '是' : '不是' : Q.format; p.textContent = `${f.label}：你的答案 ${v ? display(v) : '未作答'}；正確答案 ${display(f.expected)}`; details.append(p); });
      solution.className = 'solution'; solution.textContent = q.explanation; details.append(solution); list.append(details);
    });
    $('work-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function updateTimer() { if (state.done) return; const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)); $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; if (!seconds) finish(true); }
  let audio;
  function playSuccess() { try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return; if (!audio) audio = new Audio(); audio.resume().catch(() => {}); [523.25, 659.25, 783.99].forEach((frequency, i) => { const tone = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .1; tone.frequency.value = frequency; tone.connect(gain); gain.connect(audio.destination); gain.gain.setValueAtTime(.1, t); gain.gain.exponentialRampToValueAtTime(.001, t + .2); tone.start(t); tone.stop(t + .2); }); } catch (_) { /* Optional audio. */ } }
  document.querySelectorAll('[data-type]').forEach(el => el.addEventListener('click', () => start('practice', el.dataset.type)));
  document.querySelectorAll('[data-key]').forEach(el => el.addEventListener('click', () => inputKey(el.dataset.key)));
  $('start-exam').addEventListener('click', () => start('exam')); $('retry-exam').addEventListener('click', () => start('exam'));
  $('check-answer').addEventListener('click', check);
  $('next-question').addEventListener('click', () => { if (state.mode === 'practice' && state.done) newPractice(); });
  $('previous-question').addEventListener('click', () => move(-1)); $('skip-question').addEventListener('click', () => move(1));
  $('finish-exam').addEventListener('click', () => { if (!expired()) finish(false); });
  $('hint-button').addEventListener('click', () => { if (state.mode !== 'practice' || state.done) return; $('hint').hidden = !$('hint').hidden; $('hint').textContent = state.question.steps[state.step].hint; $('hint-button').setAttribute('aria-expanded', String(!$('hint').hidden)); });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || !state.question || state.done || event.target.matches('a, select, textarea, input[type="checkbox"]')) return;
    if (/^[0-9./]$/.test(event.key)) { event.preventDefault(); inputKey(event.key); }
    else if (event.key === 'Backspace') { event.preventDefault(); inputKey('delete'); }
    else if (event.key === ' ' && event.target.matches('.answer-input')) { event.preventDefault(); inputKey('space'); }
    else if (event.key === 'Enter' && event.target.matches('.answer-input')) { event.preventDefault(); check(); }
  });
  document.addEventListener('visibilitychange', () => { if (state.mode === 'exam' && !state.done) updateTimer(); });
  window.addEventListener('resize', () => { if (!matchMedia('(max-width: 800px)').matches) $('settings').open = true; });
})();
