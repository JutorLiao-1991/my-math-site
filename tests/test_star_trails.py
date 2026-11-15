from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'senior' / 'earth' / 'star_trails.html'


class StarTrailsTests(unittest.TestCase):
    def test_models(self):
        r = subprocess.run(['node', '--test', 'tests/test_star_trails.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_page_wiring(self):
        html = PAGE.read_text(encoding='utf-8')
        for needle in ['viewport', 'star_core.js', 'star_trails.js', 'guided_study_core.js', 'id="study-mode"', 'id="proj-mode"',
                       'id="lab-operations"', 'data-view="prep"', 'data-view="photo"', 'id="worksheet"']:
            self.assertIn(needle, html)
        self.assertLess(html.index('star_core.js'), html.index('star_trails.js'))
        for src in re.findall(r'(?:src|href)="([^"?#]+)', html):
            if not src.startswith(('http', '../../index')):
                self.assertTrue((PAGE.parent / src).exists(), src)

    def test_homepage_card(self):
        self.assertIn('senior/earth/star_trails.html', (ROOT / 'data.js').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
