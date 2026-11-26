from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "elementary" / "division_grade3.html"


class DivisionGrade3Tests(unittest.TestCase):
    def test_question_bank(self):
        result = subprocess.run(["node", "--test", "tests/test_division_grade3.cjs"], cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_page_has_shared_controls_and_local_assets(self):
        html = PAGE.read_text(encoding="utf-8")
        shared = (ROOT / "elementary" / "paper_practice.js").read_text(encoding="utf-8")
        ids = re.findall(r'\bid="([^"]+)"', html)
        self.assertEqual(len(ids), len(set(ids)))
        refs = set(re.findall(r"\$\('([^']+)'\)", shared))
        self.assertTrue(refs <= set(ids), refs - set(ids))
        for asset in re.findall(r'(?:src|href)="([^"#]+\.(?:js|css))"', html):
            self.assertTrue((PAGE.parent / asset).is_file(), asset)
        self.assertEqual(set(re.findall(r'data-type="([^"]+)"', html)),
                         {"meaning", "remainder", "calc", "vertical", "verticalWord", "zeroOne", "parity", "judge", "choice", "mixed"})
        for key in ["fraction", ".", "space"]:
            self.assertIn(f'data-key="{key}" hidden', html)

    def test_listed_in_menu_with_grade(self):
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        card = re.search(r'\{[^{}]*url: "elementary/division_grade3.html"[^{}]*\}', data)
        self.assertIsNotNone(card)
        self.assertIn('grades: [3]', card.group(0))
        self.assertIn('title: "除法（三年級）"', card.group(0))


if __name__ == "__main__":
    unittest.main()
