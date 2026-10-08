(function () {
  'use strict';
  const Q = window.IntervalQuestions;
  const $ = id => document.getElementById(id);
  const EXAM_SECONDS = 600;
  const state = { mode: 'idle', type: 'index', difficulty: 'basic', phase: 'idle',
    question: null, number: 0, questions: [], answers: [], index: 0,
    deadline: 0, timer: null };
  function message(text, status = '') {
    $('feedback').textContent = text;
    $('feedback').dataset.status = status;
  }
  function activeControls() {
    document.querySelectorAll('[data-type]').forEach(button => {
      const active = state.mode === 'practice' && button.dataset.type === state.type;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-difficulty]').forEach(button => {
      const active = button.dataset.difficulty === state.difficulty;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    $('start-exam').classList.toggle('active', state.mode === 'exam');
  }
  function canRestart() {
    return state.phase === 'idle' || state.phase === 'ended' ||
      (state.mode === 'practice' && state.phase === 'done') ||
      window.confirm('要結束目前的練習或測驗，重新開始嗎？');
  }
  function stopTimer() {
    if (state.timer !== null) window.clearInterval(state.timer);
    state.timer = null;
  }
  function start(mode, type = state.type) {
    if (!canRestart()) return;
    stopTimer();
    state.mode = mode; state.type = type; state.number = 0; state.index = 0;
    state.questions = mode === 'exam' ? Q.buildExam(state.difficulty) : [];
    state.answers = Array(state.questions.length).fill('');
    $('welcome').hidden = true; $('results').hidden = true; $('workspace').hidden = false;
    $('game-status').hidden = false; $('timer').hidden = mode !== 'exam';
    $('exam-actions').hidden = mode !== 'exam';
    $('settings').open = !window.matchMedia('(max-width: 800px)').matches;
    activeControls();
    if (mode === 'exam') {
      state.deadline = Date.now() + EXAM_SECONDS * 1000;
      state.question = state.questions[0]; renderQuestion(); updateTimer();
      state.timer = window.setInterval(updateTimer, 500);
    } else newPracticeQuestion();
  }
  function newPracticeQuestion() {
    const query = ['count', 'gap', 'length'][state.number % 3];
    const previousText = state.question && state.question.text;
    let question;
    for (let attempt = 0; attempt < 10; attempt++) {
      question = Q.generate(state.type, state.difficulty, Math.random, query);
      if (question.text !== previousText) break;
    }
    state.question = question; state.number++; renderQuestion();
  }
  function renderQuestion() {
    const q = state.question, exam = state.mode === 'exam';
    state.phase = exam ? 'answer' : 'interval';
    $('mode-label').textContent = exam ? '綜合測驗' : '分步練習';
    $('category-label').textContent = exam ? '' : q.category;
    $('question-text').textContent = q.text;
    $('question-number').textContent = exam ? `題號：${state.index + 1} / 10` : `練習第 ${state.number} 題`;
    $('interval-step').hidden = exam;
    $('interval-entry').hidden = false; $('interval-solution').hidden = true;
    $('interval-input').value = ''; $('answer-input').value = exam ? state.answers[state.index] : '';
    $('answer-heading').textContent = exam ? '填寫答案' : '② 再計算答案';
    $('answer-step').classList.toggle('locked', !exam);
    $('answer-locked').hidden = exam; $('answer-entry').hidden = !exam; $('answer-solution').hidden = true;
    $('answer-label').textContent = q.answerLabel; $('answer-unit').textContent = q.answerUnit;
    $('diagram').hidden = true; $('diagram-button').hidden = exam;
    $('diagram-button').setAttribute('aria-expanded', 'false'); $('diagram-button').textContent = '看示意圖';
    $('numpad').hidden = false; $('check-answer').hidden = false; $('next-question').hidden = true;
    $('phase-note').textContent = exam ? '直接填答案，交卷後查看對錯。' : '目前作答：間隔數';
    $('check-answer').textContent = exam ? (state.index === 9 ? '確認並交卷' : '確認並下一題') : '確認間隔數';
    $('previous-question').disabled = state.index === 0;
    message('');
  }
  function currentInput() {
    if (state.phase === 'interval') return $('interval-input');
    if (state.phase === 'answer') return $('answer-input');
    return null;
  }
  function inputKey(key) {
    if (expired()) return;
    const input = currentInput();
    if (!input) return;
    if (key === 'delete') input.value = input.value.slice(0, -1);
    else if (input.value.length < 10 && !(key === '.' && input.value.includes('.'))) {
      input.value += key === '.' && input.value === '' ? '0.' : key;
    }
    message('');
  }
  function expired() {
    if (state.mode === 'exam' && state.phase !== 'ended' && Date.now() >= state.deadline) {
      finishExam(true); return true;
    }
    return false;
  }
  function checkAnswer() {
    if (expired()) return;
    const input = currentInput();
    if (!input) return;
    const value = input.value.trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      message('請先填入數字，再按確認。', 'error'); return;
    }
    if (state.mode === 'exam') {
      state.answers[state.index] = value;
      if (state.index === 9) finishExam(false);
      else { state.index++; state.question = state.questions[state.index]; renderQuestion(); }
      return;
    }
    const q = state.question, first = state.phase === 'interval';
    if (!Q.isCorrect(value, first ? q.intervals : q.answer)) {
      message(first ? `再想一想：${q.hint}` :
        `再檢查一次：題目要求的是「${q.answerLabel}」，答案單位是「${q.answerUnit}」。`, 'error');
      return;
    }
    if (first) {
      state.phase = 'answer';
      $('interval-entry').hidden = true; $('interval-solution').hidden = false;
      $('interval-solution').textContent = `✓ ${q.firstExplanation}`;
      $('answer-locked').hidden = true; $('answer-entry').hidden = false;
      $('answer-step').classList.remove('locked');
      $('phase-note').textContent = '目前作答：最後答案'; $('check-answer').textContent = '確認答案';
      message('間隔數正確，接著計算答案。', 'success');
    } else {
      state.phase = 'done';
      $('answer-entry').hidden = true; $('answer-solution').hidden = false;
      $('answer-solution').textContent = `✓ ${q.finalExplanation}`;
      $('numpad').hidden = true; $('check-answer').hidden = true; $('next-question').hidden = false;
      $('phase-note').textContent = '兩個步驟都完成了！';
      message('答對了！按「下一題」繼續練習。', 'success'); playSuccess();
    }
  }
  function rememberAnswer() {
    if (state.mode === 'exam' && state.phase !== 'ended') state.answers[state.index] = $('answer-input').value.trim();
  }
  function moveExam(delta) {
    if (state.mode !== 'exam' || state.phase === 'ended' || expired()) return;
    rememberAnswer();
    if (state.index + delta < 0) return;
    if (state.index + delta >= state.questions.length) { finishExam(false); return; }
    state.index += delta; state.question = state.questions[state.index]; renderQuestion();
  }
  function finishExam(timedOut = false) {
    if (state.mode !== 'exam' || state.phase === 'ended') return;
    rememberAnswer();
    const unanswered = state.answers.filter(value => value === '').length;
    if (!timedOut && !window.confirm(unanswered ? `還有 ${unanswered} 題未作答，確定交卷嗎？` : '確定交卷並查看成績嗎？')) return;
    stopTimer(); state.phase = 'ended';
    $('workspace').hidden = true; $('game-status').hidden = true; $('results').hidden = false;
    $('result-heading').textContent = timedOut ? '時間到，已交卷' : '測驗完成';
    const correct = state.questions.filter((q, i) => Q.isCorrect(state.answers[i], q.answer)).length;
    $('final-score').textContent = `${correct * 10} 分`;
    $('result-summary').textContent = `答對 ${correct} / 10 題，滿分 100 分。點開各題查看解析。`;
    const list = $('review-list'); list.replaceChildren();
    state.questions.forEach((q, i) => {
      const details = document.createElement('details'), summary = document.createElement('summary');
      summary.textContent = `${i + 1}. ${Q.isCorrect(state.answers[i], q.answer) ? '✓ 答對' : state.answers[i] === '' ? '未作答' : '✕ 答錯'}｜${q.category}`;
      const question = document.createElement('p'); question.textContent = q.text;
      const answer = document.createElement('p'); answer.className = 'review-answer';
      answer.textContent = `你的答案：${state.answers[i] || '未作答'}；正確答案：${Q.format(q.answer)} ${q.answerUnit}`;
      const solution = document.createElement('div'); solution.className = 'solution'; solution.textContent = q.explanation;
      details.append(summary, question, answer, solution); list.append(details);
    });
    $('work-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function updateTimer() {
    if (state.phase === 'ended') return;
    const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (seconds === 0) finishExam(true);
  }
  let diagramKey = '';
  function drawDiagram() {
    if ($('diagram').hidden || !state.question) return;
    const q = state.question, width = Math.max(220, $('diagram-drawing').clientWidth);
    const key = `${width}:${q.text}`;
    if (key === diagramKey) return;
    diagramKey = key;
    const blue = '#2563a8', ink = '#334155', line = '#94a3b8';
    let height = 115, content = '';
    function dot(x, y, empty = false) {
      return `<circle cx="${x}" cy="${y}" r="6" fill="${empty ? '#fff' : blue}" stroke="${blue}" stroke-width="2"/>`;
    }
    function label(x, y, text, anchor = 'middle') {
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${ink}" font-size="14">${text}</text>`;
    }
    if (q.type === 'loop') {
      height = 235;
      const cx = width / 2, cy = 110, radius = 74;
      if (q.shape === 'square') {
        content += `<rect x="${cx-radius}" y="${cy-radius}" width="${2*radius}" height="${2*radius}" fill="none" stroke="${line}" stroke-width="2"/>`;
        const positions = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
        positions.forEach(([x,y]) => content += dot(cx+x*radius,cy+y*radius));
        content += label(cx, cy-5, '四角都有放');
      } else {
        content += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${line}" stroke-width="2"/>`;
        for (let i=0;i<8;i++) content += dot(cx+radius*Math.cos(i*Math.PI/4),cy+radius*Math.sin(i*Math.PI/4));
        content += label(cx, cy-5, '繞成一圈');
      }
      content += label(cx,cy+18,'最後接回第一個');
    } else {
      const left = 20, right = width-20, y = 54;
      content += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${line}" stroke-width="2"/>`;
      // A compressed layout demonstrates endpoint conditions, never the unknown count.
      for (let i=0;i<6;i++) {
        if (i===3) { content += label(left+(right-left)*i/5,y-12,'⋯'); continue; }
        const empty = (i===0 && q.type==='neither') || (i===5 && ['one','neither'].includes(q.type));
        content += dot(left+(right-left)*i/5,y,empty);
      }
      content += label(left,89,q.diagramLabels.start,'start') + label(right,89,q.diagramLabels.end,'end');
      if(q.type==='index') content += label(left+(right-left)/5,29,`第 ${q.start+1} ${q.context.classifier}`);
      else content += label(width/2,24,q.type==='both'?'兩端都放':q.type==='one'?'起點放、終點不放':'兩端都不放');
    }
    $('diagram-drawing').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${q.category}的配置示意圖">${content}</svg>`;
    $('diagram-caption').textContent = q.type==='loop' ? '示意圖不依實際數量繪製；繞一圈，最後到第一個也是一個間隔。' : '實心點：有放。空心點：沒放。中間省略，數量與長度以題目為準。';
  }
  let audio = null;
  function playSuccess() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audio) audio = new Audio();
      audio.resume().catch(() => {});
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const tone = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime + i * .1;
        tone.frequency.value = frequency; tone.connect(gain); gain.connect(audio.destination);
        gain.gain.setValueAtTime(.12, time); gain.gain.exponentialRampToValueAtTime(.001, time+.2);
        tone.start(time); tone.stop(time+.2);
      });
    } catch (_) { /* Audio is optional. */ }
  }
  document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => start('practice', button.dataset.type)));
  document.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
    if (state.difficulty === button.dataset.difficulty || !canRestart()) return;
    const mode = state.mode;
    stopTimer(); state.phase = 'idle'; state.difficulty = button.dataset.difficulty;
    activeControls(); if (mode !== 'idle') start(mode);
  }));
  document.querySelectorAll('[data-key]').forEach(button => button.addEventListener('click', () => inputKey(button.dataset.key)));
  $('start-exam').addEventListener('click', () => start('exam'));
  $('retry-exam').addEventListener('click', () => start('exam'));
  $('check-answer').addEventListener('click', checkAnswer);
  $('next-question').addEventListener('click', () => { if(state.mode==='practice' && state.phase==='done') newPracticeQuestion(); });
  $('previous-question').addEventListener('click', () => moveExam(-1));
  $('skip-question').addEventListener('click', () => moveExam(1));
  $('finish-exam').addEventListener('click', () => { if(!expired()) finishExam(false); });
  $('diagram-button').addEventListener('click', () => {
    if(state.mode!=='practice') return;
    $('diagram').hidden = !$('diagram').hidden;
    $('diagram-button').textContent = $('diagram').hidden ? '看示意圖' : '收起示意圖';
    $('diagram-button').setAttribute('aria-expanded', String(!$('diagram').hidden)); drawDiagram();
  });
  document.addEventListener('keydown', event => {
    if(event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.target.matches('a, select, textarea') ||
      (event.target.matches('input') && !event.target.readOnly)) return;
    if(/^[0-9.]$/.test(event.key) && currentInput()) { event.preventDefault(); inputKey(event.key); }
    else if(event.key==='Backspace' && currentInput()) { event.preventDefault(); inputKey('delete'); }
    else if(event.key==='Enter' && event.target.matches('input')) { event.preventDefault(); checkAnswer(); }
  });
  if(window.ResizeObserver) new ResizeObserver(() => window.requestAnimationFrame(drawDiagram)).observe($('diagram-drawing'));
  else window.addEventListener('resize',drawDiagram);
  window.addEventListener('resize', () => {
    if(!window.matchMedia('(max-width: 800px)').matches) $('settings').open = true;
  });
  document.addEventListener('visibilitychange', () => { if(state.mode==='exam' && state.phase!=='ended') updateTimer(); });
})();
