/* 鳩特老師的互動教學網站・全站答對／答錯音效（取自「質數大挑戰」）
 * 答對：E5 → C5 的「叮—咚」；答錯：鋸齒波由 300Hz 滑到 150Hz 的「噗～」。
 * 用法：JutorSound.play('correct' | 'wrong')，或 JutorSound.correct()／JutorSound.wrong()。
 * 第一次點擊或按鍵時就先把聲音喚醒，iPad／iPhone 才不會第一聲沒聲音。
 */
(function () {
  'use strict';
  if (window.JutorSound) return;
  let ctx = null;
  function getCtx() {
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      if (!ctx) ctx = new C();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  const unlock = () => { getCtx(); ['pointerdown', 'touchend', 'keydown'].forEach(t => removeEventListener(t, unlock, true)); };
  ['pointerdown', 'touchend', 'keydown'].forEach(t => addEventListener(t, unlock, { capture: true, passive: true }));

  function tone(build) {
    const c = getCtx(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), now = c.currentTime;
      o.connect(g); g.connect(c.destination);
      build(o, g, now);
    } catch (e) { /* 音效是加分項，失敗就安靜 */ }
  }
  function correct() {
    tone((o, g, now) => {
      o.type = 'sine';
      o.frequency.setValueAtTime(659.25, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.4, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.1, now + 0.2);
      o.frequency.setValueAtTime(523.25, now + 0.2);
      g.gain.linearRampToValueAtTime(0.4, now + 0.22);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      o.start(now); o.stop(now + 0.8);
    });
  }
  function wrong() {
    tone((o, g, now) => {
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, now);
      o.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.3, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o.start(now); o.stop(now + 0.3);
    });
  }
  window.JutorSound = { correct, wrong, play(type) { if (type === 'correct') correct(); else if (type === 'wrong') wrong(); } };
})();
