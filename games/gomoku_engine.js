/* 鳩特五子棋引擎（瀏覽器與 Node 共用，也會被背景執行緒載入）
 *
 * 計分方式：把棋盤上所有「連續五格」的小窗口都編號，一個窗口裡全是同一色棋子就算「一條」。
 * 所以六子連線＝2 條、七子＝3 條，兩條五子交叉也算 2 條；先達到目標條數的一方獲勝。
 * 目標條數 N＝1 就是一般的五子棋（自由規則：六子以上也算贏）。
 * N＝1 時可以再加開「連珠規則」：黑棋禁手（三三、四四、長連），白棋不受限。
 *
 * 電腦分四級：0 幼年、1 青年、2 成年、3 作弊（棋力同成年，每次下子前投骰子，六點下兩子；骰子由頁面負責）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GomokuEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WIN = 1e6;
  const WT = [0, 2, 12, 80, 600, 3000];          // 窗口內有 n 顆自己的棋、沒有對手的棋時的價值
  const AT = [1, 8, 50, 400, 6000];              // 落子選點：進攻加分
  const DF = [0, 6, 40, 320, 5000];              // 落子選點：防守加分
  const DIRS = [[1, 0], [0, 1], [1, 1], [-1, 1]];

  /* ---------- 盤面幾何（同尺寸共用） ---------- */
  const GEO = {};
  function geometry(S) {
    if (GEO[S]) return GEO[S];
    const wl = [];
    for (const [dx, dy] of DIRS) {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const ex = x + 4 * dx, ey = y + 4 * dy;
        if (ex < 0 || ey < 0 || ex >= S || ey >= S) continue;
        for (let k = 0; k < 5; k++) wl.push((y + k * dy) * S + x + k * dx);
      }
    }
    const W = wl.length / 5, wcells = Int16Array.from(wl), n = S * S;
    const cnt = new Int32Array(n + 1);
    for (let w = 0; w < W; w++) for (let k = 0; k < 5; k++) cnt[wcells[w * 5 + k] + 1]++;
    for (let i = 0; i < n; i++) cnt[i + 1] += cnt[i];
    const cs = Int32Array.from(cnt), fill = Int32Array.from(cnt.subarray(0, n)), cl = new Int32Array(cs[n]);
    for (let w = 0; w < W; w++) for (let k = 0; k < 5; k++) { const c = wcells[w * 5 + k]; cl[fill[c]++] = w; }
    return (GEO[S] = { S, n, W, wcells, cs, cl });
  }

  /* ---------- 局面：落子／收回子，隨時維持各窗口的計數 ---------- */
  function Pos(S, N, opts) {
    const g = geometry(S), n = S * S;
    this.S = S; this.N = N; this.g = g; this.n = n;
    this.b = new Int8Array(n);
    this.wc = [new Uint8Array(g.W), new Uint8Array(g.W)];     // 每個窗口裡黑、白各有幾顆
    this.ready = [new Int16Array(n), new Int16Array(n)];      // 在這格下子能多完成幾條
    this.cnt = [0, 0];                                        // 黑、白目前各有幾條
    this.sc = [0, 0];                                         // 黑、白的窗口潛力總分
    this.near = new Uint8Array(n);                            // 周圍兩格內有幾顆棋
    this.hist = [];
    this.renju = !!(opts && opts.renju) && N === 1;
  }
  const P = Pos.prototype;

  P.place = function (q, c) {
    const g = this.g, b = this.b, A = this.wc[c - 1], O = this.wc[2 - c], R = this.ready, sc = this.sc, wcells = g.wcells, o = 3 - c;
    b[q] = c;
    for (let i = g.cs[q], e = g.cs[q + 1]; i < e; i++) {
      const w = g.cl[i], ac = A[w], oc = O[w];
      if (oc === 0) {
        sc[c - 1] += WT[ac + 1] - WT[ac];
        if (ac === 4) { R[c - 1][q]--; this.cnt[c - 1]++; }
        else if (ac === 3) {
          for (let k = 0; k < 5; k++) { const cell = wcells[w * 5 + k]; if (b[cell] === 0) { R[c - 1][cell]++; break; } }
        }
      } else if (ac === 0) {
        sc[o - 1] -= WT[oc];
        if (oc === 4) R[o - 1][q]--;
      }
      A[w] = ac + 1;
    }
    const S = this.S, x = q % S, y = (q / S) | 0;
    for (let yy = Math.max(0, y - 2); yy <= Math.min(S - 1, y + 2); yy++)
      for (let xx = Math.max(0, x - 2); xx <= Math.min(S - 1, x + 2); xx++) this.near[yy * S + xx]++;
    this.hist.push(q);
  };

  P.unplace = function () {
    const q = this.hist.pop(), g = this.g, b = this.b, c = b[q], o = 3 - c;
    const A = this.wc[c - 1], O = this.wc[2 - c], R = this.ready, sc = this.sc, wcells = g.wcells;
    for (let i = g.cs[q], e = g.cs[q + 1]; i < e; i++) {
      const w = g.cl[i], ac = A[w], oc = O[w];
      if (oc === 0) {
        sc[c - 1] -= WT[ac] - WT[ac - 1];
        if (ac === 5) { R[c - 1][q]++; this.cnt[c - 1]--; }
        else if (ac === 4) {
          for (let k = 0; k < 5; k++) { const cell = wcells[w * 5 + k]; if (b[cell] === 0) { R[c - 1][cell]--; break; } }
        }
      } else if (ac === 1) {
        sc[o - 1] += WT[oc];
        if (oc === 4) R[o - 1][q]++;
      }
      A[w] = ac - 1;
    }
    b[q] = 0;
    const S = this.S, x = q % S, y = (q / S) | 0;
    for (let yy = Math.max(0, y - 2); yy <= Math.min(S - 1, y + 2); yy++)
      for (let xx = Math.max(0, x - 2); xx <= Math.min(S - 1, x + 2); xx++) this.near[yy * S + xx]--;
    return q;
  };

  /* c 再下一子就能達成目標條數的格子（連珠規則下，黑棋的禁手格不算） */
  P.winCells = function (c) {
    const need = this.N - this.cnt[c - 1];
    if (need <= 0) return [];
    const r = this.ready[c - 1], b = this.b, out = [];
    for (let p = 0; p < this.n; p++) if (r[p] >= need && b[p] === 0) out.push(p);
    if (this.renju && c === 1) return out.filter(p => !forbidden(this, p, 0));
    return out;
  };
  P.won = function (c) { return this.cnt[c - 1] >= this.N; };
  P.full = function () { return this.hist.length >= this.n; };
  P.empty = function () { return this.hist.length === 0; };
  /* 所有五連窗口裡，已經被 c 填滿的窗口（用來標示獲勝連線） */
  P.fives = function (c) {
    const g = this.g, A = this.wc[c - 1], out = [];
    for (let w = 0; w < g.W; w++) if (A[w] === 5) out.push(Array.from(g.wcells.subarray(w * 5, w * 5 + 5)));
    return out;
  };

  /* 依落子順序重建局面。stones: [[格, 顏色], ...] */
  function build(S, N, renju, stones) {
    const pos = new Pos(S, N, { renju });
    for (const [p, c] of stones) pos.place(p, c);
    return pos;
  }

  /* ---------- 連珠規則：黑棋禁手 ---------- */
  function lineArr(b, S, p, d, color) {
    const x = p % S, y = (p / S) | 0, a = [];
    for (let k = -5; k <= 5; k++) {
      const nx = x + k * d[0], ny = y + k * d[1];
      if (nx < 0 || ny < 0 || nx >= S || ny >= S) a.push(2);
      else { const v = b[ny * S + nx]; a.push(v === 0 ? 0 : (v === color ? 1 : 2)); }
    }
    return a;
  }
  function runAt(a, i) { let l = i, r = i; while (l > 0 && a[l - 1] === 1) l--; while (r < a.length - 1 && a[r + 1] === 1) r++; return [l, r]; }
  function fourPoints(a) {
    const pts = [];
    for (let j = 0; j < 11; j++) {
      if (a[j] !== 0) continue;
      a[j] = 1;
      const [l, r] = runAt(a, j);
      if (r - l + 1 === 5 && l <= 5 && r >= 5) pts.push(j);
      a[j] = 0;
    }
    return pts;
  }
  function fourCount(a) {
    const pts = fourPoints(a);
    if (pts.length <= 1) return pts.length;
    if (pts.length === 2 && pts[1] - pts[0] === 5 && [1, 2, 3, 4].every(k => a[pts[0] + k] === 1)) return 1;   // 活四只算一個四
    return 2;
  }
  function isOpenThree(a, pos, p, d, depth) {
    const S = pos.S, x = p % S, y = (p / S) | 0;
    for (let j = 0; j < 11; j++) {
      if (a[j] !== 0) continue;
      a[j] = 1;
      const [l, r] = runAt(a, j);
      const ok = r - l + 1 === 4 && l <= 5 && r >= 5 && a[l - 1] === 0 && a[r + 1] === 0 && a[l - 2] !== 1 && a[r + 2] !== 1;
      a[j] = 0;
      if (!ok) continue;
      const cell = (y + (j - 5) * d[1]) * S + x + (j - 5) * d[0];
      if (depth < 3 && forbidden(pos, cell, depth + 1)) continue;
      return true;
    }
    return false;
  }
  /* 黑棋下在 p 是不是禁手？一子剛好成五的不算禁手（五連優先） */
  function forbidden(pos, p, depth) {
    const b = pos.b, S = pos.S;
    if (b[p] !== 0) return false;
    b[p] = 1;
    let res = false;
    try {
      const arrs = DIRS.map(d => lineArr(b, S, p, d, 1));
      let five = false, over = false;
      for (const a of arrs) { const [l, r] = runAt(a, 5), L = r - l + 1; if (L === 5) five = true; else if (L >= 6) over = true; }
      if (five) res = false;
      else if (over) res = true;
      else {
        let fours = 0, threes = 0;
        arrs.forEach((a, i) => {
          const fc = fourCount(a);
          fours += fc;
          if (fc === 0 && isOpenThree(a, pos, p, DIRS[i], depth)) threes++;
        });
        res = fours >= 2 || threes >= 2;
      }
    } finally { b[p] = 0; }
    return res;
  }
  /* 黑棋目前所有禁手點（只在連珠規則下才有） */
  function forbiddenCells(pos) {
    if (!pos.renju) return [];
    const out = [];
    for (let p = 0; p < pos.n; p++) if (pos.b[p] === 0 && forbidden(pos, p, 0)) out.push(p);
    return out;
  }

  /* ---------- 選點與搜尋 ---------- */
  function cellScore(pos, p, me) {
    const g = pos.g, A = pos.wc[me - 1], O = pos.wc[2 - me];
    let atk = 0, def = 0;
    for (let i = g.cs[p], e = g.cs[p + 1]; i < e; i++) {
      const w = g.cl[i], a = A[w], o = O[w];
      if (o === 0) atk += AT[a];
      if (a === 0) def += DF[o];
    }
    const S = pos.S, x = p % S, y = (p / S) | 0, c = (S - 1) / 2;
    return atk + def * 0.95 + (c - Math.max(Math.abs(x - c), Math.abs(y - c))) * 0.4;
  }
  function gen(pos, me, K) {
    const out = [], b = pos.b, near = pos.near;
    for (let p = 0; p < pos.n; p++) if (b[p] === 0 && near[p] > 0) out.push([cellScore(pos, p, me), p]);
    out.sort((u, v) => v[0] - u[0]);
    const res = [], check = pos.renju && me === 1;
    for (let i = 0; i < out.length && res.length < K; i++) {
      if (check && forbidden(pos, out[i][1], 0)) continue;
      res.push(out[i][1]);
    }
    return res;
  }
  function leafEval(pos, toMove) {
    const opp = 3 - toMove;
    if (pos.cnt[opp - 1] >= pos.N) return -WIN;
    if (pos.winCells(toMove).length) return WIN;
    if (pos.winCells(opp).length >= 2) return -WIN;
    return pos.sc[toMove - 1] - pos.sc[opp - 1];
  }
  const WIDTH = [16, 12, 9, 7, 6, 5, 5, 4];
  function search(ctx, depth, alpha, beta, me, ply) {
    if ((++ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) ctx.abort = true;
    if (ctx.abort) return 0;
    const pos = ctx.pos, opp = 3 - me;
    if (pos.cnt[opp - 1] >= pos.N) return -(WIN - ply);
    if (pos.winCells(me).length) return WIN - ply - 1;
    const ow = pos.winCells(opp);
    if (ow.length >= 2) return -(WIN - ply - 2);
    if (depth <= 0) return pos.sc[me - 1] - pos.sc[opp - 1];
    const cands = ow.length === 1 ? ow : gen(pos, me, WIDTH[Math.min(ply, WIDTH.length - 1)]);
    if (!cands.length) return 0;
    let best = -Infinity;
    for (const p of cands) {
      pos.place(p, me);
      const v = -search(ctx, depth - 1, -beta, -alpha, opp, ply + 1);
      pos.unplace();
      if (ctx.abort) return 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  /* 連續逼迫（每一手都讓對手非擋不可）：找得到就是必勝 */
  function forcingCands(pos, me) {
    const g = pos.g, A = pos.wc[me - 1], O = pos.wc[2 - me], out = [], b = pos.b, near = pos.near;
    for (let p = 0; p < pos.n; p++) {
      if (b[p] !== 0 || near[p] === 0) continue;
      let k = 0;
      for (let i = g.cs[p], e = g.cs[p + 1]; i < e; i++) { const w = g.cl[i]; if (A[w] === 3 && O[w] === 0) k++; }
      if (k > 0) out.push([k * 1000 + cellScore(pos, p, me), p]);
    }
    out.sort((u, v) => v[0] - u[0]);
    const res = out.map(x => x[1]);
    return pos.renju && me === 1 ? res.filter(p => !forbidden(pos, p, 0)) : res;
  }
  function vcf(pos, me, depth, ctx) {
    if (ctx.vn++ > ctx.vmax) return -1;
    const opp = 3 - me, mw = pos.winCells(me);
    if (mw.length) return mw[0];
    if (depth <= 0) return -1;
    for (const p of forcingCands(pos, me)) {
      pos.place(p, me);
      let ok = false;
      if (pos.winCells(opp).length === 0) {
        const T = pos.winCells(me);
        if (T.length >= 2) ok = true;
        else if (T.length === 1) {
          pos.place(T[0], opp);
          if (pos.cnt[opp - 1] < pos.N) ok = vcf(pos, me, depth - 1, ctx) >= 0;
          pos.unplace();
        }
      }
      pos.unplace();
      if (ok) return p;
      if (ctx.vn > ctx.vmax) return -1;
    }
    return -1;
  }

  function pickCenter(pos, rnd) {
    const S = pos.S, c = (S - 1) / 2 | 0, off = () => (rnd() < 0.35 ? (rnd() < 0.5 ? -1 : 1) : 0);
    return (c + off()) * S + c + off();
  }

  /* 兩子連下（作弊鳩特擲到六點）：先找兩子必勝，再比較各種兩子組合 */
  function thinkDouble(pos, me, level, rnd, deadline, safe) {
    const opp = 3 - me, N = pos.N, tryWin = gen(pos, me, 40);
    if (safe) { const w = pos.winCells(me); if (w.length) return [w[0]]; }   // 安全模式：本來就有一步可贏就照常下一子
    else for (const p of tryWin) {
      pos.place(p, me);
      if (pos.cnt[me - 1] >= N) { pos.unplace(); return [p]; }
      const w = pos.winCells(me);
      if (w.length) { const q = w[0]; pos.unplace(); return [p, q]; }
      pos.unplace();
    }
    const list = [];
    for (const p of gen(pos, me, 12)) {
      pos.place(p, me);
      if (safe && pos.cnt[me - 1] >= N) { pos.unplace(); continue; }
      for (const q of gen(pos, me, 10)) {
        pos.place(q, me);
        // 安全模式（作弊鳩特的雙六）：兩子不能直接決勝——不能連成五、活四或雙四，留給對手一手防守
        if (!safe || (pos.cnt[me - 1] < N && pos.winCells(me).length < 2)) list.push([-leafEval(pos, opp), p, q]);
        pos.unplace();
      }
      pos.unplace();
    }
    list.sort((u, v) => v[0] - u[0]);
    if (!list.length) return [];
    let best = list[0];
    if (level >= 2) {
      const ctx = { pos, nodes: 0, abort: false, deadline };
      let bv = -Infinity;
      for (const item of list.slice(0, 5)) {
        pos.place(item[1], me); pos.place(item[2], me);
        const v = -search(ctx, 2, -Infinity, Infinity, opp, 1);
        pos.unplace(); pos.unplace();
        if (ctx.abort) break;
        if (v > bv) { bv = v; best = item; }
      }
    }
    return [best[1], best[2]];
  }

  /* ---------- 電腦思考 ----------
     think(pos, 顏色, 難度 0~3, { double, safe, rand, timeMs }) → { moves:[格…], vcf:是否找到連續逼迫必勝 } */
  function think(pos, me, level, opts) {
    opts = opts || {};
    const rnd = opts.rand || Math.random, opp = 3 - me, info = {};
    const budget = opts.timeMs || (level >= 3 ? 1300 : level === 2 ? 900 : 300) * (pos.S >= 19 ? 1.3 : 1);
    const deadline = Date.now() + budget;
    if (pos.empty()) return { moves: [pickCenter(pos, rnd)] };
    if (opts.double) { const m = thinkDouble(pos, me, level, rnd, deadline, !!opts.safe); if (m && m.length > 1) return { moves: m, double: true }; if (!opts.safe && m && m.length) return { moves: m, double: true }; }

    const mw = pos.winCells(me);
    if (mw.length && (level > 0 || rnd() < 0.95)) return { moves: [mw[0]] };
    const ow = pos.winCells(opp);

    if (level === 0) {
      if (ow.length && rnd() < 0.7) return { moves: [ow[0]] };
      const c = gen(pos, me, 8);
      if (!c.length) return { moves: [] };
      const k = rnd() < 0.25 ? Math.floor(rnd() * Math.min(6, c.length)) : Math.floor(rnd() * rnd() * Math.min(4, c.length));
      return { moves: [c[k]] };
    }
    if (ow.length === 1) return { moves: [ow[0]] };
    if (ow.length >= 2) return { moves: [ow[Math.floor(rnd() * ow.length)]] };

    if (level === 1) {
      const c = gen(pos, me, 14), ctx = { pos, nodes: 0, abort: false, deadline: Date.now() + 2000 };
      let best = -Infinity, bm = [];
      for (const p of c) {
        pos.place(p, me);
        const v = -search(ctx, 1, -Infinity, Infinity, opp, 1) + rnd() * 3;
        pos.unplace();
        if (v > best) { best = v; bm = [p]; }
      }
      return { moves: bm.length ? bm : c.slice(0, 1) };
    }

    /* 成年／作弊：先找自己的連續逼迫必勝，再用逐步加深的搜尋，最後確認對手沒有連續逼迫可以反殺 */
    const vctx = { vn: 0, vmax: 15000 };
    const v = vcf(pos, me, 12, vctx);
    if (v >= 0) return { moves: [v], vcf: true };

    const ctx = { pos, nodes: 0, abort: false, deadline };
    let order = gen(pos, me, 16), scored = order.map(p => [0, p]);
    for (let depth = 2; depth <= 8; depth++) {
      const cur = [];
      let alpha = -Infinity;
      for (const [, p] of scored) {
        pos.place(p, me);
        const val = -search(ctx, depth - 1, -Infinity, -alpha + 0, opp, 1);
        pos.unplace();
        if (ctx.abort) break;
        cur.push([val, p]);
        if (val > alpha) alpha = val;
      }
      if (ctx.abort) break;
      cur.sort((u, w) => w[0] - u[0]);
      scored = cur;
      info.depth = depth;
      if (cur[0][0] >= WIN - 100) break;
    }
    if (!scored.length) return { moves: [] };
    let pick = scored[0][1];
    for (let i = 0; i < Math.min(scored.length, 6); i++) {
      const p = scored[i][1];
      pos.place(p, me);
      const danger = vcf(pos, opp, 10, { vn: 0, vmax: 8000 }) >= 0;
      pos.unplace();
      if (!danger) { pick = p; break; }
    }
    return { moves: [pick], depth: info.depth };
  }

  return { Pos, build, think, forbidden, forbiddenCells, vcf, WIN, DIRS, geometry };
});
