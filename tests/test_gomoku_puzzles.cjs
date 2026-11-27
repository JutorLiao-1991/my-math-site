const assert = require('node:assert/strict');
const E = require('../games/gomoku_engine.js');
const T = require('../games/gomoku_tactics.js');
const PZ = require('../games/gomoku_puzzles.js');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('ok ' + name); }
const S = 15;
const mk = d => { const pos = new E.Pos(S, 1, {}); d[1].forEach(p => pos.place(p, 1)); d[2].forEach(p => pos.place(p, 2)); return pos; };
const mkp = (b, w) => { const pos = new E.Pos(S, 1, {}); b.forEach(([x, y]) => pos.place(y * S + x, 1)); w.forEach(([x, y]) => pos.place(y * S + x, 2)); return pos; };

test('solver: four, forced block, open four and double four', () => {
  // 黑 4 連（一端被擋）：一手取勝
  let pos = mkp([[3, 7], [4, 7], [5, 7], [6, 7]], [[2, 7]]);
  assert.equal(T.shortest(pos, 1, 3), 1);
  // 活三延長成活四：黑下兩子、白一手，共 3 手
  pos = mkp([[4, 7], [5, 7], [6, 7]], [[1, 1]]);
  assert.equal(T.shortest(pos, 1, 3), 2);
  // 死三（兩端都被擋）沒有殺法
  pos = mkp([[4, 7], [5, 7], [6, 7]], [[3, 7], [7, 7]]);
  assert.equal(T.shortest(pos, 1, 3), 0);
  // 四四：兩條同時變成四
  pos = mkp([[5, 7], [6, 7], [7, 7], [8, 4], [8, 5], [8, 6]], [[4, 7], [8, 3], [1, 1]]);
  const fm = T.winningMoves(pos, 1, 2);
  assert.ok(fm.includes(7 * S + 8), '(8,7) 同時做出兩個四');
});

test('judge: only fours on a winning line are accepted, and the reply is the forced block', () => {
  const pos = mkp([[4, 7], [5, 7], [6, 7]], [[1, 1]]);
  assert.equal(T.judge(pos, 1, 12 * S + 12, 2).ok, false, '不是四的棋不算');
  assert.equal(T.judge(pos, 1, 7 * S + 8, 2).ok, false, '(8,7) 只做出跳三，不是四');
  const right = T.judge(pos, 1, 7 * S + 3, 2);   // (3,7) 做出兩端都空的活四
  assert.ok(right.ok && !right.win);
  assert.ok([7 * S + 2, 7 * S + 7].includes(right.reply));
  assert.equal(T.judge(pos, 1, 7 * S + 3, 1).ok, false, '只剩 1 手時不能做活四');
  const four = mkp([[3, 7], [4, 7], [5, 7], [6, 7]], [[2, 7]]);
  const five = T.judge(four, 1, 7 * S + 7, 1);
  assert.ok(five.ok && five.win);
});

test('puzzle bank has 100 per length, with unique solutions of exactly the stated length', () => {
  for (const [plies, k] of [[3, 2], [5, 3], [7, 4]]) {
    const list = PZ[plies]; assert.equal(list.length, 100);
    list.forEach((d, i) => {
      const pos = mk(d), c = d[0], o = 3 - c;
      assert.ok(c === 1 || c === 2);
      assert.equal(pos.winCells(1).length + pos.winCells(2).length, 0, `${plies}手 第${i + 1}題 雙方都不能已經有四`);
      assert.equal(pos.hist.length, d[1].length + d[2].length);
      assert.ok(Math.abs(d[1].length - d[2].length) <= 1 + 8, '黑白棋子數要合理');
      assert.equal(T.shortest(pos, c, k), k, `${plies}手 第${i + 1}題 最短殺法要正好 ${k} 手（攻方）`);
      const w = T.winningMoves(pos, c, k);
      assert.deepEqual(w, [d[3]], `${plies}手 第${i + 1}題 第一手要唯一`);
      assert.equal(pos.b[d[3]], 0);
    });
  }
});

test('every puzzle can be played to the end through judge(), whichever reply the defender is forced into', () => {
  for (const plies of [3, 5, 7]) PZ[plies].forEach((d, i) => {
    const pos = mk(d), c = d[0]; let left = (plies + 1) / 2, m = d[3], steps = 0;
    for (;;) {
      const r = T.judge(pos, c, m, left); assert.ok(r.ok, `${plies}手 第${i + 1}題 第${steps + 1}步`);
      pos.place(m, c); steps++;
      if (r.win) { assert.ok(pos.won(c)); break; }
      pos.place(r.reply, 3 - c); left--;
      assert.ok(left >= 1);
      const nxt = T.winningMoves(pos, c, left); assert.ok(nxt.length, '守方應手後攻方仍有殺法');
      m = nxt[0];
    }
    assert.ok(steps <= (plies + 1) / 2, '攻方步數不超過手數');
  });
});

test('puzzles are distinct up to rotation and reflection and obey the stone-count window', () => {
  const sym = [(x, y) => [x, y], (x, y) => [S - 1 - x, y], (x, y) => [x, S - 1 - y], (x, y) => [S - 1 - x, S - 1 - y], (x, y) => [y, x], (x, y) => [S - 1 - y, x], (x, y) => [y, S - 1 - x], (x, y) => [S - 1 - y, S - 1 - x]];
  const seen = new Set();
  for (const plies of [3, 5, 7]) for (const d of PZ[plies]) {
    const n = d[1].length + d[2].length; assert.ok(n >= 16 && n <= 48);
    let best = null;
    for (const f of sym) { const m = a => a.map(p => { const [x, y] = f(p % S, (p / S) | 0); return y * S + x; }).sort((u, v) => u - v).join(','); const key = m(d[1]) + '|' + m(d[2]) + '|' + d[0]; if (best === null || key < best) best = key; }
    assert.ok(!seen.has(best), '重複題'); seen.add(best);
  }
});

console.log(tests + ' Gomoku puzzle checks passed');
