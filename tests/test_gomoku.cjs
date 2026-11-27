const assert = require('node:assert/strict');
const E = require('../games/gomoku_engine.js');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('ok ' + name); }
const S = 15, ix = (x, y) => y * S + x;
const mk = (N, renju, black, white) => E.build(S, N, renju, [...black.map(([x, y]) => [ix(x, y), 1]), ...white.map(([x, y]) => [ix(x, y), 2])]);

/* 暴力重算：每個窗口的計數、條數、潛力分數、再下一子能完成幾條，都要和落子／收回子維護的結果一致 */
function brute(pos) {
  const b = pos.b, g = pos.g, WT = [0, 2, 12, 80, 600, 3000], cnt = [0, 0], sc = [0, 0], ready = [new Int16Array(pos.n), new Int16Array(pos.n)];
  for (let w = 0; w < g.W; w++) {
    const c = [0, 0, 0], cells = [];
    for (let k = 0; k < 5; k++) { const cell = g.wcells[w * 5 + k]; cells.push(cell); c[b[cell]]++; }
    for (let col = 1; col <= 2; col++) if (c[3 - col] === 0) {
      sc[col - 1] += WT[c[col]];
      if (c[col] === 5) cnt[col - 1]++;
      if (c[col] === 4) ready[col - 1][cells.find(x => b[x] === 0)]++;
    }
  }
  return { cnt, sc, ready };
}
test('incremental tables match brute force through random place/undo', () => {
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (const size of [9, 15, 19]) {
    const pos = new E.Pos(size, 1, {}), stack = [];
    for (let step = 0; step < 1500; step++) {
      if (stack.length && (rnd() < 0.35 || stack.length >= size * size - 1)) { pos.unplace(); stack.pop(); }
      else { let p; do { p = Math.floor(rnd() * size * size); } while (pos.b[p]); pos.place(p, rnd() < 0.5 ? 1 : 2); stack.push(p); }
      if (step % 9) continue;
      const r = brute(pos);
      assert.deepEqual(r.cnt, pos.cnt); assert.deepEqual(r.sc, pos.sc);
      for (let c = 0; c < 2; c++) assert.deepEqual(Array.from(r.ready[c]), Array.from(pos.ready[c]));
    }
  }
});

test('line counting: six counts as two, seven as three, crossing fives as two', () => {
  const row = n => { const p = new E.Pos(S, 5, {}); for (let i = 0; i < n; i++) p.place(ix(2 + i, 7), 1); return p; };
  assert.deepEqual([4, 5, 6, 7, 8, 9].map(n => row(n).cnt[0]), [0, 1, 2, 3, 4, 5]);
  const cross = new E.Pos(S, 5, {});
  for (let i = 0; i < 5; i++) cross.place(ix(3 + i, 7), 1);
  for (const y of [5, 6, 8, 9]) cross.place(ix(5, y), 1);
  assert.equal(cross.cnt[0], 2);
  assert.equal(cross.won(1), false);
  const one = new E.Pos(S, 1, {}); for (let i = 0; i < 5; i++) one.place(ix(2 + i, 7), 1);
  assert.equal(one.won(1), true);
});

test('win cells depend on the target number of lines', () => {
  const black = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [3, 9], [4, 9], [5, 9], [6, 9]];
  const p1 = mk(1, false, [[3, 9], [4, 9], [5, 9], [6, 9]], []);
  assert.deepEqual(p1.winCells(1).sort((a, b) => a - b), [ix(2, 9), ix(7, 9)]);
  const p2 = mk(2, false, black, []);
  assert.equal(p2.cnt[0], 1);
  assert.deepEqual(p2.winCells(1).sort((a, b) => a - b), [ix(0, 7), ix(6, 7), ix(2, 9), ix(7, 9)].sort((a, b) => a - b));
  const p3 = mk(3, false, black, []);
  assert.equal(p3.winCells(1).length, 0);
});

