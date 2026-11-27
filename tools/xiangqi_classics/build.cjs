/* 著名棋譜題庫產生器：把 DhtmlXQ 文字棋譜（只取主線）轉成 games/xiangqi_classics_data.js。
   用法：node build.cjs <來源資料夾> <輸出檔>；來源檔名須以「第N局」開頭。
   每一手都用 games/xiangqi_engine.js 驗證合法，否則整個腳本失敗；古譜多半停在已定勝負的局面，所以不要求終局將死，勝負取自原譜。 */
const fs = require('fs'), path = require('path');
const X = require('../../games/xiangqi_engine.js');
const [src, out] = process.argv.slice(2);
const ORDER = [X.R, X.H, X.E, X.A, X.K, X.A, X.E, X.H, X.R, X.C, X.C, X.P, X.P, X.P, X.P, X.P];
const MAP = { 车: '車', 马: '馬', 后: '後', 过: '過', 边: '邊', 飞: '飛', 进: '進', 贪: '貪', 弃: '棄', 换: '換', 兑: '兌', 横: '橫', 对: '對', 风: '風', 吃: '吃', 挺: '挺' };
const trad = t => t.replace(/./g, c => MAP[c] || c);
const tag = (s, k) => (s.match(new RegExp('\\[DhtmlXQ_' + k + '\\](.*?)\\[/?DhtmlXQ_')) || [, ''])[1].trim();
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 };
const files = fs.readdirSync(src).filter(f => /^第[一二三四五六七八九十]+局/.test(f)).sort((a, b) => {
  const n = f => '一二三四五六七八九十'.indexOf(f[1]) + 1; return n(a) - n(b);
});
const games = files.map((f, gi) => {
  const s = fs.readFileSync(path.join(src, f), 'utf8').replace(/^﻿/, '');
  const binit = tag(s, 'binit'), ml = tag(s, 'movelist');
  const p = X.start(); p.b.fill(0);
  for (let i = 0; i < 32; i++) {
    const x = +binit[i * 2], y = +binit[i * 2 + 1]; if (isNaN(x) || isNaN(y) || x > 8 || y > 9) continue;
    p.b[y * 9 + x] = (i < 16 ? 1 : -1) * ORDER[i % 16];
  }
  p.side = 1;
  const moves = [], notes = [];
  for (let i = 0; i < ml.length; i += 4) {
    const fx = +ml[i], fy = +ml[i + 1], tx = +ml[i + 2], ty = +ml[i + 3];
    const m = X.move(fy * 9 + fx, ty * 9 + tx);
    if (!X.legal(p).includes(m)) throw new Error(`${f} 第 ${i / 4 + 1} 手不合法`);
    const cap = p.b[ty * 9 + tx], nt = X.notation(p, m);
    X.make(p, m); moves.push(m);
    notes.push({ n: nt, cap: cap ? Math.abs(cap) : 0, chk: X.inCheck(p) });
  }
  const st = X.status(p), res = tag(s, 'result');
  if (!/[紅红黑]/.test(res)) throw new Error(`${f} 缺少勝負`);
  const title = f.replace(/^第[一二三四五六七八九十]+局/, '');
  return { no: gi + 1, name: trad(title), open: trad(tag(s, 'open').replace(/^C\d+\s*/, '')), result: /黑/.test(res) ? '黑勝' : '紅勝', how: st.over ? st.reason : '', len: moves.length, m: moves, k: notes.map(x => x.n) };
});
const body = '/* 著名棋譜題庫：《梅花譜》（清・王再越，公有領域）屏風馬破當頭炮八局主線。\n   m＝著法（引擎編碼：起點格|終點格<<7，格＝列*9+行，左上為 0，紅方在下）；k＝中文記譜。每一手皆經 tools/xiangqi_classics/build.cjs 驗證合法；勝負取自原譜（古譜多停在已定勝負的局面）。 */\n' +
  'window.XQ_CLASSICS={meihua:{title:"梅花譜",author:"王再越",era:"清康熙年間",games:' + JSON.stringify(games) + '}};\n';
fs.writeFileSync(out, body);
for (const g of games) console.log(g.no, g.name, g.len, g.result, g.how);
