(function () {
  'use strict';
  const Q = window.IntegerAddSub, $ = id => document.getElementById(id);
  const names = { practice: '練習', exam: '考試', challenge: '闖關' };
  const descriptions = {
    practice: '不限時。答錯顯示正解，訂正後再換題，熟練正負整數心算。',
    exam: '10 題，限時 10 分鐘。每題 10 分，答錯一次扣 1 分；考試中不公布正解。',
    challenge: '不限時。答錯連對歸零，訂正不計入連對，從下一道新題重新累計。'
  };
  let mode = 'practice', selected = new Set(Q.TYPES.map(t => t.id)), session = null;
  let buffer = '', transition = null, timer = null, locked = false, lastConfig = null, soundOn = true, audio = null;
  function renderSettings() {
    document.querySelectorAll('[data-mode]').forEach(b => { const active = b.dataset.mode === mode; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('[data-type]').forEach(b => { const active = selected.has(b.dataset.type); b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); b.firstChild.nodeValue = `${active ? '✓' : '○'} ${Q.TYPES.find(t => t.id === b.dataset.type).label}`; });
    $('mode-description').textContent = descriptions[mode]; $('target-row').hidden = mode !== 'challenge'; $('start').textContent = `開始${names[mode]}`;
    $('setup-error').hidden = true;
  }
  Q.TYPES.forEach(t => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'menu-btn active'; button.dataset.type = t.id;
    button.setAttribute('aria-pressed', 'true'); button.append(document.createTextNode(`✓ ${t.label}`));
    const example = document.createElement('small'); example.textContent = `${t.example} = ?`; button.append(example);
    button.addEventListener('click', () => { selected.has(t.id) ? selected.delete(t.id) : selected.add(t.id); renderSettings(); });
    $('type-grid').append(button);
  });
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; renderSettings(); }));
  document.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => {
    selected = new Set(Q.TYPES.filter(t => b.dataset.select === 'all' || t.op === b.dataset.select).map(t => t.id)); renderSettings();
  }));
  function clearSchedules() { clearTimeout(transition); clearInterval(timer); transition = timer = null; }
  function updateKeys() {
    const inactive = !session || session.ended || locked;
    document.querySelectorAll('#numpad button').forEach(b => { b.disabled = inactive; });
    $('clear-answer').disabled = inactive; $('submit-answer').disabled = inactive;
  }
  function feedback(text, status = '') { $('feedback').textContent = text; $('feedback').dataset.status = status; $('answer').dataset.status = status; }
  function key(key) {
    if (!session || session.ended || locked) return;
    if (session.config.mode === 'exam' && !session.remaining()) { finish('timeout'); return; }
    buffer = Q.editBuffer(buffer, key); $('answer').value = buffer.replace('-', '−');
    $('answer').dataset.status = '';
  }
  function clock(ms) { const seconds = Math.ceil(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
  function updateStats() {
    const s = session, exam = s.config.mode === 'exam', challenge = s.config.mode === 'challenge';
    $('mode-label').textContent = `${names[s.config.mode]}模式`;
    $('question-number').textContent = exam ? `第 ${Math.min(s.completed + 1, Q.EXAM_COUNT)} / ${Q.EXAM_COUNT} 題` : challenge ? `連對 ${s.streak} / ${s.config.target}` : `已完成 ${s.completed} 題`;
    $('live-stats').textContent = exam ? `目前 ${s.score} 分｜本題 ${Math.max(0, 10 - s.current.errors)} 分` : challenge ? `最佳連對 ${s.bestStreak} 題｜已完成 ${s.completed} 題` : `首次答對 ${s.firstCorrect} / ${s.attempted} 題`;
    $('progress').hidden = !(exam || challenge);
    const max = exam ? Q.EXAM_COUNT : s.config.target, value = exam ? s.completed : s.streak;
    $('progress').setAttribute('aria-valuemax', String(max)); $('progress').setAttribute('aria-valuenow', String(value));
    $('progress-fill').style.width = `${value / max * 100}%`;
    $('timer').hidden = !exam;
    if (exam) $('timer').textContent = `剩餘 ${clock(s.remaining())}`;
  }
  function loadQuestion() {
    buffer = ''; locked = false; $('answer').value = ''; feedback('');
    const q = session.current.question;
    $('type-label').textContent = q.label; $('question-text').textContent = `${Q.format(q)} =`;
    updateStats(); updateKeys();
    // Only the question region scrolls on phones; the keypad stays in the bottom grid row.
    $('workspace').parentElement.scrollTop = 0;
  }
  function start(config) {
    clearSchedules(); lastConfig = Q.validate(config); session = new Q.Session(lastConfig);
    $('welcome').hidden = true; $('results').hidden = true; $('settings').hidden = true;
    $('controls-panel').hidden = false; $('workspace').hidden = false; $('keypad-panel').hidden = false;
    document.body.classList.remove('results-view'); document.body.classList.add('playing'); $('end-session').textContent = config.mode === 'exam' ? '交卷' : `結束${names[config.mode]}`;
    loadQuestion();
    startTimer();
  }
  function startTimer() {
    clearInterval(timer);
    if (session && !session.ended && session.config.mode === 'exam') timer = setInterval(() => { if (!session.remaining()) finish('timeout'); else updateStats(); }, 250);
  }
  $('settings').addEventListener('submit', event => {
    event.preventDefault();
    try {
      start({ mode, types: [...selected], aRange: [Number($('a-min').value), Number($('a-max').value)], bRange: [Number($('b-min').value), Number($('b-max').value)], target: Number($('target').value) });
    } catch (error) { $('setup-error').textContent = error.message; $('setup-error').hidden = false; }
  });
  function playSound(correct) {
    if (!soundOn) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.type = correct ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(correct ? 620 : 240, now); oscillator.frequency.linearRampToValueAtTime(correct ? 820 : 150, now + .18);
      gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(.13, now + .02); gain.gain.exponentialRampToValueAtTime(.001, now + .22);
      oscillator.start(now); oscillator.stop(now + .23);
    } catch (_) { /* Audio is optional. */ }
  }
  function submit() {
    if (!session || session.ended || locked) return;
    const result = session.submit(buffer);
    if (result.kind === 'ignored') return;
    if (result.kind === 'finished') { showResults(); return; }
    if (result.kind === 'invalid') { feedback('請輸入完整的整數答案。', 'error'); return; }
    if (result.kind === 'wrong') {
      playSound(false); buffer = ''; $('answer').value = '';
      feedback(result.reveal ? `正確答案是 ${Q.signed(result.answer)}，請重新輸入訂正。${session.config.mode === 'challenge' ? '連對已歸零。' : ''}` : `答錯了，本題剩 ${result.points} 分，請再試一次。`, 'error');
      updateStats(); return;
    }
    locked = true; updateKeys(); playSound(true); updateStats();
    feedback(result.kind === 'corrected' ? '訂正完成！下一道新題繼續。' : '答對了！', 'success');
    transition = setTimeout(() => { if (session.ended) showResults(); else { session.next(); loadQuestion(); } }, 450);
  }
  function finish(reason = 'manual') { if (!session) return; session.finish(reason); showResults(); }
  function showResults() {
    clearSchedules(); locked = true; updateKeys();
    const s = session.summary(), exam = s.mode === 'exam', challenge = s.mode === 'challenge';
    document.body.classList.remove('playing'); document.body.classList.add('results-view'); $('workspace').hidden = true; $('keypad-panel').hidden = true;
    $('controls-panel').hidden = true; $('results').hidden = false;
    $('result-heading').textContent = exam ? (s.reason === 'timeout' ? '時間到，考試結束' : '考試完成') : challenge ? (s.reason === 'complete' ? '闖關成功！' : '本次挑戰結束') : '練習完成';
    $('result-score').textContent = exam ? `${s.score} 分` : challenge ? `最佳連對 ${s.bestStreak} 題` : `首次答對 ${s.firstCorrect} 題`;
    $('result-note').textContent = exam ? `完成 ${s.completed} / ${Q.EXAM_COUNT} 題；未完成的 ${Q.EXAM_COUNT - s.completed} 題以 0 分計。` : challenge ? `本次目標：連續答對 ${s.target} 題。訂正不計入連對。` : '繼續挑戰自己的速度與準確度！';
    $('elapsed').textContent = clock(s.elapsedMs); $('average').textContent = s.averageMs === null ? '—' : `${(s.averageMs / 1000).toFixed(1)} 秒`;
    $('accuracy').textContent = s.accuracy === null ? '—' : `${s.accuracy.toFixed(0)}%（${s.firstCorrect}/${s.attempted}）`;
    $('completed').textContent = `${s.completed} 題`;
    $('review').replaceChildren();
    const wrong = s.records.filter(q => q.errors || !q.solved), heading = document.createElement('h3'); heading.textContent = '錯題回顧'; $('review').append(heading);
    if (!wrong.length) { const p = document.createElement('p'); p.textContent = s.attempted ? '本次作答沒有錯題。' : '尚未作答，準備好再開始！'; $('review').append(p); }
    else {
      const list = document.createElement('ul');
      wrong.slice(-100).forEach(q => { const li = document.createElement('li'); li.textContent = `${Q.format(q)} = ${Q.signed(q.answer)}　${q.firstAnswer === null ? '尚未作答' : `第一次填 ${Q.signed(q.firstAnswer)}`}；${q.solved ? `已訂正（答錯 ${q.errors} 次）` : '未完成'}`; list.append(li); });
      $('review').append(list);
      if (wrong.length > 100) { const p = document.createElement('p'); p.textContent = '顯示最近 100 道錯題。'; $('review').append(p); }
    }
    $('results').focus();
  }
  $('numpad').addEventListener('click', event => { const button = event.target.closest('[data-key]'); if (button) key(button.dataset.key); });
  $('clear-answer').addEventListener('click', () => key('clear')); $('submit-answer').addEventListener('click', submit);
  $('end-session').addEventListener('click', () => finish()); $('retry').addEventListener('click', () => start(lastConfig));
  $('change-settings').addEventListener('click', () => {
    clearSchedules(); session = null; document.body.classList.remove('results-view'); $('results').hidden = true; $('welcome').hidden = false;
    $('controls-panel').hidden = false; $('settings').hidden = false; renderSettings(); $('start').focus();
  });
  $('sound').addEventListener('click', () => { soundOn = !soundOn; $('sound').setAttribute('aria-pressed', String(soundOn)); $('sound').textContent = `音效：${soundOn ? '開' : '關'}`; });
  document.addEventListener('keydown', event => {
    if (!session || session.ended || event.ctrlKey || event.metaKey || event.altKey) return;
    // Preserve native Enter/Space activation when a visible control has keyboard focus.
    if (event.target && event.target.tagName === 'BUTTON' && ['Enter', ' '].includes(event.key)) return;
    if (/^\d$/.test(event.key)) { event.preventDefault(); key(event.key); }
    else if (event.key === '-' || event.key === '+') { event.preventDefault(); if (buffer.startsWith('-') !== (event.key === '-')) key('sign'); }
    else if (event.key === 'Backspace') { event.preventDefault(); key('delete'); }
    else if (event.key === 'Delete' || event.key === 'Escape') { event.preventDefault(); key('clear'); }
    else if (event.key === 'Enter') { event.preventDefault(); submit(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && session && !session.ended && session.config.mode === 'exam') { if (!session.remaining()) finish('timeout'); else updateStats(); } });
  window.addEventListener('pagehide', clearSchedules);
  window.addEventListener('pageshow', event => {
    if (!event.persisted || !session) return;
    if (session.ended) { showResults(); return; }
    if (session.config.mode === 'exam' && !session.remaining()) { finish('timeout'); return; }
    if (session.current.solved) { session.next(); loadQuestion(); }
    startTimer();
  });
  renderSettings(); updateKeys();
})();
