/* 小三數學：除法（南一三上第六單元 6-1～6-5）
 * 6-1 認識除法、6-2 認識餘數、6-3 商為一位數的直式除法、6-4 0 和 1 的除法、6-5 偶數和奇數。
 * 數字全部隨機；除數 2～9、商為一位數（九九乘法範圍），餘數一定比除數小。
 */
(function (root) {
  'use strict';
  const RQ = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;
  const categories = {
    meaning: '認識除法', remainder: '餘數應用題', calc: '有餘數的除法', vertical: '直式除法',
    verticalWord: '直式應用題', zeroOne: '0 和 1 的除法', parity: '偶數和奇數', judge: '是非判斷', choice: '選擇題'
  };
  const PRACTICE_TYPES = Object.keys(categories);
  const EXAM_TYPES = ['meaning', 'remainder', 'calc', 'vertical', 'verticalWord', 'zeroOne', 'parity', 'judge', 'choice', 'choice'];

  function tools(rng) {
    const rnd = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = list => list[rnd(0, list.length - 1)];
    const shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { rnd, pick, shuffle };
  }

  /* ---------- 數字 ---------- */
  /* rem: 'none' 整除、'some' 一定有餘數、'any' 餘數 0 也可以 */
  function numbers(t, rem, opts = {}) {
    for (;;) {
      const b = t.rnd(2, 9), q = t.rnd(opts.minQ || 1, 9);
      const r = rem === 'none' ? 0 : rem === 'some' ? t.rnd(1, b - 1) : (t.rnd(0, 3) === 0 ? 0 : t.rnd(1, b - 1));
      const a = b * q + r;
      if (opts.twoDigit && a < 10) continue;
      if (opts.max && a > opts.max) continue;
      if (rem === 'none' && q < 2) continue;
      return { a, b, q, r, p: b * q };
    }
  }

  /* ---------- 生活情境 ----------
   * group：每 b 個一份，問可以分成幾份（包含除）；share：平分成 b 份，問每份幾個（等分除）
   * ans：答句 [商前面的字, 商的單位, 餘數前面的字, 餘數的單位] */
  function groupCtx(item, cl, box, verb) {
    return { kind: 'group', item,
      text: (a, b, rem) => `有 ${a} ${cl}${item}，每 ${b} ${cl}${verb} 1 ${box}，最多可以${verb}幾${box}？${rem ? `還剩下幾${cl}？` : ''}`,
      ans: [`最多可以${verb}`, box, '還剩下', cl] };
  }
  function shareCtx(item, cl) {
    return { kind: 'share', item,
      text: (a, b, rem) => `把 ${a} ${cl}${item}平分給 ${b} 個小朋友，每個小朋友可以分到幾${cl}？${rem ? `還剩下幾${cl}？` : ''}`,
      ans: ['每個小朋友分到', cl, '還剩下', cl] };
  }
  const CONTEXTS = [
    groupCtx('水蜜桃', '個', '盒', '裝成'), groupCtx('蘋果', '個', '籃', '裝成'), groupCtx('蛋黃酥', '個', '盒', '裝成'),
    groupCtx('彈珠', '顆', '袋', '裝成'), groupCtx('氣球', '個', '串', '綁成'), groupCtx('鉛筆', '枝', '束', '綁成'),
    { kind: 'group', item: '小朋友', text: (a, b, rem) => `有 ${a} 個小朋友，每 ${b} 個小朋友分成 1 組，最多可以分成幾組？${rem ? '還剩下幾個小朋友？' : ''}`, ans: ['最多可以分成', '組', '還剩下', '個小朋友'] },
    { kind: 'group', item: '緞帶', text: (a, b, rem) => `一段長 ${b} 公分的緞帶可以做成 1 個蝴蝶結，${a} 公分長的緞帶最多可以做成幾個蝴蝶結？${rem ? '還剩下幾公分？' : ''}`, ans: ['最多可以做成', '個', '還剩下', '公分'] },
    { kind: 'group', item: '鉛筆', text: (a, b, rem) => `小鳩有 ${a} 元，1 枝鉛筆賣 ${b} 元，最多可以買幾枝鉛筆？${rem ? '還剩下幾元？' : ''}`, ans: ['最多可以買', '枝', '還剩下', '元'] },
    { kind: 'group', item: '步道', exactOnly: true, text: (a, b) => `${a} 公尺長的步道要鋪地磚，工人 1 天鋪 ${b} 公尺，要鋪幾天才能鋪完？`, ans: ['要鋪', '天'] },
    shareCtx('餅乾', '塊'), shareCtx('布丁', '個'), shareCtx('藍筆', '枝'), shareCtx('貼紙', '張'),
    { kind: 'share', item: '水餃', text: (a, b, rem) => `媽媽煮了 ${a} 個水餃，平分成 ${b} 盤，每盤有幾個水餃？${rem ? '還剩下幾個？' : ''}`, ans: ['每盤有', '個', '還剩下', '個'] },
    { kind: 'share', item: '糖果', text: (a, b, rem) => `有 ${a} 顆糖果，平分成 ${b} 袋，每袋有幾顆？${rem ? '還剩下幾顆？' : ''}`, ans: ['每袋有', '顆', '還剩下', '顆'] },
    { kind: 'share', item: '鐵絲', exactOnly: true, text: (a, b) => `一條鐵絲長 ${a} 公分，平分成 ${b} 段，每段長幾公分？`, ans: ['每段長', '公分'] }
  ];
  const contextFor = (t, withRem) => t.pick(CONTEXTS.filter(c => !(withRem && c.exactOnly)));
  const kindWhy = (c, n) => c.kind === 'group'
    ? `每 ${n.b} 個一份，看 ${n.a} 裡面有幾個 ${n.b}，用除法記成 ${n.a}÷${n.b}。`
    : `平分成 ${n.b} 份，求每一份有多少，也是用除法記成 ${n.a}÷${n.b}。`;
  const KIND_HINT = '「每幾個一份，可以分成幾份」和「平分成幾份，每份有多少」都用除法：全部的數量÷每份的數量（或份數）。';

  /* ---------- 常見錯誤的專屬提示 ---------- */
  function quotientFeedback(n) {
    return raw => {
      const v = Number(raw);
      if (!Number.isFinite(v)) return '';
      if (n.b * v > n.a) return `${n.b}×${v}＝${n.b * v}，比 ${n.a} 還大，分不出這麼多份，商要小一點。`;
      if (n.a - n.b * v >= n.b) return `${n.b}×${v}＝${n.b * v}，剩下 ${n.a - n.b * v} 還夠再分一份，商可以再大一點。`;
      return '';
    };
  }
  function remainderFeedback(n) {
    return raw => {
      const v = Number(raw);
      if (Number.isFinite(v) && v >= n.b) return `餘數 ${v} 不能比除數 ${n.b} 大或一樣大，表示還可以再多分一份喔。`;
      return `想想看：${n.a}－${n.b}×${n.q}＝？`;
    };
  }
  const productFeedback = n => raw => `乘出來的數是「除數×商」：${n.b}×${n.q}＝？`;

  /* ---------- 題目包裝 ---------- */
  function newQuestion(type, t) {
    let id = 0;
    const q = { type: 'divisionGrade3', topic: type, category: categories[type], steps: [], finalFields: [] };
    q.field = (label, expected, kind = 'number', extra = {}) => ({ key: `f${id++}`, label, expected, type: kind, integerOnly: true, ...extra });
    q.step = (title, fields, explanation, hint, pattern = fields.map(f => `{${f.key}}`).join('　'), layout) => {
      const s = { title, fields, pattern, explanation, hint }; if (layout) s.layout = layout; q.steps.push(s); return s;
    };
    q.t = t;
    return q;
  }
  const MARKS = ['①', '②', '③', '④', '⑤'];
  function choiceField(q, label, options, correctIndex) {
    const order = q.t.shuffle(options.map((o, i) => i)), keys = order.map((_, i) => String(i + 1)), labels = {};
    order.forEach((src, i) => { labels[keys[i]] = `${MARKS[i]} ${options[src]}`; });
    return q.field(label, keys[order.indexOf(correctIndex)], 'decision', { options: keys, optionLabels: labels });
  }
  function finish(q, text) {
    q.text = text; q.textHtml = RQ.displayText(text);
    q.explanation = q.steps.map(s => s.explanation).join('\n');
    delete q.field; delete q.step; delete q.t;
    return q;
  }
  const eqText = n => `${n.a}÷${n.b}＝${n.q}${n.r || n.showZero ? `…${n.r}` : ''}`;

  /* 第一步：列式 */
  function formulaStep(q, n, c) {
    const options = [`${n.a}÷${n.b}`, `${n.a}×${n.b}`, `${n.a}－${n.b}`, `${n.a}＋${n.b}`];
    q.step('選出正確算式', [choiceField(q, '這一題的算式', options, 0)], `${kindWhy(c, n)}`, KIND_HINT);
  }
  /* 答句 */
  function answerStep(q, n, c, withRem) {
    const [qText, qUnit, rText, rUnit] = c.ans;
    const qf = q.field(c.kind === 'group' ? `${qUnit}數` : `每份的數量`, n.q, 'number', { unit: qUnit });
    const fields = [qf];
    let pattern = `答：${qText} {${qf.key}}`;
    if (withRem) {
      const rf = q.field('剩下的數量', n.r, 'number', { unit: rUnit, feedback: remainderFeedback(n) });
      fields.push(rf); pattern += `，${rText} {${rf.key}}`;
    }
    const sentence = `${qText} ${n.q} ${qUnit}${withRem ? `，${rText} ${n.r} ${rUnit}` : ''}`;
    q.step('寫出答案', fields, `${eqText(n)}，商是 ${n.q}${withRem ? `、餘數是 ${n.r}` : ''}。答：${sentence}。`,
      withRem ? '商是分到的份數（或每份的數量），餘數是分完後剩下、不夠再分的數量。' : '商就是題目要問的答案，記得寫上單位。', pattern);
    q.finalFields = fields;
    q.examSteps = [{ title: '填入答案', fields, pattern }];
    return fields;
  }
  /* 除法直式的版面 */
  function verticalLayout(n, show) { return { kind: 'vertical', a: n.a, b: n.b, q: n.q, p: n.p, r: n.r, show }; }
  function verticalFields(q, n) {
    return {
      q: q.field('商', n.q, 'number', { feedback: quotientFeedback(n) }),
      p: q.field('乘出來的數', n.p, 'number', { feedback: productFeedback(n) }),
      r: q.field('餘數', n.r, 'number', { feedback: remainderFeedback(n) })
    };
  }
  const quotientWhy = n => `${n.b}×${n.q}＝${n.p}${n.p === n.a ? '' : ` 沒有超過 ${n.a}`}${n.q < 9 ? `，${n.b}×${n.q + 1}＝${n.p + n.b} 就超過了` : ''}，所以商是 ${n.q}，寫在被除數個位的上方。`;

  /* ---------- 各題型 ---------- */
  function meaningQuestion(t) {
    const q = newQuestion('meaning', t), n = numbers(t, 'none'), c = contextFor(t, false);
    formulaStep(q, n, c);
    const f = q.field('商', n.q, 'number', { feedback: raw => `${n.b}×${raw}＝${n.b * Number(raw)}，不是 ${n.a}，再想想九九乘法。` });
    q.step('用乘法找出商', [f], `${n.b}×${n.q}＝${n.a}，所以 ${n.a}÷${n.b}＝${n.q}。`, `除法的答案可以用乘法來找：${n.b} 乘以多少會等於 ${n.a}？`, `${n.b}×{${f.key}}＝${n.a}`);
    answerStep(q, n, c, false);
    return finish(q, c.text(n.a, n.b, false));
  }
  function remainderQuestion(t) {
    const q = newQuestion('remainder', t), n = numbers(t, 'some', { max: 60 }), c = contextFor(t, true);
    formulaStep(q, n, c);
    const qf = q.field('商', n.q, 'number', { feedback: quotientFeedback(n) }), rf = q.field('餘數', n.r, 'number', { feedback: remainderFeedback(n) });
    q.step('算出商和餘數', [qf, rf], `${quotientWhy(n).replace('，寫在被除數個位的上方', '')}${n.a}－${n.p}＝${n.r}，所以 ${eqText(n)}。`,
      `找 ${n.b} 的幾倍最接近 ${n.a} 又不超過它，那就是商；${n.a} 減掉它就是餘數，餘數要比 ${n.b} 小。`, `${n.a}÷${n.b}＝{${qf.key}}…{${rf.key}}`);
    answerStep(q, n, c, true);
    return finish(q, c.text(n.a, n.b, true));
  }
  function calcQuestion(t) {
    const q = newQuestion('calc', t), n = numbers(t, 'any', { max: 60 }); n.showZero = true;
    const qf = q.field('商', n.q, 'number', { feedback: quotientFeedback(n) }), rf = q.field('餘數', n.r, 'number', { feedback: remainderFeedback(n) });
    q.step('算出商和餘數', [qf, rf], `${quotientWhy(n).replace('，寫在被除數個位的上方', '')}${n.a}－${n.p}＝${n.r}，所以 ${eqText(n)}。${n.r ? '' : '剛好分完，餘數是 0。'}`,
      `想九九乘法：${n.b} 的幾倍最接近 ${n.a} 又不超過它？剩下的就是餘數，餘數要比 ${n.b} 小。`, `${n.a}÷${n.b}＝{${qf.key}}…{${rf.key}}`);
    q.finalFields = [qf, rf];
    return finish(q, `算算看：${n.a}÷${n.b}＝（　）…（　）`);
  }
  function verticalQuestion(t) {
    const q = newQuestion('vertical', t), n = numbers(t, 'any', { twoDigit: t.rnd(0, 5) > 0 }), f = verticalFields(q, n); n.showZero = true;
    q.step('估商：寫出商', [f.q], quotientWhy(n), `想九九乘法裡 ${n.b} 的倍數：${n.b} 的幾倍最接近 ${n.a} 又不超過它？`, '', verticalLayout(n, { q: f.q }));
    q.step('乘：除數×商', [f.p], `${n.b}×${n.q}＝${n.p}，寫在 ${n.a} 的下面，個位要對齊。`, '把除數和商相乘，寫在被除數的下面。', '', verticalLayout(n, { q: true, p: f.p }));
    q.step('減：算出餘數', [f.r], `${n.a}－${n.p}＝${n.r}，${n.r} 比除數 ${n.b} 小，所以 ${eqText(n)}。`, '被除數減掉乘出來的數，就是餘數；餘數一定要比除數小。', '', verticalLayout(n, { q: true, p: true, r: f.r }));
    q.finalFields = [f.q, f.p, f.r];
    q.examSteps = [{ title: '用直式算算看', fields: q.finalFields, pattern: '', layout: verticalLayout(n, { q: f.q, p: f.p, r: f.r }) }];
    return finish(q, `用直式算算看：${n.a}÷${n.b}＝（　）…（　）`);
  }
  function verticalWordQuestion(t) {
    const q = newQuestion('verticalWord', t), n = numbers(t, 'any', { twoDigit: true }), c = contextFor(t, true), f = verticalFields(q, n); n.showZero = true;
    formulaStep(q, n, c);
    q.step('用直式算算看', [f.q, f.p, f.r], `${quotientWhy(n)}${n.b}×${n.q}＝${n.p}，${n.a}－${n.p}＝${n.r}，所以 ${eqText(n)}。`,
      `先估商（${n.b} 的幾倍最接近 ${n.a}），再把除數×商寫在下面，最後相減算出餘數。`, '', verticalLayout(n, { q: f.q, p: f.p, r: f.r }));
    answerStep(q, n, c, true);
    return finish(q, `${c.text(n.a, n.b, true)}（先列式，再用直式算算看）`);
  }
  function zeroOneQuestion(t) {
    const q = newQuestion('zeroOne', t);
    const kinds = t.shuffle(['zero', 'same', 'one', t.pick(['zero', 'same', 'one'])]);
    const used = new Set(), items = kinds.map(k => {
      let n; do { n = t.rnd(2, 9); } while (used.has(`${k}${n}`)); used.add(`${k}${n}`);
      return k === 'zero' ? { text: `0÷${n}`, v: 0, k } : k === 'same' ? { text: `${n}÷${n}`, v: 1, k } : { text: `${n}÷1`, v: n, k };
    });
    const fields = items.map(it => q.field(it.text, it.v, 'number', {
      feedback: () => it.k === 'zero' ? '0 平分給任何人，每人都分到 0 個：0 除以任何數（0 除外）都是 0。' : it.k === 'same' ? '一個數除以自己，剛好分成 1 份：答案是 1。' : '除以 1 就是只分成 1 份，答案等於被除數。'
    }));
    q.step('填填看', fields, `${items.map(it => `${it.text}＝${it.v}`).join('，')}。0÷任何數（0 除外）＝0；一個數÷自己＝1；一個數÷1＝那個數。`,
      '0 個東西平分，每份都是 0；8 個每 8 個一份，剛好 1 份；8 個每 1 個一份，可以分 8 份。', fields.map(f => `${f.label}＝{${f.key}}`).join('　'));
    q.finalFields = fields;
    return finish(q, '填填看：0 和 1 的除法');
  }
  function parityNumber(t, even, used) {
    for (;;) {
      const digits = t.pick([1, 2, 2, 3, 3, 4]);
      const lo = digits === 1 ? 1 : 10 ** (digits - 1), hi = 10 ** digits - 1;
      let n = t.rnd(lo, hi); if ((n % 2 === 0) !== even) n += n + 1 > hi ? -1 : 1;
      if (n >= lo && !used.has(n)) { used.add(n); return n; }
    }
  }
  function parityQuestion(t) {
    const q = newQuestion('parity', t), used = new Set(), evens = t.rnd(2, 4);
    const nums = t.shuffle([...Array(6)].map((_, i) => parityNumber(t, i < evens, used)));
    const fields = nums.map(n => q.field(String(n), n % 2 === 0 ? 'even' : 'odd', 'decision', { options: ['even', 'odd'], optionLabels: { even: '偶數', odd: '奇數' } }));
    q.step('判斷偶數或奇數', fields, `${nums.map(n => `${n} 的個位是 ${n % 10}，是${n % 2 ? '奇' : '偶'}數`).join('；')}。`,
      '只要看個位數字：個位是 0、2、4、6、8 的是偶數（2 個 2 個一數剛好數完），個位是 1、3、5、7、9 的是奇數。');
    q.finalFields = fields;
    return finish(q, '下面的數，哪些是偶數？哪些是奇數？');
  }

  /* 是非題 */
  function judgeQuestion(t, variant) {
    const q = newQuestion('judge', t), kind = variant % 6;
    let statement, truth, why;
    if (kind === 0) {
      const n = numbers(t, 'some', { max: 60 }), mode = t.rnd(0, 2);
      if (mode === 0) { statement = `${n.a}÷${n.b}＝${n.q}…${n.r}`; truth = true; why = `${n.b}×${n.q}＝${n.p}，${n.a}－${n.p}＝${n.r}，${n.r} 比 ${n.b} 小，正確。`; }
      else if (mode === 1 && n.q > 1) { statement = `${n.a}÷${n.b}＝${n.q - 1}…${n.r + n.b}`; truth = false; why = `餘數 ${n.r + n.b} 比除數 ${n.b} 大，還可以再分一份；應該是 ${n.a}÷${n.b}＝${n.q}…${n.r}。`; }
      else { const wrongR = n.r === 1 ? 2 : n.r - 1; statement = `${n.a}÷${n.b}＝${n.q}…${wrongR}`; truth = false; why = `${n.a}－${n.b}×${n.q}＝${n.r}，餘數是 ${n.r}，不是 ${wrongR}。`; }
    } else if (kind === 1) {
      const n = numbers(t, 'none'); truth = t.rnd(0, 1) === 1;
      statement = truth ? `在 ${n.a}÷${n.b}＝${n.q} 中，${n.a} 是被除數，${n.b} 是除數，${n.q} 是商` : `在 ${n.a}÷${n.b}＝${n.q} 中，${n.b} 是被除數，${n.a} 是除數，${n.q} 是商`;
      why = `除號前面的 ${n.a} 是被除數，除號後面的 ${n.b} 是除數，等號後面的 ${n.q} 是商。`;
    } else if (kind === 2) {
      const n = t.rnd(2, 9), list = [[`0÷${n}＝0`, true], [`0÷${n}＝${n}`, false], [`${n}÷${n}＝1`, true], [`${n}÷${n}＝0`, false], [`${n}÷1＝${n}`, true], [`${n}÷1＝1`, false]];
      [statement, truth] = t.pick(list);
      why = `0÷${n}＝0，${n}÷${n}＝1，${n}÷1＝${n}。`;
    } else if (kind === 3) {
      const b = t.rnd(3, 9), x = t.rnd(0, 1) ? t.rnd(1, b - 1) : t.rnd(b, b + 3); truth = x < b;
      statement = `除數是 ${b} 的除法，餘數有可能是 ${x}`;
      why = `餘數一定要比除數小，所以除數是 ${b} 時，餘數只可能是 0～${b - 1}。`;
    } else if (kind === 4) {
      const n = numbers(t, 'some', { max: 60 }); truth = t.rnd(0, 1) === 1;
      statement = truth ? `${n.a}÷${n.b}＝${n.q}…${n.r}，可以用 ${n.b}×${n.q}＋${n.r}＝${n.a} 來驗算` : `${n.a}÷${n.b}＝${n.q}…${n.r}，可以用 ${n.b}×${n.r}＋${n.q}＝${n.a} 來驗算`;
      why = `驗算：除數×商＋餘數＝被除數，${n.b}×${n.q}＋${n.r}＝${n.a}。`;
    } else {
      const even = t.rnd(0, 1) === 1, n = parityNumber(t, t.rnd(0, 1) === 1, new Set());
      statement = `${n} 是${even ? '偶' : '奇'}數`; truth = (n % 2 === 0) === even;
      why = `${n} 的個位是 ${n % 10}，所以 ${n} 是${n % 2 ? '奇' : '偶'}數。`;
    }
    const f = q.field('這個敘述', truth ? 'yes' : 'no', 'decision', { options: ['yes', 'no'], optionLabels: { yes: '○ 正確', no: '× 錯誤' } });
    q.step('判斷對錯', [f], `${truth ? '○ 正確。' : '× 錯誤。'}${why}`, '想一想除法的規則：被除數÷除數＝商…餘數，餘數要比除數小。');
    q.finalFields = [f];
    return finish(q, `判斷對錯：${statement}。`);
  }

  /* 正確的 (商, 餘數) 放第一個，再補三個不重複、看起來合理的錯誤組合 */
  function uniquePairs(n, alts) {
    const seen = new Set([`${n.q},${n.r}`]), out = [[n.q, n.r]];
    for (const [x, y] of alts) {
      const k = `${x},${y}`;
      if (x >= 0 && y >= 0 && !seen.has(k) && out.length < 4) { seen.add(k); out.push([x, y]); }
    }
    return out;
  }
  /* 選擇題 */
  function choiceQuestion(t, variant) {
    const q = newQuestion('choice', t), kind = variant % 6;
    let text, options, correct = 0, why;
    if (kind === 0) {
      const n = numbers(t, 'none'), c = contextFor(t, false);
      text = `「${c.text(n.a, n.b, false)}」要用哪一個算式來算？`;
      options = [`${n.a}÷${n.b}`, `${n.a}×${n.b}`, `${n.a}－${n.b}`, `${n.a}＋${n.b}`]; why = kindWhy(c, n);
    } else if (kind === 1) {
      const n = numbers(t, 'some', { max: 60, minQ: 2 }), c = contextFor(t, true), [qt, qu, rt, ru] = c.ans;
      const say = (x, y) => `${qt} ${x} ${qu}，${rt} ${y} ${ru}`;
      text = c.text(n.a, n.b, true);
      options = uniquePairs(n, [[n.q - 1, n.r + n.b], [n.r, n.q], [n.q + 1, 0], [n.q, n.b - n.r], [n.q + 1, n.r], [n.q, n.r + 1]]).map(([x, y]) => say(x, y));
      why = `${n.a}÷${n.b}＝${n.q}…${n.r}，所以${say(n.q, n.r)}。`;
    } else if (kind === 2) {
      const even = t.rnd(0, 1) === 1, used = new Set();
      text = `下面哪一個數是${even ? '偶' : '奇'}數？`;
      const right = parityNumber(t, even, used);
      options = [right, parityNumber(t, !even, used), parityNumber(t, !even, used), parityNumber(t, !even, used)].map(String);
      why = `只看個位：${right} 的個位是 ${right % 10}，是${even ? '偶' : '奇'}數，其他三個都是${even ? '奇' : '偶'}數。`;
    } else if (kind === 3) {
      const n = numbers(t, 'some', { max: 60, minQ: 2 });
      text = `${n.a}÷${n.b} 的商和餘數是多少？`;
      options = uniquePairs(n, [[n.q - 1, n.r + n.b], [n.q + 1, n.r], [n.q, n.r + 1], [n.r, n.q], [n.q + 1, 0]]).map(([x, y]) => `商 ${x}，餘數 ${y}`);
      why = `${n.b}×${n.q}＝${n.p}，${n.a}－${n.p}＝${n.r}，所以商是 ${n.q}，餘數是 ${n.r}。`;
    } else if (kind === 4) {
      const n = t.rnd(2, 9), target = t.pick(['0', '1', 'n']);
      const all = { '0': `0÷${n}`, '1': `${n}÷${n}`, n: `${n}÷1` };
      text = `下面哪一個算式的答案是 ${target === 'n' ? n : target}？`;
      options = [all[target], ...Object.keys(all).filter(k => k !== target).map(k => all[k]), '1÷1'].slice(0, 4);
      if (target === '1') options[3] = `0÷${n === 9 ? 8 : n + 1}`;
      why = `0÷${n}＝0，${n}÷${n}＝1，${n}÷1＝${n}，1÷1＝1。`;
    } else {
      const b = t.rnd(4, 9), small = t.shuffle([...Array(b - 1)].map((_, i) => i + 1)).slice(0, 3), big = t.rnd(b, b + 3);
      text = `除數是 ${b} 的除法，下面哪一個「不可能」是餘數？`;
      options = [String(big), ...small.map(String)];
      why = `餘數一定要比除數小，除數是 ${b} 時，餘數只可能是 0～${b - 1}，所以 ${big} 不可能是餘數。`;
    }
    const f = choiceField(q, '正確選項', options, correct);
    q.step('選出正確答案', [f], why, '想一想除法的規則：被除數÷除數＝商…餘數，餘數要比除數小。');
    q.finalFields = [f];
    return finish(q, text);
  }

  const MAKERS = { meaning: meaningQuestion, remainder: remainderQuestion, calc: calcQuestion, vertical: verticalQuestion,
    verticalWord: verticalWordQuestion, zeroOne: zeroOneQuestion, parity: parityQuestion, judge: judgeQuestion, choice: choiceQuestion };
  function generate(type, settings, rng = Math.random, variant) {
    const t = tools(rng);
    if (type === 'mixed') type = t.pick(PRACTICE_TYPES);
    if (!MAKERS[type]) throw new Error('Unknown question category');
    return MAKERS[type](t, variant === undefined ? t.rnd(0, 11) : variant);
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

  /* 除法直式：格子跟數字都靠右對齊在被除數的個位 */
  function layoutStep(step, cell) {
    const L = step.layout, esc = RQ.displayText;
    const slot = (v, name) => {
      if (v && typeof v === 'object') return `<span class="vd-cell vd-${name} vd-input">${cell(v)}</span>`;
      if (v === true) return `<span class="vd-cell vd-${name}">${esc(String(L[name]))}</span>`;
      return `<span class="vd-cell vd-${name} vd-empty" aria-hidden="true"></span>`;
    };
    return `<div class="vdiv" role="group" aria-label="${L.a}÷${L.b} 的直式">` +
      `<span class="vd-side"></span>${slot(L.show.q, 'q')}` +
      `<span class="vd-side vd-divisor">${L.b}<span class="vd-paren" aria-hidden="true">)</span></span><span class="vd-cell vd-a">${L.a}</span>` +
      `<span class="vd-side"></span>${slot(L.show.p, 'p')}` +
      `<span class="vd-side"></span>${slot(L.show.r, 'r')}</div>`;
  }

  const api = { ...RQ, categories, PRACTICE_TYPES, EXAM_TYPES, defaultType: 'meaning', generate, buildExam, layoutStep, CONTEXTS };
  api.correct = RQ.correct;
  api.format = a => String(a);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { api.settings = () => null; root.PaperQuestions = api; }
})(typeof window !== 'undefined' ? window : globalThis);
