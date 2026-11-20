/* 月相觀測（國三）的計算核心（無 DOM，可在 Node 中測試）。角度單位：度；時間單位：小時（當地太陽時）。
   簡化模型（國中課本）：太陽與月亮都在天球赤道上（春分、秋分時的情形），不計月球軌道 5° 傾斜與大氣折射；
   太陽光視為平行光，日、月距離與大小不按比例。
   太空俯視座標：從地球北極上空往下看，X 指向太陽（右）、Y 指向上方、Z 指向北極（朝向觀看者）。
   地球與月亮都逆時針轉（自轉、公轉）。觀測者所在經線指向太陽的時刻為正午 12 點。 */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180, D = x => x * RAD, R = x => x / RAD;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mod = (x, m) => ((x % m) + m) % m;
  const SYNODIC = 29.53;          // 朔望月（天）
  const LAT = 24;                 // 台灣，北緯 24°

  // 四個課本位置：月亮與太陽的夾角（由地球看，向東量；俯視圖中由太陽方向逆時針量）
  const PHASES = [
    { key: 'new', day: '初一', name: '朔（新月）', short: '朔', elong: 0 },
    { key: 'first', day: '初七', name: '上弦月', short: '上弦', elong: 90 },
    { key: 'full', day: '十五', name: '望（滿月）', short: '望', elong: 180 },
    { key: 'last', day: '廿二', name: '下弦月', short: '下弦', elong: 270 }
  ];
  const TIMES = [0, 6, 12, 18];
  const TEXTBOOK_DAY = { 0: '初一', 90: '初七、初八', 180: '十五、十六', 270: '廿二、廿三' };

  const sunHA = t => mod(15 * (t - 12) + 180, 360) - 180;              // 太陽時角（向西為正）
  const moonHA = (t, e) => mod(15 * (t - 12) - e + 180, 360) - 180;    // 月亮比太陽偏東 e 度
  // 天球赤道上、時角 H 的天體在當地的 (東, 北, 天頂) 單位向量
  function localVec(H, lat = LAT) { const c = Math.cos(D(H)), s = Math.sin(D(H)); return [-s, -Math.sin(D(lat)) * c, Math.cos(D(lat)) * c]; }
  function altAz(v) { const alt = R(Math.asin(clamp(v[2], -1, 1))); let az = R(Math.atan2(v[0], v[1])); if (az < 0) az += 360; return { alt, az }; }
  const body = (H, lat) => { const vec = localVec(H, lat); return { H, vec, ...altAz(vec) }; };
  const sun = (t, lat = LAT) => body(sunHA(t), lat);
  const moon = (t, e, lat = LAT) => body(moonHA(t, e), lat);
  // 觀測者在俯視圖中的位置角（由太陽方向逆時針量）：12 點朝向太陽
  const observerAngle = t => mod(15 * (t - 12), 360);

  const sepAngle = e => { const x = mod(e, 360); return Math.min(x, 360 - x); };   // 日月角距
  const illum = e => (1 - Math.cos(D(e))) / 2;                                    // 被照亮的比例（從地球看）
  const ageDays = e => mod(e, 360) / 360 * SYNODIC;
  const elongFromAge = a => mod(a / SYNODIC * 360, 360);
  function phaseName(e) {
    const x = mod(e, 360), near = c => Math.abs(x - c) <= 8;
    if (x <= 8 || x >= 352) return '朔（新月）';
    if (near(90)) return '上弦月'; if (near(180)) return '望（滿月）'; if (near(270)) return '下弦月';
    return x < 90 ? '眉月' : x < 180 ? '盈凸月' : x < 270 ? '虧凸月' : '殘月';
  }
  const DIGIT = '一二三四五六七八九十';
  function dayName(n) {
    n = clamp(Math.round(n), 1, 30);
    if (n <= 10) return '初' + DIGIT[n - 1];
    if (n < 20) return '十' + DIGIT[n - 11];
    if (n === 20) return '二十';
    if (n < 30) return '廿' + DIGIT[n - 21];
    return '三十';
  }
  // 農曆日期說明：課本四個位置用課本說法，其他位置用月齡估計
  function lunarText(e) {
    const x = mod(e, 360);
    if (TEXTBOOK_DAY[x] !== undefined) return `農曆${TEXTBOOK_DAY[x]}`;
    return `約農曆${dayName(1 + ageDays(x))}`;
  }

  // 上中天、月出、月落時刻（天體在天球赤道上：地平面上剛好 12 小時）
  const transitTime = e => mod(12 + mod(e, 360) / 15, 24);
  const riseTime = e => mod(transitTime(e) - 6, 24);
  const setTime = e => mod(transitTime(e) + 6, 24);
  function clock(t) {
    let m = Math.round(mod(t, 24) * 60); if (m === 1440) m = 0;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  const hourLabel = t => `${Math.round(mod(t, 24))} 點`;

  const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  const dirName = az => DIRS[Math.round(mod(az, 360) / 45) % 8];

  const HORIZON_EPS = 0.5;  // 中心在地平線 ±0.5° 內視為「正在升起／落下」
  // 月亮此刻的位置描述
  function describe(t, e, lat = LAT) {
    const m = moon(t, e, lat), dir = dirName(m.az);
    let state, text, short;
    if (Math.abs(m.alt) <= HORIZON_EPS) {
      state = m.az < 180 ? 'rising' : 'setting';
      text = state === 'rising' ? `${dir}方地平線，正在升起` : `${dir}方地平線，正要落下`;
      short = state === 'rising' ? `${dir}方升起` : `${dir}方落下`;
    } else if (m.alt > 0) {
      state = 'up'; const h = m.alt >= 55 ? '高空' : m.alt >= 25 ? '天空' : '低空';
      text = `${dir}方${h}，仰角 ${Math.round(m.alt)}°`; short = `${dir}方${h}`;
    } else { state = 'down'; text = `地平線下 ${Math.round(-m.alt)}°（看不到）`; short = '地平線下'; }
    const dark = illum(e) < 0.03;                     // 朔：亮面背對地球
    const visible = state !== 'down' && !dark;
    if (dark && state !== 'down') { text += '，但看不到'; short += '（看不到）'; }
    return { ...m, state, text, short, visible, dark, dir };
  }

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
  // 面向月亮、頭朝上時，亮的一側在月面的哪一邊（亮面永遠指向太陽）
  function brightSide(t, e, lat = LAT) {
    const m = moon(t, e, lat).vec, s = sun(t, lat).vec, k = dot(s, m);
    const b = unit(s.map((x, i) => x - k * m[i]));
    const r = unit(cross(m, [0, 0, 1])), u = cross(r, m);
    const ang = mod(R(Math.atan2(dot(b, u), dot(b, r))), 360);
    const side = ['右', '右上', '上', '左上', '左', '左下', '下', '右下'][Math.round(ang / 45) % 8];
    const compass = dirName(R(Math.atan2(b[0], b[1])));
    return { angle: ang, side, compass, vec: b };
  }

  // 「鳩特講解」表格：四個位置 × 四個時刻，再加月出、月落
  function table() {
    return PHASES.map(p => ({ phase: p, cells: TIMES.map(t => describe(t, p.elong).short), rise: clock(riseTime(p.elong)), set: clock(setTime(p.elong)) }));
  }

  const api = { RAD, LAT, SYNODIC, PHASES, TIMES, mod, sunHA, moonHA, localVec, altAz, sun, moon, observerAngle, sepAngle, illum, ageDays, elongFromAge, phaseName, dayName, lunarText, transitTime, riseTime, setTime, clock, hourLabel, dirName, describe, brightSide, table, cross, dot, unit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MoonCore = api;
})(typeof window === 'undefined' ? globalThis : window);
