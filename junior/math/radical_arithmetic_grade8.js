
"use strict";

const EXAM_QUESTION_COUNT = 10;
const EXAM_SECONDS = 10 * 60;
const POINTS_PER_QUESTION = 10;

const R = RadicalArithmetic;
const QUESTION_POOL = R.buildPool();
const {rat: rational, parse: parseRational, equalRat: sameRational} = R;
const stageProgress = Object.fromEntries(R.TOPICS.map(topic => [topic.id, 0]));
const state = {
    exam: null,
    mode: null,
    topic: "multiply",
    variant: "all",
    questionComplete: false,
    questions: [],
    questionIndex: 0,
    rowIndex: 0,
    practiceCompleted: 0,
    earnedScore: 0,
    currentQuestionPoints: POINTS_PER_QUESTION,
    wrongInputs: 0,
    timerId: null,
    deadline: null,
    activeInput: null,
    lastQuestionId: null,
    finished: false
};

function setupScope() {
    const select = document.getElementById('practice-topic');
    R.TOPICS.forEach((topic, i) => {
        const option = document.createElement('option'); option.value = topic.id;
        option.textContent = `${i + 1}. ${topic.title}`; select.appendChild(option);
    });
    const all = document.createElement('option'); all.value = 'all'; all.textContent = '五階段綜合'; select.appendChild(all);
    select.addEventListener('change', () => updateScope());
    updateScope();
}
function updateScope(variant = 'all') {
    const topic = document.getElementById('practice-topic').value;
    const variants = [...new Set(QUESTION_POOL.filter(q => topic === 'all' || q.kind === topic).map(q => q.variant))];
    const select = document.getElementById('practice-variant'); select.replaceChildren();
    ['all', ...variants].forEach(v => {
        const option = document.createElement('option'); option.value = v; option.textContent = v === 'all' ? '範圍內全部題型' : v; select.appendChild(option);
    });
    select.value = variants.includes(variant) ? variant : 'all';
    const path = document.getElementById('learning-path'); path.replaceChildren();
    R.TOPICS.forEach((t,i) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'stage-button' + (topic === t.id ? ' active' : '');
        button.setAttribute('aria-pressed', String(topic === t.id));
        button.textContent = `${i+1} ${t.short}${stageProgress[t.id] ? ' · '+stageProgress[t.id]+' 題' : ''}`;
        button.onclick = () => { document.getElementById('practice-topic').value = t.id; updateScope(); };
        path.appendChild(button);
    });
    const selected = R.TOPICS.find(t => t.id === topic);
    document.getElementById('preview-badge').textContent = selected ? `階段 ${R.TOPICS.indexOf(selected)+1}` : '整合練習';
    document.getElementById('preview-title').textContent = selected?.title || '五階段綜合';
    document.getElementById('preview-tip').textContent = selected?.tip || '將五個階段連起來練習；綜合考試各階段各出兩題。';
    const sample = QUESTION_POOL.find(q => q.kind === topic) || QUESTION_POOL[0];
    document.getElementById('preview-example').innerHTML = sample.prompt;
    document.getElementById('preview-types').textContent = variants.join(' · ');
}
function scopePool() {
    return QUESTION_POOL.filter(q => (state.topic === 'all' || q.kind === state.topic) && (state.variant === 'all' || q.variant === state.variant));
}
function nextStage() {
    const i = R.TOPICS.findIndex(t => t.id === state.topic);
    returnToSetup();
    document.getElementById('practice-topic').value = R.TOPICS[Math.min(i + 1, R.TOPICS.length - 1)].id;
    updateScope();
}
function focusNextInput() {
    if (state.mode === "exam") return examNavigate((state.questionIndex + 9) % 10);
    const row = document.querySelector(`.step-row[data-row-index="${state.rowIndex}"]`);
    const inputs = row ? [...row.querySelectorAll('.answer-input:not(:disabled)')] : [];
    const index = inputs.indexOf(state.activeInput);
    const input = inputs[(index + 1) % inputs.length];
    if (input) { input.focus(); state.activeInput = input; }
}
function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function examQuestions() {
    return R.selectRound(scopePool(), state.topic, EXAM_QUESTION_COUNT);
}
let practiceQueue = [];
let practiceFirst = true;
function nextPracticeQuestion() {
    if (!practiceQueue.length) {
        practiceQueue = shuffled(scopePool());
        if (practiceQueue.length > 1 && practiceQueue[0].id === state.lastQuestionId) [practiceQueue[0], practiceQueue[1]] = [practiceQueue[1], practiceQueue[0]];
    }
    if (practiceFirst) {
        practiceFirst = false;
        const first = scopePool()[0], index = practiceQueue.findIndex(q => q.id === first.id);
        if (index >= 0) practiceQueue.splice(index,1);
        state.lastQuestionId = first.id; return first;
    }
    const question = practiceQueue.shift(); state.lastQuestionId = question.id; return question;
}
function startPractice() {
    resetState();
    state.mode = "practice";
    state.topic = document.getElementById("practice-topic").value;
    state.variant = document.getElementById("practice-variant").value;
    state.questions = [nextPracticeQuestion()];
    showPlayUI();
    renderQuestion();
}

