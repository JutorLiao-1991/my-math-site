from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'senior/physics/wave_interference.html').read_text(encoding='utf-8')


class WaveExtrasTests(unittest.TestCase):
    def test_models(self):
        r = subprocess.run(['node', '--test', 'tests/test_wave_extras.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_page_wiring(self):
        for needle in ['wave_surface.js', 'id="proj-mode"', 'id="fullscreen"', 'id="proj-hint"']:
            self.assertIn(needle, HTML)
        self.assertLess(HTML.index('wave_surface.js'), HTML.index('wave_interference.js'))
        self.assertTrue((ROOT / 'senior/physics/wave_surface.js').exists())


if __name__ == '__main__':
    unittest.main()
