/* 鳩特象棋：規則、可解釋局面、限時搜尋。正數紅方、負數黑方。
   1 帥將、2 仕士、3 相象、4 馬、5 車、6 炮砲、7 兵卒。
   Rules reference: World Xiangqi Federation, A Short Introduction to Xiangqi.
   https://www.wxf-xiangqi.org/images/xiangqi-intro/xiangqi-introduction-for-wxf.pdf */
(function (root) {
  'use strict';
  const K=1,A=2,E=3,H=4,R=5,C=6,P=7,INF=100000,MATE=90000;
  const VALUE=[0,0,210,220,430,900,460,100];
  const DIR=[[1,0],[-1,0],[0,1],[0,-1]],HORSE=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
  const inside=(x,y)=>x>=0&&x<9&&y>=0&&y<10;
  const palace=(x,y,s)=>x>=3&&x<=5&&(s===1?y>=7&&y<=9:y>=0&&y<=2);
  const ownHalf=(y,s)=>s===1?y>=5:y<=4;
  const move=(f,t)=>f|(t<<7),from=m=>m&127,to=m=>(m>>7)&127;
  function start(){const b=new Int8Array(90),back=[R,H,E,A,K,A,E,H,R];
    for(let x=0;x<9;x++){b[x]=-back[x];b[81+x]=back[x]}
    for(const x of [1,7]){b[18+x]=-C;b[63+x]=C}
    for(const x of [0,2,4,6,8]){b[27+x]=-P;b[54+x]=P}
    return {b,side:1,quiet:0};
  }
  const clone=p=>({b:Int8Array.from(p.b),side:p.side,quiet:p.quiet||0});
  const key=p=>p.side+':'+Array.from(p.b).join(',');
  function king(p,s){return p.b.indexOf(s*K)}
  function attacked(p,sq,s){if(sq<0)return true;const b=p.b,x=sq%9,y=(sq/9)|0;
    for(const [dx,dy] of DIR){let n=0;for(let xx=x+dx,yy=y+dy;inside(xx,yy);xx+=dx,yy+=dy){const v=b[yy*9+xx];if(!v)continue;
      if(n===0){if(v===s*R)return true;if(v===s*K&&dx===0)return true;n++}
      else{if(v===s*C)return true;break}}
    }
    for(const [dx,dy] of HORSE){const xx=x+dx,yy=y+dy;if(!inside(xx,yy)||b[yy*9+xx]!==s*H)continue;
      const lx=xx+(Math.abs(dx)===2?-Math.sign(dx):0),ly=yy+(Math.abs(dy)===2?-Math.sign(dy):0);
      if(!b[ly*9+lx])return true}
    const py=y+(s===1?1:-1);if(inside(x,py)&&b[py*9+x]===s*P)return true;
    for(const xx of [x-1,x+1])if(inside(xx,y)&&!ownHalf(y,s)&&b[y*9+xx]===s*P)return true;
    for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
      const xx=x+dx,yy=y+dy;if(inside(xx,yy)&&palace(x,y,s)&&b[yy*9+xx]===s*A)return true;
      const ex=x+dx*2,ey=y+dy*2;if(inside(ex,ey)&&ownHalf(y,s)&&!b[yy*9+xx]&&b[ey*9+ex]===s*E)return true}
    for(const [dx,dy] of DIR){const xx=x+dx,yy=y+dy;if(inside(xx,yy)&&b[yy*9+xx]===s*K&&palace(x,y,s))return true}
    return false;
  }
  const inCheck=(p,s=p.side)=>attacked(p,king(p,s),-s);
  function pseudo(p){const b=p.b,s=p.side,out=[];
    for(let f=0;f<90;f++){if(b[f]*s<=0)continue;const ty=Math.abs(b[f]),x=f%9,y=(f/9)|0;
      const add=(xx,yy)=>{if(inside(xx,yy)&&b[yy*9+xx]*s<=0)out.push(move(f,yy*9+xx))};
      if(ty===R||ty===C){for(const [dx,dy] of DIR){let screen=false;for(let xx=x+dx,yy=y+dy;inside(xx,yy);xx+=dx,yy+=dy){const v=b[yy*9+xx];
        if(ty===R){if(v*s<=0)add(xx,yy);if(v)break}
        else if(!screen){if(!v)add(xx,yy);else screen=true}else if(v){if(v*s<0)add(xx,yy);break}}}}
      else if(ty===H){for(const [dx,dy] of HORSE){const lx=x+(Math.abs(dx)===2?Math.sign(dx):0),ly=y+(Math.abs(dy)===2?Math.sign(dy):0);if(inside(lx,ly)&&!b[ly*9+lx])add(x+dx,y+dy)}}
      else if(ty===E){for(const dx of [-2,2])for(const dy of [-2,2]){const xx=x+dx,yy=y+dy;if(inside(xx,yy)&&ownHalf(yy,s)&&!b[(y+dy/2)*9+x+dx/2])add(xx,yy)}}
      else if(ty===A){for(const dx of [-1,1])for(const dy of [-1,1])if(palace(x+dx,y+dy,s))add(x+dx,y+dy)}
      else if(ty===K){for(const [dx,dy] of DIR)if(palace(x+dx,y+dy,s))add(x+dx,y+dy)}
      else if(ty===P){add(x,y+(s===1?-1:1));if(!ownHalf(y,s)){add(x-1,y);add(x+1,y)}}
    }return out;
  }
  function make(p,m){const f=from(m),t=to(m),rec={cap:p.b[t],quiet:p.quiet||0};p.b[t]=p.b[f];p.b[f]=0;p.side=-p.side;p.quiet=rec.cap||Math.abs(p.b[t])===P?0:rec.quiet+1;return rec}
  function unmake(p,m,rec){const f=from(m),t=to(m);p.side=-p.side;p.b[f]=p.b[t];p.b[t]=rec.cap;p.quiet=rec.quiet}
  function legal(p){const s=p.side,out=[];if(king(p,s)<0||king(p,-s)<0)return out;
    for(const m of pseudo(p)){if(Math.abs(p.b[to(m)])===K)continue;const u=make(p,m),ok=!inCheck(p,s);unmake(p,m,u);if(ok)out.push(m)}return out}
  function perft(p,d){if(d===0)return 1;let n=0;for(const m of legal(p)){const u=make(p,m);n+=perft(p,d-1);unmake(p,m,u)}return n}
  const names=v=>(v>0?['','帥','仕','相','馬','車','炮','兵']:['','將','士','象','馬','車','砲','卒'])[Math.abs(v)]||'';
  function notation(p,m){const f=from(m),t=to(m),s=p.side,x=f%9,y=f/9|0,xx=t%9,yy=t/9|0;
    const digit=n=>s===1?'〇一二三四五六七八九'[n]:String(n),file=x=>s===1?9-x:x+1;
    let n=names(p.b[f])+digit(file(x));const same=[];for(let i=0;i<90;i++)if(p.b[i]===p.b[f]&&i%9===x)same.push(i);
    if(same.length>1){same.sort((a,b)=>s===1?a-b:b-a);const i=same.indexOf(f);n=(same.length===2?(i===0?'前':'後'):i===0?'前':i===same.length-1?'後':same.length===3?'中':digit(i+1))+names(p.b[f])}
    if(y===yy)return n+'平'+digit(file(xx));const advance=(yy-y)*s<0;
    return n+(advance?'進':'退')+digit([A,E,H].includes(Math.abs(p.b[f]))?file(xx):Math.abs(yy-y));
  }
  function status(p,history=[]){const moves=legal(p);if(!moves.length)return {over:true,winner:-p.side,reason:inCheck(p)?'將死':'困斃（無合法走法）'};
    if(!p.b.some(v=>[H,R,C,P].includes(Math.abs(v))))return {over:true,winner:0,reason:'雙方均無進攻子力'};
    const k=key(p),hits=[];history.forEach((h,i)=>{if(h.key===k)hits.push(i)});
    if(hits.length>=3){const cycle=history.slice(hits[hits.length-3]+1),all=s=>{const a=cycle.filter(h=>h.mover===s);return a.length>0&&a.every(h=>h.check)};
      const red=all(1),black=all(-1);if(red!==black)return {over:true,winner:red?-1:1,reason:(red?'紅':'黑')+'方長將判負'};
      return {over:true,winner:0,reason:'三次同局面和棋'};}
    if((p.quiet||0)>=120)return {over:true,winner:0,reason:'連續六十回合未吃子或挺兵'};
    return {over:false,check:inCheck(p)};
  }
  function evaluate(p){let v=0;for(let i=0;i<90;i++){const c=p.b[i];if(!c)continue;const s=c>0?1:-1,t=Math.abs(c),x=i%9,y=i/9|0,adv=s===1?9-y:y;
    let a=VALUE[t];if(t===P)a+=adv*9+(adv>=5?65+(4-Math.abs(x-4))*7:0);if(t===H)a+=(4-Math.abs(x-4))*9+(4.5-Math.abs(y-4.5))*5;
    if(t===R||t===C)a+=(4-Math.abs(x-4))*3;if(t===K)a+=(x===4?14:0);v+=s*a}return v*p.side}
  let rand=0x3157abcd;function zr(){rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;return rand|0}
  const Z=Array.from({length:90},()=>Array.from({length:15},zr)),ZS=zr();
  function hash(p){let h=p.side===1?0:ZS;for(let i=0;i<90;i++)if(p.b[i])h^=Z[i][p.b[i]+7];return h}
  function nextHash(p,m,h){const f=from(m),t=to(m),v=p.b[f],c=p.b[t];return h^ZS^Z[f][v+7]^Z[t][v+7]^(c?Z[t][c+7]:0)}
  function ordered(p,ms,ttm,ctx,ply){const score=m=>m===ttm?1e8:p.b[to(m)]?1e6+VALUE[Math.abs(p.b[to(m)])]*16-VALUE[Math.abs(p.b[from(m)])]:(ctx.killers[ply]===m?9e5:ctx.hist[m]||0);
    return ms.map(m=>[m,score(m)]).sort((a,b)=>b[1]-a[1]).map(a=>a[0])}
  function tick(ctx){if(++ctx.nodes%128===0&&performance.now()>=ctx.deadline)ctx.stop=true;return ctx.stop}
  function quiesce(p,alpha,beta,ctx,ply,depth){if(tick(ctx))return 0;const check=inCheck(p),ms=legal(p);if(!ms.length)return -MATE+ply;
    const st=evaluate(p);if(depth>=6)return st;if(!check){if(st>=beta)return st;alpha=Math.max(alpha,st)}
    for(const m of ordered(p,check?ms:ms.filter(m=>p.b[to(m)]),0,ctx,ply)){const u=make(p,m),v=-quiesce(p,-beta,-alpha,ctx,ply+1,depth+1);unmake(p,m,u);if(ctx.stop)return 0;if(v>=beta)return v;alpha=Math.max(alpha,v)}return alpha}
  const ttScore=(v,ply)=>v>MATE-1000?v+ply:v<-MATE+1000?v-ply:v;
  const untt=(v,ply)=>v>MATE-1000?v-ply:v<-MATE+1000?v+ply:v;
  function search(p,d,alpha,beta,ctx,ply,h){if(tick(ctx))return 0;if(ctx.path.has(h))return 0;if(d<=0)return quiesce(p,alpha,beta,ctx,ply,0);
    const old=alpha,tt=ctx.tt.get(h),tv=tt?untt(tt.v,ply):0;if(tt&&tt.d>=d&&(tt.flag===0||tt.flag===1&&tv>=beta||tt.flag===2&&tv<=alpha))return tv;
    const ms=legal(p);if(!ms.length)return -MATE+ply;ctx.path.add(h);let best=-INF,bm=0;
    for(const m of ordered(p,ms,tt?.m,ctx,ply)){const nh=nextHash(p,m,h),u=make(p,m),v=-search(p,d-1,-beta,-alpha,ctx,ply+1,nh);unmake(p,m,u);if(ctx.stop){ctx.path.delete(h);return 0}
      if(v>best){best=v;bm=m}alpha=Math.max(alpha,v);if(alpha>=beta){if(!u.cap){ctx.killers[ply]=m;ctx.hist[m]=(ctx.hist[m]||0)+d*d}break}}
    ctx.path.delete(h);if(ctx.tt.size>100000)ctx.tt.clear();ctx.tt.set(h,{d,v:ttScore(best,ply),m:bm,flag:best<=old?2:best>=beta?1:0});return best}
  function think(pos,opt={}){const p=clone(pos),root=legal(p),level=opt.level??2;if(!root.length)return {m:0,score:-MATE,depth:0,nodes:0};
    if(level===0&&Math.random()<.22)return {m:root[Math.random()*root.length|0],score:0,depth:0,nodes:0};
    if(level===4&&opt.book?.length){const book=opt.book.filter(m=>root.includes(m));if(book.length)return {m:book[Math.random()*book.length|0],score:0,depth:0,nodes:0,book:true}}
    const times=[100,220,650,1500,4500],depths=[1,2,3,5,10],ctx={nodes:0,deadline:performance.now()+(opt.time||times[level]),stop:false,tt:new Map(),killers:[],hist:{},path:new Set()};
    let best=root[0],score=evaluate(p),done=0;const h=hash(p),scores=new Map(),noise=[220,65,12,0,0][level];
    for(let d=1;d<=(opt.depth||depths[level]);d++){let bs=-INF,bm=0,alpha=-INF;const rnd=new Map();if(noise)for(const m of root)rnd.set(m,(Math.random()*2-1)*noise);
      root.sort((a,b)=>(scores.get(b)??-INF)-(scores.get(a)??-INF));ctx.path.add(h);
      for(const m of root){const nh=nextHash(p,m,h),u=make(p,m);let v=-search(p,d-1,-INF,noise?INF:-alpha,ctx,1,nh);unmake(p,m,u);if(ctx.stop)break;v+=rnd.get(m)||0;scores.set(m,v);if(v>bs){bs=v;bm=m}alpha=Math.max(alpha,v)}
      ctx.path.delete(h);if(ctx.stop)break;if(bm){best=bm;score=bs;done=d}if(Math.abs(score)>=MATE-200||performance.now()>=ctx.deadline)break}
    return {m:best,score,depth:done,nodes:ctx.nodes};
  }
  /* 強制殺局：攻方每一步都必須將軍；守方枚舉全部合法應手。 */
  function mateMoves(p,plies,memo=new Map()){const out=[];for(const m of legal(p)){const u=make(p,m);let yes=false;
      if(inCheck(p)){const replies=legal(p);yes=replies.length===0;if(!yes&&plies>=3)yes=replies.every(r=>{const z=make(p,r),k=key(p)+':'+(plies-2);let a=memo.get(k);if(a===undefined){a=mateMoves(p,plies-2,memo).length>0;memo.set(k,a)}unmake(p,r,z);return a})}
      unmake(p,m,u);if(yes)out.push(m)}return out}
  function escape(p,plies){const ms=legal(p);for(const m of ms){const u=make(p,m),safe=plies<1||!mateMoves(p,plies).length;unmake(p,m,u);if(safe)return m}return ms[0]||0}
  const api={K,A,E,H,R,C,P,VALUE,INF,MATE,start,clone,key,king,attacked,inCheck,pseudo,legal,make,unmake,perft,move,from,to,names,notation,status,evaluate,think,mateMoves,escape,palace,ownHalf};
  root.Xiangqi=api;if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined'&&typeof postMessage==='function')root.onmessage=e=>{try{postMessage({id:e.data.id,...think(e.data.pos,e.data.opt)})}catch(err){postMessage({id:e.data.id,error:String(err)})}};
})(typeof self!=='undefined'?self:globalThis);