test('renju forbidden moves: three-three, four-four, overline', () => {
  assert.equal(E.forbidden(mk(1, true, [[5, 7], [6, 7], [7, 5], [7, 6]], []), ix(7, 7), 0), true);
  assert.equal(E.forbidden(mk(1, true, [[5, 7], [6, 7], [7, 5], [7, 6]], [[4, 7]]), ix(7, 7), 0), false);
  assert.equal(E.forbidden(mk(1, true, [[3, 7], [4, 7], [5, 7], [6, 4], [6, 5], [6, 6]], []), ix(6, 7), 0), true);
  assert.equal(E.forbidden(mk(1, true, [[1, 7], [2, 7], [3, 7], [5, 7], [6, 7]], []), ix(4, 7), 0), true);
  assert.equal(E.forbidden(mk(1, true, [[7, 7], [8, 7]], []), ix(9, 7), 0), false);
  assert.equal(E.forbidden(mk(1, true, [[1, 7], [2, 7], [3, 7], [4, 7], [5, 5], [5, 6], [5, 8], [5, 9]], []), ix(5, 7), 0), false, 'exact five beats every foul');
});

test('renju: win cells skip an overline, free rules keep it', () => {
  const black = [[1, 7], [2, 7], [3, 7], [4, 7], [6, 7]];
  assert.ok(mk(1, false, black, []).winCells(1).includes(ix(5, 7)));
  assert.ok(!mk(1, true, black, []).winCells(1).includes(ix(5, 7)));
  assert.equal(E.forbiddenCells(mk(1, true, black, [])).includes(ix(5, 7)), true);
  assert.equal(E.forbiddenCells(mk(1, false, black, [])).length, 0);
  assert.equal(mk(3, true, black, []).renju, false, 'renju only applies when one line wins');
});

test('forcing-win search finds a double four', () => {
  const pos = mk(1, false, [[3, 7], [4, 7], [5, 7], [6, 4], [6, 5], [6, 6]], [[2, 7], [6, 3]]);
  assert.equal(E.vcf(pos, 1, 4, { vn: 0, vmax: 5000 }), ix(6, 7));
});

test('every level takes a win in one and blocks a four', () => {
  const rnd = () => 0.5;
  for (let level = 0; level < 4; level++) {
    const win = mk(1, false, [[3, 7], [4, 7], [5, 7], [6, 7]], [[3, 8], [4, 9]]);
    assert.ok([ix(2, 7), ix(7, 7)].includes(E.think(win, 1, level, { rand: rnd, timeMs: 200 }).moves[0]), 'win L' + level);
    const block = mk(1, false, [[3, 3], [9, 9]], [[3, 7], [4, 7], [5, 7], [6, 7]]);
    block.place(ix(7, 7), 1); block.unplace();
    const mv = E.think(block, 1, level, { rand: () => 0.1, timeMs: 200 }).moves[0];
    assert.ok([ix(2, 7), ix(7, 7)].includes(mv), 'block L' + level);
  }
});

test('levels 2 and 3 answer a double-open-three attack and finish a sure win', () => {
  const pos = mk(1, false, [[7, 7], [8, 7], [9, 8], [9, 9]], [[7, 8], [8, 8]]);
  const mv = E.think(pos, 2, 2, { rand: () => 0.5, timeMs: 400 }).moves[0];
  assert.ok(pos.b[mv] === 0);
  const sure = mk(1, false, [[5, 7], [6, 7], [7, 7], [7, 5], [8, 6]], [[2, 2], [12, 12], [2, 12], [12, 2]]);
  const r = E.think(sure, 1, 3, { rand: () => 0.5, timeMs: 600 });
  sure.place(r.moves[0], 1);
  assert.ok(sure.winCells(1).length >= 1 || sure.won(1), 'keeps a winning threat');
});

