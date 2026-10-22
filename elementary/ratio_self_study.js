(function (root) {
  'use strict';
  const Q = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;
  const E = typeof module !== 'undefined' && module.exports ? require('./ratio_input_grade6.js') : root.RatioInput;
  const lessons = [
    { id: 'order', title: '比的認識', practice: 'ratio', goal: '按照比較的順序，寫出前項和後項。',
      prediction: '紅球有 5 顆，藍球有 3 顆。「藍球對紅球」的數量比怎麼寫？',
      choices: ['5：3', '3：5', '3：8'], answer: 1,
      finding: '誰在「對」的前面，就先寫誰的量。比較順序交換，前項和後項也要交換。',
      checks: [{ text: '紅球有 5 顆，藍球有 3 顆。請寫出藍球對紅球的數量比。', kind: 'order', fields: ['前項', '後項'], expected: ['3', '5'], requirement: '不須簡化，請填原數量' }] },
    { id: 'value', title: '認識比值', practice: 'value', goal: '用前項除以後項，分清比與比值。',
      prediction: '果汁原液與水的比是 4：6，這個比的比值是哪一個？',
      choices: ['4 ÷ 6', '6 ÷ 4', '4 ÷（4＋6）'], answer: 0,
      finding: '比值＝前項÷後項。原液對水的比值，和原液占整杯的比例，是不同的比較。',
      checks: [{ text: '果汁原液與水的比是 8：12。請求出「原液對水」的比值。', kind: 'value', fields: ['比值'], rational: true, expected: ['2/3'], requirement: '不須化成最簡分數；可用等值分數作答' }] },
    { id: 'equivalent', title: '探索等值比', practice: 'equal', goal: '觀察同乘相同的數，為什麼比值不變。',
      prediction: '原液與水原本是 2：3，兩種份量都變成 2 倍，味道會怎樣？',
      choices: ['變濃', '一樣濃', '變淡'], answer: 1,
      finding: '前項、後項同乘或同除以相同的非零數，比值不變。只改其中一項，通常就不是等值比。',
      checks: [{ text: '原液與水的比是 2：3。水增加到 12 份時，原液要有幾份，才能保持相同濃淡？', kind: 'equivalent', fields: ['原液的份數'], expected: ['8'], requirement: '請填整數份數' }] },
    { id: 'simplest', title: '最簡整數比', practice: 'equal', goal: '整數、小數、分數與帶分數，都能整理成最簡整數比。',
      prediction: '6：9 已經是最簡整數比了嗎？', choices: ['是', '還不是'], answer: 1,
      finding: '先讓兩項都是整數，再同除以最大公因數。只把小數點拿掉，或只改一項，都會改變原來的比。',
      checks: [
        { text: '將 12：18 化成最簡整數比。', kind: 'simplest', form: '整數比', fields: ['前項', '後項'], expected: ['2', '3'], original: ['12', '18'] },
        { text: '將 1.2：0.8 化成最簡整數比。', kind: 'simplest', form: '小數比', fields: ['前項', '後項'], expected: ['3', '2'], original: ['1.2', '0.8'] },
        { text: '將 2/3：5/6 化成最簡整數比。', kind: 'simplest', form: '分數比', fields: ['前項', '後項'], expected: ['4', '5'], original: ['2/3', '5/6'] },
        { text: '將 1 1/2：2 1/4 化成最簡整數比。', kind: 'simplest', form: '帶分數比', fields: ['前項', '後項'], expected: ['2', '3'], original: ['1 1/2', '2 1/4'] }
      ].map(check => ({ ...check, requirement: '須化為最簡整數比' })) }
  ];
  const recipes = [
    { title: '整數比', raw: ['8', '12'], multiplier: 1, integers: [8, 12] },
    { title: '小數比', raw: ['0.8', '1.2'], multiplier: 10, integers: [8, 12] },
    { title: '分數比', raw: ['1/2', '3/4'], multiplier: 4, integers: [2, 3] },
    { title: '帶分數比', raw: ['1 1/2', '2 1/4'], multiplier: 4, integers: [6, 9] }
  ];
  const blank = rational => ({ ...E.fromValue(), kind: rational ? 'fraction' : 'number' });
  function createState() {
    return { version: 1, lesson: 0, progress: lessons.map(lesson => ({ phase: 0, prediction: null, explored: false, checkpoint: 0,
      passed: lesson.checks.map(() => false), entries: lesson.checks.map(c => c.fields.map(() => blank(c.rational))),
      exploration: { order: 'blue', reverse: false, factor: 1, waterOnly: false, recipe: 0, divisor: 1, converted: false, free: false } })) };
  }
  function assess(check, values) {
    if (values.some(v => v === '' || String(v).includes('□'))) return { status: 'incomplete', message: '還有格子沒填好，請先完成作答。' };
    const parsed = values.map(Q.parse);
    if (parsed.some(x => !x || x.n <= 0)) return { status: 'error', message: '請輸入正確的正數；分母不能是 0。' };
    const right = check.expected.map(Q.parse);
    const sameValue = (a, b) => a.n * b.d === b.n * a.d;
    if (check.kind === 'simplest') {
      if (values.some(v => !/^\d+$/.test(v))) return { status: 'format', message: '這題要填最簡「整數」比。先把前項、後項一起化為整數。', revisit: '回看教具中的「化為整數」' };
      const [x, y] = parsed.map(x => x.n), [A, B] = right.map(x => x.n);
      if (x * B !== y * A) return { status: 'error', message: '這個比和原比不等值。檢查兩項是否同乘或同除以相同的數。', revisit: '回看教具中的同乘、同除' };
      const divisor = Q.gcd(x, y);
      if (divisor > 1) return { status: 'equivalent', message: `比的關係正確！兩項還能同除以 ${divisor}，再化簡一步。` };
    } else if (!parsed.every((x, i) => sameValue(x, right[i]))) {
      let message = '再想一想，看看比較的順序與對應關係。';
      if (check.kind === 'order') message = parsed.every((x, i) => sameValue(x, right[1 - i])) ? '順序顛倒了。「藍球對紅球」要先寫藍球的數量。' : '這一步請填實際數量：先找藍球，再找紅球。';
      if (check.kind === 'value') message = sameValue(parsed[0], { n: 3, d: 2 }) ? '你把除法順序顛倒了。比值＝前項÷後項。' : sameValue(parsed[0], { n: 2, d: 5 }) ? '這是原液占整杯的比例。這題問原液「對水」，要以前項除以後項。' : '比值＝前項÷後項。請用原液的份數除以水的份數。';
      if (check.kind === 'equivalent') message = '水從 3 份變成 12 份，是乘以 4；原液也要乘以 4。';
      return { status: 'error', message, revisit: '回看教具，再比較一次' };
    }
    return { status: 'success', message: check.kind === 'value' ? '答對了！等值但未約分的分數，也能正確表示這個比值。' : '答對了！你已掌握這個觀念。' };
  }
  function restore(raw) {
    const clean = createState();
    if (!raw || raw.version !== 1 || !Array.isArray(raw.progress)) return clean;
    if (Number.isInteger(raw.lesson) && raw.lesson >= 0 && raw.lesson < lessons.length) clean.lesson = raw.lesson;
    clean.progress.forEach((p, i) => {
      const source = raw.progress[i]; if (!source || typeof source !== 'object') return;
      if (Number.isInteger(source.prediction) && source.prediction >= 0 && source.prediction < lessons[i].choices.length) p.prediction = source.prediction;
      p.explored = source.explored === true;
      if (Number.isInteger(source.phase) && source.phase >= 0 && source.phase <= 3) p.phase = source.phase;
      if (Number.isInteger(source.checkpoint) && source.checkpoint >= 0 && source.checkpoint < lessons[i].checks.length) p.checkpoint = source.checkpoint;
      p.entries.forEach((row, c) => row.forEach((entry, f) => {
        const old = source.entries && source.entries[c] && source.entries[c][f]; if (!old || typeof old !== 'object') return;
        if (lessons[i].checks[c].rational && ['number', 'fraction', 'mixed'].includes(old.kind)) entry.kind = old.kind;
        ['number', 'whole', 'numerator', 'denominator'].forEach(part => {
          if (typeof old[part] === 'string' && (part === 'number' ? /^\d{0,8}(?:\.\d{0,6})?$/ : /^\d{0,8}$/).test(old[part]) && old[part].length <= 8) entry[part] = old[part];
        });
      }));
      p.passed = lessons[i].checks.map((check, c) => !!(source.passed && source.passed[c] === true && assess(check, p.entries[c].map(E.value)).status === 'success'));
      const exp = source.exploration || {};
      if (['red', 'blue'].includes(exp.order)) p.exploration.order = exp.order;
      ['reverse', 'waterOnly', 'free', 'converted'].forEach(key => { p.exploration[key] = exp[key] === true; });
      if (Number.isInteger(exp.factor) && exp.factor >= 1 && exp.factor <= 6) p.exploration.factor = exp.factor;
      if (Number.isInteger(exp.recipe) && exp.recipe >= 0 && exp.recipe < recipes.length) p.exploration.recipe = exp.recipe;
      const ints = recipes[p.exploration.recipe].integers;
      if (Number.isInteger(exp.divisor) && exp.divisor > 0 && ints.every(n => n % exp.divisor === 0)) p.exploration.divisor = exp.divisor;
      if (p.phase > 0 && p.prediction === null) p.phase = 0;
      if (p.phase > 1 && !p.explored) p.phase = 1;
      if (p.phase === 3 && !p.passed.every(Boolean)) p.phase = 2;
    });
    return clean;
  }
  const api = { lessons, recipes, createState, restore, assess };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RatioSelfStudy = api;
})(typeof window !== 'undefined' ? window : globalThis);
