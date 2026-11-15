from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'senior' / 'physics' / 'doppler_lab.html'


class DopplerLabTests(unittest.TestCase):
    def test_physics_models(self):
        result = subprocess.run(['node', '--test', 'tests/test_doppler_lab.cjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_page_wiring(self):
        html = PAGE.read_text(encoding='utf-8')
        for needle in ['viewport', 'doppler_core.js', 'doppler_lab.js', 'science_lab.js', 'guided_study_core.js',
                       'id="free-mode"', 'id="study-mode"', 'id="proj-mode"', 'id="lab-operations"', 'id="study-panel"']:
            self.assertIn(needle, html)
        self.assertLess(html.index('doppler_core.js'), html.index('doppler_lab.js'))
        for src in re.findall(r'(?:src|href)="([^"?#]+)', html):
            if src.startswith(('http', '../../index')):
                continue
            self.assertTrue((PAGE.parent / src).exists(), src)

    def test_homepage_card(self):
        self.assertIn('senior/physics/doppler_lab.html', (ROOT / 'data.js').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
