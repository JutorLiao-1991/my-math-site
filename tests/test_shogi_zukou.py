import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "games/shogi_zukou.html").read_text(encoding="utf-8")
ENGINE = re.search(r'<script type="text/plain" id="eng">(.*?)</script>', PAGE, re.S).group(1)
DATA_JS = (ROOT / "games/zukou_data.js").read_text(encoding="utf-8")


def run_node(body):
    js = ENGINE + ";\nconst window={};\n" + DATA_JS + ";\n" + body
    return subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT)


class ShogiZukouTest(unittest.TestCase):
    def test_reachable_from_shogi_menu_and_not_a_home_category(self):
        shogi = (ROOT / "games/shogi.html").read_text(encoding="utf-8")
        self.assertIn('data-act="zukou"', shogi)
        self.assertIn("shogi_zukou.html", shogi)
        self.assertNotIn("shogi_zukou.html", (ROOT / "data.js").read_text(encoding="utf-8"))
        self.assertNotIn('data-category="zukou"', (ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertIn('href="shogi.html"', PAGE)

    def test_page_has_three_ways_to_use_it(self):
        for text in ("自動播放", "自己解題", 'data-act="next"', 'data-act="prev"', 'type="range"'):
            self.assertIn(text, PAGE)

    def test_all_611_moves_are_legal_checks_and_end_in_mate(self):
        out = run_node(
            "const D=window.ZUKOU[0],p=ENGINE.newPos(9);p.b.fill(0);for(const [i,v] of D.b)p.b[i]=v;"
            "p.h[0].fill(0);p.h[1].fill(0);for(let t=1;t<=7;t++){p.h[0][t]=D.hs[t]||0;p.h[1][t]=D.hg[t]||0}p.side=1;"
            "let bad=0;D.m.forEach((m,i)=>{if(!ENGINE.legal(p).includes(m))bad++;ENGINE.doMove(p,m);if(i%2===0&&!ENGINE.inCheck(p))bad++});"
            "console.log(JSON.stringify([D.m.length,bad,ENGINE.legal(p).length,ENGINE.inCheck(p)]))"
        )
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(json.loads(out.stdout), [611, 0, 0, True])


if __name__ == "__main__":
    unittest.main()
