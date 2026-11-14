/* 直線運動與斜拋運動的物理模型（無 DOM，可在 Node 中測試）。
   單位：長度 m、時間 s、速度 m/s、加速度 m/s²。忽略空氣阻力。 */
(function (root) {
  'use strict';
  const rad = d => d * Math.PI / 180;
  const finite = (...xs) => xs.every(Number.isFinite);

  // 等加速度直線運動：x = x0 + v0 t + ½ a t²，v = v0 + a t
  function linear(p, t) {
    const { x0, v0, a } = p;
    if (!finite(x0, v0, a, t) || t < 0) throw new RangeError('Invalid linear motion input');
    const pos = s => x0 + v0 * s + 0.5 * a * s * s;
    const turn = a !== 0 && -v0 / a > 1e-9 ? -v0 / a : null; // 速度變號（折返）的時刻
    const x = pos(t);
    const dist = turn !== null && t > turn
      ? Math.abs(pos(turn) - x0) + Math.abs(x - pos(turn))
      : Math.abs(x - x0);
    return { x, v: v0 + a * t, a, displacement: x - x0, distance: dist, turn, turnX: turn === null ? null : pos(turn) };
  }

  // 斜拋：水平等速、鉛直等加速度（重力加速度 g 向下）
  function summary(p) {
    const { v0, angleDeg, h0, g } = p;
    if (!finite(v0, angleDeg, h0, g) || v0 < 0 || h0 < 0 || g <= 0 || angleDeg < -90 || angleDeg > 90) throw new RangeError('Invalid projectile input');
    const vx = v0 * Math.cos(rad(angleDeg)), vy = v0 * Math.sin(rad(angleDeg));
    const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
    const tPeak = vy > 0 ? vy / g : 0;
    return { vx, vy, T, R: vx * T, H: h0 + (vy > 0 ? vy * vy / (2 * g) : 0), tPeak };
  }

  function projectile(p, t) {
    const s = summary(p);
    if (!Number.isFinite(t) || t < 0) throw new RangeError('Invalid time');
    const vy = s.vy - p.g * t;
    return { x: s.vx * t, y: p.h0 + s.vy * t - 0.5 * p.g * t * t, vx: s.vx, vy, speed: Math.hypot(s.vx, vy) };
  }

  const api = { rad, linear, summary, projectile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotionCore = api;
})(typeof window === 'undefined' ? globalThis : window);
