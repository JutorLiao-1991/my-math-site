from pathlib import Path
import json
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "elementary" / "factor_magpie_nest.html").read_text(encoding="utf-8")


def read_js_number_array(name):
    match = re.search(rf"const {name} = (\[[^;]+\]);", HTML)
    if not match:
        raise AssertionError(f"Missing JavaScript array: {name}")
    return json.loads(match.group(1))


def is_prime(number):
    if number < 2:
        return False
    return all(number % divisor for divisor in range(2, int(number ** 0.5) + 1))


class FactorMagpieNestStaticTests(unittest.TestCase):
    def test_exam_is_ten_questions_worth_ten_points_each(self):
        self.assertIn("const EXAM_ROUNDS = 10;", HTML)
        self.assertIn("const POINTS_PER_EXAM_QUESTION = 10;", HTML)
        self.assertIn("state.mode === 'exam' ? EXAM_ROUNDS : PRACTICE_ROUNDS", HTML)
        self.assertIn("滿分 ${EXAM_ROUNDS * POINTS_PER_EXAM_QUESTION} 分", HTML)

    def test_exam_has_fixed_difficulty_mix(self):
        self.assertIn("const EXAM_TWO_DIGIT_COMPOSITES = 5;", HTML)
        self.assertIn("const EXAM_TWO_DIGIT_PRIMES = 2;", HTML)
        self.assertIn("const EXAM_THREE_DIGIT_COMPOSITES = 3;", HTML)
        self.assertIn("state.questions = buildQuestions(state.mode);", HTML)
        self.assertIn("...shuffle(TWO_DIGIT_COMPOSITES).slice(0, EXAM_TWO_DIGIT_COMPOSITES)", HTML)
        self.assertIn("...shuffle(TWO_DIGIT_PRIMES).slice(0, EXAM_TWO_DIGIT_PRIMES)", HTML)
        self.assertIn("...shuffle(THREE_DIGIT_COMPOSITES).slice(0, EXAM_THREE_DIGIT_COMPOSITES)", HTML)

    def test_prime_and_three_digit_banks_are_mathematically_valid(self):
        primes = read_js_number_array("TWO_DIGIT_PRIMES")
        three_digit_composites = read_js_number_array("THREE_DIGIT_COMPOSITES")
        self.assertTrue(all(10 <= number <= 99 and is_prime(number) for number in primes))
        self.assertTrue(
            all(100 <= number <= 999 and not is_prime(number) for number in three_digit_composites)
        )

    def test_inputs_accept_three_digit_factors(self):
        self.assertIn("state.input[side].length < 3", HTML)

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
