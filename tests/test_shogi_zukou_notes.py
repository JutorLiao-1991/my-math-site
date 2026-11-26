import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTES_JS = (ROOT / "games/zukou_notes.js").read_text(encoding="utf-8")
PAGE = (ROOT / "games/shogi_zukou.html").read_text(encoding="utf-8")


def notes():
    out = subprocess.run(["node", "-e", "const window={};eval(require('fs').readFileSync('games/zukou_notes.js','utf8'));console.log(JSON.stringify(window.ZUKOU_NOTES[100]))"],
                         capture_output=True, text=True, cwd=ROOT)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


class ShogiZukouNotesTest(unittest.TestCase):
    def test_notes_are_ordered_and_within_the_problem(self):
        ns = notes()
        self.assertGreaterEqual(len(ns), 20)
        ats = [n["at"] for n in ns]
        self.assertEqual(ats[0], 0)
        self.assertEqual(ats, sorted(set(ats)))
        self.assertEqual(ats[-1], 611)
        for n in ns:
            self.assertTrue(n["t"].strip() and n["x"].strip())

    def test_page_loads_notes_and_offers_navigation(self):
        for text in ("zukou_notes.js", "講解時暫停", "重點導覽", 'data-act="jump"'):
            self.assertIn(text, PAGE)


if __name__ == "__main__":
    unittest.main()
