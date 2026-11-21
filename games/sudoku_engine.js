/* 鳩特數獨・引擎
 * 盤面：長度 81 的陣列，0 代表空格。格子編號 i = 列 r × 9 + 行 c。
 * 包含：唯一解檢查、題目產生、種子碼與等價變換、像人一樣的解題技巧（提示與分級用）。
 */
(function (root) {
  'use strict';
  const ALL = 0x3fe; // 位元 1..9
  const bit = d => 1 << d;
  const popcount = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  const digitsOf = m => { const a = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) a.push(d); return a; };
  const rowOf = i => (i / 9) | 0, colOf = i => i % 9, boxOf = i => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0);

  /* 27 個單位：0–8 列、9–17 行、18–26 宮 */
  const UNITS = [];
  for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) { const r0 = ((b / 3) | 0) * 3, c0 = (b % 3) * 3; UNITS.push([0, 1, 2, 9, 10, 11, 18, 19, 20].map(k => (r0 + ((k / 9) | 0)) * 9 + c0 + (k % 9))); }
  const PEERS = Array.from({ length: 81 }, (_, i) => {
    const s = new Set([...UNITS[rowOf(i)], ...UNITS[9 + colOf(i)], ...UNITS[18 + boxOf(i)]]); s.delete(i); return [...s];
  });
  const UNIT_NAME = u => (u < 9 ? `第 ${u + 1} 列` : u < 18 ? `第 ${u - 8} 行` : `第 ${u - 17} 宮`);
  const UNIT_KIND = u => (u < 9 ? '列' : u < 18 ? '行' : '宮');
  const cellName = i => `第 ${rowOf(i) + 1} 列第 ${colOf(i) + 1} 行`;

  /* ---------- 亂數與種子碼 ---------- */
  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const B32 = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 去掉容易混淆的 0 O 1 I
  function encodeSeed(lv, n) { let s = ''; n = n >>> 0; for (let k = 0; k < 6; k++) { s = B32[n & 31] + s; n = Math.floor(n / 32); } return `${lv}-${s}`; }
  function decodeSeed(code) {
    const m = String(code || '').toUpperCase().replace(/[\s_]/g, '').match(/^([1-4])-?([2-9A-HJ-NP-Z]{6})$/);
    if (!m) return null;
    let n = 0; for (const ch of m[2]) n = n * 32 + B32.indexOf(ch);
    return { lv: Number(m[1]), n: n >>> 0 };
  }
  function randomSeed(lv, rng = Math.random) { return encodeSeed(lv, Math.floor(rng() * 1073741824)); }
  function dailySeed(lv, dateStr) { return encodeSeed(lv, hashStr(`jutor-sudoku-${dateStr}-${lv}`) % 1073741824); }

  /* 等價變換：數字互換、帶與帶互換、帶內列互換、柱與柱互換、柱內行互換、轉置。難度完全不變。 */
  function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function makeTransform(rng) {
    const digit = [0, ...shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)];
    const bands = shuffled([0, 1, 2], rng), stacks = shuffled([0, 1, 2], rng);
    const rows = [], cols = [];
    bands.forEach(b => shuffled([0, 1, 2], rng).forEach(k => rows.push(b * 3 + k)));
    stacks.forEach(s => shuffled([0, 1, 2], rng).forEach(k => cols.push(s * 3 + k)));
    return { digit, rows, cols, transpose: rng() < 0.5 };
  }
  function applyTransform(g, t) {
    const out = new Array(81);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      let sr = t.rows[r], sc = t.cols[c];
      if (t.transpose) [sr, sc] = [sc, sr];
      out[r * 9 + c] = t.digit[g[sr * 9 + sc]];
    }
    return out;
  }
  /* 由種子碼取出題目：題庫第幾題＋變換 */
  function puzzleFromSeed(code, bank) {
    const s = decodeSeed(code); if (!s) return null;
    const list = bank[s.lv]; if (!list || !list.length) return null;
    const rng = mulberry32(s.n ^ 0x9e3779b9);
    const idx = Math.floor(rng() * list.length);
    const base = parse(list[idx]);
    const t = makeTransform(rng);
    const puzzle = applyTransform(base, t);
    return { lv: s.lv, code: encodeSeed(s.lv, s.n), idx, puzzle, solution: solve(puzzle) };
  }

  const parse = s => Array.from(String(s), ch => (ch >= '1' && ch <= '9' ? +ch : 0)).concat(new Array(81).fill(0)).slice(0, 81);
  const format = g => g.map(v => v || '.').join('');

  /* ---------- 精確解題（位元回溯，最少候選優先） ---------- */
  function countSolutions(g0, limit = 2) {
    const g = g0.slice(), rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) if (g[i]) {
      const b = bit(g[i]), r = rowOf(i), c = colOf(i), x = boxOf(i);
      if ((rows[r] | cols[c] | boxes[x]) & b) return { count: 0, solution: null };
      rows[r] |= b; cols[c] |= b; boxes[x] |= b;
    }
    let count = 0, solution = null;
    (function rec() {
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) {
        const m = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]), n = popcount(m);
        if (n < bestN) { best = i; bestMask = m; bestN = n; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (!solution) solution = g.slice(); return; }
      if (!bestN) return;
      const r = rowOf(best), c = colOf(best), x = boxOf(best);
      for (let d = 1; d <= 9 && count < limit; d++) if (bestMask & bit(d)) {
        const b = bit(d); g[best] = d; rows[r] |= b; cols[c] |= b; boxes[x] |= b;
        rec();
        g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[x] &= ~b;
      }
    })();
    return { count, solution };
  }
  const solve = g => countSolutions(g, 1).solution;
  const isUnique = g => countSolutions(g, 2).count === 1;

  function fullGrid(rng) {
    const g = new Array(81).fill(0);
    (function fill(i) {
      if (i === 81) return true;
      const used = new Set(PEERS[i].map(p => g[p]));
      for (const d of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) if (!used.has(d)) { g[i] = d; if (fill(i + 1)) return true; }
      g[i] = 0; return false;
    })(0);
    return g;
  }
  /* 挖洞：成對對稱（180 度旋轉）地挖，保持唯一解；挖到 minGivens 為止 */
  function makePuzzle(rng, minGivens = 22) {
    const sol = fullGrid(rng), g = sol.slice();
    let givens = 81;
    for (const i of shuffled(Array.from({ length: 41 }, (_, k) => k), rng)) {
      const j = 80 - i, pair = i === j ? [i] : [i, j];
      if (givens - pair.length < minGivens) continue;
      const keep = pair.map(k => g[k]);
      pair.forEach(k => { g[k] = 0; });
      if (isUnique(g)) givens -= pair.length; else pair.forEach((k, n) => { g[k] = keep[n]; });
    }
    return { puzzle: g, solution: sol, givens };
  }

  /* ---------- 像人一樣的解題技巧 ---------- */
  function candidates(g) {
    const cand = new Array(81).fill(0);
    for (let i = 0; i < 81; i++) if (!g[i]) { let m = ALL; for (const p of PEERS[i]) if (g[p]) m &= ~bit(g[p]); cand[i] = m; }
    return cand;
  }
  /* 技巧等級：1 宮摒除；2 行列摒除、唯一餘數；3 區塊摒除、數對、三數組；4 X 翼、劍魚、XY 翼 */
  const TECH = {
    hiddenBox: { name: '宮摒除', level: 1 },
    hiddenLine: { name: '行列摒除', level: 2 },
    nakedSingle: { name: '唯一餘數', level: 2 },
    pointing: { name: '區塊摒除', level: 3 },
    claiming: { name: '區塊摒除', level: 3 },
    nakedPair: { name: '顯性數對', level: 3 },
    hiddenPair: { name: '隱性數對', level: 3 },
    nakedTriple: { name: '三數組', level: 3 },
    xWing: { name: 'X 翼', level: 4 },
    swordfish: { name: '劍魚', level: 4 },
    xyWing: { name: 'XY 翼', level: 4 }
  };

  function findHiddenSingle(g, cand, units) {
    for (const u of units) for (let d = 1; d <= 9; d++) {
      let spot = -1, n = 0, present = false;
      for (const i of UNITS[u]) { if (g[i] === d) { present = true; break; } if (!g[i] && cand[i] & bit(d)) { spot = i; n++; } }
      if (!present && n === 1) {
        /* 說明用：這個單位裡其他空格為什麼不能放 d（被哪一格擋住） */
        const blockers = [];
        for (const i of UNITS[u]) if (!g[i] && i !== spot) {
          const by = PEERS[i].find(p => g[p] === d);
          if (by !== undefined && !blockers.includes(by)) blockers.push(by);
        }
        const free = UNITS[u].filter(i => !g[i] && i !== spot && !PEERS[i].some(p => g[p] === d)).length;
        const why = !free ? `其他空格都被已經填好的 ${d} 擋住了（同列、同行、同宮不能重複）`
          : blockers.length ? `其他空格有的被已經填好的 ${d} 擋住，有的在前面的推理中已經刪掉 ${d}` : `其他空格在前面的推理中都已經刪掉 ${d}`;
        return { tech: u >= 18 ? 'hiddenBox' : 'hiddenLine', place: { i: spot, d }, unit: u, refs: blockers, cells: UNITS[u],
          text: `看${UNIT_NAME(u)}：數字 ${d} 還沒出現。${why}，所以 ${d} 只能放在${cellName(spot)}。` };
      }
    }
    return null;
  }
  function findNakedSingle(g, cand) {
    for (let i = 0; i < 81; i++) if (!g[i] && popcount(cand[i]) === 1) {
      const d = digitsOf(cand[i])[0];
      const seen = [...new Set(PEERS[i].filter(p => g[p]).map(p => g[p]))].sort((a, b) => a - b);
      const refs = []; const got = new Set();
      for (const p of PEERS[i]) if (g[p] && !got.has(g[p])) { got.add(g[p]); refs.push(p); }
      return { tech: 'nakedSingle', place: { i, d }, unit: 18 + boxOf(i), refs, cells: [...UNITS[rowOf(i)], ...UNITS[9 + colOf(i)], ...UNITS[18 + boxOf(i)]],
        text: seen.length === 8
          ? `看${cellName(i)}：它所在的列、行、宮已經出現 ${seen.join('、')}，1～9 只剩 ${d} 沒出現，所以這格是 ${d}。`
          : `看${cellName(i)}：同列、同行、同宮已經排除了其他數字（含前面推理刪掉的候選數），這格只剩 ${d} 能填。` };
    }
    return null;
  }
  function elimResult(cand, elims) { return elims.filter(({ i, d }) => cand[i] & bit(d)); }
  function findPointing(g, cand) {
    for (let b = 0; b < 9; b++) for (let d = 1; d <= 9; d++) {
      const spots = UNITS[18 + b].filter(i => !g[i] && cand[i] & bit(d));
      if (spots.length < 2 || spots.length > 3) continue;
      for (const [kind, key, unitBase] of [['列', rowOf, 0], ['行', colOf, 9]]) {
        const k = key(spots[0]);
        if (!spots.every(i => key(i) === k)) continue;
        const u = unitBase + k;
        const elims = elimResult(cand, UNITS[u].filter(i => !g[i] && boxOf(i) !== b).map(i => ({ i, d })));
        if (elims.length) return { tech: 'pointing', elims, unit: 18 + b, refs: spots, cells: [...UNITS[18 + b], ...UNITS[u]],
          text: `看第 ${b + 1} 宮：這一宮的 ${d} 只可能出現在${UNIT_NAME(u)}的格子裡。不管最後在哪一格，${UNIT_NAME(u)}的 ${d} 都會落在這一宮，所以${UNIT_NAME(u)}在其他宮的格子都不能再放 ${d}。` };
      }
    }
    return null;
  }
  function findClaiming(g, cand) {
    for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
      const spots = UNITS[u].filter(i => !g[i] && cand[i] & bit(d));
      if (spots.length < 2 || spots.length > 3) continue;
      const b = boxOf(spots[0]);
      if (!spots.every(i => boxOf(i) === b)) continue;
      const elims = elimResult(cand, UNITS[18 + b].filter(i => !g[i] && !UNITS[u].includes(i)).map(i => ({ i, d })));
      if (elims.length) return { tech: 'claiming', elims, unit: u, refs: spots, cells: [...UNITS[u], ...UNITS[18 + b]],
        text: `看${UNIT_NAME(u)}：這一${UNIT_KIND(u)}的 ${d} 只可能出現在第 ${b + 1} 宮裡。所以第 ${b + 1} 宮的 ${d} 一定在這一${UNIT_KIND(u)}上，第 ${b + 1} 宮的其他格子都不能再放 ${d}。` };
    }
    return null;
  }
  function combos(arr, k) { const out = []; (function rec(s, cur) { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = s; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } })(0, []); return out; }
  function findNakedSubset(g, cand, k) {
    for (let u = 0; u < 27; u++) {
      const empty = UNITS[u].filter(i => !g[i]);
      if (empty.length <= k) continue;
      for (const set of combos(empty.filter(i => popcount(cand[i]) <= k), k)) {
        const m = set.reduce((a, i) => a | cand[i], 0);
        if (popcount(m) !== k) continue;
        const ds = digitsOf(m);
        const elims = elimResult(cand, empty.filter(i => !set.includes(i)).flatMap(i => ds.map(d => ({ i, d }))));
        if (elims.length) return { tech: k === 2 ? 'nakedPair' : 'nakedTriple', elims, unit: u, refs: set, cells: UNITS[u],
          text: `看${UNIT_NAME(u)}：有 ${k} 個格子的候選數合起來只有 ${ds.join('、')} 這 ${k} 個數字。這 ${k} 個數字一定會用掉這 ${k} 格，所以${UNIT_NAME(u)}的其他格子都不能再放 ${ds.join('、')}。` };
      }
    }
    return null;
  }
  function findHiddenPair(g, cand) {
    for (let u = 0; u < 27; u++) {
      const where = {};
      for (let d = 1; d <= 9; d++) { if (UNITS[u].some(i => g[i] === d)) continue; where[d] = UNITS[u].filter(i => !g[i] && cand[i] & bit(d)); }
      const ds = Object.keys(where).map(Number).filter(d => where[d].length === 2);
      for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++) {
        const A = where[ds[a]], B = where[ds[b]];
        if (A[0] !== B[0] || A[1] !== B[1]) continue;
        const keep = bit(ds[a]) | bit(ds[b]);
        const elims = elimResult(cand, A.flatMap(i => digitsOf(cand[i] & ~keep).map(d => ({ i, d }))));
        if (elims.length) return { tech: 'hiddenPair', elims, unit: u, refs: A, cells: UNITS[u],
          text: `看${UNIT_NAME(u)}：數字 ${ds[a]} 和 ${ds[b]} 都只能放在同樣的兩格。這兩格一定被 ${ds[a]}、${ds[b]} 占走，所以這兩格的其他候選數都可以刪掉。` };
      }
    }
    return null;
  }
  function findFish(g, cand, size) {
    for (const byRow of [true, false]) for (let d = 1; d <= 9; d++) {
      const lines = [];
      for (let l = 0; l < 9; l++) {
        const u = byRow ? l : 9 + l;
        if (UNITS[u].some(i => g[i] === d)) continue;
        const pos = UNITS[u].filter(i => !g[i] && cand[i] & bit(d)).map(i => (byRow ? colOf(i) : rowOf(i)));
        if (pos.length >= 2 && pos.length <= size) lines.push({ l, pos });
      }
      for (const set of combos(lines, size)) {
        const cover = [...new Set(set.flatMap(x => x.pos))];
        if (cover.length !== size) continue;
        const ls = set.map(x => x.l);
        const elims = [];
        for (const c of cover) for (let l = 0; l < 9; l++) if (!ls.includes(l)) {
          const i = byRow ? l * 9 + c : c * 9 + l;
          if (!g[i] && cand[i] & bit(d)) elims.push({ i, d });
        }
        if (!elims.length) continue;
        const refs = set.flatMap(x => x.pos.map(p => (byRow ? x.l * 9 + p : p * 9 + x.l)));
        const L = byRow ? '列' : '行', C = byRow ? '行' : '列';
        const lsN = ls.map(x => x + 1).join('、'), csN = cover.sort((a, b) => a - b).map(x => x + 1).join('、');
        return { tech: size === 2 ? 'xWing' : 'swordfish', elims, unit: byRow ? ls[0] : 9 + ls[0], refs, cells: refs,
          text: `看數字 ${d}：在第 ${lsN} ${L}，${d} 都只能放在第 ${csN} ${C}。這 ${size} ${L}各需要一個 ${d}，剛好會占滿第 ${csN} ${C}，所以這幾${C}的其他格子都不能再放 ${d}。` };
      }
    }
    return null;
  }
  function findXYWing(g, cand) {
    const bi = []; for (let i = 0; i < 81; i++) if (!g[i] && popcount(cand[i]) === 2) bi.push(i);
    for (const p of bi) {
      const [x, y] = digitsOf(cand[p]);
      const wings = bi.filter(q => q !== p && PEERS[p].includes(q));
      for (const a of wings) for (const b of wings) {
        if (a >= b) continue;
        const ma = cand[a], mb = cand[b];
        const za = ma & ~cand[p], zb = mb & ~cand[p];
        if (popcount(za) !== 1 || za !== zb) continue;
        if (!((ma & bit(x) && mb & bit(y)) || (ma & bit(y) && mb & bit(x)))) continue;
        const z = digitsOf(za)[0];
        const elims = elimResult(cand, PEERS[a].filter(i => i !== b && i !== p && PEERS[b].includes(i) && !g[i]).map(i => ({ i, d: z })));
        if (elims.length) return { tech: 'xyWing', elims, unit: 18 + boxOf(p), refs: [p, a, b], cells: [p, a, b],
          text: `看三格：${cellName(p)}只能是 ${x} 或 ${y}。如果它是 ${x}，另一格就會被逼成 ${z}；如果它是 ${y}，第三格也會被逼成 ${z}。不管哪種情況總有一格是 ${z}，所以同時看得到這兩格的格子都不能放 ${z}。` };
      }
    }
    return null;
  }
  const FINDERS = [
    (g, c) => findHiddenSingle(g, c, [18, 19, 20, 21, 22, 23, 24, 25, 26]),
    (g, c) => findHiddenSingle(g, c, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]),
    findNakedSingle, findPointing, findClaiming,
    (g, c) => findNakedSubset(g, c, 2), findHiddenPair, (g, c) => findNakedSubset(g, c, 3),
    (g, c) => findFish(g, c, 2), (g, c) => findFish(g, c, 3), findXYWing
  ];
  function nextStep(g, cand) {
    for (const f of FINDERS) { const s = f(g, cand); if (s) { s.name = TECH[s.tech].name; s.level = TECH[s.tech].level; return s; } }
    return null;
  }
  function applyStep(g, cand, s) {
    if (s.place) {
      const { i, d } = s.place; g[i] = d; cand[i] = 0;
      for (const p of PEERS[i]) cand[p] &= ~bit(d);
    } else s.elims.forEach(({ i, d }) => { cand[i] &= ~bit(d); });
  }
  /* 分級：從題目一步一步用技巧解，回傳用到的最難技巧 */
  function grade(puzzle) {
    const g = puzzle.slice(), cand = candidates(g), used = {};
    let maxLevel = 0, steps = 0;
    while (g.includes(0)) {
      const s = nextStep(g, cand);
      if (!s) return { solved: false, maxLevel: 9, used, steps };
      used[s.tech] = (used[s.tech] || 0) + 1; maxLevel = Math.max(maxLevel, s.level); steps++;
      applyStep(g, cand, s);
    }
    return { solved: true, maxLevel, used, steps };
  }
  /* 提示：從目前盤面（只看已填數字）找下一個能確定的格子；需要先刪候選數時，連同前置步驟一起回傳 */
  function hint(grid) {
    const g = grid.slice(), cand = candidates(g), pre = [];
    for (let k = 0; k < 200 && g.includes(0); k++) {
      const s = nextStep(g, cand);
      if (!s) return { pre, step: null };
      if (s.place) return { pre, step: s };
      pre.push(s); applyStep(g, cand, s);
    }
    return { pre, step: null };
  }
  function conflicts(g) {
    const bad = new Set();
    for (let i = 0; i < 81; i++) if (g[i]) for (const p of PEERS[i]) if (g[p] === g[i]) { bad.add(i); bad.add(p); }
    return bad;
  }

  const SDK = { ALL, bit, popcount, digitsOf, rowOf, colOf, boxOf, UNITS, PEERS, UNIT_NAME, cellName, TECH,
    mulberry32, hashStr, encodeSeed, decodeSeed, randomSeed, dailySeed, makeTransform, applyTransform, puzzleFromSeed,
    parse, format, countSolutions, solve, isUnique, fullGrid, makePuzzle, candidates, nextStep, applyStep, grade, hint, conflicts };
  if (typeof module !== 'undefined' && module.exports) module.exports = SDK; else root.SDK = SDK;
})(typeof window !== 'undefined' ? window : globalThis);
