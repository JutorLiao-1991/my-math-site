(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IntegerAddSub = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const TYPES = [
    { id: 'pp_add', label: '正數＋正數', a: 1, b: 1, op: '+', example: '8 + 3' },
    { id: 'pn_add', label: '正數＋負數', a: 1, b: -1, op: '+', example: '8 + (−3)' },
    { id: 'np_add', label: '負數＋正數', a: -1, b: 1, op: '+', example: '−8 + 3' },
    { id: 'nn_add', label: '負數＋負數', a: -1, b: -1, op: '+', example: '−8 + (−3)' },
    { id: 'pp_sub', label: '正數－正數', a: 1, b: 1, op: '-', example: '8 − 3' },
    { id: 'pn_sub', label: '正數－負數', a: 1, b: -1, op: '-', example: '8 − (−3)' },
    { id: 'np_sub', label: '負數－正數', a: -1, b: 1, op: '-', example: '−8 − 3' },
    { id: 'nn_sub', label: '負數－負數', a: -1, b: -1, op: '-', example: '−8 − (−3)' }
  ];
  const EXAM_COUNT = 10, EXAM_MS = 10 * 60 * 1000;
  function validate(config) {
    if (!config || !['practice', 'exam', 'challenge'].includes(config.mode)) throw new Error('請選擇作答模式。');
    if (!Array.isArray(config.types) || !config.types.length || config.types.some(id => !TYPES.some(t => t.id === id))) throw new Error('請至少選擇一種題型。');
    for (const range of [config.aRange, config.bRange]) {
      if (!Array.isArray(range) || range.length !== 2 || range.some(n => !Number.isInteger(n) || n < 1 || n > 999) || range[0] > range[1]) throw new Error('絕對值範圍請填 1～999 的整數，且最小值不能大於最大值。');
    }
    if (![10, 20, 30].includes(config.target)) throw new Error('連對目標請選擇 10、20 或 30 題。');
    return { mode: config.mode, types: [...new Set(config.types)], aRange: [...config.aRange], bRange: [...config.bRange], target: config.target };
  }
  function shuffle(items, rng) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const signed = n => String(n).replace('-', '−');
  const format = q => `${signed(q.a)} ${q.op === '+' ? '+' : '−'} ${q.b < 0 ? `(${signed(q.b)})` : q.b}`;
  function parseAnswer(text) {
    const value = String(text).trim().replace(/−/g, '-');
    return /^[+-]?\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? (Number(value) || 0) : null;
  }
  function editBuffer(buffer, key, maxDigits = 4) {
    if (key === 'clear') return '';
    if (key === 'delete') return buffer.slice(0, -1);
    if (key === 'sign') return buffer.startsWith('-') ? buffer.slice(1) : '-' + buffer;
    if (!/^\d$/.test(key) || buffer.replace('-', '').length >= maxDigits) return buffer;
    return buffer + key;
  }
  class Generator {
    constructor(config, rng = Math.random) { this.config = validate(config); this.rng = rng; this.deck = []; this.previous = null; }
    next() {
      if (!this.deck.length) this.deck = shuffle(this.config.types, this.rng);
      const id = this.deck.pop(), type = TYPES.find(t => t.id === id);
      const pick = range => range[0] + Math.floor(this.rng() * (range[1] - range[0] + 1));
      let a = pick(this.config.aRange), b = pick(this.config.bRange);
      // Avoid an identical consecutive expression whenever the selected domain permits it.
      if (this.previous && this.previous.type === type.id && Math.abs(this.previous.a) === a && Math.abs(this.previous.b) === b) {
        const ar = this.config.aRange, br = this.config.bRange;
        if (br[0] < br[1]) b = b === br[1] ? br[0] : b + 1;
        else if (ar[0] < ar[1]) a = a === ar[1] ? ar[0] : a + 1;
      }
      a *= type.a; b *= type.b;
      const q = { type: type.id, label: type.label, a, b, op: type.op, answer: type.op === '+' ? a + b : a - b };
      this.previous = q;
      return q;
    }
  }
  class Session {
    constructor(config, rng = Math.random, now = Date.now) {
      this.config = validate(config); this.generator = new Generator(this.config, rng); this.now = now;
      this.startedAt = now(); this.deadline = this.startedAt + EXAM_MS;
      this.records = []; this.completed = 0; this.attempted = 0; this.firstCorrect = 0;
      this.streak = 0; this.bestStreak = 0; this.score = 0; this.ended = false;
      this.next();
    }
    next() {
      if (this.ended) return;
      if (this.current && !this.current.solved) return;
      this.current = { question: this.generator.next(), startedAt: this.now(), errors: 0, attempts: 0, firstAnswer: null, solved: false, correction: false };
    }
    remaining() { return Math.max(0, this.deadline - this.now()); }
    submit(text) {
      if (this.ended || this.current.solved) return { kind: 'ignored' };
      if (this.config.mode === 'exam' && !this.remaining()) { this.finish('timeout'); return { kind: 'finished' }; }
      const answer = parseAnswer(text);
      if (answer === null) return { kind: 'invalid' };
      const c = this.current, correct = answer === c.question.answer;
      if (!c.attempts) { this.attempted++; c.firstAnswer = answer; if (correct) this.firstCorrect++; }
      c.attempts++;
      if (!correct) {
        c.errors++; this.streak = 0;
        c.correction = this.config.mode !== 'exam';
        return { kind: 'wrong', answer: c.question.answer, reveal: c.correction, points: Math.max(0, 10 - c.errors) };
      }
      c.solved = true; this.completed++;
      if (this.config.mode === 'challenge' && !c.correction) { this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); }
      if (this.config.mode === 'exam') this.score += Math.max(0, 10 - c.errors);
      this.recordCurrent();
      const kind = c.correction ? 'corrected' : 'correct';
      if (this.config.mode === 'exam' && this.completed === EXAM_COUNT) this.finish('complete');
      else if (this.config.mode === 'challenge' && this.streak === this.config.target) this.finish('complete');
      return { kind, ended: this.ended, points: Math.max(0, 10 - c.errors) };
    }
    recordCurrent(at = this.now()) {
      const c = this.current;
      if (!c || c.recorded) return;
      this.records.push({ ...c.question, firstAnswer: c.firstAnswer, errors: c.errors, solved: c.solved, timeMs: Math.max(0, at - c.startedAt) });
      c.recorded = true;
    }
    finish(reason = 'manual') {
      if (this.ended) return;
      const expired = this.config.mode === 'exam' && !this.remaining();
      this.endedAt = expired ? this.deadline : this.now();
      if (this.current.attempts || this.config.mode === 'exam') this.recordCurrent(this.endedAt);
      this.ended = true; this.reason = expired ? 'timeout' : reason;
    }
    summary() {
      const elapsedMs = Math.max(0, (this.ended ? this.endedAt : this.now()) - this.startedAt);
      const solved = this.records.filter(q => q.solved);
      return { mode: this.config.mode, reason: this.reason, completed: this.completed, attempted: this.attempted, firstCorrect: this.firstCorrect,
        accuracy: this.attempted ? this.firstCorrect / this.attempted * 100 : null, score: this.score,
        elapsedMs, averageMs: solved.length ? solved.reduce((total, q) => total + q.timeMs, 0) / solved.length : null,
        bestStreak: this.bestStreak, streak: this.streak, target: this.config.target, records: [...this.records] };
    }
  }
  return { TYPES, EXAM_COUNT, EXAM_MS, validate, format, signed, parseAnswer, editBuffer, Generator, Session };
});
