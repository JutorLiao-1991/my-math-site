/* 從 gomoku_make_puzzles 的輸出挑出每種手數各 100 題（第一手唯一、棋子數 16～48，依棋子數由少到多排序），寫成 games/gomoku_puzzles.js
 * 用法：node tools/gomoku_pick_puzzles.cjs <jsonl 檔…> */
const fs = require('fs');
const files = process.argv.slice(2), rows = [];
for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) rows.push(JSON.parse(l));
const S = 15, sym = [(x, y) => [x, y], (x, y) => [S - 1 - x, y], (x, y) => [x, S - 1 - y], (x, y) => [S - 1 - x, S - 1 - y], (x, y) => [y, x], (x, y) => [S - 1 - y, x], (x, y) => [y, S - 1 - x], (x, y) => [S - 1 - y, S - 1 - x]];
function canon(r) { let best = null; for (const f of sym) { const m = a => a.map(p => { const [x, y] = f(p % S, (p / S) | 0); return y * S + x; }).sort((u, v) => u - v).join(','); const key = m(r.b) + '|' + m(r.w) + '|' + r.c; if (best === null || key < best) best = key; } return best; }
const seenKeys = new Set(), uniq = [];
for (const r of rows) { const k = canon(r); if (!seenKeys.has(k)) { seenKeys.add(k); uniq.push(r); } }
rows.length = 0; rows.push(...uniq);
const PER = 100, sets = {};
for (const k of [2, 3, 4]) {
  const pool = rows.filter(r => r.k === k && r.f.length === 1 && r.n >= 16 && r.n <= 48).sort((a, b) => a.n - b.n || a.b.join() .localeCompare(b.b.join()));
  if (pool.length < PER) throw new Error('第 ' + k + ' 種題目不足：' + pool.length);
  const pick = [];
  for (let i = 0; i < PER; i++) pick.push(pool[Math.floor((i + 0.5) * pool.length / PER)]);
  // 依棋子數排序後，同棋子數的維持原順序
  sets[2 * k - 1] = pick.map(r => [r.c, r.b, r.w, r.f[0]]);
}
const body = Object.entries(sets).map(([n, a]) => `  ${n}: [\n${a.map(p => '    ' + JSON.stringify(p)).join(',\n')}\n  ]`).join(',\n');
fs.writeFileSync(__dirname + '/../games/gomoku_puzzles.js',
`/* 鳩特五子棋殺局題庫：電腦自我對弈局面中，經解題器確認「連續沖四」能在 3／5／7 手內取勝、且第一手唯一的局面，各 100 題。
 * 每題 [先手顏色(1黑/2白), [黑棋格…], [白棋格…], 正解第一手]，格＝y*15+x（15 路棋盤）。由 tools/gomoku_make_puzzles.cjs 與 tools/gomoku_pick_puzzles.cjs 產生。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GomokuPuzzles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
${body}
  };
});
`);
console.log('寫入完成', Object.keys(sets).map(n => n + ':' + sets[n].length).join(' '));
