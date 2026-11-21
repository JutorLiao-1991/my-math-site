/* 天球與太陽軌跡的計算核心（無 DOM，可在 Node 中測試）。角度單位：度。
   沿用 star_core.js 的天球座標：P＝天北極，Q＝天球赤道上時角 0 的點（子午線），E＝正東。
   天上一點的時角 H ＝ 恆星時角 θ − 赤經 α；太陽的時角 H☉ ＝ 15 ×（真太陽時 − 12）。
   黃經 λ 以「二分二至日期」分段線性近似：3/21＝0°、6/21＝90°、9/23＝180°、12/22＝270°。 */
(function (root) {
  'use strict';
  const K = root.StarCore || (typeof require !== 'undefined' ? require('./star_core.js') : null);
  const RAD = Math.PI / 180, D = x => x * RAD, R = x => x / RAD, OBL = 23.44;
  const norm = a => ((a % 360) + 360) % 360;
  const fmt = K.fmt;

  // 平年日序（1 月 1 日＝1）
  const MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function dayOf(m, d) { let n = d; for (let i = 0; i < m - 1; i++) n += MONTH[i]; return n; }
  function dateOf(day) {
    let n = ((Math.round(day) - 1) % 365 + 365) % 365 + 1, m = 0;
    while (n > MONTH[m]) { n -= MONTH[m]; m++; }
    return { m: m + 1, d: n };
  }
  const dateName = day => { const { m, d } = dateOf(day); return `${m} 月 ${d} 日`; };

  const CARDINAL = [[dayOf(3, 21), 0, '春分'], [dayOf(6, 21), 90, '夏至'], [dayOf(9, 23), 180, '秋分'], [dayOf(12, 22), 270, '冬至']];
  const KEYS = CARDINAL.map(([d, l]) => [d, l]).concat([[CARDINAL[0][0] + 365, 360]]);

  // 日序 → 黃經（可為小數日序；一年 365 日循環）
  function lambdaOfDay(day) {
    let d = ((day - 1) % 365 + 365) % 365 + 1; if (d < KEYS[0][0]) d += 365;
    for (let i = 0; i < 4; i++) { const [d0, l0] = KEYS[i], [d1, l1] = KEYS[i + 1]; if (d <= d1) return norm(l0 + (l1 - l0) * (d - d0) / (d1 - d0)); }
    return 0;
  }
  // 黃經 → 日序（1～365.x）
  function dayOfLambda(lam) {
    const l = norm(lam);
    for (let i = 0; i < 4; i++) { const [d0, l0] = KEYS[i], [d1, l1] = KEYS[i + 1]; if (l <= l1) { const d = d0 + (d1 - d0) * (l - l0) / (l1 - l0); return ((d - 1) % 365) + 1; } }
    return KEYS[0][0];
  }

  // 黃道上一點：赤道直角座標（x 指向春分點、z 指向天北極）與赤經赤緯
  const eclVec = lam => [Math.cos(D(lam)), Math.cos(D(OBL)) * Math.sin(D(lam)), Math.sin(D(OBL)) * Math.sin(D(lam))];
  function eclToEq(lam) { const v = eclVec(lam); return { ra: norm(R(Math.atan2(v[1], v[0]))), dec: R(Math.asin(v[2])) }; }
  const declination = lam => R(Math.asin(Math.sin(D(OBL)) * Math.sin(D(lam))));

  // 某緯度、日序、真太陽時的太陽
  function sunAt(lat, day, T) {
    const lam = lambdaOfDay(day), { ra, dec } = eclToEq(lam), H = 15 * (T - 12), h = K.horizon(dec, H, lat);
    return { lam, ra, dec, H, theta: ra + H, alt: h.alt, az: h.az };
  }

  // 正午（上中天）仰角與方向
  function noon(lat, dec) {
    const alt = 90 - Math.abs(lat - dec), dir = Math.abs(lat - dec) < 1e-9 ? '天頂' : lat > dec ? '南' : '北';
    return { alt, dir };
  }
  // 白晝：type＝normal／polar-day（永晝）／polar-night（永夜）
  function daylight(lat, dec) {
    const c = K.classify(dec, lat);
    if (c === 'circumpolar') return { type: 'polar-day', hours: 24, rise: null, set: null, riseAz: null };
    if (c === 'hidden') return { type: 'polar-night', hours: 0, rise: null, set: null, riseAz: null };
    if (c === 'horizon') return { type: 'horizon', hours: 12, rise: null, set: null, riseAz: null };
    const H0 = -K.riseHourAngle(dec, lat);
    return { type: 'normal', hours: 2 * H0 / 15, rise: 12 - H0 / 15, set: 12 + H0 / 15, riseAz: K.horizon(dec, -H0, lat).az };
  }
  function riseDirection(az) {
    if (az === null) return '—';
    const d = Math.round((90 - az) * 10) / 10;
    return Math.abs(d) < 0.05 ? '正東' : d > 0 ? `東偏北 ${fmt(d)}°` : `東偏南 ${fmt(-d)}°`;
  }
  const clock = h => { if (h === null) return '—'; const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

  // 今天的日行軌跡（赤緯圈）與黃道的交點：λ 與 180°−λ；二至時兩點重合（相切）
  function crossings(lam) {
    const l = norm(lam), twin = norm(180 - l), gap = Math.min(Math.abs(twin - l), 360 - Math.abs(twin - l));
    return { today: l, twin, tangent: gap < 0.6, twinDay: dayOfLambda(twin) };
  }
  // 太陽附近的特殊點名稱
  function pointName(lam) {
    const l = norm(lam); for (const [, c, n] of CARDINAL) { const g = Math.min(Math.abs(l - c), 360 - Math.abs(l - c)); if (g < 0.5) return n + '點'; }
    return null;
  }

  // 黃道上的十三個星座（依 IAU 星座界線，太陽進入的日期，約略）
  const ZODIAC = [['雙魚座', 3, 12], ['牡羊座', 4, 19], ['金牛座', 5, 14], ['雙子座', 6, 21], ['巨蟹座', 7, 21], ['獅子座', 8, 11], ['處女座', 9, 17], ['天秤座', 10, 31], ['天蠍座', 11, 23], ['蛇夫座', 11, 30], ['射手座', 12, 18], ['摩羯座', 1, 20], ['水瓶座', 2, 17]]
    .map(([name, m, d]) => ({ name, start: lambdaOfDay(dayOf(m, d)) }));
  ZODIAC.forEach((z, i) => { const nx = ZODIAC[(i + 1) % ZODIAC.length].start; z.end = nx; z.mid = norm(z.start + norm(nx - z.start) / 2); });
  function constellationOf(lam) { const l = norm(lam); return ZODIAC.find(z => norm(l - z.start) < norm(z.end - z.start)).name; }

  const signed = x => (x > 0.05 ? '+' : x < -0.05 ? '−' : '') + fmt(Math.abs(x));

  // 「鳩特講解」六格的標準答案
  function worksheet(lat, day) {
    const lam = lambdaOfDay(day), dec = declination(lam), pn = pointName(lam), cr = crossings(lam), nn = noon(lat, dec), dl = daylight(lat, dec);
    const where = `黃經 ${fmt(lam)}°${pn ? `（${pn}）` : ''}，背景是${constellationOf(lam)}`;
    const path = `赤緯 ${signed(dec)}° 的圈，與天球赤道平行`;
    const cross = cr.tangent ? `只碰一點：相切於${pn || (dec > 0 ? '夏至點' : '冬至點')}` : `兩點：今天的太陽，以及約 ${dateName(cr.twinDay)} 的太陽（兩天走同一條日行軌跡）`;
    const noonText = nn.alt <= 0 ? '正午也在地平面下（永夜）' : nn.dir === '天頂' ? '仰角 90°（正好在天頂）' : `在${nn.dir}方，仰角 ${fmt(nn.alt)}°`;
    const rise = dl.type === 'normal' ? `${riseDirection(dl.riseAz)}升起，晝長約 ${fmt(dl.hours)} 小時` : dl.type === 'polar-day' ? '整天不落（永晝）' : dl.type === 'polar-night' ? '整天不升（永夜）' : '沿地平線繞一圈';
    return [['太陽在黃道上', where], ['太陽赤緯', `${signed(dec)}°`], ['今天的日行軌跡', path], ['與黃道的交點', cross], ['正午太陽', noonText], ['日出與晝長', rise]];
  }

  const LATS = [[90, '北極'], [66.5, '北極圈'], [40, '北緯 40°'], [25, '台北'], [23.5, '北回歸線'], [0, '赤道'], [-23.5, '南回歸線'], [-35, '南緯 35°']];
  const DATES = CARDINAL.map(([d, , n]) => [d, n]);

  const api = { OBL, norm, dayOf, dateOf, dateName, lambdaOfDay, dayOfLambda, eclVec, eclToEq, declination, sunAt, noon, daylight, riseDirection, clock, crossings, pointName, ZODIAC, constellationOf, worksheet, signed, LATS, DATES, CARDINAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SunCore = api;
})(typeof window === 'undefined' ? globalThis : window);
