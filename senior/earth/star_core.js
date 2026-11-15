/* 天球與恆星星軌的計算核心（無 DOM，可在 Node 中測試）。角度單位：度。
   天球座標以 (Q, E, P) 為右手座標軸：P＝天北極，Q＝天球赤道上時角 0 的點（子午線），E＝正東。
   星星的時角 H 隨時間增加（向西轉）。緯度 φ：北為正、南為負。 */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180, D = x => x * RAD, R = x => x / RAD;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 恆星在天球座標中的單位向量
  function starVec(dec, H) { const c = Math.cos(D(dec)); return [c * Math.cos(D(H)), -c * Math.sin(D(H)), Math.sin(D(dec))]; }
  // 當地天頂、北、東方向（以天球座標表示）
  function localAxes(lat) { const s = Math.sin(D(lat)), c = Math.cos(D(lat)); return { U: [c, 0, s], N: [-s, 0, c], E: [0, 1, 0] }; }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  // 地平座標：仰角 alt、方位角 az（由北向東量，0～360）
  function horizon(dec, H, lat) {
    const v = starVec(dec, H), { U, N, E } = localAxes(lat);
    const alt = R(Math.asin(clamp(dot(v, U), -1, 1)));
    let az = R(Math.atan2(dot(v, E), dot(v, N))); if (az < 0) az += 360;
    return { alt, az };
  }

  // 恆星分類：拱極星（永不落下）、出沒星、恆隱星（永不升起）
  function classify(dec, lat) {
    const maxAlt = 90 - Math.abs(lat - dec), minAlt = Math.abs(lat + dec) - 90, eps = 1e-9;
    if (Math.abs(minAlt) <= eps && Math.abs(maxAlt) <= eps) return 'horizon';
    if (minAlt >= -eps) return 'circumpolar';   // 下中天剛好擦過地平線也算不會落下
    if (maxAlt <= eps) return 'hidden';
    return 'rise-set';
  }
  // 是否剛好落在拱極星／恆隱星的界線上
  const onBoundary = (dec, lat) => { const a = Math.abs(lat + dec) - 90, b = 90 - Math.abs(lat - dec); return (Math.abs(a) < 1e-9 || Math.abs(b) < 1e-9) && Math.abs(lat) !== 90; };
  // 一天之中在地平面上的時間比例
  function fractionUp(dec, lat) {
    const c = classify(dec, lat); if (c === 'circumpolar') return 1; if (c === 'hidden') return 0; if (c === 'horizon') return 0.5;
    const cosH0 = clamp(-Math.tan(D(lat)) * Math.tan(D(dec)), -1, 1); return R(Math.acos(cosH0)) / 180;
  }
  // 升起時的時角（−H0）；拱極或恆隱回傳 null
  function riseHourAngle(dec, lat) { const c = classify(dec, lat); if (c !== 'rise-set') return null; return -R(Math.acos(clamp(-Math.tan(D(lat)) * Math.tan(D(dec)), -1, 1))); }

  const poleAltitude = lat => lat;                  // 北極星（天北極）仰角＝緯度
  const trailAngle = lat => 90 - Math.abs(lat);      // 星軌與地平面的夾角
  // 一天之內曾出現在地平面上的赤緯範圍與占全天球比例
  function visibleRange(lat) {
    const lo = lat >= 0 ? lat - 90 : -90, hi = lat >= 0 ? 90 : lat + 90;
    return { lo, hi, fraction: (Math.sin(D(hi)) - Math.sin(D(lo))) / 2 };
  }
  // 拱極星：與（地平面上方那個）天極的張角小於 |φ|
  function circumpolarCap(lat) { return { pole: lat >= 0 ? 'north' : 'south', angle: Math.abs(lat) }; }

  const fmt = x => { const r = Math.round(x * 10) / 10; return String(Object.is(r, -0) ? 0 : r); };
  const latName = lat => lat === 0 ? '赤道' : lat === 90 ? '北極點' : lat === -90 ? '南極點' : `${lat > 0 ? '北' : '南'}緯 ${fmt(Math.abs(lat))}°`;

  // 講義「鳩特講解」四格（再加旋轉方向）的標準答案
  function worksheet(lat) {
    const a = Math.abs(lat), v = visibleRange(lat), pct = Math.round(v.fraction * 1000) / 10, sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '') + fmt(Math.abs(x));
    const pole = lat > 0 ? `${fmt(lat)}°` : lat === 0 ? '0°（在地平面上）' : `看不到（在地平面下 ${fmt(a)}°）`;
    const visible = a === 90 ? `只看得到${lat > 0 ? '北' : '南'}半天球（50%）` : a === 0 ? '整個天球都看得到（100%）' : `赤緯 ${sgn(v.lo)}° ～ ${sgn(v.hi)}°（約 ${pct}%）`;
    const angle = trailAngle(lat), trail = angle === 0 ? '平行（夾角 0°）' : angle === 90 ? '垂直（夾角 90°）' : `斜交，夾角 ${fmt(angle)}°`;
    const cap = a === 90 ? '整個天空都是' : a === 0 ? '沒有拱極星' : lat > 0 ? `與北極星之張角 < ${fmt(a)}°` : `與自轉軸（天南極）之張角 < ${fmt(a)}°`;
    const turn = lat > 0 ? '繞天北極逆時針轉' : lat < 0 ? '繞天南極順時針轉' : '垂直地面東升西落';
    return [['北極星仰角', pole], ['可見星空', visible], ['星軌與地面', trail], ['拱極星', cap], ['旋轉方向', turn]];
  }

  // 固定亂數產生背景星（同一頁每次看到的星空相同）
  function backgroundStars(n = 220, seed = 7) {
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, out = [];
    for (let i = 0; i < n; i++) out.push({ dec: R(Math.asin(2 * rnd() - 1)), H0: rnd() * 360, mag: rnd() });
    return out;
  }

  const LATS = [[90, '北極'], [30, '北緯 30°'], [25, '台北'], [23.5, '北回歸線'], [0, '赤道'], [-60, '南緯 60°'], [-66.5, '南極圈'], [-90, '南極']];
  // 講義的五顆星（赤緯與起始時角）
  const HANDOUT_STARS = [[80, 40], [60, 75], [0, 150], [-30, 70], [-70, 140]];

  const api = { RAD, onBoundary, starVec, localAxes, dot, horizon, classify, fractionUp, riseHourAngle, poleAltitude, trailAngle, visibleRange, circumpolarCap, worksheet, backgroundStars, latName, fmt, LATS, HANDOUT_STARS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StarCore = api;
})(typeof window === 'undefined' ? globalThis : window);
