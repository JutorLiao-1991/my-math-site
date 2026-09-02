from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "junior" / "math" / "multiplication_formulas.html"
DATA = ROOT / "data.js"


class MultiplicationFormulasStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.data = DATA.read_text(encoding="utf-8")

    def test_page_is_listed_in_junior_math(self):
        self.assertTrue(PAGE.exists())
        card = re.search(
            r'title:\s*"乘法公式基礎練習"(?P<body>.*?)\n\s*\}',
            self.data,
            re.S,
        )
        self.assertIsNotNone(card)
        self.assertIn('category: "junior"', card.group("body"))
        self.assertIn('url: "junior/math/multiplication_formulas.html"', card.group("body"))

    def test_three_formulas_include_correct_difference_square_sign(self):
        self.assertIn(
            "(a − b)<sup>2</sup> = a<sup>2</sup> − 2ab + b<sup>2</sup>",
            self.html,
        )
        self.assertIn(
            "a<sup>2</sup> − b<sup>2</sup> = (a + b)(a − b)",
            self.html,
        )
        self.assertNotIn(
            "(a − b)<sup>2</sup> = a<sup>2</sup> + 2ab + b<sup>2</sup>",
            self.html,
        )

    def test_exam_rules_are_fixed(self):
        self.assertRegex(self.html, r"const EXAM_QUESTION_COUNT\s*=\s*10;")
        self.assertRegex(self.html, r"const EXAM_SECONDS\s*=\s*5\s*\*\s*60;")
        self.assertRegex(self.html, r"const POINTS_PER_QUESTION\s*=\s*10;")
        self.assertIn(
            "state.currentQuestionPoints = Math.max(0, state.currentQuestionPoints - wrongCount);",
            self.html,
        )
        self.assertIn("state.earnedScore += state.currentQuestionPoints;", self.html)
        self.assertIn("未完成題目不計分", self.html)

    def test_practice_requires_each_row_to_be_correct(self):
        self.assertIn('onclick="startPractice()"', self.html)
        self.assertIn("if (wrongCount > 0)", self.html)
        self.assertIn('nextRow.classList.remove("hidden")', self.html)
        self.assertIn("state.practiceCompleted++", self.html)

    def test_numbers_make_the_formula_a_shortcut(self):
        for lecture_example in (
            "{ a: value(200), b: value(3) }",
            "{ a: value(100), b: value(2) }",
            "{ a: value(498), b: value(302) }",
            "{ x: value(300), y: value(4) }",
            "{ x: value(52), y: value(48) }",
        ):
            self.assertIn(lecture_example, self.html)
        self.assertIn("squareSeeds[kind].direct.forEach", self.html)
        self.assertIn("squareSeeds[kind].reverse.forEach", self.html)
        self.assertIn("differenceSeeds.direct.forEach", self.html)
        self.assertIn("differenceSeeds.reverse.forEach", self.html)
        self.assertNotIn("differenceSeeds.forEach", self.html)
        self.assertNotIn("(100) × (4)", self.html)

    def test_negative_answers_can_be_entered_on_the_touch_keypad(self):
        self.assertIn("onclick=\"typeKey('-')\"", self.html)
        self.assertIn('>−</button>', self.html)

    def test_formula_reference_only_appears_in_practice(self):
        self.assertIn('id="practice-formula"', self.html)
        self.assertIn('if (state.mode === "practice")', self.html)
        self.assertIn('formulaReference.classList.remove("hidden")', self.html)
        self.assertIn('formulaReference.classList.add("hidden")', self.html)
        self.assertIn('formulaReference.innerHTML = ""', self.html)
        self.assertIn('? "綜合挑戰"', self.html)

    def test_runs_locally_without_ai_or_cloud_data_calls(self):
        lowered = self.html.lower()
        for forbidden in ("fetch(", "firebase", "gemini", "apikey", "generatecontent"):
            self.assertNotIn(forbidden, lowered)
        self.assertNotIn("user-scalable=no", lowered)


if __name__ == "__main__":
    unittest.main()
