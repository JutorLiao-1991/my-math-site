(function(root){
  'use strict';
  const TAU=2*Math.PI;
  function point(x,y,separation,wavelength,time=0){if(wavelength<=0)throw Error('波長須大於零');const r1=Math.hypot(x+separation/2,y),r2=Math.hypot(x-separation/2,y),difference=r1-r2;const u1=Math.cos(TAU*(r1/wavelength-time)),u2=Math.cos(TAU*(r2/wavelength-time));const amplitude=2*Math.abs(Math.cos(Math.PI*difference/wavelength));return{r1,r2,difference,u1,u2,displacement:u1+u2,amplitude,type:amplitude<1e-6?'destructive':Math.abs(amplitude-2)<1e-6?'constructive':'partial'};}
  function pointAtDifference(difference,y,separation){if(Math.abs(difference)>=separation)throw Error('路徑差超過可達範圍');let lo=-1e5,hi=1e5;for(let i=0;i<70;i++){const mid=(lo+hi)/2;const d=Math.hypot(mid+separation/2,y)-Math.hypot(mid-separation/2,y);if(d<difference)lo=mid;else hi=mid;}return(lo+hi)/2;}
  function sinc(x){return Math.abs(x)<1e-8?1:Math.sin(x)/x;}
  function singleIntensity(sinTheta,width,wavelength){return sinc(Math.PI*width*sinTheta/wavelength)**2;}
  function doubleIntensity(sinTheta,separation,wavelength,width=0){return Math.cos(Math.PI*separation*sinTheta/wavelength)**2*(width?singleIntensity(sinTheta,width,wavelength):1);}
  function spread(width,wavelength){return Math.min(Math.PI/2,Math.asin(Math.min(1,wavelength/width)));}
  const api={point,pointAtDifference,sinc,singleIntensity,doubleIntensity,spread};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WaveCore=api;
})(typeof window==='undefined'?globalThis:window);
