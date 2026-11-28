/* 速率（六年級）：選單的四大主題，點一下展開該主題的問法（一次只展開一個） */
(function () {
  'use strict';
  const groups = [...document.querySelectorAll('.topic-group')];
  function open(group, scroll) {
    groups.forEach(g => {
      const on = g === group, btn = g.querySelector('.topic-btn'), panel = g.querySelector('.topic-panel');
      btn.setAttribute('aria-expanded', String(on)); panel.hidden = !on; g.classList.toggle('open', on);
    });
    if (group && scroll) group.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  groups.forEach(g => g.querySelector('.topic-btn').addEventListener('click', () => {
    const expanded = g.querySelector('.topic-btn').getAttribute('aria-expanded') === 'true';
    open(expanded ? null : g, true);
  }));
  /* 打開選單時，自動展開目前正在練習的主題 */
  document.querySelectorAll('[data-open-modes]').forEach(el => el.addEventListener('click', () => {
    const active = document.querySelector('.topic-panel [data-type].active');
    if (active) open(active.closest('.topic-group'), false);
  }));
  /* 記住「含 ※ 題」的勾選（僅限這台裝置） */
  const box = document.getElementById('include-star');
  try { box.checked = localStorage.getItem('rate-grade6-star') === '1'; } catch (e) { /* 無法使用儲存空間時略過 */ }
  box.addEventListener('change', () => { try { localStorage.setItem('rate-grade6-star', box.checked ? '1' : '0'); } catch (e) { /* 略過 */ } });
})();
