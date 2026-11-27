import pathlib
import re
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class GomokuTests(unittest.TestCase):
    def test_engine_ai_audio_and_worker(self):
        result = subprocess.run(
            ["node", "tests/test_gomoku.cjs"], cwd=ROOT,
            capture_output=True, text=True, timeout=180,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("14 Gomoku checks passed", result.stdout)

    def test_tutorial_lessons_are_solvable(self):
        result = subprocess.run(
            ["node", "tests/test_gomoku_lessons.cjs"], cwd=ROOT,
            capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("10 Gomoku lesson checks passed", result.stdout)

    def test_tutorial_wired_into_page(self):
        page = (ROOT / "games/gomoku.html").read_text(encoding="utf-8")
        self.assertIn("gomoku_lessons.js", page)
        self.assertTrue((ROOT / "games/gomoku_lessons.js").is_file())
        for token in ["新手教學", 'data-act="lessons"', "lessonStart", "lessonTap", "jutor-gomoku-lessons-v1"]:
            self.assertIn(token, page)

    def test_game_assets_and_home_link(self):
        page = (ROOT / "games/gomoku.html").read_text(encoding="utf-8")
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        card = re.search(r'\{[^{}]*url: "games/gomoku\.html"[^{}]*\}', data).group(0)
        self.assertIn('category: "games"', card)
        self.assertIn('thumb: "games/thumbs/gomoku.svg"', card)
        self.assertIn('title: "鳩特五子棋"', card)
        for name in ["gomoku_engine.js", "gomoku_audio.js"]:
            self.assertIn(name, page)
            self.assertTrue((ROOT / "games" / name).is_file())
        self.assertTrue((ROOT / "games/gomoku_worker.js").is_file())
        self.assertIn("gomoku_worker.js", page)
        self.assertIn("../page_views.js", page)
        for svg in ["gomoku.svg", "gomoku_logo.svg"]:
            text = (ROOT / "games/thumbs" / svg).read_text(encoding="utf-8")
            self.assertTrue(text.lstrip().startswith("<svg"))
            self.assertIn("<path", text)
        self.assertIn("thumbs/gomoku_logo.svg", page)

    def test_menu_offers_every_level_and_target(self):
        page = (ROOT / "games/gomoku.html").read_text(encoding="utf-8")
        for name in ["幼年鳩特", "青年鳩特", "成年鳩特", "作弊鳩特"]:
            self.assertIn(name, page)
        self.assertIn("[1, 2, 3, 4, 5].map", page)
        self.assertIn("SIZES = [9, 15, 19]", page)
        self.assertIn("rollDice", page)


if __name__ == "__main__":
    unittest.main()
