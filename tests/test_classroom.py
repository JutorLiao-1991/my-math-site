from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ClassroomMonitorTests(unittest.TestCase):
    def test_sender(self):
        result = subprocess.run(["node", "--test", "tests/test_classroom.cjs"], cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_pages_are_private_and_unlisted(self):
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        for name in ["index.html", "setup.html"]:
            html = (ROOT / "classroom" / name).read_text(encoding="utf-8")
            self.assertIn('name="robots" content="noindex, nofollow"', html)
            self.assertNotIn(f"classroom/{name}", data)
            ids = re.findall(r'\bid="([^"]+)"', html)
            self.assertEqual(len(ids), len(set(ids)), name)
            for asset in re.findall(r'(?:src|href)="([^"#]+\.(?:js|css))"', html):
                self.assertTrue((ROOT / "classroom" / asset).resolve().is_file(), asset)

    def test_no_classroom_code_is_committed(self):
        for path in ROOT.rglob("*"):
            if path.suffix in {".js", ".html"} and ".git" not in path.parts:
                text = path.read_text(encoding="utf-8", errors="ignore")
                self.assertIsNone(re.search(r"classroom/[A-Za-z0-9]{20,}", text), path)


if __name__ == "__main__":
    unittest.main()
