from pathlib import Path
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "elementary" / "multiplication_table_trial.html"
HTML = PAGE.read_text(encoding="utf-8")
DATA = (ROOT / "data.js").read_text(encoding="utf-8")


class MultiplicationTableTrialStaticTests(unittest.TestCase):
    def test_lesson_is_listed_in_elementary_section(self):
        self.assertIn('title: "九九乘法試煉（二年級）"', DATA)
        self.assertIn('url: "elementary/multiplication_table_trial.html"', DATA)
        self.assertIn('category: "elementary"', DATA)
        self.assertIn("九九乘法試煉（二年級）", HTML)

    def test_page_has_three_requested_modes(self):
        for text in ("練習模式", "單人模式", "雙人 PK"):
            self.assertIn(text, HTML)
        self.assertIn("function openPractice", HTML)
        self.assertIn("function startSinglePlayer", HTML)
        self.assertIn("function showPKSetup", HTML)

    def test_practice_contains_tables_two_through_nine_and_nine_rows(self):
        self.assertIn("for(let n=2;n<=9;n++)", HTML)
        self.assertIn("for(let factor=1;factor<=9;factor++)", HTML)
        self.assertIn("startPracticeTable", HTML)
        self.assertIn("digit-slot", HTML)

    def test_single_player_keeps_prime_challenge_scoring(self):
        self.assertIn("SP_TOTAL_Q=20", HTML)
        self.assertIn("SP_TIME_LIMIT=5000", HTML)
        self.assertIn("dt<=1500?5:5-((dt-1500)/3500)*4.9", HTML)
        self.assertIn("Math.max(.1,Math.round(pts*10)/10)", HTML)

    def test_pk_keeps_prime_challenge_scoring(self):
        self.assertIn("PK_WIN_SCORE=300", HTML)
        self.assertIn("let add=10", HTML)
        self.assertIn("add=40", HTML)
        self.assertIn("pkStreaks[player]>=3", HTML)
        self.assertIn("add=20", HTML)
        self.assertIn("Math.max(0,pkScores[player]-10)", HTML)

    def test_single_and_both_pk_players_have_fill_keypads(self):
        for keypad in ("singleNumpad", "numpadTop", "numpadBottom"):
            self.assertIn(f'id="{keypad}"', HTML)
        self.assertIn("className='clear'", HTML)
        self.assertIn("className='confirm'", HTML)
        self.assertNotIn("<input", HTML)
        self.assertNotIn("質數</button>", HTML)

    def test_every_mode_can_return_to_mode_selection(self):
        self.assertIn('id="modeBack"', HTML)
        self.assertIn("function returnToModeMenu", HTML)
        self.assertIn("clearSchedules()", HTML)
        self.assertIn("showScreen('modeScreen')", HTML)

    def test_inline_javascript_parses(self):
        script = re.search(r"<script>(.*)</script>", HTML, re.S)
        self.assertIsNotNone(script)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(script.group(1))
            handle.flush()
            result = subprocess.run(["node", "--check", handle.name], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
