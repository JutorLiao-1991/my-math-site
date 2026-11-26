/* 鳩特老師的互動教學網站・答對音效「叮咚！」
 * 高音 E6「叮」接 C6「咚」，每個音加一點高八度泛音讓聲音更清脆，像鐘聲一樣自然衰減（與因式分解同一個聲音）。
 * 用法：JutorDing(已建立的 AudioContext)；不給就自己建立一個。
 * 答錯：JutorDing.wrong(AudioContext)，低沉短促的「噗」，提醒但不刺耳。
 */
(function () {
  'use strict';
  let own = null;
  window.JutorDing = function (ctx) {
    try {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ctx = own = own || new C(); }
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime, master = ctx.createGain();
      master.gain.value = 0.9; master.connect(ctx.destination);
      const bell = (freq, start, length, volume) => {
        [[1, volume], [2, volume * 0.28], [3, volume * 0.08]].forEach(([mult, vol]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(freq * mult, start);
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, start + length / mult);
          o.connect(g); g.connect(master);
          o.start(start); o.stop(start + length / mult + 0.02);
        });
      };
      bell(1318.5, now, 0.55, 0.22);       // 叮
      bell(1046.5, now + 0.16, 0.85, 0.2); // 咚
    } catch (e) { /* 音效是加分項，失敗就安靜 */ }
  };
  window.JutorDing.wrong = function (ctx) {
    try {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ctx = own = own || new C(); }
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(240, now);
      o.frequency.linearRampToValueAtTime(150, now + 0.18);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.26);
    } catch (e) { /* 音效是加分項，失敗就安靜 */ }
  };
})();
