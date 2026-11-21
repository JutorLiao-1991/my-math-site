"use strict";

const EXAM_QUESTION_COUNT = 10;
const EXAM_SECONDS = 10 * 60;
const POINTS_PER_QUESTION = 10;
const JUDGE_COUNT = 10;

const F = Factorization;
const $ = id => document.getElementById(id);
const stageProgress = Object.fromEntries(F.TOPICS.map(t => [t.id, 0]));
const state = {
    mode: null, topic: "common", variant: "all",
    question: null, rowIndex: 0, questionComplete: false, practiceCompleted: 0,
    hintLevel: 0, hintsUsed: 0, lastVariant: null,
    exam: null, questions: [], questionIndex: 0, timerId: null, deadline: null,
    judge: null, activeInput: null, finished: false
};
const tile = { prob: null, p: 1, q: 0, r: 1, s: 0, tab: "rect", n: 3, cut: 0, solved: false };

/* ---------------- 設定畫面 ---------------- */
function setupScope() {
    const select = $("practice-topic");
    F.TOPICS.forEach((t, i) => select.add(new Option(`${i + 1}. ${t.title}`, t.id)));
    select.add(new Option("五階段綜合", "all"));
    select.addEventListener("change", () => updateScope());
    updateScope();
}
function updateScope(variant = "all") {
    const topic = $("practice-topic").value;
    const variants = F.variantsOf(topic);
    const vs = $("practice-variant"); vs.replaceChildren();
    vs.add(new Option("範圍內全部題型", "all"));
    variants.forEach(v => vs.add(new Option(v.title, v.id)));
    vs.value = variants.some(v => v.id === variant) ? variant : "all";
    const path = $("learning-path"); path.replaceChildren();
    F.TOPICS.forEach((t, i) => {
        const b = document.createElement("button"); b.type = "button";
        b.className = "stage-button" + (topic === t.id ? " active" : "");
        b.setAttribute("aria-pressed", String(topic === t.id));
        b.textContent = `${i + 1} ${t.short}${stageProgress[t.id] ? " · " + stageProgress[t.id] + " 題" : ""}`;
        b.onclick = () => { $("practice-topic").value = t.id; updateScope(); };
        path.appendChild(b);
    });
    const selected = F.TOPICS.find(t => t.id === topic);
    $("preview-badge").textContent = selected ? `階段 ${F.TOPICS.indexOf(selected) + 1}` : "整合練習";
    $("preview-title").textContent = selected ? selected.title : "五階段綜合";
    $("preview-tip").textContent = selected ? selected.tip : "五個階段串起來練習；綜合考試每個階段各出兩題。";
    const sample = F.makeQuestion(variants[0].id);
    $("preview-example").innerHTML = sample.prompt + " ＝ " + sample.answerHTML;
    $("preview-types").textContent = (selected ? selected.ref + "｜" : "") + variants.map(v => v.title).join(" · ");
}
function nextStage() {
    const i = F.TOPICS.findIndex(t => t.id === state.topic);
    returnToSetup();
    $("practice-topic").value = F.TOPICS[Math.min(i + 1, F.TOPICS.length - 1)].id;
    updateScope();
}

/* ---------------- 共用 ---------------- */
function usesTouchKeypadOnly() { return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0; }
function setFeedback(message, type) { const box = $("feedback"); box.innerHTML = message; box.className = `feedback${type ? " " + type : ""}`; }
function show(id, on) { $(id).classList.toggle("hidden", !on); }
const PRACTICE_KEYS = ["7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "⌫", "0", "清除"];
const EXAM_KEYS = ["7", "8", "9", "(", "4", "5", "6", ")", "1", "2", "3", "x", "0", "+", "−", "²", "y", "⌫", "清除"];
function buildKeypad(keys) {
    const pad = $("numpad"); pad.replaceChildren();
    keys.forEach(k => {
        const b = document.createElement("button"); b.type = "button"; b.className = "key-btn" + (k === "清除" ? " wide" : "");
        b.textContent = k; b.onclick = () => typeKey(k);
        if (k === "x" || k === "y") b.innerHTML = `<i>${k}</i>`;
        pad.appendChild(b);
    });
}
function typeKey(key) {
    const input = state.activeInput;
    if (!input || input.disabled || state.finished || state.questionComplete) return;
    if (state.mode === "exam" && state.exam.expired()) return submitExam(true);
    let start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
    if (key === "清除") { input.value = ""; start = 0; }
    else if (key === "⌫") { if (start === end && start > 0) start--; input.value = input.value.slice(0, start) + input.value.slice(end); }
    else {
        const max = state.mode === "exam" ? 120 : 6;
        if (input.value.length - (end - start) + key.length > max) return;
        input.value = input.value.slice(0, start) + key + input.value.slice(end); start += key.length;
    }
    input.classList.remove("wrong");
    if (!usesTouchKeypadOnly()) input.focus();
    input.setSelectionRange?.(start, start);
    input.dispatchEvent(new Event("input"));
}
function resetState() {
    if (state.timerId) window.clearInterval(state.timerId);
    document.body.classList.remove("is-playing", "is-exam", "is-judge", "tile-mode", "projector");
    $("submit-confirm").classList.add("hidden");
    Object.assign(state, { mode: null, question: null, rowIndex: 0, questionComplete: false, practiceCompleted: 0, hintLevel: 0, hintsUsed: 0,
        exam: null, questions: [], questionIndex: 0, timerId: null, deadline: null, judge: null, activeInput: null, finished: false });
    $("solution-box").classList.add("hidden");
}
function showScreen(name) {
    ["intro-screen", "question-screen", "tile-screen", "end-screen"].forEach(id => show(id, id === name));
}
function showSide(name) {
    ["setup-controls", "play-controls", "tile-controls", "end-controls"].forEach(id => show(id, id === name));
    const side = document.querySelector(".side-panel"); if (side) side.scrollTop = 0;
}
function returnToSetup() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    resetState();
    showScreen("intro-screen"); showSide("setup-controls");
    $("mode-pill").textContent = "準備中";
    updateScope(state.variant);
}

