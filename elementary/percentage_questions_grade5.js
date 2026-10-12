(function (root) {
  'use strict';
  const R = typeof module !== 'undefined' && module.exports ? require('./ratio_questions_grade6.js') : root.RatioQuestions;
  const categories = { mode1: '計算比率', mode2: '必背百分率', mode3: '小數轉百分率', mode4: '分數轉百分率', mode5: '百分率應用', mode6: '應用 Pro' };
  const round = n => Number(n.toFixed(6));
  const fraction = (n, d) => ({ n, d });
  function generate(type, settings, rng = Math.random, variant) {
    const rnd = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)), pick = list => list[rnd(0, list.length - 1)];
    if (type === 'mixed') type = pick(Object.keys(categories));
    const q = { type: 'percentage', topic: type, category: categories[type], steps: [], finalFields: [] };
    let id = 0;
    const field = (label, expected, unit = '', kind = 'number') => ({ key: `f${id++}`, label, expected, type: kind, unit });
    const step = (title, fields, explanation, hint, pattern = fields.map(f => `{${f.key}}`).join('　')) => q.steps.push({ title, fields, pattern, explanation, hint });
    const number = n => String(round(n));
    if (type === 'mode1') {
      const context = rnd(0, 3), total = context === 3 ? rnd(4, 8) * 10 : rnd(25, 39), part = rnd(2, Math.min(14, total - 1)), reverse = rnd(0, 1) === 1;
      const n = reverse ? total - part : part;
      const labels = [['破掉的雞蛋', '沒破掉的雞蛋'], ['投票給米米的人', '沒有投票給米米的人'], ['請假的同學', '出席的同學'], ['錄取的人', '未錄取的人']];
      const intro = [`媽媽買了${total}個雞蛋，其中${part}個破掉了。`, `班上有${total}人，其中${part}人投票給米米。`, `班上有${total}人，今天${part}人請假。`, `共有${total}人參加選拔，最後錄取${part}人。`][context];
      q.text = `${intro}請用分數表示「${labels[context][reverse ? 1 : 0]}」占全部的比率。`;
      const f = field('占全部的比率', fraction(n, total), '', 'rational');
      f.requirement = '不須簡化至最簡分數'; f.formats = ['fraction']; f.fractionOnly = true;
      step('部分量除以全部量', [f], `指定的部分量是${n}，全部量是${total}，比率＝${n}/${total}。`, '分母填全部量，分子填題目指定的部分量；留意問的是剩下的還是減少的。');
      q.finalFields = [f]; q.data = { n, d: total };
    } else if (['mode2', 'mode3', 'mode4'].includes(type)) {
      let n, d;
      if (type === 'mode2') [n, d] = pick([[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,10],[3,10],[1,8],[3,8],[5,8],[7,8]]);
      else if (type === 'mode3') { d = pick([100,1000,10000]); n = rnd(1, d - 1); }
      else { d = pick([20,25,50,400,1000,2000]); n = rnd(1, Math.min(d - 1, 160)); }
      const value = round(n / d * 100), shown = type === 'mode3' ? number(n / d) : `${n}/${d}`;
      q.text = `請把${shown}換成百分率。`;
      const f = field('百分率', value, '%');
      step('換成百分率', [f], `${shown}＝${number(n / d)}＝${value}%。`, type === 'mode3' ? '小數乘以100，再加上百分號。百分號已在格子旁，只要填數字。' : '分子除以分母，再乘以100，寫成百分率。', `${shown}＝{${f.key}}`);
      q.finalFields = [f]; q.data = { n, d };
    } else {
      const subtype = variant === undefined ? rnd(0, type === 'mode6' ? 11 : 9) : variant % (type === 'mode6' ? 12 : 10);
      const pro = type === 'mode6'; q.subtype = subtype;
      let base, pct, answer, text, label, unit = '元', operation = 'multiply', rateHint;
      if (subtype === 0) {
        base = rnd(10,24)*100; pct = pick([70,75,80,85,90]);
        text = `一件外套定價${base}元，現在打${number(pct / 10)}折出售。請問售價是多少元？`;
        label = '售價'; rateHint = '折數表示實際付原價的幾成，例如八折就是付80%。';
      } else if (subtype === 1 || subtype === 4) {
        base = subtype === 1 ? rnd(10,24)*100 : rnd(10,59)*10; const off = pick([10,15,20,25,30]);
        const savings = subtype === 4 && !pro; pct = savings ? off : 100-off;
        text = `商品原價${base}元，現在特價${off}% off（減價${off}%）。請問${savings ? '比原價便宜' : '特價售價是'}多少元？`;
        label = savings ? '便宜的金額' : '售價'; rateHint = savings ? '求便宜多少，使用減掉的百分率。' : '求售價，先用100%減去減價的百分率。';
      } else if (subtype === 2 || subtype === 5) {
        base = subtype === 2 ? pick([500,800,1200,2000]) : rnd(1,3)*1000; const markup = rnd(1,5); pct = 100+markup*10;
        text = `商品成本${base}元，老闆${subtype === 2 ? `加${markup}成作為定價` : `希望利潤是成本的${markup}成`}。請問要賣多少元？`;
        label = '定價'; rateHint = '售價包含原本的成本，再加上利潤；一成是10%。';
      } else if (subtype === 3) {
        base = rnd(3,7)*100; const off = rnd(15,44); pct = 100-off; unit = '毫升';
        text = `一杯水原有${base}毫升，蒸發掉${off}%後，還剩下多少毫升？`;
        label = '剩下的水量'; rateHint = '剩下的百分率＝100%－蒸發掉的百分率。';
      } else if (subtype === 6) {
        base = rnd(15,29)*100; const p1=rnd(20,34), p2=rnd(35,49); pct=p1+p2; unit='人';
        text = `幸福村有${base}人，農夫占${p1}%，勞工占${p2}%；每人只屬於其中一類。農夫和勞工共有多少人？`;
        label = '合計人數'; rateHint = '先把兩種人的百分率相加，再計算人數。';
      } else if (subtype === 7 || subtype === 8) {
        base = subtype === 7 ? rnd(15,39)*20 : rnd(25,44)*1000; pct=pick([10,15,20,25,30]); const part=round(base*pct/100);
        const f0=field(subtype === 7 ? '便宜金額占原價的小數比率' : '房租占月薪的小數比率', pct/100);
        const f1=field(subtype === 7 ? '折數' : '成數', subtype === 7 ? (100-pct)/10 : pct/10, subtype === 7 ? '折' : '成');
        if (subtype === 7) { f1.discount = true; f1.requirement = '例如八五折可填8.5或85'; }
        text=subtype===7 ? `衣服原價${base}元，打折後便宜了${part}元。請問這件衣服打幾折？` : `小玫的月薪${base}元，房租${part}元。房租占月薪的幾成？`;
        step('先計算部分量占全部的小數比率', [f0], `${part}÷${base}＝${pct/100}。`, '部分量除以全部量；這一步請用小數表示。');
        step(subtype===7?'把售價比率換成折數':'把比率換成成數', [f1], subtype===7 ? `售價占原價${100-pct}%，所以打${(100-pct)/10}折。` : `${pct}%就是${pct/10}成。`, subtype===7?'先求100%減去便宜的百分率，再換成折數。':'一成是10%。');
        q.text=text; q.finalFields=[f1]; q.data={base,pct,part,operation:subtype===7?'discount':'cheng'};
      } else if (subtype === 9) {
        base=rnd(10,19)*100+50; pct=rnd(85,99);
        text=`上期電費${base}元，本期是上期的${pct}%。請問本期電費多少元？`;
        label='本期電費'; rateHint='直接使用題目給的百分率，乘以上期電費。';
      } else if (subtype === 10) {
        base=rnd(5,9)*100; const listed=round(base*1.2), sold=round(listed*.8), loss=round(base-sold);
        q.text=`模型玩具成本${base}元，老闆加2成作為定價，再打8折出售。請填售價、判斷賺或賠，並填賺賠的金額。`;
        const f0=field('定價',listed,'元'), f1=field('售價',sold,'元'), f2=field('賺或賠','loss','','decision'), f3=field('賺賠金額',loss,'元');
        f2.options=['earn','loss']; f2.optionLabels={earn:'賺',loss:'賠'};
        step('先算加成後的定價',[f0],`${base}×1.2＝${listed}元。`,'加2成就是成本的120%。');
        step('再算打折後的售價',[f1],`${listed}×0.8＝${sold}元。`,'打8折就是定價的80%。');
        step('比較售價和成本',[f2,f3],`售價${sold}元低於成本${base}元，賠${loss}元。`,'用售價與成本比較，賺賠金額填正的金額。');
        q.finalFields=[f1,f2,f3]; q.data={base,listed,sold,loss,operation:'profitLoss'};
      } else {
        const original=rnd(10,19)*100; pct=75; base=round(original*.75); operation='divide';
        text=`球鞋特價25% off（減價25%），折扣後售價${base}元。請問原價是多少元？`;
        label='原價'; rateHint='售價是原價的75%；售價除以0.75，就是原價。';
      }
      if (!q.finalFields.length) {
        answer = round(operation==='divide' ? base/(pct/100) : base*pct/100);
        const f0=field('計算所用的百分率',pct,'%'), f1=field('計算所用的小數比率',pct/100), f2=field(label,answer,unit);
        if (!pro) step('找出計算所用的百分率',[f0],`這裡要用${pct}%。`,rateHint);
        step('把百分率換成小數',[f1],`${pct}%＝${pct/100}。`,'百分率除以100，換成小數。');
        step(operation==='divide'?'用除法找原來的全部量':'計算題目要求的量',[f2],`${base}${operation==='divide'?'÷':'×'}${pct/100}＝${answer}${unit}。`,operation==='divide'?'已知部分量，除以比率找全部量。':'全部量乘以比率。');
        q.text=text; q.finalFields=[f2]; q.data={base,pct,answer,operation};
      }
    }
    q.textHtml=R.displayText(q.text); q.explanation=q.steps.map(s=>s.explanation).join('\n');
    return q;
  }
  function buildExam(settings, rng = Math.random) {
    // Basic conversions 4, contextual ratios 2, applications 3, advanced application 1.
    const types=['mode1','mode1','mode2','mode3','mode4','mode4','mode5','mode5','mode5','mode6'];
    const questions=[];
    types.forEach(type=>{
      let q; for(let tries=0;tries<12;tries++) { q=generate(type,settings,rng); if(!questions.some(old=>old.text===q.text)) break; }
      questions.push(q);
    });
    for(let i=questions.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [questions[i],questions[j]]=[questions[j],questions[i]]; }
    return questions;
  }
  function correct(raw, field) {
    if(field.type==='decision') return String(raw)===field.expected;
    if(field.fractionOnly && !/^\d+\/\d+$/.test(String(raw).trim())) return false;
    let value=String(raw).trim();
    if(field.discount && /^\d+$/.test(value) && Number(value)>10) value=String(Number(value)/10);
    const expected=typeof field.expected==='object'?field.expected:R.parse(String(field.expected));
    return !!expected && R.correct(value,{...field,expected});
  }
  const api={...R,categories,defaultType:'mode1',generate,buildExam,correct};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else { api.settings=()=>null; root.PaperQuestions=api; }
})(typeof window!=='undefined'?window:globalThis);
