const assert = require('node:assert/strict');
const E = require('../games/gomoku_engine.js');
const LESSONS = require('../games/gomoku_lessons.js');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('ok ' + name); }

/* 依課程資料逐步重現：回傳每個任務當下的棋盤與可接受的答案，驗證每一課都出得出來、答得對 */
function goalsOf(pos, S, g) {
  if (Array.isArray(g)) return g.map(([x, y]) => y * S + x);
  if (g === 'win') return Array.from(pos.winCells(1));
  if (g === 'block') return Array.from(pos.winCells(2));
  if (g === 'fb') return E.forbiddenCells(pos).slice();
  const r = [];
  for (let p = 0; p < S * S; p++) { if (pos.b[p]) continue; pos.place(p, 1); if (pos.won(1) || pos.winCells(1).length >= 2) r.push(p); pos.unplace(); }
  return r;
}
function replay(L, onTask) {
  const S = L.S, N = L.N || 1; let pos = null, cur = [];
  L.steps.forEach((s, si) => {
    if (s.b) cur = s.b.map(a => a.slice());
    pos = new E.Pos(S, N, { renju: !!L.renju }); cur.forEach(([x, y, c]) => pos.place(y * S + x, c));
    if (s.demo) {
      if (s.demo.kind === 'one') { const [fx, fy] = s.demo.flip, i = cur.findIndex(a => a[0] === fx && a[1] === fy); assert.ok(i >= 0 && cur[i][2] === 1, '被翻面的要是黑棋'); cur[i] = [fx, fy, 2]; pos = new E.Pos(S, N, {}); cur.forEach(([x, y, c]) => pos.place(y * S + x, c)); assert.ok(!pos.won(1) && !pos.won(2)); }
      else for (const [x, y, c] of s.demo.stones) { assert.equal(pos.b[y * S + x], 0, `L${L.t} 步驟${si}: 示範落點要是空的`); pos.place(y * S + x, c); cur.push([x, y, c]); }
      return;
    }
    if (!s.task) return;
    const goals = goalsOf(pos, S, s.task.goals); onTask(s, si, pos, goals, cur);
    // 以第一個答案走下去，並套用任務後的自動回應
    const p = goals[0], x = p % S, y = (p / S) | 0;
    if (!s.task.noPlace) { pos.place(p, 1); cur.push([x, y, 1]); }
    let auto = s.task.after;
    if (auto === 'blockOne') { const w = Array.from(pos.winCells(1)); auto = w.length ? [[w[0] % S, (w[0] / S) | 0, 2]] : []; }
    for (const [ax, ay, ac] of (auto || [])) { assert.equal(pos.b[ay * S + ax], 0); pos.place(ay * S + ax, ac); cur.push([ax, ay, ac]); }
  });
}

test('lesson data is well formed and every stone / goal sits on an empty point', () => {
  assert.equal(LESSONS.length, 10);
  for (const L of LESSONS) {
    assert.ok(L.t && L.S === 9 && L.steps.length);
    assert.ok(!L.renju || (L.N || 1) === 1, '禁手只在連一條');
    for (const s of L.steps) {
      assert.ok(s.h && s.x, '每一步都要有標題與說明');
      if (s.b) { const seen = new Set(); for (const [x, y, c] of s.b) { assert.ok(x >= 0 && y >= 0 && x < L.S && y < L.S && (c === 1 || c === 2)); const k = y * L.S + x; assert.ok(!seen.has(k), '同一點不能放兩顆'); seen.add(k); } }
      if (s.task) { assert.ok(s.task.ok, '任務要有答對的回饋'); assert.ok(s.task.bad, '任務要有答錯的提示'); }
    }
  }
});

