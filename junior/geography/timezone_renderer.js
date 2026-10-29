(function(){
  'use strict';
  const C=window.TimezoneCore,TAU=Math.PI*2;
  class GlobeRenderer{
    constructor(canvas,map,onAction){this.canvas=canvas;this.map=map;this.ctx=canvas.getContext('2d');this.mctx=map.getContext('2d');this.onAction=onAction;this.yaw=115;this.pitch=15;this.grid=true;this.labels=true;this.hits=[];this.mapHits=[];
      this.texture=document.createElement('canvas');this.texture.width=1440;this.texture.height=720;const t=this.texture.getContext('2d',{willReadFrequently:true});t.fillStyle='#24738d';t.fillRect(0,0,1440,720);t.fillStyle='#73a68b';
      for(const ring of window.TimezoneLand){t.beginPath();let oldX=null;for(let i=0;i<ring.length;i++){const x=(ring[i][0]+180)*4,y=(90-ring[i][1])*4;if(i===0||oldX!==null&&Math.abs(x-oldX)>720)t.moveTo(x,y);else t.lineTo(x,y);oldX=x;}t.closePath();t.fill();}this.tex=t.getImageData(0,0,1440,720).data;
      this.raster=document.createElement('canvas');this.raster.width=this.raster.height=390;this.rctx=this.raster.getContext('2d');this.image=this.rctx.createImageData(390,390);
      this.shade=document.createElement('canvas');this.shade.width=450;this.shade.height=135;this.sctx=this.shade.getContext('2d');this.shadeImage=this.sctx.createImageData(450,135);this.mapNormals=new Float32Array(450*135*3);
      for(let y=0;y<135;y++)for(let x=0;x<450;x++){const n=C.vector((x+.5)/450*360-180,90-(y+.5)/135*180),i=(y*450+x)*3;this.mapNormals[i]=n.x;this.mapNormals[i+1]=n.y;this.mapNormals[i+2]=n.z;}this.bind();
    }
    bind(){let drag=null;const canvas=this.canvas;
      canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,moved:false};canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;this.yaw=C.mod(drag.yaw-dx*.4+180,360)-180;this.pitch=Math.max(-70,Math.min(70,drag.pitch+dy*.3));this.draw();});
      canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)this.onAction({type:'view'});else{const p=this.point(e,canvas),hit=this.hits.filter(h=>Math.hypot(h.x-p.x,h.y-p.y)<h.r).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(hit)this.onAction({type:'city',city:hit.city});}});
      canvas.addEventListener('pointercancel',()=>{drag=null;});
      canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();this.yaw+=e.key==='ArrowRight'?15:e.key==='ArrowLeft'?-15:0;this.pitch=Math.max(-70,Math.min(70,this.pitch+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)));this.draw();this.onAction({type:'view'});});
      this.map.addEventListener('click',e=>{const p=this.point(e,this.map),hit=this.mapHits.find(h=>Math.hypot(h.x-p.x,h.y-p.y)<15);if(hit)this.onAction({type:'city',city:hit.city});else{this.yaw=p.x/this.map.width*360-180;this.pitch=0;this.draw();this.onAction({type:'view'});}});
      this.map.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.yaw+=e.key==='ArrowRight'?30:-30;this.draw();this.onAction({type:'view'});}});
      this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(canvas);
    }
    point(e,canvas){const r=canvas.getBoundingClientRect();/* object-fit contain may letterbox the canvas element */const scale=Math.min(r.width/canvas.width,r.height/canvas.height),ox=(r.width-canvas.width*scale)/2,oy=(r.height-canvas.height*scale)/2;return {x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale};}
    focus(id){const c=C.city(id);this.yaw=c.lon;this.pitch=c.lat*.55;this.draw();}
    update(state){this.state=state;this.draw();}
    draw(){if(!this.state)return;const {epoch,from,to,hideTimes}=this.state,season=C.season(this.state.season),solar=C.solarVector(epoch,season.declination),ctx=this.ctx,w=this.canvas.width,h=this.canvas.height,cx=w/2,cy=h*.48,R=h*.40,rect=this.canvas.getBoundingClientRect(),fontScale=Math.max(1,Math.min(2.5,1/Math.min(rect.width/w,rect.height/h)));
      const bg=ctx.createRadialGradient(cx,cy,40,cx,cy,w*.6);bg.addColorStop(0,'#183d52');bg.addColorStop(1,'#0b1d2c');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      for(let i=0;i<48;i++){ctx.fillStyle=i%3?'#a5c8df45':'#a5c8df80';ctx.beginPath();ctx.arc((i*113+31)%w,(i*i*17+29)%(h-35),i%3?.9:1.4,0,TAU);ctx.fill();}
      const s=this.raster.width,pixels=this.image.data,yaw=this.yaw*Math.PI/180,pitch=this.pitch*Math.PI/180,cp=Math.cos(pitch),sp=Math.sin(pitch),sy=Math.sin(yaw),cyaw=Math.cos(yaw),tex=this.tex;
      let i=0;for(let y=0;y<s;y++){const Y=1-(y+.5)*2/s;for(let x=0;x<s;x++,i+=4){const X=(x+.5)*2/s-1,rr=X*X+Y*Y;if(rr>1){pixels[i+3]=0;continue;}const z=Math.sqrt(1-rr),worldY=Y*cp+z*sp,worldZ=-Y*sp+z*cp,worldX=X*cyaw+worldZ*sy,worldZZ=-X*sy+worldZ*cyaw;
        const lon=Math.atan2(worldX,worldZZ),lat=Math.asin(Math.max(-1,Math.min(1,worldY))),tx=Math.min(1439,Math.max(0,Math.floor((lon/Math.PI+1)*720))),ty=Math.min(719,Math.max(0,Math.floor((.5-lat/Math.PI)*720))),j=(ty*1440+tx)*4,light=C.illumination({x:worldX,y:worldY,z:worldZZ},solar);
        const shade=light>0?.65+.35*Math.sqrt(light):.19+.10*Math.exp(light*12),rim=Math.pow(1-z,3)*35;pixels[i]=tex[j]*shade+rim*.25;pixels[i+1]=tex[j+1]*shade+rim*.65;pixels[i+2]=tex[j+2]*shade+rim;pixels[i+3]=255;
      }}this.rctx.putImageData(this.image,0,0);ctx.drawImage(this.raster,cx-R,cy-R,R*2,R*2);ctx.strokeStyle='#8ecbe87a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R+1,0,TAU);ctx.stroke();ctx.strokeStyle='#54b7d422';ctx.lineWidth=9;ctx.stroke();
      const project=(lon,lat)=>{const p=C.project(lon,lat,this.yaw,this.pitch);return{x:cx+p.x*R,y:cy-p.y*R,z:p.z};};
      const line=(points,color,dashed=false,width=.8)=>{ctx.beginPath();let open=false;for(const [lon,lat]of points){const p=project(lon,lat);if(p.z<0){open=false;continue;}if(!open){ctx.moveTo(p.x,p.y);open=true;}else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[4,5]:[]);ctx.stroke();ctx.setLineDash([]);};
      if(this.grid){for(let lon=-180;lon<180;lon+=15)line(Array.from({length:91},(_,i)=>[lon,-90+i*2]),lon%30===0?'#d1e5ed45':'#d1e5ed24');for(let lat=-60;lat<=60;lat+=30)line(Array.from({length:181},(_,i)=>[-180+i*2,lat]),lat===0?'#dbf1eb80':'#d1e5ed45',lat!==0);}
      if(this.grid){for(const latitude of [-23.44,23.44])line(Array.from({length:181},(_,i)=>[-180+i*2,latitude]),'#f0cb7c99',true,1.2);for(const latitude of [-66.56,66.56])line(Array.from({length:181},(_,i)=>[-180+i*2,latitude]),'#d9c6f1a0',true,1.2);}
      const direct=project(C.sunLongitude(epoch),season.declination);if(direct.z>0){ctx.fillStyle='#ffd16e';ctx.strokeStyle='#fff1ba';ctx.lineWidth=2;ctx.beginPath();ctx.arc(direct.x,direct.y,6,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(direct.x,direct.y,11,0,TAU);ctx.stroke();}
      line(Array.from({length:91},(_,i)=>[180,-90+i*2]),'#eea0be',true,1.7);
      this.hits=[];const occupied=[];
      const ordered=[C.city(from),...(to===from?[]:[C.city(to)]),...C.cities.filter(c=>c.id!==from&&c.id!==to)];
      for(const c of ordered){const p=project(c.lon,c.lat);if(p.z<.015)continue;const selected=c.id===from||c.id===to,color=c.id===from?'#7bf0ca':c.id===to?'#ffb181':'#e6eff4';ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,selected?5:3,0,TAU);ctx.fill();if(selected){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,9,0,TAU);ctx.stroke();}
        this.hits.push({x:p.x,y:p.y,r:18,city:c.id});if(!this.labels&&!selected)continue;if(fontScale>1.7&&!selected&&!['tokyo','london','newyork','sydney','dubai'].includes(c.id))continue;
        const time=hideTimes&&c.id!==from?' ?': ' '+C.timeLabel(C.parts(epoch,c.offset));const label=c.name+time;ctx.font=(selected?'bold ':'')+Math.round((selected?17:14)*fontScale)+'px system-ui';const width=ctx.measureText(label).width;let lx=p.x+12;if(lx+width>w-15)lx=p.x-width-12;let ly=p.y-10;
        const lineHeight=18*fontScale,collision=y=>occupied.some(r=>lx<r.x+r.w&&lx+width>r.x&&y-lineHeight<r.y+lineHeight&&y>r.y);let tries=0;while(collision(ly)&&tries++<4)ly+=lineHeight;if(tries>4&&!selected)continue;ly=Math.min(h-42,Math.max(22,ly));occupied.push({x:lx,y:ly-lineHeight,w:width});ctx.strokeStyle='#0a1e2a';ctx.lineWidth=4;ctx.strokeText(label,lx,ly);ctx.fillStyle=color;ctx.fillText(label,lx,ly);
      }
      const sunP=C.project(C.sunLongitude(epoch),season.declination,this.yaw,this.pitch),len=Math.hypot(sunP.x,sunP.y);let ax=len>.2?sunP.x/len:-1,ay=len>.2?-sunP.y/len:0;const sunX=cx+ax*(R+53),sunY=cy+ay*(R+53);ctx.strokeStyle='#e9b85c90';ctx.lineWidth=1;for(let k=-2;k<=2;k++){const ox=-ay*k*14,oy=ax*k*14;ctx.beginPath();ctx.moveTo(sunX-ax*18+ox,sunY-ay*18+oy);ctx.lineTo(cx+ax*R*.8+ox,cy+ay*R*.8+oy);ctx.stroke();}ctx.fillStyle='#ffd16e';ctx.beginPath();ctx.arc(sunX,sunY,13,0,TAU);ctx.fill();for(let a=0;a<TAU;a+=TAU/12){ctx.beginPath();ctx.moveTo(sunX+Math.cos(a)*17,sunY+Math.sin(a)*17);ctx.lineTo(sunX+Math.cos(a)*22,sunY+Math.sin(a)*22);ctx.stroke();}ctx.font='13px system-ui';ctx.fillStyle='#f6d292';ctx.textAlign='center';ctx.fillText(sunP.z<0?'太陽方向（背面）':'太陽方向',sunX,Math.min(h-15,sunY+36));ctx.textAlign='left';
      ctx.font='12px system-ui';ctx.fillStyle='#b6cedd';ctx.fillText(season.name+' · 直射'+season.direct,18,25);this.drawMap();
    }
    drawMap(){const ctx=this.mctx,w=this.map.width,h=this.map.height,{epoch,from,to}=this.state;ctx.fillStyle='#142f42';ctx.fillRect(0,0,w,h);ctx.drawImage(this.texture,0,0,w,h);const season=C.season(this.state.season),sun=C.sunLongitude(epoch),solar=C.solarVector(epoch,season.declination),pixels=this.shadeImage.data,n=this.mapNormals;
      // Shade every latitude AND longitude using the same surface-normal dot product as the globe.
      for(let i=0,j=0;i<pixels.length;i+=4,j+=3){const light=C.illumination({x:n[j],y:n[j+1],z:n[j+2]},solar);pixels[i]=3;pixels[i+1]=13;pixels[i+2]=26;pixels[i+3]=light<0?Math.round((.64+.15*(-light))*255):0;}
      this.sctx.putImageData(this.shadeImage,0,0);ctx.drawImage(this.shade,0,0,w,h);
      if(this.grid){for(const lat of [-66.56,-23.44,0,23.44,66.56]){const y=(90-lat)/180*h;ctx.strokeStyle=Math.abs(lat)>60?'#d9c6f1a0':lat===0?'#d1e5ed70':'#f0cb7ca0';ctx.setLineDash(lat===0?[]:[5,5]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}ctx.setLineDash([]);}
      if(this.grid){ctx.strokeStyle='#bbdae32e';ctx.lineWidth=1;for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*w;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.fillStyle='#cfe1ec';ctx.font='11px system-ui';ctx.fillText(lon===0?'0°':Math.abs(lon)+'°'+(lon<0?'W':'E'),Math.min(w-35,x+3),h-5);}}
      ctx.setLineDash([5,5]);ctx.strokeStyle='#f3afd1';ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(1,h);ctx.moveTo(w-1,0);ctx.lineTo(w-1,h);ctx.stroke();ctx.setLineDash([]);this.mapHits=[];
      for(const c of C.cities){const x=(c.lon+180)/360*w,y=(90-c.lat)/180*h,selected=c.id===from||c.id===to;ctx.fillStyle=c.id===from?'#8ff4cf':c.id===to?'#ffb481':'#e5eff7';ctx.beginPath();ctx.arc(x,y,selected?5:2.5,0,TAU);ctx.fill();this.mapHits.push({x,y,city:c.id});if(selected){ctx.font='bold 14px system-ui';const text=c.name;const tx=Math.min(w-ctx.measureText(text).width-5,x+8),ty=Math.max(18,y-9);ctx.strokeStyle='#102738';ctx.lineWidth=4;ctx.strokeText(text,tx,ty);ctx.fillText(text,tx,ty);}}
      const noonX=(sun+180)/360*w;ctx.strokeStyle='#ffcf6d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(noonX,0);ctx.lineTo(noonX,h);ctx.stroke();ctx.font='12px system-ui';ctx.fillStyle='#ffdf98';ctx.fillText('太陽正午經線',Math.min(w-112,noonX+5),18);
      const directY=(90-season.declination)/180*h;ctx.fillStyle='#ffd16e';ctx.strokeStyle='#fff2bc';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(noonX,directY,5,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(noonX,directY,9,0,TAU);ctx.stroke();ctx.font='bold 13px system-ui';const label='☀ 直射'+season.direct,tx=Math.max(5,Math.min(w-ctx.measureText(label).width-5,noonX+13)),ty=directY+24;ctx.strokeStyle='#102738';ctx.lineWidth=4;ctx.strokeText(label,tx,ty);ctx.fillText(label,tx,ty);
    }
  }
  window.TimezoneRenderer=GlobeRenderer;
})();
