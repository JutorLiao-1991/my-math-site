(function (root) {
  'use strict';
  const I = typeof module !== 'undefined' && module.exports ? require('./interval_questions_grade6.js') : root.IntervalQuestions;
  const R = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;
  function adapt(q) {
    const interval = { key: 'f0', type: 'number', label: '間隔數', expected: q.intervals, unit: '個間隔', integerOnly: true };
    const answer = { key: 'f1', type: 'number', label: q.answerLabel, expected: q.answer, unit: q.answerUnit, integerOnly: q.query === 'count' };
    return { source: q, type: 'interval', category: q.category, text: q.text, textHtml: R.displayText(q.text), finalFields: [answer], explanation: q.explanation,
      steps: [
        { title: '先找間隔數', fields: [interval], pattern: '{f0}', explanation: q.firstExplanation, hint: q.hint },
        { title: '再計算答案', fields: [answer], pattern: '{f1}', explanation: q.finalExplanation, hint: `確認答案單位：${q.answerUnit}。${q.hint}` }
      ] };
  }
  const api = { ...R, defaultType: 'index', adapt,
    generate(type, difficulty = 'basic', rng = Math.random, variant = 0) { return adapt(I.generate(type, difficulty, rng, ['count', 'gap', 'length'][variant % 3])); },
    buildExam(difficulty = 'basic', rng = Math.random) { return I.buildExam(difficulty, rng).map(adapt); },
    correct(raw, field) { return (!field.integerOnly || /^\d+$/.test(String(raw))) && I.isCorrect(raw, field.expected); },
    format: value => typeof value === 'number' ? I.format(value) : String(value)
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  const $ = id => document.getElementById(id);
  api.settings = () => document.querySelector('input[name="difficulty"]:checked').value;
  let diagramQuestion = null;
  let diagramKey = '';
  function drawDiagram() {
    if ($('diagram').hidden || !diagramQuestion) return;
    const q = diagramQuestion, width = Math.max(220, $('diagram-drawing').clientWidth);
    const key = `${width}:${q.text}`;
    if (key === diagramKey) return;
    diagramKey = key;
    const blue = '#2563a8', ink = '#334155', line = '#94a3b8';
    let height = 115, content = '';
    function dot(x, y, empty = false) {
      return `<circle cx="${x}" cy="${y}" r="6" fill="${empty ? '#fff' : blue}" stroke="${blue}" stroke-width="2"/>`;
    }
    function label(x, y, text, anchor = 'middle') {
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${ink}" font-size="14">${text}</text>`;
    }
    if (q.type === 'loop') {
      height = 235;
      const cx = width / 2, cy = 110, radius = 74;
      if (q.shape === 'square') {
        content += `<rect x="${cx-radius}" y="${cy-radius}" width="${2*radius}" height="${2*radius}" fill="none" stroke="${line}" stroke-width="2"/>`;
        const positions = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
        positions.forEach(([x,y]) => content += dot(cx+x*radius,cy+y*radius));
        content += label(cx, cy-5, '四角都有放');
      } else {
        content += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${line}" stroke-width="2"/>`;
        for (let i=0;i<8;i++) content += dot(cx+radius*Math.cos(i*Math.PI/4),cy+radius*Math.sin(i*Math.PI/4));
        content += label(cx, cy-5, '繞成一圈');
      }
      content += label(cx,cy+18,'最後接回第一個');
    } else {
      const left = 20, right = width-20, y = 54;
      content += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${line}" stroke-width="2"/>`;
      // A compressed layout demonstrates endpoint conditions, never the unknown count.
      for (let i=0;i<6;i++) {
        if (i===3) { content += label(left+(right-left)*i/5,y-12,'⋯'); continue; }
        const empty = (i===0 && q.type==='neither') || (i===5 && ['one','neither'].includes(q.type));
        content += dot(left+(right-left)*i/5,y,empty);
      }
      content += label(left,89,q.diagramLabels.start,'start') + label(right,89,q.diagramLabels.end,'end');
      if(q.type==='index') content += label(left+(right-left)/5,29,`第 ${q.start+1} ${q.context.classifier}`);
      else content += label(width/2,24,q.type==='both'?'兩端都放':q.type==='one'?'起點放、終點不放':'兩端都不放');
    }
    $('diagram-drawing').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${q.category}的配置示意圖">${content}</svg>`;
    $('diagram-caption').textContent = q.type==='loop' ? '示意圖不依實際數量繪製；繞一圈，最後到第一個也是一個間隔。' : '實心點：有放。空心點：沒放。中間省略，數量與長度以題目為準。';
  }

  api.renderExtra = (q) => { diagramQuestion = q.source; diagramKey = ''; $('diagram').hidden = true; };
  api.showHint = (q, shown) => { $('diagram').hidden = !shown; drawDiagram(); };
  if (window.ResizeObserver) new ResizeObserver(drawDiagram).observe($('diagram-drawing'));
  else window.addEventListener('resize', drawDiagram);
  root.PaperQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
