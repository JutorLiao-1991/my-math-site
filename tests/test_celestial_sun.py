from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'senior' / 'earth' / 'celestial_sun.html'


class CelestialSunTests(unittest.TestCase):
    def test_models(self):
        r = subprocess.run(['node', '--test', 'tests/test_celestial_sun.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_page_wiring(self):
        html = PAGE.read_text(encoding='utf-8')
        for needle in ['viewport', 'star_core.js', 'sun_core.js', 'celestial_sun.js', 'guided_study_core.js', 'id="study-mode"', 'id="proj-mode"',
                       'id="lab-operations"', 'data-view="prep"', 'data-view="spiral"', 'data-frame="stars"', 'id="worksheet"', 'lab-sidebar-content']:
            self.assertIn(needle, html)
        self.assertLess(html.index('star_core.js'), html.index('sun_core.js'))
        self.assertLess(html.index('sun_core.js'), html.index('celestial_sun.js'))
        for src in re.findall(r'(?:src|href)="([^"?#]+)', html):
            if not src.startswith(('http', '../../index')):
                self.assertTrue((PAGE.parent / src).exists(), src)

    def test_study_mode_resets_animation(self):
        js = (ROOT / 'senior' / 'earth' / 'celestial_sun.js').read_text(encoding='utf-8')
        block = js[js.index('function setMode'):js.index("modeName = name")]
        for needle in ['setSpin(false)', 'setOrbiting(false)', 'sp.playing = false', "setView('sphere', false)"]:
            self.assertIn(needle, block)

    def test_homepage_card(self):
        self.assertIn('senior/earth/celestial_sun.html', (ROOT / 'data.js').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
