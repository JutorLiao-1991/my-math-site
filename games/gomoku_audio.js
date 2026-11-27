/* 鳩特五子棋音效與配樂：音效以 Web Audio 即時合成；配樂用真實樂器取樣（與鳩特象棋共用 audio/xiangqi 內的取樣）。
   - 落子：棋子敲在榧木棋盤上的清脆「啪」，黑子較沉、白子較亮
   - 骰子：骰子在碗裡滾動、碰撞，越滾越慢，最後「叩」一聲停住；擲出六點時另有「作弊」的鑼聲
   - 配樂：筝分解和弦、笛子慢旋律、弦樂墊底；E 小調五聲音階（E G A B D）、每分鐘 58 拍，安靜、適合思考。
           局面出現殺棋威脅時進入「緊張模式」：加速、筝加花、加入堂鼓與木魚。取樣載入失敗時改用合成音色。
   取樣取自 FluidR3_GM 音色庫（CC BY 3.0），見 audio/xiangqi/README.md。 */
(function () {
  'use strict';
  let ctx = null, master, sfxBus, musicBus, rev, noiseBuf = null;
  let musicOn = false, timer = 0, schedTime = 0, schedBeat = 0, bpm = 58, targetBpm = 58, tense = 0, score = [], evIdx = 0, loopLen = 0;
  const BASE_BPM = 58, TENSE_BPM = 88;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .18;
    master = ctx.createGain(); master.gain.value = .8; master.connect(comp).connect(ctx.destination);
    rev = ctx.createConvolver(); rev.buffer = impulse(2.6, 2.6); const ro = ctx.createGain(); ro.gain.value = .5; rev.connect(ro).connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master); const ss = ctx.createGain(); ss.gain.value = .12; sfxBus.connect(ss).connect(rev);
    newMusicBus(); return ctx;
  }
  function newMusicBus() { musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master); const s = ctx.createGain(); s.gain.value = .42; musicBus.connect(s).connect(rev); }
  function unlock() { const a = init(); if (a && a.state === 'suspended') a.resume().catch(() => {}); return a; }
  function impulse(sec, decay) {
    const r = ctx.sampleRate, n = Math.floor(r * sec), b = ctx.createBuffer(2, n, r);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; lp += (x - lp) * .5; d[i] = lp * Math.pow(1 - i / n, decay) * (i < r * .015 ? i / (r * .015) : 1); } }
    return b;
  }
  function noise() { if (noiseBuf) return noiseBuf; const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }

  /* ---------- 基本元件 ---------- */
  function env(g, t, peak, attack, decay) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay); }
  function noiseHit(t, { freq = 2000, q = 2, vol = .5, decay = .05, type = 'bandpass', out = sfxBus, rate = 1 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noise(); s.playbackRate.value = rate * (.85 + Math.random() * .3);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); env(g, t, vol, .0012, decay);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 1.5); s.stop(t + decay + .06);
  }
  function tone(t, f0, f1, vol, decay, type = 'sine', out = sfxBus, attack = .0015) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(decay, .25));
    env(g, t, vol, attack, decay); o.connect(g).connect(out); o.start(t); o.stop(t + attack + decay + .05);
  }
  /* 棋子落在榧木盤上：黑子（板岩）較沉，白子（蛤殼）較亮 */
  function stone(t, white, vol = 1) {
    const p = (white ? 1.12 : .9) * (.96 + Math.random() * .08); vol *= 1.6;
    noiseHit(t, { freq: 2600 * p, q: 1.6, vol: .5 * vol, decay: .04 });
    noiseHit(t, { freq: 5600 * p, q: 3, vol: .16 * vol, decay: .014 });
    tone(t, 980 * p, 760 * p, .2 * vol, .05);
    tone(t, 1900 * p, 1600 * p, .06 * vol, .028, 'triangle');
    tone(t, 190 * p, 92, .22 * vol, .11);
    noiseHit(t + .045, { freq: 3000 * p, q: 2, vol: .08 * vol, decay: .022 });
  }
  function knock(t, vol = 1, pitch = 1) {
    noiseHit(t, { freq: 3600 * pitch, q: 4, vol: .6 * vol, decay: .02 });
    tone(t, 2650 * pitch, 2500 * pitch, .3 * vol, .04); tone(t, 1320 * pitch, 1240 * pitch, .18 * vol, .055, 'triangle'); tone(t, 200, 100, .22 * vol, .1);
  }
  function luo(t, vol = 1, out = sfxBus) {
    const base = 780, parts = [[1, 1, 1.25], [1.465, .62, 1], [2.09, .55, .85], [2.57, .42, .7], [3.18, .34, .55], [3.9, .26, .45], [4.66, .2, .35], [5.52, .14, .28]];
    for (const [r, a, d] of parts) for (const det of [1, 1.0045]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(base * r * det * .94, t); o.frequency.exponentialRampToValueAtTime(base * r * det * 1.05, t + .13); o.frequency.setValueAtTime(base * r * det * 1.05, t + .14);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(a * .15 * vol, t + .0015); g.gain.exponentialRampToValueAtTime(a * .07 * vol, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + .05);
    }
    noiseHit(t, { freq: 7500, q: .7, vol: .5 * vol, decay: .035, type: 'highpass', out });
    noiseHit(t, { freq: 3200, q: 1.2, vol: .26 * vol, decay: .09, out });
  }
  function bigGong(t, vol = 1) {
    const base = 150;[[1, .3], [1.41, .18], [2.03, .12], [2.71, .08], [3.6, .05]].forEach(([r, v], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(base * r * 1.02, t); o.frequency.exponentialRampToValueAtTime(base * r * .97, t + 2.4);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v * vol, t + .02 + i * .03); g.gain.exponentialRampToValueAtTime(.0001, t + 2.6); o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 2.7);
    });
    noiseHit(t, { freq: 1200, q: .6, vol: .3 * vol, decay: .4 });
  }
  function drum(t, vol = 1, out = sfxBus) { tone(t, 140, 66, .55 * vol, .2, 'sine', out); noiseHit(t, { freq: 500, q: 1, vol: .22 * vol, decay: .06, type: 'lowpass', out }); }
  function muyu(t, vol = .4, out = sfxBus) { tone(t, 880, 810, vol, .06, 'sine', out); noiseHit(t, { freq: 1800, q: 5, vol: vol * .25, decay: .015, out }); }
  function bell(t, f = 2350, vol = .05, out = musicBus) { [[1, 1, 1.6], [2.76, .4, .9], [5.4, .18, .5]].forEach(([r, a, d]) => tone(t, f * r, f * r, vol * a, d, 'sine', out, .002)); }

  /* ---------- 取樣（只載入 E G A B D 五個音） ---------- */
  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], nn = m => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
  const SAMPLE_SET = { flute: [62, 64, 67, 69, 71, 74, 76, 79, 81], koto: [43, 45, 47, 50, 52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76], strings: [50, 52, 55, 57, 59, 62, 64] };
  const bank = {}; let loading = null;
  const base = (() => { try { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : ''; } catch (e) { return ''; } })() + 'audio/xiangqi/';
  function loadSamples() {
    if (loading) return loading; if (!init()) return Promise.reject();
    loading = Promise.all(Object.entries(SAMPLE_SET).flatMap(([inst, list]) => list.map(m => fetch(base + inst + '/' + nn(m) + '.mp3').then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(buf => new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej))).then(ab => { (bank[inst] = bank[inst] || {})[m] = ab; }))))
      .then(() => true).catch(() => { loading = null; return false; });
    return loading;
  }
  function samp(inst, m, t, { vol = .3, dur = 2, attack = .012, release = .35, out = musicBus } = {}) {
    const set = bank[inst]; if (!set) return false;
    let key = m; if (!set[key]) { const ks = Object.keys(set).map(Number); key = ks.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a); }
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = set[key]; src.playbackRate.value = Math.pow(2, (m - key) / 12);
    const end = Math.min(t + dur, t + src.buffer.duration / src.playbackRate.value);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.setValueAtTime(vol, Math.max(t + attack, end - release)); g.gain.linearRampToValueAtTime(.0001, end);
    src.connect(g).connect(out); src.start(t); src.stop(end + .05); return true;
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  /* 取樣載入失敗時的備用音色：筝彈撥與弦樂墊 */
  function ruan(t, f, vol = .14) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = .25;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(500, t + .25); env(g, t, vol, .004, .9);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(musicBus); [o, o2].forEach(x => { x.start(t); x.stop(t + 1); });
  }
  function pad(t, freqs, dur, vol) {
    for (const f of freqs) { const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 820; lp.Q.value = .3;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.5, dur * .3)); g.gain.setValueAtTime(vol, t + dur * .8); g.gain.linearRampToValueAtTime(.0001, t + dur + .3);
      o.connect(lp).connect(g).connect(musicBus); o.start(t); o.stop(t + dur + .4); }
  }
  function fluteTone(t, f, dur, vol = .08) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .06); g.gain.setValueAtTime(vol, t + Math.max(.08, dur - .15)); g.gain.linearRampToValueAtTime(.0001, t + dur);
    o.connect(lp).connect(g).connect(musicBus); o.start(t); o.stop(t + dur + .05);
  }

  /* ---------- 譜：E 小調五聲音階。每段四小節（16 拍），和弦 Em → G → Am → Em，B 段 D → G → Am → Em ---------- */
  const CH = {
    Em: { arp: [52, 59, 64, 67, 71], pad: [52, 59] }, G: { arp: [55, 62, 67, 71, 74], pad: [55, 62] },
    Am: { arp: [57, 64, 69, 71, 76], pad: [57, 64] }, D: { arp: [50, 57, 62, 64, 69], pad: [50, 57] }
  };
  const E4 = 64, G4 = 67, A4 = 69, B4 = 71, D5 = 74, E5 = 76, G5 = 79;
  const SEC = {
    A:  { ch: ['Em', 'G', 'Am', 'Em'], mel: [[0, 1], [B4, 1.5], [A4, .5], [G4, 1], [B4, 2], [D5, 1], [B4, 1], [A4, 1.5], [B4, .5], [E5, 2], [D5, 1], [B4, 1], [G4, 2]] },
    A2: { ch: ['Em', 'G', 'Am', 'Em'], mel: [[E5, 2], [D5, 1], [B4, 1], [D5, 1.5], [B4, .5], [G4, 2], [A4, 1], [B4, 1], [D5, 1], [E5, 1], [B4, 2], [0, 2]] },
    B:  { ch: ['D', 'G', 'Am', 'Em'], mel: [[A4, 1], [D5, 1], [E5, 2], [G5, 2], [E5, 1], [D5, 1], [E5, 1.5], [D5, .5], [B4, 1], [A4, 1], [G4, 2], [0, 2]] }
  };
  const FORM = ['A', 'A2', 'B', 'A'];
  const PAT = [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 2]];
  function buildLoop() {
    const ev = []; let beat = 0;
    for (const name of FORM) {
      const s = SEC[name];
      s.ch.forEach((c, bar) => {
        const ch = CH[c], b0 = beat + bar * 4;
        ev.push({ beat: b0, pad: ch.pad });
        PAT[bar % 2].forEach((k, i) => ev.push({ beat: b0 + i * .5, koto: ch.arp[k], soft: i % 2 }));
      });
      let b = beat; for (const [m, len] of s.mel) { ev.push(m ? { beat: b, m, len } : { beat: b, rest: 1 }); b += len; }
      beat += 16;
    }
    ev.sort((a, b) => a.beat - b.beat); loopLen = beat; return ev;
  }
  function scheduleEvent(e, t, spb) {
    const sampled = !!bank.flute;
    if (e.pad) { if (sampled) e.pad.forEach(m => samp('strings', m, t, { vol: tense ? .15 : .12, dur: Math.min(4 * spb + .25, 3.4), attack: .5, release: .7 })); else pad(t, e.pad.map(hz), 4 * spb, .012); return; }
    if (e.koto) {
      if (sampled) { samp('koto', e.koto, t, { vol: e.soft ? .13 : .18, dur: 2.6, attack: .004, release: .8 }); if (tense) samp('koto', e.koto + (e.soft ? 0 : 12), t + spb * .25, { vol: .08, dur: 1.2, attack: .004, release: .5 }); }
      else if (!e.soft) ruan(t, hz(e.koto));
      return;
    }
    if (e.rest) return;
    const d = e.len * spb;
    if (sampled) samp('flute', e.m, t, { vol: .5, dur: Math.min(d + .12, 3.4), attack: .05, release: Math.min(.3, d * .4) }); else fluteTone(t, hz(e.m), d);
  }
  function percussion(t, beatPos) { if (!tense) return; const sub = Math.round(beatPos * 2) % 8; if (sub % 2 === 0) drum(t, sub % 4 === 0 ? .35 : .2, musicBus); else muyu(t, .08, musicBus); }
  function schedule() {
    if (!ctx || !musicOn) return;
    if (document.hidden) { schedTime = Math.max(schedTime, ctx.currentTime + .15); return; }
    if (schedTime < ctx.currentTime) schedTime = ctx.currentTime + .08;
    const horizon = ctx.currentTime + .35;
    while (schedTime < horizon) {
      if (!score.length) { score = buildLoop(); evIdx = 0; schedBeat = 0; }
      bpm += (targetBpm - bpm) * .12; const spb = 60 / bpm, step = .5, end = schedBeat + step;
      while (evIdx < score.length && score[evIdx].beat < end) { const e = score[evIdx++]; scheduleEvent(e, schedTime + (e.beat - schedBeat) * spb, spb); }
      percussion(schedTime, schedBeat);
      schedTime += step * spb; schedBeat = end;
      if (schedBeat >= loopLen && evIdx >= score.length) score = [];
    }
  }
  function startScheduler() { if (timer || !musicOn) return; score = []; evIdx = 0; schedBeat = 0; bpm = targetBpm = tense ? TENSE_BPM : BASE_BPM; schedTime = ctx.currentTime + .2; timer = setInterval(schedule, 90); schedule(); }
  function music(on) {
    musicOn = !!on; if (!init()) return;
    const t = ctx.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    if (musicOn) {
      unlock(); musicBus.gain.linearRampToValueAtTime(1, t + .8);
      if (!timer) { let started = false; const go = () => { if (!started) { started = true; startScheduler(); } }; loadSamples().then(go, go); setTimeout(go, 2500); }
    } else {
      musicBus.gain.linearRampToValueAtTime(0, t + .5); clearInterval(timer); timer = 0; const old = musicBus;
      setTimeout(() => { if (!musicOn && old === musicBus) { old.disconnect(); newMusicBus(); } }, 650);
    }
  }
  function tension(on) { tense = on ? 1 : 0; targetBpm = on ? TENSE_BPM : BASE_BPM; }

  /* ---------- 音效入口 ---------- */
  function phrase(t, notes, vol = .16) { let tt = t; notes.forEach(([m, len]) => { if (!samp('flute', m, tt, { vol: vol * 2.2, dur: len + .15, attack: .03, release: .12, out: sfxBus })) fluteTone(tt, hz(m), len, vol * .5); tt += len; }); }
  function sweep(t, notes, gap = .07, vol = .22) { notes.forEach((m, i) => { if (!samp('koto', m, t + i * gap, { vol, dur: 1.8, attack: .004, release: .6, out: sfxBus })) tone(t + i * gap, hz(m), hz(m), .1, .6, 'triangle'); }); }
  function sfx(type, arg) {
    if (!init()) return; unlock(); const t = ctx.currentTime + .01;
    switch (type) {
      case 'place': stone(t, arg === 2 || arg === true); break;
      case 'tap': noiseHit(t, { freq: 4200, q: 3, vol: .12, decay: .015 }); tone(t, 1300, 1150, .04, .025); break;
      case 'preview': noiseHit(t, { freq: 3800, q: 3, vol: .1, decay: .014 }); break;
      case 'dice': { let tt = t, gap = .045; for (let i = 0; i < 11; i++) { knock(tt, .55 - i * .025, .85 + Math.random() * .5); tt += gap; gap *= 1.17; } knock(tt + .02, .6, 1.1); break; }
      case 'six': bell(t, 2350, .1, sfxBus); luo(t + .02, .8); break;
      case 'cheat': muyu(t, .3); muyu(t + .1, .3); muyu(t + .2, .3); luo(t + .34, 1.1); drum(t + .34, .6); break;
      case 'flip': noiseHit(t, { freq: 1900, q: 2, vol: .16, decay: .05 }); tone(t, 980, 520, .1, .09); tone(t + .11, 520, 1040, .1, .12); muyu(t + .26, .22); break;
      case 'warn': muyu(t, .32); muyu(t + .13, .26); break;
      case 'undo': noiseHit(t, { freq: 2200, q: 2, vol: .12, decay: .03 }); tone(t, 700, 420, .06, .08); break;
      case 'error': muyu(t, .28); break;
      case 'win': [0, .16, .32, .4, .48].forEach((d, i) => drum(t + d, i > 2 ? .65 : .9)); luo(t + .24, .8); bigGong(t + 1.0, .85); sweep(t + .55, [64, 67, 69, 71, 74, 76, 79], .08);
        phrase(t + 1.2, [[74, .2], [76, .2], [79, .9]]); break;
      case 'lose': phrase(t, [[76, .45], [74, .45], [71, .45], [69, .45], [64, 1.3]], .13); bigGong(t + 1.8, .4); break;
      case 'draw': phrase(t, [[74, .3], [76, .3], [74, .3], [71, .8]], .13); luo(t + 1.4, .45); break;
      case 'cheatwin': luo(t, 1); drum(t + .1, .9); drum(t + .26, .9); bigGong(t + .5, .8); sweep(t + .2, [79, 76, 74, 71, 69, 67, 64], .06, .2); break;
      default: noiseHit(t, { freq: 3000, q: 3, vol: .1, decay: .02 });
    }
  }
  window.GomokuAudio = { sfx, music, unlock, tension };
})();
