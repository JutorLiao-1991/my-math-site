import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "games/shogi.html").read_text(encoding="utf-8")
ENGINE = re.search(r'<script type="text/plain" id="eng">(.*?)</script>', PAGE, re.S).group(1)


def run_node(body):
    js = ENGINE + ";\n" + body
    out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT)
    return out


class ShogiTest(unittest.TestCase):
    def test_listed_in_games(self):
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        card = re.search(r'\{[^{}]*url: "games/shogi.html"[^{}]*\}', data)
        self.assertIsNotNone(card)
        self.assertIn('category: "games"', card.group(0))
        for name in ("嬰兒鳩特", "幼年鳩特", "青年鳩特", "成年鳩特", "大師鳩特"):
            self.assertIn(name, PAGE)
        self.assertIn('href="../index.html"', PAGE)

    def test_perft_matches_known_counts(self):
        out = run_node(
            "const m=ENGINE.newPos(5),p=ENGINE.newPos(9);"
            "console.log(JSON.stringify([[1,2,3].map(d=>ENGINE.perft(ENGINE.clone(m),d)),[1,2].map(d=>ENGINE.perft(ENGINE.clone(p),d))]))"
        )
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(out.stdout.strip(), "[[14,181,2512],[30,900]]")

    def test_rules_edge_cases(self):
        out = run_node(r"""
const E=ENGINE;
// 二步：同一直行已有自己的步，不能再打步
let p=E.newPos(9);p.h[0][1]=1;
let drops=E.legal(p).filter(m=>(m>>15)===1).map(m=>(m>>7)&127%9);
if(drops.length!==0)throw new Error('nifu '+drops.length);
// 打步詰：用打入的步將死是禁手
p={W:5,b:new Int8Array(25),h:[new Int8Array(9),new Int8Array(9)],side:1};
p.b[0]=-8;p.b[1]=-1;p.b[11]=5;p.b[24]=8;p.h[0][1]=1;
const q=E.clone(p);q.h[0][1]=0;q.h[0][5]=1;
if(!E.legal(q).some(m=>(m>>15)===5&&((m>>7)&127)===5))throw new Error('gold drop should be legal');
const ok=E.legal(p).some(m=>(m>>15)===1&&((m>>7)&127)===5);
if(ok)throw new Error('uchifuzume allowed');
// 強制升變：步走到最後一排一定升變
p={W:5,b:new Int8Array(25),h:[new Int8Array(9),new Int8Array(9)],side:1};
p.b[7]=1;p.b[24]=8;p.b[0]=-8;
const ms=E.legal(p).filter(m=>(m&127)===7);
if(ms.length!==1||!(ms[0]&E.PR))throw new Error('forced promotion');
console.log('ok');
""")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)

    def test_ai_plays_only_legal_moves(self):
        out = run_node(r"""
const E=ENGINE;
for(const W of [5,9]){let p=E.newPos(W);
 for(let i=0;i<24;i++){const ms=E.legal(p);if(!ms.length)break;const r=E.think(p,{diff:i%5,time:120});
  if(!ms.includes(r.m))throw new Error('illegal '+W);E.doMove(p,r.m)}}
console.log('ok');
""")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)


    def test_tsume_puzzles_have_unique_answers(self):
        data = re.search(r"const TSUME=(\{1:.*?\]\,3:.*?\]\});", PAGE, re.S).group(1)
        out = run_node("const TSUME=" + data + r""";
const E=ENGINE,TOT={1:18,2:4,3:4,4:4,5:4,6:2,7:2};
for(const n of [1,3]){if(TSUME[n].length<50)throw new Error('too few '+n);
 TSUME[n].forEach((q,i)=>{const p={W:9,b:new Int8Array(81),h:[new Int8Array(9),new Int8Array(9)],side:1};
  for(const [s,v] of q.b)p.b[s]=v;for(const [t,c] of q.h)p.h[0][t]=c;const used={};
  p.b.forEach(v=>{if(v&&Math.abs(v)!==8){const t=E.BASE[Math.abs(v)]||Math.abs(v);used[t]=(used[t]||0)+1}});
  for(let t=1;t<=7;t++)p.h[1][t]=TOT[t]-(used[t]||0)-p.h[0][t];
  const ms=E.mateMoves(p,n);if(ms.length!==1||ms[0]!==q.m)throw new Error(n+'-'+i+' answers '+ms.length);
  if(n===3&&E.mateIn(p,1))throw new Error(n+'-'+i+' has mate in 1');})}
console.log('ok');""")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)

    def test_tactics_study_lines_and_puzzles(self):
        data = re.search(r"const STUDY=(\[.*?\]);\n", PAGE, re.S).group(1)
        out = run_node("const STUDY=" + data + r""";
const E=ENGINE,U=u=>E.usi(9,u),cnt={open:0,mid:0,end:0};
for(const S of STUDY){cnt[S.sec]++;let p;
 if(S.std)p=E.newPos(9);else{p={W:9,b:new Int8Array(81),h:[new Int8Array(9),new Int8Array(9)],side:1};for(const [q,v] of S.b)p.b[q]=v;for(const [t,c] of S.h0)p.h[0][t]=c;for(const [t,c] of S.h1)p.h[1][t]=c}
 if(!S.t||!S.d)throw new Error(S.id+' no text');
 S.steps.forEach((st,i)=>{if(st.y&&!st.q)throw new Error(S.id+' step '+i+' no prompt');if(st.y&&p.side!==1)throw new Error(S.id+' you-step on gote');
  let m;
  if(st.k==='reply')m=E.defReply(p,1);else if(st.k==='mate')m=E.mateMoves(p,1)[0];else if(st.k==='mate3')m=E.mateIn(p,3);else m=U(st.u);
  if(!m||!E.legal(p).includes(m))throw new Error(S.id+' step '+i+' illegal');
  E.doMove(p,m);
  if(st.k==='mate'&&(E.legal(p).length||!E.inCheck(p)))throw new Error(S.id+' not mate');
  if(st.k==='mate3'&&!(E.inCheck(p)&&E.defMated(p,2)))throw new Error(S.id+' not mate3');
  if(st.k==='hisshi'){if(E.inCheck(p))throw new Error(S.id+' hisshi is check');for(const r of E.legal(p)){const q=E.clone(p);E.doMove(q,r);if(!E.mateIn(q,1))throw new Error(S.id+' hisshi escapes')}}
 });}
if(cnt.open<8||cnt.mid<4||cnt.end<5)throw new Error('too few '+JSON.stringify(cnt));
console.log('ok');""")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)
        self.assertIn('data-act="studies"><b>戰術學習</b>', PAGE)

    def test_lessons_cover_basics(self):
        for title in ("步兵", "香車", "桂馬", "銀將", "金將", "角行", "飛車", "玉將與王手", "吃子與打入", "升變", "禁手：二步", "將死對方"):
            self.assertIn(f"t:'{title}'", PAGE)
        self.assertIn('data-act="lessons"><b>新手教學</b>', PAGE)
        self.assertIn('data-act="tsumes"><b>詰將棋</b>', PAGE)


    def test_opening_book_lines_are_legal(self):
        out = run_node(r"""
const E=ENGINE;
E.BOOK_SRC.forEach((l,i)=>{const p=E.newPos(9);for(const t of l.split(' ')){const m=E.usi(9,t);if(!E.legal(p).includes(m))throw new Error('line '+i+' '+t);E.doMove(p,m)}});
const r=E.think(E.newPos(9),{diff:4,book:true,hist:[]});if(!r.book)throw new Error('book not used');
console.log('ok');""")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)

    def test_handicap_pvp_save_and_hint_present(self):
        for key in ("讓香", "讓角", "讓飛", "讓飛香", "讓二枚", "data-act=\"pvp\"><b>雙人對戰</b>", "body.pvp #oppWho", "flip:false", "sg_save", "繼續上次的對局", "data-act=\"tip\"", "勝率 ≈ 1 ÷ (1 + e"):
            self.assertIn(key, PAGE)


if __name__ == "__main__":
    unittest.main()


class ShogiRankTest(unittest.TestCase):
    def test_min_moves_leaderboard(self):
        for s in ['rank_medals.css', 'data-act="rank">最少手數榜', 'sg_rank/', 'window.SGRank',
                  'function badName', 'G.undid', 'G.hinted', 'rkRec', "G.hc==='none'&&G.me===1",
                  'medal m${i<3?i+1:i<5?4:5}']:
            self.assertIn(s, PAGE, s)
        self.assertTrue((ROOT / "games/rank_medals.css").exists())
