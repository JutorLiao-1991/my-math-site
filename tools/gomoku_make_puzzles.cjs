/* 產生鳩特五子棋殺局題庫：電腦自我對弈，逐手檢查「連續沖四」殺法。
 * 用法：node tools/gomoku_make_puzzles.cjs <種子> <局數> <輸出檔>
 * 每筆：{k, c(先手色), b:[黑棋格], w:[白棋格], f:[唯一或全部的第一手], n:手數} */
const fs = require('fs');
const E = require('../games/gomoku_engine.js');
const T = require('../games/gomoku_tactics.js');
const S = 15;
const seed0 = +process.argv[2] || 1, games = +process.argv[3] || 50, out = process.argv[4] || '/tmp/puz.jsonl';
let s = seed0 * 2654435761 % 4294967296 || 1;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };

const sym = [(x, y) => [x, y], (x, y) => [S - 1 - x, y], (x, y) => [x, S - 1 - y], (x, y) => [S - 1 - x, S - 1 - y],
  (x, y) => [y, x], (x, y) => [S - 1 - y, x], (x, y) => [y, S - 1 - x], (x, y) => [S - 1 - y, S - 1 - x]];
function canon(b, w, c) {
  let best = null;
  for (const f of sym) {
    const m = a => a.map(p => { const [x, y] = f(p % S, (p / S) | 0); return y * S + x; }).sort((u, v) => u - v).join(',');
    const key = m(b) + '|' + m(w) + '|' + c;
    if (best === null || key < best) best = key;
  }
  return best;
}
const seen = new Set();
const fd = fs.openSync(out, 'a');
let found = 0;
for (let g = 0; g < games; g++) {
  const pos = new E.Pos(S, 1, {}); let me = 1;
  // 開局：中心附近隨機幾手，增加變化
  const lvA = rnd() < 0.7 ? 0 : 1, lvB = rnd() < 0.7 ? 0 : 1;
  for (let ply = 0; ply < 90; ply++) {
    const lv = me === 1 ? lvA : lvB;
    const r = ply < 3 ? { moves: [pos.empty() ? 7 * S + 7 : (() => { const c = []; for (let p = 0; p < S * S; p++) if (!pos.b[p] && pos.near[p]) c.push(p); return c[Math.floor(rnd() * c.length)]; })()] } : E.think(pos, me, lv, { rand: rnd, timeMs: 25 });
    const m = r.moves[0]; if (m === undefined) break;
    pos.place(m, me);
    if (pos.won(me)) break;
    me = 3 - me;
    if (ply < 14) continue;
    if (pos.winCells(1).length || pos.winCells(2).length) continue;
    const nb = pos.hist.filter(p => pos.b[p] === 1).length, nw = pos.hist.length - nb;
    if (nb < 6 || nw < 6) continue;
    const k = T.shortest(pos, me, 4);
    if (k < 2) continue;
    const f = T.winningMoves(pos, me, k);
    const b = [], w = []; for (let p = 0; p < S * S; p++) { if (pos.b[p] === 1) b.push(p); else if (pos.b[p] === 2) w.push(p); }
    const key = canon(b, w, me);
    if (seen.has(key)) continue; seen.add(key);
    fs.writeSync(fd, JSON.stringify({ k, c: me, b, w, f, n: pos.hist.length }) + '\n'); found++;
  }
}
fs.closeSync(fd);
console.log('games', games, 'found', found);
