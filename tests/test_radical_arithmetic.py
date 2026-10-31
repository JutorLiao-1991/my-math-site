from pathlib import Path
import subprocess
import unittest


class RadicalArithmeticTests(unittest.TestCase):
    def test_math_steps_and_final_answer_exams(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(['node', '--test', 'tests/test_radical_arithmetic.cjs'], cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
