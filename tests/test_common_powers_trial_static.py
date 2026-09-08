from pathlib import Path
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "junior" / "math" / "common_powers_trial.html"
HTML = PAGE.read_text(encoding="utf-8")
DATA = (ROOT / "data.js").read_text(encoding="utf-8")


class CommonPowersTrialStaticTests(unittest.TestCase):
    def test_lesson_is_listed_in_junior_math(self):
        self.assertIn('title: "常見次方表（國一）"', DATA)
        self.assertIn('url: "junior/math/common_powers_trial.html"', DATA)
        self.assertIn('tagName: "國中數學"', DATA)
        self.assertIn("常見次方表（國一）", HTML)

    def test_requested_power_ranges_are_exact(self):
        self.assertIn(
            "POWER_RANGES={2:10,3:6,4:4,5:4,6:3,7:3,8:3,9:3,10:4}",
            HTML,
        )
        self.assertIn("Array.from({length:max+1}", HTML)
        self.assertIn("answer:Number(base)**exponent", HTML)
        self.assertIn("practiceExponent=0", HTML)

    def test_page_has_practice_single_and_two_player_modes(self):
        for text in ("練習模式", "單人模式", "雙人 PK"):
            self.assertIn(text, HTML)
        for function in ("openPractice", "startSinglePlayer", "showPKSetup"):
            self.assertIn(f"function {function}", HTML)

    def test_single_player_keeps_speed_scoring(self):
        self.assertIn("SP_TOTAL_Q=20", HTML)
        self.assertIn("SP_TIME_LIMIT=5000", HTML)
        self.assertIn("dt<=1500?5:5-((dt-1500)/3500)*4.9", HTML)
        self.assertIn("Math.max(.1,Math.round(pts*10)/10)", HTML)

    def test_pk_keeps_streak_catchup_and_win_scoring(self):
        self.assertIn("PK_WIN_SCORE=300", HTML)
        self.assertIn("let add=10", HTML)
        self.assertIn("pkStreaks[player]>=3", HTML)
        self.assertIn("add=20", HTML)
        self.assertIn("add=40", HTML)
        self.assertIn("Math.max(0,pkScores[player]-10)", HTML)

    def test_fill_keypads_support_five_digit_answers(self):
        for keypad in ("singleNumpad", "numpadTop", "numpadBottom"):
            self.assertIn(f'id="{keypad}"', HTML)
        self.assertIn("singleBuffer.length>=5", HTML)
        self.assertIn("pkBuffers[player].length>=5", HTML)
        self.assertIn("clear.textContent='清除'", HTML)
        self.assertIn("ok.textContent='確認'", HTML)
        self.assertNotIn("<input", HTML)

    def test_mode_switch_clears_running_schedules(self):
        self.assertIn('id="modeBack"', HTML)
        self.assertIn("function returnToModeMenu", HTML)
        self.assertIn("function clearSchedules", HTML)
        self.assertIn("showScreen('modeScreen')", HTML)

    def test_all_literal_javascript_ids_exist(self):
        ids = set(re.findall(r'\bid="([^"]+)"', HTML))
        refs = set(re.findall(r"\$\('([^']+)'\)", HTML))
        self.assertFalse(refs - ids, sorted(refs - ids))

    def test_inline_javascript_parses(self):
        script = re.search(r"<script>(.*)</script>", HTML, re.S)
        self.assertIsNotNone(script)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(script.group(1))
            handle.flush()
            result = subprocess.run(
                ["node", "--check", handle.name], capture_output=True, text=True
            )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