/* ---------------- 練習模式 ---------------- */
function startPractice() {
    resetState();
    state.mode = "practice";
    state.topic = $("practice-topic").value;
    state.variant = $("practice-variant").value;
    showPlayUI();
    nextPracticeQuestion();
}
function pickPracticeVariant() {
    if (state.variant !== "all") return state.variant;
    const options = F.variantsOf(state.topic).map(v => v.id).filter(id => id !== state.lastVariant);
    return options[Math.floor(Math.random() * options.length)] || F.variantsOf(state.topic)[0].id;
}
function nextPracticeQuestion() {
    const id = pickPracticeVariant(); state.lastVariant = id;
    state.question = F.makeQuestion(id);
    renderPractice();
}
function showPlayUI() {
    document.body.classList.add("is-playing");
    document.body.classList.toggle("is-exam", state.mode === "exam");
    document.body.classList.toggle("is-judge", state.mode === "judge");
    showScreen("question-screen"); showSide("play-controls");
    show("exam-nav-area", state.mode === "exam");
    show("judge-controls", state.mode === "judge");
    show("keypad-dock", state.mode !== "judge");
    show("timer-wrap", state.mode === "exam");
    show("next-stage-btn", false);
    show("hint-btn", state.mode === "practice");
    show("steps", state.mode === "practice");
    show("exam-answer-area", state.mode === "exam");
    show("judge-area", state.mode === "judge");
    $("next-cell-btn").textContent = state.mode === "exam" ? "上一題" : "下一格";
    $("check-btn").textContent = state.mode === "exam" ? "儲存並下一題" : "檢查本列";
    $("score-label").textContent = state.mode === "exam" ? "已填答" : state.mode === "judge" ? "答對" : "已完成";
    $("stat-third-label").textContent = state.mode === "practice" ? "本題提示" : "每題分數";
    $("mode-pill").textContent = { practice: "練習模式", exam: "考試模式", judge: "判型快答" }[state.mode];
    buildKeypad(state.mode === "exam" ? EXAM_KEYS : PRACTICE_KEYS);
    document.querySelector(".keypad-actions").style.gridTemplateColumns = state.mode === "practice" ? "" : "1fr 2fr";
}
function renderPractice() {
    const q = state.question;
    state.rowIndex = 0; state.questionComplete = false; state.hintLevel = 0; state.hintsUsed = 0; state.activeInput = null; state.logMiss = false;
    $("check-btn").textContent = "檢查本列";
    $("topic-badge").textContent = `${q.topicTitle}・${q.variantTitle}`;
    $("practice-formula").innerHTML = `<small>本題適用</small>${q.reference}`;
    show("practice-formula", true);
    $("question-number").textContent = `練習第 ${state.practiceCompleted + 1} 題`;
    $("question-prompt").innerHTML = q.prompt;
    show("solution-box", false);
    const steps = $("steps"); steps.replaceChildren();
    q.rows.forEach((row, i) => steps.appendChild(renderRow(row, i)));
    setFeedback("因式分解上面的式子：從第 1 步開始。", "");
    focusFirstInput();
    updateStats();
}
function inputHTML(index, meta) {
    return `<span class="answer-field"><input class="answer-input${meta && meta.signed ? " signed" : ""}" type="text" maxlength="6" data-input-index="${index}" autocomplete="off"${meta && meta.signed ? ' placeholder="±"' : ""}></span>`;
}
function renderRow(row, rowIndex) {
    const wrapper = document.createElement("div");
    wrapper.className = "step-row" + (rowIndex === 0 ? " current" : " hidden");
    wrapper.dataset.rowIndex = String(rowIndex);
    const label = document.createElement("span"); label.className = "step-label";
    label.innerHTML = `第 ${rowIndex + 1} 步｜${row.label}`;
    wrapper.appendChild(label);
    if (row.kind === "fill") {
        const line = document.createElement("div"); line.className = "equation-line";
        line.innerHTML = '<span class="equation-content">' + row.html.replace(/\{\{(\d+)\}\}/g, (_, i) => inputHTML(i, row.slots[Number(i)])) + "</span>";
        wrapper.appendChild(line);
    } else if (row.kind === "choice") {
        if (row.html) { const p = document.createElement("div"); p.className = "choice-prompt"; p.innerHTML = row.html; wrapper.appendChild(p); }
        const list = document.createElement("div"); list.className = "choice-list";
        row.options.forEach((html, k) => {
            const b = document.createElement("button"); b.type = "button"; b.className = "choice-btn"; b.innerHTML = html;
            b.onclick = () => chooseOption(rowIndex, k, b); list.appendChild(b);
        });
        wrapper.appendChild(list);
    } else {
        const v = `<i>${row.v}</i>`;
        const left = i => row.monic ? `<span class="cross-cell">${v}</span>` : `<span class="cross-cell">${inputHTML(i, { signed: false })}${v}</span>`;
        const right = i => `<span class="cross-cell">${inputHTML(i, { signed: true })}</span>`;
        const [l1, r1, l2, r2] = row.monic ? [null, 0, null, 1] : [0, 1, 2, 3];
        wrapper.insertAdjacentHTML("beforeend", `<div class="cross-wrap"><div class="cross-grid">${left(l1)}<svg class="cross-x" viewBox="0 0 64 100" preserveAspectRatio="none" aria-hidden="true"><line x1="6" y1="12" x2="58" y2="88"/><line x1="58" y1="12" x2="6" y2="88"/></svg>${right(r1)}${left(l2)}${right(r2)}</div><div class="cross-readout" aria-live="polite"></div></div>`);
        const grid = wrapper.querySelector(".cross-grid");
        grid.children[0].style.gridColumn = "1"; grid.children[0].style.gridRow = "1";
        grid.children[2].style.gridColumn = "3"; grid.children[2].style.gridRow = "1";
        grid.children[3].style.gridColumn = "1"; grid.children[3].style.gridRow = "2";
        grid.children[4].style.gridColumn = "3"; grid.children[4].style.gridRow = "2";
        updateCrossReadout(row, wrapper);
    }
    wrapper.querySelectorAll(".answer-input").forEach(input => {
        input.inputMode = usesTouchKeypadOnly() ? "none" : "text";
        input.readOnly = usesTouchKeypadOnly();
        input.setAttribute("aria-label", `${row.label.replace(/<[^>]+>/g, "")}第 ${Number(input.dataset.inputIndex) + 1} 格`);
        input.addEventListener("focus", () => { state.activeInput = input; });
        input.addEventListener("pointerdown", () => { state.activeInput = input; });
        input.addEventListener("input", () => { input.classList.remove("wrong"); if (row.kind === "cross") updateCrossReadout(row, wrapper); });
        input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); checkCurrentRow(); } });
    });
    return wrapper;
}
const fmt = n => String(n).replace("-", "−");
function monoText(k, v) { return (k === 1 ? "" : k === -1 ? "−" : fmt(k)) + `<i>${v}</i>`; }
function crossValues(row, wrapper) {
    return [...wrapper.querySelectorAll(".answer-input")].map(i => F.parseSlot(i.value, { signed: true, coef: false }));
}
function updateCrossReadout(row, wrapper) {
    const box = wrapper.querySelector(".cross-readout"), vals = crossValues(row, wrapper);
    const [L1, R1, L2, R2] = row.monic ? [1, vals[0], 1, vals[1]] : vals;
    const need = `需要 ${monoText(row.b, row.v)}`;
    if ([L1, R1, L2, R2].some(x => x === null || x === undefined)) { box.innerHTML = `交叉相乘相加：<br>${need}`; return; }
    const cross = L1 * R2 + L2 * R1, okMid = cross === row.b;
    const okCol = L1 * L2 === row.a && R1 * R2 === row.c;
    box.innerHTML = `直的相乘：${L1 * L2 === 1 ? "" : L1 * L2}<i>${row.v}</i><sup>2</sup>、${fmt(R1 * R2)} ${okCol ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}<br>`
        + `交叉相乘相加：${monoText(L1 * R2, row.v)} ${L2 * R1 < 0 ? "−" : "+"} ${monoText(Math.abs(L2 * R1), row.v)} ＝ ${monoText(cross, row.v)} ${okMid ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}<br>${need}`;
}
function currentRowElement() { return document.querySelector(`.step-row[data-row-index="${state.rowIndex}"]`); }
function focusFirstInput() {
    const rowEl = currentRowElement(), input = rowEl && rowEl.querySelector(".answer-input:not(:disabled)");
    if (input) { if (!usesTouchKeypadOnly()) input.focus(); state.activeInput = input; }
    else state.activeInput = null;
    if (rowEl && window.matchMedia("(max-width: 590px)").matches) rowEl.scrollIntoView({ block: "start", behavior: "smooth" });
    markActive();
}
function markActive() {
    document.querySelectorAll(".answer-input").forEach(i => i.style.background = "");
    if (state.activeInput && state.mode === "practice") state.activeInput.style.background = "#fff7d6";
}
function focusNextInput() {
    if (state.mode === "exam") return examNavigate((state.questionIndex + EXAM_QUESTION_COUNT - 1) % EXAM_QUESTION_COUNT);
    const rowEl = currentRowElement(); if (!rowEl) return;
    const inputs = [...rowEl.querySelectorAll(".answer-input:not(:disabled)")];
    const input = inputs[(inputs.indexOf(state.activeInput) + 1) % inputs.length];
    if (input) { state.activeInput = input; if (!usesTouchKeypadOnly()) input.focus(); markActive(); }
}
document.addEventListener("focusin", e => { if (e.target.classList?.contains("answer-input")) { state.activeInput = e.target; markActive(); } });
document.addEventListener("pointerdown", e => { if (e.target.classList?.contains("answer-input")) { state.activeInput = e.target; markActive(); } });

