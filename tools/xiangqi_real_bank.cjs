/* 由 wukong-xiangqi（MIT）實戰殺局重新篩選出殺局挑戰題庫。
   用法：node tools/xiangqi_real_bank.cjs 路徑/puzzles.js */
const X=require('../games/xiangqi_engine.js'),fs=require('fs');
/* 讀取 wukong-xiangqi 的 apps/puzzle_solver/gui/game/puzzles.js（只用正規式擷取欄位，不執行檔案內容） */
const src=fs.readFileSync(process.argv[2]||'puzzles.js','utf8');
const P=[...src.matchAll(/\{\s*"description":\s*"((?:[^"\\]|\\.)*)",\s*"fen":\s*"([^"]*)",\s*"id":\s*"([^"]*)",\s*"title":\s*"([^"]*)"\s*\}/g)].map(m=>({desc:m[1].replace(/\\n/g,'\n').trim(),fen:m[2]})).filter(q=>/^[1-9a-zA-Z/]+ [wb] - - \d+ \d+$/.test(q.fen));
const EV={'Hong Kong Team Champion':'香港象棋團體賽','China Team Championship':'全國象棋團體賽','World Xiangqi Championships':'世界象棋錦標賽','Chinese National Champion':'全國象棋個人賽','Hong Kong Individual Championship':'香港象棋個人賽','China National Xiangqi League':'全國象棋甲級聯賽','Asian Xiangqi Individual Championships':'亞洲象棋個人錦標賽','Asian xiangqi Championship':'亞洲象棋錦標賽','The world mind sports games':'世界智力運動會','Asian Indoor Games':'亞洲室內運動會','National Games':'全國運動會'};
const CODE={k:1,a:2,b:3,n:4,r:5,c:6,p:7};
function parse(fen){const [rows,side]=fen.split(' ');const b=new Int8Array(90);const R=rows.split('/');if(R.length!==10)return null;
  for(let y=0;y<10;y++){let x=0;for(const ch of R[y]){if(/\d/.test(ch)){x+=+ch;continue}const v=CODE[ch.toLowerCase()];if(!v||x>8)return null;b[y*9+x]=ch===ch.toUpperCase()?v:-v;x++}if(x!==9)return null}
  let p={b,side:side==='w'?1:-1,quiet:0};if(p.side===-1)p={b:Int8Array.from(Array.from(b).reverse().map(v=>-v)),side:1,quiet:0,flipped:1};return p}
const out={1:[],3:[],5:[],7:[]},seen=new Set();let slow=0,bad=0;
for(const q of P){const lines=q.desc.split('\n').map(s=>s.trim()).filter(Boolean),evl=(lines.at(-1)||'').trim(),m=/^(.*?)\s*(\d{4})\s*$/.exec(evl);if(!m||!EV[m[1].trim()])continue;
  const p=parse(q.fen);if(!p){bad++;continue}
  if(X.inCheck(p,1)||X.inCheck(p,-1))continue;const k=X.key(p);if(seen.has(k))continue;
  for(const n of [1,3,5,7]){const t0=Date.now();const ms=X.mateMoves(p,n);const dt=Date.now()-t0;if(dt>400){slow++;break}
    if(ms.length===0)continue;if(ms.length===1){seen.add(k);out[n].push({fen:q.fen,flip:!!p.flipped,b:Array.from(p.b),solution:ms[0],event:EV[m[1].trim()],year:+m[2],players:lines[0],ms:dt})}break}}
const C=out;

const SYM={1:'K',2:'A',3:'B',4:'N',5:'R',6:'C',7:'P'};
const fen=b=>{const rows=[];for(let y=0;y<10;y++){let r='',e=0;for(let x=0;x<9;x++){const v=b[y*9+x];if(!v){e++;continue}if(e){r+=e;e=0}const c=SYM[Math.abs(v)];r+=v>0?c:c.toLowerCase()}if(e)r+=e;rows.push(r)}return rows.join('/')};
const ucci=m=>{const c=s=>String.fromCharCode(97+s%9)+(9-(s/9|0));return c(X.from(m))+c(X.to(m))};
function difficulty(q){const p={b:Int8Array.from(q.b),side:1,quiet:0};let checks=0;for(const m of X.legal(p)){const u=X.make(p,m);if(X.inCheck(p))checks++;X.unmake(p,m,u)}return checks*10+q.b.filter(Boolean).length/10}
const bank={};
for(const n of [1,3,5,7]){const list=C[n].map(q=>({...q,d:difficulty(q)})).sort((a,b)=>a.d-b.d);const pick=[];const N=100;
  for(let i=0;i<N;i++)pick.push(list[Math.round(i*(list.length-1)/(N-1))]);
  if(new Set(pick.map(q=>q.fen)).size!==N)throw new Error('dup '+n);
  bank[n]=pick.map(q=>({f:fen(q.b),s:ucci(q.solution),e:`${q.year} ${q.event}`,g:q.players}))}
const head=`/* 鳩特象棋・殺局挑戰（實戰殺局）
   題目取自 wukong-xiangqi 專案從大師實戰對局中擷取的殺局（Copyright (c) 2021 Maksym Korzh，MIT 授權，授權全文見 xiangqi_puzzles_LICENSE.txt）。
   由 tools/xiangqi_real_bank.cjs 以本站引擎重新篩選：紅方先走（原為黑方先走者已將棋盤旋轉並交換顏色）、每一步都將軍、首手唯一、不存在更短的殺法；
   一手、三手、五手、七手殺各 100 題，依難度由淺到深排列。f＝局面（紅方在下），s＝唯一首手，e＝出處，g＝對局雙方。 */
`;
const body=`(function(r){const raw=${JSON.stringify(bank)};
  const code={k:1,a:2,b:3,n:4,r:5,c:6,p:7},sq=u=>(9-Number(u[1]))*9+u.charCodeAt(0)-97;
  function board(f){const b=new Array(90).fill(0);f.split('/').forEach((row,y)=>{let x=0;for(const ch of row){if(ch>='1'&&ch<='9'){x+=+ch;continue}const v=code[ch.toLowerCase()];b[y*9+x]=ch===ch.toUpperCase()?v:-v;x++}});return b}
  const bank={};for(const n of Object.keys(raw))bank[n]=raw[n].map(q=>({b:board(q.f),solution:sq(q.s.slice(0,2))|sq(q.s.slice(2))<<7,title:q.e+'・實戰殺局',source:q.e,players:q.g}));
  r.XiangqiPuzzles=bank;if(typeof module!=='undefined')module.exports=bank})(typeof self!=='undefined'?self:globalThis);
`;
fs.writeFileSync(__dirname+'/../games/xiangqi_puzzles.js',head+body);
console.log('bytes',Buffer.byteLength(head+body));
