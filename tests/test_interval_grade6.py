from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "elementary" / "interval_problems_grade6.html"


class IntervalGrade6Tests(unittest.TestCase):
    def test_mathematical_question_bank(self):
        result = subprocess.run(
            ["node", "--test", "tests/test_interval_grade6.cjs"],
            cwd=ROOT, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_interface_references_existing_elements_and_local_assets(self):
        html = PAGE.read_text(encoding="utf-8")
        script = (PAGE.parent / "interval_problems_grade6.js").read_text(encoding="utf-8")
        ids = re.findall(r'\bid="([^"]+)"', html)
        self.assertEqual(len(ids), len(set(ids)))
        references = set(re.findall(r"\$\('([^']+)'\)", script))
        self.assertTrue(references <= set(ids), references - set(ids))
        for source in re.findall(r'<script src="([^"]+)"', html):
            self.assertTrue((PAGE.parent / source).is_file(), source)


if __name__ == "__main__":
    unittest.main()
