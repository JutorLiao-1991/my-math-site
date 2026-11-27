import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "games/xiangqi_classics.html").read_text(encoding="utf-8")


def run_node(body):
    js = ("const window={};const X=require('./games/xiangqi_engine.js');"
          + (ROOT / "games/xiangqi_classics_data.js").read_text(encoding="utf-8") + ";\n" + body)
    return subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT)


class XiangqiClassicsTest(unittest.TestCase):
    def test_menu_and_home_entries(self):
        self.assertIn('data-act="classics"', (ROOT / "games/xiangqi.js").read_text(encoding="utf-8"))
        self.assertIn("著名棋譜", (ROOT / "games/xiangqi.js").read_text(encoding="utf-8"))
        self.assertIn("xiangqi_classics_data.js", PAGE)
        self.assertIn('href="../index.html"', PAGE)

    def test_page_has_book_game_and_play_layers(self):
        for text in ("選一本古譜", "data-book", "data-game", "自動播放", "自己背譜", "重點導覽", 'type="range"'):
            self.assertIn(text, PAGE)

    def test_all_games_are_legal_from_the_start_position(self):
        out = run_node(
            "const out=[];for(const g of window.XQ_CLASSICS.meihua.games){let p=X.start(),bad=0;"
            "for(const m of g.m){if(!X.legal(p).includes(m))bad++;const q=X.clone(p);X.make(q,m);p=q}"
            "out.push([g.no,g.m.length,g.k.length,bad,g.result])}console.log(JSON.stringify(out))"
        )
        self.assertEqual(out.returncode, 0, out.stderr)
        rows = json.loads(out.stdout)
        self.assertEqual(len(rows), 8)
        for no, n, k, bad, result in rows:
            self.assertEqual((n, bad), (k, 0), f"第{no}局")
            self.assertIn(result, ("紅勝", "黑勝"))

    def test_first_game_matches_the_published_text(self):
        out = run_node("console.log(window.XQ_CLASSICS.meihua.games[0].k.slice(0,14).join(' '))")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(out.stdout.strip(),
                         "炮八平五 馬2進3 傌八進七 卒7進1 俥九平八 車1平2 俥八進四 馬8進7 兵三進一 卒7進1 俥八平三 卒3進1 炮二平三 馬7進8")


if __name__ == "__main__":
    unittest.main()
