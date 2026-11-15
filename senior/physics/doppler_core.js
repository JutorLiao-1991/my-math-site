/* 都卜勒效應（定性教學用）的物理模型：無 DOM，可在 Node 中測試。
   介質（空氣）靜止；v 為波速，f 為聲源發聲頻率；速度皆取「大小」，方向另外指定。 */
(function (root) {
  'use strict';
  const finite = (...xs) => xs.every(Number.isFinite);

  // 聲源移動、觀察者靜止：前方波長變短、後方變長；波速（相對觀察者）不變。
  function sourceMoving({ f, v, vs }) {
    if (!finite(f, v, vs) || f <= 0 || v <= 0 || vs < 0 || vs >= v) throw new RangeError('Invalid source-moving input');
    const at = lambda => ({ lambda, speed: v, freq: v / lambda });
    return { rest: at(v / f), ahead: at((v - vs) / f), behind: at((v + vs) / f) };
  }

  // 觀察者移動、聲源靜止：波長不變；波相對觀察者的速度變成 v ± vo。
  function observerMoving({ f, v, vo, toward }) {
    if (!finite(f, v, vo) || f <= 0 || v <= 0 || vo < 0 || vo >= v) throw new RangeError('Invalid observer-moving input');
    const lambda = v / f, speed = toward ? v + vo : v - vo;
    return { rest: { lambda, speed: v, freq: f }, moving: { lambda, speed, freq: speed / lambda } };
  }

  // 與靜止時比較的定性判讀
  function compare(value, reference, eps = 1e-6) {
    if (Math.abs(value - reference) <= eps * Math.max(1, Math.abs(reference))) return 'same';
    return value > reference ? 'up' : 'down';
  }

  // 一維直線上的波前：在 te 時刻、xe 位置發出，t 時刻半徑 v(t - te)。
  // 回傳在 (t0, t1] 之間抵達位置函式 xo(t) 的波前數（以邊界跨越判斷，適合逐格動畫）。
  function arrivals(fronts, v, xo, t0, t1) {
    let n = 0;
    for (const fr of fronts) {
      const g0 = v * (t0 - fr.te) - Math.abs(xo(t0) - fr.xe), g1 = v * (t1 - fr.te) - Math.abs(xo(t1) - fr.xe);
      if (t1 > fr.te && g0 < 0 && g1 >= 0) n++;
    }
    return n;
  }

  const api = { sourceMoving, observerMoving, compare, arrivals };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DopplerCore = api;
})(typeof window === 'undefined' ? globalThis : window);