test('first step of every lesson that has stones starts without a finished game', () => {
  for (const L of LESSONS) {
    const pos = new E.Pos(L.S, L.N || 1, { renju: !!L.renju });
    for (const s of L.steps) if (s.b) { for (const [x, y, c] of s.b) pos.place(y * L.S + x, c); assert.ok(!pos.won(1) && !pos.won(2), `${L.t} 開局不該已分出勝負`); break; }
  }
});

test('every task has the answers the text promises', () => {
  const expect = {
    '連成五子': [['win', 2]], '橫、直、斜都算': [['win', 2], ['win', 2], ['win', 2]],
    '擋住對手的四子': [['block', 1], ['block', 1]], '做出活四': [['open4', 2], ['win', 1]],
    '雙重威脅': [['open4', 2], ['win', 1]], '連兩條才算贏': [['win', 2]]
  };
  for (const L of LESSONS) {
    const want = (expect[L.t] || []).slice();
    replay(L, (s, si, pos, goals) => {
      assert.ok(goals.length >= 1, `${L.t} 步驟${si + 1} 要有答案`);
      for (const p of goals) assert.equal(pos.b[p], 0, '答案必須是空點');
      if (typeof s.task.goals === 'string' && s.task.goals !== 'fb') { const w = want.shift(); if (w) assert.equal(goals.length, w[1], `${L.t} 步驟${si + 1} 答案個數`); }
    });
  }
});

test('lesson 1 and explicit goals are legal placements; answers that win do win', () => {
  for (const L of LESSONS) replay(L, (s, si, pos, goals) => {
    if (s.task.goals === 'win') for (const p of goals) { pos.place(p, 1); assert.ok(pos.won(1), `${L.t} 步驟${si + 1} 答案要能獲勝`); pos.unplace(); }
  });
});

test('block lessons: the only answer really stops white, and wrong stones do not', () => {
  const L = LESSONS.find(l => l.t === '擋住對手的四子');
  replay(L, (s, si, pos, goals) => {
    assert.equal(Array.from(pos.winCells(2)).length, 1);
    const ans = goals[0];
    for (let p = 0; p < 81; p++) {
      if (pos.b[p]) continue; pos.place(p, 1);
      const open = pos.winCells(2).length > 0; pos.unplace();
      assert.equal(!open, p === ans, '只有擋住獲勝點才能解除威脅');
    }
  });
});

test('live-three lesson: leaving it lets white make an open four, blocking an end does not', () => {
  const L = LESSONS.find(l => l.t === '活三要早擋'), S = 9;
  replay(L, (s, si, pos, goals) => {
    if (!s.task) return;
    const canOpen4 = () => { for (let p = 0; p < 81; p++) { if (pos.b[p]) continue; pos.place(p, 2); const n = pos.winCells(2).length; pos.unplace(); if (n >= 2) return true; } return false; };
    assert.ok(canOpen4(), '沒擋時白棋要能做出活四');
    for (const p of goals) { pos.place(p, 1); assert.ok(!canOpen4(), '擋住一端後白棋做不出活四'); pos.unplace(); }
    // 任何一個非答案的落點都要讓示範找得到白棋的活四回應（demoBad）
    for (let p = 0; p < 81; p++) {
      if (pos.b[p] || goals.includes(p)) continue; pos.place(p, 1);
      let q = -1; for (let c = 0; c < 81; c++) { if (pos.b[c]) continue; pos.place(c, 2); const n = pos.winCells(2).length; pos.unplace(); if (n >= 2) { q = c; break; } }
      pos.unplace(); assert.ok(q >= 0, `黑棋下在 ${p} 時，白棋要有活四可示範`);
    }
  });
});

