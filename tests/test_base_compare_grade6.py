from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "elementary" / "base_compare_grade6.html"


class BaseCompareGrade6Tests(unittest.TestCase):
    def test_question_bank(self):
        result = subprocess.run(
            ["node", "--test", "tests/test_base_compare_grade6.cjs"],
            cwd=ROOT, capture_output=True, text=True, timeout=60,
        )
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
        practice_types = set(re.findall(r'data-type="([^"]+)"', html))
        self.assertEqual(practice_types, {"value", "sum", "sumBase", "diff", "diffBase", "judge", "choice", "mixed"})

    def test_listed_in_menu_with_grade(self):
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        self.assertIn('url: "elementary/base_compare_grade6.html"', data)
        self.assertIn('title: "基準量與比較量（六年級）"', data)


if __name__ == "__main__":
    unittest.main()
