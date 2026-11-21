/* 首頁「我的戰鬥紀錄」：讀 battle_log.js 存在這台裝置的紀錄，依最近三天／一週／一個月統計 */
(function () {
  'use strict';
  const dlg = document.getElementById('records-dialog'), openBtn = document.getElementById('open-records');
  if (!dlg || !openBtn || !window.JutorLog) { if (openBtn) openBtn.hidden = true; return; }
  const RANGES = [{ k: 3, label: '最近三天' }, { k: 7, label: '最近一週' }, { k: 30, label: '最近一個月' }];
  let range = 7;
  try { const r = Number(sessionStorage.getItem('jutor-rec-range')); if ([3, 7, 30].includes(r)) range = r; } catch (_) { /* 預設一週 */ }

  const titles = {};
  (typeof lessonData === 'undefined' ? [] : lessonData).forEach(l => { titles[JutorLog.pageKey(l.url)] = l.title; });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const md = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const dur = s => (s >= 60 ? `${Math.floor(s / 60)} 分 ${Math.round(s % 60)} 秒` : `${Math.round(s)} 秒`);
  const nameOf = e => titles[e.p] || e.n || e.p;
  function ago(t) {
    const diff = dayStart(Date.now()) - dayStart(t);
    if (diff <= 0) return `今天 ${hm(t)}`;
    if (diff <= 864e5) return `昨天 ${hm(t)}`;
    return `${md(t)} ${hm(t)}`;
  }

  function render() {
    const from = dayStart(Date.now()) - (range - 1) * 864e5;
    const ev = JutorLog.load().filter(e => e.t >= from);
    const prac = ev.filter(e => e.m === 'p'), exams = ev.filter(e => e.m === 'e');
    const scored = exams.filter(e => e.f > 0);
    const avg = scored.length ? Math.round(scored.reduce((a, e) => a + e.s / e.f, 0) / scored.length * 100) : 0;

    const tabs = RANGES.map(r => `<button type="button" role="tab" class="rec-tab" data-range="${r.k}" aria-selected="${r.k === range}">${r.label}</button>`).join('');
    let body;
    if (!ev.length) {
      body = `<p class="rec-empty">這段時間還沒有戰鬥紀錄。<br>去任何一個單元的「練習模式」或「考試模式」挑戰看看吧！</p>`;
    } else {
      /* 每日長條：藍色＝練習題數、粉紅＝考試場數（以 5 題計，讓考試看得見） */
      const days = [];
      for (let i = 0; i < range; i++) days.push({ t: from + i * 864e5, p: 0, e: 0 });
      ev.forEach(e => { const d = days[Math.floor((dayStart(e.t) - from) / 864e5)]; if (d) d[e.m === 'p' ? 'p' : 'e']++; });
      const max = Math.max(1, ...days.map(d => d.p + d.e * 5));
      const bars = days.map(d => `<div class="rec-bar" title="${md(d.t)}：練習 ${d.p} 題、考試 ${d.e} 場"><i class="be" style="height:${d.e * 5 / max * 100}%"></i><i class="bp" style="height:${d.p / max * 100}%"></i></div>`).join('');
      const axis = range <= 7 ? days.map(d => `<span>${md(d.t)}</span>`).join('') : `<span>${md(days[0].t)}</span><span>${md(days[14].t)}</span><span>今天</span>`;

      /* 各單元 */
      const pages = new Map();
      ev.forEach(e => {
        const p = pages.get(e.p) || { name: nameOf(e), last: 0, pn: 0, pok: 0, en: 0, best: null };
        p.last = Math.max(p.last, e.t);
        if (e.m === 'p') { p.pn++; p.pok += e.ok ? 1 : 0; } else {
          p.en++;
          if (e.f > 0 && (!p.best || e.s / e.f > p.best.s / p.best.f)) p.best = e;
        }
        pages.set(e.p, p);
      });
      const pageItems = [...pages.values()].sort((a, b) => b.last - a.last).map(p => {
        const parts = [];
        if (p.pn) parts.push(`練習 ${p.pn} 題・一次答對 ${pct(p.pok, p.pn)}%`);
        if (p.en) parts.push(`考試 ${p.en} 場`);
        const right = p.best ? `<b>${p.best.s}</b> / ${p.best.f}<small>最佳成績</small>` : `<b>${pct(p.pok, p.pn)}%</b><small>一次答對</small>`;
        return `<li class="rec-item"><span class="t">${esc(p.name)}</span><span class="s">${parts.join('　')}・最後一次 ${ago(p.last)}</span><span class="r">${right}</span></li>`;
      }).join('');

      const examItems = exams.slice().sort((a, b) => b.t - a.t).slice(0, 15).map(e => {
        const sub = [ago(e.t)];
        if (e.q && e.c != null) sub.push(`答對 ${e.c}／${e.q} 題`);
        if (e.d) sub.push(`用時 ${dur(e.d)}`);
        const right = e.f > 0 ? `<b>${e.s}</b> / ${e.f}<small>${pct(e.s, e.f)}%</small>` : `<b>${e.c ?? '-'}</b><small>答對題數</small>`;
        return `<li class="rec-item"><span class="t">${esc(nameOf(e))}${e.l ? `・${esc(e.l)}` : ''}</span><span class="s">${sub.join('・')}</span><span class="r">${right}</span></li>`;
      }).join('');

      body = `<div class="rec-stats">
          <div class="rec-stat"><b>${prac.length}</b><span>練習題數</span></div>
          <div class="rec-stat"><b>${prac.length ? pct(prac.filter(e => e.ok).length, prac.length) + '%' : '－'}</b><span>練習一次答對率</span></div>
          <div class="rec-stat"><b>${exams.length}</b><span>考試場數</span></div>
          <div class="rec-stat"><b>${scored.length ? avg + '%' : '－'}</b><span>考試平均得分率</span></div>
        </div>
        <div class="rec-bars" aria-hidden="true">${bars}</div>
        <div class="rec-axis" aria-hidden="true">${axis}</div>
        <div class="rec-legend"><span><i style="background:#38bdf8"></i>練習題數</span><span><i style="background:#f472b6"></i>考試場數</span></div>
        <h3>各單元戰績</h3><ul class="rec-list">${pageItems}</ul>
        ${examItems ? `<h3>考試紀錄</h3><ul class="rec-list">${examItems}</ul>` : ''}`;
    }

    dlg.innerHTML = `<div class="rec-wrap">
      <div class="rec-head"><h2 id="records-title">⚔ 我的戰鬥紀錄</h2><button type="button" class="rec-close" data-act="close" aria-label="關閉">×</button></div>
      <div class="rec-body"><div class="rec-tabs" role="tablist" aria-label="統計期間">${tabs}</div>${body}</div>
      <div class="rec-foot">
        <button type="button" data-act="export">匯出備份</button>
        <button type="button" data-act="import">匯入備份</button>
        <button type="button" class="danger" data-act="clear">清除紀錄</button>
        <p class="rec-note">紀錄只存在這台裝置的瀏覽器裡（最多保留 60 天）。換手機、換瀏覽器或清除瀏覽資料就會不見，記得偶爾匯出備份。</p>
        <input type="file" id="rec-file" accept="application/json,.json" hidden>
      </div></div>`;
  }

  function exportFile() {
    const data = { app: 'jutor-battle-log', v: 1, exported: new Date().toISOString(), e: JutorLog.load() };
    const d = new Date(), name = `鳩特戰鬥紀錄_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function importFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        if (!data || data.app !== 'jutor-battle-log' || !Array.isArray(data.e)) throw new Error('格式不符');
        const n = JutorLog.merge(data.e); render(); alert(n ? `已匯入 ${n} 筆紀錄。` : '備份裡的紀錄都已經在這台裝置上了。');
      } catch (_) { alert('這個檔案不是鳩特戰鬥紀錄的備份檔。'); }
    };
    fr.readAsText(file);
  }

  dlg.addEventListener('click', e => {
    if (e.target === dlg) { dlg.close(); return; }
    const t = e.target.closest('[data-range],[data-act]'); if (!t) return;
    if (t.dataset.range) { range = Number(t.dataset.range); try { sessionStorage.setItem('jutor-rec-range', range); } catch (_) { /* optional */ } render(); dlg.querySelector(`[data-range="${range}"]`).focus(); return; }
    const act = t.dataset.act;
    if (act === 'close') dlg.close();
    else if (act === 'export') exportFile();
    else if (act === 'import') dlg.querySelector('#rec-file').click();
    else if (act === 'clear' && confirm('確定要清除這台裝置上的全部戰鬥紀錄嗎？清除後無法復原（除非你有匯出備份）。')) { JutorLog.clear(); render(); }
  });
  dlg.addEventListener('change', e => { if (e.target.id === 'rec-file' && e.target.files[0]) { importFile(e.target.files[0]); e.target.value = ''; } });
  openBtn.addEventListener('click', () => { render(); dlg.showModal(); });
})();
