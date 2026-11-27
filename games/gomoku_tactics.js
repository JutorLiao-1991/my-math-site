/* 鳩特五子棋：殺局題庫用的「連續沖四」解題器（瀏覽器與 Node 共用）
 *
 * 殺局＝攻方每一手都下「四」（再下一子就連成五），守方只能擋在唯一的空點；
 * 最後做出守方擋不住的活四或四四，再下一子連成五子。
 * 「N 手殺」＝雙方合計 N 手（攻方下 (N＋1)／2 子，含最後連成五子的那一手）。
 * 解題器只需要局面物件（gomoku_engine.js 的 Pos，自由規則 N＝1）。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GomokuTactics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* a 方能下「四」的空點：所在的五格窗口裡 a 已有三子、對手沒有棋子 */
  function fourMoves(pos, a) {
    const g = pos.g, A = pos.wc[a - 1], D = pos.wc[2 - a], b = pos.b, seen = new Uint8Array(pos.n), out = [];
    for (let w = 0; w < g.W; w++) {
      if (A[w] !== 3 || D[w] !== 0) continue;
      for (let k = 0; k < 5; k++) { const c = g.wcells[w * 5 + k]; if (b[c] === 0 && !seen[c]) { seen[c] = 1; out.push(c); } }
    }
    return out.sort((x, y) => x - y);
  }

  /* 下了 m 之後（已落子）：回傳 { ok, reply }。ok＝攻方 a 能在剩下 k 手內取勝；reply＝守方必須擋的點（沒有則 -1） */
  function afterFour(pos, a, k) {
    const d = 3 - a;
    if (pos.won(a)) return { ok: true, reply: -1 };
    if (pos.winCells(d).length) return { ok: false, reply: -1 };
    const w = pos.winCells(a);
    if (w.length >= 2) return { ok: k >= 1, reply: w[0] };
    if (w.length === 0) return { ok: false, reply: -1 };
    pos.place(w[0], d);
    const ok = k >= 1 && win(pos, a, k);
    pos.unplace();
    return { ok, reply: w[0] };
  }

  /* 輪到 a：能不能在 k 手（攻方的手數，含最後連五）內取勝 */
  function win(pos, a, k) {
    if (k < 1) return false;
    if (pos.winCells(a).length) return true;
    if (k < 2) return false;
    for (const m of fourMoves(pos, a)) {
      pos.place(m, a);
      const r = afterFour(pos, a, k - 1);
      pos.unplace();
      if (r.ok) return true;
    }
    return false;
  }

  /* 所有能在 k 手內取勝的第一手 */
  function winningMoves(pos, a, k) {
    const five = pos.winCells(a);
    if (five.length) return five.slice();
    const out = [];
    if (k < 2) return out;
    for (const m of fourMoves(pos, a)) {
      pos.place(m, a);
      const r = afterFour(pos, a, k - 1);
      pos.unplace();
      if (r.ok) out.push(m);
    }
    return out;
  }

  /* 攻方下了 m（此時尚未落子）：判斷這一手對不對，並給出守方的應手。
     回傳 { ok, win, reply }：win＝這一手就連成五子；reply＝守方應下的點。 */
  function judge(pos, a, m, k) {
    if (pos.b[m]) return { ok: false };
    if (pos.winCells(a).includes(m)) return { ok: true, win: true, reply: -1 };
    if (k < 2 || !fourMoves(pos, a).includes(m)) return { ok: false };
    pos.place(m, a);
    const r = afterFour(pos, a, k - 1);
    pos.unplace();
    return r.ok ? { ok: true, win: false, reply: r.reply } : { ok: false };
  }

  /* 目前這個局面攻方「最短」幾手能殺（超過 maxK 回傳 0）。 */
  function shortest(pos, a, maxK) {
    for (let k = 1; k <= maxK; k++) if (win(pos, a, k)) return k;
    return 0;
  }

  return { fourMoves, win, winningMoves, judge, shortest, afterFour };
});
