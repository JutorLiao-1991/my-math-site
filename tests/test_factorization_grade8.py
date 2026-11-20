from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "junior" / "math" / "factorization_grade8.html"


class FactorizationGrade8Tests(unittest.TestCase):
    def test_core_generators_and_grading(self):
        result = subprocess.run(['node', '--test', 'tests/test_factorization_grade8.cjs'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_page_is_listed_and_wired(self):
        html = PAGE.read_text(encoding="utf-8")
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        card = re.search(r'title:\s*"因式分解（國二）"(?P<body>.*?)\n\s*\}', data, re.S)
        self.assertIsNotNone(card)
        self.assertIn('url: "junior/math/factorization_grade8.html"', card.group("body"))
        self.assertIn('grades: [8]', card.group("body"))
        for script in ("factorization_core.js", "factorization_grade8.js"):
            self.assertIn(f'<script src="{script}"></script>', html)
            self.assertTrue((PAGE.parent / script).exists())
        for mode in ("startTiles()", "startJudge()", "startPractice()", "startExam()"):
            self.assertIn(f'onclick="{mode}"', html)


if __name__ == '__main__':
    unittest.main()
