from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'senior' / 'physics' / 'motion_lab.html'


class MotionLabTests(unittest.TestCase):
    def test_physics_models(self):
        result = subprocess.run(['node', '--test', 'tests/test_motion_lab.cjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_page_wiring(self):
        html = PAGE.read_text(encoding='utf-8')
        for needle in ['viewport', 'motion_core.js', 'motion_lab.js', 'science_lab.js', 'guided_study_core.js',
                       'id="free-mode"', 'id="study-mode"', 'id="proj-mode"', 'id="lab-operations"', 'id="study-panel"']:
            self.assertIn(needle, html)
        for src in re.findall(r'(?:src|href)="([^"?#]+)', html):
            if src.startswith(('http', '../../index')):
                continue
            self.assertTrue((PAGE.parent / src).exists(), src)

    def test_homepage_card(self):
        data = (ROOT / 'data.js').read_text(encoding='utf-8')
        self.assertIn('senior/physics/motion_lab.html', data)
        self.assertTrue((ROOT / 'senior/physics/motion_lab.html').exists())


if __name__ == '__main__':
    unittest.main()
