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
        self.assertEqual(PAGE.split("const IMG=")[1].split("];")[0].count("data:image/webp;base64,"), 48)
        for key in ("gold", "paper", "seal"):
            self.assertIn(f'"{key}":"data:image/webp;base64,', PAGE)
        for name in ("幼年鳩特", "青年鳩特", "成年鳩特", "大師鳩特"):
            self.assertIn(name, PAGE)
        self.assertIn("Louie Mantia", PAGE)
        self.assertIn("creativecommons.org/licenses/by-sa/4.0", PAGE)

    def test_tutorial_is_scripted_and_reachable(self):
        self.assertIn('data-act="tutorial"><b>新手教學</b>', PAGE)
        self.assertIn("const STEPS=[", PAGE)
        for gate in ("flip0", "after0", "choose", "decide", "turn0"):
            self.assertIn(f"'{gate}'", PAGE)
        self.assertIn("allow:'koi'", PAGE)
        self.assertIn("allow:'stop'", PAGE)

    def test_leaderboard_wired(self):
        self.assertIn('hanafuda_rank/', PAGE)
        self.assertIn('data-act="rank">排行榜</button>', PAGE)
        self.assertIn("G.seedManual", PAGE)
        self.assertIn("const esc=", PAGE)
        for r in ("3", "6", "12"):
            self.assertIn(r, PAGE.split("const RK_ROUNDS=")[1].split(";")[0])

    def test_engine_plays_full_games(self):
        script = PAGE.split("<script>")[1].split("</script>")[0]
        js = (
            "const m={exports:{}};new Function('module'," + json.dumps(script) + ")(m);const E=m.exports;"
            "for(let g=1;g<=40;g++){E.newGame(2,6,g,[true,true],[g%3,(g+1)%3]);const G=E.G;"
            "const all=[...G.hands[0],...G.hands[1],...G.field,...G.deck,...G.caps[0],...G.caps[1]];"
            "if(all.length!==48||new Set(all).size!==48)throw new Error('card leak');"
            "if(G.hist.length!==6)throw new Error('rounds');}"
            "for(let g=1;g<=3;g++){E.newGame(3,3,g,[true,true],[3,g%3]);const G=E.G;"
            "const all=[...G.hands[0],...G.hands[1],...G.field,...G.deck,...G.caps[0],...G.caps[1]];"
            "if(all.length!==48||new Set(all).size!==48)throw new Error('master card leak');"
            "if(G.hist.length!==3)throw new Error('master rounds');}"
            "const id=n=>E.CARDS.find(c=>c.nm===n).id;"
            "if(E.calc([id('松上鶴'),id('櫻幕'),id('芒月')]).total!==5)throw new Error('三光');"
            "if(E.calc([id('菊盃'),id('芒月')]).total!==5)throw new Error('月見酒');"
            "console.log('ok')"
        )
        out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ok", out.stdout)


    def test_master_level(self):
        for s in ("大師鳩特", "function mcPlay", "function mcKoi", "D(p)===3?mcPlay(p)", "seenBy(p)", "和四位電腦鳩特單挑"):
            self.assertIn(s, PAGE, s)

    def test_home_has_three_modes(self):
        for s in ('data-act="solo"><b>對戰鳩特</b>', 'data-act="net"><b>雙人對決</b>', 'data-act="tutorial"><b>新手教學</b>'):
            self.assertIn(s, PAGE)

    def test_online_rooms_wired(self):
        for s in ("hf_rooms", "hf_moves", "'松之間'", "'梅之間'", "'櫻之間'", "TURN_MS=30000", "DROP_MS=60000",
                  "onDisconnect", "runTransaction", "goOffline", "netAwait('p',p)", "netAwait('c',", "netAwait('k',",
                  "if(G.net&&G.net.seat===1)G.hands.reverse()", "function netAuto", "HFNet.claim(", "data-act=\"netrounds\""):
            self.assertIn(s, PAGE, s)

    def test_bad_name_filter(self):
        m = re.search(r"(const BADW=.*?\nfunction badName\(v\)\{.*?\n.*?\n.*?\n.*?\n.*?\}\n)", PAGE, re.S)
        self.assertIsNotNone(m)
        js = m.group(1) + r"""
const bad=['幹你娘','幹 你 娘','ㄍㄢˋ','靠北','f u c k','FUUUCK','sh1t','白痴','b!tch','操你媽'];
const good=['小明','鳩特粉','幹部小華','能幹的人','Alice','王小美','數學好難'];
console.log(bad.filter(x=>!badName(x)).join('|')+'#'+good.filter(x=>badName(x)).join('|'));
"""
        out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True)
        self.assertEqual(out.stdout.strip(), "#", out.stderr)

    def test_slam_impact_effects(self):
        for s in ("function slamFly", "function impact", "smash(){", "imp-ring", "imp-yk", "G.slam={c,t:take[0],big,yk"):
            self.assertIn(s, PAGE, s)


if __name__ == "__main__":
    unittest.main()
