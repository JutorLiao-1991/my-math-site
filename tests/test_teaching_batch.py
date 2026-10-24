from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TeachingBatchTests(unittest.TestCase):
    def test_models_and_entrypoints(self):
        result = subprocess.run(['node', '--test', 'tests/test_teaching_batch.cjs'], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
