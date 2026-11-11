from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GeometricOpticsTests(unittest.TestCase):
    def test_ray_geometry_and_images(self):
        result = subprocess.run(['node', '--test', 'tests/test_geometric_optics.cjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
