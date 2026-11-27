/* 鳩特老師的互動教學網站・題幹懸停
 * 分步作答頁引入：<script src="../stem_pin.js" defer></script>（可用 data-stem="#選擇器" 指定題幹）
 * 往下作答時題幹會停在作答區最上方，不會被推到看不見的地方；題幹太長時限制高度、可在題幹內自己捲動。
 * 手機（窄或矮的畫面）停住時會縮小成精簡版，少占一點作答空間；捲回題目處就恢復原本大小。
 */
(function () {
  'use strict';
  if (window.JutorStem) return;
  const doc = document;
  const me = doc.currentScript;
  const CANDIDATES = ['#question-text', '#question-prompt', '#problem'];
  const PHONE = window.matchMedia('(max-width: 699px), (max-height: 559px)');
  const MAX_RATIO = 0.4;   /* 平板、電腦：題幹最多占可視作答區的 40% */
  const PHONE_RATIO = 0.3; /* 手機：縮小後最多占 30% */
  const PHONE_ZOOM = 0.8;  /* 手機停住時的縮小比例 */
  const GAP = 8;        /* 題幹離作答區上緣的距離 */

  /* 題幹外面包一層方角、與作答紙同色的底，捲上來的步驟就不會從題目卡的圓角或兩側透出來 */
  const css = `
.stem-pin-wrap{position:sticky;top:var(--stem-top,0px);z-index:30;align-self:stretch;display:flex;flex-direction:column;align-items:var(--stem-align,stretch);margin-inline:-8px;padding-inline:8px;background:var(--stem-bg,#fff);box-shadow:0 0 0 8px var(--stem-bg,#fff);max-height:var(--stem-max,none);overflow-y:auto;transition:box-shadow .2s}
.stem-pin-wrap.is-stuck{box-shadow:0 0 0 8px var(--stem-bg,#fff),0 16px 14px -12px rgba(15,23,42,.28)}
.stem-pin-wrap > *{flex:none;max-width:100%}
.stem-pin-wrap > .question{display:flow-root}
.stem-pin-wrap .q-figure{float:right;width:min(240px,40%)!important;margin:2px 0 6px 16px}
.stem-pin-wrap.is-phone .q-figure{width:min(200px,42%)!important;margin:2px 0 4px 10px}
.stem-pin-wrap.is-compact > *{zoom:var(--stem-zoom,.72)}
.stem-clip{overflow:clip!important}
@supports not (overflow:clip){.stem-clip{overflow:visible!important}}
@media print{.stem-pin-wrap{position:static;max-height:none;box-shadow:none;overflow:visible}}`;

  let stem = null, wrap = null, sentinel = null, scroller = null, clipped = [], on = false, raf = 0;

  const isWin = el => !el || el === doc.documentElement || el === doc.body;
  const target = () => (isWin(scroller) ? window : scroller);

  function findStem() {
    const sel = me && me.dataset.stem;
    for (const s of (sel ? [sel] : CANDIDATES)) { const el = doc.querySelector(s); if (el) return el; }
    return null;
  }
  /* 往上找真正會捲動的容器；途中 overflow:hidden 的外框會讓 sticky 失效，改成 clip（外觀一樣） */
  function findScroller() {
    let e = wrap.parentElement;
    while (e && e !== doc.body && e !== doc.documentElement) {
      const cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowY)) return e;
      if (cs.overflowY === 'hidden' || cs.overflowX === 'hidden') { e.classList.add('stem-clip'); clipped.push(e); }
      e = e.parentElement;
    }
    return null; /* 整個視窗捲動 */
  }
  const opaque = bg => { const m = bg.match(/rgba?\(([^)]+)\)/); if (!m) return false; const v = m[1].split(',').map(Number); return v.length < 4 || v[3] > 0.9; };
  function paperBg(el) {
    for (let e = el; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (opaque(bg)) return bg; }
    return '#fff';
  }
  /* 視窗捲動時，題幹要停在固定的導覽列下方 */
  function headerBottom() {
    let b = 0;
    doc.querySelectorAll('body > header, body > nav, .nav-bar, header.nav, .top-bar').forEach(h => {
      const p = getComputedStyle(h).position;
      if ((p === 'sticky' || p === 'fixed') && h.offsetParent !== null) { const r = h.getBoundingClientRect(); if (r.top <= 1) b = Math.max(b, r.bottom); }
    });
    return Math.round(b);
  }
  const viewHeight = () => (isWin(scroller) ? innerHeight - headerBottom() : scroller.clientHeight);

  function measure() {
    if (!on) return;
    /* 原本父層是置中排列（例如分數的題目卡）就照樣置中；作答區顯示出來後才量得到 */
    const pcs = getComputedStyle(wrap.parentElement);
    const centered = /flex/.test(pcs.display) && /column/.test(pcs.flexDirection) && /center/.test(pcs.alignItems);
    wrap.style.setProperty('--stem-align', centered ? 'center' : 'stretch');
    /* sticky 的 top 從捲動框「扣掉 padding」後算起，所以減掉 padding，讓題幹貼齊捲動框上緣 */
    const pad = isWin(scroller) ? 0 : (parseFloat(getComputedStyle(scroller).paddingTop) || 0);
    const vis = isWin(scroller) ? headerBottom() + GAP : GAP;
    wrap.style.setProperty('--stem-top', (vis - pad) + 'px');
    const phone = PHONE.matches;
    wrap.classList.toggle('is-phone', phone);
    wrap.style.setProperty('--stem-zoom', PHONE_ZOOM);
    wrap.style.setProperty('--stem-max', Math.round(viewHeight() * (phone ? PHONE_RATIO : MAX_RATIO)) + 'px');
    wrap.dataset.vis = vis;
    checkStuck();
  }
  /* 附圖原本排在題目文字後面；懸停時把它移到最前面並靠右浮動，文字繞在左邊，題幹就不會太高 */
  function figureFirst() {
    if (!on) return;
    const f = stem.querySelector(':scope > .q-figure');
    if (f && stem.firstChild !== f) stem.insertBefore(f, stem.firstChild);
  }
  function checkStuck() {
    if (!on) return;
    const stuck = wrap.offsetHeight > 0 && sentinel.getBoundingClientRect().top < wrap.getBoundingClientRect().top - 1;
    wrap.classList.toggle('is-stuck', stuck);
    compact(stuck && PHONE.matches);
    /* 用 scrollIntoView 把新步驟帶進畫面時，不要停在題幹後面 */
    (isWin(scroller) ? doc.documentElement : scroller).style.scrollPaddingTop = Math.round(+wrap.dataset.vis + wrap.offsetHeight + 16) + 'px';
  }
  /* 手機縮小：縮掉的高度用下方留白補回去，底下的步驟就不會跳動，捲回去也不會來回閃 */
  function compact(want) {
    if (!want) { if (wrap.classList.contains('is-compact')) { wrap.classList.remove('is-compact'); wrap.style.marginBottom = ''; } return; }
    wrap.classList.remove('is-compact'); wrap.style.marginBottom = '';
    const full = wrap.offsetHeight;
    wrap.classList.add('is-compact');
    wrap.style.marginBottom = Math.max(0, full - wrap.offsetHeight) + 'px';
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; checkStuck(); }); };

  /* 焦點跳到被題幹蓋住的輸入格時，捲一點讓它露出來 */
  function onFocus(e) {
    if (!on || !wrap.classList.contains('is-stuck')) return;
    const t = e.target; if (!t || wrap.contains(t) || !t.getBoundingClientRect) return;
    const r = t.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    if (r.height && r.bottom > wr.top && r.top < wr.bottom + 8) {
      const d = r.top - wr.bottom - 16;
      if (isWin(scroller)) window.scrollBy(0, d); else scroller.scrollTop += d;
    }
  }

  function enable() {
    if (on || !stem || !stem.parentElement) return;
    on = true;
    const parent = stem.parentElement;
    if (!wrap) { wrap = doc.createElement('div'); wrap.className = 'stem-pin-wrap'; }
    if (!sentinel) { sentinel = doc.createElement('div'); sentinel.setAttribute('aria-hidden', 'true'); sentinel.style.cssText = 'height:0;margin:0;padding:0;border:0;flex:none'; }
    parent.insertBefore(sentinel, stem); parent.insertBefore(wrap, stem); wrap.appendChild(stem);
    wrap.style.setProperty('--stem-bg', paperBg(parent));
    figureFirst();
    scroller = findScroller();
    target().addEventListener('scroll', onScroll, { passive: true });
    measure();
  }
  function disable() {
    if (!on) return;
    on = false;
    target().removeEventListener('scroll', onScroll);
    (isWin(scroller) ? doc.documentElement : scroller).style.scrollPaddingTop = '';
    clipped.forEach(el => el.classList.remove('stem-clip')); clipped = [];
    compact(false); wrap.classList.remove('is-stuck', 'is-phone');
    wrap.before(stem); wrap.remove(); sentinel.remove();
  }
  function sync() { disable(); enable(); }

  function init() {
    stem = findStem(); if (!stem) return;
    const st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    sync();
    if (PHONE.addEventListener) PHONE.addEventListener('change', sync); else if (PHONE.addListener) PHONE.addListener(sync);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (on) sync(); }, 150); });
    if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(stem);
    if (window.MutationObserver) new MutationObserver(figureFirst).observe(stem, { childList: true });
    doc.addEventListener('focusin', onFocus);
  }

  window.JutorStem = {
    /* 題幹懸停時，它在視窗中的下緣（給自己算捲動位置的頁面用）；沒懸停時回傳 0 */
    bottom() { return on && wrap.classList.contains('is-stuck') ? wrap.getBoundingClientRect().bottom + 8 : 0; },
    refresh() { measure(); }
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