function startExam() {
    resetState();
    state.mode = "exam";
    state.topic = document.getElementById("practice-topic").value;
    state.variant = "all";
    state.questions = examQuestions();
    state.exam = new R.ExamSession(state.questions);
    state.deadline = state.exam.deadline;
    showPlayUI();
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 250);
    renderQuestion();
}

function resetState() {
    if (state.timerId) window.clearInterval(state.timerId);
    practiceQueue = [];
    practiceFirst = true;
    document.body.classList.remove("is-exam");
    document.getElementById("submit-confirm").classList.add("hidden");
    document.body.classList.remove('is-playing');
    Object.assign(state, {
        exam: null, mode: null, questions: [], questionIndex: 0, rowIndex: 0,
        practiceCompleted: 0, earnedScore: 0,
        currentQuestionPoints: POINTS_PER_QUESTION,
        wrongInputs: 0, timerId: null, deadline: null,
        activeInput: null, lastQuestionId: null, finished: false, questionComplete: false
    });
    document.getElementById("solution-box").classList.add("hidden");
}

function showPlayUI() {
    document.body.classList.add('is-playing');
    document.body.classList.toggle('is-exam', state.mode === 'exam');
    document.getElementById('exam-nav-area').classList.toggle('hidden', state.mode !== 'exam');
    document.getElementById('next-stage-btn').classList.add('hidden');
    document.querySelectorAll('.exam-key').forEach(b => b.classList.toggle('hidden', state.mode !== 'exam'));
    document.getElementById('mixed-key').textContent = state.mode === 'exam' ? '√' : '帶分數';
    document.getElementById('next-cell-btn').textContent = state.mode === 'exam' ? '上一題' : '下一格';
    document.getElementById("intro-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("question-screen").classList.remove("hidden");
    document.getElementById("setup-controls").classList.add("hidden");
    document.getElementById("end-controls").classList.add("hidden");
    document.getElementById("play-controls").classList.remove("hidden");
    document.getElementById("timer-wrap").classList.toggle("hidden", state.mode !== "exam");
    document.getElementById("score-label").textContent = state.mode === "exam" ? "已填答" : "已完成";
    document.getElementById("mode-pill").textContent = state.mode === "exam" ? "考試模式" : "練習模式";
    setFeedback("請完成目前這一列。", "");
}

function currentQuestion() { return state.questions[state.questionIndex]; }

function renderQuestion() {
    const question = currentQuestion();
    if (!question) return finishSession(false);
    state.rowIndex = 0;
    state.questionComplete = false;
    document.getElementById("check-btn").textContent = "檢查本列";
    document.getElementById("check-btn").disabled = false;
    state.currentQuestionPoints = POINTS_PER_QUESTION;
    state.activeInput = null;

    document.getElementById("topic-badge").textContent = state.mode === "exam"
        ? `${question.topicTitle}・考試`
        : `${question.topicTitle}・${question.variant}`;
    const formulaReference = document.getElementById("practice-formula");
    if (state.mode === "practice") {
        formulaReference.innerHTML = `<small>本題適用公式</small>${question.reference}`;
        formulaReference.classList.remove("hidden");
    } else {
        formulaReference.innerHTML = "";
        formulaReference.classList.add("hidden");
    }
    document.getElementById("question-number").textContent = state.mode === "exam"
        ? `第 ${state.questionIndex + 1} / ${EXAM_QUESTION_COUNT} 題`
        : `練習第 ${state.practiceCompleted + 1} 題`;
    document.getElementById("question-prompt").innerHTML = question.prompt;
    document.getElementById("solution-box").classList.add("hidden");
    document.getElementById("solution-box").innerHTML = "";

    const steps = document.getElementById('steps'); steps.replaceChildren();
    const isExam = state.mode === 'exam';
    steps.classList.toggle('hidden',isExam);
    document.getElementById('exam-answer-area').classList.toggle('hidden',!isExam);
    if (isExam) {
        const input = document.getElementById('exam-answer');
        input.value = state.exam.entries[state.questionIndex].raw; input.disabled = false;
        input.readOnly = usesTouchKeypadOnly(); input.inputMode = usesTouchKeypadOnly() ? 'none' : 'text';
        state.activeInput = input;
        document.getElementById('check-btn').textContent = '儲存並下一題';
        updateExamPreview(); renderExamNav();
        setFeedback('直接填寫最簡答案；可切換題號，交卷後統一評分。','');
        input.focus();
    } else {
        question.rows.forEach((row,rowIndex)=>steps.appendChild(renderRow(row,rowIndex)));
        focusFirstInput();setFeedback('請完成目前這一列。','');
    }
    updateStats();
}
function renderRow(row,rowIndex) {
    const wrapper = document.createElement('div'); wrapper.className='step-row'+(rowIndex===0?' current':' hidden');wrapper.dataset.rowIndex=String(rowIndex);
    const label=document.createElement('span');label.className='step-label';label.textContent=`第 ${rowIndex+1} 步｜${row.label}`;wrapper.appendChild(label);
    const line=document.createElement('div');line.className='equation-line';
    line.innerHTML=row.template.replace(/\{\{(\d+)\}\}/g,(_,index)=>row.choices
      ? `<select class="answer-input" data-input-index="${index}"><option value="">請選擇</option>${row.choices.map((text,i)=>`<option value="${i}">${text}</option>`).join('')}</select>`
      : `<span class="answer-field"><input class="answer-input" type="text" maxlength="32" data-input-index="${index}" autocomplete="off"><span class="fraction-preview" aria-hidden="true"><span class="fraction-whole"></span><span class="fraction-stack"><span class="fraction-numerator"></span><span class="fraction-denominator"></span></span></span></span>`);
    line.querySelectorAll('.answer-input').forEach(input=>{
        if(!row.choices){input.inputMode=usesTouchKeypadOnly()?'none':'text';input.readOnly=usesTouchKeypadOnly();}
        input.setAttribute('aria-label',`${row.label}第 ${Number(input.dataset.inputIndex)+1} 格`);
        input.addEventListener('focus',()=>{state.activeInput=input;});
        input.addEventListener('input',()=>{
            line.querySelectorAll('.answer-input').forEach(other=>{if(other.dataset.inputIndex===input.dataset.inputIndex){other.value=input.value;other.classList.remove('wrong');updateAnswerVisual(other);}});
        });
        input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();checkCurrentRow();}});
    });
    wrapper.appendChild(line);return wrapper;
}
function updateExamPreview(){
    const raw=document.getElementById('exam-answer').value,parsed=R.parseExpression(raw),preview=document.getElementById('exam-preview');
    if(parsed)preview.innerHTML=R.show(parsed.ast);else preview.textContent=raw.trim()?'輸入中…':'答案預覽';
}
function examInputChanged(){
    if(state.mode!=='exam'||state.finished)return;
    const input=document.getElementById('exam-answer');
    if(!state.exam.setAnswer(input.value)){input.value=state.exam.entries[state.exam.index].raw;return submitExam(true);}
    updateExamPreview();renderExamNav();updateStats();
}
function examNavigate(index){
    if(state.mode!=='exam'||state.finished)return;
    if(!state.exam.goto(index)){if(state.exam.finished)submitExam(true);return;}
    state.questionIndex=index;renderQuestion();
}
function toggleReview(){if(!state.exam?.toggleReview()){if(state.exam?.finished)submitExam(true);return;}renderExamNav();}
function renderExamNav(){
    const nav=document.getElementById('exam-question-nav');nav.replaceChildren();
    state.exam.entries.forEach((entry,i)=>{
        const nonempty=Boolean(entry.raw.trim()),valid=nonempty&&Boolean(R.parseExpression(entry.raw));
        const button=document.createElement('button');button.type='button';button.className='exam-number'+(i===state.questionIndex?' current':'')+(nonempty?(valid?' entered':' partial'):'')+(entry.review?' flagged':'');
        button.textContent=String(i+1);button.setAttribute('aria-label',`第 ${i+1} 題，${nonempty?(valid?'已填答':'輸入未完整'):'未作答'}${entry.review?'，待檢查':''}`);button.setAttribute('aria-current',i===state.questionIndex?'true':'false');button.onclick=()=>examNavigate(i);nav.appendChild(button);
    });
    const review=state.exam.entries[state.questionIndex].review;
    document.getElementById('review-toggle').textContent=review?'★ 已標記待檢查':'☆ 標記待檢查';
    document.getElementById('review-toggle').classList.toggle('flagged',review);
}
function requestSubmit(){
    if(state.mode!=='exam'||state.finished)return;
    if(Date.now()>=state.deadline)return submitExam(true);
    const answered=state.exam.entries.filter(e=>e.raw.trim()).length;
    document.getElementById('submit-message').textContent=`已填 ${answered} 題，尚有 ${10-answered} 題未填。確認交卷後將統一評分。`;
    document.getElementById('submit-confirm').classList.remove('hidden');
}
function cancelSubmit(){document.getElementById('submit-confirm').classList.add('hidden');}
function submitExam(timedOut=false){
    if(state.mode!=='exam'||state.finished)return;
    state.exam.finish(timedOut);finishSession(timedOut);
}
function usesTouchKeypadOnly() {
    return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function fractionInputParts(raw) {
    const text = String(raw || "").trim();
    const mixed = text.match(/^([+-]?\d+)\s+(\d*)\/(\d*)$/);
    if (mixed) return { whole: mixed[1], numerator: mixed[2], denominator: mixed[3] };
    const fraction = text.match(/^([+-]?\d*)\/(\d*)$/);
    if (fraction) return { whole: "", numerator: fraction[1], denominator: fraction[2] };
    return null;
}

function updateAnswerVisual(input) {
    const field = input.closest(".answer-field");
    if (!field) return;
    const parts = fractionInputParts(input.value);
    field.classList.toggle("fraction-mode", Boolean(parts));
    if (!parts) return;
    field.querySelector(".fraction-whole").textContent = parts.whole;
    field.querySelector(".fraction-numerator").textContent = parts.numerator || " ";
    field.querySelector(".fraction-denominator").textContent = parts.denominator || " ";
}

function checkCurrentRow() {
    if (state.finished || !state.mode) return;
    if (state.mode === 'exam') return examNavigate((state.questionIndex + 1) % 10);
    if (state.questionComplete) return advanceQuestion();
    const question = currentQuestion();
    const row = question.rows[state.rowIndex];
    const rowElement = document.querySelector(`.step-row[data-row-index="${state.rowIndex}"]`);
    if (!rowElement) return;
    const inputs = [...rowElement.querySelectorAll(".answer-input")];
    const editable = inputs.filter(input => !input.disabled);
    if (editable.some(input => !input.value.trim())) {
        setFeedback("請先填完這一列的所有空格。", "bad");
        const firstEmpty = editable.find(input => !input.value.trim());
        if (firstEmpty) firstEmpty.focus();
        return;
    }

    let wrongCount = 0;
    const checked = new Set();
    editable.forEach(input=>{
        const index=Number(input.dataset.inputIndex);if(checked.has(index))return;checked.add(index);
        const parsed=parseRational(input.value),correct=sameRational(parsed,row.answers[index])&&(row.rules[index]!=='integer'||/^[+-]?\d+$/.test(input.value.trim().replace(/−/g,'-')));
        if(!correct)wrongCount++;
        inputs.filter(other=>other.dataset.inputIndex===input.dataset.inputIndex).forEach(other=>{other.classList.toggle('wrong',!correct);other.classList.toggle('correct',correct);if(correct)other.disabled=true;});
    });
    if (wrongCount > 0) {
        playSound("wrong");
        state.wrongInputs += wrongCount;
        const values=row.answers.map((_,i)=>parseRational(inputs.find(input=>Number(input.dataset.inputIndex)===i)?.value));
        const candidate=values.every(Boolean)?R.rowExpression(row,values):null;
        const expected=R.rowExpression(row);
        setFeedback(candidate&&expected&&R.samePoly(candidate.value,expected.value)
          ? '數值相等；請再依本列要求整理（化到最簡，或拆出最大的平方因數）。'
          : `這一列有 ${wrongCount} 格不正確，修正後再檢查一次。`, 'bad');
        updateStats();
        const firstWrong = inputs.find(input => input.classList.contains("wrong"));
        if (firstWrong) { firstWrong.focus(); firstWrong.select?.(); }
        return;
    }

    playSound("correct");
    rowElement.classList.remove("current");
    rowElement.classList.add("solved");
    state.rowIndex++;

    if (state.rowIndex < question.rows.length) {
        const nextRow = document.querySelector(`.step-row[data-row-index="${state.rowIndex}"]`);
        nextRow.classList.remove("hidden");
        nextRow.classList.add("current");
        setFeedback("答對了！下一列已解鎖。", "good");
        focusFirstInput();
    } else {
        completeQuestion();
    }
}

function completeQuestion() {
    const question = currentQuestion();
    document.getElementById("solution-box").innerHTML = `✅ 完整過程：${question.solution}`;
    document.getElementById("solution-box").classList.remove("hidden");
    state.questionComplete = true;
    document.getElementById("check-btn").textContent = "下一題";

    state.practiceCompleted++;
    stageProgress[question.kind]++;
    setFeedback('整題完成！看完解析後，按「下一題」繼續。', 'good');
    updateStats();
    const i = R.TOPICS.findIndex(t => t.id === state.topic);
    document.getElementById('next-stage-btn').classList.toggle('hidden', !(state.mode === 'practice' && i >= 0 && i < 4 && stageProgress[state.topic] >= 5));
}

function advanceQuestion() {
    if (state.finished || state.mode !== 'practice') return;
    state.questions=[nextPracticeQuestion()];state.questionIndex=0;renderQuestion();
}
function focusFirstInput() {
    const row=document.querySelector(`.step-row[data-row-index="${state.rowIndex}"]`);
    const input=row&&row.querySelector('.answer-input:not(:disabled)');
    if(input){input.focus();state.activeInput=input;if(window.matchMedia('(max-width: 590px)').matches)row.scrollIntoView({block:'start',behavior:'smooth'});}
}

function typeKey(key){
    const input=state.activeInput;
    if(!input||input.disabled||state.finished||state.questionComplete||input.tagName==='SELECT')return;
    if(state.mode==='exam'&&Date.now()>=state.deadline)return submitExam(true);
    let start=input.selectionStart??input.value.length,end=input.selectionEnd??start,text='';
    if(key==='clear'){input.value='';start=0;}
    else if(key==='backspace'){if(start===end&&start>0)start--;input.value=input.value.slice(0,start)+input.value.slice(end);}
    else{
        if(key==='mixed'){if(state.mode==='exam')text='√';else{if(!input.value||/[\s/.]/.test(input.value))return;text=' ';}}
        else text=key;
        const max=state.mode==='exam'?160:32;if(input.value.length-(end-start)+text.length>max)return;
        input.value=input.value.slice(0,start)+text+input.value.slice(end);start+=text.length;
    }
    input.classList.remove('wrong');input.focus();input.setSelectionRange?.(start,start);
    if(state.mode==='exam')examInputChanged();else{
        const row=input.closest('.step-row');row?.querySelectorAll('.answer-input').forEach(other=>{if(other!==input&&other.dataset.inputIndex===input.dataset.inputIndex){other.value=input.value;updateAnswerVisual(other);}});
        updateAnswerVisual(input);
    }
}
function updateStats() {
    document.getElementById("stat-progress").textContent = state.mode === "exam"
        ? `${Math.min(state.questionIndex + 1, EXAM_QUESTION_COUNT)} / ${EXAM_QUESTION_COUNT}`
        : `第 ${state.practiceCompleted + 1} 題`;
    document.getElementById("stat-score").textContent = state.mode === "exam" ? `${state.exam.entries.filter(e=>e.raw.trim()).length} / 10` : state.practiceCompleted;
    document.getElementById("stat-question-score").textContent = state.mode === "exam" ? "10 分" : "—";
}

function updateTimer() {
    if (state.mode !== "exam" || state.finished) return;
    const remainingMs = Math.max(0, state.deadline - Date.now());
    const seconds = Math.ceil(remainingMs / 1000);
    const minutesPart = Math.floor(seconds / 60);
    const secondsPart = String(seconds % 60).padStart(2, "0");
    document.getElementById("stat-time").textContent = `${minutesPart}:${secondsPart}`;
    const percent = (remainingMs / (EXAM_SECONDS * 1000)) * 100;
    const bar = document.getElementById("timer-bar");
    bar.style.width = `${percent}%`;
    bar.style.background = percent <= 20 ? "var(--error)" : "var(--exam)";
    if (remainingMs <= 0) submitExam(true);
}

function finishSession(timedOut) {
    if (state.finished) return;
    state.finished = true;
    document.body.classList.remove('is-playing','is-exam');
    document.getElementById('exam-answer').disabled=true;
    if (state.timerId) window.clearInterval(state.timerId);
    state.timerId = null;

    document.getElementById("question-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.remove("hidden");
    document.getElementById("play-controls").classList.add("hidden");
    document.getElementById("end-controls").classList.remove("hidden");
    document.getElementById("mode-pill").textContent = "挑戰結束";

    if (state.mode === "exam") {
        const report=state.exam.finish(timedOut);
        document.getElementById('end-icon').textContent=report.timedOut?'⏰':'🏁';
        document.getElementById('end-title').textContent=report.timedOut?'時間到，已自動交卷':'考試完成！';
        document.getElementById('final-score').textContent=`${report.score} 分`;
        const details=document.getElementById('final-details');details.replaceChildren();
        const summary=document.createElement('p');summary.textContent=`答對 ${report.correct} / 10 題；已填 ${report.answered} 題。每題 10 分，未作答或未化到最簡不計分。`;details.appendChild(summary);
        report.results.forEach((result,i)=>{
            const item=document.createElement('details');item.className='exam-result';
            const title=document.createElement('summary');title.textContent=`第 ${i+1} 題｜${result.kind==='correct'?'✓ 答對':result.message}`;item.appendChild(title);
            const q=document.createElement('div');q.className='result-question';q.innerHTML=result.question.prompt;item.appendChild(q);
            const raw=document.createElement('p');raw.textContent=`你的答案：${result.raw||'未作答'}`;item.appendChild(raw);
            const answer=document.createElement('div');answer.className='result-answer';answer.innerHTML='最簡答案：'+R.polyHTML(result.question.answer);item.appendChild(answer);
            const solution=document.createElement('div');solution.className='result-solution';solution.innerHTML=result.question.solution;item.appendChild(solution);details.appendChild(item);
        });
    } else {
        document.getElementById("end-icon").textContent = "🌟";
        document.getElementById("end-title").textContent = "練習暫告一段落";
        document.getElementById("final-score").textContent = `${state.practiceCompleted} 題`;
        document.getElementById("final-details").textContent = `你完成了 ${state.practiceCompleted} 題，每一題都訂正到完全正確。`;
    }
}

function repeatMode() {
    const previousMode = state.mode;
    const previousTopic = state.topic;
    document.getElementById('practice-topic').value = previousTopic;
    updateScope(state.variant);
    if (previousMode === "exam") startExam();
    else {
        document.getElementById("practice-topic").value = previousTopic;
        startPractice();
    }
}

function returnToSetup() {
    resetState();
    document.getElementById("intro-screen").classList.remove("hidden");
    document.getElementById("question-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("setup-controls").classList.remove("hidden");
    document.getElementById("play-controls").classList.add("hidden");
    document.getElementById("end-controls").classList.add("hidden");
    document.getElementById("mode-pill").textContent = "準備中";
    updateScope();
}

function setFeedback(message, type) {
    const box = document.getElementById("feedback");
    box.textContent = message;
    box.className = `feedback${type ? ` ${type}` : ""}`;
}

let audioContext = null;
function playSound(type) {
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === "suspended") audioContext.resume();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain); gain.connect(audioContext.destination);
        const now = audioContext.currentTime;
        oscillator.type = type === "correct" ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(type === "correct" ? 620 : 240, now);
        oscillator.frequency.linearRampToValueAtTime(type === "correct" ? 820 : 150, now + 0.18);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        oscillator.start(now); oscillator.stop(now + 0.23);
    } catch (error) {
        // Audio feedback is optional; gameplay remains available without it.
    }
}
document.getElementById('exam-answer').addEventListener('focus',()=>state.activeInput=document.getElementById('exam-answer'));
document.getElementById('exam-answer').addEventListener('input',examInputChanged);
setupScope();
