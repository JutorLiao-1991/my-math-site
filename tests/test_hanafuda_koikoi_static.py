import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "games/hanafuda_koikoi.html").read_text(encoding="utf-8")
DATA = (ROOT / "data.js").read_text(encoding="utf-8")


class HanafudaKoikoiStaticTest(unittest.TestCase):
    def test_listed_in_games_category(self):
        card = re.search(r'\{[^{}]*url: "games/hanafuda_koikoi.html"[^{}]*\}', DATA)
        self.assertIsNotNone(card)
        self.assertIn('category: "games"', card.group(0))
        self.assertIn('data-category="games"', (ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertIn("'games'", (ROOT / "home_menu.js").read_text(encoding="utf-8"))

    def test_page_basics_and_card_credit(self):
        self.assertIn('href="../index.html"', PAGE)
        self.assertEqual(PAGE.count("data:image/webp;base64,"), 48)
        self.assertIn("Louie Mantia", PAGE)
        self.assertIn("creativecommons.org/licenses/by-sa/4.0", PAGE)

    def test_engine_plays_full_games(self):
        script = PAGE.split("<script>")[1].split("</script>")[0]
        js = (
            "const m={exports:{}};new Function('module'," + json.dumps(script) + ")(m);const E=m.exports;"
            "for(let g=1;g<=40;g++){E.newGame(2,6,g,[true,true],[g%3,(g+1)%3]);const G=E.G;"
            "const all=[...G.hands[0],...G.hands[1],...G.field,...G.deck,...G.caps[0],...G.caps[1]];"
            "if(all.length!==48||new Set(all).size!==48)throw new Error('card leak');"
            "if(G.hist.length!==6)throw new Error('rounds');}"
            "const id=n=>E.CARDS.find(c=>c.nm===n).id;"
            "if(E.calc([id('松上鶴'),id('櫻幕'),id('芒月')]).total!==5)throw new Error('三光');"
            "if(E.calc([id('菊盃'),id('芒月')]).total!==5)throw new Error('月見酒');"
            "console.log('ok')"
        )
        out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)


if __name__ == "__main__":
    unittest.main()