function checkCurrentRow() {
    if (state.finished || !state.mode) return;
    if (state.mode === "exam") return examNavigate((state.questionIndex + 1) % EXAM_QUESTION_COUNT);
    if (state.mode !== "practice") return;
    if (state.questionComplete) return advanceQuestion();
    const row = state.question.rows[state.rowIndex], rowEl = currentRowElement();
    if (row.kind === "choice") return setFeedback("這一步請直接點選一個答案。", "bad");
    const inputs = [...rowEl.querySelectorAll(".answer-input")];
    const empty = inputs.find(i => !i.value.trim());
    if (empty) { setFeedback("請先填完這一列的所有空格。", "bad"); state.activeInput = empty; markActive(); return; }
    if (row.kind === "cross") {
        const res = F.checkCross(row, crossValues(row, rowEl));
        if (!res.ok) { playSound("wrong"); inputs.forEach(i => i.classList.add("wrong")); return setFeedback(res.message, "bad"); }
        inputs.forEach(i => { i.classList.add("correct"); i.disabled = true; });
        prettifyInputs(rowEl);
        return solveRow("十字圖正確！把每一橫列寫成一個因式。");
    }
    const res = F.checkFill(row, inputs.map(i => i.value));
    if (!res.ok) {
        playSound("wrong");
        inputs.forEach((input, k) => { const ok = res.perSlot[k]; input.classList.toggle("wrong", !ok); input.classList.toggle("correct", ok); });
        const wrong = res.perSlot.filter(x => !x).length;
        const bad = res.values.some(v => v === null);
        setFeedback(bad ? "有空格的格式不對：請填整數（帶符號的格子可以填 −3、+3 或 3）。" : `這一列有 ${wrong} 格不正確，修正後再檢查一次。`, "bad");
        const first = inputs.find(i => i.classList.contains("wrong")); if (first) { state.activeInput = first; markActive(); }
        return;
    }
    inputs.forEach(i => { i.classList.remove("wrong"); i.classList.add("correct"); i.disabled = true; });
    prettifyInputs(rowEl);
    solveRow("答對了！下一列已解鎖。");
}
function chooseOption(rowIndex, k, button) {
    if (state.mode !== "practice" || rowIndex !== state.rowIndex || state.questionComplete) return;
    const row = state.question.rows[rowIndex];
    if (k !== row.answer) { playSound("wrong"); button.classList.add("wrong"); button.disabled = true; return setFeedback(`再想想：${row.hint}`, "bad"); }
    button.classList.add("correct");
    currentRowElement().querySelectorAll(".choice-btn").forEach(b => b.disabled = true);
    solveRow("答對了！下一列已解鎖。");
}
function prettifyInputs(rowEl) {
    const row = state.question.rows[Number(rowEl.dataset.rowIndex)];
    rowEl.querySelectorAll(".answer-input").forEach(input => {
        input.style.background = "";
        const v = F.parseSlot(input.value, { signed: true, coef: true });
        if (v === null) return;
        const coef = row.kind === "fill" && row.slots[Number(input.dataset.inputIndex)].coef;
        const mag = coef && Math.abs(v) === 1 ? "" : Math.abs(v);
        input.value = input.classList.contains("signed") ? (v < 0 ? "−" : "+") + mag : fmt(v);
    });
}
function solveRow(message) {
    playSound("correct");
    const rowEl = currentRowElement(); rowEl.classList.remove("current"); rowEl.classList.add("solved");
    state.rowIndex++; state.hintLevel = 0;
    if (state.rowIndex < state.question.rows.length) {
        const next = currentRowElement(); next.classList.remove("hidden"); next.classList.add("current");
        setFeedback(message, "good"); focusFirstInput();
    } else completeQuestion();
}
function showHint() {
    if (state.mode !== "practice" || state.questionComplete) return;
    const row = state.question.rows[state.rowIndex], rowEl = currentRowElement();
    if (state.hintLevel === 0) { state.hintLevel = 1; state.hintsUsed++; updateStats(); return setFeedback("💡 " + row.hint + "<br><small>再按一次「提示」會直接填好這一列。</small>", "hint"); }
    state.hintsUsed++;
    if (row.kind === "choice") {
        const b = rowEl.querySelectorAll(".choice-btn")[row.answer]; b.classList.add("correct");
        rowEl.querySelectorAll(".choice-btn").forEach(x => x.disabled = true);
    } else {
        rowEl.querySelectorAll(".answer-input").forEach((input, k) => { input.value = fmt(row.answers[k]); input.classList.remove("wrong"); input.classList.add("correct"); input.disabled = true; });
        if (row.kind === "cross") updateCrossReadout(row, rowEl);
        prettifyInputs(rowEl);
    }
    updateStats();
    solveRow("已幫你填好這一列，看懂後繼續下一列。");
}
function completeQuestion() {
    const q = state.question;
    state.questionComplete = true;
    $("solution-box").innerHTML = `✅ 完整過程：<br>${q.prompt}<br>${q.solution}<div class="final-line">答：${q.answerHTML}</div>`;
    show("solution-box", true);
    $("check-btn").textContent = "下一題";
    state.practiceCompleted++; stageProgress[q.kind]++;
    if (window.JutorLog) JutorLog.practice(!state.logMiss && !state.hintsUsed);
    setFeedback(state.hintsUsed ? `整題完成（用了 ${state.hintsUsed} 次提示）。看完過程後按「下一題」。` : "整題完成，沒有用提示！按「下一題」繼續。", "good");
    updateStats();
    const i = F.TOPICS.findIndex(t => t.id === state.topic);
    show("next-stage-btn", i >= 0 && i < F.TOPICS.length - 1 && stageProgress[state.topic] >= 5);
}
function advanceQuestion() { if (state.mode === "practice" && !state.finished) nextPracticeQuestion(); }

