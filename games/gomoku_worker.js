/* 鳩特五子棋：電腦在背景執行緒思考，避免手機畫面卡住。 */
importScripts('gomoku_engine.js');
self.onmessage = function (e) {
  const d = e.data;
  try {
    const pos = self.GomokuEngine.build(d.S, d.N, d.renju, d.stones);
    const r = self.GomokuEngine.think(pos, d.color, d.level, { double: !!d.double, timeMs: d.timeMs });
    self.postMessage({ id: d.id, moves: r.moves, vcf: !!r.vcf, depth: r.depth || 0 });
  } catch (err) {
    self.postMessage({ id: d.id, error: String(err && err.message || err) });
  }
};
