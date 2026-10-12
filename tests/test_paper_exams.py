from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PaperExamTests(unittest.TestCase):
    def test_question_banks_and_independent_answer_states(self):
        result = subprocess.run(['node', '--test', 'tests/test_paper_exams.cjs'], cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_shared_interface_has_no_missing_controls_or_assets(self):
        shared = (ROOT/'elementary/paper_practice.js').read_text()
        refs = set(re.findall(r"\$\('([^']+)'\)", shared))
        for page in ['ratio_value_grade6.html', 'interval_problems_grade6.html', 'rate_ratio_percentage.html']:
            html = (ROOT/'elementary'/page).read_text()
            ids = re.findall(r'\bid="([^"]+)"', html)
            self.assertEqual(len(ids),len(set(ids)),page)
            self.assertTrue(refs <= set(ids), refs-set(ids))
            for asset in re.findall(r'(?:src|href)="([^"#]+\.(?:js|css|html))"',html):
                self.assertTrue((ROOT/'elementary'/asset).is_file(),asset)

if __name__=='__main__':
    unittest.main()
