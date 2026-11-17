/* Two independently controlled bases; all geometry is in equal-scale coordinates. */
(function () {
  'use strict';
  const M = window.ExpLog, NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const svg = $('plot'), wrap = svg.parentElement;
  const ids = ['normal-exp', 'normal-log', 'fractional-exp', 'fractional-log'];
  const layers = {};
  for (const name of ['grid', 'axis', 'symmetry', 'curve', 'point', 'label']) layers[name] = $(name + '-layer');
  const defaultView = () => ({ cx: 2.5, cy: 2.5, span: 9 });
  const state = {
    normal: 2, fractional: .5, critical: false, previous: null,
    visible: { 'normal-exp': true, 'normal-log': true, 'fractional-exp': false, 'fractional-log': false },
    symmetry: false, pan: false, selected: null, view: defaultView()
  };
  let metrics, intersections = [], scheduled = false, drag = null;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function node(tag, attrs = {}, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function add(parent, tag, attrs, text) { const e = node(tag, attrs, text); parent.append(e); return e; }
  function setAttrs(e, attrs) { for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, String(v)); }
  function screen(p) { return { x: metrics.ox + p.x * metrics.scale, y: metrics.oy - p.y * metrics.scale }; }
  function world(p) { return { x: (p.x - metrics.ox) / metrics.scale, y: (metrics.oy - p.y) / metrics.scale }; }
  function inside(p) { return p.x >= metrics.xmin && p.x <= metrics.xmax && p.y >= metrics.ymin && p.y <= metrics.ymax; }
  function updateMetrics() {
    const box = wrap.getBoundingClientRect(), w = Math.max(260, box.width), h = Math.max(80, box.height);
    const left = 32, right = w - 20, top = 26, bottom = h - 30;
    const scale = Math.min(right-left, bottom-top) / state.view.span;
    const ox = (left+right)/2 - state.view.cx*scale, oy = (top+bottom)/2 + state.view.cy*scale;
    metrics = { w,h,left,right,top,bottom,scale,ox,oy,xmin:(left-ox)/scale,xmax:(right-ox)/scale,ymin:(oy-bottom)/scale,ymax:(oy-top)/scale };
    setAttrs(svg, { viewBox: '0 0 ' + w + ' ' + h });
    setAttrs($('clip-rect'), { x:left, y:top, width:right-left, height:bottom-top });
  }
  function segment(parent, p, q, attrs = {}) { return add(parent, 'line', { x1:p.x,y1:p.y,x2:q.x,y2:q.y,...attrs }); }
  function gridAndAxes() {
    const m = metrics, raw = 66/m.scale, power = 10 ** Math.floor(Math.log10(raw)), n = raw/power;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10)*power;
    const tick = v => String(Number(v.toPrecision(4)));
    for (let x = Math.ceil(m.xmin/step)*step; x <= m.xmax+step*1e-6; x += step) {
      if (Math.abs(x) < step*1e-6) continue;
      const p = screen({x,y:0});
      segment(layers.grid, {x:p.x,y:m.top}, {x:p.x,y:m.bottom}, {stroke:'#e8edf3','stroke-width':1});
      const y = clamp(m.oy+18, m.top+14, m.bottom+20);
      add(layers.grid,'text',{x:p.x,y,'text-anchor':'middle',class:'tick-label'},tick(x));
    }
    for (let y = Math.ceil(m.ymin/step)*step; y <= m.ymax+step*1e-6; y += step) {
      if (Math.abs(y) < step*1e-6) continue;
      const p = screen({x:0,y});
      segment(layers.grid,{x:m.left,y:p.y},{x:m.right,y:p.y},{stroke:'#e8edf3','stroke-width':1});
      const x = clamp(m.ox-9, m.left-6, m.right-8);
      add(layers.grid,'text',{x,y:p.y+4,'text-anchor':'end',class:'tick-label'},tick(y));
    }
    if (m.oy >= m.top && m.oy <= m.bottom) {
      segment(layers.axis,{x:m.left,y:m.oy},{x:m.right,y:m.oy},{stroke:'#687c90','stroke-width':1.6});
      add(layers.axis,'polygon',{points:(m.right)+','+m.oy+' '+(m.right-9)+','+(m.oy-4)+' '+(m.right-9)+','+(m.oy+4),fill:'#687c90'});
      add(layers.axis,'text',{x:m.right-4,y:m.oy-10,class:'axis-label','text-anchor':'end'},'x');
    }
    if (m.ox >= m.left && m.ox <= m.right) {
      segment(layers.axis,{x:m.ox,y:m.bottom},{x:m.ox,y:m.top},{stroke:'#687c90','stroke-width':1.6});
      add(layers.axis,'polygon',{points:m.ox+','+m.top+' '+(m.ox-4)+','+(m.top+9)+' '+(m.ox+4)+','+(m.top+9),fill:'#687c90'});
      add(layers.axis,'text',{x:m.ox+10,y:m.top+12,class:'axis-label'},'y');
    }
    if (inside({x:0,y:0})) add(layers.axis,'text',{x:m.ox-8,y:m.oy+18,'text-anchor':'end',class:'tick-label'},'0');
    if (state.symmetry) {
      const lo = Math.max(m.xmin,m.ymin), hi = Math.min(m.xmax,m.ymax);
      if (lo < hi) {
        segment(layers.symmetry,screen({x:lo,y:lo}),screen({x:hi,y:hi}),{stroke:'#73849a','stroke-width':1.5,'stroke-dasharray':'7 6'});
        const p = screen({x:hi-.6,y:hi-.6});
        add(layers.symmetry,'text',{x:clamp(p.x+9,m.left,m.right-45),y:clamp(p.y+18,m.top+62,m.bottom-8),class:'tick-label'},'y = x');
      }
    }
  }
  function clipSegment(a,b) {
    const m=metrics, dx=b.x-a.x, dy=b.y-a.y;
    const p=[-dx,dx,-dy,dy], q=[a.x-m.left,m.right-a.x,a.y-m.top,m.bottom-a.y];
    let lo=0,hi=1;
    for(let i=0;i<4;i++){
      if(Math.abs(p[i])<1e-12){if(q[i]<0)return null;}
      else {const r=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);}
      if(lo>hi)return null;
    }
    return [{x:a.x+lo*dx,y:a.y+lo*dy},{x:a.x+hi*dx,y:a.y+hi*dy}];
  }
  function visibleCurve(curve) {
    const m=metrics, lo=curve.kind==='exp'?m.xmin:m.ymin, hi=curve.kind==='exp'?m.xmax:m.ymax;
    const count=clamp(Math.ceil((curve.kind==='exp'?m.w:m.h)/1.7),180,680);
    let previous=null, data='', first=null, last=null;
    for(let i=0;i<=count;i++){
      const t=lo+(hi-lo)*i/count, point=screen(M.point(curve.kind,curve.base,t));
      if(!Number.isFinite(point.x)||!Number.isFinite(point.y)){previous=null;continue;}
      if(previous){
        const clipped=clipSegment(previous,point);
        if(clipped){
          const [a,b]=clipped;
          if(!first)first=a;
          data+='M'+a.x.toFixed(2)+','+a.y.toFixed(2)+'L'+b.x.toFixed(2)+','+b.y.toFixed(2);
          last=b;
        }
      }
      previous=point;
    }
    return {data,first,last};
  }
  function curves() {
    return ids.filter(id=>state.visible[id]).map(id=>{
      const normal=id.startsWith('normal'), kind=id.endsWith('exp')?'exp':'log';
      return {id,kind,base:normal?state.normal:state.fractional,normal,color:'var(--'+id+')'};
    });
  }
  function formulaText(text,curve) {
    const base=curve.normal?(state.critical?'e':state.normal.toFixed(1)):state.fractional.toFixed(2);
    const span=(value,attrs={})=>add(text,'tspan',attrs,value);
    if(curve.kind==='exp'){
      span('y = '+(curve.normal&&state.critical?'(':'')+base);
      if(curve.normal&&state.critical){span('1/e',{'baseline-shift':'super','font-size':'.72em'});span(')');}
      span('x',{'baseline-shift':'super','font-size':'.72em'});
    }else{
      span('y = log');
      const sub=span('',{'baseline-shift':'sub','font-size':'.72em'});
      sub.textContent=curve.normal&&state.critical?'e¹⁄ᵉ':base;
      span(' x');
    }
  }
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  function drawLabel(curve,geometry,occupied) {
    if(!geometry.first)return;
    const anchor=curve.base>1?geometry.last:geometry.first;
    const group=add(layers.label,'g',{'data-formula':curve.id});
    const leader=add(group,'line',{stroke:curve.color,'stroke-width':1.2});
    const text=add(group,'text',{x:0,y:0,class:'curve-formula'});
    text.style.fill=curve.color;
    formulaText(text,curve);
    const bbox=text.getBBox(), width=bbox.width+10, height=Math.max(24,bbox.height+8);
    const offsets=[[10,-height-7],[-width-10,-height-7],[10,9],[-width-10,9],[-width/2,-height-17],[-width/2,17],[18,-height/2],[-width-18,-height/2]];
    const candidates=offsets.map(([dx,dy])=>({x:clamp(anchor.x+dx,metrics.left+2,metrics.right-width-2),y:clamp(anchor.y+dy,metrics.top+2,metrics.bottom-height-2),w:width,h:height}));
    const penalty=r=>occupied.reduce((sum,o)=>sum+overlap(r,o),0);
    const cost=r=>(penalty(r)>0?1e6+penalty(r)*100:0)+Math.hypot(r.x+r.w/2-anchor.x,r.y+r.h/2-anchor.y);
    if(candidates.every(r=>penalty(r)>0)){
      for(let y=metrics.top+2;y<=metrics.bottom-height-2;y+=height+8)for(let x=metrics.left+2;x<=metrics.right-width-2;x+=Math.max(24,width/2))candidates.push({x,y,w:width,h:height});
    }
    candidates.sort((a,b)=>cost(a)-cost(b));
    const choice=candidates[0];
    setAttrs(text,{x:choice.x+5-bbox.x,y:choice.y+4-bbox.y});
    setAttrs(leader,{x1:anchor.x,y1:anchor.y,x2:clamp(anchor.x,choice.x,choice.x+choice.w),y2:clamp(anchor.y,choice.y,choice.y+choice.h)});
    occupied.push(choice);
  }
  function format(n) { return String(Number(n.toFixed(4))); }
  function updateReading() {
    const point=intersections.find(p=>p.id===state.selected);
    $('point-reading').textContent=point?(point.exact?'交點 (e, e)':'交點 ('+format(point.x)+', '+format(point.y)+')'):'點選粗點，讀取交點座標。';
    $('point-reading').classList.toggle('has-point',!!point);
    for(const e of layers.point.children)e.classList.toggle('selected',e.dataset.pointId===state.selected);
  }
  function choosePoint(id) { state.selected=state.selected===id?null:id;updateReading(); }
  function drawPoints() {
    for(const point of intersections){
      if(!inside(point))continue;
      const p=screen(point), group=add(layers.point,'g',{class:'intersection'+(point.id===state.selected?' selected':''),'data-point-id':point.id,role:'button',tabindex:0,'aria-label':'交點，按 Enter 讀取座標'});
      add(group,'circle',{cx:p.x,cy:p.y,r:13,fill:'transparent',class:'point-halo'});
      add(group,'circle',{cx:p.x,cy:p.y,r:5.2,fill:'#25374b',stroke:'#fff','stroke-width':1.8,'pointer-events':'none'});
      group.addEventListener('click',event=>{event.stopPropagation();choosePoint(point.id);});
      group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choosePoint(point.id);}});
    }
  }
  function draw() {
    scheduled=false;
    const focused=document.activeElement?.dataset?.pointId;
    updateMetrics();
    for(const layer of Object.values(layers))layer.replaceChildren();
    gridAndAxes();
    intersections=M.dualBaseIntersections(state.normal,state.fractional,state.visible);
    const m=metrics, button=$('symmetry-toggle').getBoundingClientRect(), plotBox=svg.getBoundingClientRect();
    const occupied=[{x:button.left-plotBox.left-6,y:button.top-plotBox.top-6,w:button.width+12,h:button.height+12}];
    for(const text of layers.symmetry.querySelectorAll('text')){const r=text.getBBox();occupied.push({x:r.x-5,y:r.y-5,w:r.width+10,h:r.height+10});}
    for(const point of intersections.filter(inside)){const p=screen(point);occupied.push({x:p.x-12,y:p.y-12,w:24,h:24});}
    const rendered=[];
    for(const curve of curves()){
      const geometry=visibleCurve(curve);
      add(layers.curve,'path',{d:geometry.data,fill:'none',stroke:curve.color,'stroke-width':2.8,'stroke-linecap':'round','stroke-linejoin':'round','data-curve':curve.id});
      rendered.push([curve,geometry]);
    }
    drawPoints();
    for(const [curve,geometry]of rendered)drawLabel(curve,geometry,occupied);
    $('offscreen-note').hidden=!intersections.some(p=>!inside(p));
    $('fit-points').disabled=!intersections.length;
    if(state.selected&&!intersections.some(p=>p.id===state.selected))state.selected=null;
    updateReading();
    if(focused){const target=Array.from(layers.point.children).find(e=>e.dataset.pointId===focused);target?.focus({preventScroll:true});}
  }
  function requestDraw() { if(!scheduled){scheduled=true;requestAnimationFrame(draw);} }
  function syncControls() {
    const slider=$('normal-base');
    slider.disabled=state.critical;slider.step=state.critical?'any':'0.1';slider.value=String(state.normal);
    $('fractional-base').value=String(state.fractional);
    $('normal-output').textContent=state.critical?'e¹⁄ᵉ ≈ '+M.CRITICAL.toFixed(6):state.normal.toFixed(1);
    $('normal-output').classList.toggle('exact',state.critical);
    $('fractional-output').textContent=state.fractional.toFixed(2);
    slider.setAttribute('aria-valuetext',state.critical?'e 的一除以 e 次方，約 '+M.CRITICAL.toFixed(6)+'，特殊模式鎖定':state.normal.toFixed(1));
    $('fractional-base').setAttribute('aria-valuetext',state.fractional.toFixed(2));
    for(const id of ids){$(id).checked=state.visible[id];$(id).disabled=state.critical&&id.startsWith('normal');}
    $('critical-mode').checked=state.critical;$('critical-note').hidden=!state.critical;
    $('symmetry-toggle').setAttribute('aria-pressed',String(state.symmetry));
    $('symmetry-toggle').textContent=state.symmetry?'隱藏對稱軸':'顯示對稱軸';
    $('pan-toggle').setAttribute('aria-pressed',String(state.pan));
    svg.classList.toggle('pan-active',state.pan);
  }
  $('normal-base').addEventListener('input',()=>{
    if(state.critical)return;
    state.normal=clamp(Math.round(Number($('normal-base').value)*10)/10,1.1,5);
    syncControls();requestDraw();
  });
  $('fractional-base').addEventListener('input',()=>{
    state.fractional=clamp(Math.round(Number($('fractional-base').value)*20)/20,.1,.95);
    syncControls();requestDraw();
  });
  for(const id of ids)$(id).addEventListener('change',()=>{state.visible[id]=$(id).checked;requestDraw();});
  $('critical-mode').addEventListener('change',()=>{
    state.critical=$('critical-mode').checked;
    if(state.critical){
      state.previous={base:state.normal,exp:state.visible['normal-exp'],log:state.visible['normal-log']};
      state.normal=M.CRITICAL;state.visible['normal-exp']=state.visible['normal-log']=true;
    }else if(state.previous){
      state.normal=state.previous.base;state.visible['normal-exp']=state.previous.exp;state.visible['normal-log']=state.previous.log;state.previous=null;
    }
    syncControls();requestDraw();
  });
  $('symmetry-toggle').addEventListener('click',()=>{state.symmetry=!state.symmetry;syncControls();requestDraw();});
  $('pan-toggle').addEventListener('click',()=>{state.pan=!state.pan;syncControls();});
  function zoom(factor,anchor) {
    const old=state.view.span, next=clamp(old*factor,2,120);
    if(anchor){const p=world(anchor),ratio=next/old;state.view.cx=p.x+(state.view.cx-p.x)*ratio;state.view.cy=p.y+(state.view.cy-p.y)*ratio;}
    state.view.span=next;requestDraw();
  }
  $('zoom-in').addEventListener('click',()=>zoom(.8));
  $('zoom-out').addEventListener('click',()=>zoom(1.25));
  $('home-view').addEventListener('click',()=>{state.view=defaultView();requestDraw();});
  $('fit-points').addEventListener('click',()=>{state.view=M.fitIntersections(intersections);requestDraw();});
  $('reset').addEventListener('click',()=>{
    state.normal=2;state.fractional=.5;state.critical=false;state.previous=null;state.symmetry=false;state.pan=false;state.selected=null;state.view=defaultView();
    state.visible={'normal-exp':true,'normal-log':true,'fractional-exp':false,'fractional-log':false};
    syncControls();requestDraw();
  });
  svg.addEventListener('pointerdown',event=>{
    if(!state.pan||event.button!==0||event.target.closest('.intersection'))return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,cx:state.view.cx,cy:state.view.cy,scale:metrics.scale};
    svg.setPointerCapture(event.pointerId);svg.classList.add('is-panning');
  });
  svg.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    state.view.cx=clamp(drag.cx-(event.clientX-drag.x)/drag.scale,-200,200);
    state.view.cy=clamp(drag.cy+(event.clientY-drag.y)/drag.scale,-200,200);
    requestDraw();
  });
  function stopDrag(){drag=null;svg.classList.remove('is-panning');}
  svg.addEventListener('pointerup',stopDrag);svg.addEventListener('pointercancel',stopDrag);svg.addEventListener('lostpointercapture',stopDrag);
  svg.addEventListener('wheel',event=>{
    if(!state.pan||event.ctrlKey||event.metaKey)return;
    event.preventDefault();const r=svg.getBoundingClientRect();
    zoom(event.deltaY>0?1.1:1/1.1,{x:event.clientX-r.left,y:event.clientY-r.top});
  },{passive:false});
  new ResizeObserver(requestDraw).observe(wrap);
  syncControls();draw();
})();
