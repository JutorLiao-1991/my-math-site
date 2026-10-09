(function () {
  'use strict';
  const menus = {
    elementary: { label: '國小區・選擇年級', groups: [{ key: 'lower', label: '低年級', grades: [1, 2] }, { key: 'middle', label: '中年級', grades: [3, 4] }, { key: 'upper', label: '高年級', grades: [5, 6] }] },
    junior: { label: '國中區・選擇年級', groups: [{ key: '7', label: '國一（國七）', grades: [7] }, { key: '8', label: '國二（國八）', grades: [8] }, { key: '9', label: '國三（國九）', grades: [9] }] },
    senior: { label: '高中區・選擇年級', groups: [{ key: '10', label: '高一', grades: [10] }, { key: '11', label: '高二', grades: [11] }, { key: '12', label: '高三', grades: [12] }] }
  };
  const $ = id => document.getElementById(id);
  let selected = { category: 'all', grade: 'all' };
  if (typeof siteConfig !== 'undefined') $('last-updated').textContent = siteConfig.lastUpdated ? `最近更新：${siteConfig.lastUpdated}` : '';
  const lessons = typeof lessonData === 'undefined' ? [] : lessonData;
  lessons.forEach(lesson => {
    const a = document.createElement('a'); a.href = lesson.url; a.className = 'card'; a.dataset.category = lesson.category;
    a.innerHTML = `<div class="card-body"><div class="tags"><span class="tag ${lesson.tagClass}">${lesson.tagName}</span></div><h3 class="card-title">${lesson.title}</h3><p class="card-desc">${lesson.desc}</p><div class="card-footer">開始互動 <span class="arrow">→</span></div></div>`;
    $('card-container').append(a);
  });
  function apply() {
    const menu = menus[selected.category], group = menu && menu.groups.find(g => g.key === selected.grade);
    let count = 0;
    [...$('card-container').children].forEach((card, i) => {
      const lesson = lessons[i], visible = (selected.category === 'all' || lesson.category === selected.category) && (!group || (lesson.grades || []).some(grade => group.grades.includes(grade)));
      card.classList.toggle('hidden', !visible); if (visible) count++;
    });
    $('empty-state').hidden = count > 0;
    document.querySelectorAll('.filter-btn').forEach(button => {
      const active = button.dataset.category === selected.category; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
      if (menus[button.dataset.category]) button.setAttribute('aria-expanded', String(active));
    });
    $('grade-menu').hidden = !menu;
    $('grade-nav').replaceChildren();
    if (menu) {
      $('grade-menu-label').textContent = menu.label;
      [{ key: 'all', label: '全部年級' }, ...menu.groups].forEach(g => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'grade-btn'; b.textContent = g.label; b.dataset.grade = g.key;
        b.classList.toggle('active', g.key === selected.grade); b.setAttribute('aria-pressed', String(g.key === selected.grade));
        b.addEventListener('click', () => { selected.grade = g.key; apply(); $('grade-nav').querySelector(`[data-grade="${g.key}"]`).focus(); }); $('grade-nav').append(b);
      });
    }
    try { sessionStorage.setItem('jutor-lesson-filter', JSON.stringify(selected)); } catch (_) { /* Storage is optional. */ }
  }
  document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => { selected = { category: button.dataset.category, grade: 'all' }; apply(); }));
  try {
    const saved = JSON.parse(sessionStorage.getItem('jutor-lesson-filter'));
    if (saved && ['all', 'language', ...Object.keys(menus)].includes(saved.category)) {
      selected.category = saved.category;
      if (saved.grade === 'all' || (menus[saved.category] && menus[saved.category].groups.some(g => g.key === saved.grade))) selected.grade = saved.grade;
    }
  } catch (_) { /* Start at all when saved state is unavailable. */ }
  apply();
})();