/* ---------------- 考試模式 ---------------- */
function startExam() {
    resetState();
    state.mode = "exam";
    state.topic = $("practice-topic").value; state.variant = "all";
    state.questions = F.examVariantList(state.topic, EXAM_QUESTION_COUNT).map(id => F.makeQuestion(id));
    state.exam = new F.ExamSession(state.questions, EXAM_SECONDS);
    state.deadline = state.exam.deadline;
    showPlayUI();
    updateTimer(); state.timerId = window.setInterval(updateTimer, 250);
    renderExamQuestion();
}
function renderExamQuestion() {
    const q = state.questions[state.questionIndex];
    $("topic-badge").textContent = `${q.topicTitle}・考試`;
    show("practice-formula", false);
    $("question-number").textContent = `第 ${state.questionIndex + 1} / ${EXAM_QUESTION_COUNT} 題`;
    $("question-prompt").innerHTML = q.prompt;
    const input = $("exam-answer");
    input.value = state.exam.entries[state.questionIndex].raw; input.disabled = false;
    input.readOnly = usesTouchKeypadOnly(); input.inputMode = usesTouchKeypadOnly() ? "none" : "text";
    state.activeInput = input;
    setFeedback("直接寫出因式分解的最後結果；可以切換題號，交卷後統一評分。", "");
    updateExamPreview(); renderExamNav(); updateStats();
    if (!usesTouchKeypadOnly()) input.focus();
}
function updateExamPreview() {
    const q = state.questions[state.questionIndex], raw = $("exam-answer").value, html = F.previewHTML(raw, q.v);
    $("exam-preview").innerHTML = html || (raw.trim() ? "輸入中…" : "答案預覽");
}
function examInputChanged() {
    if (state.mode !== "exam" || state.finished) return;
    if (!state.exam.setAnswer($("exam-answer").value)) return submitExam(true);
    updateExamPreview(); renderExamNav(); updateStats();
}
function examNavigate(index) {
    if (state.mode !== "exam" || state.finished) return;
    if (!state.exam.goto(index)) return submitExam(true);
    state.questionIndex = index; renderExamQuestion();
}
function toggleReview() { if (!state.exam?.toggleReview()) { if (state.exam) submitExam(true); return; } renderExamNav(); }
function renderExamNav() {
    const nav = $("exam-question-nav"); nav.replaceChildren();
    state.exam.entries.forEach((entry, i) => {
        const q = state.questions[i], filled = Boolean(entry.raw.trim()), valid = filled && F.parseAnswer(entry.raw, q.v).ok;
        const b = document.createElement("button"); b.type = "button";
        b.className = "exam-number" + (i === state.questionIndex ? " current" : "") + (filled ? (valid ? " entered" : " partial") : "") + (entry.review ? " flagged" : "");
        b.textContent = String(i + 1);
        b.setAttribute("aria-label", `第 ${i + 1} 題，${filled ? (valid ? "已填答" : "輸入未完整") : "未作答"}${entry.review ? "，待檢查" : ""}`);
        b.onclick = () => examNavigate(i); nav.appendChild(b);
    });
    const review = state.exam.entries[state.questionIndex].review;
    $("review-toggle").textContent = review ? "★ 已標記待檢查" : "☆ 標記待檢查";
    $("review-toggle").classList.toggle("flagged", review);
}
function requestSubmit() {
    if (state.mode !== "exam" || state.finished) return;
    if (state.exam.expired()) return submitExam(true);
    const answered = state.exam.entries.filter(e => e.raw.trim()).length;
    $("submit-message").textContent = `已填 ${answered} 題，尚有 ${EXAM_QUESTION_COUNT - answered} 題未填。確認交卷後將統一評分。`;
    show("submit-confirm", true);
}
function cancelSubmit() { show("submit-confirm", false); }
function submitExam(timedOut = false) { if (state.mode !== "exam" || state.finished) return; state.exam.finish(timedOut); finishSession(); }
function updateTimer() {
    if (state.mode !== "exam" || state.finished) return;
    const remaining = Math.max(0, state.deadline - Date.now()), sec = Math.ceil(remaining / 1000);
    $("stat-time").textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    const pct = remaining / (EXAM_SECONDS * 1000) * 100;
    $("timer-bar").style.width = `${pct}%`; $("timer-bar").style.background = pct <= 20 ? "var(--error)" : "var(--exam)";
    if (remaining <= 0) submitExam(true);
}

