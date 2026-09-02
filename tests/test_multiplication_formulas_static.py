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

    def test_runs_locally_without_ai_or_cloud_data_calls(self):
        lowered = self.html.lower()
        for forbidden in ("fetch(", "firebase", "gemini", "apikey", "generatecontent"):
            self.assertNotIn(forbidden, lowered)
        self.assertNotIn("user-scalable=no", lowered)


if __name__ == "__main__":
    unittest.main()
