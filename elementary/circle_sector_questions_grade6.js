/* 小六數學：圓形與扇形。圓周率一律用 3.14，所有數值用最簡分數 {n, d} 精確計算。 */
(function (root) {
  'use strict';
  const RQ = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;
  const categories = {
    area: '圓的周長與面積', ratio: '倍率問題', sector: '扇形面積', sectorWhole: '由圓面積求扇形',
    shaded: '陰影面積', arc: '弧長與扇形周長', perimeter: '複合圖形周長', judge: '是非判斷', choice: '選擇題'
  };
  const PRACTICE_TYPES = Object.keys(categories);
  const EXAM_TYPES = ['area', 'ratio', 'sector', 'sectorWhole', 'arc', 'shaded', 'shaded', 'perimeter', 'judge', 'choice'];
  const SHADED_COUNT = 12, PERIMETER_COUNT = 6;

  /* ---------- 分數運算 ---------- */
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const F = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => F(a.n * b.d, a.d * b.n);
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const less = (a, b) => a.n * b.d < b.n * a.d;
  const PI = F(157, 50);
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
  /* 有限小數（三位以內）用小數，其餘用分數 */
  const show = a => a.d === 1 ? String(a.n) : terminatingDigits(a) <= 3 ? decimalText(a) : fractionText(a);
  /* 算式裡的數：分數一律寫成 a/b（不寫帶分數），算式才能計算 */
  const num = a => a.d === 1 ? String(a.n) : terminatingDigits(a) <= 3 ? decimalText(a) : `${a.n}/${a.d}`;
  const nice = (a, allowFraction) => a.n > 0 && (terminatingDigits(a) <= 3 || (allowFraction && a.d <= 12));
  /* 顯示給學生看的數值：一般最多一位小數；倍數題可以是分數 */
  const okValue = (v, s) => (s && s.answer && s.answer.rational ? nice(v, true) : v.n > 0 && terminatingDigits(v) <= 1);
  const N = x => typeof x === 'object' ? x : F(Math.round(x * 1000), 1000);

  /* ---------- 算式計算（× ÷ ＋ － 括號，由左到右） ---------- */
  function evaluate(expr) {
    const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/＋/g, '+').replace(/－/g, '-').replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/\s+/g, '');
    let i = 0;
    const fail = () => { throw new Error(`Bad expression: ${expr}`); };
    function number() {
      const m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) fail();
      i += m[0].length; const [w, f = ''] = m[0].split('.');
      return F(Number(w + f), 10 ** f.length);
    }
    function factor() { if (s[i] === '(') { i++; const v = sum(); if (s[i] !== ')') fail(); i++; return v; } return number(); }
    function term() { let v = factor(); while (s[i] === '*' || s[i] === '/') { const o = s[i++], b = factor(); v = o === '*' ? mul(v, b) : div(v, b); } return v; }
    function sum() { let v = term(); while (s[i] === '+' || s[i] === '-') { const o = s[i++], b = term(); v = o === '+' ? add(v, b) : sub(v, b); } return v; }
    const v = sum(); if (i !== s.length) fail(); return v;
  }

  /* ---------- 工具 ---------- */
  function tools(rng) {
    const rnd = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = list => list[rnd(0, list.length - 1)];
    const shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { rnd, pick, shuffle };
  }

  /* ---------- 附圖（SVG，僅供示意，不依比例） ---------- */
  const GRAY = '#c5cfdb', LINE = '#334155', WHITE = '#fff';
  const f2 = x => Math.round(x * 10) / 10;
  const svg = (body, w = 240, h = 240) => `<svg class="q-figure" viewBox="0 0 ${w} ${h}" role="img" aria-label="題目附圖（示意圖）" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const stroke = `stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"`;
  const circle = (cx, cy, r, fill) => `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${fill}" ${stroke}/>`;
  const poly = (pts, fill) => `<polygon points="${pts.map(p => `${f2(p[0])},${f2(p[1])}`).join(' ')}" fill="${fill}" ${stroke}/>`;
  const rect = (x, y, w, h, fill) => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${fill}" ${stroke}/>`;
  const line = (x1, y1, x2, y2, dash = true) => `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${LINE}" stroke-width="1.2"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
  const label = (x, y, text, anchor = 'middle') => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="${anchor}" font-size="14" font-weight="700" fill="#1e293b" font-family="sans-serif">${text}</text>`;
  const dot = (x, y) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="2.2" fill="${LINE}"/>`;
  const pt = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy - r * Math.sin(deg * Math.PI / 180)];
  /* 數學角度（逆時針、0° 向右）從 a0 到 a1 的扇形 */
  function sector(cx, cy, r, a0, a1, fill) {
    const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1), large = a1 - a0 > 180 ? 1 : 0;
    return `<path d="M${f2(cx)} ${f2(cy)} L${f2(x0)} ${f2(y0)} A${f2(r)} ${f2(r)} 0 ${large} 0 ${f2(x1)} ${f2(y1)} Z" fill="${fill}" ${stroke}/>`;
  }
  /* 兩段半徑 r 的弧圍成的葉形 */
  const leaf = (p, q, r, fill = GRAY) => `<path d="M${f2(p[0])} ${f2(p[1])} A${f2(r)} ${f2(r)} 0 0 0 ${f2(q[0])} ${f2(q[1])} A${f2(r)} ${f2(r)} 0 0 0 ${f2(p[0])} ${f2(p[1])} Z" fill="${fill}" ${stroke}/>`;

  const figSquareQuarter = a => svg(rect(30, 30, 160, 160, GRAY) + sector(190, 190, 160, 90, 180, WHITE) + label(110, 212, `${a}cm`) + label(198, 115, `${a}cm`, 'start'), 250, 225);
  const figLeaf = a => svg(`<rect x="40" y="30" width="160" height="160" fill="none" stroke="${LINE}" stroke-width="1.2" stroke-dasharray="4 3"/>` + leaf([40, 190], [200, 30], 160) + label(120, 212, `${a}cm`) + label(208, 115, `${a}cm`, 'start'), 255, 225);
  function figTriangleSectors(side) {
    const h = 180 * Math.sqrt(3) / 2, A = [120, 25], B = [30, 25 + h], C = [210, 25 + h];
    return svg(sector(B[0], B[1], 90, 0, 60, GRAY) + sector(C[0], C[1], 90, 120, 180, GRAY) + sector(A[0], A[1], 90, 240, 300, GRAY) +
      `<polygon points="${[A, B, C].map(p => p.map(f2).join(',')).join(' ')}" fill="none" ${stroke}/>` +
      label(60, 95, `${side}cm`, 'end') + label(180, 95, `${side}cm`, 'start') + label(120, 25 + h + 20, `${side}cm`), 240, 25 + h + 30);
  }

  /* ---------- 步驟題的共同包裝 ---------- */
  function finishScenario(s, t) {
    s.answer.v = evaluate(s.formulas[0]);
    const seen = new Set(), values = [];
    s.options = [];
    for (const text of s.formulas) {
      if (seen.has(text)) continue;
      const v = evaluate(text);
      if (s.options.length && values.some(x => eq(x, v))) continue;
      seen.add(text); values.push(v); s.options.push({ text, v, correct: s.options.length === 0 });
      if (s.options.length === 4) break;
    }
    if (s.options.length < 4) return null;
    /* 最終答案：整數或小數點後一位（倍數題可以是分數） */
    if (s.answer.rational ? !nice(s.answer.v, true) : !(s.answer.v.n > 0 && terminatingDigits(s.answer.v) <= 1)) return null;
    s.keys = s.keys || (s.key ? [s.key] : []);
    /* 中間步驟的數也不要兩位以上小數（分數形式的倍數可以） */
    if (s.keys.some(k => !k.simplest && (!nice(k.v, true) || (terminatingDigits(k.v) > 1 && terminatingDigits(k.v) !== Infinity)))) return null;
    return s;
  }
  function retry(build, t) {
    for (let i = 0; i < 6000; i++) { const b = build(t); const s = b && finishScenario(b, t); if (s) return s; }
    throw new Error('Could not build a question');
  }

  /* ---------- ① 圓的周長與面積 ---------- */
  const AREA_RULE = '圓面積＝半徑×半徑×3.14；圓周長＝直徑×3.14';
  function areaScenario(t, variant) {
    return retry(() => {
      const kind = variant % 6;
      const halves = t.rnd(0, 3) === 0;
      const r = halves ? F(t.rnd(0, 14) * 2 + 1, 2) : F(t.rnd(2, 30));
      const d = mul(r, F(2)), C = mul(d, PI), R = num(r), D = num(d);
      const s = { kind: 'area', allowFraction: false };
      const big = t.rnd(0, 1) === 1, u = big ? '公尺' : '公分';
      s.key = { title: '求半徑', label: '半徑', v: r, unit: u, hint: '半徑＝直徑÷2；直徑＝周長÷3.14。' };
      if (kind === 0 || kind === 3) {
        const thing = kind === 0 ? `一個直徑是 ${D} ${u}的圓` : t.pick([`陳阿姨今天做了一個直徑是 ${D} 公分的圓形可麗餅`, `一張圓形桌面的直徑是 ${D} 公分`, `一個圓形鬆餅的直徑是 ${D} 公分`]);
        const unit = kind === 0 ? u : '公分';
        s.text = `${thing}，${kind === 0 ? '這個圓' : '它'}的面積大約是多少平方${unit}？`;
        s.key.unit = unit;
        s.key.why = `半徑＝直徑÷2＝${D}÷2＝${R}。`;
        s.answer = { label: `面積（平方${unit}）`, unit: `平方${unit}` };
        s.formulas = [`${R}×${R}×3.14`, `${D}×${D}×3.14`, `${R}×3.14`, `${D}×3.14`, `${R}×2×3.14`];
      } else if (kind === 1 || kind === 4) {
        s.text = kind === 1 ? `一個周長是 ${num(C)} ${u}的圓，這個圓的面積大約是多少平方${u}？` :
          `一個圓形池塘的周長是 ${num(C)} 公尺，這個池塘的面積大約是多少平方公尺？`;
        const unit = kind === 1 ? u : '公尺';
        s.key.unit = unit;
        s.key.why = `直徑＝周長÷3.14＝${num(C)}÷3.14＝${D}，半徑＝${D}÷2＝${R}。`;
        s.answer = { label: `面積（平方${unit}）`, unit: `平方${unit}` };
        s.formulas = [`${R}×${R}×3.14`, `${D}×${D}×3.14`, `${num(C)}×${num(C)}×3.14`, `${R}×3.14`, `${num(C)}÷3.14×3.14`];
      } else if (kind === 2) {
        const laps = t.rnd(2, 10), L = mul(C, F(laps));
        s.text = t.rnd(0, 1) ? `阿翰繞著一個圓形公園跑了 ${laps} 圈，一共跑了 ${num(L)} 公尺，這個公園的面積大約是多少平方公尺？` :
          `白雪公主有一條長 ${num(L)} 公尺的麻繩，麻繩的長度剛好可以完整繞圓形水井 ${laps} 圈。這口水井的面積大約是多少平方公尺？`;
        s.key.unit = '公尺';
        s.key.why = `一圈（周長）＝${num(L)}÷${laps}＝${num(C)}，直徑＝${num(C)}÷3.14＝${D}，半徑＝${D}÷2＝${R}。`;
        s.answer = { label: '面積（平方公尺）', unit: '平方公尺' };
        s.formulas = [`${R}×${R}×3.14`, `${D}×${D}×3.14`, `${R}×3.14`, `${num(L)}÷3.14×${num(L)}÷3.14`, `${R}×${R}×3.14×${laps}`];
      } else {
        s.text = t.pick([`一個圓形花圃的直徑是 ${D} 公尺，花圃的周長大約是多少公尺？`, `一個圓形時鐘的直徑是 ${D} 公分，鐘面的周長大約是多少公分？`]);
        const unit = s.text.includes('公尺') ? '公尺' : '公分';
        s.key = null; s.keys = [];
        s.answer = { label: `周長（${unit}）`, unit };
        s.formulas = [`${D}×3.14`, `${D}×2×3.14`, `${R}×${R}×3.14`, `${D}×${D}×3.14`, `${D}÷2×3.14`];
        s.rule = '圓周長＝直徑×3.14';
      }
      s.rule = s.rule || '圓面積＝半徑×半徑×3.14';
      s.ruleHint = AREA_RULE;
      return s;
    }, t);
  }

  /* ---------- ② 倍率問題 ---------- */
  function ratioScenario(t, variant) {
    return retry(() => {
      const kind = variant % 5, k = t.rnd(2, 5), base = t.pick([1, 2, 3, 4, 5, 6, 8, 10]), u = '公分';
      const s = { kind: 'ratio', allowFraction: true };
      let ratio = F(k), what = '面積';
      if (kind === 0) {
        const part = t.pick(['半徑', '直徑']);
        s.text = `一個${part} ${base} 公分的圓，${part}變成原來的 ${k} 倍時，面積會變成原來的幾倍？`;
        s.key = { why: `${part}變成 ${k} 倍，半徑也變成 ${k} 倍。` };
      } else if (kind === 1) {
        const flip = t.rnd(0, 1) === 1, a = base, b = base * k;
        const [first, second] = flip ? [b, a] : [a, b];
        ratio = flip ? F(1, k) : F(k);
        s.text = `甲圓的半徑是 ${first} 公分，乙圓的半徑是 ${second} 公分，乙圓的面積是甲圓面積的幾倍？`;
        s.key = { why: `乙圓半徑是甲圓的 ${second}÷${first}＝${num(ratio)} 倍。` };
      } else if (kind === 2) {
        const c1 = mul(F(base * k * 2), PI), c2 = mul(F(base * 2), PI);
        s.text = `甲圓的圓周長是 ${num(c1)} 公分，乙圓的圓周長是 ${num(c2)} 公分，甲圓的面積是乙圓面積的幾倍？`;
        s.key = { why: `周長是幾倍，半徑就是幾倍：${num(c1)}÷${num(c2)}＝${k}。` };
      } else if (kind === 3) {
        s.text = `大圓的直徑是 ${base * k * 2} 公分，小圓的直徑是 ${base * 2} 公分，大圓的面積是小圓面積的幾倍？`;
        s.key = { why: `直徑是幾倍，半徑就是幾倍：${base * k * 2}÷${base * 2}＝${k}。` };
      } else {
        what = '周長';
        s.text = `一個半徑 ${base} 公分的圓，半徑變成原來的 ${k} 倍時，周長會變成原來的幾倍？`;
        s.key = { why: `半徑變成 ${k} 倍。` };
      }
      const K = num(ratio);
      Object.assign(s.key, { title: '求半徑倍數', label: '半徑變成原來的幾倍', v: ratio, unit: '倍', hint: '半徑、直徑、周長的倍數都一樣。' });
      s.answer = { label: `${what}變成原來的幾倍`, unit: '倍', rational: true };
      s.formulas = what === '面積' ? [`${K}×${K}`, `${K}`, `${K}×2`, `${K}×3.14`, `${K}×${K}×3.14`] : [`${K}`, `${K}×${K}`, `${K}×2`, `${K}×3.14`];
      s.rule = what === '面積' ? `半徑變成 ${K} 倍，面積變成 ${K}×${K} 倍` : `半徑變成 ${K} 倍，周長也變成 ${K} 倍`;
      s.ruleHint = '半徑變成 k 倍時，周長變成 k 倍，面積變成 k×k 倍。';
      return s;
    }, t);
  }

  /* ---------- ③ 扇形面積 ---------- */
  const SECTOR_RULE = '扇形面積＝半徑×半徑×3.14×（扇形是全圓的幾分之幾）';
  /* 圓心角能約成漂亮分數的角度 */
  const ANGLES = [18, 20, 24, 30, 36, 40, 45, 50, 60, 72, 75, 80, 90, 100, 108, 120, 135, 144, 150, 160, 180, 200, 210, 216, 225, 240, 250, 270, 288, 300, 315];
  const frac = angle => F(angle, 360);
  const ft = p => `${p.n}/${p.d}`;
  /* 約分步驟：圓心角/360 約成最簡分數 */
  function partKey(angle, o = {}) {
    const p = frac(angle), P = ft(p);
    return { title: '約分：是全圓的幾分之幾', label: o.label || '扇形是全圓的幾分之幾', v: p, unit: '', simplest: true,
      why: `${o.pre || ''}${angle}/360 約分後是 ${P}，${o.who || '這個扇形'}是全圓的 ${P}。`, hint: '把「圓心角/360」的分子、分母同除以最大公因數，約成最簡分數。' };
  }
  function sectorScenario(t, variant) {
    return retry(() => {
      const kind = variant % 5, s = { kind: 'sector', allowFraction: false };
      const r = F(t.rnd(2, 30)), R = num(r), d = mul(r, F(2)), D = num(d);
      s.answer = { label: '扇形面積（平方公分）', unit: '平方公分' };
      s.rule = SECTOR_RULE; s.ruleHint = SECTOR_RULE;
      const radiusKey = { title: '求半徑', label: '半徑', v: r, unit: '公分', why: `半徑＝直徑÷2＝${D}÷2＝${R}。`, hint: '算扇形面積要用半徑：半徑＝直徑÷2。' };
      if (kind === 0) {
        const angle = t.pick(ANGLES), P = ft(frac(angle)), C = ft(sub(F(1), frac(angle)));
        const useD = t.rnd(0, 1) === 1;
        s.text = useD ? `一個圓心角是 ${angle}°，直徑是 ${D} 公分的扇形，這個扇形的面積大約是多少平方公分？` : `一個圓心角是 ${angle}°，半徑是 ${R} 公分的扇形，這個扇形的面積大約是多少平方公分？`;
        s.keys = useD ? [radiusKey, partKey(angle)] : [partKey(angle)];
        s.formulas = [`${R}×${R}×3.14×${P}`, `${D}×${D}×3.14×${P}`, `${R}×${R}×3.14×${C}`, `${R}×2×3.14×${P}`, `${R}×${R}×3.14`];
      } else if (kind === 1) {
        const n = t.pick([3, 4, 5, 6, 8, 10, 12]), big = F(t.rnd(5, 30) * 2);
        const br = div(big, F(2)), BR = num(br), BD = num(big);
        s.text = `媽媽烤了一個直徑是 ${BD} 公分的圓形披薩，並將披薩平均切成 ${n} 片，每一片披薩的面積大約是多少平方公分？`;
        s.keys = [{ title: '求半徑', label: '半徑', v: br, unit: '公分', why: `半徑＝直徑÷2＝${BD}÷2＝${BR}。`, hint: '算面積要用半徑：半徑＝直徑÷2。' },
          { title: '每一片是全圓的幾分之幾', label: '每一片是全圓的幾分之幾', v: F(1, n), unit: '', simplest: true, why: `平均切成 ${n} 片，每一片是全圓的 1/${n}。`, hint: '平均分成幾片，每片就是幾分之一。' }];
        s.formulas = [`${BR}×${BR}×3.14×1/${n}`, `${BD}×${BD}×3.14×1/${n}`, `${BR}×${BR}×3.14×${n}`, `${BD}×3.14×1/${n}`, `${BR}×${BR}×3.14`];
        s.rule = `每一片＝圓面積×1/${n}`;
      } else if (kind === 2) {
        const h = t.rnd(1, 11), m1 = t.rnd(0, 40), m2 = m1 + t.pick([5, 10, 12, 15, 20]), mins = m2 - m1, angle = mins * 6, P = ft(frac(angle));
        const pad = m => String(m).padStart(2, '0');
        s.text = `教室裡的時鐘，分針長 ${R} 公分。分針從 ${h} 時 ${pad(m1)} 分走到 ${h} 時 ${pad(m2)} 分，分針掃過的扇形面積大約是多少平方公分？`;
        s.keys = [{ title: '求圓心角', label: '分針轉過的角度（度）', v: F(angle), unit: '度', why: `分針 60 分鐘轉 360°，1 分鐘轉 6°；走了 ${mins} 分鐘，轉了 ${mins}×6＝${angle}°。`, hint: '分針每分鐘轉 360÷60＝6 度。' }, partKey(angle, { who: '掃過的扇形' })];
        s.formulas = [`${R}×${R}×3.14×${P}`, `${R}×${R}×3.14×${mins}/360`, `${R}×2×3.14×${P}`, `${R}×${R}×3.14`, `${D}×${D}×3.14×${P}`];
      } else if (kind === 3) {
        const eaten = t.pick([30, 40, 45, 60, 72, 90, 120, 135, 144, 150, 180, 240]), rest = 360 - eaten, P = ft(frac(rest)), E = ft(frac(eaten));
        s.text = `一個圓形的海鮮煎餅，半徑是 ${R} 公分。爸爸和小宇共吃掉一個圓心角是 ${eaten}° 的扇形，剩下的扇形面積大約是多少平方公分？`;
        s.keys = [{ title: '求圓心角', label: '剩下扇形的圓心角（度）', v: F(rest), unit: '度', why: `一整圈是 360°，剩下 360－${eaten}＝${rest}°。`, hint: '一整個圓的圓心角是 360°。' }, partKey(rest, { who: '剩下的扇形' })];
        s.formulas = [`${R}×${R}×3.14×${P}`, `${R}×${R}×3.14×${E}`, `${R}×2×3.14×${P}`, `${D}×${D}×3.14×${P}`, `${R}×${R}×3.14`];
      } else {
        const a1 = t.pick([100, 120, 135, 150, 160, 180, 200, 210, 240]), a2 = t.pick([30, 36, 40, 45, 60, 72, 80, 90]), diff = a1 - a2, P = ft(frac(diff)), Q = ft(frac(a1 + a2));
        if (diff <= 0) return null;
        s.text = `一個直徑是 ${D} 公分的圓，圓內有兩個圓心角分別是 ${a1}° 和 ${a2}° 的扇形，這兩個扇形的面積相差大約多少平方公分？`;
        s.keys = [radiusKey, partKey(diff, { pre: `兩個扇形的圓心角相差 ${a1}－${a2}＝${diff}°，`, who: '相差的部分', label: '相差的部分是全圓的幾分之幾' })];
        s.answer.label = '面積相差（平方公分）';
        s.formulas = [`${R}×${R}×3.14×${P}`, `${D}×${D}×3.14×${P}`, `${R}×${R}×3.14×${Q}`, `${R}×2×3.14×${P}`];
        s.rule = '兩個扇形半徑相同，面積相差＝半徑×半徑×3.14×（相差的部分是全圓的幾分之幾）';
      }
      return s;
    }, t);
  }

  /* ---------- ④ 由圓面積求扇形（或反推圓面積） ---------- */
  function sectorWholeScenario(t, variant) {
    return retry(() => {
      const kind = variant % 3, s = { kind: 'sectorWhole', allowFraction: false };
      const angle = kind === 2 ? t.pick([40, 50, 60, 80, 100, 120, 150, 160, 200, 240, 300]) : t.pick([36, 45, 60, 72, 90, 108, 120, 135, 144, 150, 180, 216, 240, 270, 288]);
      const part = frac(angle), P = ft(part), C = ft(sub(F(1), part));
      s.key = partKey(angle);
      s.ruleHint = '扇形面積＝圓面積×（扇形是全圓的幾分之幾）；反過來，圓面積＝扇形面積÷（幾分之幾），也就是乘以它的倒數。';
      if (kind === 1) {
        const whole = F(t.pick([20, 30, 40, 45, 60, 75, 90, 100, 120, 135, 150, 180, 200, 240, 300]));
        const S = mul(whole, part);
        if (terminatingDigits(S) > 1) return null;
        const inv = part.n === 1 ? `${part.d}` : `${part.d}/${part.n}`;
        s.text = `一個圓心角是 ${angle}° 的扇形，面積是 ${num(S)} 平方公分，完整的圓面積是多少平方公分？`;
        s.answer = { label: '圓面積（平方公分）', unit: '平方公分' };
        s.formulas = [`${num(S)}×${inv}`, `${num(S)}×${P}`, `${num(S)}×${C}`, `${num(S)}÷3.14`, `${num(S)}×${angle}`];
        s.rule = `扇形是全圓的 ${P}，圓面積＝扇形面積÷${P}＝扇形面積×${inv}`;
      } else {
        const A = t.rnd(0, 1) ? mul(PI, F(t.pick([100, 150, 200, 250, 300, 400, 500, 600]))) : F(t.pick([120, 180, 240, 360, 480, 600, 720, 900]));
        s.text = kind === 0 ? `奶奶有一個圓形花圃，面積是 ${num(A)} 平方公尺，她想劃分出一個圓心角是 ${angle}° 的扇形種玫瑰花，種玫瑰花的扇形面積大約是多少平方公尺？` :
          `一個圓的面積是 ${num(A)} 平方公分，圓內灰色扇形的圓心角是 ${angle}°，灰色扇形的面積是多少平方公分？`;
        const unit = kind === 0 ? '平方公尺' : '平方公分';
        s.answer = { label: `扇形面積（${unit}）`, unit };
        s.formulas = [`${num(A)}×${P}`, `${num(A)}×${C}`, `${num(A)}×3.14×${P}`, `${num(A)}÷${P.split('/')[1]}`, `${num(A)}÷${angle}`];
        if (part.n === 1) s.formulas.splice(3, 1);
        s.rule = `扇形面積＝圓面積×${P}`;
      }
      return s;
    }, t);
  }

  /* ---------- ⑤ 陰影面積（12 種附圖） ---------- */
  const SHADED = [
    /* 0 圓內直角三角形（斜邊是直徑）：圓－三角形 */
    t => {
      const [a, b, c] = t.pick([[3, 4, 5], [6, 8, 10], [9, 12, 15], [12, 16, 20], [5, 12, 13], [15, 20, 25]]);
      const r = F(c, 2), R = num(r), sc = 180 / c, A = [30, 120], B = [210, 120];
      const P = [30 + a * (a / c) * sc, 120 - a * (b / c) * sc];
      const fig = svg(circle(120, 120, 90, GRAY) + poly([A, P, B], WHITE) + dot(120, 120) +
        label((A[0] + P[0]) / 2 - 8, (A[1] + P[1]) / 2 - 2, a, 'end') + label((P[0] + B[0]) / 2 + 8, (P[1] + B[1]) / 2 - 2, b, 'start') + label(120, 138, c) + label(120, 234, '單位：公分'), 240, 240);
      return { text: `下面圖形中，直角三角形的三邊長是 ${a}、${b}、${c} 公分，三個頂點都在圓上，最長的邊通過圓心。灰色部分的面積大約是多少平方公分？`, fig,
        key: { title: '求半徑', label: '圓的半徑', v: r, why: `最長的邊 ${c} 就是圓的直徑，半徑＝${c}÷2＝${R}。`, hint: '通過圓心的邊就是直徑。' },
        formulas: [`${R}×${R}×3.14－${a}×${b}÷2`, `${R}×${R}×3.14－${a}×${b}`, `${c}×${c}×3.14－${a}×${b}÷2`, `${R}×${R}×3.14＋${a}×${b}÷2`, `${R}×${R}×3.14－${c}×${a}÷2`],
        rule: '灰色＝圓面積－直角三角形面積' };
    },
    /* 1 圓內正方形（對角線是直徑）：圓－正方形 */
    t => {
      const d = t.pick([6, 8, 10, 12, 14, 16, 20, 24, 30]), r = F(d, 2), R = num(r), h = 63.64;
      const sq = [[120 - h, 120 - h], [120 + h, 120 - h], [120 + h, 120 + h], [120 - h, 120 + h]];
      const fig = svg(circle(120, 120, 90, GRAY) + poly(sq, WHITE) + line(sq[0][0], sq[0][1], sq[2][0], sq[2][1]) + line(sq[1][0], sq[1][1], sq[3][0], sq[3][1]) + label(110, 100, `${d}cm`, 'end'), 240, 220);
      return { text: `下面圖形中，正方形的四個頂點都在圓上，正方形的對角線長 ${d} 公分。灰色部分的面積大約是多少平方公分？`, fig,
        key: { title: '求半徑', label: '圓的半徑', v: r, why: `正方形的對角線就是圓的直徑，半徑＝${d}÷2＝${R}。`, hint: '對角線通過圓心，就是直徑。' },
        formulas: [`${R}×${R}×3.14－${d}×${d}÷2`, `${R}×${R}×3.14－${d}×${d}`, `${d}×${d}×3.14－${d}×${d}÷2`, `${R}×${R}×3.14－${R}×${R}`, `${d}×${d}÷2－${R}×${R}×3.14`],
        rule: '灰色＝圓面積－正方形面積；正方形面積＝對角線×對角線÷2' };
    },
    /* 2 大圓內 4 個中圓與 1 個小圓 */
    t => {
      const small = t.pick([1, 2]), m = t.pick([2, 3, 4, 5, 6]), big = small + 2 * m, s = 95 / big;
      const cx = 120, cy = 115, off = (small + m) * s;
      let body = circle(cx, cy, 95, GRAY);
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([x, y]) => { body += circle(cx + x * off, cy + y * off, m * s, WHITE); });
      const edge = pt(cx, cy, 95, 45), mid = pt(cx, cy, 80, 45);
      body += circle(cx, cy, small * s, WHITE) + line(cx, cy, edge[0], edge[1]) + dot(cx, cy) +
        label(mid[0] + 6, mid[1] + 14, big, 'start') + label(cx - small * s - 3, cy - small * s - 3, small, 'end') + label(cx, 232, '單位：公分');
      return { text: `下面大圓的半徑是 ${big} 公分，大圓內有 4 個一樣大的中圓和 1 個半徑 ${small} 公分的小圓，彼此剛好相接。灰色部分的面積大約是多少平方公分？`, fig: svg(body, 240, 240),
        key: { title: '求半徑', label: '中圓的半徑', v: F(m), why: `中圓的直徑＝${big}－${small}＝${2 * m}，中圓半徑＝${2 * m}÷2＝${m}。`, hint: '大圓半徑＝小圓半徑＋中圓直徑。' },
        formulas: [`${big}×${big}×3.14－${m}×${m}×3.14×4－${small}×${small}×3.14`, `${big}×${big}×3.14－${m}×${m}×3.14×4`, `${big}×${big}×3.14－${m}×${m}×3.14－${small}×${small}×3.14`, `${big}×${big}×3.14－${2 * m}×${2 * m}×3.14×4－${small}×${small}×3.14`],
        rule: '灰色＝大圓－4 個中圓－小圓' };
    },
    /* 3 正方形－圓＋圓內正方形 */
    t => {
      const r = t.rnd(2, 10), side = 2 * r, dia = [[120, 30], [210, 120], [120, 210], [30, 120]];
      const fig = svg(`<g transform="translate(30 0)">` + rect(30, 30, 180, 180, GRAY) + circle(120, 120, 90, WHITE) + poly(dia, GRAY) + line(30, 120, 210, 120) + line(120, 30, 120, 210) +
        label(75, 22, `${r}cm`) + label(165, 22, `${r}cm`) + label(24, 80, `${r}cm`, 'end') + label(24, 170, `${r}cm`, 'end') + '</g>', 255, 225);
      return { text: `下面的大正方形邊長是 ${side} 公分，裡面有一個最大的圓，圓內又有一個頂點在圓上的正方形。灰色部分的面積大約是多少平方公分？`, fig,
        key: { title: '求半徑', label: '圓的半徑', v: F(r), why: `圓的直徑＝大正方形邊長＝${side}，半徑＝${side}÷2＝${r}。`, hint: '圓的直徑等於大正方形的邊長。' },
        formulas: [`${side}×${side}－${r}×${r}×3.14＋${side}×${side}÷2`, `${side}×${side}－${r}×${r}×3.14－${side}×${side}÷2`, `${side}×${side}－${side}×${side}×3.14＋${side}×${side}÷2`, `${side}×${side}－${r}×${r}×3.14＋${side}×${side}`],
        rule: '灰色＝大正方形－圓＋小正方形；小正方形的對角線＝圓的直徑，面積＝對角線×對角線÷2' };
    },
    /* 4 長方形（正方形）內排滿一樣大的圓 */
    t => {
      const [rows, cols] = t.pick([[3, 3], [2, 2], [4, 4], [2, 3], [2, 4], [3, 4]]), d = t.pick([2, 4, 6, 8, 10]), r = d / 2;
      const W = cols * d, H = rows * d, cell = Math.min(200 / cols, 160 / rows), x0 = 20, y0 = 20;
      let body = rect(x0, y0, cols * cell, rows * cell, WHITE);
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) body += circle(x0 + (j + .5) * cell, y0 + (i + .5) * cell, cell / 2, GRAY) + dot(x0 + (j + .5) * cell, y0 + (i + .5) * cell);
      const square = rows === cols, u = square ? '公尺' : '公分', n = rows * cols;
      body += label(x0 + cols * cell / 2, y0 + rows * cell + 20, W) + label(x0 + cols * cell + 8, y0 + rows * cell / 2 + 5, H, 'start');
      const text = square ? `油漆工人要粉刷邊長 ${W} 公尺的正方形牆壁，牆上排了 ${n} 個一樣大的圓形圖案，如下圖。灰色的圓形部分要刷上油漆，要刷油漆的面積大約共有多少平方公尺？` :
        `一個長是 ${W} 公分、寬是 ${H} 公分的長方形內部排了 ${n} 個一樣大的圓，如下圖。${n} 個圓的面積大約共是多少平方公分？`;
      return { text, fig: svg(body, 20 + cols * cell + 40, 20 + rows * cell + 30), unit: u,
        key: { title: '求半徑', label: '圓的半徑', v: F(d, 2), why: `一排有 ${cols} 個圓，直徑＝${W}÷${cols}＝${d}，半徑＝${d}÷2＝${num(F(d, 2))}。`, hint: '一排的圓直徑加起來等於長方形的長。' },
        formulas: [`${num(F(d, 2))}×${num(F(d, 2))}×3.14×${n}`, `${d}×${d}×3.14×${n}`, `${W}×${H}－${num(F(d, 2))}×${num(F(d, 2))}×3.14×${n}`, `${num(F(d, 2))}×${num(F(d, 2))}×3.14`, `${d}×3.14×${n}`],
        rule: `灰色＝${n} 個一樣大的圓` };
    },
    /* 5 大扇形－小扇形（扇子） */
    t => {
      const big = t.pick([10, 12, 15, 18, 20]), small = t.pick([4, 5, 6, 8, 9].filter(x => x <= big - 4)), alpha = t.pick([60, 90]), beta = t.pick([15, 30, 45]), theta = alpha + 2 * beta;
      const cx = 140, cy = 175, Rp = 125, rp = Math.max(45, Rp * small / big);
      const lo = 90 - theta / 2, hi = 90 + theta / 2;
      const pl = pt(cx, cy, Rp, hi), plw = pt(cx, cy, rp, 90 + alpha / 2);
      let body = sector(cx, cy, Rp, lo, hi, GRAY) + sector(cx, cy, rp, 90 - alpha / 2, 90 + alpha / 2, WHITE) +
        line(cx, cy, ...pt(cx, cy, Rp, 90 + alpha / 2)) + line(cx, cy, ...pt(cx, cy, Rp, 90 - alpha / 2)) +
        label((cx + pl[0]) / 2 - 12, (cy + pl[1]) / 2 + 6, big, 'end') + label((cx + plw[0]) / 2 + 2, (cy + plw[1]) / 2 - 4, small, 'end') +
        label(cx, cy - 16, `${alpha}°`) + label(...pt(cx, cy, 70, 90 + alpha / 2 + beta / 2), `${beta}°`) + label(...pt(cx, cy, 70, 90 - alpha / 2 - beta / 2), `${beta}°`) + label(cx, 198, '單位：公分');
      return { text: `下面的扇子由一個半徑 ${big} 公分的大扇形挖掉一個半徑 ${small} 公分、圓心角 ${alpha}° 的小扇形，兩旁的角各是 ${beta}°。灰色部分的面積大約是多少平方公分？`, fig: svg(body, 280, 205),
        keys: [{ title: '求圓心角', label: '大扇形的圓心角（度）', v: F(theta), why: `大扇形的圓心角＝${beta}＋${alpha}＋${beta}＝${theta}°。`, hint: '把三個角加起來。' },
          partKey(theta, { who: '大扇形', label: '大扇形是全圓的幾分之幾' })],
        formulas: [`${big}×${big}×3.14×${ft(frac(theta))}－${small}×${small}×3.14×${ft(frac(alpha))}`, `${big}×${big}×3.14×${ft(frac(alpha))}－${small}×${small}×3.14×${ft(frac(alpha))}`, `${big}×${big}×3.14×${ft(frac(theta))}－${small}×${small}×3.14×${ft(frac(theta))}`, `${big}×${big}×3.14×${ft(frac(theta))}＋${small}×${small}×3.14×${ft(frac(alpha))}`],
        rule: `灰色＝大扇形－小扇形；大扇形是全圓的 ${ft(frac(theta))}，小扇形是全圓的 ${ft(frac(alpha))}` };
    },
    /* 6 正方形－四分之一圓 */
    t => {
      const a = t.pick([2, 4, 6, 8, 10, 12, 14, 16, 20]);
      const fig = figSquareQuarter(a);
      return { text: `將一個邊長是 ${a} 公分的正方形和一個扇形重疊在一起，如下圖，灰色部分的面積大約是多少平方公分？`, fig,
        key: { title: '求半徑', label: '扇形的半徑', v: F(a), why: `扇形的半徑就是正方形的邊長 ${a}。`, hint: '扇形的半徑和正方形的邊一樣長。' },
        formulas: [`${a}×${a}－${a}×${a}×3.14÷4`, `${a}×${a}－${a}×${a}×3.14`, `${a}×${a}×3.14÷4`, `${a}×${a}－${a}×${a}×3.14÷2`],
        rule: '灰色＝正方形－四分之一圓' };
    },
    /* 7 弓形：四分之一圓－三角形 */
    t => {
      const r = t.pick([2, 4, 6, 8, 10, 12, 14, 16, 20]);
      const fig = svg(line(30, 30, 190, 30) + line(190, 30, 190, 190) + `<path d="M30 30 A160 160 0 0 0 190 190 Z" fill="${GRAY}" ${stroke}/>` + label(198, 115, `${r}cm`, 'start') + dot(190, 30), 250, 210);
      return { text: `下面圖形是一個半徑 ${r} 公分的四分之一圓，灰色部分的面積大約是多少平方公分？`, fig,
        key: { title: '求三角形面積', label: '直角三角形的面積', v: F(r * r, 2), why: `兩股都是半徑 ${r}，三角形面積＝${r}×${r}÷2＝${num(F(r * r, 2))}。`, hint: '直角三角形的兩股都是半徑。' },
        formulas: [`${r}×${r}×3.14÷4－${r}×${r}÷2`, `${r}×${r}×3.14÷4－${r}×${r}`, `${r}×${r}×3.14÷2－${r}×${r}÷2`, `${r}×${r}×3.14－${r}×${r}÷2`],
        rule: '灰色（弓形）＝四分之一圓－直角三角形' };
    },
    /* 8 正方形內的葉形 */
    t => {
      const a = t.pick([2, 4, 5, 6, 8, 10, 12, 20]);
      const fig = figLeaf(a);
      return { text: `下圖中，正方形的邊長是 ${a} 公分，兩段弧都以正方形的頂點為圓心。灰色部分的面積大約是多少平方公分？`, fig,
        key: { title: '求半徑', label: '弧的半徑', v: F(a), why: `兩段弧的半徑都是正方形的邊長 ${a}。`, hint: '弧的圓心在正方形頂點上。' },
        formulas: [`(${a}×${a}×3.14÷4－${a}×${a}÷2)×2`, `${a}×${a}×3.14÷4－${a}×${a}÷2`, `${a}×${a}×3.14÷4×2`, `${a}×${a}－${a}×${a}×3.14÷4`],
        rule: '葉形＝2 個弓形；弓形＝四分之一圓－直角三角形' };
    },
    /* 9 四個圓組成的四片葉形 */
    t => {
      const r = t.pick([2, 4, 5, 6, 8, 10]), cx = 120, cy = 120, R = 50;
      const centers = [[cx + R, cy], [cx, cy - R], [cx - R, cy], [cx, cy + R]];
      let body = '';
      [[R, -R], [-R, -R], [-R, R], [R, R]].forEach(([x, y]) => { body += leaf([cx, cy], [cx + x, cy + y], R); });
      centers.forEach(([x, y]) => { body += `<circle cx="${x}" cy="${y}" r="${R}" fill="none" ${stroke}/>` + dot(x, y); });
      body += line(cx, cy + R, cx, cy + 2 * R) + label(cx + 6, cy + 1.6 * R, r, 'start') + label(cx, 236, '單位：公分');
      return { text: `下圖由 4 個相同的圓組成，每個圓都通過中心點，圓的半徑都是 ${r} 公分。灰色部分的面積大約是多少平方公分？`, fig: svg(body, 240, 242),
        key: { title: '求半徑', label: '每片葉形所在正方形的邊長', v: F(r), why: `相鄰兩個圓心和兩個交點圍成邊長 ${r}（半徑）的正方形，每片葉形就在這個正方形裡。`, hint: '連接圓心和交點，會出現邊長等於半徑的正方形。' },
        formulas: [`(${r}×${r}×3.14÷4－${r}×${r}÷2)×2×4`, `(${r}×${r}×3.14÷4－${r}×${r}÷2)×4`, `(${r}×${r}×3.14÷4－${r}×${r}÷2)×2`, `(${2 * r}×${2 * r}×3.14÷4－${2 * r}×${2 * r}÷2)×2×4`],
        rule: '灰色＝4 片葉形；每片葉形＝(四分之一圓－直角三角形)×2' };
    },
    /* 10 四個四分之一圓拼成的風車 */
    t => {
      const r = t.pick([1, 2, 3, 4, 5, 6, 8, 10]), cx = 120, cy = 115, s = 70;
      const body = sector(cx, cy - s, s, 180, 270, GRAY) + sector(cx + s, cy, s, 90, 180, GRAY) + sector(cx, cy + s, s, 0, 90, GRAY) + sector(cx - s, cy, s, 270, 360, GRAY) +
        label(cx - s / 2, cy - s - 6, `${r}cm`) + label(cx + s / 2 + 6, cy + s / 2 + 22, `${r}cm`) + label(cx - s - 6, cy - s / 2 + 5, `${r}cm`, 'end') + label(cx + s + 6, cy + s / 2 + 5, `${r}cm`, 'start');
      return { text: `美術課要製作風車拼貼畫，曉曉用 4 張半徑 ${r} 公分的四分之一圓（扇形）圖紙拼成風車，如下圖。拼貼出來的風車面積是多少平方公分？`, fig: svg(body, 240, 230),
        key: { title: '求合起來是幾個圓', label: '4 個四分之一圓合起來是幾個圓', v: F(1), why: '4 個四分之一圓（圓心角 90°）合起來是 360°，剛好是 1 個圓。', hint: '四分之一圓的圓心角是 90°。' },
        formulas: [`${r}×${r}×3.14÷4×4`, `${r}×${r}×3.14÷4`, `${2 * r}×${2 * r}×3.14`, `${r}×2×3.14`, `${r}×${r}×4`],
        rule: '4 個四分之一圓＝1 個半徑相同的圓' };
    },
    /* 11 正三角形三個角上的扇形 */
    t => {
      const side = t.pick([4, 6, 8, 10, 12, 16, 20, 24, 30]), r = side / 2;
      return { text: `下圖是邊長 ${side} 公分的正三角形，以三個頂點為圓心、邊長的一半為半徑，各畫一個扇形。灰色部分的面積大約是多少平方公分？`, fig: figTriangleSectors(side),
        keys: [{ title: '求圓心角', label: '三個扇形的圓心角合起來（度）', v: F(180), why: '正三角形每個角都是 60°，三個扇形合起來是 60×3＝180°。', hint: '正三角形的三個角都是 60°。' },
          partKey(180, { who: '三個扇形合起來', label: '三個扇形合起來是全圓的幾分之幾' })],
        formulas: [`${num(F(r))}×${num(F(r))}×3.14×1/2`, `${side}×${side}×3.14×1/2`, `${num(F(r))}×${num(F(r))}×3.14×1/6`, `${num(F(r))}×${num(F(r))}×3.14×3`],
        rule: '3 個 60° 的扇形＝半個圓' };
    }
  ];
  function shadedScenario(t, variant) {
    const which = ((variant % SHADED_COUNT) + SHADED_COUNT) % SHADED_COUNT;
    return retry(() => {
      const s = SHADED[which](t), unit = s.unit || '公分';
      Object.assign(s, { kind: 'shaded', template: which, allowFraction: false, ruleHint: '先把灰色部分拆成會算的圖形（圓、扇形、正方形、三角形），再用加減求面積。' });
      (s.keys || [s.key]).forEach(k => { if (k.unit === undefined) k.unit = k.label.includes('度') ? '度' : k.label.includes('幾個') ? '個' : k.label.includes('面積') ? `平方${unit}` : unit; });
      s.answer = { label: `面積（平方${unit}）`, unit: `平方${unit}` };
      return s;
    }, t);
  }

  /* ---------- ⑥ 弧長與扇形周長 ---------- */
  const ARC_RULE = '弧長＝直徑×3.14×（扇形是全圓的幾分之幾）；扇形周長＝弧長＋半徑×2';
  function arcScenario(t, variant) {
    return retry(() => {
      const kind = variant % 5, s = { kind: 'arc', allowFraction: false, ruleHint: ARC_RULE };
      const r = F(t.rnd(2, 30)), R = num(r), d = mul(r, F(2)), D = num(d);
      const angle = t.pick(ANGLES), part = frac(angle), P = ft(part), C = ft(sub(F(1), part));
      s.answer = { label: '長度（公分）', unit: '公分' };
      if (kind === 0) {
        /* 給直徑：直接直徑×3.14，不考「直徑算半徑」 */
        s.text = `一個圓心角是 ${angle}°、直徑是 ${D} 公分的扇形，這個扇形的弧長大約是多少公分？`;
        s.keys = [partKey(angle)];
        s.answer.label = '弧長（公分）';
        s.formulas = [`${D}×3.14×${P}`, `${D}×${D}×3.14×${P}`, `${D}×3.14×${C}`, `${D}×3.14×${P}＋${D}`, `${D}×2×3.14×${P}`];
        s.rule = '弧長＝直徑×3.14×' + P;
      } else if (kind === 1) {
        const arc = evaluate(`${D}×3.14×${P}`), A = num(arc);
        s.text = `一個半徑 ${R} 公分、圓心角 ${angle}° 的扇形，這個扇形的周長大約是多少公分？`;
        s.keys = [partKey(angle), { title: '求弧長', label: '弧長', v: arc, unit: '公分', why: `直徑是 ${R}×2＝${D}，弧長＝${D}×3.14×${P}＝${A}。`, hint: '弧長＝直徑×3.14×（扇形是全圓的幾分之幾）。' }];
        s.answer.label = '扇形周長（公分）';
        s.formulas = [`${A}＋${R}×2`, `${A}`, `${A}＋${R}`, `${A}＋${D}×2`];
        s.rule = '扇形周長＝弧長＋2 條半徑';
      } else if (kind === 2) {
        const h = t.rnd(1, 11), m1 = t.rnd(0, 40), mins = t.pick([5, 10, 15, 20, 25, 30]), m2 = m1 + mins, a2 = mins * 6, Q = ft(frac(a2)), pad = m => String(m).padStart(2, '0');
        s.text = `時鐘的分針長 ${R} 公分。分針從 ${h} 時 ${pad(m1)} 分走到 ${h} 時 ${pad(m2)} 分，分針的尖端走了大約多少公分？`;
        s.keys = [{ title: '求圓心角', label: '分針轉過的角度（度）', v: F(a2), unit: '度', why: `分針 1 分鐘轉 6°；走了 ${mins} 分鐘，轉了 ${mins}×6＝${a2}°。`, hint: '分針每分鐘轉 360÷60＝6 度。' }, partKey(a2, { who: '尖端走的弧' , label: '尖端走的弧是圓周的幾分之幾' })];
        s.answer.label = '尖端走的距離（公分）';
        s.formulas = [`${R}×2×3.14×${Q}`, `${R}×${R}×3.14×${Q}`, `${R}×3.14×${Q}`, `${R}×2×3.14×${Q}＋${R}×2`];
        s.rule = `尖端走的路線是一段弧：分針長是半徑，直徑＝${R}×2，弧長＝${R}×2×3.14×${Q}`;
      } else if (kind === 3) {
        const half = evaluate(`${D}×3.14÷2`), H = num(half);
        s.text = `一個直徑 ${D} 公分的半圓形，周長大約是多少公分？`;
        s.key = { title: '求弧長', label: '半圓的弧長', v: half, unit: '公分', why: `半圓的弧長＝${D}×3.14÷2＝${H}。`, hint: '半圓的弧是圓周長的一半：直徑×3.14÷2。' };
        s.answer.label = '半圓周長（公分）';
        s.formulas = [`${H}＋${D}`, `${H}`, `${H}＋${R}`, `${D}×3.14＋${D}`];
        s.rule = '半圓周長＝半圓的弧長＋直徑';
      } else {
        const Cc = mul(d, PI), L = mul(Cc, part);
        if (terminatingDigits(L) > 1) return null;
        s.text = `一個圓心角 ${angle}° 的扇形，弧長是 ${num(L)} 公分，這個扇形的半徑是多少公分？`;
        s.keys = [partKey(angle, { who: '這段弧', label: '這段弧是整個圓周的幾分之幾' }),
          { title: '求整個圓的周長', label: '整個圓的周長', v: Cc, unit: '公分', why: `弧長是圓周長的 ${P}，圓周長＝${num(L)}÷${P}＝${num(Cc)}。`, hint: '弧長＝圓周長×幾分之幾，反過來除以幾分之幾（乘以倒數）。' }];
        s.answer.label = '半徑（公分）';
        s.formulas = [`${num(Cc)}÷3.14÷2`, `${num(Cc)}÷3.14`, `${num(Cc)}÷2`, `${num(Cc)}×3.14÷2`];
        s.rule = '圓周長＝直徑×3.14，直徑＝圓周長÷3.14，半徑＝直徑÷2';
      }
      return s;
    }, t);
  }

  /* ---------- ⑦ 複合圖形周長（6 種附圖） ---------- */
  const PERIMETER = [
    /* 0 半圓加兩個四分之一圓（課本範例） */
    t => {
      const a = t.pick([2, 3, 4, 5, 6, 8, 10]);
      const body = `<path d="M95 30 A80 80 0 0 0 95 190 A80 80 0 0 1 175 110 A80 80 0 0 1 95 30 Z" fill="${GRAY}" ${stroke}/>` +
        `<rect x="95" y="30" width="80" height="160" fill="none" stroke="${LINE}" stroke-width="1.2" stroke-dasharray="4 3"/>` +
        line(15, 110, 175, 110) + dot(95, 110) + dot(175, 30) + dot(175, 190) +
        label(135, 22, `${a}cm`) + label(135, 212, `${a}cm`) + label(183, 75, `${a}cm`, 'start') + label(183, 155, `${a}cm`, 'start') + label(55, 104, `${a}cm`);
      return { text: `下圖中，左邊是半圓，右邊兩段弧的圓心在長方形右邊的兩個頂點，每段虛線都是 ${a} 公分。灰色部分的周長大約是多少公分？`, fig: svg(body, 240, 222),
        key: { title: '數一數弧', label: '所有弧合起來是幾個圓的周長', v: F(1), unit: '個', why: '左邊是 1/2 個圓周，右邊兩段各是 1/4 個圓周，合起來 1/2＋1/4＋1/4＝1 個圓周，半徑都是 ' + a + '。虛線不算周長。', hint: '虛線是輔助線，不是灰色部分的邊。' },
        formulas: [`${a}×2×3.14`, `${a}×2×3.14＋${2 * a}`, `${a}×2×3.14÷2`, `${a}×${a}×3.14`, `${a}×2×3.14＋${4 * a}`],
        rule: '周長只算灰色部分的外框：三段弧合起來是一個半徑 ' + a + ' 的圓周' };
    },
    /* 1 正方形內的葉形 */
    t => {
      const a = t.pick([2, 4, 5, 6, 8, 10, 12, 20]);
      return { text: `下圖中，正方形的邊長是 ${a} 公分，兩段弧都以正方形的頂點為圓心。灰色部分的周長大約是多少公分？`, fig: figLeaf(a),
        key: { title: '數一數弧', label: '兩段弧合起來是幾分之幾個圓周', v: F(1, 2), unit: '', why: `兩段弧各是 1/4 個圓周（半徑 ${a}），合起來是 1/2 個圓周。`, hint: '每段弧都是四分之一圓的弧。' },
        formulas: [`${a}×2×3.14÷4×2`, `${a}×2×3.14÷4×2＋${a}×2`, `${a}×2×3.14÷4`, `${a}×${a}×3.14÷4×2`, `${a}×2×3.14×2`],
        rule: '葉形的周長＝2 段四分之一圓的弧' };
    },
    /* 2 正方形－四分之一圓 */
    t => {
      const a = t.pick([2, 4, 6, 8, 10, 12, 14, 16, 20]);
      return { text: `將一個邊長是 ${a} 公分的正方形和一個扇形重疊在一起，如下圖，灰色部分的周長大約是多少公分？`, fig: figSquareQuarter(a),
        key: { title: '求直線部分', label: '灰色部分直線邊的總長', v: F(2 * a), unit: '公分', why: `灰色部分有 2 條正方形的邊（上面和左邊），共 ${a}×2＝${2 * a}。`, hint: '沿著灰色部分的外框走一圈，數一數直線邊。' },
        formulas: [`${a}×2×3.14÷4＋${a}×2`, `${a}×2×3.14÷4＋${a}×4`, `${a}×2×3.14÷4`, `${a}×2×3.14＋${a}×2`, `${a}×${a}×3.14÷4＋${a}×2`],
        rule: '灰色周長＝四分之一圓的弧＋2 條正方形的邊' };
    },
    /* 3 正三角形三個角上的扇形 */
    t => {
      const side = t.pick([4, 6, 8, 10, 12, 16, 20]), r = side / 2;
      return { text: `下圖是邊長 ${side} 公分的正三角形，以三個頂點為圓心、邊長的一半為半徑，各畫一個扇形。灰色部分（三個扇形合起來）的周長大約是多少公分？`, fig: figTriangleSectors(side),
        key: { title: '數一數弧', label: '三段弧合起來是幾分之幾個圓周', v: F(1, 2), unit: '', why: '三個扇形各 60°，三段弧合起來 180°，是 1/2 個圓周（半徑 ' + r + '）。', hint: '正三角形的三個角都是 60°。' },
        formulas: [`${r}×2×3.14÷2＋${side}×3`, `${r}×2×3.14÷2`, `${side}×2×3.14÷2＋${side}×3`, `${r}×${r}×3.14÷2＋${side}×3`, `${r}×2×3.14＋${side}×3`],
        rule: '灰色周長＝三段弧（合起來半個圓周）＋三角形的三個邊' };
    },
    /* 4 跑道（長方形兩端各一個半圓） */
    t => {
      const d = t.pick([20, 30, 40, 50, 60]), L = t.pick([50, 60, 80, 100, 120]);
      const body = `<path d="M70 60 L190 60 A40 40 0 0 1 190 140 L70 140 A40 40 0 0 1 70 60 Z" fill="${GRAY}" ${stroke}/>` +
        line(70, 60, 70, 140) + line(190, 60, 190, 140) + label(130, 52, `${L}m`) + label(78, 105, `${d}m`, 'start');
      return { text: `學校操場的跑道由一個長方形和兩端的半圓組成。長方形的長是 ${L} 公尺，半圓的直徑是 ${d} 公尺，跑道一圈（灰色部分的周長）大約是多少公尺？`, fig: svg(body, 260, 165), unit: '公尺',
        key: { title: '數一數弧', label: '兩個半圓的弧合起來是幾個圓周', v: F(1), unit: '個', why: `兩個直徑 ${d} 的半圓弧，合起來是 1 個直徑 ${d} 的圓周。`, hint: '兩個半圓拼起來是一個圓。' },
        formulas: [`${d}×3.14＋${L}×2`, `${d}×3.14＋${L}×2＋${d}×2`, `${d}×3.14÷2＋${L}×2`, `${d}×3.14×2＋${L}×2`, `${d}×3.14＋${L}`],
        rule: '跑道一圈＝兩個半圓弧（一個圓周）＋兩條直線，中間的虛線不算' };
    },
    /* 5 正方形四邊向外各一個半圓 */
    t => {
      const a = t.pick([2, 4, 6, 8, 10, 12]);
      const body = `<path d="M80 80 A40 40 0 0 1 160 80 A40 40 0 0 1 160 160 A40 40 0 0 1 80 160 A40 40 0 0 1 80 80 Z" fill="${GRAY}" ${stroke}/>` +
        `<rect x="80" y="80" width="80" height="80" fill="none" stroke="${LINE}" stroke-width="1.2" stroke-dasharray="4 3"/>` + label(120, 125, `${a}cm`);
      return { text: `下圖是在邊長 ${a} 公分的正方形四邊，各向外畫一個半圓。灰色部分的周長大約是多少公分？`, fig: svg(body, 240, 240),
        key: { title: '數一數弧', label: '四個半圓弧合起來是幾個圓周', v: F(2), unit: '個', why: `4 個半圓＝2 個直徑 ${a} 的圓，正方形的虛線邊不算周長。`, hint: '兩個半圓合成一個圓。' },
        formulas: [`${a}×3.14×2`, `${a}×3.14×2＋${a}×4`, `${a}×3.14`, `${a}×3.14×4`, `${a}×${a}×3.14×2`],
        rule: '灰色周長＝4 個半圓弧＝2 個直徑 ' + a + ' 的圓周' };
    }
  ];
  function perimeterScenario(t, variant) {
    const which = ((variant % PERIMETER_COUNT) + PERIMETER_COUNT) % PERIMETER_COUNT;
    return retry(() => {
      const s = PERIMETER[which](t), unit = s.unit || '公分';
      Object.assign(s, { kind: 'perimeter', template: which, allowFraction: false, ruleHint: '周長只算圖形最外圈的線：把每段弧換成「幾分之幾個圓周」，再加上直線邊；虛線不算。' });
      s.answer = { label: `周長（${unit}）`, unit };
      return s;
    }, t);
  }

  function scenario(type, t, variant) {
    return { area: areaScenario, ratio: ratioScenario, sector: sectorScenario, sectorWhole: sectorWholeScenario, shaded: shadedScenario, arc: arcScenario, perimeter: perimeterScenario }[type](t, variant);
  }

  /* ---------- 題目包裝 ---------- */
  function newQuestion(type, t) {
    let id = 0;
    const q = { type: 'circleSector', topic: type, category: categories[type], steps: [], finalFields: [] };
    q.field = (label, expected, kind = 'number', extra = {}) => ({ key: `f${id++}`, label, expected, type: kind, ...extra });
    q.step = (title, fields, explanation, hint) => { q.steps.push({ title, fields, pattern: fields.map(f => `{${f.key}}`).join('　'), explanation, hint }); };
    q.t = t;
    return q;
  }
  function choiceField(q, label, options, correctIndex, keepOrder = false) {
    const order = keepOrder ? options.map((o, i) => i) : q.t.shuffle(options.map((o, i) => i));
    const marks = ['①', '②', '③', '④', '⑤'], keys = order.map((_, i) => String(i + 1)), labels = {};
    order.forEach((src, i) => { labels[keys[i]] = `${marks[i]} ${options[src]}`; });
    return q.field(label, keys[order.indexOf(correctIndex)], 'decision', { options: keys, optionLabels: labels });
  }
  function valueField(q, label, v, unit, rational) {
    const defaultForm = /幾分之幾/.test(label) || terminatingDigits(v) > 3 ? 'fraction' : 'number';
    if (rational || v.d !== 1) return q.field(label, v, 'rational', { unit, requirement: '可填小數或分數', defaultForm });
    return q.field(label, v.n, 'number', { unit });
  }
  function finish(q, text, fig, s) {
    q.text = text; q.textHtml = RQ.displayText(text) + (fig || '');
    q.explanation = q.steps.map(st => st.explanation).join('\n');
    q.scenario = s || null; delete q.field; delete q.step; delete q.t;
    return q;
  }
  const unitText = u => u === '倍' ? ' 倍' : u ? ` ${u}` : '';
  const hasOp = text => /[×÷＋－]/.test(text);
  const calcText = (text, v, unit) => hasOp(text) ? `${text}＝${show(v)}${unitText(unit)}` : `答案是 ${show(v)}${unitText(unit)}`;
  const decimalAny = a => terminatingDigits(a) < Infinity ? decimalText(a) : show(a);
  function computedScenario(t, types) {
    for (let i = 0; i < 20; i++) { const s = scenario(t.pick(types), t, t.rnd(0, 59)); if (hasOp(s.options[0].text)) return s; }
    return scenario('area', t, 0);
  }

  function stepQuestion(type, t, variant) {
    const s = scenario(type, t, variant), q = newQuestion(type, t);
    s.keys.forEach(k => {
      const kf = k.simplest ? q.field(k.label, k.v, 'rational', { unit: '', requirement: '約分成最簡分數', defaultForm: 'fraction', formats: ['fraction'], simplest: true })
        : valueField(q, k.label, k.v, k.unit, k.v.d !== 1);
      q.step(k.title, [kf], k.why, k.hint);
    });
    const formulaField = choiceField(q, '正確算式', s.options.map(o => o.text), 0);
    q.step('選出正確算式', [formulaField], `${s.rule}。列式為 ${s.options[0].text}。`, s.ruleHint);
    const answerField = valueField(q, s.answer.label, s.answer.v, s.answer.unit, s.answer.rational);
    q.step('算出答案', [answerField], `${calcText(s.options[0].text, s.answer.v, s.answer.unit)}。`, '先算乘除，再算加減；括號裡的先算。');
    q.finalFields = [answerField];
    return finish(q, s.text, s.fig, s);
  }

  /* ---------- ⑥ 是非題 ---------- */
  const CONCEPTS = [
    ['圓周長＝直徑×3.14', true, '圓周長＝直徑×3.14＝半徑×2×3.14。'],
    ['圓面積＝直徑×直徑×3.14', false, '圓面積＝半徑×半徑×3.14，要用半徑。'],
    ['圓面積＝半徑×半徑×3.14', true, '這是圓面積公式。'],
    ['一個圓的半徑變成原來的 3 倍，面積也變成原來的 3 倍', false, '半徑變成 3 倍，面積變成 3×3＝9 倍。'],
    ['一個圓的半徑變成原來的 3 倍，周長也變成原來的 3 倍', true, '周長＝半徑×2×3.14，半徑變成 3 倍，周長也變成 3 倍。'],
    ['一個圓的直徑變成原來的 2 倍，面積變成原來的 4 倍', true, '直徑變成 2 倍，半徑也變成 2 倍，面積變成 2×2＝4 倍。'],
    ['兩個圓的周長相差 2 倍，面積也相差 2 倍', false, '周長是 2 倍，半徑也是 2 倍，面積是 2×2＝4 倍。'],
    ['扇形面積＝圓面積×圓心角/360', true, '扇形占全圓的「圓心角/360」。'],
    ['圓心角是 90° 的扇形，面積是同半徑圓面積的 1/4', true, '90/360＝1/4。'],
    ['圓心角是 120° 的扇形，面積是同半徑圓面積的 1/4', false, '120/360＝1/3，不是 1/4。'],
    ['周長相同的正方形和圓形，正方形的面積比較大', false, '周長相同時，圓形的面積比較大。'],
    ['4 個半徑相同的四分之一圓，合起來的面積等於 1 個同半徑的圓', true, '90°×4＝360°，剛好是一整個圓。'],
    ['弧長＝直徑×3.14×圓心角/360', true, '弧長是圓周長的「圓心角/360」。'],
    ['扇形的周長就是它的弧長', false, '扇形周長＝弧長＋2 條半徑。'],
    ['半圓的周長＝直徑×3.14÷2', false, '半圓周長還要加上直徑：直徑×3.14÷2＋直徑。'],
    ['算複合圖形的周長時，圖裡的虛線也要加進去', false, '虛線是輔助線，周長只算圖形最外圈的線。']
  ];
  function judgeQuestion(t, variant) {
    const q = newQuestion('judge', t);
    let truth, explanation, text, fig = '', s = null;
    if (variant % 3 === 2) {
      let statement;
      [statement, truth, explanation] = t.pick(CONCEPTS);
      text = `判斷對錯：${statement}。`;
    } else {
      s = computedScenario(t, ['area', 'ratio', 'sector', 'sectorWhole', 'shaded', 'arc', 'perimeter']);
      const right = s.options[0];
      truth = t.rnd(0, 1) === 1;
      let shown = right.text, value = right.v;
      if (!truth) {
        const wrong = s.options.slice(1).filter(o => o.v.n > 0 && okValue(o.v, s));
        const w = t.pick(wrong.length ? wrong : s.options.slice(1));
        if (t.rnd(0, 2) === 0 && w.v.n > 0) value = w.v; else { shown = w.text; value = w.v; }
        if (value.n <= 0) { shown = right.text; value = add(right.v, F(1)); }
      }
      text = `「${s.text}」這個問題可以列式為 ${shown}＝${show(value)}。`;
      fig = s.fig || '';
      explanation = truth ? `${s.rule}，列式 ${right.text}＝${show(right.v)} 正確。` :
        shown === right.text ? `列式正確，但計算錯了：${right.text}＝${show(right.v)}，不是 ${show(value)}。` :
          `列式錯了。${s.rule}，應為 ${right.text}＝${show(right.v)}。`;
    }
    const f = q.field('這個敘述', truth ? 'yes' : 'no', 'decision', { options: ['yes', 'no'], optionLabels: { yes: '○ 正確', no: '× 錯誤' } });
    q.step('判斷對錯', [f], `${truth ? '○ 正確。' : '× 錯誤。'}${explanation}`, '先想清楚要用半徑還是直徑、要不要乘圓心角/360。');
    q.finalFields = [f];
    return finish(q, text, fig, s);
  }

  /* ---------- ⑦ 選擇題 ---------- */
  const CN = ['甲', '乙', '丙', '丁'];
  function choiceQuestion(t, variant) {
    const q = newQuestion('choice', t), kind = variant % 7;
    let text, options, correct, explanation, fig = '', s = null, keepOrder = false;
    if (kind === 0) {
      const equal = t.rnd(0, 3) === 0, base = t.rnd(4, 15);
      const radii = equal ? [base, base, base] : t.shuffle([base, base + t.rnd(1, 3), base - t.rnd(1, 3)]);
      const desc = [`半徑是 ${radii[0]} 公分的圓`, `直徑是 ${radii[1] * 2} 公分的圓`, `周長是 ${num(mul(F(radii[2] * 2), PI))} 公分的圓`];
      text = '下列選項中，哪一個圓的面積最大？';
      options = [...desc, '三個圓的面積都一樣大'];
      correct = equal ? 3 : radii.indexOf(Math.max(...radii));
      explanation = `先換成半徑來比：三個圓的半徑分別是 ${radii.join('、')} 公分。${equal ? '半徑一樣，面積都一樣大。' : '半徑最大的圓，面積最大。'}`;
      keepOrder = true;
    } else if (kind === 1) {
      const r = t.rnd(2, 12), L = mul(F(2 * r), PI), side = div(L, F(4));
      text = `有 2 條長 ${num(L)} 公尺的繩子，各圍成一個正方形和一個圓形，哪一個形狀的面積比較大？`;
      options = ['正方形', '圓形', '一樣大', '無法比較']; correct = 1; keepOrder = true;
      explanation = `正方形邊長＝${num(L)}÷4＝${show(side)}，面積＝${decimalAny(mul(side, side))}；圓形直徑＝${num(L)}÷3.14＝${2 * r}，面積＝${r}×${r}×3.14＝${show(mul(F(r * r), PI))}。圓形比較大。`;
    } else if (kind === 2) {
      const b = t.rnd(1, 5), k = t.rnd(2, 6), a = b * k, askWrong = t.rnd(0, 1) === 1;
      text = `A 圓的半徑是 ${a} 公分，B 圓的半徑是 ${b} 公分，下面敘述何者${askWrong ? '錯誤' : '正確'}？`;
      options = askWrong ? [`A 圓的半徑是 B 圓半徑的 ${k} 倍`, `A 圓的直徑是 B 圓直徑的 ${k} 倍`, `A 圓的面積是 B 圓面積的 ${k} 倍`, `A 圓的周長是 B 圓周長的 ${k} 倍`] :
        [`A 圓的直徑是 B 圓直徑的 ${k * k} 倍`, `A 圓的周長是 B 圓周長的 ${k * k} 倍`, `A 圓的面積是 B 圓面積的 ${k * k} 倍`, `A 圓的面積是 B 圓面積的 ${k} 倍`];
      correct = 2; keepOrder = true;
      explanation = `半徑是 ${k} 倍，直徑和周長也是 ${k} 倍，面積是 ${k}×${k}＝${k * k} 倍。`;
    } else if (kind === 3) {
      const A1 = t.pick([120, 150, 180, 200, 240]), A2 = t.pick([80, 90, 100, 120]);
      const fr = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(2, 5), F(3, 5), F(1, 6), F(5, 6)];
      const p1 = t.pick(fr), p2 = t.pick(fr), S1 = mul(F(A1), p1), S2 = mul(F(A2), p2);
      text = `有大、小兩個圓，大圓面積是 ${A1} 平方公分，小圓面積是 ${A2} 平方公分。大圓的灰色扇形占大圓的 ${p1.n}/${p1.d}，小圓的灰色扇形占小圓的 ${p2.n}/${p2.d}，哪一個圓的灰色扇形面積比較大？`;
      options = ['大圓', '小圓', '一樣大', '無法比較']; keepOrder = true;
      correct = eq(S1, S2) ? 2 : less(S2, S1) ? 0 : 1;
      explanation = `大圓扇形＝${A1}×${p1.n}/${p1.d}＝${show(S1)}；小圓扇形＝${A2}×${p2.n}/${p2.d}＝${show(S2)}。`;
    } else if (kind === 4) {
      let items;
      for (let tries = 0; tries < 40; tries++) {
        items = [0, 1, 2, 3].map(() => {
          const r = t.pick([3, 4, 5, 6]), mode = t.rnd(0, 2);
          if (mode === 0) { const a = t.pick([45, 60, 90, 120, 135, 180, 270]); return { text: `半徑 ${r} 公分，圓心角 ${a}° 的扇形`, v: F(r * r * a, 360) }; }
          if (mode === 1) { const a = t.pick([90, 180, 270]); return { text: `直徑 ${2 * r} 公分，圓心角 ${a}° 的扇形`, v: F(r * r * a, 360) }; }
          const p = t.pick([F(1, 4), F(3, 8), F(1, 2), F(3, 4), F(1, 3)]); return { text: `半徑 ${r} 公分的 ${p.n}/${p.d} 圓`, v: mul(F(r * r), p) };
        });
        const sorted = items.map(i => i.v).sort((x, y) => x.n * y.d - y.n * x.d);
        if (!eq(sorted[0], sorted[1]) && !eq(sorted[2], sorted[3])) break;
      }
      const askMax = t.rnd(0, 1) === 1;
      const best = items.reduce((bi, it, i) => (askMax ? less(items[bi].v, it.v) : less(it.v, items[bi].v)) ? i : bi, 0);
      text = `美美畫了 4 個扇形：${items.map((it, i) => `${CN[i]}：${it.text}`).join('；')}。哪一個扇形的面積${askMax ? '最大' : '最小'}？`;
      options = CN.slice(); correct = best; keepOrder = true;
      explanation = `都用「半徑×半徑×圓心角/360」比較（3.14 可以先不乘）：${items.map((it, i) => `${CN[i]}＝${show(it.v)}`).join('、')}，所以${CN[best]}${askMax ? '最大' : '最小'}。`;
    } else {
      s = computedScenario(t, kind === 5 ? ['area', 'sector', 'shaded', 'arc'] : ['ratio', 'sectorWhole', 'shaded', 'perimeter']);
      const unit = unitText(s.answer.unit), values = [];
      s.options.forEach(o => { if (o.v.n > 0 && okValue(o.v, s) && !values.some(v => eq(v, o.v))) values.push(o.v); });
      for (let bump = 2; values.length < 4 && bump < 400; bump++) {
        const v = bump % 2 ? mul(values[0], F(bump)) : div(values[0], F(bump));
        if (okValue(v, s) && !values.some(x => eq(x, v))) values.push(v);
      }
      for (let k = 1; values.length < 4; k++) { const v = add(values[0], F(k * 3)); if (!values.some(x => eq(x, v))) values.push(v); }
      text = s.text; fig = s.fig || '';
      options = values.slice(0, 4).map(v => `${show(v)}${unit}`); correct = 0;
      explanation = `${s.rule}，${calcText(s.options[0].text, s.options[0].v, s.answer.unit)}。`;
    }
    const f = choiceField(q, '正確選項', options, correct, keepOrder);
    q.step('選出正確答案', [f], explanation, '先找出半徑，再判斷要用圓面積、周長還是扇形面積。');
    q.finalFields = [f];
    return finish(q, text, fig, s);
  }

  function generate(type, settings, rng = Math.random, variant) {
    const t = tools(rng);
    if (type === 'mixed') type = t.pick(PRACTICE_TYPES);
    if (!PRACTICE_TYPES.includes(type)) throw new Error('Unknown question category');
    const v = variant === undefined ? t.rnd(0, 59) : variant;
    if (type === 'judge') return judgeQuestion(t, v);
    if (type === 'choice') return choiceQuestion(t, v);
    return stepQuestion(type, t, v);
  }
  function buildExam(settings, rng = Math.random) {
    const t = tools(rng), questions = [], offset = t.rnd(0, 59);
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
  const format = a => typeof a === 'object' && a ? show(a) : String(a);
  const api = { ...RQ, categories, PRACTICE_TYPES, EXAM_TYPES, SHADED_COUNT, PERIMETER_COUNT, defaultType: 'area', generate, buildExam, format,
    F, add, sub, mul, div, eq, show, evaluate, scenario: (type, rng, variant) => scenario(type, tools(rng), variant) };
  /* 約分題：必須填最簡分數 */
  api.correct = (raw, f) => {
    if (f && f.simplest) { const m = String(raw == null ? '' : raw).trim().match(/^(\d+)\/(\d+)$/); if (!m || gcd(+m[1], +m[2]) !== 1) return false; }
    return RQ.correct(raw, f);
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { api.settings = () => null; root.PaperQuestions = api; }
})(typeof window !== 'undefined' ? window : globalThis);
