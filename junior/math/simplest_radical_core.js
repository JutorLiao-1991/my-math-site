/* Exact integer arithmetic for the two simplest-radical challenge games. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RadicalChallenge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMITS = Object.freeze({ basic: 50, mastery: 100 });
  function shuffle(values, random = Math.random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function simplify(n) {
    if (!Number.isInteger(n) || n < 1 || n > 100) throw new RangeError('Radicand must be an integer from 1 to 100.');
    for (let a = Math.floor(Math.sqrt(n)); a >= 1; a--) {
      if (n % (a * a) === 0) return { a, b: n / (a * a) };
    }
  }
  function form(a, b, keepRoot = false) {
    const integer = b === 1 && !keepRoot;
    const text = integer ? String(a) : `${a === 1 ? '' : a}√${b}`;
    const label = integer ? String(a) : `${a === 1 ? '' : a + ' 乘以'}根號 ${b}`;
    const content = integer ? String(a) : `${a === 1 ? '' : a}<span class="radical" aria-hidden="true"><span class="root-symbol">√</span><span class="radicand">${b}</span></span>`;
    return { a, b, integer, value: integer ? `int:${a}` : `rad:${a}:${b}`, text,
      html: `<span class="math-expression" role="math" aria-label="${label}">${content}</span>` };
  }
  function questionHTML(n) { return form(1, n, true).html; }
  function explanation(n) {
    const { a, b } = simplify(n);
    const original = questionHTML(n), answer = form(a, b).html;
    if (b === 1) return `${original} ＝ ${answer}，可化成整數，不能保留根號。`;
    if (a === 1) return `${original} 已是最簡根式：根號內沒有大於 1 的完全平方因數。`;
    return `${original} ＝ ${questionHTML(a * a)} × ${questionHTML(b)} ＝ ${answer}`;
  }
  function buildQuestion(n, play = 'simplify', random = Math.random) {
    if (!['judge', 'simplify'].includes(play)) throw new RangeError('Unknown game.');
    const { a, b } = simplify(n);
    const kind = b === 1 ? 'square' : a === 1 ? 'simple' : 'reducible';
    if (play === 'judge') {
      return { n, kind, answer: kind === 'simple' ? 'yes' : 'no', html: questionHTML(n),
        explanation: explanation(n), options: [
          { value: 'yes', text: '是，已經最簡', html: '是，已經最簡' },
          { value: 'no', text: '否，還能化簡', html: '否，還能化簡' }
        ] };
    }
    const correct = form(a, b), candidates = new Map();
    function add(option) { if (option.value !== correct.value) candidates.set(option.value, option); }
    // Retain equivalent-but-unfinished forms where possible; equality alone is insufficient.
    add(form(1, n, true));
    for (let d = 2; d < a; d++) if (n % (d * d) === 0) add(form(d, n / (d * d)));
    add(form(a + 1, b));
    if (a > 1) add(form(1, b));
    add(form(a * 2, b));
    add(form(a, b + 1));
    add(form(a + 2, b));
    add(form(a, b + 2));
    const preferred = [...candidates.values()].slice(0, 3);
    return { n, kind, answer: correct.value, html: questionHTML(n), explanation: explanation(n),
      options: shuffle([correct, ...preferred], random) };
  }
  function generateRound(play = 'simplify', difficulty = 'basic', random = Math.random) {
    const limit = LIMITS[difficulty];
    if (!limit) throw new RangeError('Unknown difficulty.');
    if (!['judge', 'simplify'].includes(play)) throw new RangeError('Unknown game.');
    const groups = { square: [], simple: [], reducible: [] };
    for (let n = 1; n <= limit; n++) {
      const { a, b } = simplify(n);
      groups[b === 1 ? 'square' : a === 1 ? 'simple' : 'reducible'].push(n);
    }
    // Judgment: exactly 10 yes and 10 no. Simplification: 4 squares, 8 reducible, 8 simple.
    const chosen = play === 'judge'
      ? [...shuffle(groups.simple, random).slice(0, 10), ...shuffle([...groups.square, ...groups.reducible], random).slice(0, 10)]
      : [...shuffle(groups.square, random).slice(0, 4), ...shuffle(groups.reducible, random).slice(0, 8), ...shuffle(groups.simple, random).slice(0, 8)];
    return shuffle(chosen, random).map(n => buildQuestion(n, play, random));
  }
  return Object.freeze({ LIMITS, shuffle, simplify, form, questionHTML, explanation, buildQuestion, generateRound });
});
