from pathlib import Path
import json
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "junior" / "math" / "perfect_square_challenge.html"
HTML = PAGE.read_text(encoding="utf-8")
DATA = (ROOT / "data.js").read_text(encoding="utf-8")


class PerfectSquareChallengeStaticTests(unittest.TestCase):
    def test_lesson_is_listed_as_grade_eight_math(self):
        self.assertIn('title: "完全平方大挑戰（國二）"', DATA)
        self.assertIn('url: "junior/math/perfect_square_challenge.html"', DATA)
        self.assertIn("完全平方大挑戰（國二）", HTML)

    def test_has_general_and_expert_ranges(self):
        self.assertIn("const DIFFICULTY_LIMITS = { general: 20, expert: 40 };", HTML)
        self.assertIn("1²～20²", HTML)
        self.assertIn("1²～40²", HTML)
        self.assertIn("function setDifficulty(level)", HTML)

    def test_each_question_has_four_square_value_options(self):
        self.assertEqual(HTML.count('class="sp-opt-btn"'), 4)
        self.assertEqual(HTML.count('pk-opt-btn pk-opt-top'), 4)
        self.assertEqual(HTML.count('pk-opt-btn pk-opt-bottom'), 4)
        self.assertIn("const answer = base ** 2;", HTML)
        self.assertIn("const options = shuffle([answer, sameUnitDistractor", HTML)
        self.assertIn("renderPower(qText, question.base)", HTML)

    def test_distractors_include_exactly_one_matching_units_digit(self):
        self.assertIn("(root ** 2) % 10 === answer % 10", HTML)
        self.assertIn("(root ** 2) % 10 !== answer % 10", HTML)
        script = re.search(r"<script>(.*)</script>", HTML, re.S)
        self.assertIsNotNone(script)
        source = script.group(1)
        functions = "\n".join(
            re.search(pattern, source, re.S).group(0)
            for pattern in (
                r"function shuffle\(array\) \{.*?\n    \}",
                r"function buildQuestion\(base, limit = getDifficultyLimit\(\)\) \{.*?\n    \}",
            )
        )
        verification = functions + "\n" + r"""
for (const limit of [20, 40]) {
  for (let base = 1; base <= limit; base++) {
    for (let round = 0; round < 30; round++) {
      const q = buildQuestion(base, limit);
      if (q.options.length !== 4 || new Set(q.options).size !== 4) throw new Error('options');
      if (!q.options.includes(q.answer)) throw new Error('answer missing');
      if (!q.options.every(value => Number.isInteger(Math.sqrt(value)))) throw new Error('non-square');
      const matchingWrong = q.options.filter(value => value !== q.answer && value % 10 === q.answer % 10);
      if (matchingWrong.length !== 1) throw new Error('matching unit count');
    }
  }
}
"""
        result = subprocess.run(["node", "-e", verification], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_single_player_keeps_original_speed_rules(self):
        self.assertIn("const SP_TOTAL_Q = 20;", HTML)
        self.assertIn("const SP_TIME_LIMIT = 5000;", HTML)
        self.assertIn("if (dt <= 1500)", HTML)
        self.assertIn("5.0 - ((dt - 1500) / 3500) * 4.9", HTML)
        self.assertIn("spStreak >= 3", HTML)

    def test_pk_keeps_original_scoring_and_shared_options(self):
        self.assertIn("const PK_WIN_SCORE = 300;", HTML)
        self.assertIn("addScore = 10", HTML)
        self.assertIn("addScore = 20", HTML)
        self.assertIn("addScore = 40", HTML)
        self.assertIn("Math.max(0, pkScores[player] - 10)", HTML)
        self.assertIn("applyOptions([...document.querySelectorAll('.pk-opt-top')], pkCurrentQuestion.options)", HTML)
        self.assertIn("applyOptions([...document.querySelectorAll('.pk-opt-bottom')], pkCurrentQuestion.options)", HTML)

    def test_inline_javascript_parses(self):
        script = re.search(r"<script>(.*)</script>", HTML, re.S)
        self.assertIsNotNone(script)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(script.group(1))
            handle.flush()
            result = subprocess.run(["node", "--check", handle.name], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_all_literal_javascript_ids_exist(self):
        ids = set(re.findall(r'\bid="([^"]+)"', HTML))
        refs = set(re.findall(r"getElementById\('([^']+)'\)", HTML))
        self.assertFalse(refs - ids, sorted(refs - ids))


if __name__ == "__main__":
    unittest.main()
