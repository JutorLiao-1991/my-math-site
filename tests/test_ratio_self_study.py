from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RatioSelfStudyTests(unittest.TestCase):
    def test_mathematics_and_progress_recovery(self):
        result = subprocess.run(
            ['node', '--test', 'tests/test_ratio_self_study.cjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
