from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "elementary" / "factor_magpie_nest.html").read_text(encoding="utf-8")


class FactorMagpieNestStaticTests(unittest.TestCase):
    def test_exam_is_ten_questions_worth_ten_points_each(self):
        self.assertIn("const EXAM_ROUNDS = 10;", HTML)
        self.assertIn("const POINTS_PER_EXAM_QUESTION = 10;", HTML)
        self.assertIn("state.mode === 'exam' ? EXAM_ROUNDS : PRACTICE_ROUNDS", HTML)
        self.assertIn("滿分 ${EXAM_ROUNDS * POINTS_PER_EXAM_QUESTION} 分", HTML)

    def test_exam_deductions_apply_to_current_question_only(self):
        self.assertIn("function deductExamPoint()", HTML)
        self.assertIn("if (state.mode !== 'exam') return;", HTML)
        self.assertIn("state.mistakesThisRound++;", HTML)
        self.assertIn(
            "state.questionScore = Math.max(0, POINTS_PER_EXAM_QUESTION - state.mistakesThisRound);",
            HTML,
        )
        helper = re.search(
            r"function deductExamPoint\(\) \{(?P<body>.*?)\n    \}", HTML, re.S
        )
        self.assertIsNotNone(helper)
        self.assertNotIn("state.score", helper.group("body"))

    def test_question_score_is_awarded_once_when_round_is_complete(self):
        self.assertEqual(HTML.count("state.score += state.questionScore;"), 1)
        self.assertIn("本題獲得 ${state.questionScore} 分", HTML)
        self.assertNotIn("state.score += 10;\n      $('score')", HTML)

    def test_wrong_exam_decisions_cost_one_point(self):
        self.assertIn("if (alreadyComplete) deductExamPoint();", HTML)
        self.assertIn("state.found.has(key)", HTML)
        self.assertIn("本題扣 1 分", HTML)

    def test_exam_score_is_visible_during_each_question(self):
        self.assertIn('id="question-score-stat"', HTML)
        self.assertIn('id="question-score"', HTML)
        self.assertIn("$('question-score').textContent = String(state.questionScore);", HTML)


if __name__ == "__main__":
    unittest.main()
