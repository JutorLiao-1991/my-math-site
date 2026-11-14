/* 水面 3D 視圖：把高度場畫成可旋轉、縮放的立體水面（Canvas 2D，無外部套件）。
   相機：tilt 為視線與鉛直方向的夾角（0° 俯視、90° 側視），yaw 為繞鉛直軸旋轉。 */
(function (root) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const DEFAULT_VIEW = { yaw: 0, tilt: 55, zoom: 1 };

  function camera(view, w, h) {
    const yaw = view.yaw * Math.PI / 180, phi = view.tilt * Math.PI / 180;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(phi), sp = Math.sin(phi), D = 1600, F = D * view.zoom * 0.95;
    return (x, y, z) => {
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;       // 先繞鉛直軸轉
      const up = y1 * cp + z * sp, depth = y1 * sp - z * cp;  // 螢幕上方分量與離相機的深度
      const s = F / (D + depth);
      return { x: w / 2 + x1 * s, y: h / 2 - up * s, depth };
    };
  }

  // 調色盤：32 種高度 × 8 種斜率明暗，預先建好字串避免每格重算
  const PALETTE = [];
  for (let t = 0; t < 32; t++) for (let k = 0; k < 8; k++) {
    const u = t / 31, shade = 0.78 + k * 0.06;
    PALETTE.push(`rgb(${Math.min(255, (24 + 110 * u) * shade) | 0},${Math.min(255, (64 + 130 * u) * shade) | 0},${Math.min(255, (104 + 130 * u) * shade) | 0})`);
  }

  function render(ctx, o) {
    const { nx, ny, x0, x1, y0, y1, zAt, zScale, view, w, h } = o;
    const project = camera(view, w, h), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cols = nx + 1, n = cols * (ny + 1);
    const px = new Float32Array(n), py = new Float32Array(n), zv = new Float32Array(n);
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const k = j * cols + i, wx = x0 + (x1 - x0) * i / nx, wy = y0 + (y1 - y0) * j / ny, z = zAt(wx, wy), p = project(wx - cx, wy - cy, z * zScale);
      zv[k] = z; px[k] = p.x; py[k] = p.y;
    }
    // 由遠到近：找出離相機最遠的邊，沿兩個方向往近處走（高度場不需逐格排序）
    const dA = project(x0 - cx, y0 - cy, 0).depth, dB = project(x1 - cx, y0 - cy, 0).depth, dC = project(x0 - cx, y1 - cy, 0).depth, dD = project(x1 - cx, y1 - cy, 0).depth;
    const farLeft = dA + dC > dB + dD, farBottom = dA + dB > dC + dD;
    ctx.lineWidth = 0;
    for (let jj = 0; jj < ny; jj++) {
      const j = farBottom ? jj : ny - 1 - jj;
      for (let ii = 0; ii < nx; ii++) {
        const i = farLeft ? ii : nx - 1 - ii, k = j * cols + i, k1 = k + 1, k2 = k + cols, k3 = k2 + 1;
        const z = (zv[k] + zv[k1] + zv[k2] + zv[k3]) / 4, slope = clamp((zv[k3] - zv[k]) * 0.8, -0.5, 0.5);
        ctx.fillStyle = PALETTE[((clamp(z, -1, 1) + 1) * 15.5 | 0) * 8 + ((slope + 0.5) * 7 | 0)];
        // 每格向外放大 6%，蓋住相鄰格之間的細縫（不必再描邊）
        const mx = (px[k] + px[k1] + px[k2] + px[k3]) / 4, my = (py[k] + py[k1] + py[k2] + py[k3]) / 4, e = 1.06;
        ctx.beginPath();
        ctx.moveTo(mx + (px[k] - mx) * e, my + (py[k] - my) * e); ctx.lineTo(mx + (px[k1] - mx) * e, my + (py[k1] - my) * e);
        ctx.lineTo(mx + (px[k3] - mx) * e, my + (py[k3] - my) * e); ctx.lineTo(mx + (px[k2] - mx) * e, my + (py[k2] - my) * e);
        ctx.closePath(); ctx.fill();
      }
    }
    return { project: (wx, wy, z) => project(wx - cx, wy - cy, z * zScale) };
  }

  // 立方體（障礙物）：六個面依深度由遠到近繪製
  function drawBox(ctx, project, b, color) {
    const [xa, xb, ya, yb, za, zb] = b, v = [];
    for (const z of [za, zb]) for (const y of [ya, yb]) for (const x of [xa, xb]) v.push(project(x, y, z));
    const faces = [[0, 1, 3, 2, .62], [4, 5, 7, 6, 1], [0, 1, 5, 4, .75], [2, 3, 7, 6, .85], [0, 2, 6, 4, .7], [1, 3, 7, 5, .8]];
    faces.map(f => ({ f, d: f.slice(0, 4).reduce((s, i) => s + v[i].depth, 0) / 4 })).sort((a, c) => c.d - a.d).forEach(({ f }) => {
      ctx.fillStyle = shadeColor(color, f[4]); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); f.slice(0, 4).forEach((i, n) => n ? ctx.lineTo(v[i].x, v[i].y) : ctx.moveTo(v[i].x, v[i].y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }
  function shadeColor(hex, k) { const m = hex.match(/\w\w/g).map(h => parseInt(h, 16)); return `rgb(${m.map(n => Math.round(n * k)).join(',')})`; }

  const api = { clamp, DEFAULT_VIEW, camera, render, drawBox };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WaveSurface = api;
})(typeof window === 'undefined' ? globalThis : window);