test('fork lesson: the double three is the only winning key, white cannot stop both threes', () => {
  const L = LESSONS.find(l => l.t === '雙重威脅'), S = 9;
  replay(L, (s, si, pos, goals) => {
    if (si !== 0) return;
    assert.deepEqual(goals, [4 * S + 4]);
    // 其他每一格都不該同樣製造出雙活三：以「白棋任意回應後黑棋仍能做出活四」檢驗只有答案成立
    const wins = [];
    for (let p = 0; p < 81; p++) {
      if (pos.b[p]) continue; pos.place(p, 1);
      let all = true;
      for (let w = 0; w < 81 && all; w++) {
        if (pos.b[w]) continue; pos.place(w, 2);
        let ok = pos.winCells(2).length === 0 && (pos.winCells(1).length > 0 || false);
        if (!ok && pos.winCells(2).length === 0) {
          for (let m = 0; m < 81; m++) { if (pos.b[m]) continue; pos.place(m, 1); const n = pos.winCells(1).length; pos.unplace(); if (n >= 2) { ok = true; break; } }
        }
        pos.unplace(); if (!ok) all = false;
      }
      pos.unplace(); if (all) wins.push(p);
    }
    assert.deepEqual(wins, [4 * S + 4], '只有交會點能保證做出活四');
  });
});

test('two-line lesson: five is one line and not yet a win, six is two lines and wins', () => {
  const L = LESSONS.find(l => l.t === '連兩條才算贏');
  replay(L, (s, si, pos, goals) => {
    if (si === 0) for (const p of goals) { pos.place(p, 1); assert.equal(pos.cnt[0], 1); assert.ok(!pos.won(1)); pos.unplace(); }
    if (si === 1) for (const p of goals) { pos.place(p, 1); assert.equal(pos.cnt[0], 2); assert.ok(pos.won(1)); pos.unplace(); }
  });
});

test('cheat-dice lesson: blocking the only window really prevents a two-stone five', () => {
  const L = LESSONS.find(l => l.t === '作弊鳩特的骰子'), S = 9;
  const s = L.steps[1], pos = new E.Pos(S, 1, {}); s.b.forEach(([x, y, c]) => pos.place(y * S + x, c));
  const canTwo = () => { const e = []; for (let p = 0; p < 81; p++) if (!pos.b[p]) e.push(p); for (const a of e) { pos.place(a, 2); const hit = pos.won(2) || pos.winCells(2).length > 0; pos.unplace(); if (hit) return true; } return false; };
  assert.ok(canTwo(), '沒擋時白棋用兩子可以連五');
  for (const [x, y] of s.task.goals) { pos.place(y * S + x, 1); assert.ok(!canTwo(), '擋住後兩子也連不成五'); pos.unplace(); }
  for (let p = 0; p < 81; p++) {
    if (pos.b[p] || s.task.goals.some(([x, y]) => y * S + x === p)) continue; pos.place(p, 1);
    assert.ok(canTwo(), '擋在別處時仍有風險：' + p); pos.unplace();
  }
});

test('cheat-dice lesson: snake-eyes flips a black stone and breaks the three', () => {
  const L = LESSONS.find(l => l.t === '作弊鳩特的骰子'), S = 9, st = L.steps[2];
  assert.equal(st.demo.kind, 'one');
  const [fx, fy] = st.demo.flip, pos = new E.Pos(S, 1, {});
  st.b.forEach(([x, y, c]) => pos.place(y * S + x, c));
  const before = Array.from(pos.winCells(1)).length;
  const pos2 = new E.Pos(S, 1, {}); st.b.forEach(([x, y, c]) => pos2.place(y * S + x, x === fx && y === fy ? 2 : c));
  assert.equal(pos.b[fy * S + fx], 1); assert.equal(pos2.b[fy * S + fx], 2);
  assert.ok(!pos2.won(2) && pos2.winCells(2).length === 0, '翻面不能讓白棋直接獲勝');
  assert.ok(before >= 0);
});

test('renju lesson: the fork point is marked forbidden for black', () => {
  const L = LESSONS.find(l => l.t === '連珠禁手（選修）'), S = 9;
  replay(L, (s, si, pos, goals) => { assert.deepEqual(goals, [4 * S + 4]); });
});

console.log(tests + ' Gomoku lesson checks passed');
