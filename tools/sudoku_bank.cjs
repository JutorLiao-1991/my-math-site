/* 產生鳩特數獨題庫：node tools/sudoku_bank.cjs
 * 每一級都用引擎的「人類解法」驗證：只靠該級以內的技巧就能解完，保證不用猜。
 * 輸出 games/sudoku_bank.js（題庫＋新手教學關卡）。
 */
'use strict';
const fs = require('fs'), path = require('path');
const S = require('../games/sudoku_engine.js');
const PER_LEVEL = 200;
const rng = S.mulberry32(20261121);
const bank = { 1: [], 2: [], 3: [], 4: [] };
const seen = new Set();
const givensOf = g => g.filter(Boolean).length;
const only = (used, ok) => Object.keys(used).every(k => ok.includes(k));

function levelOf(p, gr) {
  const n = givensOf(p);
  if (!gr.solved) return 0;
  if (gr.maxLevel <= 2 && n >= 36 && n <= 40 && only(gr.used, ['hiddenBox', 'hiddenLine'])) return 1;
  if (gr.maxLevel <= 2 && n <= 32 && gr.used.nakedSingle) return 2;
  if (gr.maxLevel === 3 && n <= 30) return 3;
  if (gr.maxLevel === 4 && n <= 30) return 4;
  return 0;
}
let tries = 0;
const t0 = Date.now();
while (Object.values(bank).some(l => l.length < PER_LEVEL)) {
  tries++;
  const needEasy = bank[1].length < PER_LEVEL && tries % 3 === 0;
  const { puzzle } = S.makePuzzle(rng, needEasy ? 36 + Math.floor(rng() * 3) : 22);
  const key = S.format(puzzle);
  if (seen.has(key)) continue;
  const lv = levelOf(puzzle, S.grade(puzzle));
  if (!lv || bank[lv].length >= PER_LEVEL) continue;
  seen.add(key); bank[lv].push(key.replace(/\./g, '0'));
}
console.error(`題庫完成：嘗試 ${tries} 題，用時 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);

/* ---------- 新手教學關卡：從題庫裡找出「只能用這個技巧」的局面 ---------- */
const tutorial = [];
const statesOf = function* (p) {
  const g = S.parse(p), cand = S.candidates(g);
  while (g.includes(0)) { yield { g: g.slice(), cand: cand.slice() }; const s = S.nextStep(g, cand); if (!s) return; S.applyStep(g, cand, s); }
};
const singlesAt = (g, cand, i) => {
  const out = new Set();
  for (const u of [S.rowOf(i), 9 + S.colOf(i), 18 + S.boxOf(i)]) {
    const d = g[i] ? 0 : null;
    for (let dd = 1; dd <= 9; dd++) {
      if (S.UNITS[u].some(k => g[k] === dd)) continue;
      const spots = S.UNITS[u].filter(k => !g[k] && cand[k] & S.bit(dd));
      if (spots.length === 1 && spots[0] === i) out.add(u >= 18 ? 'box' : 'line');
    }
  }
  if (S.popcount(cand[i]) === 1) out.add('naked');
  return out;
};
function pick(level, test) {
  for (const p of bank[level]) for (const st of statesOf(p)) { const r = test(st.g, st.cand); if (r) return { grid: S.format(st.g).replace(/\./g, '0'), ...r }; }
  throw new Error('找不到教學局面');
}
/* 第 1 課：規則——一列只差一格 */
{
  const sol = S.solve(S.parse(bank[1][0]));
  const g = sol.slice(); const holes = [3, 12, 40, 41, 52, 66, 77]; holes.forEach(i => { g[i] = 0; });
  tutorial.push({ key: 'rule', grid: S.format(g).replace(/\./g, '0'), target: { i: 3, d: sol[3] } });
}
/* 第 2 課：宮摒除（至少被 2 個數字擋住，宮內至少 4 個空格，而且不是唯一餘數） */
tutorial.push({ key: 'hiddenBox', ...pick(1, (g, cand) => {
  for (let b = 18; b < 27; b++) {
    const s = S.nextStep(g, cand);
    if (s && s.tech === 'hiddenBox' && s.refs.length >= 2 && S.UNITS[s.unit].filter(i => !g[i]).length >= 4 && S.popcount(cand[s.place.i]) > 1)
      return { target: s.place, unit: s.unit, refs: s.refs, text: s.text };
  }
  return null;
}) });
/* 第 3 課：行列摒除（那一格不是宮摒除、也不是唯一餘數才算數） */
tutorial.push({ key: 'hiddenLine', ...pick(2, (g, cand) => {
  for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
    if (S.UNITS[u].some(k => g[k] === d)) continue;
    const spots = S.UNITS[u].filter(k => !g[k] && cand[k] & S.bit(d));
    if (spots.length !== 1) continue;
    const i = spots[0], why = singlesAt(g, cand, i);
    const empties = S.UNITS[u].filter(k => !g[k]).length;
    if (!why.has('box') && !why.has('naked') && empties >= 3) {
      const refs = []; for (const k of S.UNITS[u]) if (!g[k] && k !== i) { const by = S.PEERS[k].find(p => g[p] === d); if (by !== undefined && !refs.includes(by)) refs.push(by); }
      if (refs.length >= 2 && refs.length <= 4) return { target: { i, d }, unit: u, refs };
    }
  }
  return null;
}) });
/* 第 4 課：唯一餘數（那一格在任何單位都不是摒除得到的） */
tutorial.push({ key: 'nakedSingle', ...pick(2, (g, cand) => {
  for (let i = 0; i < 81; i++) if (!g[i] && S.popcount(cand[i]) === 1) {
    const why = singlesAt(g, cand, i);
    const seen = new Set(S.PEERS[i].filter(p => g[p]).map(p => g[p]));
    if (!why.has('box') && !why.has('line') && seen.size === 8) {
      const refs = []; const got = new Set(); for (const p of S.PEERS[i]) if (g[p] && !got.has(g[p])) { got.add(g[p]); refs.push(p); }
      return { target: { i, d: S.digitsOf(cand[i])[0] }, unit: 18 + S.boxOf(i), refs };
    }
  }
  return null;
}) });
/* 第 5、6 課：區塊摒除、數對——先刪候選數，再得到一個確定的格子 */
for (const [key, techs, lv] of [['pointing', ['pointing', 'claiming'], 3], ['nakedPair', ['nakedPair'], 3]]) {
  tutorial.push({ key, ...pick(lv, g => {
    const h = S.hint(g);
    if (h.pre.length !== 1 || !h.step || !techs.includes(h.pre[0].tech)) return null;
    const e = h.pre[0];
    /* 確定的那一格要和刪掉的候選數有關，才有教學意義 */
    if (!e.elims.some(x => x.i === h.step.place.i || S.UNITS[h.step.unit].includes(x.i))) return null;
    return { elim: { tech: e.tech, unit: e.unit, refs: e.refs, elims: e.elims, text: e.text }, target: h.step.place, unit: h.step.unit, refs: h.step.refs, tech: h.step.tech, text: h.step.text };
  }) });
}
/* 第 7 課：實戰——幼年題一題 */
tutorial.push({ key: 'practice', grid: bank[1][1] });

const out = `/* 鳩特數獨題庫（由 tools/sudoku_bank.cjs 產生，請勿手動修改）
 * 1 幼年鳩特：只靠摒除法、提示數 36～40
 * 2 青年鳩特：摒除法＋唯一餘數
 * 3 成年鳩特：需要區塊摒除、數對或三數組
 * 4 大師鳩特：需要 X 翼、劍魚或 XY 翼
 * 每題都經過驗證：唯一解，而且只靠技巧就能解完（不用猜）。
 */
(function (root) {
  const SUDOKU_BANK = ${JSON.stringify(bank)};
  const SUDOKU_TUTORIAL = ${JSON.stringify(tutorial)};
  if (typeof module !== 'undefined' && module.exports) module.exports = { SUDOKU_BANK, SUDOKU_TUTORIAL };
  else { root.SUDOKU_BANK = SUDOKU_BANK; root.SUDOKU_TUTORIAL = SUDOKU_TUTORIAL; }
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(__dirname, '..', 'games', 'sudoku_bank.js'), out);
console.error('教學關卡：', tutorial.map(t => t.key).join('、'));