test('double stones: take a two-stone win, or block two threats at once', () => {
  const win = mk(1, false, [[5, 7], [6, 7], [7, 7]], [[3, 3], [12, 12]]);
  const r = E.think(win, 1, 3, { double: true, rand: () => 0.5, timeMs: 600 });
  assert.ok(r.moves.length >= 1 && r.moves.length <= 2);
  for (const m of r.moves) { assert.equal(win.b[m], 0); win.place(m, 1); }
  assert.equal(win.won(1), true);
  const def = mk(1, false, [[2, 7], [10, 2], [13, 13]], [[3, 7], [4, 7], [5, 7], [6, 7], [10, 3], [10, 4], [10, 5], [10, 6]]);
  const need = def.winCells(2);
  assert.equal(need.length, 2);
  const d = E.think(def, 1, 3, { double: true, rand: () => 0.5, timeMs: 600 });
  assert.equal(d.moves.length, 2);
  for (const m of d.moves) def.place(m, 1);
  assert.equal(def.winCells(2).length, 0, 'both threats blocked');
});

test('all levels play legal moves for every target and the renju option', () => {
  for (const N of [1, 2, 3, 4, 5]) for (const renju of [false, true]) for (let level = 0; level < 4; level++) {
    const size = N >= 4 ? 19 : level % 2 ? 9 : 15;
    const pos = new E.Pos(size, N, { renju });
    let color = 1, moves = 0;
    for (; moves < 14 && !pos.full(); moves++) {
      const r = E.think(pos, color, level, { rand: Math.random, timeMs: 40, double: level === 3 && moves % 5 === 4 });
      assert.ok(r.moves.length >= 1);
      for (const m of r.moves) {
        assert.ok(m >= 0 && m < pos.n && pos.b[m] === 0, 'legal cell');
        if (pos.renju && color === 1) assert.equal(E.forbidden(pos, m, 0), false, 'black never plays a forbidden point');
        pos.place(m, color);
        if (pos.won(color)) break;
      }
      if (pos.won(color)) break;
      color = 3 - color;
    }
  }
});

test('think leaves the position unchanged and respects the time budget', () => {
  const pos = mk(1, false, [[7, 7], [8, 8], [6, 8], [9, 6]], [[7, 8], [8, 7], [6, 7]]);
  const before = Array.from(pos.b), hist = pos.hist.length, cnt = pos.cnt.slice(), sc = pos.sc.slice();
  const t = Date.now();
  E.think(pos, 1, 3, { rand: Math.random });
  assert.ok(Date.now() - t < 4000, 'level 3 stays under 4 seconds');
  assert.deepEqual(Array.from(pos.b), before); assert.equal(pos.hist.length, hist);
  assert.deepEqual(pos.cnt, cnt); assert.deepEqual(pos.sc, sc);
});

test('stronger levels beat weaker levels', () => {
  function game(lv1, lv2, size) {
    const pos = new E.Pos(size, 1, {}), lv = [0, lv1, lv2];
    let color = 1;
    for (let i = 0; i < size * size; i++) {
      const r = E.think(pos, color, lv[color], { rand: Math.random, timeMs: 60 });
      if (!r.moves.length) return 0;
      pos.place(r.moves[0], color);
      if (pos.won(color)) return color;
      color = 3 - color;
    }
    return 0;
  }
  let strongWins = 0, weakWins = 0;
  for (let i = 0; i < 4; i++) {
    const a = game(2, 0, 13), b = game(0, 2, 13);
    strongWins += (a === 1) + (b === 2); weakWins += (a === 2) + (b === 1);
  }
  assert.ok(strongWins > weakWins, `level 2 beat level 0 ${strongWins}:${weakWins}`);
});


