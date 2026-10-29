from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class TimezoneGlobeTests(unittest.TestCase):
    def test_timezone_model(self):
        result = subprocess.run(['node', '--test', 'tests/test_timezone_globe.cjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

if __name__ == '__main__':
    unittest.main()
