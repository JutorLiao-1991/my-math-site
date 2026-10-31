from pathlib import Path
import subprocess
import unittest


class SimplestRadicalTests(unittest.TestCase):
    def test_exact_math_and_game_flow(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(['node', '--test', 'tests/test_simplest_radical.cjs'], cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
