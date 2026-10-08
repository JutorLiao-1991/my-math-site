/* All lengths are stored as integer centimeters to keep decimal answers exact. */
(function (root) {
  'use strict';
  const TYPES = {
    index: '編號之間的距離', both: '直線兩端都放',
    one: '直線只有一端放', neither: '直線兩端都不放', loop: '封閉一圈'
  };
  const UNITS = { '公分': 1, '公尺': 100, '公里': 100000 };
  const QUERIES = ['count', 'gap', 'length'];
  const CONTEXTS = [
    { place: '道路', item: '樹', classifier: '棵', verb: '種', phrase: '種樹' },
    { place: '道路', item: '路燈', classifier: '盞', verb: '設置', phrase: '設置路燈' },
    { place: '走廊', item: '盆栽', classifier: '個', verb: '擺放', phrase: '擺放盆栽' },
    { place: '道路', item: '旗子', classifier: '枝', verb: '插', phrase: '插旗子' }
  ];
  const pick = (values, random) => values[Math.floor(random() * values.length)];
  const integer = (min, max, random) => min + Math.floor(random() * (max - min + 1));
  const format = value => String(Number(value.toFixed(5)));
  const measure = (cm, unit) => `${format(cm / UNITS[unit])} ${unit}`;
  function shuffle(values, random) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function makeQuestion(options) {
    const { type, query = 'length', intervals, spacingCm, unit = '公尺', lengthUnit = unit,
      start = 1, shape = 'circle', context = CONTEXTS[0] } = options;
    if (!(type in TYPES) || !Number.isInteger(intervals) || intervals < 2 ||
        !Number.isInteger(spacingCm) || spacingCm <= 0 || !(unit in UNITS) ||
        !(lengthUnit in UNITS) || !QUERIES.includes(query) ||
        (type === 'index' && (query !== 'length' || !Number.isInteger(start) || start < 1)) ||
        (type === 'loop' && !['circle', 'square'].includes(shape)) ||
        (type === 'loop' && shape === 'square' && intervals % 4 !== 0)) {
      throw new Error('Invalid interval question');
    }
    const count = type === 'both' ? intervals + 1 : type === 'neither' ? intervals - 1 :
      type === 'index' ? intervals + 1 : intervals;
    const lengthCm = intervals * spacingCm;
    const gap = spacingCm / UNITS[unit], length = lengthCm / UNITS[unit];
    const c = context, objectCount = `${count} ${c.classifier}${c.item}`;
    const total = measure(lengthCm, lengthUnit), spacing = measure(spacingCm, unit);
    const conversion = lengthUnit === unit ? '' : `${total} ＝ ${measure(lengthCm, unit)}`;
    let text, first, second, hint;
    let diagramLabels = { start: '起點', end: '終點', center: '' };
    if (type === 'index') {
      const end = start + intervals;
      text = `在${c.place}的一旁，每 ${spacing}${c.verb}一${c.classifier}${c.item}，從第一${c.classifier}開始編號。第 ${start} ${c.classifier}到第 ${end} ${c.classifier}${c.item}相距幾${unit}？`;
      first = `${end} − ${start} ＝ ${intervals} 個間隔`;
      hint = `從第 ${start} ${c.classifier}到第 ${start + 1} ${c.classifier}，才跨過一個間隔。`;
      diagramLabels = { start: `第 ${start} ${c.classifier}`, end: `第 ${end} ${c.classifier}`, center: `每個間隔 ${spacing}` };
    } else {
      const endpoints = type === 'both' ? `頭尾兩端都${c.verb}，` :
        type === 'one' ? `起點有${c.verb}、終點沒有${c.verb}，` : `頭尾兩端都沒有${c.verb}，`;
      const rule = `每個間隔都相同（沒有${c.verb}${c.item}的端點到最近一${c.classifier}${c.item}，也算一個相同的間隔）`;
      const loopPlace = shape === 'square' ? '正方形公園' : '圓形人工湖';
      const corners = shape === 'square' ? `四個角落都要${c.verb}${c.item}，` : '';
      const known = query === 'count' ? `每隔 ${spacing}${c.verb}一${c.classifier}${c.item}` :
        query === 'gap' ? `共${c.verb}了 ${objectCount}` : `每隔 ${spacing}${c.verb}一${c.classifier}${c.item}，共${c.verb}了 ${objectCount}`;
      const ask = query === 'count' ? `共要${c.verb}幾${c.classifier}${c.item}？` :
        query === 'gap' ? `每個間隔長幾${unit}？` : `${type === 'loop' ? '周長' : '全長'}是幾${unit}？`;
      const givenLength = query === 'length' ? '' : `長 ${total}的`;
      text = type === 'loop' ?
        `沿著${query === 'length' ? '' : `周長為 ${total}的`}${loopPlace}周圍${c.phrase}，${known}，${corners}繞成一圈，相鄰${c.item}的間隔都相同。${ask}` :
        `在一條${givenLength}${c.place}的一旁${c.phrase}，${known}，${endpoints}${rule}。${ask}`;
      first = query === 'count' ? `${format(length)} ÷ ${format(gap)} ＝ ${intervals} 個間隔` :
        type === 'both' ? `${count} − 1 ＝ ${intervals} 個間隔` :
        type === 'neither' ? `${count} ＋ 1 ＝ ${intervals} 個間隔` : `${count} 個${c.item}，共有 ${intervals} 個間隔`;
      hint = query === 'count' ? '先用全長除以每個間隔的長度；如果單位不同，要先換算。' :
        type === 'both' ? '畫出兩端都有物件的短線段，比較物件數與間隔數。' :
        type === 'one' ? '起點放、終點不放，最後一個物件到終點仍有一段間隔。' :
        type === 'neither' ? '除了物件之間，起點與終點各還有一段間隔。' :
        '最後一個物件到第一個物件，也要算一個間隔。';
      diagramLabels.center = query === 'count' ? `每個間隔 ${spacing}` : `${objectCount}`;
      if (type === 'loop') diagramLabels = { start: '', end: '', center: diagramLabels.center };
    }
    if (query === 'count') {
      second = type === 'both' ? `${intervals} ＋ 1 ＝ ${count} ${c.classifier}${c.item}` :
        type === 'neither' ? `${intervals} − 1 ＝ ${count} ${c.classifier}${c.item}` :
        `${intervals} 個間隔，共 ${count} ${c.classifier}${c.item}`;
    } else if (query === 'gap') second = `${format(length)} ÷ ${intervals} ＝ ${spacing}`;
    else second = `${format(gap)} × ${intervals} ＝ ${measure(lengthCm, unit)}`;
    // Unit conversion belongs before the calculation that uses the length.
    const firstExplanation = conversion && query === 'count' ? `${conversion}\n${first}` : first;
    const finalExplanation = conversion && query === 'gap' ? `${conversion}\n${second}` : second;
    return {
      type, query, intervals, spacingCm, lengthCm, count, start, shape, unit, lengthUnit, context,
      text, category: TYPES[type], hint, firstExplanation, finalExplanation,
      answer: query === 'count' ? count : query === 'gap' ? gap : length,
      answerUnit: query === 'count' ? `${c.classifier}${c.item}` : unit,
      answerLabel: query === 'count' ? `共${c.verb}` : query === 'gap' ? '每個間隔長' : type === 'index' ? '相距' : type === 'loop' ? '周長' : '全長',
      diagramLabels,
      explanation: `${firstExplanation}\n${finalExplanation}`
    };
  }
  function generate(type, difficulty = 'basic', random = Math.random, requestedQuery) {
    if (type === 'mixed') type = pick(Object.keys(TYPES), random);
    if (!(type in TYPES) || !['basic', 'advanced'].includes(difficulty)) throw new Error('Unknown practice setting');
    const query = type === 'index' ? 'length' : requestedQuery || pick(QUERIES, random);
    const shape = type === 'loop' ? pick(['circle', 'square'], random) : 'line';
    const context = pick(CONTEXTS, random);
    const short = context.place === '走廊' && type !== 'loop';
    const intervals = shape === 'square' ? 4 * integer(2, 15, random) : integer(4, short ? 20 : 50, random);
    let unit, spacingCm, lengthUnit;
    if (difficulty === 'basic') {
      unit = pick(['公分', '公尺'], random);
      spacingCm = pick(unit === '公分' ? [20, 25, 50, 75] : short ? [100, 200] : [100, 200, 300, 500, 1000, 2000, 3000, 4000], random);
      lengthUnit = unit;
    } else {
      unit = '公尺';
      spacingCm = pick(short ? [25, 50, 75, 125, 150] : [25, 50, 75, 125, 150, 250, 350, 500, 1200, 2500, 4000], random);
      lengthUnit = query !== 'length' ? pick(['公分', '公尺', '公里'], random) : unit;
    }
    return makeQuestion({ type, query, intervals, spacingCm, unit, lengthUnit, shape,
      start: integer(2, 20, random), context });
  }
  function buildExam(difficulty = 'basic', random = Math.random) {
    const questions = [];
    // Two questions per type, and the three inverse queries all occur in each exam.
    Object.keys(TYPES).forEach((type, i) => {
      const first = generate(type, difficulty, random, QUERIES[i % 3]);
      let second = generate(type, difficulty, random, QUERIES[(i + 1) % 3]);
      if (first.text === second.text) second = makeQuestion({ ...second, start: second.start + 1 });
      questions.push(first, second);
    });
    return shuffle(questions, random);
  }
  function isCorrect(value, answer) {
    const text = String(value).trim();
    // A trailing dot is accepted as an integer; leading decimal notation is also valid.
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return false;
    return Number(text) === answer;
  }
  const api = { TYPES, UNITS, CONTEXTS, makeQuestion, generate, buildExam, isCorrect, format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IntervalQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
