(()=>{
 'use strict';const W=WaveCore,L=ScienceLab,$=id=>document.getElementById(id),canvas=$('wave'),ctx=canvas.getContext('2d');let topic='water-int',time=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,last=0,lastText=0,study=false;
 const state={wavelength:40,separation:120,aperture:70,troughs:true,heatmap:false,px:0,py:180,opticalLambda:.55,slitWidth:40,slitDistance:180,screenDistance:1000,orientation:'vertical',envelope:false};let field=null;
 const colors={'.45':'#6c9dff','.55':'#5cdd9c','.65':'#ff777c'};
 // A cached HTML page may still contain the previous meeting shortcut.
 // Normalize that older shell before binding the new shared controls.
 if(!$('observation-controls')){
   const group=document.createElement('div');
   group.id='observation-controls';group.className='wave-control-group';
   group.setAttribute('role','group');group.setAttribute('aria-label','觀測位置');
   group.innerHTML='<span class="wave-control-label">觀測位置</span><div class="actions"><button id="probe-antinode" aria-pressed="false">觀察波腹</button><button id="probe-node" aria-pressed="false">觀察波節</button><span id="probe-selection" class="muted"></span></div>';
   const previous=$('meeting-actions');
   if(previous)previous.replaceWith(group);else $('legend').after(group);
   const clock=$('time-controls');clock.className='wave-control-group';
   clock.setAttribute('role','group');clock.setAttribute('aria-label','時間控制');
   clock.innerHTML='<span class="wave-control-label">時間控制</span><div class="actions"><button id="pause">暫停</button><button id="quarter">前進 ¼ 週期</button><button id="half-period">前進 ½ 週期</button><button id="reset-time">重設時間</button><select id="speed" aria-label="播放速度"><option value="1">正常速度</option><option value="0.25">慢放 ¼ 倍</option></select></div>';
   $('probe').before(clock);
 }

 const questions={
 'water-int':[
 {id:'crest-crest',question:'同相的兩波源，某點同時遇到波峰＋波峰，屬於哪一種干涉？',options:['建設性干涉','破壞性干涉','沒有干涉'],answer:0,hint:'兩個位移方向相同，相加後更大。',explain:'波峰＋波峰加強向上的位移；波谷＋波谷加強向下的位移，兩者都對應建設性干涉。'},
 {id:'crest-trough',question:'在等振幅的教學模型中，某點一個波峰與另一個波谷相遇，結果如何？',options:['建設性干涉','破壞性干涉','波從此消失、不再傳播'],answer:1,hint:'把一正一負、大小相等的位移相加。',explain:'兩分波位移抵銷，該點為破壞性干涉；兩個波仍各自繼續傳播。'},
 {id:'zero',question:'波腹通過平衡位置時，瞬時合成位移為 0，表示振幅也變成 0 嗎？',options:['是，已變為波節','不是，它仍是建設性干涉的位置','代表兩個波源停止'],answer:1,hint:'位移描述現在的位置；振幅描述振動可達的最大位移。',explain:'波腹會上下振動、經過平衡位置。瞬時位移為 0 不代表振幅為 0；波節才是在此理想模型中始終不動的位置。'},
 {id:'trough-map',question:'圖中只畫波峰線，兩組波峰之間的波谷交點應如何判斷？',options:['兩個波谷相遇，仍是建設性干涉','沒有畫線就代表沒有波','一定是破壞性干涉'],answer:0,hint:'沒有畫出來的波谷仍然存在。',explain:'波谷＋波谷也會相加。可開啟虛線波谷，再暫停動畫觀察。'},
 {id:'frequency',question:'同相兩波源、波速固定，頻率加倍後，原本精確的波節可能變成什麼？',options:['波腹','一定仍是波節','兩波源都停止'],answer:0,hint:'波長減半；原本相差半個波長，現在相差一個新波長。',explain:'原本路徑差為半整數個舊波長，頻率加倍後變成整數個新波長，因而轉為建設性干涉。原本精確的波腹則仍是波腹。'}
 ],
 'water-diff':[
 {id:'opening',question:'波長固定，狹縫逐漸變窄，通過後的波通常如何改變？',options:['向側方擴散更明顯','完全不會擴散','波速一定加倍'],answer:0,hint:'比較開口寬度與波長的相對大小。',explain:'開口寬度接近波長或更小時，繞射通常更明顯；同介質中不能因開口變窄就認定波速改變。'},
 {id:'wavelength',question:'開口固定，將波長加長，繞射程度通常如何？',options:['更明顯','更不明顯','與波長無關'],answer:0,hint:'波長相對於開口越大，越容易看出側向擴散。',explain:'繞射取決於波長相對於開口或障礙物的尺度；不是只有狹縫才會發生繞射。'},
 {id:'speaker',question:'長方形喇叭開口，若希望水平方向擴散較廣，應讓哪個方向較窄？',options:['水平方向較窄，長邊直立','垂直方向較窄，長邊橫放','與開口方向無關'],answer:0,hint:'哪個方向的開口窄，該方向繞射較明顯。',explain:'依講義的開口繞射模型，長邊直立使水平開口較窄，有利於水平擴散。真實喇叭另受號角與結構影響。'},
 {id:'ultrasound',question:'在同介質中，超音波比一般可聽聲波頻率高，對同一障礙物通常有何差異？',options:['波長較短，繞射較不明顯','波長較長，繞射更明顯','完全不能反射'],answer:0,hint:'同介質中，頻率越高，波長越短。',explain:'波長較短時，對同一尺度障礙物的繞射通常較不明顯；仍可發生反射。'}
 ],
 'light-int':[
 {id:'pattern',question:'理想雙狹縫干涉，在小角度範圍內的亮帶有何特徵？',options:['間距近似相等，理想亮度相同','只有一條亮帶','中央亮帶寬度必為旁側兩倍'],answer:0,hint:'把基本雙狹縫與單狹縫圖樣放在一起比較。',explain:'基本模型中的亮帶近似等間距、等亮。實際有限縫寬還會形成繞射包絡，使亮帶亮度隨位置改變。'},
 {id:'orientation',question:'兩條直立且左右並排的狹縫，屏幕上的干涉亮紋通常沿哪個方向延伸？',options:['直立，與狹縫長軸平行','橫向，與狹縫長軸垂直','只出現兩個亮點'],answer:0,hint:'亮度沿兩縫分離的方向改變，條紋沿另一方向延伸。',explain:'兩縫左右分開，亮暗沿水平方向交替，因此條紋本身直立；可切換狹縫方向觀察。'},
 {id:'thin-film',question:'下列哪個是薄膜干涉的典型例子？',options:['肥皂泡膜的彩色','彩虹的分色','白紙的漫反射'],answer:0,hint:'想想薄膜前、後表面反射回來的光。',explain:'肥皂泡與水面油膜可由薄膜前後表面反射光的干涉形成顏色。彩虹則主要涉及折射、內反射與色散。'},
 {id:'dvd',question:'依講義的 DVD 模型，凹坑上下反射光相互抵銷，對應哪一種現象？',options:['破壞性干涉','光完全無法反射','建設性干涉'],answer:0,hint:'題目描述兩束反射光相互抵銷。',explain:'反射光有適當相位差時會破壞性干涉，使接收亮度降低。光碟表面的彩色則還涉及密集軌道造成的光柵繞射。'}
 ],
 'light-diff':[
 {id:'central',question:'單狹縫遠場繞射的中央亮帶，通常有何特徵？',options:['最亮、較寬，約為旁側亮帶兩倍寬','與每條旁側亮帶完全一樣','中央必定全暗'],answer:0,hint:'觀察中央亮帶兩側第一條暗紋之間的範圍。',explain:'在遠場、小角度模型下，以相鄰暗紋為邊界，中央亮帶約為旁側亮帶兩倍寬，旁側亮帶也較暗。'},
 {id:'narrow',question:'光色與屏幕位置不變，把單狹縫變窄，中央亮帶如何改變？',options:['變寬','變窄','寬度一定不變'],answer:0,hint:'狹縫越窄，繞射角度越大。',explain:'開口較窄時，繞射擴展更明顯，中央亮帶變寬。圖中亮度正規化，主要比較形狀，不能用來判斷總通光量。'},
 {id:'red',question:'同一狹縫與屏幕位置，紅光相較於藍光的中央亮帶通常如何？',options:['較寬','較窄','紅光不會繞射'],answer:0,hint:'紅光波長比藍光長。',explain:'其他條件相同時，波長越長，繞射越明顯，因此紅光中央亮帶較寬。'}
 ]};
 function range(id,label,min,max,value,unit,step=1){return `<div class="control"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}" id="${id}-out">${value}${unit}</output></div>`;}
 function wire(id,key,unit='',rebuild=false){$(id).oninput=()=>{state[key]=+$(id).value;$(id+'-out').textContent=state[key]+unit;if(rebuild)buildField();draw();};}
 function mode(value){study=value;$('study-panel').hidden=!study;$('free-panel').hidden=study;$('free-mode').setAttribute('aria-pressed',!study);$('study-mode').setAttribute('aria-pressed',study);syncURL();}
 function syncURL(){const q=new URLSearchParams({topic});if(study)q.set('mode','study');history.replaceState(null,'','?'+q);}
 function selectTopic(value){topic=value;time=0;field=null;document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.topic===topic));const water=topic.startsWith('water'),interference=topic.endsWith('int');$('scene-title').textContent=({'water-int':'水波干涉｜追蹤同一點的振動','water-diff':'水波繞射｜比較開口與波長','light-int':'光波干涉｜雙狹縫與亮暗條紋','light-diff':'光波繞射｜單狹縫的中央亮帶'})[topic];$('scene-caption').textContent=water?interference?'點選水面移動 P 點，或用下方按鈕選波腹、波節。':'波從左方通過開口，觀察它往側方擴散的程度。':'左側為狹縫示意，右側為屏幕正視圖；亮度曲線沿垂直條紋的方向取樣。';$('time-controls').hidden=!water;$('observation-controls').hidden=!(water&&interference);$('legend').innerHTML='';delete $('legend').dataset.view;$('probe').hidden=!(water&&interference);
 if(water&&interference){$('controls').innerHTML=range('lambda','波長',16,80,state.wavelength,' cm')+range('separation','波源間距',60,220,state.separation,' cm')+'<div class="row"><button id="crest-view">只看波峰</button><button id="both-view">波峰＋波谷</button><button id="double-frequency">頻率加倍（波速固定）</button></div><p class="muted">觀測點可直接點選水面，也可用下方滑桿調整。</p>'+range('probe-x','P 點水平位置',-280,280,state.px,' cm')+range('probe-y','P 點離波源連線',40,330,state.py,' cm');wire('lambda','wavelength',' cm');wire('separation','separation',' cm');wire('probe-x','px',' cm');wire('probe-y','py',' cm');$('crest-view').onclick=()=>{state.troughs=false;draw();};$('both-view').onclick=()=>{state.troughs=true;draw();};$('double-frequency').onclick=()=>{if(state.wavelength<32)return;state.wavelength/=2;$('lambda').value=state.wavelength;$('lambda-out').textContent=state.wavelength+' cm';draw();};$('model-note').textContent='藍色來自 S₁，金色來自 S₂；實線是波峰、虛線是波谷。觀察波腹／波節會暫停在同峰相加／一峰一谷相遇的時刻。波節全程反相抵銷，但不代表每一瞬間都恰好是峰頂遇到谷底；也可能一起通過平衡位置。圖中的位移—時間曲線與主圖同步。';$('takeaways').innerHTML='<p>波峰＋波峰、波谷＋波谷：建設性干涉。等大波峰＋波谷：破壞性干涉。</p><p>振幅與瞬時位移不同：波腹通過平衡位置，位移為 0，仍維持最大的振幅。</p>';$('tasks').innerHTML='<p>① 按「觀察波腹」，再前進四分之一週期，觀察位移與振幅。</p><p>② 按「觀察波節」，看看兩個分波如何抵銷。</p><p>③ 觀察波節後把頻率加倍，觀察該位置是否仍是波節。</p>';
 }else if(water){$('controls').innerHTML=range('lambda','波長',16,80,state.wavelength,' cm')+range('aperture','開口寬度',16,180,state.aperture,' cm')+'<div class="actions"><button id="narrow-opening">比較窄開口</button><button id="wide-opening">比較寬開口</button></div>';wire('lambda','wavelength',' cm',true);wire('aperture','aperture',' cm',true);$('narrow-opening').onclick=()=>{state.aperture=24;$('aperture').value=24;$('aperture-out').textContent='24 cm';buildField();draw();};$('wide-opening').onclick=()=>{state.aperture=160;$('aperture').value=160;$('aperture-out').textContent='160 cm';buildField();draw();};$('model-note').textContent='波長固定時，開口越窄，通常越能看出側向擴散。繞射並非只在單狹縫發生；遇到障礙物邊緣也會發生。這裡以二維次波源疊加示意波前，顏色正規化，不比較總能量。';$('takeaways').innerHTML='<p>先固定波長只改開口，再固定開口只改波長，每次改一個條件。</p><p>長方形開口在哪個方向較窄，該方向通常有較明顯的繞射。</p>';$('tasks').innerHTML='<p>① 比較窄開口與寬開口，哪一個更接近半圓形波前？</p><p>② 固定開口，改變波長，再解釋差異。</p><p>③ 想讓喇叭水平方向擴散更廣，長方形開口應如何擺？</p>';buildField();
 }else{$('controls').innerHTML='<div class="control"><label for="light-color">光色</label><select id="light-color"><option value="0.45">藍光</option><option value="0.55">綠光</option><option value="0.65">紅光</option></select></div>'+range('slit-width','單一狹縫寬度',20,80,state.slitWidth,' μm')+(interference?range('slit-distance','兩縫中心間距',100,300,state.slitDistance,' μm'):'')+range('screen-distance','狹縫到屏幕距離',500,1500,state.screenDistance,' mm',50)+'<div class="control"><label for="orientation">狹縫長軸方向</label><select id="orientation"><option value="vertical">直立</option><option value="horizontal">橫放</option></select></div>'+(interference?'<label class="row"><input type="checkbox" id="envelope">加入有限縫寬的繞射效果</label>':'');$('light-color').value=String(state.opticalLambda);$('orientation').value=state.orientation;$('light-color').onchange=()=>{state.opticalLambda=+$('light-color').value;draw();};$('orientation').onchange=()=>{state.orientation=$('orientation').value;draw();};wire('slit-width','slitWidth',' μm');wire('screen-distance','screenDistance',' mm');if(interference){wire('slit-distance','slitDistance',' μm');$('envelope').checked=state.envelope;$('envelope').onchange=()=>{state.envelope=$('envelope').checked;draw();};}$('model-note').textContent=interference?'基本模式採等強度、相干雙狹縫並略去單縫包絡：亮帶近似等間距、等亮。單縫寬度只在勾選「加入有限縫寬」後影響圖樣。亮度已正規化，屏幕增強暗紋附近的顯示對比；曲線保留相對強度，不比較總通光量。':'遠場、小角度模型；以相鄰暗紋為邊界，中央亮帶約為旁側亮帶的兩倍寬。縮窄狹縫或加長波長，中央亮帶變寬。亮度正規化並增強顯示對比，曲線保留相對強度；不代表縮縫後光更亮。';$('takeaways').innerHTML=interference?'<p>雙狹縫形成亮暗相間條紋；條紋長軸通常平行於狹縫長軸。</p><p>旋轉狹縫，先預測屏幕條紋方向再觀察。有限縫寬會使各亮帶受到繞射包絡調制。</p>':'<p>中央亮帶最亮、最寬，旁側亮帶亮度逐漸降低。</p><p>繞射與干涉都來自波的疊加；單狹縫不同位置發出的次波也會互相干涉。</p>';$('tasks').innerHTML=interference?'<p>① 把兩縫拉遠，亮帶間距如何改變？</p><p>② 旋轉狹縫，亮紋也會旋轉嗎？</p><p>③ 勾選有限縫寬，再與基本圖樣比較。</p>':'<p>① 中央亮帶與旁側亮帶，哪個更寬、更亮？</p><p>② 先改縫寬，再換光色，分別比較。</p><p>③ 切回雙狹縫，說出兩種圖樣的差異。</p>';
 }
 if(water&&interference){
   $('probe').innerHTML='<section class="probe-inspector" aria-label="P 點的分波與合成"><h3>P 點：看兩個分波如何相加</h3><p class="muted">同一位置的位移—時間圖，直虛線表示現在。</p><div class="probe-waves">'+[
     ['source-one','S₁ 分波','#287fb0','u1'],['source-two','S₂ 分波','#b67826','u2'],['source-sum','疊加結果','#416e60','sum']
   ].map(([cls,label,color,id],i)=>`<div class="probe-wave ${cls}"><strong>${label}</strong><div class="phase-name" id="phase-${i}"></div><svg viewBox="0 0 160 120" role="img" aria-label="${label}的位移隨時間變化"><path d="M3 60H157" stroke="#b5c4d2"/><path d="M80 8V112" stroke="#9aaec0" stroke-dasharray="4 4"/><polyline id="probe-wave-${i}" fill="none" stroke="${color}" stroke-width="3"/><circle id="probe-dot-${i}" cx="80" cy="60" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg><div class="probe-value" id="${id}"></div></div>`).join('')+'</div><div class="probe-equation" id="probe-equation"></div><p class="probe-explain" id="meeting-description"></p><p class="note" id="amplitude"></p><p class="probe-help">可按上方「觀察波腹／觀察波節」比較加強與抵銷，或直接點選水面。播放與前進時間都會同步更新三張波形圖。</p></section>';
 }

 L.quiz($('study-panel'),questions[topic],'jutor.wave.'+topic+'.v1');syncURL();draw();}
 function setProbe(x,y){state.px=x;state.py=y;if($('probe-x')){$('probe-x').value=x;$('probe-x-out').textContent=x.toFixed(1)+' cm';$('probe-y').value=y;$('probe-y-out').textContent=y+' cm';}draw();}
 function text(t,x,y,color='#e3edf7',size=16){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.fillText(t,x,y);}
 function showAntinode(){
   state.px=0;
   state.py=180;
   const antinode=W.point(state.px,state.py,state.separation,state.wavelength);
   time=W.timeAtCrest(antinode.r1,state.wavelength);
   paused=true;
   state.troughs=true;
   setProbe(state.px,state.py);
 }
 function showNodeMeeting(){
   const selected=W.point(state.px,state.py,state.separation,state.wavelength,time);
   // Keep an already selected node; otherwise choose a visible first nodal point.
   if(selected.type!=='destructive'){
     state.px=W.pointAtDifference(state.wavelength/2,180,state.separation);
     state.py=180;
   }
   const node=W.point(state.px,state.py,state.separation,state.wavelength);
   time=W.timeAtCrest(node.r1,state.wavelength);
   paused=true;
   state.troughs=true;
   setProbe(state.px,state.py);
 }
 function phaseName(value){
   if(value>.999)return '波峰';
   if(value<-.999)return '波谷';
   if(Math.abs(value)<.005)return '通過平衡位置';
   return value>0?'在平衡位置上方':'在平衡位置下方';
 }
 function signed(value){
   const n=Math.abs(value)<.005?0:value;
   return (n>0?'+':n<0?'−':'')+Math.abs(n).toFixed(2);
 }
 function updateProbe(p){
   const values=[p.u1,p.u2,p.displacement];
   ['u1','u2','sum'].forEach((id,i)=>$(id).textContent=signed(values[i]));
   $('phase-0').textContent=phaseName(p.u1);
   $('phase-1').textContent=phaseName(p.u2);
   $('phase-2').textContent=p.type==='destructive'?'始終抵銷':Math.abs(p.displacement)<.005?'此刻位移為 0':p.type==='constructive'?'同向加強':'相加後的位移';
   $('probe-equation').textContent=`${signed(p.u1)} ＋（${signed(p.u2)}）＝ ${signed(p.displacement)}`;
   const crestTrough=Math.abs(p.u1)>.999&&Math.abs(p.u2)>.999&&p.type==='destructive';
   $('meeting-description').textContent=crestTrough?'此刻一個波峰與一個波谷在 P 相遇，等大、反向，合成位移為 0。':p.type==='destructive'?Math.abs(p.u1)<.005?'兩個分波同時通過平衡位置；前後仍反相，P 的合成振幅一直為 0。':'此刻兩個分波等大、反向，仍互相抵銷；再播放可看到峰頂與谷底相遇。':p.type==='constructive'?'兩個分波同相；即使一起經過平衡位置，合成振幅仍為 2。':'P 處為一般疊加；比較兩個分波的正負與相加結果。';
   const kind=p.type==='destructive'?'破壞性干涉（波節）':p.type==='constructive'?'建設性干涉（波腹）':'部分加強／抵銷';
   $('amplitude').textContent=`P 點：${kind}；合成振幅 ${p.amplitude.toFixed(2)}（單波振幅＝1）。路徑差約 ${(Math.abs(p.difference)/state.wavelength).toFixed(2)} 個波長。`;
   const points=[[],[],[]];
   for(let j=0;j<=80;j++){
     const sample=W.point(state.px,state.py,state.separation,state.wavelength,time+(j-40)/40);
     [sample.u1,sample.u2,sample.displacement].forEach((v,i)=>points[i].push(`${j*2},${60-v*24}`));
   }
   values.forEach((v,i)=>{
     $('probe-wave-'+i).setAttribute('points',points[i].join(' '));
     $('probe-dot-'+i).setAttribute('cy',60-v*24);
   });
 }
 function waterInterference(){
   const p=W.point(state.px,state.py,state.separation,state.wavelength,time);
   const sources=[360-state.separation/2,360+state.separation/2];
   const sourceColors=['#82c4e9','#f1c16f'];
   ctx.fillStyle='#102b40';ctx.fillRect(0,0,720,420);
   ctx.save();ctx.beginPath();ctx.rect(0,0,720,381);ctx.clip();
   sources.forEach((sx,i)=>{
     for(let kind=0;kind<(state.troughs?2:1);kind++){
       ctx.setLineDash(kind?[12,8]:[]);
       ctx.strokeStyle=sourceColors[i];ctx.lineWidth=1.8;ctx.globalAlpha=.5;
       for(let r=((time+(kind?.5:0))%1)*state.wavelength;r<900;r+=state.wavelength){
         ctx.beginPath();ctx.arc(sx,380,r,Math.PI,Math.PI*2);ctx.stroke();
       }
     }
   });
   // At extrema the actual crest/trough wavefront passes through P; emphasize it.
   [p.u1,p.u2].forEach((v,i)=>{
     if(Math.abs(v)<.999||(!state.troughs&&v<0))return;
     ctx.globalAlpha=1;ctx.strokeStyle=sourceColors[i];ctx.lineWidth=4;
     ctx.setLineDash(v<0?[12,8]:[]);
     const distance=i?p.r2:p.r1,offset=v<0?.5:0;
     const radius=(Math.round(distance/state.wavelength-time-offset)+time+offset)*state.wavelength;
     ctx.beginPath();ctx.arc(sources[i],380,radius,Math.PI,Math.PI*2);ctx.stroke();
   });
   ctx.restore();ctx.setLineDash([]);
   sources.forEach((x,i)=>{
     ctx.fillStyle=sourceColors[i];ctx.beginPath();ctx.arc(x,380,7,0,Math.PI*2);ctx.fill();text('S'+(i+1),x-9,410);
   });
   const x=360+state.px,y=380-state.py;
   ctx.strokeStyle='#adbdc9';ctx.globalAlpha=.6;ctx.setLineDash([2,9]);ctx.lineWidth=1;
   sources.forEach(sx=>{ctx.beginPath();ctx.moveTo(sx,380);ctx.lineTo(x,y);ctx.stroke();});
   ctx.globalAlpha=1;ctx.setLineDash([]);ctx.strokeStyle='#fff';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();text('P',x+18,y-12);
   if(Math.abs(p.u1)>.999&&Math.abs(p.u2)>.999){
     ctx.fillStyle='#102b40';ctx.fillRect(12,10,540,35);
     text(`S₁ ${phaseName(p.u1)}（${p.u1>0?'實線':'虛線'}） ＋ S₂ ${phaseName(p.u2)}（${p.u2>0?'實線':'虛線'}）`,22,34,'#fff',19);
   }
   const legendKey=String(state.troughs);
   if($('legend').dataset.view!==legendKey){
     $('legend').dataset.view=legendKey;
     $('legend').innerHTML='<span class="wave-source-key source-one">藍色＝S₁</span><span class="wave-source-key source-two">金色＝S₂</span><span><i class="crest-key"></i>實線＝波峰</span>'+(state.troughs?'<span><i class="trough-key"></i>虛線＝波谷</span>':'<span>目前隱藏波谷</span>');
   }
   $('crest-view').setAttribute('aria-pressed',!state.troughs);
   $('both-view').setAttribute('aria-pressed',state.troughs);
   $('probe-antinode').setAttribute('aria-pressed',p.type==='constructive');
   $('probe-node').setAttribute('aria-pressed',p.type==='destructive');
   $('probe-selection').textContent=p.type==='partial'?'自由選點':'';
   updateProbe(p);
   $('double-frequency').disabled=state.wavelength<32;
 }
 function buildField(){if(topic!=='water-diff')return;const nw=180,nh=105,real=new Float32Array(nw*nh),imag=new Float32Array(nw*nh);let max=0;for(let yy=0;yy<nh;yy++)for(let xx=46;xx<nw;xx++){const x=xx*4-180,y=yy*4;let re=0,im=0;for(let n=0;n<41;n++){const sy=210+(n/40-.5)*state.aperture,r=Math.hypot(x,y-sy),w=1/Math.sqrt(Math.max(r,8)),phase=2*Math.PI*r/state.wavelength;re+=Math.cos(phase)*w;im+=Math.sin(phase)*w;}const i=yy*nw+xx;real[i]=re;imag[i]=im;if(xx>50)max=Math.max(max,Math.hypot(re,im));}const buffer=document.createElement('canvas');buffer.width=nw;buffer.height=nh;field={real,imag,max,buffer,context:buffer.getContext('2d'),image:buffer.getContext('2d').createImageData(nw,nh)};}
 function waterDiffraction(){ctx.fillStyle='#102b40';ctx.fillRect(0,0,720,420);if(!field)buildField();const c=Math.cos(time*2*Math.PI),s=Math.sin(time*2*Math.PI),data=field.image.data;for(let i=0;i<field.real.length;i++){const v=Math.max(-1,Math.min(1,(field.real[i]*c+field.imag[i]*s)/field.max*1.5));data[i*4]=25+Math.max(0,v)*115;data[i*4+1]=65+Math.abs(v)*100;data[i*4+2]=95+Math.max(0,-v)*145;data[i*4+3]=255;}field.context.putImageData(field.image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(field.buffer,0,0,720,420);ctx.fillStyle='#102b40';ctx.fillRect(0,0,180,420);ctx.strokeStyle='#8ec8ed';ctx.lineWidth=2;for(let x=(time%1)*state.wavelength;x<180;x+=state.wavelength){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,420);ctx.stroke();}ctx.fillStyle='#d4b77c';ctx.fillRect(175,0,10,210-state.aperture/2);ctx.fillRect(175,210+state.aperture/2,10,210-state.aperture/2);text('入射波 →',20,30);text('開口',190,28);text('次波源疊加的波前示意',420,400);}
 function light(){ctx.fillStyle='#102334';ctx.fillRect(0,0,720,420);const interference=topic==='light-int',vertical=state.orientation==='vertical',color=colors['.'+String(state.opticalLambda).split('.')[1]]||'#5cdd9c';ctx.fillStyle='#687b8c';ctx.fillRect(165,115,105,170);ctx.fillStyle=color;if(interference){if(vertical){ctx.fillRect(194,157,4,85);ctx.fillRect(238,157,4,85);}else{ctx.fillRect(181,175,73,4);ctx.fillRect(181,218,73,4);}}else{if(vertical)ctx.fillRect(215,157,Math.max(3,state.slitWidth/8),85);else ctx.fillRect(181,198,73,Math.max(3,state.slitWidth/8));}ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(25,200);ctx.lineTo(153,200);ctx.stroke();text('單色光',30,180,color);ctx.strokeStyle='#86a1b8';ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(270,157);ctx.lineTo(420,80);ctx.moveTo(270,242);ctx.lineTo(420,330);ctx.stroke();ctx.setLineDash([]);text(interference?'雙狹縫（示意）':'單狹縫（示意）',158,317);text('屏幕正視圖',435,43);const x0=430,y0=65,width=250,height=280,span=80,lambda=state.opticalLambda;const intensity=p=>{const sinTheta=Math.sin(Math.atan(p/state.screenDistance));return interference?W.doubleIntensity(sinTheta,state.slitDistance,lambda,state.envelope?state.slitWidth:0):W.singleIntensity(sinTheta,state.slitWidth,lambda);};ctx.fillStyle='#02070b';ctx.fillRect(x0,y0,width,height);const rgb=color.match(/\w\w/g).map(h=>parseInt(h,16));for(let j=0;j<(vertical?width:height);j++){const extent=vertical?width:height,p=(j/extent-.5)*span,I=intensity(p);ctx.fillStyle=`rgb(${rgb.map(n=>Math.round(n*Math.sqrt(I))).join(',')})`;if(vertical)ctx.fillRect(x0+j,y0,1,height);else ctx.fillRect(x0,y0+j,width,1);}ctx.strokeStyle='#91a7b9';ctx.strokeRect(x0,y0,width,height);ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.7;for(let j=0;j<=width;j++){const I=intensity((j/width-.5)*span),x=x0+j,y=395-I*35;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();text('亮度分布（垂直條紋方向取樣）',430,415,'#d0dfed',12);if(!interference){text('中央最亮、較寬；兩側較暗',30,365,'#d0dfed',15);}else text(state.envelope?'含單縫繞射包絡':'基本理想干涉圖樣',30,365,'#d0dfed',15);}
 function draw(){if(topic==='water-int')waterInterference();else if(topic==='water-diff')waterDiffraction();else light();$('pause').textContent=paused?'播放':'暫停';}
 canvas.addEventListener('click',e=>{if(topic!=='water-int')return;const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*720/b.width,y=(e.clientY-b.top)*420/b.height;setProbe(Math.max(-280,Math.min(280,x-360)),Math.max(40,Math.min(330,380-y)));});$('pause').onclick=()=>{paused=!paused;draw();};$('quarter').onclick=()=>{paused=true;time=(time+.25)%100;draw();};$('half-period').onclick=()=>{paused=true;time=(time+.5)%100;draw();};$('probe-antinode').onclick=showAntinode;$('probe-node').onclick=showNodeMeeting;$('reset-time').onclick=()=>{time=0;draw();};$('speed').onchange=()=>{speed=+$('speed').value;};$('free-mode').onclick=()=>mode(false);$('study-mode').onclick=()=>mode(true);document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>selectTopic(b.dataset.topic));
 function tick(now){if(!last)last=now;const dt=Math.min((now-last)/1000,.1);last=now;if(!paused&&topic.startsWith('water')&&!document.hidden){time=(time+dt*40/state.wavelength*speed)%100;if(now-lastText>65){draw();lastText=now;}}requestAnimationFrame(tick);}const params=new URLSearchParams(location.search);const initial=params.get('topic');selectTopic(Object.hasOwn(questions,initial)?initial:'water-int');mode(params.get('mode')==='study');requestAnimationFrame(tick);
})();
