/* 小六數學：速率。所有數量都用分數 {n, d} 精確計算。
 * 四大主題（時間換算、速率距離時間、速率單位換算、速率應用）底下再分不同問法；
 * ※ 為流水、追趕（隨機出題預設不含，可在選單開啟）；★ 為進階問法（只在點選時出現，不進隨機與測驗）。 */
(function (root) {
  'use strict';
  const RQ = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;

  const TOPICS = [
    { key: 'topic1', title: '一、時間單位的換算', types: ['t1Convert', 't1Compare'], adv: [] },
    { key: 'topic2', title: '二、速率、距離、時間的關係', types: ['speed', 'time', 'dist', 'graph', 'clock', 'twoStage'], adv: ['echo', 'earlier'] },
    { key: 'topic3', title: '三、速率單位的換算', types: ['unitConvert', 'unitCompare'], adv: [] },
    { key: 'topic4', title: '四、速率的應用', types: ['apart', 'meet', 'ring', 'remain', 'roundTrip', 'threePlace', 'flow', 'chase'], adv: ['segment', 'ringReverse', 'drift'] }
  ];
  const categories = {
    t1Convert: '時、分、秒換算', t1Compare: '時間比大小',
    speed: '求速率', time: '求時間', dist: '求距離', graph: '看圖表', clock: '出發與到達時刻', twoStage: '先求速率或路程，再求時間',
    echo: '★回聲測距', earlier: '★提早到達要加快多少',
    unitConvert: '速率單位互換', unitCompare: '比快慢',
    apart: '相距問題', meet: '相遇：相向而行', ring: '相遇：環形跑道', remain: '相遇：一人先到',
    roundTrip: '來回的平均速率', threePlace: '三地的平均速率', flow: '※流水問題', chase: '※追趕問題',
    segment: '★分段行駛求總時間', ringReverse: '★環形跑道反求速率', drift: '※★故障後被水沖回',
    judge: '是非判斷', choice: '選擇題'
  };
  const STAR = ['flow', 'chase', 'drift'];
  const ADVANCED = TOPICS.flatMap(tp => tp.adv);
  const PRACTICE_TYPES = [...Object.keys(categories), ...TOPICS.map(tp => tp.key), 'mixed'];

  /* ---------- 分數運算 ---------- */
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const lcm = (a, b) => a / gcd(a, b) * b;
  const F = (n, d = 1) => {
    if (!Number.isInteger(n) || !Number.isInteger(d)) { const k = 10 ** 6; return F(Math.round(n * k), Math.round(d * k)); }
    if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g };
  };
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => F(a.n * b.d, a.d * b.n);
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const less = (a, b) => a.n * b.d < b.n * a.d;
  const num = x => typeof x === 'object' ? x : F(x);
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
  /* 有限小數（三位以內）用小數，否則用（帶）分數 */
  function show(a, style = 'auto') {
    a = num(a);
    if (a.d === 1) return String(a.n);
    if (style !== 'frac' && terminatingDigits(a) <= 3) return decimalText(a);
    return fractionText(a);
  }
  const nice = (a, digits = 2) => terminatingDigits(num(a)) <= digits;

  /* ---------- 工具 ---------- */
  function tools(rng) {
    const rnd = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = list => list[rnd(0, list.length - 1)];
    const shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { rnd, pick, shuffle };
  }
  function newQ(type, t) {
    let id = 0;
    const q = { type: 'rate', topic: type, category: categories[type], steps: [], finalFields: [] };
    q.field = (label, expected, kind = 'number', extra = {}) => ({ key: `f${id++}`, label, expected, type: kind, ...extra });
    q.step = (title, fields, explanation, hint, pattern) => {
      q.steps.push({ title, fields, pattern: pattern || fields.map(f => `{${f.key}}`).join('　'), explanation, hint });
    };
    q.t = t;
    return q;
  }
  /* 答案格子：整數用數字格，其餘用可填小數或分數的格子 */
  function val(q, label, v, unit, extra = {}) {
    v = num(v);
    if (extra.decimalOnly) return q.field(unit ? `${label}（${unit}）` : label, v, 'rational', { unit, requirement: '用小數表示', formats: ['number'], defaultForm: 'number' });
    if (v.d === 1) return q.field(label, v.n, 'number', { unit, ...extra });
    return q.field(unit ? `${label}（${unit}）` : label, v, 'rational', { unit, requirement: '可填小數或分數', ...extra });
  }
  function choiceField(q, label, options, correctIndex, keepOrder = false) {
    const order = keepOrder ? options.map((o, i) => i) : q.t.shuffle(options.map((o, i) => i));
    const marks = ['①', '②', '③', '④', '⑤'];
    const keys = order.map((_, i) => String(i + 1)), labels = {};
    order.forEach((src, i) => { labels[keys[i]] = `${marks[i]} ${options[src]}`; });
    return q.field(label, keys[order.indexOf(correctIndex)], 'decision', { options: keys, optionLabels: labels });
  }
  const ref = f => `{${f.key}}`;
  function finish(q, text, fig = '', final) {
    q.text = text; q.textHtml = RQ.displayText(text) + fig;
    q.finalFields = final || q.steps[q.steps.length - 1].fields;
    q.explanation = q.steps.map(s => s.explanation).join('\n');
    delete q.field; delete q.step; delete q.t;
    return q;
  }
  /* 「選算式→算答案」兩步：第二步的格子前面接著正確算式 */
  function formulaSteps(q, options, rule, hint, answerLabel, answer, unit, tail = '', calcHint = '先算括號裡的數，再做乘除；帶分數可以先化成假分數。') {
    const right = options[0];
    const f = choiceField(q, '正確算式', options, 0);
    q.step('選出正確算式', [f], `${rule}，所以列式為 ${right}。`, hint);
    const a = val(q, answerLabel, answer, unit);
    q.step('算出答案', [a], `${right}＝${show(answer)}，${tail || `答：${answerLabel} ${show(answer)} ${unit}`}。`, calcHint, `${right}＝${ref(a)}`);
    q.formulaCheck = { choice: f.key, answer: a.key };
    return a;
  }

  /* ---------- 文字 ---------- */
  function minText(m) {
    const h = Math.floor(m / 60), r = m % 60;
    if (m === 30) return '半小時';
    return h ? (r ? `${h} 小時 ${r} 分鐘` : `${h} 小時`) : `${r} 分鐘`;
  }
  function secText(s) { const m = Math.floor(s / 60), r = s % 60; return m ? (r ? `${m} 分鐘 ${r} 秒` : `${m} 分鐘`) : `${r} 秒`; }
  const UNITS = {
    ms: { k: F(1), name: '秒速', d: '公尺', per: '秒', forms: [x => `秒速 ${x} 公尺`, x => `每秒 ${x} 公尺`, x => `${x} 公尺/秒`, x => `${x} m/s`] },
    mmin: { k: F(1, 60), name: '分速', d: '公尺', per: '分鐘', forms: [x => `分速 ${x} 公尺`, x => `每分鐘 ${x} 公尺`, x => `${x} 公尺/分`, x => `${x} m/min`] },
    kmh: { k: F(5, 18), name: '時速', d: '公里', per: '小時', forms: [x => `時速 ${x} 公里`, x => `每小時 ${x} 公里`, x => `${x} 公里/時`, x => `${x} km/h`] },
    kms: { k: F(1000), name: '秒速', d: '公里', per: '秒', forms: [x => `秒速 ${x} 公里`, x => `${x} 公里/秒`] },
    kmmin: { k: F(50, 3), name: '分速', d: '公里', per: '分鐘', forms: [x => `分速 ${x} 公里`, x => `${x} 公里/分`] },
    mh: { k: F(1, 3600), name: '時速', d: '公尺', per: '小時', forms: [x => `時速 ${x} 公尺`, x => `${x} 公尺/時`] }
  };
  const sp = (x, u, style = 0) => { const forms = UNITS[u].forms; return forms[Math.min(style, forms.length - 1)](show(x)); };
  const uText = (x, u) => `${UNITS[u].name} ${show(x)} ${UNITS[u].d}`;
  const uBlank = u => `${UNITS[u].name}（　）${UNITS[u].d}`;
  const convert = (x, a, b) => mul(num(x), div(UNITS[a].k, UNITS[b].k));
  const METHODS = {
    'ms>mmin': '×60', 'mmin>ms': '÷60', 'mmin>kmh': '×60，再÷1000', 'kmh>mmin': '×1000，再÷60',
    'ms>kmh': '×3600，再÷1000', 'kmh>ms': '×1000，再÷3600', 'ms>kms': '÷1000', 'kms>kmh': '×3600',
    'kmh>kmmin': '÷60', 'kmmin>kmh': '×60', 'mmin>kmmin': '÷1000', 'kmmin>mmin': '×1000', 'kmh>mh': '×1000', 'ms>mh': '×3600'
  };
  const ALL_METHODS = [...new Set(Object.values(METHODS))];
  const calc = (x, method) => `${show(x)}${method.replace(/，再/g, '')}`;
  const NAMES = [['奇珍', '國宇'], ['尤茹', '啟銘'], ['阿鳩', '阿特'], ['小鳩', '小特'], ['玉梅', '忠漢'], ['小琪', '貝樂'], ['小華', '育文'], ['巧如', '品熙'], ['寬寬', '雨萱']];
  const SPEED_HINT = '速率＝距離÷時間，時間＝距離÷速率，距離＝速率×時間。';
  const UNIT_HINT = '1 小時＝60 分鐘，1 分鐘＝60 秒，1 公里＝1000 公尺。時速配「公里、小時」，分速配「公尺、分鐘」，秒速配「公尺、秒」。';

  /* ================= 一、時間單位的換算 ================= */
  function t1Convert(t, v) {
    const q = newQ('t1Convert', t), kind = ['m2h', 'h2m', 'hm2h', 'ms2m', 'm2s', 's2m', 's2mDec'][v % 7];
    const opHint = big => `1 ${big[1]}＝60 ${big[0]}。換成較大的單位，數字變小要 ÷60；換成較小的單位，數字變大要 ×60。`;
    let text;
    if (kind === 'm2h' || kind === 's2m' || kind === 's2mDec') {
      const u = kind === 'm2h' ? ['分鐘', '小時'] : ['秒', '分鐘'];
      let n;
      if (kind === 'm2h') n = 60 * t.rnd(0, 2) + t.pick([6, 10, 12, 15, 18, 20, 24, 25, 30, 35, 36, 40, 45, 48, 50, 54]);
      else if (kind === 's2m') { do { n = t.rnd(70, 290); } while (n % 60 === 0); }
      else { do { n = 3 * t.rnd(2, 59); } while (n % 60 === 0); }
      text = `${n} ${u[0]}＝（　）${u[1]}${kind === 's2mDec' ? '（用小數表示）' : ''}`;
      const op = choiceField(q, '換算方法', ['×60', '÷60'], 1, true);
      q.step('選出換算方法', [op], `${u[0]}換成${u[1]}，是換成較大的單位，數字會變小，所以要 ÷60。`, opHint(u));
      const ans = F(n, 60), f = val(q, '答案', ans, u[1], kind === 's2mDec' ? { decimalOnly: true } : {});
      const also = ans.d !== 1 && terminatingDigits(ans) <= 3 && kind !== 's2mDec' ? `（也可以寫成 ${fractionText(ans)}）` : '';
      q.step('算出答案', [f], `${n}÷60＝${kind === 's2mDec' ? decimalText(ans) : show(ans)}${also}，所以 ${n} ${u[0]}＝${show(ans)} ${u[1]}。`, kind === 's2mDec' ? '用直式計算，除不盡就在被除數後面補 0 繼續除。' : '先寫成分數再約分；能整除 60 的部分就是整數部分。', `${n}÷60＝${ref(f)}`);
    } else if (kind === 'h2m' || kind === 'm2s') {
      const u = kind === 'h2m' ? ['分鐘', '小時'] : ['秒', '分鐘'];
      let x;
      if (t.rnd(0, 1)) x = F(t.rnd(0, 3) * 10 + t.rnd(1, 9), 10);
      else { const d = t.pick([2, 3, 4, 5, 6, 10, 12, 15, 20]); let n; do { n = t.rnd(1, d - 1); } while (gcd(n, d) !== 1); x = F(t.rnd(1, 3) * d + n, d); }
      const xs = terminatingDigits(x) <= 1 ? show(x) : fractionText(x);
      text = `${xs} ${u[1]}＝（　）${u[0]}`;
      const op = choiceField(q, '換算方法', ['×60', '÷60'], 0, true);
      q.step('選出換算方法', [op], `${u[1]}換成${u[0]}，是換成較小的單位，數字會變大，所以要 ×60。`, opHint(u));
      const ans = mul(x, F(60)), f = val(q, '答案', ans, u[0]);
      q.step('算出答案', [f], `${xs}×60＝${show(ans)}，所以 ${xs} ${u[1]}＝${show(ans)} ${u[0]}。`, '帶分數可以拆成「整數×60」加上「分數×60」。', `${xs}×60＝${ref(f)}`);
    } else {
      const u = kind === 'hm2h' ? ['分鐘', '小時'] : ['秒', '分鐘'];
      const w = t.rnd(1, 9), r = kind === 'hm2h' ? t.pick([5, 6, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 48, 50, 55]) : t.rnd(1, 59);
      text = `${w} ${u[1]} ${r} ${u[0]}＝（　）${u[1]}`;
      const part = F(r, 60), total = F(60 * w + r, 60);
      const f1 = val(q, `換成${u[1]}`, part, u[1]);
      q.step(`先把 ${r} ${u[0]}換成${u[1]}`, [f1], `${r}÷60＝${show(part)}，所以 ${r} ${u[0]}＝${show(part)} ${u[1]}。`, `${u[0]}換成${u[1]}要 ÷60。`, `${r} ${u[0]}＝${ref(f1)}`);
      const f2 = val(q, '答案', total, u[1]);
      q.step('合起來', [f2], `${w}＋${show(part)}＝${show(total)}，所以 ${w} ${u[1]} ${r} ${u[0]}＝${show(total)} ${u[1]}。`, '整數部分不變，加上剛剛換好的部分。', `${w}＋${show(part)}＝${ref(f2)}`);
    }
    return finish(q, text);
  }

  function secForm(t, base, form) {
    const j = () => base + t.rnd(-14, 14);
    if (form === 'sec') { const s = j(); return { s, text: `${s} 秒` }; }
    if (form === 'minDec') { const s = Math.round(j() / 6) * 6; return s % 60 ? { s, text: `${show(F(s, 60))} 分鐘` } : null; }
    if (form === 'minFrac') { const d = t.pick([3, 4, 5, 6, 12]), u = 60 / d, s = Math.round(j() / u) * u; return s % 60 ? { s, text: `${fractionText(F(s, 60))} 分鐘` } : null; }
    if (form === 'hourDec') { const s = Math.round(j() / 36) * 36; return { s, text: `${show(F(s, 3600))} 小時` }; }
    const s = j(); return s % 60 ? { s, text: `${Math.floor(s / 60)} 分鐘 ${s % 60} 秒` } : null;
  }
  function t1Compare(t, v) {
    const four = v % 2 === 0;
    const names = four ? ['甲', '乙', '丙', '丁'] : t.pick([['六年一班', '六年二班', '六年三班'], ['紅隊', '藍隊', '綠隊']]);
    let items;
    for (;;) {
      const base = four ? t.rnd(200, 300) : t.rnd(500, 580);
      const forms = four ? t.shuffle(['sec', 'minDec', 'hourDec', 'minFrac']) : t.shuffle(['minFrac', 'minSec', 'sec']);
      items = forms.map((form, i) => ({ name: names[i], form, ...(secForm(t, base, form) || { s: NaN }) }));
      const ss = items.map(it => it.s).sort((a, b) => a - b);
      if (ss.every(Number.isFinite) && ss.every((s, i) => i === 0 || s - ss[i - 1] >= 2)) break;
    }
    const wantMax = t.rnd(0, 1) === 1, sorted = items.slice().sort((a, b) => a.s - b.s), target = wantMax ? sorted[sorted.length - 1] : sorted[0];
    const word = four ? (wantMax ? '時間最多' : '時間最少') : (wantMax ? '完成時間最慢' : '完成時間最快');
    const text = four
      ? `積木機器人組裝比賽，${items.map(it => `${it.name}花了 ${it.text}`).join('，')}，誰花的${wantMax ? '時間最多' : '時間最少'}？`
      : `六年級趣味競賽，完成時間分別為${items.map(it => `${it.name} ${it.text}`).join('，')}，哪一${four ? '人' : '隊'}${word}？`.replace('哪一隊', names[0].includes('班') ? '哪一班' : '哪一隊');
    const q = newQ('t1Compare', t), need = items.filter(it => it.form !== 'sec');
    const fields = need.map(it => q.field(`${it.name}`, it.s, 'number', { unit: '秒' }));
    q.step('全部換成「秒」', fields, items.map(it => it.form === 'sec' ? `${it.name}：${it.text}` : `${it.name}：${it.text}＝${it.s} 秒`).join('；') + '。',
      '1 分鐘＝60 秒，1 小時＝3600 秒；小數或分數的分鐘數 ×60 就是秒數。', need.map((it, i) => `${it.name}：${it.text}＝${ref(fields[i])}`).join('　'));
    const c = choiceField(q, '答案', items.map(it => it.name), items.indexOf(target), true);
    q.step('比較大小', [c], `由小到大：${sorted.map(it => `${it.name}（${it.s} 秒）`).join('＜')}，所以${word}的是${target.name}。`, wantMax || !four ? '時間越少代表越快完成；換成同一個單位後再比較。' : '換成同一個單位後再比較大小。');
    return finish(q, text);
  }

  /* ================= 二、速率、距離、時間 ================= */
  const SYS = {
    kmh: { u: 'kmh', dist: '公里', time: '小時', subj: [
      { who: '一架飛機', short: '飛機', lo: 400, hi: 900, verb: '飛', routes: [['桃園', '香港'], ['桃園', '東京'], ['桃園', '首爾'], ['桃園', '馬尼拉']] },
      { who: '高鐵', lo: 180, hi: 300, verb: '行駛', routes: [['臺北', '左營'], ['臺中', '左營'], ['苗栗', '臺北']] },
      { who: '爸爸開車', lo: 40, hi: 100, verb: '開', routes: [['苗栗', '臺中'], ['家裡', '日月潭'], ['鳩特數理', '墾丁']] },
      { who: '遊覽車', lo: 50, hi: 90, verb: '行駛', routes: [['學校', '動物園'], ['苗栗', '新竹']] }] },
    mmin: { u: 'mmin', dist: '公尺', time: '分鐘', subj: [
      { who: '阿鳩騎腳踏車', lo: 150, hi: 300, verb: '騎', routes: [['家裡', '圖書館'], ['學校', '游泳池']] },
      { who: '小特走路', lo: 50, hi: 90, verb: '走', routes: [['家裡', '公園'], ['鳩特數理', '車站']] },
      { who: '哥哥慢跑', lo: 120, hi: 250, verb: '跑', routes: [['家裡', '河濱公園'], ['學校', '體育館']] }] },
    ms: { u: 'ms', dist: '公尺', time: '秒', subj: [
      { who: '小鳩', lo: 4, hi: 8, verb: '跑', routes: [['起點', '終點']] },
      { who: '短跑選手', lo: 7, hi: 10, verb: '跑', routes: [['起跑線', '終點線']] },
      { who: '一隻獵豹', lo: 20, hi: 30, verb: '奔跑', routes: [['大樹', '水池']] }] }
  };
  function timeConv(t, sysKey, sub) {
    if (sysKey === 'kmh') { const m = t.rnd(sub && sub.lo >= 180 ? 1 : 0, 2) * 60 + t.pick([10, 12, 15, 20, 24, 30, 36, 40, 45, 48, 50]); return { T: F(m, 60), text: minText(m) }; }
    if (sysKey === 'mmin') {
      if (t.rnd(0, 1)) { const m = t.pick([30, 60, 70, 75, 80, 90]); return { T: F(m), text: minText(m) }; }
      const s = t.rnd(0, 3) * 60 + t.pick([15, 20, 30, 40, 45]); return { T: F(s, 60), text: secText(s) };
    }
    const s = t.pick([60, 75, 80, 90, 100, 120, 150]);
    return { T: F(s), text: s % 30 === 0 && s % 60 && t.rnd(0, 1) ? `${show(F(s, 60))} 分鐘` : secText(s) };
  }
  function basicScenario(t, ask, v, noConv = false) {
    for (;;) {
      const sysKey = t.pick(['kmh', 'kmh', 'mmin', 'mmin', 'ms']), S = SYS[sysKey], sub = t.pick(S.subj), [A, B] = t.pick(sub.routes);
      const want = !noConv && v % 3 !== 0, conv = [];
      let T, Ttext, sv, D, Dtext;
      const intTime = () => sysKey === 'kmh' ? t.rnd(1, 6) : sysKey === 'mmin' ? t.rnd(5, 40) : t.rnd(5, 60);
      if (ask === 'speed' || ask === 'dist') {
        const tc = want && (sysKey === 'kmh' || ask === 'dist' || t.rnd(0, 2) > 0) ? timeConv(t, sysKey, sub) : null;
        T = tc ? tc.T : F(intTime()); Ttext = tc ? tc.text : `${T.n} ${S.time}`;
        if (tc) conv.push({ text: tc.text, v: T, label: '時間', unit: S.time });
        const lo = Math.ceil(sub.lo / T.d), hi = Math.floor(sub.hi / T.d);
        if (ask === 'speed' || t.rnd(0, 3) > 0) { if (hi < lo) continue; sv = F(t.rnd(lo, hi) * T.d); } else sv = F(t.rnd(sub.lo, sub.hi));
        D = mul(sv, T); Dtext = `${show(D)} ${S.dist}`;
        if (ask === 'speed' && want && sysKey !== 'kmh' && (!tc || t.rnd(0, 1)) && D.d === 1 && D.n >= 1000 && D.n % 10 === 0) {
          Dtext = `${show(F(D.n, 1000))} 公里`; conv.push({ text: Dtext, v: D, label: '距離', unit: '公尺' });
        }
      } else {
        sv = F(t.rnd(sub.lo, sub.hi));
        if (sysKey === 'kmh') { const d = t.pick([1, 1, 2, 4]); T = F(t.rnd(1, 5) * d + (d > 1 ? 1 : 0), d); sv = F(Math.max(1, Math.round(sv.n / d)) * d); }
        else T = F(want && sysKey === 'ms' ? t.rnd(100, 200) : intTime());
        D = mul(sv, T); Dtext = `${show(D)} ${S.dist}`;
        if (want && sysKey !== 'kmh' && D.d === 1 && D.n >= 1000 && D.n % 10 === 0) { Dtext = `${show(F(D.n, 1000))} 公里`; conv.push({ text: Dtext, v: D, label: '距離', unit: '公尺' }); }
      }
      if (want && sysKey !== 'kmh' && !conv.length) continue;
      if (D.n <= 0 || T.n <= 0) continue;
      return { sysKey, S, sub, A, B, T, Ttext, sv, D, Dtext, conv, style: t.rnd(0, 3) };
    }
  }
  function basicOptions(s, ask) {
    const D = show(s.D), T = show(s.T), V = show(s.sv);
    if (ask === 'speed') return { opts: [`${D}÷${T}`, `${T}÷${D}`, `${D}×${T}`, `${D}－${T}`], rule: '速率＝距離÷時間', ans: s.sv };
    if (ask === 'time') return { opts: [`${D}÷${V}`, `${V}÷${D}`, `${D}×${V}`, `${D}－${V}`], rule: '時間＝距離÷速率', ans: s.T };
    return { opts: [`${V}×${T}`, `${V}÷${T}`, `${T}÷${V}`, `${V}＋${T}`], rule: '距離＝速率×時間', ans: s.D };
  }
  function basicText(s, ask) {
    const { sub, A, B, S } = s, name = UNITS[S.u].name;
    if (ask === 'speed') return `${A}到${B}的距離是 ${s.Dtext}，${sub.who}從${A}到${B}花了 ${s.Ttext}，${sub.short || sub.who}的${name}是多少${S.dist}？`;
    if (ask === 'time') return `${A}到${B}的距離是 ${s.Dtext}，${sub.who}以${sp(s.sv, S.u, s.style)}的速率從${A}${sub.verb}到${B}，需要多少${S.time}？`;
    return `${sub.who}以${sp(s.sv, S.u, s.style)}的速率${sub.verb}了 ${s.Ttext}，一共${sub.verb}了多少${S.dist}？`;
  }
  function basic(ask, t, v) {
    const s = basicScenario(t, ask, v), q = newQ(ask, t), { S } = s, name = UNITS[S.u].name;
    if (s.conv.length) {
      const fields = s.conv.map(c => val(q, c.label, c.v, c.unit));
      q.step('統一單位', fields, s.conv.map(c => `${c.text}＝${show(c.v)} ${c.unit}`).join('；') + `。${name}要配合「${S.dist}」和「${S.time}」。`,
        UNIT_HINT, s.conv.map((c, i) => `${c.text}＝${ref(fields[i])}`).join('　'));
    } else {
      const f = choiceField(q, '要求的是', ['速率', '時間', '距離'], { speed: 0, time: 1, dist: 2 }[ask], true);
      const why = { speed: `題目問「${name}是多少」，要求的是速率`, time: `題目問「需要多少${S.time}」，要求的是時間`, dist: `題目問「一共${s.sub.verb}了多少${S.dist}」，要求的是距離` }[ask];
      q.step('判斷要求的量', [f], `${why}；單位已經一致，不用換算。`, '看問句最後問什麼：問「時速、分速、秒速」是速率；問「幾小時、幾分鐘」是時間；問「多少公里、公尺」是距離。');
    }
    const o = basicOptions(s, ask);
    const label = ask === 'speed' ? name : ask === 'time' ? '時間' : '距離', unit = ask === 'time' ? S.time : S.dist;
    formulaSteps(q, o.opts, o.rule, SPEED_HINT, label, o.ans, unit);
    q.scenario = { ask, D: s.D, T: s.T, v: s.sv };
    return finish(q, basicText(s, ask));
  }

  /* 圖表 */
  const SCALES = [
    { orient: 'dt', xMax: 9, xStep: 1, xEvery: 1, yMax: 540, yStep: 60, yEvery: 60, du: '公里', tu: '小時', u: 'kmh', fast: [60, 80, 90, 120], slow: [30, 40, 45, 60], names: [['火車', '汽車'], ['高鐵', '火車'], ['A車', 'B車']], verb: '行駛' },
    { orient: 'dt', xMax: 5, xStep: 1, xEvery: 1, yMax: 200, yStep: 40, yEvery: 40, du: '公里', tu: '小時', u: 'kmh', fast: [50, 60, 80], slow: [20, 30, 40], names: [['A車', 'B車'], ['機車', '腳踏車']], verb: '行駛' },
    { orient: 'dt', xMax: 8, xStep: 1, xEvery: 1, yMax: 1600, yStep: 200, yEvery: 200, du: '公尺', tu: '分鐘', u: 'mmin', fast: [150, 200, 250], slow: [50, 100], names: [['哥哥', '弟弟'], ['阿鳩', '阿特']], verb: '移動' },
    { orient: 'td', xMax: 240, xStep: 20, xEvery: 40, yMax: 3, yStep: 0.5, yEvery: 1, du: '公里', tu: '小時', u: 'kmh', fast: [60, 80], slow: [30, 40], names: [['機車', '汽車'], ['A車', 'B車']], verb: '行駛' }
  ];
  /* 找線剛好通過的格線交叉點（給解析用） */
  function gridPoint(sc, speed) {
    for (let i = 1; i * sc.xStep <= sc.xMax + 1e-9; i++) {
      const x = i * sc.xStep;
      if (sc.orient === 'dt') { const y = speed * x; if (y <= sc.yMax && Math.abs(y / sc.yStep - Math.round(y / sc.yStep)) < 1e-9) return { time: x, dist: y }; }
      else { const y = x / speed; if (y <= sc.yMax && Math.abs(y / sc.yStep - Math.round(y / sc.yStep)) < 1e-9) return { time: y, dist: x }; }
    }
    return null;
  }
  function chartSvg(sc, lines) {
    const W = 340, H = 286, L = 50, R = 318, T = 58, B = 246;
    const X = x => L + (R - L) * x / sc.xMax, Y = y => B - (B - T) * y / sc.yMax;
    const nx = Math.round(sc.xMax / sc.xStep), ny = Math.round(sc.yMax / sc.yStep);
    let body = `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="#fff"/>`;
    for (let i = 0; i <= nx; i++) body += `<line x1="${X(i * sc.xStep)}" y1="${T}" x2="${X(i * sc.xStep)}" y2="${B}" stroke="#cbd5e1" stroke-width="1"/>`;
    for (let j = 0; j <= ny; j++) body += `<line x1="${L}" y1="${Y(j * sc.yStep)}" x2="${R}" y2="${Y(j * sc.yStep)}" stroke="#cbd5e1" stroke-width="1"/>`;
    body += `<line x1="${L}" y1="${B}" x2="${R + 6}" y2="${B}" stroke="#334155" stroke-width="1.6"/><line x1="${L}" y1="${B}" x2="${L}" y2="${T - 6}" stroke="#334155" stroke-width="1.6"/>`;
    const text = (x, y, s, anchor = 'middle', size = 11) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="#334155">${s}</text>`;
    for (let i = 0; i <= nx; i++) { const x = i * sc.xStep; if (x > 0 && Math.abs(x / sc.xEvery - Math.round(x / sc.xEvery)) < 1e-9) body += text(X(x), B + 15, x); }
    for (let j = 0; j <= ny; j++) { const y = j * sc.yStep; if (Math.abs(y / sc.yEvery - Math.round(y / sc.yEvery)) < 1e-9 && y > 0) body += text(L - 5, Y(y) + 4, y, 'end'); }
    const [xt, yt] = sc.orient === 'dt' ? [`時間（${sc.tu}）`, `距離（${sc.du}）`] : [`距離（${sc.du}）`, `時間（${sc.tu}）`];
    body += text(L - 30, T - 14, yt, 'start', 11) + text(R + 4, B + 32, xt, 'end', 11) + text(L - 8, B + 15, '0', 'end');
    const colors = ['#2563a8', '#d9480f'];
    lines.forEach((ln, i) => {
      const end = sc.orient === 'dt' ? Math.min(sc.xMax, sc.yMax / ln.speed) : Math.min(sc.xMax, sc.yMax * ln.speed);
      const y = sc.orient === 'dt' ? ln.speed * end : end / ln.speed;
      body += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(end).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="${colors[i]}" stroke-width="2.4" ${i ? 'stroke-dasharray="6 4"' : ''}/>`;
      const lx = 150 + i * 88;
      body += `<line x1="${lx}" y1="18" x2="${lx + 24}" y2="18" stroke="${colors[i]}" stroke-width="2.4" ${i ? 'stroke-dasharray="6 4"' : ''}/>` + text(lx + 28, 22, ln.name, 'start', 12);
    });
    return `<svg class="q-figure q-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${lines.map(l => l.name).join('與')}的時間和距離關係圖" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }
  function graph(t, v) {
    const sc = t.pick(SCALES), [n1, n2] = t.pick(sc.names), name = UNITS[sc.u].name;
    let fast, slow; do { fast = t.pick(sc.fast); slow = t.pick(sc.slow); } while (slow >= fast);
    const firstFast = t.rnd(0, 1) === 1, v1 = firstFast ? fast : slow, v2 = firstFast ? slow : fast;
    const fig = chartSvg(sc, [{ name: n1, speed: v1 }, { name: n2, speed: v2 }]);
    const q = newQ('graph', t);
    const readStep = (nm, speed) => {
      const p = gridPoint(sc, speed), f = val(q, `${nm}的${name}`, F(speed), sc.du);
      q.step(`讀出${nm}的速率`, [f], `${nm}的線通過（${p.time} ${sc.tu}，${p.dist} ${sc.du}）這一點：${p.dist}÷${p.time}＝${speed}，${nm}的${name}是 ${speed} ${sc.du}。`,
        `找${nm}那條線剛好通過格線交叉點的地方，讀出時間和距離，再用「速率＝距離÷時間」。`, `${name} ${ref(f)}`);
    };
    readStep(n1, v1); readStep(n2, v2);
    const kind = v % 3, per = sc.tu === '小時' ? '小時' : '分鐘';
    let ask;
    if (kind === 0) {
      const k = t.rnd(2, sc.tu === '小時' ? 8 : 10), diff = Math.abs(v1 - v2) * k;
      ask = `${sc.verb} ${k} ${sc.tu}後，${n1}和${n2}所${sc.verb}的距離相差多少${sc.du}？`;
      const f = val(q, '相差', F(diff), sc.du);
      q.step('回答問題', [f], `${Math.max(v1, v2)}×${k}－${Math.min(v1, v2)}×${k}＝(${Math.max(v1, v2)}－${Math.min(v1, v2)})×${k}＝${diff}，相差 ${diff} ${sc.du}。`, '先各自算出走了多遠再相減，或用「速率差×時間」。', `(${Math.max(v1, v2)}－${Math.min(v1, v2)})×${k}＝${ref(f)}`);
    } else if (kind === 1) {
      const D = lcm(v1, v2) * t.rnd(1, 2);
      ask = `${D} ${sc.du}的路程，${n1}和${n2}各需要${sc.verb}多少${sc.tu}？`;
      const f1 = val(q, n1, F(D, v1), sc.tu), f2 = val(q, n2, F(D, v2), sc.tu);
      q.step('回答問題', [f1, f2], `時間＝距離÷速率：${n1} ${D}÷${v1}＝${show(F(D, v1))} ${sc.tu}；${n2} ${D}÷${v2}＝${show(F(D, v2))} ${sc.tu}。`, '時間＝距離÷速率。也可以在圖上找距離是 ' + D + ' 的位置。', `${D}÷${v1}＝${ref(f1)}　${D}÷${v2}＝${ref(f2)}`);
    } else {
      ask = `${n1}和${n2}哪一個比較快？快的每${per}比慢的多${sc.verb}多少${sc.du}？`;
      const c = choiceField(q, '比較快的是', [n1, n2], v1 > v2 ? 0 : 1, true), f = val(q, '多走', F(fast - slow), sc.du);
      q.step('回答問題', [c, f], `${fast}＞${slow}，所以${v1 > v2 ? n1 : n2}比較快；每${per}多${sc.verb} ${fast}－${slow}＝${fast - slow} ${sc.du}。`, sc.orient === 'dt' ? '同樣的時間，走得越遠的越快：線越陡的越快。' : '同樣的距離，花的時間越少的越快。', `${ref(c)}　每${per}多 ${ref(f)}`);
    }
    return finish(q, `下面是${n1}、${n2}${sc.verb}時間和距離的關係圖，看圖回答：${ask}`, fig);
  }

  function clock(t, v) {
    const kind = v % 3, q = newQ('clock', t);
    for (;;) {
      const e = kind === 1 ? t.pick([12, 15, 18, 20, 24, 25, 30, 35, 40, 45]) : t.pick([20, 24, 30, 36, 40, 45, 50, 75, 80, 90, 100, 105]);
      const pm = t.rnd(0, 1) === 1, start = (pm ? 13 : 6) * 60 + t.rnd(0, 47) * 5, end = start + e;
      if (pm ? end > 17 * 60 + 55 : end >= 12 * 60) continue;
      const clk = m => { const h = Math.floor(m / 60) % 12 || 12, mm = m % 60; return `${pm ? '下午' : '上午'} ${h} 時${mm ? ` ${mm} 分` : ''}`; };
      const Th = F(e, 60), ths = show(Th);
      const fields = [q.field('經過時間', e, 'number', { unit: '分鐘' })];
      if (kind !== 1) fields.push(val(q, '換成小時', Th, '小時'));
      q.step('算出經過的時間', fields, `從${clk(start)}到${clk(end)}經過 ${e} 分鐘${kind !== 1 ? `，${e}÷60＝${ths} 小時` : ''}。`,
        '先算到下一個整點還有幾分鐘，再加上之後的分鐘數。' + (kind !== 1 ? '時速要用「小時」計算，分鐘 ÷60 換成小時。' : ''), kind !== 1 ? `經過 ${ref(fields[0])}＝${ref(fields[1])}` : `經過 ${ref(fields[0])}`);
      if (kind === 0) {
        const step = 60 / gcd(60, e), sv = t.rnd(Math.ceil(40 / step), Math.floor(120 / step)) * step, D = sv * e / 60;
        const who = t.pick([['媽媽', '開車'], ['爸爸', '騎機車'], ['叔叔', '開車']]);
        formulaSteps(q, [`${D}÷${ths}`, `${ths}÷${D}`, `${D}×${ths}`, `${D}÷${e}`], '速率＝距離÷時間，時速的時間要用小時', '求時速，距離用公里、時間用小時。', '時速', F(sv), '公里');
        return finish(q, `${who[0]}${clk(start)}${who[1]}出發，到 ${D} 公里遠的地方，${clk(end)}到達目的地，${who[0]}${who[1]}的時速是多少公里？`);
      }
      if (kind === 1) {
        const sv = t.rnd(50, 250), D = sv * e, who = t.pick(['阿鳩走路', '小特騎腳踏車', '哥哥慢跑']);
        formulaSteps(q, [`${D}÷${e}`, `${e}÷${D}`, `${D}×${e}`, `${D}÷${ths}`], '速率＝距離÷時間，分速的時間要用分鐘', '求分速，距離用公尺、時間用分鐘。', '分速', F(sv), '公尺');
        return finish(q, `${who}${clk(start)}從家裡出發，${clk(end)}到達 ${D} 公尺外的${t.pick(['學校', '圖書館', '鳩特數理'])}，${who}的分速是多少公尺？`);
      }
      const step = 60 / gcd(60, e), sv = t.rnd(Math.ceil(60 / step), Math.floor(280 / step)) * step, D = sv * e / 60;
      const [who, A, B] = t.pick([['高鐵', '臺中站', '左營站'], ['自強號', '苗栗站', '臺北站'], ['客運', '苗栗', '臺中']]);
      formulaSteps(q, [`${sv}×${ths}`, `${sv}÷${ths}`, `${sv}×${e}`, `${ths}÷${sv}`], '距離＝速率×時間，時速要乘以「小時」', '時速乘以小時數，才會得到公里數。', '距離', F(D), '公里');
      return finish(q, `${who}${clk(start)}從${A}出發，${clk(end)}到達${B}，${who}行駛的時速是 ${sv} 公里，${A}到${B}的距離是多少公里？`);
    }
  }

  function twoStage(t, v) {
    const q = newQ('twoStage', t), [x] = t.pick(NAMES);
    if (v % 2 === 0) {
      for (;;) {
        const a = t.pick([60, 64, 72, 75, 80, 84, 90]), b = t.pick([120, 144, 150, 160, 180, 200, 240]), D = lcm(a, b) * t.rnd(1, 3), T = D / a, R = D / b;
        if (T < 5 || T > 60 || R < 2) continue;
        const f = q.field('路程', D, 'number', { unit: '公尺' });
        q.step('先算出路程', [f], `${a}×${T}＝${D}，這段路程是 ${D} 公尺。`, '距離＝速率×時間。', `${a}×${T}＝${ref(f)}`);
        formulaSteps(q, [`${D}÷${b}`, `${b}÷${D}`, `${D}×${b}`, `${a}×${T}÷${a}`], '時間＝距離÷速率', '同一段路程，改用跑步的速率來算時間。', '時間', F(R), '分鐘');
        return finish(q, `${x}走路的速率是 ${a} 公尺/分，跑步的速率是 ${b} 公尺/分，${x}走 ${T} 分鐘的路程，改用跑步需要幾分鐘？`);
      }
    }
    let s, T1, T2;
    do { s = t.rnd(50, 90); T1 = t.rnd(10, 30); T2 = t.rnd(5, 30); } while (T1 === T2);
    const D1 = s * T1, D2 = s * T2, [P1, P2] = t.pick([['郵局', '外婆家'], ['公園', '圖書館'], ['車站', '鳩特數理']]);
    const f = q.field('速率', s, 'number', { unit: '公尺/分' });
    q.step('先算出速率', [f], `${D1}÷${T1}＝${s}，速率是每分鐘 ${s} 公尺。`, '速率＝距離÷時間。', `${D1}÷${T1}＝${ref(f)}`);
    formulaSteps(q, [`${D2}÷${s}`, `${s}÷${D2}`, `${D2}×${s}`, `${D2}÷${T1}`], '時間＝距離÷速率', '用相同的速率走另一段路，時間＝距離÷速率。', '時間', F(T2), '分鐘');
    return finish(q, `${x}家離${P1} ${D1} 公尺，${P1}離${P2} ${D2} 公尺，${x}從家裡走到${P1}花了 ${T1} 分鐘，用相同的速率從${P1}走到${P2}，要花幾分鐘？`);
  }

  function echo(t, v) {
    const q = newQ('echo', t), water = v % 2 === 0;
    const s = water ? 1450 : 340, sec = water ? t.rnd(2, 8) : t.pick([1, 2, 3, 4, 5]), total = s * sec, depth = F(total, 2);
    const f = q.field('聲音共走了', total, 'number', { unit: '公尺' });
    q.step('算出聲音來回共走多遠', [f], `${s}×${sec}＝${total}，聲音一去一回共走了 ${total} 公尺。`, '聽到回音，代表聲音走到底（山壁）又反彈回來。', `${s}×${sec}＝${ref(f)}`);
    formulaSteps(q, [`${total}÷2`, `${total}×2`, `${s}×${sec}`, `${total}÷${sec}`], '聲音走了「一去一回」，單程距離是來回距離的一半', '回音是來回的距離，要求單程就要 ÷2。', water ? '水深' : '距離', depth, '公尺');
    return finish(q, water
      ? `聲音在水中傳播的速率大約是 ${s} 公尺/秒。漁船從水平面發出聲波，${sec} 秒鐘後聽到回音，該處的水深大約是多少公尺？`
      : `聲音在空氣中傳播的速率大約是每秒 ${s} 公尺。阿鳩對著山壁大喊，${sec} 秒鐘後聽到回音，阿鳩和山壁相距大約多少公尺？`);
  }

  function earlier(t, v) {
    const q = newQ('earlier', t);
    for (;;) {
      const T = t.rnd(2, 6), e = t.pick([F(1, 2), F(1)]), T2 = sub(F(T), e), D = t.rnd(30, 180);
      const old = F(D, T), neu = div(F(D), T2), inc = sub(neu, old);
      if (!nice(old, 1) || !nice(neu, 1) || inc.n <= 0) continue;
      const perMin = v % 2 === 1, incM = mul(inc, F(1000, 60));
      if (perMin && incM.d !== 1) continue;
      const f1 = val(q, '原本的時速', old, '公里');
      q.step('算出原本的速率', [f1], `${D}÷${T}＝${show(old)}，原本時速 ${show(old)} 公里。`, '速率＝距離÷時間。', `${D}÷${T}＝${ref(f1)}`);
      const f2 = val(q, '新的時速', neu, '公里');
      q.step('算出提早後的速率', [f2], `提早 ${show(e)} 小時，只剩 ${T}－${show(e)}＝${show(T2)} 小時；${D}÷${show(T2)}＝${show(neu)}。`, '先算出剩下的時間，再用距離÷時間。', `${D}÷${show(T2)}＝${ref(f2)}`);
      const f3 = perMin ? q.field('每分鐘要多騎', incM.n, 'number', { unit: '公尺' }) : val(q, '時速要增加', inc, '公里');
      q.step('算出要增加多少', [f3], `${show(neu)}－${show(old)}＝${show(inc)}，時速要增加 ${show(inc)} 公里${perMin ? `；換成分速：${show(inc)}×1000÷60＝${incM.n}，每分鐘要多騎 ${incM.n} 公尺` : ''}。`, perMin ? '先算時速差，再換成分速：×1000÷60。' : '新的速率減去原本的速率。', perMin ? `(${show(neu)}－${show(old)})×1000÷60＝${ref(f3)}` : `${show(neu)}－${show(old)}＝${ref(f3)}`);
      return finish(q, `哥哥騎單車運動，預計花 ${T} 小時騎完 ${D} 公里，若想要提前 ${show(e, 'frac')} 小時騎完全程，${perMin ? '則每分鐘的速率要增加多少公尺' : '則時速要增加多少公里'}？`);
    }
  }

  /* ================= 三、速率單位的換算 ================= */
  const SOURCES = {
    ms: () => [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 1.5, 2.5, 12.5],
    mmin: () => [60, 90, 120, 150, 180, 210, 240, 300, 360, 450, 600, 720, 900, 1200, 1500, 1800],
    kmh: () => [9, 12, 18, 27, 36, 45, 54, 60, 72, 75, 90, 108, 120],
    kms: () => [0.3, 0.34, 1.2, 1.5, 2],
    kmmin: () => [0.2, 0.3, 0.5, 0.6, 0.8, 1.2, 1.5, 2]
  };
  function methodOptions(t, right) { return [right, ...t.shuffle(ALL_METHODS.filter(m => m !== right)).slice(0, 3)]; }
  function unitConvert(t, v) {
    const q = newQ('unitConvert', t);
    if (v % 3 === 2) {
      for (;;) {
        const [a, b, c] = t.pick([['ms', 'kms', 'kmh'], ['mmin', 'ms', 'kmh'], ['kmh', 'ms', 'mh'], ['ms', 'mmin', 'kmh'], ['kmh', 'mmin', 'ms']]);
        const x = F(t.pick(SOURCES[a]())), y1 = convert(x, a, b), y2 = convert(x, a, c);
        if (!nice(y1, 3) || !nice(y2, 3)) continue;
        const m1 = METHODS[`${a}>${b}`], m2 = METHODS[`${b}>${c}`];
        const f1 = val(q, UNITS[b].name, y1, UNITS[b].d);
        q.step('填第一格', [f1], `${uText(x, a)} 換成${UNITS[b].name}${UNITS[b].d === UNITS[a].d ? '' : `（單位${UNITS[b].d}）`}：${m1}，${calc(x, m1)}＝${show(y1)}。`, `${UNITS[a].name}${UNITS[a].d}→${UNITS[b].name}${UNITS[b].d}：${m1}。`, `${calc(x, m1)}＝${ref(f1)}`);
        const f2 = val(q, UNITS[c].name, y2, UNITS[c].d);
        q.step('填第二格', [f2], `再由${uText(y1, b)} 換成${UNITS[c].name}：${m2}，${calc(y1, m2)}＝${show(y2)}。`, `${UNITS[b].name}${UNITS[b].d}→${UNITS[c].name}${UNITS[c].d}：${m2}。`, `${calc(y1, m2)}＝${ref(f2)}`);
        return finish(q, `寫出相同的速率：${uText(x, a)}＝${uBlank(b)}＝${uBlank(c)}`, '', [f1, f2]);
      }
    }
    const pairs = ['ms>mmin', 'mmin>ms', 'mmin>kmh', 'kmh>mmin', 'ms>kmh', 'kmh>ms', 'ms>kms', 'kmh>kmmin', 'kmmin>kmh', 'kmmin>mmin'];
    for (;;) {
      const key = t.pick(pairs), [a, b] = key.split('>'), x = F(t.pick(SOURCES[a]())), y = convert(x, a, b);
      if (!nice(y, 3)) continue;
      const m = METHODS[key];
      const c = choiceField(q, '換算方法', methodOptions(t, m), 0);
      const why = [];
      if (UNITS[a].per !== UNITS[b].per) why.push(`每${UNITS[a].per}換成每${UNITS[b].per}，時間變${(UNITS[a].per === '秒' || (UNITS[a].per === '分鐘' && UNITS[b].per === '小時')) ? '長，走的距離變多' : '短，走的距離變少'}`);
      if (UNITS[a].d !== UNITS[b].d) why.push(`${UNITS[a].d}換成${UNITS[b].d}`);
      q.step('選出換算方法', [c], `${why.join('；')}，所以要 ${m}。`, '時速→分速→秒速：每次 ÷60（反過來 ×60）；公里→公尺 ×1000，公尺→公里 ÷1000。');
      const f = val(q, UNITS[b].name, y, UNITS[b].d);
      q.step('算出答案', [f], `${calc(x, m)}＝${show(y)}，${uText(x, a)}＝${uText(y, b)}。`, '照選好的方法依序計算。', `${calc(x, m)}＝${ref(f)}`);
      return finish(q, `${uText(x, a)}＝${uBlank(b)}`);
    }
  }

  /* 把「m（公尺/分）」寫成各種樣子 */
  function rep(t, m, form, verb) {
    const kmh = mul(m, F(60, 1000)), ms = div(m, F(60));
    if (form === 'kmh') return nice(kmh, 1) ? sp(kmh, 'kmh', t.pick([0, 2, 3])) : null;
    if (form === 'mmin') return m.d === 1 ? sp(m, 'mmin', t.pick([0, 2, 3])) : null;
    if (form === 'ms') return nice(ms, 1) ? sp(ms, 'ms', t.pick([0, 2, 3])) : null;
    if (form === 'DTh') { const h = t.pick([2, 3, 4]), D = mul(kmh, F(h)); return nice(D, 1) ? `${h} 小時${verb} ${show(D)} 公里` : null; }
    if (form === 'DTm') { const k = t.pick([2, 4, 5, 10, 20, 30]), D = mul(m, F(k)); return D.d === 1 ? (D.n >= 1000 && D.n % 100 === 0 ? `${k} 分鐘${verb} ${show(F(D.n, 1000))} 公里` : `${k} 分鐘${verb} ${D.n} 公尺`) : null; }
    const s = t.pick([5, 10, 20]), D = mul(ms, F(s)); return D.d === 1 ? `${s} 秒鐘${verb} ${D.n} 公尺` : null;
  }
  function unitCompare(t, v) {
    const three = v % 2 === 1;
    const ctx = three
      ? t.pick([{ names: ['小宗', '小虎', '小龍'], kind: 'race', lo: 120, hi: 300, verb: '跑' }, { names: ['甲車', '乙車', '丙車'], kind: 'car', lo: 900, hi: 1800, verb: '行駛' }, { names: ['阿鳩', '阿特', '小鳩'], kind: 'race', lo: 150, hi: 330, verb: '跑' }])
      : t.pick([{ names: ['河馬', '犀牛'], kind: 'animal', lo: 600, hi: 1100, verb: '跑' }, { names: ['媽媽', '爸爸'], kind: 'moto', lo: 500, hi: 1500, verb: '騎' }, { names: ['斑馬', '長頸鹿'], kind: 'animal', lo: 700, hi: 1000, verb: '跑' }]);
    const target = t.pick(['mmin', 'mmin', 'kmh', 'ms']);
    let items;
    for (let tries = 0; ; tries++) {
      const forms = ctx.kind === 'race' ? t.shuffle(['DTh', 'DTm', 'DTs']) : ctx.kind === 'car' ? t.shuffle(['kmh', 'mmin', 'ms']) : t.shuffle(['kmh', 'mmin', 'ms', 'DTm']).slice(0, 2);
      items = ctx.names.slice(0, three ? 3 : 2).map((name, i) => {
        const m = F(5 * t.rnd(Math.ceil(ctx.lo / 5), Math.floor(ctx.hi / 5)));
        return { name, m, form: forms[i], text: rep(t, m, forms[i], ctx.verb), tv: convert(m, 'mmin', target) };
      });
      const ms = items.map(it => it.m.n).sort((a, b) => a - b);
      if (items.some(it => !it.text || !nice(it.tv, 2))) continue;
      if (!ms.every((x, i) => i === 0 || x - ms[i - 1] >= 10)) continue;
      if (items.every(it => it.form === target)) continue;
      break;
    }
    const fastWant = t.rnd(0, 1) === 1, sorted = items.slice().sort((a, b) => a.m.n - b.m.n), pickIt = fastWant ? sorted[sorted.length - 1] : sorted[0];
    const word = fastWant ? '快' : '慢';
    let text;
    if (ctx.kind === 'race') text = `${items.map(it => it.name).join('、')}三人各自以固定速率賽跑，${items.map(it => `${it.name} ${it.text}`).join('，')}，同時出發後，誰最${word}到達終點？`;
    else if (ctx.kind === 'car') text = `${items.map(it => `${it.name}的速率是 ${it.text}`).join('，')}，哪一輛車的速率最${word}？`;
    else if (ctx.kind === 'animal') text = `${items.map(it => `一隻${it.name}奔跑的速率是 ${it.text}`).join('，')}。哪一隻動物奔跑的速率比較${word}？`;
    else text = `${items.map(it => `${it.name}騎摩托車的速率是 ${it.text}`).join('，')}，誰騎車的速率比較${word}？`;
    const q = newQ('unitCompare', t), need = items.filter(it => it.form !== target);
    const fields = need.map(it => val(q, `${it.name}的${UNITS[target].name}`, it.tv, UNITS[target].d));
    q.step(`都換成${UNITS[target].name}（${UNITS[target].d}）`, fields, items.map(it => `${it.name}：${it.text}＝${uText(it.tv, target)}`).join('；') + '。',
      '時速（公里）→分速（公尺）：×1000÷60；分速→秒速：÷60。「幾小時（分鐘、秒）走多少」先用距離÷時間算出速率。', need.map((it, i) => `${it.name}：${ref(fields[i])}`).join('　'));
    const c = choiceField(q, '答案', items.map(it => it.name), items.indexOf(pickIt), true);
    q.step('比較快慢', [c], `${sorted.map(it => `${it.name}（${show(it.tv)}）`).join('＜')}，所以最${word}的是${pickIt.name}。`, '單位相同後，數字越大越快。');
    return finish(q, text);
  }

  /* ================= 四、速率的應用 ================= */
  function sumDiffStep(q, useSum, why) {
    const f = choiceField(q, '要用', ['速率和（兩人速率相加）', '速率差（兩人速率相減）'], useSum ? 0 : 1, true);
    q.step('判斷用速率和還是速率差', [f], why, '想一想：一分鐘後兩人的距離怎麼變？反方向、相向而行用「速率和」；同方向用「速率差」。');
  }
  function walkers(t, lo = 55, hi = 95) { let a, b; do { a = t.rnd(lo, hi); b = t.rnd(lo, hi); } while (Math.abs(a - b) < 3); return [a, b]; }
  function apart(t, v) {
    const same = v % 2 === 0, [x, y] = t.pick(NAMES), [a, b] = walkers(t), m = t.rnd(5, 25), big = Math.max(a, b), small = Math.min(a, b);
    const phrase = same ? t.pick(['同時同地同方向出發', '同時從同一個地方往同一個方向出發']) : t.pick(['同時同地反方向出發', '同時從同一個地方背對背出發', '同時同地反向而行']);
    const q = newQ('apart', t);
    sumDiffStep(q, !same, same ? `同方向出發，快的人每分鐘比慢的人多走 ${big}－${small}＝${big - small} 公尺，這就是兩人每分鐘拉開的距離。` : `反方向出發，兩人每分鐘一共拉開 ${a}＋${b}＝${a + b} 公尺。`);
    const S = `(${a}＋${b})`, Dd = `(${big}－${small})`, right = same ? `${Dd}×${m}` : `${S}×${m}`;
    formulaSteps(q, [right, same ? `${S}×${m}` : `${Dd}×${m}`, same ? `${Dd}÷${m}` : `${S}÷${m}`, `${a}×${m}`], `兩人相距＝${same ? '速率差' : '速率和'}×時間`, '相距的距離＝每分鐘拉開的距離×經過的分鐘數。', '兩人相距', F((same ? big - small : a + b) * m), '公尺');
    return finish(q, `${x}走路的分速是 ${a} 公尺，${y}走路的分速是 ${b} 公尺，兩人${phrase}，${m} 分鐘後，兩人相距多少公尺？`);
  }
  function meet(t, v) {
    const q = newQ('meet', t);
    if (v % 2 === 0) {
      const [x, y] = t.pick(NAMES), [a, b] = walkers(t), m = t.rnd(6, 20), D = (a + b) * m, big = Math.max(a, b), small = Math.min(a, b);
      sumDiffStep(q, true, `相向而行，兩人每分鐘一共靠近 ${a}＋${b}＝${a + b} 公尺。`);
      formulaSteps(q, [`${D}÷(${a}＋${b})`, `${D}×(${a}＋${b})`, `${D}÷(${big}－${small})`, `(${a}＋${b})÷${D}`], '相遇時間＝兩人的距離÷速率和', '兩人一起把中間的距離走完，每分鐘一共走「速率和」。', '相遇時間', F(m), '分鐘');
      return finish(q, `${x}和${y}相距 ${D} 公尺，${x}走路的分速是 ${a} 公尺，${y}走路的分速是 ${b} 公尺，兩人${t.pick(['同時相向出發', '同時相向而行', '同時面對面出發'])}，幾分鐘後相會？`);
    }
    for (;;) {
      const a = t.rnd(12, 20), b = t.pick([150, 180, 200, 210, 240, 250, 270, 300]), bk = F(b * 60, 1000), h = t.pick([F(1), F(3, 2), F(2), F(1, 2)]);
      const covered = mul(add(F(a), bk), h), D = Math.ceil(covered.n / covered.d) + t.rnd(3, 25), remain = sub(F(D), covered);
      if (eq(bk, F(a))) continue;
      const hs = show(h), bs = show(bk), big = less(bk, F(a)) ? `${a}－${bs}` : `${bs}－${a}`;
      const f = val(q, '弟弟的時速', bk, '公里');
      q.step('統一單位', [f], `分速 ${b} 公尺：×60÷1000，${b}×60÷1000＝${bs}，也就是時速 ${bs} 公里。`, '分速（公尺）換成時速（公里）：×60，再÷1000。', `分速 ${b} 公尺＝時速 ${ref(f)}`);
      formulaSteps(q, [`${D}－(${a}＋${bs})×${hs}`, `${D}－(${big})×${hs}`, `(${a}＋${bs})×${hs}`, `${D}÷(${a}＋${bs})`], '相向而行，兩人一起走了「速率和×時間」，剩下的距離＝原來的距離－一起走的距離', '先算兩人一共走了多遠，再從原本的距離扣掉。', '還相距', remain, '公里');
      return finish(q, `哥哥和弟弟兩人相距 ${D} 公里，哥哥騎單車的時速是 ${a} 公里，弟弟騎單車的分速是 ${b} 公尺，兩人同時相向出發，${hs} 小時後，兩人還相距多少公里？`);
    }
  }
  function ring(t, v) {
    const q = newQ('ring', t), [x, y] = t.pick(NAMES);
    if (v % 2 === 0) {
      for (;;) {
        const L = t.pick([200, 300, 400, 500, 600]), T1 = t.rnd(3, 10), T2 = t.rnd(3, 10), T = t.pick([40, 45, 60, 90]);
        if (T1 === T2 || L % T1 || L % T2) continue;
        const a = L / T1, b = L / T2, total = (a + b) * T;
        if (total % L === 0) continue;
        const times = Math.floor(total / L);
        const f1 = q.field(`${x}的分速`, a, 'number', { unit: '公尺' }), f2 = q.field(`${y}的分速`, b, 'number', { unit: '公尺' });
        q.step('先算兩人的分速', [f1, f2], `${x}：${L}÷${T1}＝${a}；${y}：${L}÷${T2}＝${b}。`, '走一圈的距離÷走一圈的時間＝分速。', `${x} ${L}÷${T1}＝${ref(f1)}　${y} ${L}÷${T2}＝${ref(f2)}`);
        const f3 = q.field('兩人合走', total, 'number', { unit: '公尺' });
        q.step('算出兩人一共走了多遠', [f3], `(${a}＋${b})×${T}＝${total}，兩人 ${minText(T)}一共走了 ${total} 公尺。`, '反方向繞圈，兩人一共走一圈就會相遇一次。', `(${a}＋${b})×${T}＝${ref(f3)}`);
        const f4 = q.field('相遇次數', times, 'number', { unit: '次' });
        q.step('算出相遇次數', [f4], `${total}÷${L}＝${Math.floor(total / L)}……${total % L}，兩人合走滿 ${times} 圈，所以相遇 ${times} 次。`, '合走幾整圈，就相遇幾次；不滿一圈的部分還沒相遇。', `${total}÷${L}→${ref(f4)}`);
        return finish(q, `操場一圈有 ${L} 公尺，${x}走一圈要 ${T1} 分鐘，${y}走一圈要 ${T2} 分鐘，${x}、${y}兩人同時同地反方向出發，經過 ${minText(T)}，兩人會相遇幾次？`);
      }
    }
    for (;;) {
      const a10 = t.rnd(25, 50), b10 = t.rnd(25, 50), sec = t.rnd(20, 60), L = (a10 + b10) * sec / 10;
      if (a10 === b10 || !Number.isInteger(L) || L < 150 || L > 600) continue;
      const a = F(a10, 10), b = F(b10, 10), as = show(a), bs = show(b), big = a10 > b10 ? `${as}－${bs}` : `${bs}－${as}`;
      sumDiffStep(q, true, `反方向繞圈，兩人一共跑完一圈就第一次相遇，每秒一共跑 ${as}＋${bs}＝${show(add(a, b))} 公尺。`);
      const c = choiceField(q, '正確算式', [`${L}÷(${as}＋${bs})`, `${L}÷(${big})`, `${L}×(${as}＋${bs})`, `(${as}＋${bs})÷${L}`], 0);
      q.step('選出正確算式', [c], `第一次相遇時，兩人合跑了一圈 ${L} 公尺，相遇時間＝${L}÷(${as}＋${bs})。`, '兩人合跑一圈就會相遇。');
      const f1 = q.field('相遇時間', sec, 'number', { unit: '秒' }), f2 = val(q, x, mul(a, F(sec)), '公尺'), f3 = val(q, y, mul(b, F(sec)), '公尺');
      q.step('算出答案', [f1, f2, f3], `${L}÷${show(add(a, b))}＝${sec} 秒；${x}跑了 ${as}×${sec}＝${show(mul(a, F(sec)))} 公尺，${y}跑了 ${bs}×${sec}＝${show(mul(b, F(sec)))} 公尺。`, '先求相遇時間，再用「速率×時間」算出各跑多遠；兩人加起來剛好一圈。', `${L}÷(${as}＋${bs})＝${ref(f1)}　${x} ${as}×${sec}＝${ref(f2)}　${y} ${bs}×${sec}＝${ref(f3)}`);
      q.formulaCheck = { choice: c.key, answer: f1.key };
      return finish(q, `圓形水池一圈是 ${L} 公尺，${x}跑步的秒速是 ${as} 公尺，${y}跑步的秒速是 ${bs} 公尺，兩人同時同地反方向出發，經過幾秒鐘後兩人會第一次相遇？相遇時各跑了幾公尺？`, '', [f1, f2, f3]);
    }
  }
  function remain(t, v) {
    const q = newQ('remain', t), kind = v % 3, [x, y] = t.pick(NAMES);
    if (kind === 0) {
      for (;;) {
        const a10 = t.rnd(6, 15), b10 = t.rnd(4, 12), unit = lcm(lcm(a10, b10), 10) / 10;
        if (b10 >= a10 || unit > 400) continue;
        const H = unit * t.rnd(Math.ceil(100 / unit), Math.floor(400 / unit));
        if (H < 100) continue;
        const a = F(a10, 10), b = F(b10, 10), tA = div(F(H), a), tB = div(F(H), b), d = sub(tB, tA);
        const f1 = val(q, `${x}到涼亭`, tA, '秒'), f2 = val(q, `${y}到涼亭`, tB, '秒'), f3 = val(q, '還要', d, '秒');
        q.step(`算出${x}到涼亭的時間`, [f1], `涼亭在中間，各要走 ${2 * H}÷2＝${H} 公尺；${H}÷${show(a)}＝${show(tA)} 秒。`, '涼亭在兩人的正中間，各要走全程的一半。時間＝距離÷速率。', `${H}÷${show(a)}＝${ref(f1)}`);
        q.step(`算出${y}到涼亭的時間`, [f2], `${H}÷${show(b)}＝${show(tB)} 秒。`, '時間＝距離÷速率。', `${H}÷${show(b)}＝${ref(f2)}`);
        q.step('相減', [f3], `${show(tB)}－${show(tA)}＝${show(d)}，${y}還要 ${show(d)} 秒才會到涼亭。`, '兩人同時出發，到達時間的差就是還要等的時間。', `${show(tB)}－${show(tA)}＝${ref(f3)}`);
        return finish(q, `${x}和${y}兩人相距 ${2 * H} 公尺，${x}每秒鐘走 ${show(a)} 公尺，${y}每秒鐘走 ${show(b)} 公尺，兩人同時出發相向而行，相約在中間的涼亭碰面，當${x}到達涼亭時，${y}還要幾秒鐘才會到涼亭？`);
      }
    }
    if (kind === 1) {
      for (;;) {
        const a = t.rnd(56, 90), b = t.rnd(50, 85), D = 50 * t.rnd(20, 60);
        if (b >= a || (2 * D) % a || (2 * D) % b) continue;
        const tA = F(D, a), tB = F(D, b), d = sub(tB, tA), place = t.pick(['書店', '公園', '體育館']);
        const f1 = val(q, `${x}到${place}`, tA, '分鐘'), f2 = val(q, `${y}到${place}`, tB, '分鐘'), f3 = val(q, '還要', d, '分鐘');
        q.step(`算出${x}到${place}的時間`, [f1], `${show(F(D, 1000))} 公里＝${D} 公尺，${D}÷${a}＝${show(tA)} 分鐘。`, '先把公里換成公尺，再用時間＝距離÷速率。', `${D}÷${a}＝${ref(f1)}`);
        q.step(`算出${y}到${place}的時間`, [f2], `${D}÷${b}＝${show(tB)} 分鐘。`, '時間＝距離÷速率。', `${D}÷${b}＝${ref(f2)}`);
        q.step('相減', [f3], `${show(tB)}－${show(tA)}＝${show(d)}，${y}還要 ${show(d)} 分鐘才會到${place}。`, '兩人同時出發，到達時間的差就是答案。', `${show(tB)}－${show(tA)}＝${ref(f3)}`);
        return finish(q, `${x}和${y}兩人走路的速率分別是 ${a} 公尺/分、${b} 公尺/分。兩人同時同地走向 ${show(F(D, 1000))} 公里遠的${place}，當${x}到達${place}時，${y}還要幾分鐘才會到${place}？`);
      }
    }
    for (;;) {
      const L = t.pick([1000, 1200, 1500, 2000, 2400, 3000]), a = t.pick([3, 4, 5, 6]), b = t.rnd(30, 60) * 5, tMin = F(L, a * 60);
      const done = mul(F(b), tMin), left = sub(F(L), done);
      if (left.n <= 0 || !nice(tMin, 2) || !nice(done, 2)) continue;
      const f1 = val(q, `${x}跑完全程`, tMin, '分鐘'), f2 = val(q, `${y}已經跑了`, done, '公尺'), f3 = val(q, `${y}距離終點`, left, '公尺');
      q.step(`算出${x}跑完全程的時間`, [f1], `${L}÷${a}＝${L / a} 秒，${L / a}÷60＝${show(tMin)} 分鐘。`, `${x}用秒速、${y}用分速，先把時間換成分鐘。`, `${L}÷${a}÷60＝${ref(f1)}`);
      q.step(`算出這段時間${y}跑了多遠`, [f2], `${b}×${show(tMin)}＝${show(done)} 公尺。`, '距離＝速率×時間。', `${b}×${show(tMin)}＝${ref(f2)}`);
      q.step('算出還差多遠', [f3], `${L}－${show(done)}＝${show(left)}，${y}距離終點還有 ${show(left)} 公尺。`, '全程減去已經跑的距離。', `${L}－${show(done)}＝${ref(f3)}`);
      return finish(q, `${x}和${y}參加 ${L} 公尺賽跑，${x}的秒速是 ${a} 公尺，${y}的分速是 ${b} 公尺，兩人同時同地出發，當${x}到終點時，${y}距離終點還有多少公尺？`);
    }
  }
  function avgSteps(q, D, Dunit, Dexpl, Dpat, T, Tunit, Texpl, Tpat, avg, avgLabel, avgUnit, avgExpl, avgPat) {
    const f1 = val(q, '全程距離', D, Dunit), f2 = val(q, '全部時間', T, Tunit), f3 = val(q, avgLabel, avg, avgUnit);
    q.step('算出全程距離', [f1], Dexpl, '平均速率要用「全程距離」，來回的話是單程的 2 倍。', `${Dpat}＝${ref(f1)}`);
    q.step('算出全部時間', [f2], Texpl, '每一段的時間都要加進來；不知道的時間用「距離÷速率」算出。', `${Tpat}＝${ref(f2)}`);
    q.step('算出平均速率', [f3], avgExpl, '平均速率＝全程距離÷全部時間。不能把兩個速率直接相加除以 2。', `${avgPat}＝${ref(f3)}`);
  }
  function roundTrip(t, v) {
    const q = newQ('roundTrip', t);
    if (v % 2 === 0) {
      for (;;) {
        const v1 = t.rnd(2, 5), v2 = t.rnd(3, 7), t1 = t.rnd(2, 8);
        if (v2 <= v1) continue;
        const D = v1 * t1, t2 = F(D, v2), T = add(F(t1), t2), avg = div(F(2 * D), T);
        if (!nice(t2, 2) || !nice(avg, 2)) continue;
        const [x] = t.pick(NAMES);
        avgSteps(q, F(2 * D), '公里', `上山 ${v1}×${t1}＝${D} 公里，來回共 ${D}×2＝${2 * D} 公里。`, `${v1}×${t1}×2`,
          T, '小時', `下山 ${D}÷${v2}＝${show(t2)} 小時，共 ${t1}＋${show(t2)}＝${show(T)} 小時。`, `${t1}＋${D}÷${v2}`,
          avg, '平均速率', '公里/時', `${2 * D}÷${show(T)}＝${show(avg)}，全程的平均速率是時速 ${show(avg)} 公里。`, `${2 * D}÷${show(T)}`);
        return finish(q, `${x}登山，以 ${v1} 公里/時的速率上山，走了 ${t1} 小時到達山頂，再以 ${v2} 公里/時的速率沿著原路下山，${x}這次登山全程的平均速率是多少公里/時？`);
      }
    }
    for (;;) {
      const a10 = t.rnd(2, 6), b10 = t.rnd(3, 8), t1 = t.rnd(6, 20);
      if (b10 <= a10) continue;
      const a = F(a10, 10), b = F(b10, 10), D = mul(a, F(t1)), t2 = div(D, b), T = add(F(t1), t2), avg = div(mul(D, F(2)), div(T, F(60)));
      if (!nice(D, 2) || !nice(t2, 1) || !nice(avg, 2)) continue;
      const [x] = t.pick(NAMES), place = t.pick(['美術館', '圖書館', '鳩特數理']);
      avgSteps(q, mul(D, F(2)), '公里', `去程 ${show(a)}×${t1}＝${show(D)} 公里，來回共 ${show(mul(D, F(2)))} 公里。`, `${show(a)}×${t1}×2`,
        T, '分鐘', `回程 ${show(D)}÷${show(b)}＝${show(t2)} 分鐘，共 ${t1}＋${show(t2)}＝${show(T)} 分鐘。`, `${t1}＋${show(D)}÷${show(b)}`,
        avg, '平均速率', '公里/時', `${show(T)} 分鐘＝${show(div(T, F(60)))} 小時，${show(mul(D, F(2)))}÷${show(div(T, F(60)))}＝${show(avg)}，平均速率是時速 ${show(avg)} 公里。`, `${show(mul(D, F(2)))}÷(${show(T)}÷60)`);
      return finish(q, `${x}以分速 ${show(a)} 公里的速率，花 ${t1} 分鐘從家裡騎腳踏車到${place}，回家時，以分速 ${show(b)} 公里沿著原路返回，來回${place}的平均速率是多少公里/時？`);
    }
  }
  function lineFigure(a, b) {
    const L = 20, R = 300, mid = L + (R - L) * a / (a + b);
    const tx = (x, y, s, size = 13) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#334155">${s}</text>`;
    return `<svg class="q-figure q-line" viewBox="0 0 320 70" role="img" aria-label="甲地、乙地、丙地的距離圖" xmlns="http://www.w3.org/2000/svg"><line x1="${L}" y1="44" x2="${R}" y2="44" stroke="#334155" stroke-width="2"/>${[L, mid, R].map(x => `<line x1="${x}" y1="36" x2="${x}" y2="52" stroke="#334155" stroke-width="2"/>`).join('')}${tx(L, 26, '甲')}${tx(mid, 26, '乙')}${tx(R, 26, '丙')}${tx((L + mid) / 2, 38, `${a} 公里`, 12)}${tx((mid + R) / 2, 38, `${b} 公里`, 12)}</svg>`;
  }
  function threePlace(t, v) {
    const q = newQ('threePlace', t);
    if (v % 2 === 0) {
      for (;;) {
        const t1 = F(t.rnd(2, 12), 10), t2 = F(t.rnd(2, 12), 10), v1 = t.rnd(4, 10) * 10, v2 = t.rnd(4, 10) * 10;
        if (v1 === v2) continue;
        const D1 = mul(F(v1), t1), D2 = mul(F(v2), t2), D = add(D1, D2), T = add(t1, t2), avg = div(D, T);
        if (!nice(avg, 2)) continue;
        const [P1, P2, P3] = t.pick([['公司', '賣場', '家裡'], ['學校', '書局', '鳩特數理'], ['苗栗', '新竹', '桃園']]);
        avgSteps(q, D, '公里', `${v1}×${show(t1)}＋${v2}×${show(t2)}＝${show(D1)}＋${show(D2)}＝${show(D)} 公里。`, `${v1}×${show(t1)}＋${v2}×${show(t2)}`,
          T, '小時', `${show(t1)}＋${show(t2)}＝${show(T)} 小時。`, `${show(t1)}＋${show(t2)}`,
          avg, '平均速率', '公里/時', `${show(D)}÷${show(T)}＝${show(avg)}，平均速率是時速 ${show(avg)} 公里。`, `${show(D)}÷${show(T)}`);
        return finish(q, `爸爸開車從${P1}到${P2}花了 ${show(t1)} 小時，速率是 ${v1} 公里/時。從${P2}到${P3}花了 ${show(t2)} 小時，速率是 ${v2} 公里/時。爸爸開車從${P1}經過${P2}到${P3}的平均速率是多少公里/時？`);
      }
    }
    for (;;) {
      const a = t.rnd(3, 12), b = t.rnd(2, 8), m1 = t.rnd(20, 60), m2 = t.rnd(10, 40), D = (a + b) * 1000, T = m1 + m2;
      if (D % T) continue;
      const [x] = t.pick(NAMES);
      avgSteps(q, F(D), '公尺', `${a}＋${b}＝${a + b} 公里＝${D} 公尺。`, `(${a}＋${b})×1000`,
        F(T), '分鐘', `${m1}＋${m2}＝${T} 分鐘。`, `${m1}＋${m2}`,
        F(D / T), '平均速率', '公尺/分', `${D}÷${T}＝${D / T}，平均速率是每分鐘 ${D / T} 公尺。`, `${D}÷${T}`);
      return finish(q, `甲地到丙地的距離如下圖。${x}從甲地跑到乙地花了 ${m1} 分鐘，從乙地跑到丙地花了 ${m2} 分鐘，${x}從甲地跑到丙地的平均速率是多少公尺/分？`, lineFigure(a, b));
    }
  }
  function flow(t, v) {
    const q = newQ('flow', t), kind = v % 4, sv = t.rnd(15, 30), c = t.rnd(2, 6), up = sv - c, down = sv + c;
    const boat = t.pick(['天秤星號', '海龍王號', '寶麗號', '鳩特號']);
    const f1 = q.field('順流速率', down, 'number', { unit: '公里/時' }), f2 = q.field('逆流速率', up, 'number', { unit: '公里/時' });
    q.step('算出順流、逆流的速率', [f1, f2], `順流速率＝船速＋水速＝${sv}＋${c}＝${down}；逆流速率＝船速－水速＝${sv}－${c}＝${up}。`, '順著水流，水會幫忙推船（加）；逆著水流，水會擋住船（減）。', `順流 ${sv}＋${c}＝${ref(f1)}　逆流 ${sv}－${c}＝${ref(f2)}`);
    const h = t.rnd(2, 6), downward = kind % 2 === 0, speed = downward ? down : up, dir = downward ? '順流' : '逆流';
    const other = downward ? up : down;
    if (kind < 2) {
      formulaSteps(q, [`${speed}×${h}`, `${other}×${h}`, `${sv}×${h}`, `${speed}÷${h}`], `距離＝${dir}速率×時間`, `${dir}航行要用${dir}速率。`, '航行距離', F(speed * h), '公里');
      return finish(q, `${boat}遊艇船速是 ${sv} 公里/時，在一條流速 ${c} 公里/時的河中，${dir}航行 ${h} 小時，共航行了多少公里？`);
    }
    const D = speed * h;
    formulaSteps(q, [`${D}÷${speed}`, `${D}÷${other}`, `${D}÷${sv}`, `${D}×${speed}`], `時間＝距離÷${dir}速率`, `${dir}航行要用${dir}速率。`, '需要時間', F(h), '小時');
    return finish(q, `${boat}遊艇船速是 ${sv} 公里/時，在一條流速 ${c} 公里/時的河中，${dir}航行 ${D} 公里，需要多少小時？`);
  }
  function chase(t, v) {
    const q = newQ('chase', t), kind = v % 3, [x, y] = t.pick(NAMES);
    for (;;) {
      if (kind === 0) {
        const a = t.rnd(9, 15) * 10, b = a + t.rnd(1, 6) * 10, k = t.rnd(3, 8), lead = a * k;
        if (lead % (b - a)) continue;
        const T = lead / (b - a);
        const f1 = q.field(`${x}先走了`, lead, 'number', { unit: '公尺' }), f2 = q.field('速率差', b - a, 'number', { unit: '公尺/分' }), f3 = q.field('追上需要', T, 'number', { unit: '分鐘' });
        q.step(`算出${x}領先多少`, [f1], `${a}×${k}＝${lead}，${y}出發時，${x}已經領先 ${lead} 公尺。`, '先出發的人，先走的時間×速率＝領先的距離。', `${a}×${k}＝${ref(f1)}`);
        q.step('算出速率差', [f2], `${b}－${a}＝${b - a}，${y}每分鐘追近 ${b - a} 公尺。`, '同方向追趕，每分鐘拉近的距離＝速率差。', `${b}－${a}＝${ref(f2)}`);
        q.step('算出追上的時間', [f3], `${lead}÷${b - a}＝${T}，${y}出發 ${T} 分鐘後追上${x}。`, '追趕時間＝領先的距離÷速率差。', `${lead}÷${b - a}＝${ref(f3)}`);
        return finish(q, `${x}和${y}去慢跑，${x}跑步的速率是 ${a} 公尺/分，${x}出發 ${k} 分鐘後，${y}才出發，${y}跑步的速率是 ${b} 公尺/分，${y}出發幾分鐘後，才會追上${x}？`);
      }
      if (kind === 1) {
        const a = t.rnd(15, 30), b = a + t.rnd(2, 8), k = t.pick([1, 2]), lead = a * k, T = F(lead, b - a), limit = t.rnd(3, 10);
        if (T.n === limit * T.d || !nice(T, 2)) continue;
        const [A, B] = t.pick([['寶麗號', '湯姆號'], ['藍鯨號', '海豚號']]), can = less(T, F(limit));
        const f1 = q.field(`${A}領先`, lead, 'number', { unit: '公里' }), f2 = val(q, '追上需要', T, '小時');
        q.step(`算出${A}領先多少`, [f1], `${a}×${k}＝${lead}，${B}出發時，${A}已經領先 ${lead} 公里。`, '先出發的船，先開的時間×速率＝領先的距離。', `${a}×${k}＝${ref(f1)}`);
        q.step('算出追上的時間', [f2], `${lead}÷(${b}－${a})＝${show(T)} 小時。`, '追趕時間＝領先的距離÷速率差。', `${lead}÷(${b}－${a})＝${ref(f2)}`);
        const c = choiceField(q, `${limit} 小時內`, ['能追上', '追不上'], can ? 0 : 1, true);
        q.step('判斷能不能追上', [c], `${show(T)} ${can ? '＜' : '＞'} ${limit}，所以${can ? '能' : '不能'}在 ${limit} 小時內追上。`, '比較追上需要的時間和限制的時間。');
        return finish(q, `${A}遊艇的時速是 ${a} 公里，${B}遊艇的時速是 ${b} 公里，兩艘遊艇在同一條航線上同方向航行。${A}出發 ${k} 小時後，${B}才從同一地點出發，${B}可以在 ${limit} 小時內追上${A}嗎？`, '', [f2, c]);
      }
      const big = t.rnd(12, 20) * 10, small = t.rnd(6, 11) * 10, k = t.rnd(3, 9), lead = (big - small) * k;
      if (small >= big || lead % small) continue;
      const ahead = lead / small;
      const f1 = q.field('速率差', big - small, 'number', { unit: '公尺/分' }), f2 = q.field('弟弟領先', lead, 'number', { unit: '公尺' }), f3 = q.field('弟弟先出發', ahead, 'number', { unit: '分鐘' });
      q.step('算出速率差', [f1], `${big}－${small}＝${big - small}，爸爸每分鐘追近 ${big - small} 公尺。`, '同方向追趕，每分鐘拉近的距離＝速率差。', `${big}－${small}＝${ref(f1)}`);
      q.step('算出弟弟領先多少', [f2], `${big - small}×${k}＝${lead}，爸爸出發時弟弟領先 ${lead} 公尺。`, '追了幾分鐘剛好追上，領先的距離＝速率差×追趕時間。', `${big - small}×${k}＝${ref(f2)}`);
      q.step('算出弟弟先出發幾分鐘', [f3], `${lead}÷${small}＝${ahead}，弟弟比爸爸先出發 ${ahead} 分鐘。`, '弟弟領先的距離，是弟弟先走的那幾分鐘走出來的。', `${lead}÷${small}＝${ref(f3)}`);
      return finish(q, `爸爸和弟弟競走比賽，爸爸每分鐘走 ${big} 公尺，弟弟每分鐘走 ${small} 公尺，爸爸讓弟弟先出發，經過 ${k} 分鐘追到弟弟，弟弟比爸爸先出發幾分鐘？`);
    }
  }
  function segment(t, v) {
    const q = newQ('segment', t);
    for (;;) {
      const p = t.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(2, 5), F(3, 5)]), D = p.d * 100 * t.rnd(Math.ceil(15 / p.d), Math.floor(60 / p.d));
      const v1 = t.pick([200, 220, 240, 250, 280, 300]), v2 = t.pick([200, 220, 240, 250, 280, 300]);
      const D1 = mul(F(D), p), D2 = sub(F(D), D1), t1 = div(D1, F(v1)), t2 = div(D2, F(v2)), T = add(t1, t2);
      if (v1 === v2 || !nice(t1, 1) || !nice(t2, 1)) continue;
      const [x] = t.pick(NAMES);
      const f1 = val(q, '前段', D1, '公尺'), f2 = val(q, '後段', D2, '公尺');
      q.step('算出兩段的距離', [f1, f2], `${show(F(D, 1000))} 公里＝${D} 公尺；前段 ${D}×${show(p, 'frac')}＝${show(D1)} 公尺，後段 ${D}－${show(D1)}＝${show(D2)} 公尺。`, '先把公里換成公尺，再算全程的幾分之幾。', `前段 ${D}×${show(p, 'frac')}＝${ref(f1)}　後段 ${ref(f2)}`);
      const f3 = val(q, '前段時間', t1, '分鐘'), f4 = val(q, '後段時間', t2, '分鐘');
      q.step('算出兩段的時間', [f3, f4], `${show(D1)}÷${v1}＝${show(t1)} 分鐘；${show(D2)}÷${v2}＝${show(t2)} 分鐘。`, '時間＝距離÷速率，兩段分開算。', `${show(D1)}÷${v1}＝${ref(f3)}　${show(D2)}÷${v2}＝${ref(f4)}`);
      const f5 = val(q, '共花了', T, '分鐘');
      q.step('合起來', [f5], `${show(t1)}＋${show(t2)}＝${show(T)}，共花了 ${show(T)} 分鐘。`, '兩段的時間加起來。', `${show(t1)}＋${show(t2)}＝${ref(f5)}`);
      return finish(q, `${x}家到外婆家距離 ${show(F(D, 1000))} 公里，前面 ${show(p, 'frac')} 的路程${x}騎車速率是 ${v1} 公尺/分，剩下的路程騎車速率是 ${v2} 公尺/分，${x}騎車從家裡到外婆家共花了多少分鐘？`);
    }
  }
  function ringReverse(t, v) {
    const q = newQ('ringReverse', t);
    for (;;) {
      const L = t.pick([200, 300, 400]), n = t.rnd(2, 4), T = t.rnd(3, 10), total = n * L;
      if (total % T) continue;
      const s = total / T, a = t.rnd(5, 12) * 10, b = s - a;
      if (b < 40 || b === a || b > 160) continue;
      const [x, y] = t.pick(NAMES);
      const f1 = q.field('兩人共走了', total, 'number', { unit: '公尺' }), f2 = q.field('速率和', s, 'number', { unit: '公尺/分' }), f3 = q.field(`${y}的速率`, b, 'number', { unit: '公尺/分' });
      q.step('算出兩人一共走了多遠', [f1], `反方向走，每合走一圈相遇一次；第 ${n} 次相遇時合走了 ${L}×${n}＝${total} 公尺。`, '反方向繞圈，兩人合走一圈就相遇一次。', `${L}×${n}＝${ref(f1)}`);
      q.step('算出速率和', [f2], `${total}÷${T}＝${s}，兩人每分鐘一共走 ${s} 公尺。`, '速率和＝兩人共走的距離÷時間。', `${total}÷${T}＝${ref(f2)}`);
      q.step(`算出${y}的速率`, [f3], `${s}－${a}＝${b}，${y}的速率是 ${b} 公尺/分。`, '速率和減去已知的那個人的速率。', `${s}－${a}＝${ref(f3)}`);
      return finish(q, `環形跑道長 ${L} 公尺，${x}和${y}同時同地反方向競走，${T} 分鐘後兩人第 ${n} 次相遇，${x}的速率是 ${a} 公尺/分，${y}的速率是幾公尺/分？`);
    }
  }
  function drift(t, v) {
    const q = newQ('drift', t);
    for (;;) {
      const c = t.rnd(3, 8), sv = t.rnd(15, 35), h = t.rnd(1, 4), up = sv - c, D = up * h, back = F(D, c);
      if (!nice(back, 2)) continue;
      const f1 = q.field('逆流速率', up, 'number', { unit: '公里/時' }), f2 = q.field('已航行', D, 'number', { unit: '公里' }), f3 = val(q, '漂回需要', back, '小時');
      q.step('算出逆流速率', [f1], `往上游是逆流：${sv}－${c}＝${up} 公里/時。`, '逆流速率＝船速－水速。', `${sv}－${c}＝${ref(f1)}`);
      q.step('算出已經航行多遠', [f2], `${up}×${h}＝${D}，快艇離出發地 ${D} 公里。`, '距離＝速率×時間。', `${up}×${h}＝${ref(f2)}`);
      q.step('算出被沖回去的時間', [f3], `引擎故障後，快艇只靠水流漂回，速率就是水速：${D}÷${c}＝${show(back)} 小時。`, '沒有動力的船，只會跟著水流移動。', `${D}÷${c}＝${ref(f3)}`);
      return finish(q, `有一艘快艇航行在水流時速 ${c} 公里的河流中，快艇以每小時 ${sv} 公里的速率從下游開往上游，航行 ${h} 小時後，引擎故障無法運作，再經過幾小時後，快艇會被水流沖回原來出發的地方？`);
    }
  }

  /* ================= 是非、選擇 ================= */
  const CONCEPTS = [
    ['花的時間固定，移動距離比較長的速率比較快', true, '時間一樣，走得越遠代表每單位時間走得越多，速率越快。'],
    ['移動距離固定，花的時間比較長的速率比較快', false, '距離一樣，花的時間越長代表越慢。'],
    ['平均速率就是平均每單位時間內移動的距離', true, '這正是平均速率的定義。'],
    ['時速的單位是「每小時幾公里」，所以「每小時幾公尺」不是時速的單位', false, '時速是每小時移動的距離，距離單位可以是公里，也可以是公尺。'],
    ['因為「距離＝速率×時間」，所以當速率固定時，距離和時間成正比', true, '速率固定，時間變成幾倍，距離也變成幾倍。'],
    ['速率＝時間÷距離', false, '速率＝距離÷時間。'],
    ['時間＝距離÷速率', true, '由距離＝速率×時間，反推時間要用除法。'],
    ['來回的平均速率＝（去程速率＋回程速率）÷2', false, '平均速率＝全程距離÷全部時間，不能直接把兩個速率平均。'],
    ['兩人同時同地反方向出發，經過的時間×速率和＝兩人相距的距離', true, '反方向，每分鐘一共拉開「速率和」。'],
    ['兩人同時同地同方向出發，經過的時間×速率和＝兩人相距的距離', false, '同方向，每分鐘拉開的是「速率差」。'],
    ['兩人相向而行，相遇時間＝兩人的距離÷速率差', false, '相向而行，每分鐘一起靠近「速率和」，要除以速率和。'],
    ['分速換成時速，要把數字 ×60', true, '每小時走的是每分鐘的 60 倍（距離單位相同時）。'],
    ['秒速換成分速，要把數字 ÷60', false, '一分鐘有 60 秒，走的距離是 60 倍，要 ×60。'],
    ['順流速率＝船速－水速', false, '順著水流，水速會幫忙：順流速率＝船速＋水速。', true],
    ['逆流速率＝船速－水速', true, '逆著水流，水速會擋住：逆流速率＝船速－水速。', true],
    ['追趕時間＝兩人相距的距離÷速率和', false, '追趕時每分鐘拉近的是速率差：追趕時間＝距離÷速率差。', true]
  ];
  function conversionStatement(t) {
    if (t.rnd(0, 1)) {
      const w = t.rnd(0, 2), m = t.pick([6, 12, 15, 18, 20, 24, 30, 36, 40, 45, 48, 54]), total = F(60 * w + m, 60), left = w ? `${w} 小時 ${m} 分鐘` : `${m} 分鐘`;
      const wrong = F(w * 100 + m, 100);
      const truth = eq(wrong, total) ? true : t.rnd(0, 1) === 1;
      return { text: `${left}＝${show(truth ? total : wrong)} 小時`, truth, expl: `${m} 分鐘＝${m}÷60＝${show(F(m, 60))} 小時，所以 ${left}＝${show(total)} 小時${truth ? '' : `，不是 ${show(wrong)} 小時（分鐘不能直接當成小數）`}。` };
    }
    const key = t.pick(['ms>kmh', 'kmh>mmin', 'mmin>ms', 'ms>mmin', 'kmh>ms']), [a, b] = key.split('>');
    for (;;) {
      const x = F(t.pick(SOURCES[a]())), y = convert(x, a, b);
      if (!nice(y, 2)) continue;
      const wrongs = [mul(y, F(60)), div(y, F(60)), mul(y, F(1000)), div(y, F(1000))].filter(w => nice(w, 3) && !eq(w, y) && w.n * 1000 >= w.d);
      const truth = !wrongs.length || t.rnd(0, 1) === 1, shown = truth ? y : t.pick(wrongs);
      return { text: `${uText(x, a)}＝${uText(shown, b)}`, truth, expl: `${METHODS[key]}：${calc(x, METHODS[key])}＝${show(y)}，${uText(x, a)}＝${uText(y, b)}。` };
    }
  }
  function judge(t, v, settings) {
    const q = newQ('judge', t), kind = v % 3;
    let text, truth, expl;
    if (kind === 2) {
      const pool = CONCEPTS.filter(c => !c[3] || (settings && settings.star));
      const c = t.pick(pool); text = `判斷對錯：${c[0]}。`; truth = c[1]; expl = c[2];
    } else if (kind === 0) {
      const s = conversionStatement(t); text = `判斷對錯：${s.text}。`; truth = s.truth; expl = s.expl;
    } else {
      const ask = t.pick(['speed', 'time', 'dist']), s = basicScenario(t, ask, 0, true), o = basicOptions(s, ask);
      truth = t.rnd(0, 1) === 1;
      let shown = o.opts[0], value = o.ans;
      if (!truth) {
        const wrong = o.opts.slice(1).map(text => ({ text, v: evalExpr(text) })).filter(w => w.v && w.v.n > 0 && !eq(w.v, o.ans) && nice(w.v, 3));
        if (!wrong.length) truth = true;
        else { const w = t.pick(wrong); if (t.rnd(0, 2) === 0) value = w.v; else { shown = w.text; value = w.v; } }
      }
      text = `「${basicText(s, ask)}」上面的問題可以列式為 ${shown}＝${show(value)}。`;
      expl = truth ? `${o.rule}，列式 ${o.opts[0]}＝${show(o.ans)} 正確。` : shown === o.opts[0] ? `列式正確，但計算錯了：${o.opts[0]}＝${show(o.ans)}，不是 ${show(value)}。` : `列式錯了。${o.rule}，應為 ${o.opts[0]}＝${show(o.ans)}。`;
    }
    const f = q.field('這個敘述', truth ? 'yes' : 'no', 'decision', { options: ['yes', 'no'], optionLabels: { yes: '○ 正確', no: '× 錯誤' } });
    q.step('判斷對錯', [f], `${truth ? '○ 正確。' : '× 錯誤。'}${expl}`, '想一想速率、距離、時間的關係，以及單位換算時要乘還是除。');
    return finish(q, text);
  }
  function choice(t, v, settings) {
    const q = newQ('choice', t), kind = v % 4;
    let text, options, correct, expl;
    if (kind === 0 || kind === 1) {
      const type = t.pick(['speed', 'time', 'dist', 'apart', 'meet']);
      if (type === 'apart' || type === 'meet') {
        const sub = type === 'apart' ? apart(t, t.rnd(0, 1)) : meet(t, 0), fq = sub.steps.find(s => s.title === '選出正確算式').fields[0];
        const opts = Object.keys(fq.optionLabels).map(k => fq.optionLabels[k].slice(2)), right = fq.optionLabels[fq.expected].slice(2);
        const ansField = sub.finalFields[0], ans = num(ansField.expected), unit = ansField.unit;
        if (kind === 0) { text = `「${sub.text}」這道題目的正確算式為何？`; options = [right, ...opts.filter(o => o !== right)]; expl = `${sub.steps[1].explanation}`; }
        else { text = sub.text; options = [right, ...opts.filter(o => o !== right)].map(o => evalExpr(o)).map(x => `${show(x)} ${unit}`); expl = `${right}＝${show(ans)} ${unit}。`; }
      } else {
        const s = basicScenario(t, type, 0, true), o = basicOptions(s, type), unit = type === 'time' ? s.S.time : s.S.dist;
        if (kind === 0) { text = `「${basicText(s, type)}」這道題目的正確算式為何？`; options = o.opts; expl = `${o.rule}，所以正確算式是 ${o.opts[0]}。`; }
        else { text = basicText(s, type); options = o.opts.map(x => evalExpr(x)).map(x => `${show(x)} ${unit}`); expl = `${o.rule}，${o.opts[0]}＝${show(o.ans)} ${unit}。`; }
      }
      correct = 0;
    } else if (kind === 2) {
      for (;;) {
        const forms = ['kmh', 'mmin', 'ms', t.pick(['kmh', 'mmin', 'ms'])], ms = forms.map(() => F(5 * t.rnd(60, 360)));
        const texts = forms.map((f, i) => rep(t, ms[i], f, '走'));
        const sorted = ms.map(m => m.n).sort((a, b) => a - b);
        if (texts.some(x => !x) || new Set(texts).size < 4 || !sorted.every((x, i) => i === 0 || x - sorted[i - 1] >= 15)) continue;
        const fastWant = t.rnd(0, 1) === 1, target = fastWant ? sorted[3] : sorted[0];
        text = `下列哪一個速率最${fastWant ? '快' : '慢'}？`; options = texts; correct = ms.findIndex(m => m.n === target);
        expl = `都換成分速：${texts.map((x, i) => `${x}＝分速 ${show(ms[i])} 公尺`).join('；')}，所以最${fastWant ? '快' : '慢'}的是「${texts[correct]}」。`;
        break;
      }
    } else {
      for (;;) {
        const a = t.pick(['kmh', 'mmin', 'ms']), x = F(t.pick(SOURCES[a]())), others = ['kmh', 'mmin', 'ms'].filter(u => u !== a), b = t.pick(others), y = convert(x, a, b);
        if (!nice(y, 2)) continue;
        const wrongs = [mul(y, F(60)), div(y, F(60)), mul(y, F(1000)), div(y, F(1000)), mul(y, F(3600))].filter(w => nice(w, 3) && w.n * 100 >= w.d);
        const pool = [...new Set(wrongs.map(w => uText(w, b)))].filter(s => s !== uText(y, b));
        if (pool.length < 3) continue;
        text = `下列哪一個速率和「${uText(x, a)}」相同？`; options = [uText(y, b), ...t.shuffle(pool).slice(0, 3)]; correct = 0;
        expl = `${UNITS[a].name}換成${UNITS[b].name}：${METHODS[`${a}>${b}`]}，${calc(x, METHODS[`${a}>${b}`])}＝${show(y)}，所以是「${uText(y, b)}」。`;
        break;
      }
    }
    const f = choiceField(q, '正確選項', options, correct);
    q.step('選出正確答案', [f], expl, '先確認單位一致，再想速率、距離、時間的關係。');
    return finish(q, text);
  }

  /* 簡單算式求值（是非、選擇題用；與題目產生分開，避免互相影響） */
  function evalExpr(text) {
    const tokens = String(text).replace(/(\d+) (\d+)\/(\d+)/g, '[$1+$2/$3]').match(/\d+(?:\.\d+)?|[＋－×÷()（）[\]+/]/g);
    if (!tokens) return null;
    let i = 0;
    const toF = s => { const [w, d = ''] = s.split('.'); return F(Number(w + d), 10 ** d.length); };
    function factor() {
      const tk = tokens[i++];
      if (tk === '(' || tk === '（' || tk === '[') { const v = expr(); i++; return v; }
      return toF(tk);
    }
    function term() {
      let v = factor();
      while (['×', '÷', '/'].includes(tokens[i])) { const op = tokens[i++], r = factor(); v = op === '×' ? mul(v, r) : div(v, r); }
      return v;
    }
    function expr() {
      let v = term();
      while (['＋', '－', '+'].includes(tokens[i])) { const op = tokens[i++], r = term(); v = op === '－' ? sub(v, r) : add(v, r); }
      return v;
    }
    try { const v = expr(); return Number.isFinite(v.n) && v.d ? v : null; } catch (e) { return null; }
  }

  /* ================= 出題 ================= */
  const MAKERS = { t1Convert, t1Compare, speed: (t, v) => basic('speed', t, v), time: (t, v) => basic('time', t, v), dist: (t, v) => basic('dist', t, v),
    graph, clock, twoStage, echo, earlier, unitConvert, unitCompare, apart, meet, ring, remain, roundTrip, threePlace, flow, chase, segment, ringReverse, drift, judge, choice };
  function pool(type, settings) {
    const star = !!(settings && settings.star);
    const topic = TOPICS.find(tp => tp.key === type);
    const list = topic ? topic.types : [...TOPICS.flatMap(tp => tp.types), 'judge', 'choice'];
    return list.filter(x => star || !STAR.includes(x));
  }
  function valid(q) {
    const all = q.steps.flatMap(s => s.fields);
    if (q.formulaCheck) {
      /* 只有正確算式能算出答案（例如時間是 1 小時時，「距離÷1」和「距離×1」一樣，要換題） */
      const c = all.find(f => f.key === q.formulaCheck.choice), a = all.find(f => f.key === q.formulaCheck.answer), ans = num(a.expected);
      const hits = Object.keys(c.optionLabels).filter(k => { const x = evalExpr(c.optionLabels[k].slice(2)); return x && eq(x, ans); });
      if (hits.length !== 1 || hits[0] !== c.expected) return false;
    }
    if (/undefined|NaN|Infinity|null/.test(q.text + q.explanation + q.steps.map(s => s.pattern).join(''))) return false;
    return all.every(f => f.type !== 'decision' || new Set(Object.values(f.optionLabels)).size === f.options.length) &&
      all.every(f => f.type === 'decision' || (typeof f.expected === 'object' ? f.expected.n > 0 && f.expected.d > 0 : f.expected > 0));
  }
  function generate(type, settings, rng = Math.random, variant) {
    const t = tools(rng);
    if (type === 'mixed' || /^topic\d$/.test(type)) type = t.pick(pool(type, settings));
    if (!MAKERS[type]) throw new Error('Unknown question category');
    let v = variant === undefined ? t.rnd(0, 11) : variant;
    for (let tries = 0; tries < 40; tries++, v++) {
      const q = MAKERS[type](t, v, settings || {});
      if (valid(q)) return q;
    }
    throw new Error(`Could not build a valid ${type} question`);
  }
  function examTypes(settings, t) {
    const star = !!(settings && settings.star);
    const basicTwo = t.shuffle(['speed', 'time', 'dist', 'clock', 'twoStage']).slice(0, 2);
    const meetTwo = t.shuffle(['apart', 'meet', 'ring', 'remain']).slice(0, 2);
    if (star) meetTwo[1] = t.pick(['flow', 'chase']);
    return [t.pick(['t1Convert', 't1Compare']), ...basicTwo, 'graph', 'unitConvert', 'unitCompare', ...meetTwo, t.pick(['roundTrip', 'threePlace']), t.pick(['judge', 'choice'])];
  }
  function buildExam(settings, rng = Math.random) {
    const t = tools(rng), questions = [], offset = t.rnd(0, 11);
    examTypes(settings, t).forEach((type, i) => {
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
  const api = { ...RQ, TOPICS, categories, PRACTICE_TYPES, STAR, ADVANCED, defaultType: 't1Convert', generate, buildExam, format,
    F, add, sub, mul, div, show, convert, evalExpr, examTypes, pool, SCALES, gridPoint };
  api.correct = RQ.correct;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    /* 折線圖、距離圖放在題幹下方（不跟著題幹懸停），才看得清楚格線 */
    api.renderExtra = () => {
      const box = document.getElementById('figure-box'), stem = document.getElementById('question-text');
      if (!box || !stem) return;
      const fig = stem.querySelector('.q-graph, .q-line');
      box.replaceChildren(); if (fig) box.append(fig); box.hidden = !fig;
    };
    api.settings = () => { const box = typeof document !== 'undefined' && document.getElementById('include-star'); return { star: !!(box && box.checked) }; };
    root.PaperQuestions = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