test('worker script answers think requests with the same protocol the page uses', () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const dir = path.join(__dirname, '..', 'games'), sent = [];
  const sandbox = { postMessage: m => sent.push(m) };
  sandbox.self = sandbox; sandbox.importScripts = f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox);
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(dir, 'gomoku_worker.js'), 'utf8'), sandbox);
  sandbox.onmessage({ data: { id: 7, S: 15, N: 1, renju: false, stones: [[ix(7, 7), 1]], color: 2, level: 1, double: false, timeMs: 100 } });
  sandbox.onmessage({ data: { id: 8, S: 15, N: 1, renju: false, stones: [[ix(7, 7), 1], [ix(8, 8), 2]], color: 1, level: 3, double: true, timeMs: 150 } });
  sandbox.onmessage({ data: { id: 9, S: 15, N: 1, renju: false, color: 1, level: 1 } });
  assert.equal(sent.length, 3);
  assert.equal(sent[0].id, 7); assert.equal(sent[0].moves.length, 1);
  assert.equal(sent[1].id, 8); assert.equal(sent[1].moves.length, 2);
  assert.ok(sent[2].error, 'a bad request reports an error instead of hanging');
});

/* 音效與配樂：用假的 Web Audio 跑過每一種音效和配樂排程，抓打錯字或呼叫不存在的函式 */
(async () => {
  let clock = 0;
  const mock = () => new Proxy(function () {}, { get: (t, k) => { if (k === 'then') return undefined; if (!(k in t)) t[k] = mock(); return t[k]; }, apply: () => mock(), set: (t, k, v) => { t[k] = v; return true; } });
  class Ctx {
    constructor() { this.sampleRate = 44100; this.state = 'running'; this.destination = mock(); }
    get currentTime() { return clock; }
    createBuffer(c, n) { return { duration: n / 44100, getChannelData: () => new Float32Array(n) }; }
    decodeAudioData(b, ok, fail) { fail(new Error('stub')); }
  }
  for (const k of ['createGain', 'createOscillator', 'createBiquadFilter', 'createBufferSource', 'createConvolver', 'createDynamicsCompressor']) Ctx.prototype[k] = () => mock();
  const timers = [];
  global.window = { AudioContext: Ctx }; global.document = { hidden: false, currentScript: { src: 'http://localhost/games/gomoku_audio.js' } };
  global.fetch = () => Promise.reject(new Error('offline'));
  const realSetInterval = global.setInterval; global.setInterval = fn => { timers.push(fn); return timers.length; };
  delete require.cache[require.resolve('../games/gomoku_audio.js')];
  require('../games/gomoku_audio.js');
  const AU = global.window.GomokuAudio;
  for (const type of ['place', 'tap', 'preview', 'dice', 'six', 'cheat', 'warn', 'undo', 'error', 'win', 'lose', 'draw', 'cheatwin', 'nope']) AU.sfx(type, type === 'place' ? 2 : undefined);
  AU.music(true);
  await new Promise(r => setTimeout(r, 60));
  assert.ok(timers.length >= 1, 'music scheduler started');
  for (let i = 0; i < 400; i++) { clock += .09; timers[0](); if (i === 150) AU.tension(true); if (i === 300) AU.tension(false); }
  AU.music(false);
  /* 第二輪：取樣載入成功的路徑，並確認每個取樣檔真的存在 */
  const urls = [];
  global.fetch = u => { urls.push(u); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }); };
  Ctx.prototype.decodeAudioData = function (b, ok) { ok({ duration: 3 }); };
  timers.length = 0;
  delete require.cache[require.resolve('../games/gomoku_audio.js')];
  require('../games/gomoku_audio.js');
  const AU2 = global.window.GomokuAudio;
  AU2.music(true);
  await new Promise(r => setTimeout(r, 60));
  for (let i = 0; i < 300; i++) { clock += .09; timers[0](); if (i === 120) AU2.tension(true); }
  AU2.sfx('win'); AU2.sfx('lose');
  const fs = require('node:fs'), path = require('node:path');
  assert.ok(urls.length >= 25, 'loads the pentatonic samples');
  for (const u of urls) assert.ok(fs.existsSync(path.join(__dirname, '..', 'games', u.replace('http://localhost/games/', ''))), 'sample exists: ' + u);
  AU2.music(false); global.setInterval = realSetInterval;
  tests++; console.log('ok audio module plays every sound and schedules the music loop with stub Web Audio');
  console.log(tests + ' Gomoku checks passed');
})();
