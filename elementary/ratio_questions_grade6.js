(function (root) {
  'use strict';
  const categories = { ratio: '比的認識', value: '求比值', equal: '相等的比與化簡', apply: '比的應用' };
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const lcm = (a, b) => a / gcd(a, b) * b;
  const R = (n, d = 1) => { const g = gcd(n, d); return { n: n / g, d: d / g }; };
  const divide = (a, b) => R(a.n * b.d, a.d * b.n);
  const format = a => typeof a !== 'object' ? String(a) : a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
  const fraction = (n, d) => `<span class="fraction"><span>${n}</span><span>${d}</span></span>`;
  const htmlNumber = (a, form) => {
    if (a.d === 1) return String(a.n);
    if (form === 'decimal') return String(a.n / a.d);
    if (form === 'mixed' && a.n > a.d) return `<span class="mixed-number">${Math.floor(a.n / a.d)}${fraction(a.n % a.d, a.d)}</span>`;
    return fraction(a.n, a.d);
  };
  function parse(raw) {
    const s = String(raw).trim();
    // Exact rational input: integers, finite decimals, fractions, or mixed numbers.
    let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m) return +m[3] > 0 && +m[2] < +m[3] ? R(+m[1] * +m[3] + +m[2], +m[3]) : null;
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return +m[2] > 0 ? R(+m[1], +m[2]) : null;
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)) return null;
    const decimals = s.includes('.') ? s.split('.')[1].length : 0;
    if (decimals > 6 || s.replace('.', '').length > 10) return null;
    return R(Math.round(Number(s) * 10 ** decimals), 10 ** decimals);
  }
  function correct(raw, field) {
    if (field.type === 'decision') return String(raw) === field.expected;
    const a = parse(raw), b = typeof field.expected === 'number' ? R(field.expected) : field.expected;
    return !!a && a.n * b.d === b.n * a.d;
  }
  function generate(type, forms = ['integer', 'decimal', 'fraction', 'mixed'], rng = Math.random, variant = 0) {
    const rnd = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = list => list[rnd(0, list.length - 1)];
    if (type === 'mixed') type = pick(Object.keys(categories));
    const q = { type, category: categories[type], steps: [], finalFields: [], explanations: [] };
    let id = 0;
    function field(label, expected, kind = 'number') { return { key: `f${id++}`, label, expected, type: kind }; }
    function step(title, fields, pattern, explanation, hint) {
      q.steps.push({ title, fields, pattern, explanation, hint }); q.explanations.push(explanation);
    }
    const blanks = fields => fields.map(f => `{${f.key}}`);
    function ratioStep(a, b, title = '按指定順序寫出比') {
      const fields = [field('比的前項', a), field('比的後項', b)];
      const [x, y] = blanks(fields);
      step(title, fields, `${x}：${y}`, `比是 ${a}：${b}，前項是 ${a}，後項是 ${b}。`, '「A 對 B」先寫 A 的量，再寫 B 的量；這一步填實際數量。');
      return fields;
    }
    if (type === 'ratio' || type === 'value') {
      let a = rnd(2, 30), b = rnd(2, 30), names = pick([['紅球', '白球'], ['草莓果凍', '葡萄果凍'], ['黑巧克力', '白巧克力']]);
      const reverse = rnd(0, 1) === 1;
      let text = `盒子裡有${a}個${names[0]}和${b}個${names[1]}。`;
      if (type === 'ratio' && variant % 3 !== 0) {
        const sideA = rnd(2, 9), sideB = rnd(10, 15), area = variant % 3 === 2;
        a = area ? sideA * sideA : sideA * 4; b = area ? sideB * sideB : sideB * 4;
        names = ['小正方形', '大正方形'];
        text = `小正方形邊長${sideA}公分，大正方形邊長${sideB}公分。`;
        const metric = area ? '面積' : '周長';
        const fields = [field(`小正方形的${metric}`, a), field(`大正方形的${metric}`, b)];
        const [x, y] = blanks(fields);
        step(`先算兩個正方形的${metric}`, fields, `小正方形：${x} ${area ? '平方公分' : '公分'}；大正方形：${y} ${area ? '平方公分' : '公分'}`, `${sideA}${area ? `×${sideA}` : '×4'}＝${a}；${sideB}${area ? `×${sideB}` : '×4'}＝${b}。`, area ? '正方形的面積＝邊長×邊長。' : '正方形的周長＝邊長×4。');
        text += `請寫出${reverse ? '大正方形對小正方形' : '小正方形對大正方形'}的${metric}比。`;
      } else if (type === 'value' && variant % 3 !== 0) {
        names = variant % 3 === 1 ? ['數量', '售價'] : ['重量', '長度'];
        text = variant % 3 === 1 ? `${a}枝鉛筆賣${b}元。` : `一根長${b}公尺的鐵管重${a}公斤。`;
        text += `請寫出${reverse ? names[1] : names[0]}對${reverse ? names[0] : names[1]}的比，並求比值。`;
      } else text += `請寫出${reverse ? names[1] : names[0]}對${reverse ? names[0] : names[1]}的數量比${type === 'value' ? '，並求比值' : ''}。`;
      if (reverse) [a, b] = [b, a];
      q.text = text; q.textHtml = text;
      q.finalFields = [...ratioStep(a, b)];
      if (type === 'value') {
        const f = field('比值', R(a, b), 'rational');
        step('前項除以後項，求出比值', [f], `${a}÷${b}＝{${f.key}}`, `${a}÷${b}＝${format(R(a, b))}。`, '比值＝前項÷後項。可以填分數，或與它相等的有限小數。');
        q.finalFields.push(f);
      }
    } else if (type === 'equal') {
      let a = rnd(1, 12), b = rnd(1, 12); const g = gcd(a, b); a /= g; b /= g;
      const k = rnd(2, 9), subtype = variant % 4;
      if (subtype === 0) {
        const yes = rnd(0, 1) === 1, c = a * k, d = b * k + (yes ? 0 : rnd(1, 5));
        q.text = `${a}：${b} 和 ${c}：${d} 是相等的比嗎？`; q.textHtml = q.text;
        const f = field('是否為相等的比', yes ? 'yes' : 'no', 'decision');
        step('判斷兩個比是否相等', [f], `{${f.key}}`, yes ? `前項與後項都乘以${k}，所以是相等的比。` : `前項乘以${k}得到${c}，但後項乘以${k}應為${b * k}，不是${d}。`, '檢查前項與後項是否同乘或同除以同一個數。'); q.finalFields = [f];
      } else if (subtype === 1) {
        const yes = rnd(0, 1) === 1, c = a * (yes ? 1 : k), d = b * (yes ? 1 : k);
        q.text = `${c}：${d} 是最簡整數比嗎？`; q.textHtml = q.text;
        const f = field('是否為最簡整數比', yes ? 'yes' : 'no', 'decision');
        step('判斷是否已經最簡', [f], `{${f.key}}`, yes ? `${c}與${d}的最大公因數是1，已經是最簡整數比。` : `${c}和${d}都能除以${k}，所以還能化簡成${a}：${b}。`, '前後項都要是整數，而且不能再同除以大於1的整數。'); q.finalFields = [f];
      } else if (subtype === 2) {
        const left = rnd(0, 1) === 1, answer = (left ? a : b) * k;
        q.text = left ? `${a}：${b}＝□：${b * k}，□是多少？` : `${a}：${b}＝${a * k}：□，□是多少？`; q.textHtml = q.text;
        const factor = field('放大倍數', k);
        step('找出同乘的倍數', [factor], `${left ? b * k : a * k}÷${left ? b : a}＝{${factor.key}}`, `前項與後項都乘以${k}。`, '用已知的對應項，找出放大幾倍。');
        const f = field('□的值', answer); step('求出缺少的項', [f], `${left ? a : b}×${k}＝{${f.key}}`, `□＝${answer}。`, '另一項也要乘以相同的倍數。'); q.finalFields = [f];
      } else {
        const form = pick(forms), denA = form === 'integer' ? 1 : form === 'decimal' ? 10 : pick([3, 4, 6, 8, 12]);
        const denB = form === 'integer' ? 1 : form === 'decimal' ? 10 : pick([3, 4, 6, 8, 12]);
        let x = R(rnd(2, 30), denA), y = R(rnd(2, 30), denB);
        if (form === 'integer') { x = R(a * k); y = R(b * k); }
        if (form === 'mixed') { x = R(rnd(1, 3) * denA + rnd(1, denA - 1), denA); y = R(rnd(1, 3) * denB + rnd(1, denB - 1), denB); }
        if (form === 'fraction') { x = R(rnd(1, denA - 1), denA); y = R(rnd(1, denB - 1), denB); }
        const common = form === 'decimal' ? 10 : lcm(x.d, y.d), intA = x.n * common / x.d, intB = y.n * common / y.d, divisor = gcd(intA, intB);
        const A = intA / divisor, B = intB / divisor;
        q.form = form; q.original = [x, y]; q.simplified = [A, B];
        q.text = `將 ${form === 'mixed' ? `${Math.floor(x.n / x.d)} ${x.n % x.d}/${x.d}：${Math.floor(y.n / y.d)} ${y.n % y.d}/${y.d}` : `${form === 'decimal' ? x.n / x.d : format(x)}：${form === 'decimal' ? y.n / y.d : format(y)}`} 化成最簡整數比。`;
        q.textHtml = `將 ${htmlNumber(x, form)}：${htmlNumber(y, form)} 化成最簡整數比。`;
        if (common > 1) {
          const f = field('同乘的數', common);
          step('先把前後項化成整數', [f], `前項與後項同乘以 {${f.key}}`, `前後項同乘以${common}，得到${intA}：${intB}。`, form === 'decimal' ? '這題的小數最多一位；前後項都乘以10，就能化成整數。' : '帶分數先換成假分數；再找分母的最小公倍數。');
        }
        const f = field('最大公因數', divisor);
        step('找出前後項的最大公因數', [f], `${intA}與${intB}的最大公因數是 {${f.key}}`, `最大公因數是${divisor}${divisor === 1 ? '，整數比已經最簡' : ''}。`, '找出能同時整除兩個數的最大整數。');
        const fields = [field('最簡整數比的前項', A), field('最簡整數比的後項', B)], [u, v] = blanks(fields);
        step('同除以最大公因數', fields, `${intA}：${intB}＝${u}：${v}`, `最簡整數比是${A}：${B}。`, '前項與後項都除以最大公因數。'); q.finalFields = fields;
      }
    } else if (type === 'apply') {
      const a = rnd(2, 7), b = rnd(8, 12), share = variant % 3 === 2 ? 25 : rnd(3, 20), A = a * share, B = b * share;
      const total = A + B, distribution = variant % 3 !== 0, convert = variant % 3 === 2;
      let names = distribution ? ['紅色積木', '藍色積木'] : ['紅色緞帶', '藍色緞帶'];
      if (convert) names = ['第一段木棍', '第二段木棍'];
      if (distribution) {
        q.text = convert ? `一根長${total / 100}公尺的木棍鋸成兩段，第一段與第二段的長度比是${a}：${b}。兩段各長幾公分？` : `紅色積木和藍色積木共有${total}個，數量比是${a}：${b}。兩種積木各有幾個？`;
        if (convert) {
          const f = field('換算後的總長度（公分）', total);
          step('先統一單位', [f], `${total / 100}公尺＝{${f.key}} 公分`, `${total / 100}公尺＝${total}公分。`, '1公尺＝100公分。');
        }
        const f = field('總份數', a + b);
        step('算出總份數', [f], `${a}＋${b}＝{${f.key}} 份`, `總份數＝${a}＋${b}＝${a + b}份。`, '兩種數量合起來，份數也要相加。');
        const per = field('每份的量', share);
        step('算出每份的量', [per], `${total}÷${a + b}＝{${per.key}} ${convert ? '公分' : '個'}`, `每份＝${total}÷${a + b}＝${share}。`, '總量÷總份數＝每份的量。');
        const fields = [field(`${names[0]}（${convert ? '公分' : '個'}）`, A), field(`${names[1]}（${convert ? '公分' : '個'}）`, B)];
        step('依份數分配', fields, `${names[0]}：{${fields[0].key}}；${names[1]}：{${fields[1].key}}`, `${names[0]}＝${a}×${share}＝${A}；${names[1]}＝${b}×${share}＝${B}。`, '每一種的量＝它的份數×每份的量。'); q.finalFields = fields;
      } else {
        const knownFirst = rnd(0, 1) === 1;
        q.text = `紅色緞帶和藍色緞帶的長度比是${a}：${b}，${knownFirst ? '紅色緞帶' : '藍色緞帶'}長${knownFirst ? A : B}公分。${knownFirst ? '藍色緞帶' : '紅色緞帶'}長幾公分？`;
        const per = field('每份的長度（公分）', share);
        step('用已知的長度求每份長度', [per], `${knownFirst ? A : B}÷${knownFirst ? a : b}＝{${per.key}} 公分`, `每份長${share}公分。`, '已知長度÷它對應的份數＝每份長度。');
        const f = field(`${knownFirst ? '藍色緞帶' : '紅色緞帶'}的長度（公分）`, knownFirst ? B : A);
        step('算出另一條緞帶的長度', [f], `${knownFirst ? b : a}×${share}＝{${f.key}} 公分`, `${f.label}＝${format(f.expected)}。`, '要求的長度＝它的份數×每份長度。'); q.finalFields = [f];
      }
      q.textHtml = q.text;
    } else throw new Error('Unknown question category');
    q.explanation = q.explanations.join('\n');
    return q;
  }
  function buildExam(forms, rng = Math.random) {
    const questions = [];
    const offset = Math.floor(rng() * forms.length);
    const specs = [['ratio', 0], ['ratio', 2], ['value', 0], ['value', 1], ['equal', 0], ['equal', 1], ['equal', 3], ['equal', 3], ['apply', 0], ['apply', 2]];
    specs.forEach(([type, variant], i) => questions.push(generate(type, type === 'equal' && variant === 3 ? [forms[(i - 6 + offset) % forms.length]] : forms, rng, variant)));
    for (let i = questions.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [questions[i], questions[j]] = [questions[j], questions[i]]; }
    return questions;
  }
  const api = { categories, generate, buildExam, parse, correct, format, gcd, lcm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RatioQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
