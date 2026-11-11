(function () {
  'use strict';
  const G = window.GeometricOptics, $ = id => document.getElementById(id);
  const colors = { parallel: '#b87517', central: '#287eae', focal: '#895bb0', curvature: '#32847a' };
  const bounds = { xMin: -4.4, xMax: 4.4, yMin: -2.5, yMax: 2.5 };
  const sx = x => 500 + x * 110, sy = y => 300 - y * 110;
  const n = value => Number(value.toFixed(2));
  const point = p => `${n(sx(p.x))},${n(sy(p.y))}`;
  const line = points => points ? `M${point(points[0])}L${point(points[1])}` : '';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { type: 'convex-lens', distance: 3, screen: 2, snap: true, extensions: true, showImage: true, showScreen: false,
    playing: !reduced.matches, rays: { parallel: true, central: true, focal: false, curvature: false } };
  let drag = null, frame = 0, elapsed = 0, lastTick = null, animated = [];
  const scene = $('optics');
  function description(im) {
    if (!im.finite) return '物體在焦點上：出射光互相平行，不形成有限距離的像。';
    return `${im.upright ? '正立' : '倒立'}、${im.size}、${im.real ? '實像' : '虛像'}；像在${im.optic.mirror ? (im.real ? '鏡前' : '鏡後') : (im.real ? '物體另一側' : '物體同側')}。`;
  }
  function annotation(x, text, y = -0.32) {
    return `<circle cx="${sx(x)}" cy="300" r="4" fill="#637b91"/><text class="label" x="${sx(x)}" y="${sy(y)}" text-anchor="middle">${text}</text>`;
  }
  function arrow(x, y, color, dashed = false) {
    const px = sx(x), py = sy(y), sign = y >= 0 ? 1 : -1;
    return `<path d="M${px},300V${py}" stroke="${color}" stroke-width="7" ${dashed ? 'stroke-dasharray="9 5"' : ''}/><path d="M${px - 11},${py + 18 * sign}L${px},${py}L${px + 11},${py + 18 * sign}" fill="none" stroke="${color}" stroke-width="6" stroke-linejoin="round"/>`;
  }
  function opticalElement(optic) {
    if (!optic.mirror) {
      const shape = optic.f > 0 ? 'M500,140Q542,300 500,460Q458,300 500,140Z' : 'M478,140Q502,300 478,460L522,460Q498,300 522,140Z';
      return `<path d="${shape}" fill="#cce7f2" fill-opacity=".75" stroke="#527d96" stroke-width="3"/><circle cx="500" cy="300" r="4" fill="#527d96"/><text class="label" x="510" y="330">O</text>`;
    }
    const control = optic.f > 0 ? 534 : 466;
    let hatch = '';
    for (let y = 152; y <= 448; y += 22) {
      const t = (y - 140) / 320, x = 500 + 2 * (control - 500) * t * (1 - t);
      hatch += `<path d="M${x + 3},${y}l13,-8" stroke="#8ca0b1" stroke-width="2"/>`;
    }
    return `${hatch}<path d="M500,140Q${control},300 500,460" fill="none" stroke="#527d96" stroke-width="6"/><circle cx="500" cy="300" r="4" fill="#527d96"/><text class="label" x="510" y="330">V</text><text class="small-label" x="500" y="122" text-anchor="middle">反射面朝左</text>`;
  }
  function renderScene(im) {
    const focusId = scene.contains(document.activeElement) ? document.activeElement.id : null;
    let svg = '<defs><pattern id="grid" width="110" height="110" patternUnits="userSpaceOnUse" x="60" y="80"><path d="M110,0H0V110" fill="none" stroke="#e6edf3" stroke-width="1"/></pattern>';
    for (const [id, color] of Object.entries(colors)) svg += `<marker id="tip-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1L9,5L0,9" fill="none" stroke="${color}" stroke-width="1.7"/></marker>`;
    svg += '</defs><rect width="1000" height="600" fill="url(#grid)"/><path d="M16,300H984" stroke="#9caebe" stroke-width="2"/><text class="small-label" x="975" y="284" text-anchor="end">主軸</text>';
    if (im.optic.mirror) {
      const f = -im.optic.f;
      svg += annotation(f, 'F') + annotation(2 * f, 'C（2F）');
      if (im.optic.f < 0) svg += '<text class="small-label" x="720" y="565" text-anchor="middle">鏡後：虛焦點與虛像所在側</text>';
    } else svg += annotation(-1, 'F') + annotation(-2, '2F') + annotation(1, 'F′') + annotation(2, '2F′');
    svg += `<text class="small-label" x="500" y="585" text-anchor="middle">固定比例尺 · 每一大格為 1f</text>`;
    const selected = G.rays(state.type, state.distance).filter(r => state.rays[r.id]);
    let index = 0;
    for (const ray of selected) {
      const incoming = G.clip(ray.source, { x: -ray.source.x, y: ray.hit.y - ray.source.y }, bounds, 0, 1);
      const outgoing = G.clip(ray.hit, ray.vector, bounds);
      const d = line(incoming) + line(outgoing);
      if (!d) continue;
      const color = colors[ray.id];
      svg += `<path data-light="${index}" class="ray" d="${d}" stroke="${color}"/><circle data-photon="${index}" class="photon" r="6" fill="${color}"/>`;
      // Arrowheads are placed on each physically travelled segment, never on back-traces.
      for (const segment of [incoming, outgoing].filter(Boolean)) {
        const [a, b] = segment, p = { x: a.x + (b.x - a.x) * .55, y: a.y + (b.y - a.y) * .55 };
        const tail = { x: a.x + (b.x - a.x) * .50, y: a.y + (b.y - a.y) * .50 };
        if (Math.hypot(b.x - a.x, b.y - a.y) > .15) svg += `<path data-direction="${index}" d="${line([tail, p])}" fill="none" stroke="${color}" stroke-width="2.5" marker-end="url(#tip-${ray.id})"/>`;
      }
      if (im.finite && !im.real && state.extensions) {
        const extension = G.clip(ray.hit, { x: -ray.vector.x, y: -ray.vector.y }, bounds, 0, -im.q);
        svg += `<path data-extension="${index}" class="extension" d="${line(extension)}" stroke="${color}"/>`;
      }
      index++;
    }
    svg += opticalElement(im.optic);
    if (state.showImage && im.finite) {
      const visibleX = im.x >= bounds.xMin && im.x <= bounds.xMax;
      if (visibleX) {
        const y = Math.max(bounds.yMin + .12, Math.min(bounds.yMax - .12, im.y));
        svg += arrow(im.x, y, '#278264', !im.real);
        svg += `<text class="label" x="${sx(im.x)}" y="${sy(y) + (y >= 0 ? -15 : 32)}" text-anchor="middle">${im.real ? '實像' : '虛像'}${y !== im.y ? '（超出畫面）' : ''}</text>`;
      }
    }
    if (state.showScreen) {
      const px = sx(state.screen), status = G.screen(state.type, state.distance, state.screen);
      svg += `<g id="screen-handle" class="handle" tabindex="0" role="slider" aria-label="光屏位置，負值在左側，正值在右側" aria-valuemin="-4" aria-valuemax="4" aria-valuenow="${n(state.screen)}" aria-valuetext="${n(state.screen)} 倍焦距"><rect class="hit-area" x="${px - 32}" y="73" width="64" height="460" rx="20"/><rect x="${px - 6}" y="90" width="12" height="420" fill="${status.sharp ? '#79b8a3' : '#bdcbd8'}" fill-opacity=".45" stroke="#738b9e" stroke-width="2"/><rect x="${px - 28}" y="503" width="56" height="24" rx="6" fill="#738b9e"/><text class="label" x="${px}" y="65" text-anchor="middle">光屏 ↔</text></g>`;
    }
    svg += `<g id="object-handle" class="handle" tabindex="0" role="slider" aria-label="物距" aria-valuemin="0.25" aria-valuemax="4" aria-valuenow="${n(state.distance)}" aria-valuetext="${n(state.distance)} 倍焦距"><rect class="hit-area" x="${sx(-state.distance) - 40}" y="${sy(G.HEIGHT) - 30}" width="80" height="155" rx="20"/>${arrow(-state.distance, G.HEIGHT, '#287eae')}<rect x="${sx(-state.distance) - 25}" y="300" width="50" height="20" rx="6" fill="#287eae"/><text class="label" x="${sx(-state.distance)}" y="${sy(G.HEIGHT) - 17}" text-anchor="middle">物體</text><text class="small-label" x="${sx(-state.distance)}" y="369" text-anchor="middle">↔ 拖曳</text></g>`;
    scene.innerHTML = svg;
    if (focusId && !drag) $(focusId)?.focus({ preventScroll: true });
    animated = [...scene.querySelectorAll('[data-light]')].map(path => ({ path, length: path.getTotalLength(), dot: scene.querySelector(`[data-photon="${path.dataset.light}"]`),
      arrows: [...scene.querySelectorAll(`[data-direction="${path.dataset.light}"]`)], extension: scene.querySelector(`[data-extension="${path.dataset.light}"]`) }));
    drawFrame();
  }
  function drawFrame() {
    animated.forEach((ray, i) => {
      const progress = Math.max(0, Math.min(1, (elapsed - i * 850) / 1400));
      ray.path.style.strokeDasharray = `${ray.length} ${ray.length}`;
      ray.path.style.strokeDashoffset = ray.length * (1 - progress);
      ray.arrows.forEach(a => { a.style.opacity = progress >= 1 ? 1 : 0; });
      if (ray.extension) ray.extension.style.opacity = progress >= 1 ? '.55' : '0';
      ray.dot.style.display = state.playing && progress > 0 ? '' : 'none';
      if (state.playing && progress > 0) {
        const cycle = progress < 1 ? progress : ((elapsed - i * 850 - 1400) % 3200) / 3200;
        const p = ray.path.getPointAtLength(Math.max(0, cycle) * ray.length);
        ray.dot.setAttribute('cx', p.x); ray.dot.setAttribute('cy', p.y);
      }
    });
  }
  function tick(time) {
    frame = 0;
    if (!state.playing || document.hidden) { lastTick = null; return; }
    if (lastTick !== null) elapsed += Math.min(time - lastTick, 100);
    lastTick = time;
    drawFrame(); frame = requestAnimationFrame(tick);
  }
  function run() { if (state.playing && !frame) frame = requestAnimationFrame(tick); }
  function render(restart = true) {
    if (restart) { elapsed = state.playing ? 0 : 10000; lastTick = null; }
    const im = G.image(state.type, state.distance), optic = im.optic;
    document.querySelectorAll('[data-optic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.optic === state.type)));
    document.querySelectorAll('[data-distance]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.distance - state.distance) < 1e-8)));
    $('scene-title').textContent = `${optic.name}成像`;
    $('optic-group').textContent = `${optic.group} · ${optic.mirror ? '反射' : '折射'}`;
    $('distance').value = state.distance; $('distance-value').textContent = `${state.distance.toFixed(2)}f`;
    $('distance').setAttribute('aria-valuetext', `${state.distance.toFixed(2)} 倍焦距`);
    $('parallel-rule').textContent = optic.f > 0 ? `${optic.mirror ? '反射' : '折射'}後通過焦點` : `${optic.mirror ? '反射' : '折射'}後發散，反向延長線通過虛焦點`;
    $('central-label').innerHTML = optic.mirror ? '射向鏡面頂點 V<small>依入射角＝反射角反射</small>' : '通過光心 O<small>薄透鏡模型中，方向不變</small>';
    $('focal-rule').textContent = optic.f > 0 ? `入射線或其延長線通過物側焦點，${optic.mirror ? '反射' : '折射'}後平行主軸` : `朝向${optic.mirror ? '鏡後' : '另一側'}焦點入射，${optic.mirror ? '反射' : '折射'}後平行主軸`;
    $('curvature-option').hidden = !optic.mirror;
    $('screen-controls').hidden = !state.showScreen; $('screen-result').hidden = !state.showScreen;
    $('screen-position').value = state.screen; $('screen-value').textContent = `${state.screen > 0 ? '+' : ''}${state.screen.toFixed(2)}f`;
    $('play').textContent = state.playing ? '暫停光線動畫' : '播放光線動畫';
    $('play').setAttribute('aria-pressed', String(state.playing));
    const omitted = [];
    if (state.rays.focal && !im.finite) omitted.push('物體在 F 時，這條焦點光線與參考面平行，無法入射，暫不繪出。可用另外兩條光線觀察。');
    if (optic.mirror && state.rays.curvature && Math.abs(state.distance - 2 * optic.f) < 1e-9) omitted.push('物體在 C 上方時，球心相關光線與參考面平行，暫不繪出。可改看平行光線與頂點光線。');
    $('ray-note').hidden = omitted.length === 0; $('ray-note').textContent = omitted.join(' ');
    if (!state.showImage) $('result').innerHTML = '<h3>先預測看看</h3><p>像在哪一側？正立或倒立？放大或縮小？是實像還是虛像？</p><p class="muted">勾選「顯示像與成像結果」即可核對。</p>';
    else if (!im.finite) $('result').innerHTML = '<h3>物距＝焦距</h3><p>出射光互相平行，不形成有限距離的像。</p><p class="measure">成像位置趨向無限遠，有限距離的光屏無法接到清晰的像。</p>';
    else $('result').innerHTML = `<div class="result-tags"><span>${im.upright ? '正立' : '倒立'}</span><span>${im.size}</span><span>${im.real ? '實像' : '虛像'}</span></div><p>${optic.mirror ? (im.real ? '像在鏡前，與物體同側。' : '像在鏡後。') : (im.real ? '像在透鏡另一側。' : '像在透鏡與物體同側。')}</p><p class="measure">像距大小 ${Math.abs(im.q).toFixed(2)}f · 像高為物高的 ${Math.abs(im.magnification).toFixed(2)} 倍</p>`;
    const offscreen = state.showImage && im.finite && (Math.abs(im.x) > bounds.xMax || Math.abs(im.y) > bounds.yMax - .12);
    $('edge-note').hidden = !offscreen;
    const edges = [];
    if (im.finite && Math.abs(im.x) > bounds.xMax) edges.push(im.x < 0 ? '左側' : '右側');
    if (im.finite && Math.abs(im.y) > bounds.yMax - .12) edges.push(im.y > 0 ? '上方' : '下方');
    $('edge-note').textContent = offscreen ? `像超出畫面的${edges.join('與')}。像距大小 ${Math.abs(im.q).toFixed(2)}f；比例尺保持固定，可把物體移離 F 再觀察。` : '';
    if (state.showScreen) {
      const s = G.screen(state.type, state.distance, state.screen);
      $('screen-status').textContent = s.sharp ? '光屏接到清晰的像！' : '光屏上沒有清晰的像';
      $('screen-explain').textContent = s.sharp ? '試著稍微移動光屏，比較清晰度。' : !s.correctSide ? '把光屏移到實際出射光線行進的一側。' : !im.finite ? '出射光互相平行，有限距離的光屏無法使它們會聚。' : !im.real ? '虛像位置沒有光線實際會聚，光屏接不到這個像。' : '移動光屏，尋找光線實際會聚的位置。';
      $('screen-preview').innerHTML = s.possible ? `<span class="screen-arrow" style="filter:blur(${s.sharp ? 0 : Math.min(12, Math.max(2, s.spread * 20))}px)">↑</span>` : '';
    }
    $('observation-prompt').textContent = optic.f > 0 ? '從 3f 移到 2f、1.5f、f、0.5f，像的方向、大小與位置如何改變？' : '從遠處逐漸靠近，像的方向、大小與所在側會改變嗎？';
    $('discovery').innerHTML = optic.f > 0 ? '<p>物體在 2F 外：倒立、縮小的實像；在 2F：倒立、等大的實像。</p><p>物體在 F 與 2F 間：倒立、放大的實像；在 F：不形成有限距離的像。</p><p>物體在 F 內：正立、放大的虛像。</p>' : '<p>實物無論放在哪裡，都是正立、縮小的虛像。</p><p>物體越靠近器材，像逐漸變大，但仍比物體小；像位於器材與虛焦點之間。</p>';
    renderScene(im); run();
  }
  function setDistance(value) { state.distance = G.snap(value, state.snap); render(); }
  function setScreen(value) { state.screen = Math.max(-4, Math.min(4, value)); render(); }
  document.querySelectorAll('[data-optic]').forEach(b => b.addEventListener('click', () => {
    state.type = b.dataset.optic; state.screen = G.TYPES[state.type].mirror ? -2 : 2;
    $('discovery').hidden = true; $('prediction-toggle').setAttribute('aria-expanded', 'false'); render();
  }));
  document.querySelectorAll('[data-distance]').forEach(b => b.addEventListener('click', () => setDistance(+b.dataset.distance)));
  $('distance').addEventListener('input', e => setDistance(+e.target.value));
  // Arrow keys bypass attraction so keyboard users can move past F and 2F.
  $('distance').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    state.distance = e.key === 'Home' ? .25 : e.key === 'End' ? 4 : Math.max(.25, Math.min(4, n(state.distance + (['ArrowRight', 'ArrowUp'].includes(e.key) ? .01 : -.01)))); render();
  });
  $('screen-position').addEventListener('input', e => setScreen(+e.target.value));
  for (const id of ['parallel', 'central', 'focal', 'curvature']) $('ray-' + id).addEventListener('change', e => { state.rays[id] = e.target.checked; render(); });
  for (const [id, key] of [['snap', 'snap'], ['extensions', 'extensions'], ['show-image', 'showImage'], ['show-screen', 'showScreen']]) $(id).addEventListener('change', e => { state[key] = e.target.checked; render(); });
  $('play').addEventListener('click', () => { state.playing = !state.playing; lastTick = null; if (frame) cancelAnimationFrame(frame); frame = 0; render(false); });
  $('replay').addEventListener('click', () => { state.playing = true; render(); });
  $('prediction-toggle').addEventListener('click', () => { $('discovery').hidden = !$('discovery').hidden; $('prediction-toggle').setAttribute('aria-expanded', String(!$('discovery').hidden)); });
  $('reset').addEventListener('click', () => {
    Object.assign(state, { distance: 3, screen: G.TYPES[state.type].mirror ? -2 : 2, snap: true, extensions: true, showImage: true, showScreen: false, playing: !reduced.matches });
    state.rays = { parallel: true, central: true, focal: false, curvature: false };
    for (const [id, value] of Object.entries({ snap: true, extensions: true, 'show-image': true, 'show-screen': false, 'ray-parallel': true, 'ray-central': true, 'ray-focal': false, 'ray-curvature': false })) $(id).checked = value;
    $('discovery').hidden = true; $('prediction-toggle').setAttribute('aria-expanded', 'false'); render();
  });
  function worldX(e) { const p = scene.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return (p.matrixTransform(scene.getScreenCTM().inverse()).x - 500) / 110; }
  scene.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.handle'); if (!handle) return;
    e.preventDefault(); drag = handle.id === 'object-handle' ? 'object' : 'screen';
    scene.setPointerCapture(e.pointerId);
    handle.focus({ preventScroll: true });
    const offset = worldX(e) - (drag === 'object' ? -state.distance : state.screen);
    scene.dataset.dragOffset = offset;
  });
  scene.addEventListener('pointermove', e => {
    if (!drag) return;
    const x = worldX(e) - Number(scene.dataset.dragOffset || 0);
    if (drag === 'object') setDistance(-x); else setScreen(x);
  });
  function release(e) {
    if (!drag) return; const id = drag === 'object' ? 'object-handle' : 'screen-handle';
    drag = null; if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
    $(id)?.focus({ preventScroll: true });
  }
  scene.addEventListener('pointerup', release); scene.addEventListener('pointercancel', release);
  scene.addEventListener('lostpointercapture', () => { drag = null; });
  scene.addEventListener('keydown', e => {
    const handle = e.target.closest('.handle'); if (!handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    if (handle.id === 'object-handle') {
      const delta = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? .05 : -.05;
      state.distance = e.key === 'Home' ? .25 : e.key === 'End' ? 4 : Math.max(.25, Math.min(4, n(state.distance + delta))); render();
    } else setScreen(e.key === 'Home' ? -4 : e.key === 'End' ? 4 : n(state.screen + (['ArrowRight', 'ArrowUp'].includes(e.key) ? .05 : -.05)));
  });
  document.addEventListener('visibilitychange', () => { lastTick = null; if (!document.hidden) run(); });
  render();
})();
