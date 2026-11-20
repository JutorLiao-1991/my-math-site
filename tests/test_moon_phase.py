from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'junior' / 'science' / 'moon_phase.html'


class MoonPhaseTests(unittest.TestCase):
    def test_models(self):
        r = subprocess.run(['node', '--test', 'tests/test_moon_phase.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_page_wiring(self):
        html = PAGE.read_text(encoding='utf-8')
        for needle in ['viewport', 'moon_phase_core.js', 'moon_phase.js', 'world_land.js', 'guided_study_core.js', 'id="study-mode"', 'id="proj-mode"',
                       'id="lab-operations"', 'id="moon-buttons"', 'id="time-buttons"', 'id="enter"', 'id="way-slider"', 'id="worksheet"', '12 點是以']:
            self.assertIn(needle, html)
        self.assertLess(html.index('moon_phase_core.js'), html.index('moon_phase.js?'))
        self.assertLess(html.index('world_land.js'), html.index('moon_phase.js?'))
        for src in re.findall(r'(?:src|href)="([^"?#]+)', html):
            if not src.startswith(('http', '../../index')):
                self.assertTrue((PAGE.parent / src).exists(), src)

    def test_study_mode_resets_scene(self):
        js = (PAGE.parent / 'moon_phase.js').read_text(encoding='utf-8')
        self.assertRegex(js, r"if \(name === 'study'\) resetScene\(\)")
        self.assertIn('setPlaying(false)', js[js.index('function resetScene'):js.index('function setMode')])

    def test_homepage_card(self):
        data = (ROOT / 'data.js').read_text(encoding='utf-8')
        self.assertIn('junior/science/moon_phase.html', data)
        self.assertIn('月相觀測（國三）', data)


if __name__ == '__main__':
    unittest.main()