/* ---------------- 判型快答 ---------------- */
function startJudge() {
    resetState();
    state.mode = "judge";
    state.judge = { list: F.judgeVariantList(JUDGE_COUNT).map(id => F.makeQuestion(id)), index: 0, correct: 0, answered: false, log: [] };
    showPlayUI();
    const grid = $("move-grid"); grid.replaceChildren();
    F.MOVES.forEach(m => { const b = document.createElement("button"); b.type = "button"; b.className = "move-btn"; b.dataset.move = m.id; b.textContent = m.label; b.onclick = () => answerJudge(m.id, b); grid.appendChild(b); });
    renderJudge();
}
function renderJudge() {
    const j = state.judge, q = j.list[j.index];
    j.answered = false;
    $("topic-badge").textContent = "判型快答";
    show("practice-formula", false);
    $("question-number").textContent = `第 ${j.index + 1} / ${JUDGE_COUNT} 題`;
    $("question-prompt").innerHTML = q.prompt;
    show("judge-explain", false); show("judge-next", false);
    document.querySelectorAll(".move-btn").forEach(b => { b.disabled = false; b.className = "move-btn"; });
    setFeedback("點選右側（或下方）的方法。", "");
    updateStats();
}
function answerJudge(move, button) {
    const j = state.judge; if (!j || j.answered) return;
    const q = j.list[j.index], ok = q.moves.includes(move);
    j.answered = true; if (ok) j.correct++;
    j.log.push({ q, move, ok });
    playSound(ok ? "correct" : "wrong");
    document.querySelectorAll(".move-btn").forEach(b => { b.disabled = true; if (q.moves.includes(b.dataset.move)) b.classList.add("expected"); });
    button.classList.add(ok ? "correct" : "wrong");
    const names = q.moves.map(id => F.MOVES.find(m => m.id === id).label).join("、");
    setFeedback(ok ? "判斷正確！" : `這題第一步用：${names}`, ok ? "good" : "bad");
    const first = q.rows[0];
    $("judge-explain").innerHTML = `<b>為什麼：</b>${q.reason}<div class="first-step">第一步：${first.solved}</div><div class="first-step">答：${q.answerHTML}</div>`;
    show("judge-explain", true);
    $("judge-next").textContent = j.index + 1 < JUDGE_COUNT ? "下一題" : "看結果";
    show("judge-next", true);
    updateStats();
}
function nextJudge() { const j = state.judge; if (!j || !j.answered) return; if (++j.index >= JUDGE_COUNT) return finishSession(); renderJudge(); }

