import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class XiangqiTests(unittest.TestCase):
    def test_save_lifecycle_and_leaderboard_eligibility(self):
        result = subprocess.run(
            ["node", "tests/test_xiangqi_app.cjs"], cwd=ROOT,
            capture_output=True, text=True, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Save lifecycle and leaderboard eligibility passed", result.stdout)

    def test_rules_ai_lessons_and_all_puzzles(self):
        result = subprocess.run(
            ["node", "tests/test_xiangqi.cjs"], cwd=ROOT,
            capture_output=True, text=True, timeout=90,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("12 Xiangqi checks passed", result.stdout)

    def test_game_assets_and_home_link(self):
        page = (ROOT / "games/xiangqi.html").read_text()
        data = (ROOT / "data.js").read_text()
        self.assertIn('url: "games/xiangqi.html"', data)
        self.assertIn('thumb: "games/thumbs/xiangqi.svg"', data)
        for name in ["xiangqi.js", "xiangqi.css", "xiangqi_engine.js", "xiangqi_puzzles.js", "xiangqi_lessons.js"]:
            self.assertIn(name, page)
            self.assertTrue((ROOT / "games" / name).is_file())
        self.assertIn('href="../index.html"', page)
        self.assertIn('aria-modal="true"', page)


if __name__ == "__main__":
    unittest.main()
