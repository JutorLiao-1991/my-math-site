from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class RatioGrade6Tests(unittest.TestCase):
    def test_mathematics_and_grade_metadata(self):
        result = subprocess.run(['node', '--test', 'tests/test_ratio_grade6.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_interface_elements_and_scripts_exist(self):
        for page, script in [('elementary/ratio_value_grade6.html', 'elementary/ratio_value_grade6.js'), ('index.html', 'home_menu.js')]:
            html = (ROOT / page).read_text()
            js = (ROOT / script).read_text()
            ids = re.findall(r'\bid="([^"]+)"', html)
            self.assertEqual(len(ids), len(set(ids)))
            refs = set(re.findall(r"\$\('([^']+)'\)", js))
            self.assertTrue(refs <= set(ids), refs - set(ids))
            for source in re.findall(r'<script src="([^"]+)"', html):
                path = ROOT / source.lstrip('/') if source.startswith('/') else (ROOT / page).parent / source
                self.assertTrue(path.is_file(), path)

if __name__ == '__main__':
    unittest.main()