/* ---------------- 統計與結束 ---------------- */
function updateStats() {
    if (state.mode === "exam") {
        $("stat-progress").textContent = `${state.questionIndex + 1} / ${EXAM_QUESTION_COUNT}`;
        $("stat-score").textContent = `${state.exam.entries.filter(e => e.raw.trim()).length} / ${EXAM_QUESTION_COUNT}`;
        $("stat-question-score").textContent = `${POINTS_PER_QUESTION} 分`;
    } else if (state.mode === "judge") {
        $("stat-progress").textContent = `${state.judge.index + 1} / ${JUDGE_COUNT}`;
        $("stat-score").textContent = state.judge.correct;
        $("stat-question-score").textContent = "—"; $("stat-time").textContent = "不限時";
    } else {
        $("stat-progress").textContent = `第 ${state.practiceCompleted + (state.questionComplete ? 0 : 1)} 題`;
        $("stat-score").textContent = state.practiceCompleted;
        $("stat-question-score").textContent = state.hintsUsed ? `${state.hintsUsed} 次` : "0 次";
        $("stat-time").textContent = "不限時";
    }
}
function finishSession() {
    if (state.finished) return;
    state.finished = true;
    if (state.timerId) window.clearInterval(state.timerId); state.timerId = null;
    document.body.classList.remove("is-playing", "is-exam", "is-judge");
    $("exam-answer").disabled = true;
    showScreen("end-screen"); showSide("end-controls");
    $("mode-pill").textContent = "挑戰結束";
    const details = $("final-details"); details.replaceChildren();
    const addResult = (title, promptHTML, lines) => {
        const item = document.createElement("details"); item.className = "exam-result";
        const s = document.createElement("summary"); s.textContent = title; item.appendChild(s);
        const qd = document.createElement("div"); qd.className = "result-question"; qd.innerHTML = promptHTML; item.appendChild(qd);
        lines.forEach(([cls, html, text]) => { const d = document.createElement(cls ? "div" : "p"); if (cls) d.className = cls; if (text !== undefined) d.textContent = text; else d.innerHTML = html; item.appendChild(d); });
        details.appendChild(item);
    };
    if (state.mode === "exam") {
        const rep = state.exam.finish();
        $("end-icon").textContent = rep.timedOut ? "⏰" : "🏁";
        $("end-title").textContent = rep.timedOut ? "時間到，已自動交卷" : "考試完成！";
        $("final-score").textContent = `${rep.score} 分`;
        if (window.JutorLog) JutorLog.exam({ score: rep.score, full: EXAM_QUESTION_COUNT * POINTS_PER_QUESTION, correct: rep.correct, count: EXAM_QUESTION_COUNT, secs: Math.min(600, 600 - (state.exam.deadline - Date.now()) / 1000) });
        const p = document.createElement("p"); p.textContent = `答對 ${rep.correct} / ${EXAM_QUESTION_COUNT} 題；已填 ${rep.answered} 題。每題 ${POINTS_PER_QUESTION} 分，分解不完全不計分。`; details.appendChild(p);
        rep.results.forEach((r, i) => addResult(`第 ${i + 1} 題｜${r.kind === "correct" ? "✓ 答對" : r.message}`, r.question.prompt, [
            [null, null, `你的答案：${r.raw || "未作答"}`],
            ["result-answer", "標準答案：" + r.question.answerHTML],
            ["result-solution", r.question.solution]
        ]));
    } else if (state.mode === "judge") {
        const j = state.judge;
        $("end-icon").textContent = j.correct >= 8 ? "🏅" : "🔍";
        $("end-title").textContent = "判型快答結束";
        $("final-score").textContent = `${j.correct} / ${JUDGE_COUNT}`;
        if (window.JutorLog) JutorLog.exam({ score: j.correct, full: JUDGE_COUNT, correct: j.correct, count: JUDGE_COUNT, label: "判型快答" });
        const p = document.createElement("p"); p.textContent = "點開每一題可以看原因與第一步。"; details.appendChild(p);
        j.log.forEach((e, i) => addResult(`第 ${i + 1} 題｜${e.ok ? "✓" : "✗ 應該用 " + e.q.moves.map(id => F.MOVES.find(m => m.id === id).label).join("、")}`, e.q.prompt, [
            ["result-solution", e.q.reason + "<br>第一步：" + e.q.rows[0].solved + "<br>答：" + e.q.answerHTML]
        ]));
    } else {
        $("end-icon").textContent = "🌟"; $("end-title").textContent = "練習暫告一段落";
        $("final-score").textContent = `${state.practiceCompleted} 題`;
        details.textContent = `你完成了 ${state.practiceCompleted} 題，每一列都訂正到正確。`;
    }
}
function repeatMode() {
    const mode = state.mode, topic = state.topic, variant = state.variant;
    $("practice-topic").value = topic; updateScope(variant);
    if (mode === "exam") startExam(); else if (mode === "judge") startJudge(); else startPractice();
}

