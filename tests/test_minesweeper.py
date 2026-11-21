import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "games" / "minesweeper.html").read_text(encoding="utf-8")


def engine_js():
    m = re.search(r'<script id="mse">(.*?)</script>', HTML, re.S)
    assert m, "找不到引擎"
    return m.group(1)


def lessons():
    m = re.search(r'<script type="application/json" id="lessons">(.*?)</script>', HTML, re.S)
    assert m, "找不到教學資料"
    return json.loads(m.group(1))


def run_node(body):
    js = engine_js() + "\n" + body
    out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT)
    if out.returncode:
        raise AssertionError(out.stderr)
    return out.stdout.strip()


class MinesweeperTest(unittest.TestCase):
    def test_listed_in_games(self):
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        self.assertIn('url: "games/minesweeper.html"', data)
        block = data[data.index('url: "games/minesweeper.html"') - 200:]
        self.assertIn('category: "games"', block[:400])

    def test_generated_boards_need_no_guessing(self):
        out = run_node(r"""
const R=[];
for(const [W,H,M] of [[9,9,10],[16,16,40],[30,16,99],[16,30,99]]){
 let bad=0;
 for(let k=0;k<25;k++){
  const f=[0,W-1,W*H-1,(W*H/2+W/2)|0][k%4];
  const g=MSE.generate(W,H,M,f,1000+k*37);
  let mc=0;for(const v of g.mine)mc+=v;
  const r=MSE.solve(W,H,g.mine,g.num,f,M);
  let opened=false;for(let i=0;i<W*H;i++)if(r.open[i]&&g.mine[i])opened=true;
  if(!g.ok||!r.ok||mc!==M||g.mine[f]||g.num[f]||opened)bad++;
 }
 R.push(bad);
}
console.log(R.join(','));
""")
        self.assertEqual(out, "0,0,0,0")

    def test_solver_rejects_a_pure_guess(self):
        # 3×1 可以推理；2×2 從角落開出數字後只能用猜的，推理器必須判定失敗
        out = run_node(r"""
const W=3,H=1,mine=Uint8Array.from([0,0,1]),num=MSE.numbers(W,H,mine);
const a=MSE.solve(W,H,mine,num,0,1).ok;
const W2=2,H2=2,m2=Uint8Array.from([0,0,0,1]),n2=MSE.numbers(W2,H2,m2);
const b=MSE.solve(W2,H2,m2,n2,0,1).ok;
const m3=Uint8Array.from([0,1,1,0]),n3=MSE.numbers(2,2,m3);
console.log(a,b,MSE.solve(2,2,m3,n3,0,2).ok);
""")
        self.assertEqual(out, "true false false")

    def test_guided_lessons_are_deducible(self):
        L = lessons()
        self.assertGreaterEqual(len(L), 4)
        self.assertTrue(L[-1].get("free"))
        self.assertEqual(L[1]["t"], "1-1 定式")
        self.assertEqual(L[2]["t"], "1-2-1 定式")
        out = run_node("const LESSONS=" + json.dumps(L, ensure_ascii=False) + r""";
const msg=[];
for(const L of LESSONS){if(L.free)continue;const W=L.W,H=L.H,N=W*H,nb=MSE.getNb(W,H);
 const mine=new Uint8Array(N);for(const [x,y] of L.mines)mine[y*W+x]=1;const num=MSE.numbers(W,H,mine);
 const open=new Uint8Array(N),flag=new Uint8Array(N);for(const [x,y] of L.open)open[y*W+x]=1;
 for(let i=0;i<N;i++){if(open[i]&&mine[i])msg.push(L.t+':開了雷');if(open[i]&&!num[i]&&nb[i].some(j=>!open[j]))msg.push(L.t+':0 旁邊不該有未翻開');}
 const forced=(i,want)=>{const hid=[];for(let k=0;k<N;k++)if(!open[k]&&!flag[k])hid.push(k);
  let seen=new Set();for(let mask=0;mask<(1<<hid.length);mask++){const v=new Uint8Array(N);for(let k=0;k<N;k++)v[k]=flag[k];hid.forEach((c,b)=>{if(mask>>b&1)v[c]=1});
   let ok=true;for(let k=0;k<N&&ok;k++){if(!open[k])continue;let c=0;for(const j of nb[k])c+=v[j];if(c!==num[k])ok=false}
   if(ok)seen.add(v[i])}
  return seen.size===1&&seen.has(want)};
 const flood=s=>{const q=[s];open[s]=1;for(let h=0;h<q.length;h++){const i=q[h];if(num[i])continue;for(const j of nb[i])if(!open[j]&&!flag[j]){open[j]=1;q.push(j)}}};
 L.steps.forEach((st,k)=>{if(!st.say)msg.push(L.t+k+':沒有說明');
  for(const [x,y] of st.dig||[]){const i=y*W+x;if(open[i])continue;if(mine[i]||!forced(i,0))msg.push(L.t+' 第'+k+'步挖 '+x+','+y+' 不能確定');flood(i)}
  for(const [x,y] of st.flag||[]){const i=y*W+x;if(!mine[i]||!forced(i,1))msg.push(L.t+' 第'+k+'步旗 '+x+','+y+' 不能確定');flag[i]=1}});
 for(let i=0;i<N;i++)if(!mine[i]&&!open[i])msg.push(L.t+':最後還有安全格沒開');
}
console.log(msg.join('\n')||'OK');
""")
        self.assertEqual(out, "OK")

    def test_leaderboard_brand_and_controls(self):
        for s in ['ms_rank/', 'limitToFirst(10)', 'orderByChild("s")', 'serverTimestamp()',
                  'const esc=', 'rkTags(', 'BRAND.gold', '鳩特數理', '>鳩<', '>隊<',
                  'data-act="mode"', "pointerdown", "contextmenu", "'flag'", 'chord(',
                  'BGM', 'SFX.bugle' if 'SFX.bugle' in HTML else 'bugle(', '任務完成', '任務失敗', '訓練中']:
            self.assertIn(s, HTML, s)
        self.assertIn("innerWidth<innerHeight", HTML)  # 特戰直向
        self.assertNotRegex(HTML, r'innerHTML=`[^`]*\$\{x\.n\}')  # 名字一定要先跳脫


if __name__ == "__main__":
    unittest.main()
