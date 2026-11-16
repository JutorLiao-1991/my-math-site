/* 小六數學：基準量與比較量。所有數量都用最簡分數 {n, d} 精確計算。 */
(function (root) {
  'use strict';
  const RQ = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;
  const categories = {
    value: '求比值與倍數', sum: '兩量之和', sumBase: '由和求基準量',
    diff: '兩量之差', diffBase: '由差求基準量', judge: '是非判斷', choice: '選擇算式'
  };
  const PRACTICE_TYPES = Object.keys(categories);
  const EXAM_TYPES = ['value', 'sum', 'sumBase', 'sumBase', 'diff', 'diffBase', 'judge', 'judge', 'choice', 'choice'];

  /* ---------- 分數運算 ---------- */
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const F = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => F(a.n * b.d, a.d * b.n);
  const ONE = F(1);
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const less = (a, b) => a.n * b.d < b.n * a.d;
  function terminatingDigits(a) {
    let d = a.d, two = 0, five = 0;
    while (d % 2 === 0) { d /= 2; two++; }
    while (d % 5 === 0) { d /= 5; five++; }
    return d === 1 ? Math.max(two, five) : Infinity;
  }
  function decimalText(a) {
    const digits = terminatingDigits(a), sign = a.n < 0 ? '-' : '', n = Math.abs(a.n);
    const scaled = n * 10 ** digits / a.d, whole = Math.floor(scaled / 10 ** digits);
    const rest = String(scaled % 10 ** digits).padStart(digits, '0').replace(/0+$/, '');
    return sign + (rest ? `${whole}.${rest}` : String(whole));
  }
  function fractionText(a) {
    if (a.d === 1) return String(a.n);
    return a.n > a.d ? `${Math.floor(a.n / a.d)} ${a.n % a.d}/${a.d}` : `${a.n}/${a.d}`;
  }
  /* style: 'dec' 盡量用小數；'frac' 一律用分數；'auto' 有限小數（三位以內）用小數 */
  function show(a, style = 'auto') {
    if (a.d === 1) return String(a.n);
    if (style !== 'frac' && terminatingDigits(a) <= 3) return decimalText(a);
    return fractionText(a);
  }

  /* ---------- 比值 ---------- */
  const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function ratio(text) {
    if (/%$/.test(text)) return { v: F(Number(text.slice(0, -1)), 100), text, ft: text, pct: true, style: 'dec' };
    const v = RQ.parse(text);
    return { v, text, ft: text, style: /\//.test(text) ? 'frac' : 'dec' };
  }
  function cheng(hundredths) {
    const tens = Math.floor(hundredths / 10), ones = hundredths % 10;
    return { v: F(hundredths, 100), text: `${CN[tens]}成${ones ? CN[ones] : ''}`, ft: decimalText(F(hundredths, 100)), style: 'dec', words: true };
  }
  function zhe(tenths) { return { v: F(tenths, 10), text: `${CN[tenths]}折`, ft: decimalText(F(tenths, 10)), style: 'dec', words: true }; }
  const GT = ['2', '3', '4', '5', '6', '1.2', '1.25', '1.5', '1.8', '2.5', '3.5', '4.5', '6.5', '1 1/4', '1 1/3', '1 2/5', '1 3/4', '2 1/2', '2 3/7', '1 5/9', '1 2/3', '120%', '125%', '150%', '180%'];
  const LT = ['0.2', '0.25', '0.4', '0.6', '0.65', '0.7', '0.75', '0.8', '0.9', '1/3', '2/3', '1/4', '3/4', '2/5', '3/5', '4/5', '5/6', '5/8', '3/7', '4/9', '20%', '25%', '40%', '60%', '75%', '80%'];
  const timesText = r => r.pct ? r.text : `${r.text} 倍`;

  /* ---------- 情境 ---------- */
  function ownContext(names, item, unit, lo, hi, extra = {}) {
    const money = unit === '元';
    return { names, lo, hi, unit, ordered: false, ...extra,
      label: x => `${x}的${item}`,
      has: (x, v) => money ? `${x}有 ${v} 元` : `${x}有 ${v} ${unit}${item}`,
      rel: (c, b, r) => `${c}的${item}是${b}的 ${timesText(r)}`,
      askOne: x => money ? `${x}有多少元？` : `${x}有幾${unit}${item}？`,
      askBoth: (x, y) => money ? `${x}和${y}各有多少元？` : `${x}和${y}各有幾${unit}${item}？`,
      askSum: (x, y) => money ? `${x}和${y}共有多少元？` : `${x}和${y}共有幾${unit}${item}？`,
      askDiff: (x, y) => `${x}和${y}的${item}相差${money ? '多少' : '幾'}${unit}？`,
      knowSum: (x, y, v) => money ? `${x}和${y}共有 ${v} 元` : `${x}和${y}共有 ${v} ${unit}${item}`,
      knowDiff: (x, y, v) => `${x}和${y}的${item}相差 ${v} ${unit}`,
      askTimes: (c, b) => `${c}的${item}是${b}的幾倍？` };
  }
  function measureContext(names, item, unit, verb, lo, hi, extra = {}) {
    return { names, lo, hi, unit, ordered: false, prefix: '', ...extra,
      label: x => `${x}的${item}`,
      has: (x, v) => `${x}${verb} ${v} ${unit}`,
      rel: (c, b, r) => `${c}的${item}是${b}的 ${timesText(r)}`,
      askOne: x => `${x}${verb}多少${unit}？`,
      askBoth: (x, y) => `${x}和${y}各${verb}多少${unit}？`,
      askSum: (x, y) => `${x}和${y}的${item}合起來是多少${unit}？`,
      askDiff: (x, y) => `${x}和${y}的${item}相差多少${unit}？`,
      knowSum: (x, y, v) => `${x}和${y}的${item}合起來是 ${v} ${unit}`,
      knowDiff: (x, y, v) => `${x}和${y}的${item}相差 ${v} ${unit}`,
      askTimes: (c, b) => `${c}的${item}是${b}的幾倍？` };
  }
  const PAIRS = [
    ownContext(['阿鳩', '阿特'], '郵票', '張', 12, 300),
    ownContext(['姊姊', '妹妹'], '貼紙', '張', 12, 300),
    ownContext(['小鳩', '小特'], '錢', '元', 40, 3000),
    ownContext(['哥哥', '弟弟'], '彈珠', '顆', 12, 240),
    measureContext(['紅色緞帶', '藍色緞帶'], '長度', '公分', '長', 30, 900),
    measureContext(['大水桶', '小水桶'], '水量', '公升', '裝了', 4, 200, { ordered: true }),
    measureContext(['鉛筆盒', '削鉛筆機'], '價錢', '元', '賣', 40, 600),
    measureContext(['男學生', '女學生'], '人數', '人', '有', 20, 600, { prefix: '鳩特數理的' }),
    measureContext(['蘋果', '水梨'], '重量', '公斤', '重', 50, 2000, { prefix: '水果行今天進貨的水果中，' }),
    measureContext(['焗烤飯', '拉餅'], '價錢', '元', '賣', 40, 400, { prefix: '餐廳裡' })
  ];
  const FRACTION_PAIRS = [
    measureContext(['水壺', '小水盆'], '容量', '公升', '可以裝', 0, 0),
    measureContext(['菠蘿麵包', '紅豆麵包'], '重量', '公斤', '重', 0, 0),
    measureContext(['行人步道', '自行車道'], '長度', '公里', '長', 0, 0),
    measureContext(['乙量杯', '甲量杯'], '水量', '公升', '裝了', 0, 0)
  ];

  /* 生活情境：result 是「兩量之和」或「兩量之差」 */
  const SHOP_ITEMS = [['隨身聽', '台'], ['烤肉爐', '個'], ['羽絨風衣', '件'], ['摺疊腳踏車', '輛'], ['化妝組', '組'], ['電視機', '臺']];
  const BUSINESS = {
    sum: [
      { name: 'markup', ratio: (rnd, pick) => rnd(0, 1) ? cheng(pick([10, 15, 20, 25, 30, 35, 40, 50])) : ratio(`${pick([12, 24, 36, 38, 45])}%`),
        lo: 200, hi: 30000, round: 100, unit: '元', baseLabel: '成本', resultLabel: '定價',
        why: r => `「成本加上${r.words ? r.text : ` ${r.text}`}」是拿成本來比較，所以成本是基準量，加上去的錢是比較量，定價是兩量之和。`,
        fwd: (s, b, r) => `${s.shop}把${s.item}按照成本加上${r.words ? r.text : ` ${r.text} `}作為定價，一${s.cl}${s.item}的成本是 ${b} 元，定價是多少元？`,
        rev: (s, t, r) => `${s.shop}把${s.item}按照成本加上${r.words ? r.text : ` ${r.text} `}作為定價，一${s.cl}${s.item}的定價是 ${t} 元，成本是多少元？`,
        setup: pick => { const [item, cl] = pick(SHOP_ITEMS); return { item, cl, shop: pick(['商店', '超市', '電器行', '服飾店']) }; } },
      { name: 'price', ratio: (rnd, pick) => ratio(`${pick([10, 20, 30, 40, 50])}%`), lo: 20, hi: 200, round: 10, unit: '元', baseLabel: '原本的價錢', resultLabel: '現在的價錢',
        why: r => `「漲價 ${r.text}」是和原本的價錢比較，所以原本的價錢是基準量，現在的價錢是兩量之和。`,
        fwd: (s, b, r) => `原本一公斤賣 ${b} 元的${s.fruit}，最近漲價 ${r.text}，現在一公斤${s.fruit}賣多少元？`,
        rev: (s, t, r) => `${s.fruit}最近漲價 ${r.text}，現在一公斤賣 ${t} 元，原本一公斤賣多少元？`,
        setup: pick => ({ fruit: pick(['葡萄', '香蕉', '草莓', '芭樂']) }) },
      { name: 'sales', ratio: (rnd, pick) => ratio(`${pick([5, 8, 12, 15, 20, 25])}%`), lo: 200, hi: 3000, round: 100, unit: '件', baseLabel: '上個月的銷售數量', resultLabel: '這個月的銷售數量',
        why: r => `「比上個月多了 ${r.text}」是和上個月比較，所以上個月的銷售數量是基準量。`,
        fwd: (s, b, r) => `服飾店上個月賣出 ${b} 件 T 恤，這個月的銷售數量比上個月多了 ${r.text}，這個月賣出多少件 T 恤？`,
        rev: (s, t, r) => `服飾店這個月賣出 ${t} 件 T 恤，比上個月多了 ${r.text}，上個月賣出多少件 T 恤？`,
        setup: () => ({}) },
      { name: 'volume', ratio: (rnd, pick) => ratio(`${pick([20, 25, 40, 50])}%`), lo: 200, hi: 1200, round: 5, unit: '毫升', baseLabel: '原有容量', resultLabel: '新包裝的容量',
        why: r => `「加量 ${r.text}」是和原有容量比較，所以原有容量是基準量。`,
        fwd: (s, b, r) => `${s.drink}原有容量 ${b} 毫升，現在加量 ${r.text}，新包裝的容量是多少毫升？`,
        rev: (s, t, r) => `${s.drink}加量 ${r.text} 後，新包裝的容量是 ${t} 毫升，原有容量是多少毫升？`,
        setup: pick => ({ drink: pick(['快跑運動飲料', '鳩鳩果汁', '特濃鮮奶']) }) }
    ],
    diff: [
      { name: 'spend', ratio: (rnd, pick) => ratio(`${pick([20, 25, 30, 35, 40, 45, 60])}%`), lo: 1000, hi: 9000, round: 100, unit: '元', baseLabel: '全部的壓歲錢', resultLabel: '剩下的錢',
        why: r => `「用其中的 ${r.text}」是和全部的壓歲錢比較，所以全部的壓歲錢是基準量，剩下的錢是兩量之差。`,
        fwd: (s, b, r) => `${s.who}有壓歲錢 ${b} 元，他用其中的 ${r.text} 買了一臺隨身碟後，還剩下多少元？`,
        rev: (s, t, r) => `${s.who}用壓歲錢的 ${r.text} 買了一臺隨身碟後，還剩下 ${t} 元，${s.who}原本有多少元壓歲錢？`,
        setup: pick => ({ who: pick(['堂哥', '表弟', '阿鳩']) }) },
      { name: 'book', ratio: (rnd, pick) => ratio(pick(['1/4', '3/4', '2/5', '3/5', '3/7', '4/7', '5/8', '3/8', '4/9', '5/12'])), lo: 120, hi: 720, round: 1, unit: '頁', baseLabel: '全書的頁數', resultLabel: '剩下的頁數',
        why: r => `「看完全部的 ${r.text}」是和全書比較，所以全書的頁數是基準量，剩下的頁數是兩量之差。`,
        fwd: (s, b, r) => `一本故事書有 ${b} 頁，${s.who}已經看完全部的 ${r.text}，還剩下幾頁沒看？`,
        rev: (s, t, r) => `${s.who}已經看完一本故事書全部的 ${r.text}，還剩下 ${t} 頁沒看，這本故事書共有幾頁？`,
        setup: pick => ({ who: pick(['立昌', '小鳩', '信育']) }) },
      { name: 'save', ratio: (rnd, pick) => ratio(`${pick([60, 65, 70, 75, 80, 85])}%`), lo: 300000, hi: 900000, round: 10000, unit: '元', baseLabel: '全部收入', resultLabel: '存下來的錢',
        why: r => `「支出占全部收入的 ${r.text}」是和全部收入比較，所以全部收入是基準量，存下來的錢是兩量之差。`,
        fwd: (s, b, r) => `爸爸去年收入 ${b} 元，支出占全部收入的 ${r.text}，剩下的部分都存起來了，爸爸去年存了多少元？`,
        rev: (s, t, r) => `爸爸去年的支出占全部收入的 ${r.text}，剩下的 ${t} 元都存起來了，爸爸去年收入多少元？`,
        setup: () => ({}) },
      { name: 'decrease', ratio: (rnd, pick) => ratio(`${pick([2, 3, 4, 5, 6, 8])}%`), lo: 1000, hi: 4000, round: 100, unit: '人', baseLabel: '去年的人數', resultLabel: '今年的人數',
        why: r => `「比去年少 ${r.text}」是和去年比較，所以去年的人數是基準量，今年的人數是兩量之差。`,
        fwd: (s, b, r) => `去年參加${s.event}的有 ${b} 人，今年參加的人數比去年少 ${r.text}，今年參加的有幾人？`,
        rev: (s, t, r) => `今年參加${s.event}的有 ${t} 人，比去年的參加人數少 ${r.text}，去年參加的有幾人？`,
        setup: pick => ({ event: pick(['馬拉松路跑活動', '親子健走活動', '數學營']) }) },
      { name: 'discount', ratio: (rnd, pick) => zhe(pick([2, 3, 4, 5, 6, 7, 8, 9])), lo: 150, hi: 600, round: 10, unit: '元', baseLabel: '原價', resultLabel: '折扣前後相差的錢', compLabel: '折扣後的價錢',
        why: r => `「打${r.text}」是和原價比較，折扣後的價錢是原價的 ${r.ft} 倍，所以原價是基準量。`,
        fwd: (s, b, r) => `一本故事書原價 ${b} 元，打${r.text}出售，折扣前和折扣後的價錢相差多少元？`,
        rev: (s, t, r) => `${s.who}買了一本打${r.text}的故事書，折扣前和折扣後的價錢相差 ${t} 元，這本故事書的原價和折扣後的價錢各是多少元？`,
        askComp: true, setup: pick => ({ who: pick(['小丸子', '小鳩', '阿特']) }) },
      { name: 'flood', ratio: (rnd, pick) => ratio(`${pick([110, 120, 125, 130, 150])}%`), lo: 20, hi: 120, round: 10, unit: '元', baseLabel: '水災前的價錢', resultLabel: '水災前後相差的錢',
        why: r => `「水災後是水災前的 ${r.text}」是拿水災前的價錢來比較，所以水災前的價錢是基準量。`,
        fwd: (s, b, r) => `水災過後，${s.veg}的價錢是水災前的 ${r.text}。水災前${s.veg} 1 公斤 ${b} 元，水災前、後 1 公斤的價錢相差多少元？`,
        rev: (s, t, r) => `水災過後，${s.veg}的價錢是水災前的 ${r.text}，如果水災前、後${s.veg} 1 公斤的價錢相差 ${t} 元，那麼水災前${s.veg} 1 公斤多少元？`,
        setup: pick => ({ veg: pick(['菠菜', '高麗菜', '空心菜']) }) }
    ]
  };

  /* ---------- 工具 ---------- */
  function tools(rng) {
    const rnd = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = list => list[rnd(0, list.length - 1)];
    const shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { rnd, pick, shuffle };
  }
  const lcm = (a, b) => a / gcd(a, b) * b;
  function baseValue(t, r, lo, hi, round = 1) {
    const m = lcm(r.v.d, round);
    const kmin = Math.max(1, Math.ceil(lo / m)), kmax = Math.max(kmin, Math.floor(hi / m));
    return m * t.rnd(kmin, kmax);
  }
  const op = (sym, a, b) => sym === '×' ? mul(a, b) : div(a, b);
  /* 一組四個算式：×／÷ 兩種運算 × 兩種括號 */
  function bracketSet(kind, r) {
    const plus = { text: `(1＋${r.ft})`, v: add(ONE, r.v), name: '1＋比值' };
    const minus = less(ONE, r.v) ? { text: `(${r.ft}－1)`, v: sub(r.v, ONE), name: '比值－1' } : { text: `(1－${r.ft})`, v: sub(ONE, r.v), name: '1－比值' };
    return kind === 'sum' ? [plus, minus] : [minus, plus];
  }
  function formulaOptions(s) {
    const g = s.given ? show(s.given, s.amountStyle) : '', want = s.dir === 'fwd' ? '×' : '÷';
    if (s.kind === 'value') {
      const R = s.r.ft, list = ({
        times: () => [[`${show(s.compV, s.amountStyle)}÷${show(s.baseV, s.amountStyle)}`, div(s.compV, s.baseV)], [`${show(s.baseV, s.amountStyle)}÷${show(s.compV, s.amountStyle)}`, div(s.baseV, s.compV)], [`${show(s.compV, s.amountStyle)}×${show(s.baseV, s.amountStyle)}`, mul(s.compV, s.baseV)], [`${show(s.compV, s.amountStyle)}－${show(s.baseV, s.amountStyle)}`, sub(s.compV, s.baseV)]],
        comp: () => [[`${g}×${R}`, mul(s.given, s.r.v)], [`${g}÷${R}`, div(s.given, s.r.v)], [`${R}÷${g}`, div(s.r.v, s.given)], [`${g}＋${R}`, add(s.given, s.r.v)]],
        base: () => [[`${g}÷${R}`, div(s.given, s.r.v)], [`${g}×${R}`, mul(s.given, s.r.v)], [`${R}÷${g}`, div(s.r.v, s.given)], [`${g}－${R}`, sub(s.given, s.r.v)]]
      })[s.ask]();
      return list.map(([text, v], i) => ({ text, v, correct: i === 0 }));
    }
    const [right, other] = bracketSet(s.kind, s.r);
    return [[want, right], [want === '×' ? '÷' : '×', right], [want, other], [want === '×' ? '÷' : '×', other]]
      .map(([sym, br], i) => ({ text: `${g}${sym}${br.text}`, v: op(sym, s.given, br.v), correct: i === 0, bracket: br }));
  }

  /* ---------- 情境產生 ---------- */
  function pairScenario(kind, dir, t, opts = {}) {
    const c = t.pick(PAIRS);
    let r;
    if (kind === 'value' && opts.ask === 'times') r = ratio(t.pick([...GT, ...LT].filter(x => !/%/.test(x))));
    else r = ratio(t.pick(t.rnd(0, 1) ? GT : LT));
    const big = less(ONE, r.v);
    let [compName, baseName] = c.ordered ? (big ? c.names : [c.names[1], c.names[0]]) : t.shuffle(c.names);
    const baseV = F(baseValue(t, r, c.lo, c.hi)), compV = mul(baseV, r.v);
    return { context: c, r, baseName, compName, baseV, compV, unit: c.unit, amountStyle: 'auto', prefix: c.prefix || '' };
  }
  function fractionScenario(t, ask) {
    const c = t.pick(FRACTION_PAIRS);
    const d = t.pick([2, 3, 4, 5, 6, 8]), whole = t.rnd(0, 2), n = t.rnd(1, d - 1);
    const baseV = F(whole * d + n, d);
    const r = ratio(t.pick(ask === 'times' ? ['1 1/4', '1 3/4', '2 1/2', '3 1/3', '1 2/3', '3', '4', '2 3/5', '3/4', '2/5'] : ['1 1/4', '1 3/4', '2 1/2', '1 5/9', '4 2/5', '1 2/3', '3', '1.5', '3/4', '2/3']));
    return { context: c, r, baseName: c.names[1], compName: c.names[0], baseV, compV: mul(baseV, r.v), unit: c.unit, amountStyle: 'frac', prefix: '' };
  }

  function makeValue(t, variant) {
    const ask = ['times', 'comp', 'base'][variant % 3];
    const s = t.rnd(0, 2) === 0 ? fractionScenario(t, ask) : pairScenario('value', 'fwd', t, { ask });
    const c = s.context, st = s.amountStyle;
    s.kind = 'value'; s.ask = ask; s.dir = ask === 'base' ? 'rev' : 'fwd';
    const B = show(s.baseV, st), C = show(s.compV, st);
    if (ask === 'times') {
      s.text = `${s.prefix}${c.has(s.compName, C)}，${c.has(s.baseName, B)}，${c.askTimes(s.compName, s.baseName)}`;
      s.answer = [{ label: '比值（倍數）', v: div(s.compV, s.baseV), unit: '倍', rational: true }];
    } else if (ask === 'comp') {
      s.given = s.baseV;
      s.text = `${s.prefix}${c.has(s.baseName, B)}，${c.rel(s.compName, s.baseName, s.r)}，${c.askOne(s.compName)}`;
      s.answer = [{ label: c.label(s.compName), v: s.compV, unit: c.unit }];
    } else {
      s.given = s.compV;
      s.text = `${s.prefix}${c.has(s.compName, C)}，${c.rel(s.compName, s.baseName, s.r)}，${c.askOne(s.baseName)}`;
      s.answer = [{ label: c.label(s.baseName), v: s.baseV, unit: c.unit }];
    }
    s.baseLabel = c.label(s.baseName); s.otherLabel = c.label(s.compName);
    s.why = `題目是拿${s.baseName}當標準來比較（${s.compName}是${s.baseName}的幾倍），所以${s.baseLabel}是基準量，${s.otherLabel}是比較量。`;
    return s;
  }

  function makeSumDiff(kind, dir, t, variant = 0, allowBoth = true) {
    const useBusiness = variant % 2 === 1;
    if (useBusiness) {
      const ctx = t.pick(BUSINESS[kind]), r = ctx.ratio(t.rnd, t.pick), setup = ctx.setup(t.pick);
      const baseV = F(baseValue(t, r, ctx.lo, ctx.hi, ctx.round)), compV = mul(baseV, r.v);
      const total = kind === 'sum' ? add(baseV, compV) : less(ONE, r.v) ? sub(compV, baseV) : sub(baseV, compV);
      const s = { kind, dir, r, baseV, compV, total, unit: ctx.unit, amountStyle: 'auto', business: ctx.name,
        baseLabel: ctx.baseLabel, otherLabel: ctx.compLabel || ctx.resultLabel, why: ctx.why(r) };
      if (dir === 'fwd') {
        s.given = baseV; s.text = ctx.fwd(setup, show(baseV), r);
        s.answer = [{ label: ctx.resultLabel, v: total, unit: ctx.unit }];
      } else {
        s.given = total; s.text = ctx.rev(setup, show(total), r);
        s.answer = [{ label: ctx.baseLabel, v: baseV, unit: ctx.unit }];
        if (ctx.askComp && allowBoth) s.answer.push({ label: ctx.compLabel, v: compV, unit: ctx.unit, second: true });
        else if (ctx.askComp) s.text = s.text.replace('這本故事書的原價和折扣後的價錢各是多少元？', '這本故事書的原價是多少元？');
      }
      return s;
    }
    const s = pairScenario(kind, dir, t), c = s.context;
    s.kind = kind; s.dir = dir;
    s.total = kind === 'sum' ? add(s.baseV, s.compV) : less(ONE, s.r.v) ? sub(s.compV, s.baseV) : sub(s.baseV, s.compV);
    const [x, y] = s.context.names, B = show(s.baseV), T = show(s.total);
    const relation = c.rel(s.compName, s.baseName, s.r);
    if (dir === 'fwd') {
      s.given = s.baseV;
      s.text = `${s.prefix}${c.has(s.baseName, B)}，${relation}，${kind === 'sum' ? c.askSum(x, y) : c.askDiff(x, y)}`;
      s.answer = [{ label: kind === 'sum' ? '兩量之和' : '兩量之差', v: s.total, unit: c.unit }];
    } else {
      s.given = s.total;
      const both = allowBoth && t.rnd(0, 1) === 1;
      s.text = `${s.prefix}${kind === 'sum' ? c.knowSum(x, y, T) : c.knowDiff(x, y, T)}，${relation}，${both ? c.askBoth(x, y) : c.askOne(s.baseName)}`;
      s.answer = [{ label: c.label(s.baseName), v: s.baseV, unit: c.unit }];
      if (both) s.answer.push({ label: c.label(s.compName), v: s.compV, unit: c.unit, second: true });
    }
    s.baseLabel = c.label(s.baseName); s.otherLabel = c.label(s.compName);
    s.why = `「${relation}」是拿${s.baseName}當標準來比較，所以${s.baseLabel}是基準量，${s.otherLabel}是比較量。`;
    return s;
  }

  function scenario(type, t, variant = 0, allowBoth = true) {
    if (type === 'value') return makeValue(t, variant);
    const kind = type.startsWith('sum') ? 'sum' : 'diff', dir = type.endsWith('Base') ? 'rev' : 'fwd';
    return makeSumDiff(kind, dir, t, variant, allowBoth);
  }

  /* ---------- 文字說明 ---------- */
  function ruleText(s) {
    if (s.kind === 'value') return { times: '比值＝比較量÷基準量', comp: '比較量＝基準量×比值', base: '基準量＝比較量÷比值' }[s.ask];
    const br = bracketSet(s.kind, s.r)[0].name, name = s.kind === 'sum' ? '兩量之和' : '兩量之差';
    return s.dir === 'fwd' ? `${name}＝基準量×(${br})` : `基準量＝${name}÷(${br})`;
  }
  function formulaHint(s) {
    if (s.kind === 'value') return s.ask === 'times' ? '問「A 是 B 的幾倍」，就是求比值：比較量÷基準量。' : s.ask === 'comp' ? '已知基準量和比值，求比較量：用乘法。' : '已知比較量和比值，反推基準量：用除法。';
    const known = s.dir === 'fwd' ? '已知基準量，用乘法' : `已知${s.kind === 'sum' ? '兩量之和' : '兩量之差'}，反推基準量，用除法`;
    const br = s.kind === 'sum' ? '求「和」用 (1＋比值)' : less(ONE, s.r.v) ? '比值＞1 時，「差」用 (比值－1)' : '比值＜1 時，「差」用 (1－比值)';
    return `${known}；${br}。百分率、成數、折數可以先換成小數。`;
  }
  function solutionText(s) {
    const f = formulaOptions(s).find(o => o.correct), main = s.answer[0];
    let text = `${ruleText(s)}，${f.text}＝`;
    if (f.bracket) text += `${show(s.given, s.amountStyle)}${s.dir === 'fwd' ? '×' : '÷'}${show(f.bracket.v, s.r.style === 'frac' ? 'frac' : 'auto')}＝`;
    text += `${show(main.v, s.amountStyle)}${main.unit === '倍' ? ' 倍' : ` ${main.unit}`}。`;
    const second = s.answer.find(a => a.second);
    if (second) text += `${second.label}＝${show(s.baseV, s.amountStyle)}×${s.r.ft}＝${show(second.v, s.amountStyle)} ${second.unit}。`;
    return text;
  }

  /* ---------- 題目包裝 ---------- */
  function newQuestion(type, t) {
    let id = 0;
    const q = { type: 'baseCompare', topic: type, category: categories[type], steps: [], finalFields: [] };
    q.field = (label, expected, kind = 'number', extra = {}) => ({ key: `f${id++}`, label, expected, type: kind, ...extra });
    q.step = (title, fields, explanation, hint, pattern = fields.map(f => `{${f.key}}`).join('　')) => { q.steps.push({ title, fields, pattern, explanation, hint }); };
    q.t = t;
    return q;
  }
  function choiceField(q, label, options, correctIndex) {
    const order = q.t.shuffle(options.map((o, i) => i));
    const marks = ['①', '②', '③', '④', '⑤'];
    const keys = order.map((_, i) => String(i + 1)), labels = {};
    order.forEach((src, i) => { labels[keys[i]] = `${marks[i]} ${options[src]}`; });
    return q.field(label, keys[order.indexOf(correctIndex)], 'decision', { options: keys, optionLabels: labels });
  }
  function answerFields(q, s) {
    return s.answer.map(a => {
      const exact = a.v;
      if (a.rational || exact.d !== 1) return q.field(a.unit === '倍' ? a.label : `${a.label}（${a.unit}）`, exact, 'rational', { unit: a.unit, requirement: '可填小數或分數' });
      return q.field(a.label, exact.n, 'number', { unit: a.unit });
    });
  }
  function finish(q, s) {
    q.text = s.text; q.textHtml = RQ.displayText(q.text);
    q.explanation = q.steps.map(st => st.explanation).join('\n');
    q.scenario = s; delete q.field; delete q.step; delete q.t;
    return q;
  }

  function stepQuestion(type, t, variant) {
    const s = scenario(type, t, variant), q = newQuestion(type, t);
    const baseOptions = [s.baseLabel, s.otherLabel];
    const baseField = choiceField(q, '基準量是', baseOptions, 0);
    q.step('判斷基準量', [baseField], `${s.why}`, s.business ? '加成、漲價、減少幾%、用掉全部的幾分之幾、打幾折，都是跟「原來的量」比較，原來的量就是基準量。' : '找「＿是＿的幾倍」：「的幾倍」前面，被拿來當標準比較的量，就是基準量。');
    const options = formulaOptions(s);
    const formulaField = choiceField(q, '正確算式', options.map(o => o.text), options.findIndex(o => o.correct));
    q.step('選出正確算式', [formulaField], `${ruleText(s)}，所以列式為 ${options.find(o => o.correct).text}。`, formulaHint(s));
    const fields = answerFields(q, s);
    q.step('算出答案', fields, solutionText(s), '先算括號裡的數，再做乘除；帶分數可以先化成假分數再計算。');
    q.finalFields = fields;
    return finish(q, s);
  }

  /* 是非題 */
  const CONCEPTS = [
    ['比較量÷基準量＝比值', true, '比值＝比較量÷基準量。'],
    ['基準量÷比較量＝比值', false, '比值＝比較量÷基準量，被除數和除數不能對調。'],
    ['兩量之和＝基準量×(1＋比值)', true, '兩量之和＝基準量＋基準量×比值＝基準量×(1＋比值)。'],
    ['兩量之和＝比較量×(1＋比值)', false, '要乘的是基準量：兩量之和＝基準量×(1＋比值)。'],
    ['若比值＞1，則兩量之差＝基準量×(比值－1)', true, '比值＞1 時比較量比較大：兩量之差＝基準量×比值－基準量＝基準量×(比值－1)。'],
    ['若比值＞1，則兩量之差＝基準量×(1－比值)', false, '比值＞1 時，1－比值會小於 0；應該是基準量×(比值－1)。'],
    ['若比值＜1，則兩量之差＝基準量×(1－比值)', true, '比值＜1 時基準量比較大：兩量之差＝基準量－基準量×比值＝基準量×(1－比值)。'],
    ['若比值＜1，則兩量之差＝基準量×(比值－1)', false, '比值＜1 時，比值－1 會小於 0；應該是基準量×(1－比值)。'],
    ['基準量＝兩量之和÷(1＋比值)', true, '兩量之和＝基準量×(1＋比值)，反過來就是除以 (1＋比值)。'],
    ['基準量＝兩量之和×(1＋比值)', false, '已知兩量之和反推基準量要用除法：基準量＝兩量之和÷(1＋比值)。'],
    ['當比較量＞基準量時，比值＞1', true, '比較量÷基準量，被除數比較大，商就大於 1。'],
    ['當比較量＜基準量時，比值＞1', false, '比較量÷基準量，被除數比較小，商會小於 1。']
  ];
  function judgeQuestion(t, variant) {
    const q = newQuestion('judge', t);
    let statement, truth, explanation, s;
    if (variant % 3 === 2) {
      [statement, truth, explanation] = t.pick(CONCEPTS);
      q.text = `判斷對錯：${statement}。`;
    } else {
      s = scenario(t.pick(['value', 'sum', 'sumBase', 'diff', 'diffBase']), t, t.rnd(0, 5), false);
      const options = formulaOptions(s), right = options[0], rightV = s.answer[0].v;
      truth = t.rnd(0, 1) === 1;
      let shown = right.text, value = rightV;
      if (!truth) {
        const wrong = options.slice(1).filter(o => o.v.n > 0 && !eq(o.v, rightV));
        const nice = wrong.filter(o => terminatingDigits(o.v) <= 3);
        const w = t.pick(nice.length ? nice : wrong);
        if (t.rnd(0, 2) === 0) value = w.v; else { shown = w.text; value = w.v; }
      }
      statement = `${shown}＝${show(value, s.amountStyle)}`;
      q.text = `「${s.text}」上面敘述可以列式為 ${statement}。`;
      explanation = truth ? `${ruleText(s)}，列式 ${right.text}＝${show(rightV, s.amountStyle)} 正確。` :
        shown === right.text ? `列式正確，但計算錯了：${right.text}＝${show(rightV, s.amountStyle)}，不是 ${show(value, s.amountStyle)}。` :
          `列式錯了。${ruleText(s)}，應為 ${right.text}＝${show(rightV, s.amountStyle)}。`;
    }
    const f = q.field('這個敘述', truth ? 'yes' : 'no', 'decision', { options: ['yes', 'no'], optionLabels: { yes: '○ 正確', no: '× 錯誤' } });
    q.step('判斷對錯', [f], `${truth ? '○ 正確。' : '× 錯誤。'}${explanation}`, '先找出基準量，再想：已知什麼？求和還是差？要乘還是除？');
    q.finalFields = [f];
    q.textHtml = RQ.displayText(q.text);
    q.explanation = q.steps[0].explanation; q.scenario = s || null;
    delete q.field; delete q.step; delete q.t;
    return q;
  }

  /* 選擇題 */
  function choiceQuestion(t, variant) {
    const q = newQuestion('choice', t), kindOf = variant % 4;
    let options, correct, explanation, s = null;
    if (kindOf === 3) {
      if (t.rnd(0, 1)) {
        const which = t.rnd(0, 2), cond = ['基準量＜比較量', '基準量＞比較量', '基準量＝比較量'][which];
        q.text = `當${cond}時，下面敘述何者正確？`;
        options = ['比值＞1', '比值＜1', '比值＝1', '比值＝0']; correct = which;
        explanation = `比值＝比較量÷基準量；${cond}，所以${options[which]}。`;
      } else {
        const k = t.rnd(3, 9), sum = t.rnd(0, 1) === 1;
        q.text = `甲數是乙數的 ${k} 倍，甲、乙兩數${sum ? '合起來是' : '相差'}多少？`;
        options = [`甲數的 ${k - 1} 倍`, `甲數的 ${k + 1} 倍`, `乙數的 ${k - 1} 倍`, `乙數的 ${k + 1} 倍`]; correct = sum ? 3 : 2;
        explanation = `乙數是基準量。${sum ? `兩數和＝乙數×(1＋${k})＝乙數的 ${k + 1} 倍` : `兩數差＝乙數×(${k}－1)＝乙數的 ${k - 1} 倍`}。`;
      }
    } else {
      s = scenario(t.pick(['value', 'sum', 'sumBase', 'diff', 'diffBase']), t, t.rnd(0, 5), false);
      const list = formulaOptions(s);
      if (kindOf === 2) {
        const unit = s.answer[0].unit === '倍' ? ' 倍' : ` ${s.answer[0].unit}`;
        const values = [];
        list.forEach((o, i) => { if (o.v.n > 0 && (i === 0 || o.v.d <= 100) && !values.some(v => eq(v, o.v))) values.push(o.v); });
        let bump = 1;
        while (values.length < 4) { const v = add(values[0], F(bump * (values[0].d === 1 ? Math.max(1, Math.round(values[0].n / 10)) : 1), 1)); bump++; if (!values.some(x => eq(x, v))) values.push(v); }
        q.text = s.text;
        options = values.slice(0, 4).map(v => `${show(v, s.amountStyle)}${unit}`); correct = 0;
        explanation = `${ruleText(s)}，${list[0].text}＝${show(list[0].v, s.amountStyle)}${unit}。`;
      } else {
        q.text = `「${s.text}」這道題目的正確算式為何？`;
        options = list.map(o => o.text); correct = 0;
        explanation = `${ruleText(s)}，所以正確算式是 ${list[0].text}。`;
      }
    }
    const f = choiceField(q, '正確選項', options, correct);
    q.step('選出正確答案', [f], explanation, '先找出基準量，再判斷是求和、求差，還是反推基準量。');
    q.finalFields = [f];
    q.textHtml = RQ.displayText(q.text);
    q.explanation = explanation; q.scenario = s;
    delete q.field; delete q.step; delete q.t;
    return q;
  }

  function generate(type, settings, rng = Math.random, variant) {
    const t = tools(rng);
    if (type === 'mixed') type = t.pick(PRACTICE_TYPES);
    if (!PRACTICE_TYPES.includes(type)) throw new Error('Unknown question category');
    const v = variant === undefined ? t.rnd(0, 11) : variant;
    if (type === 'judge') return judgeQuestion(t, v);
    if (type === 'choice') return choiceQuestion(t, v);
    return stepQuestion(type, t, v);
  }
  function buildExam(settings, rng = Math.random) {
    const t = tools(rng), questions = [], offset = t.rnd(0, 11);
    EXAM_TYPES.forEach((type, i) => {
      let q;
      for (let tries = 0; tries < 20; tries++) {
        q = generate(type, settings, rng, offset + i + tries);
        if (!questions.some(old => old.text === q.text)) break;
      }
      questions.push(q);
    });
    return t.shuffle(questions);
  }
  function format(a) { return typeof a === 'object' && a ? fractionText(a) : String(a); }
  const api = { ...RQ, categories, PRACTICE_TYPES, EXAM_TYPES, defaultType: 'value', generate, buildExam, format,
    F, add, sub, mul, div, show, ratio, cheng, zhe, formulaOptions, BUSINESS, PAIRS };
  api.correct = RQ.correct;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { api.settings = () => null; root.PaperQuestions = api; }
})(typeof window !== 'undefined' ? window : globalThis);
