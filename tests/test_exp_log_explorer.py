from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class ExpLogExplorerTests(unittest.TestCase):
    def test_mathematical_models(self):
        result = subprocess.run(['node', '--test', 'tests/test_exp_log_explorer.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