/* ---------------- 代數磚 ---------------- */
const TILE_X = 3.3;
const COLORS = { x2: ["#bfdbfe", "#1d4ed8"], xa: ["#bbf7d0", "#15803d"], xb: ["#fed7aa", "#c2410c"], one: ["#fef08a", "#a16207"] };
function startTiles() {
    resetState();
    state.mode = "tiles";
    document.body.classList.add("tile-mode");
    showScreen("tile-screen"); showSide("tile-controls");
    $("mode-pill").textContent = "代數磚";
    if (!tile.prob) newTileProblem(false);
    setTileTab(tile.tab);
}
function newTileProblem(render = true) {
    let p; do p = F.tileProblem(); while (tile.prob && p.a === tile.prob.a && p.b === tile.prob.b && p.c === tile.prob.c);
    Object.assign(tile, { prob: p, p: 1, q: 0, r: 1, s: 0, solved: false });
    if (render) renderTiles();
}
function setTileTab(tab) {
    tile.tab = tab;
    $("tab-rect").setAttribute("aria-pressed", String(tab === "rect"));
    $("tab-cut").setAttribute("aria-pressed", String(tab === "cut"));
    show("rect-controls", tab === "rect"); show("cut-controls", tab === "cut");
    if (tab === "cut") tile.cut = 0;
    renderTiles();
}
function tileStep(key, d) {
    const max = key === "p" || key === "r" ? 4 : 8;
    tile[key] = Math.max(0, Math.min(max, tile[key] + d));
    renderTiles();
}
function tileHint() {
    const { P, Q, R, S } = tile.prob;
    if (!(tile.p === P && tile.q === Q) && !(tile.p === R && tile.q === S)) { tile.p = P; tile.q = Q; }
    else if (tile.p === P && tile.q === Q) { tile.r = R; tile.s = S; }
    else { tile.r = P; tile.s = Q; }
    renderTiles();
}
const polyHTML = (a, b, c) => F.render(F.builder(new F.Alloc(), "x").quad(a, b, c), null);
const linHTML = (k, c) => (k === 0 ? "" : (k === 1 ? "" : k) + "<i>x</i>") + (c ? (k ? " + " : "") + c : (k ? "" : "0"));
function renderTiles() {
    if (state.mode !== "tiles") return;
    if (tile.tab === "cut") return renderCut();
    const { a, b, c } = tile.prob, { p, q, r, s } = tile;
    $("tile-title").textContent = "代數磚：拼成長方形";
    $("tile-target").innerHTML = polyHTML(a, b, c);
    ["p", "q", "r", "s"].forEach(k => $("out-" + k).textContent = tile[k]);
    const used = { x2: p * r, x: p * s + q * r, one: q * s }, need = { x2: a, x: b, one: c };
    $("tile-counts").innerHTML = [["x2", "x² 磚"], ["x", "x 磚"], ["one", "1 磚"]].map(([k, name]) =>
        `<div class="tile-count ${used[k] === need[k] ? "ok" : used[k] > need[k] ? "over" : ""}">${name}<strong>${used[k]} / ${need[k]}</strong></div>`).join("");
    const stage = $("tile-stage"), W = Math.max(260, stage.clientWidth), H = Math.max(200, stage.clientHeight);
    const wUnits = p * TILE_X + q, hUnits = r * TILE_X + s;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="代數磚長方形">`;
    if (wUnits > 0 && hUnits > 0) {
        const u = Math.min((W - 70) / wUnits, (H - 56) / hUnits, 72), ox = 52, oy = 34;
        const cols = [...Array(p).fill(TILE_X), ...Array(q).fill(1)], rows = [...Array(r).fill(TILE_X), ...Array(s).fill(1)];
        let y = oy;
        rows.forEach((h, j) => {
            let x = ox;
            cols.forEach((w, i) => {
                const type = w > 1 && h > 1 ? "x2" : w > 1 ? "xa" : h > 1 ? "xb" : "one";
                svg += `<rect x="${x}" y="${y}" width="${w * u}" height="${h * u}" fill="${COLORS[type][0]}" stroke="${COLORS[type][1]}" stroke-width="1.5" rx="2"/>`;
                if (j === 0) svg += `<text x="${x + w * u / 2}" y="${oy - 8}" text-anchor="middle" font-size="${Math.min(18, 8 + u * .35)}" font-style="${w > 1 ? "italic" : "normal"}" fill="#334155">${w > 1 ? "x" : "1"}</text>`;
                x += w * u;
            });
            svg += `<text x="${ox - 10}" y="${y + h * u / 2 + 5}" text-anchor="end" font-size="${Math.min(18, 8 + u * .35)}" font-style="${h > 1 ? "italic" : "normal"}" fill="#334155">${h > 1 ? "x" : "1"}</text>`;
            y += h * u;
        });
    } else svg += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="16" fill="#64748b">長和寬都至少要有一點長度</text>`;
    svg += "</svg>";
    stage.innerHTML = svg;
    const ok = used.x2 === a && used.x === b && used.one === c, box = $("tile-status");
    const factored = p === r && q === s ? `(${linHTML(p, q)})<sup>2</sup>` : `(${linHTML(p, q)})(${linHTML(r, s)})`;
    if (ok) {
        if (!tile.solved) playSound("correct");
        tile.solved = true;
        box.className = "tile-status good";
        box.innerHTML = `🎉 拼成長方形了！<span class="eqn">${polyHTML(a, b, c)} ＝ ${factored}</span><br>綠色 ${p}×${s} ＝ ${p * s} 條、橘色 ${q}×${r} ＝ ${q * r} 條，合起來 ${b} 條 x 磚：這就是十字交乘的「交叉相乘相加」。`;
    } else {
        tile.solved = false;
        box.className = "tile-status";
        box.innerHTML = `目前：長 × 寬 ＝ ${factored}。` + (used.x2 !== a ? `先讓 x² 磚剛好 ${a} 塊：長的 x 個數 × 寬的 x 個數。` : used.one !== c ? `再讓 1 磚剛好 ${c} 塊：長的常數 × 寬的常數。` : `x 磚是 ${used.x} 條、需要 ${b} 條：換一種拆法試試。`);
    }
}
function cutN(d) { tile.n = Math.max(1, Math.min(4, tile.n + d)); $("out-n").textContent = tile.n; tile.cut = 0; renderCut(); }
function cutStep(k) { tile.cut = k; renderCut(); }
function renderCut() {
    const n = tile.n, X = 7, step = tile.cut;
    $("out-n").textContent = n;
    $("tile-title").textContent = "平方差：剪一剪、拼一拼";
    $("tile-target").innerHTML = `<i>x</i><sup>2</sup> − ${n * n}`;
    [1, 2, 3].forEach(k => $("cut-" + k).classList.toggle("done", step >= k));
    const stage = $("tile-stage"), W = Math.max(260, stage.clientWidth), H = Math.max(200, stage.clientHeight);
    const u = Math.min((W - 110) / (X + n), (H - 70) / X, 60), ox = 78, oy = 32, a = X * u, m = (X - n) * u, nn = n * u;
    const fs = Math.min(17, 9 + u * .3);
    const bTransform = step >= 3 ? `translate(${ox + a + nn}px, ${oy}px) rotate(90deg)` : `translate(${ox}px, ${oy + m}px)`;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="平方差剪拼">`;
    svg += `<rect x="${ox}" y="${oy}" width="${a}" height="${m}" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="1.5"/>`;
    svg += `<rect x="${ox + m}" y="${oy + m}" width="${nn}" height="${nn}" fill="${step >= 1 ? "none" : "#fecaca"}" stroke="${step >= 1 ? "#94a3b8" : "#b91c1c"}" stroke-dasharray="${step >= 1 ? "5 4" : "0"}" stroke-width="1.5" style="transition: fill .5s"/>`;
    svg += `<g style="transform:${bTransform};transform-origin:0 0;transition:transform 1.1s ease"><rect x="0" y="0" width="${m}" height="${nn}" fill="${step >= 2 ? "#c7d2fe" : "#bfdbfe"}" stroke="${step >= 2 ? "#4338ca" : "#1d4ed8"}" stroke-width="1.5"/>`
        + `</g>`;
    if (step === 2) svg += `<text x="${ox + m / 2}" y="${oy + m + nn / 2 + 5}" text-anchor="middle" font-size="${fs}" fill="#312e81">B</text>`;
    if (step === 3) svg += `<text x="${ox + a + nn / 2}" y="${oy + m / 2 + 5}" text-anchor="middle" font-size="${fs}" fill="#312e81" style="opacity:0;animation:fadeIn .4s 1.1s forwards">B</text>`;
    if (step >= 2) svg += `<text x="${ox + a / 2}" y="${oy + m / 2 + 5}" text-anchor="middle" font-size="${fs}" fill="#1e3a8a">A</text>`;
    if (step === 2) svg += `<line x1="${ox}" y1="${oy + m}" x2="${ox + m}" y2="${oy + m}" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="7 5"/>`;
    const label = (x, y, t, anchor = "middle") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fs}" fill="#334155">${t}</text>`;
    if (step < 3) {
        svg += label(ox + a / 2, oy - 9, "<tspan font-style='italic'>x</tspan>");
        svg += label(ox - 8, oy + a / 2 + 5, "<tspan font-style='italic'>x</tspan>", "end");
        if (step >= 1) svg += label(ox + a + 8, oy + m + nn / 2 + 5, String(n), "start");
        if (step >= 2) svg += label(ox - 8, oy + m / 2 + 5, "<tspan font-style='italic'>x</tspan> − " + n, "end");
    } else {
        svg += label(ox + (a + nn) / 2, oy - 9, "<tspan font-style='italic'>x</tspan> + " + n);
        svg += label(ox - 8, oy + m / 2 + 5, "<tspan font-style='italic'>x</tspan> − " + n, "end");
    }
    svg += "</svg>";
    stage.innerHTML = svg;
    const texts = [
        `邊長 <i>x</i> 的正方形，面積是 <i>x</i><sup>2</sup>。按 ① 開始。`,
        `挖掉邊長 ${n} 的小正方形，剩下的面積是 <span class="eqn"><i>x</i><sup>2</sup> − ${n * n}</span>。`,
        `沿紅色虛線切成兩塊：A 是 <i>x</i> × (<i>x</i> − ${n})，B 是 (<i>x</i> − ${n}) × ${n}。`,
        `把 B 轉 90° 拼到右邊，變成長 (<i>x</i> + ${n})、寬 (<i>x</i> − ${n}) 的長方形：<br><span class="eqn"><i>x</i><sup>2</sup> − ${n * n} ＝ (<i>x</i> + ${n})(<i>x</i> − ${n})</span>`
    ];
    $("tile-status").className = "tile-status" + (step === 3 ? " good" : "");
    $("tile-status").innerHTML = texts[step];
    if (step === 3 && !renderCut.animated) {
        renderCut.animated = true; playSound("correct");
        const g = stage.querySelector("g"); g.style.transition = "none"; g.style.transform = `translate(${ox}px, ${oy + m}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transition = "transform 1.1s ease"; g.style.transform = bTransform; }));
    }
    if (step !== 3) renderCut.animated = false;
}
function toggleProjector() {
    const on = !document.body.classList.contains("projector");
    document.body.classList.toggle("projector", on);
    $("proj-btn").textContent = on ? "離開投影模式" : "📽️ 投影模式";
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.();
    setTimeout(renderTiles, 60);
}
document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("projector")) toggleProjector();
});
let resizeTimer = null;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.mode === "tiles") { renderCut.animated = tile.cut === 3; renderTiles(); } }, 120); });

/* ---------------- 音效 ---------------- */
let audioContext = null;
function playSound(type) {
    if (type === "wrong") state.logMiss = true;
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === "suspended") audioContext.resume();
        const now = audioContext.currentTime;
        if (type === "correct") {
            // 叮咚：高音 E6「叮」接 C6「咚」，每個音加一點高八度泛音讓聲音更清脆，像鐘聲一樣自然衰減
            const master = audioContext.createGain();
            master.gain.value = 0.9; master.connect(audioContext.destination);
            const bell = (freq, start, length, volume) => {
                [[1, volume], [2, volume * 0.28], [3, volume * 0.08]].forEach(([mult, vol]) => {
                    const o = audioContext.createOscillator(), g = audioContext.createGain();
                    o.type = "sine"; o.frequency.setValueAtTime(freq * mult, start);
                    g.gain.setValueAtTime(0.0001, start);
                    g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
                    g.gain.exponentialRampToValueAtTime(0.0001, start + length / mult);
                    o.connect(g); g.connect(master);
                    o.start(start); o.stop(start + length / mult + 0.02);
                });
            };
            bell(1318.5, now, 0.55, 0.22);          // 叮
            bell(1046.5, now + 0.16, 0.85, 0.2);    // 咚
            return;
        }
        const o = audioContext.createOscillator(), g = audioContext.createGain();
        o.connect(g); g.connect(audioContext.destination);
        o.type = "triangle";
        o.frequency.setValueAtTime(240, now);
        o.frequency.linearRampToValueAtTime(150, now + 0.18);
        g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.13, now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        o.start(now); o.stop(now + 0.23);
    } catch (error) { /* 音效失敗不影響作答 */ }
}

$("exam-answer").addEventListener("focus", () => { state.activeInput = $("exam-answer"); });
$("exam-answer").addEventListener("input", examInputChanged);
setupScope();
