from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'senior/chemistry/combustion_analysis.html').read_text(encoding='utf-8')


class CombustionExtrasTests(unittest.TestCase):
    def test_models(self):
        r = subprocess.run(['node', '--test', 'tests/test_combustion_extras.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_page_wiring(self):
        for needle in ['combustion_scene.js', 'combustion_analysis.css', 'id="apparatus3d"', 'id="table-panel"',
                       'id="proj-mode"', 'id="new-problem"', 'id="cu-apply"', 'id="view-3d"']:
            self.assertIn(needle, HTML)
        self.assertLess(HTML.index('combustion_scene.js'), HTML.index('combustion_analysis.js'))
        self.assertTrue((ROOT / 'senior/chemistry/combustion_scene.js').exists())


if __name__ == '__main__':
    unittest.main()
