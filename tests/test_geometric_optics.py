from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'junior/science/geometric_optics.html'
SCRIPT = ROOT / 'junior/science/geometric_optics.js'


class GeometricOpticsTests(unittest.TestCase):
    def test_ray_geometry_and_images(self):
        result = subprocess.run(['node', '--test', 'tests/test_geometric_optics.cjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_page_offers_four_topics_and_classroom_modes(self):
        html = PAGE.read_text(encoding='utf-8')
        for topic in ['reflection', 'refraction', 'mirror', 'lens']:
            self.assertIn(f'data-topic="{topic}"', html)
        for mode in ['free-mode', 'study-mode', 'proj-mode', 'fullscreen']:
            self.assertIn(f'id="{mode}"', html)
        for script in ['science_lab.js', 'guided_study_core.js', 'geometric_optics_core.js', 'geometric_optics.js']:
            self.assertIn(script, html)

    def test_study_mode_resets_and_stops_animation(self):
        js = SCRIPT.read_text(encoding='utf-8')
        start = js.index('function setMode(name)')
        body = js[start:js.index('\n  }', start)]
        self.assertIn("if (name === 'study') { resetTopic(false); restartNext = true; setPlaying(false); }", body)

    def test_catalog_entry_has_grade_suffix(self):
        data = (ROOT / 'data.js').read_text(encoding='utf-8')
        self.assertIn('title: "光的反射與折射實驗室（國二）"', data)


if __name__ == '__main__':
    unittest.main()
