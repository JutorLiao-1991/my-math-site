import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FAKE_ENV = """
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.location = { pathname: '/junior/math/factorization_grade8.html' };
globalThis.document = { title: '國二因式分解｜鳩特', currentScript: { dataset: { auto: 'off' } } };
globalThis.window = globalThis;
globalThis.fetch = async () => ({ ok: false });
"""


def run_node(body):
    js = FAKE_ENV + (ROOT / "page_views.js").read_text(encoding="utf-8") + (ROOT / "battle_log.js").read_text(encoding="utf-8") + body
    out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT, timeout=30)
    if out.returncode:
        raise AssertionError(out.stderr)
    return json.loads(out.stdout)


def lesson_urls():
    return re.findall(r'url: "([^"]+)"', (ROOT / "data.js").read_text(encoding="utf-8"))


class PageViewTests(unittest.TestCase):
    def test_keys_match_between_card_url_and_served_path(self):
        r = run_node("""console.log(JSON.stringify([
          JutorViews.keyOf('games/minesweeper.html'), JutorViews.keyOf('/games/minesweeper'), JutorViews.keyOf('/games/minesweeper.html?x=1'),
          JutorViews.keyOf('junior/english/index.html'), JutorViews.keyOf('/junior/english/'), JutorViews.keyOf('/'),
          JutorViews.keyOf('senior/math/Family_of_planes.html')]))""")
        self.assertEqual(r[0], "games__minesweeper")
        self.assertEqual(r[0], r[1])
        self.assertEqual(r[0], r[2])
        self.assertEqual(r[3], r[4])
        self.assertEqual(r[5], "index")
        self.assertRegex(r[6], r"^[a-z0-9_]+$")

    def test_every_card_key_is_unique_and_firebase_safe(self):
        keys = run_node("console.log(JSON.stringify(%s.map(u => JutorViews.keyOf(u))))" % json.dumps(lesson_urls()))
        self.assertEqual(len(keys), len(set(keys)))
        for k in keys:
            self.assertRegex(k, r"^[a-z0-9_]{1,100}$")

    def test_every_card_page_counts_views(self):
        for url in lesson_urls():
            html = (ROOT / url).read_text(encoding="utf-8")
            self.assertIn("page_views.js", html, url)
            src = re.search(r'src="([^"]*page_views\.js)"', html).group(1)
            self.assertTrue((ROOT / url).parent.joinpath(src).resolve().exists(), url)


class BattleLogTests(unittest.TestCase):
    def test_records_practice_and_exam_with_page_and_title(self):
        r = run_node("""
          JutorLog.practice(true); JutorLog.practice(false, '判型');
          JutorLog.exam({ score: 90, full: 100, correct: 9, count: 10, secs: 312.456 });
          console.log(JSON.stringify(JutorLog.load()));""")
        self.assertEqual([e["m"] for e in r], ["p", "p", "e"])
        self.assertEqual(r[0]["p"], "junior/math/factorization_grade8")
        self.assertEqual(r[0]["n"], "國二因式分解")
        self.assertEqual((r[0]["ok"], r[1]["ok"], r[1]["l"]), (1, 0, "判型"))
        self.assertEqual((r[2]["s"], r[2]["f"], r[2]["c"], r[2]["q"], r[2]["d"]), (90, 100, 9, 10, 312.46))

    def test_old_entries_are_dropped_and_import_merges_without_duplicates(self):
        r = run_node("""
          const now = Date.now();
          JutorLog.replace([{ t: now - 90 * 864e5, p: 'old', m: 'p', ok: 1 }, { t: now - 864e5, p: 'a', m: 'p', ok: 1 }]);
          const kept = JutorLog.load().length;
          const added = JutorLog.merge([{ t: now - 864e5, p: 'a', m: 'p', ok: 1 }, { t: now - 2 * 864e5, p: 'b', m: 'e', s: 8, f: 10 }, { bad: true }]);
          console.log(JSON.stringify({ kept, added, total: JutorLog.load().length }));""")
        self.assertEqual(r, {"kept": 1, "added": 1, "total": 2})

    def test_homepage_has_records_dialog_and_view_badges(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        for needle in ['id="open-records"', 'id="records-dialog"', "battle_log.js", "page_views.js", "home_records.js"]:
            self.assertIn(needle, html)
        menu = (ROOT / "home_menu.js").read_text(encoding="utf-8")
        self.assertIn("data-views-key", menu)
        records = (ROOT / "home_records.js").read_text(encoding="utf-8")
        for label in ["最近三天", "最近一週", "最近一個月", "匯出備份", "匯入備份"]:
            self.assertIn(label, records)


class ScratchpadTests(unittest.TestCase):
    def test_every_practice_page_has_the_scratchpad(self):
        pages = [p for p in ROOT.rglob("*.html") if p.parent.name != "classroom" and ("battle_log.js" in p.read_text(encoding="utf-8") and p.name != "index.html" or p.parent.name == "english" and "battle_log.js" in p.read_text(encoding="utf-8"))]
        self.assertGreaterEqual(len(pages), 25)
        for p in pages:
            html = p.read_text(encoding="utf-8")
            m = re.search(r'src="([^"]*scratchpad\.js)"', html)
            self.assertIsNotNone(m, p)
            self.assertTrue(p.parent.joinpath(m.group(1)).resolve().exists(), p)

    def test_scratchpad_script_parses(self):
        out = subprocess.run(["node", "--check", str(ROOT / "scratchpad.js")], capture_output=True, text=True, timeout=30)
        self.assertEqual(out.returncode, 0, out.stderr)


if __name__ == "__main__":
    unittest.main()
