from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GuidedStudyTests(unittest.TestCase):
    def test_guided_learning_transitions(self):
        result = subprocess.run(['node', '--test', 'tests/test_guided_study.cjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_three_labs_load_guided_dependencies_before_their_app(self):
        for path in ['chemistry/equation_balance', 'chemistry/combustion_analysis',
                     'physics/wave_interference']:
            html = (ROOT / 'senior' / (path + '.html')).read_text()
            self.assertIn('guided_study.css?v=guided-study-1', html)
            self.assertLess(html.index('guided_study_core.js'),
                            html.index(path.split('/')[-1] + '.js'))


if __name__ == '__main__':
    unittest.main()
