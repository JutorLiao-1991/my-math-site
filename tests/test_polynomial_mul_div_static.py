from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "junior" / "math" / "polynomial_mul_div_grade8.html"
DATA = ROOT / "data.js"


class PolynomialMulDivStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.data = DATA.read_text(encoding="utf-8")

    def test_page_is_listed_in_junior_math(self):
        self.assertTrue(PAGE.exists())
        card = re.search(
            r'title:\s*"多項式乘除法（國二）"(?P<body>.*?)\n\s*\}',
            self.data,
            re.S,
        )
        self.assertIsNotNone(card)
        self.assertIn('category: "junior"', card.group("body"))
        self.assertIn(
            'url: "junior/math/polynomial_mul_div_grade8.html"',
            card.group("body"),
        )

    def test_practice_and_exam_contract(self):
        self.assertIn('onclick="startPractice()"', self.html)
        self.assertIn('onclick="startExam()"', self.html)
        self.assertRegex(self.html, r"const EXAM_QUESTION_COUNT\s*=\s*10;")
        self.assertRegex(self.html, r"const EXAM_SECONDS\s*=\s*10\s*\*\s*60;")
        self.assertRegex(self.html, r"const POINTS_PER_QUESTION\s*=\s*10;")
        self.assertIn(
            "state.currentQuestionPoints=Math.max(0,state.currentQuestionPoints-1)",
            self.html,
        )
        self.assertIn("state.earnedScore+=state.currentQuestionPoints", self.html)

    def test_all_requested_topics_are_selectable(self):
        expected = {
            "single_mul": "重點2｜單項式 × 多項式",
            "poly_mul": "重點3｜多項式 × 多項式",
            "formula": "重點5｜利用乘法公式",
            "single_div": "重點6｜單項式 ÷ 單項式",
            "long_div": "重點8｜多項式長除法",
        }
        for value, label in expected.items():
            self.assertIn(f'value="{value}"', self.html)
            self.assertIn(label, self.html)

    def test_multiplication_workflow_and_error_hint(self):
        for label in ("逐項相乘", "寫出尚未合併的展開式", "合併同類項"):
            self.assertIn(label, self.html)
        self.assertIn("數字 × 數字、文字 × 文字", self.html)
        self.assertIn('hintKind:"mul"', self.html)

    def test_formula_workflow_is_stepwise(self):
        for label in ("第一項平方", "中間項 2ab", "第二項平方", "合併答案"):
            self.assertIn(label, self.html)
        for formula in (
            "(a + b)² = a² + 2ab + b²",
            "(a − b)² = a² − 2ab + b²",
            "(a + b)(a − b) = a² − b²",
        ):
            self.assertIn(formula, self.html)

    def test_single_division_is_one_step_with_targeted_hint(self):
        self.assertIn('makeStep("一步寫出商"', self.html)
        self.assertIn("數字 ÷ 數字、文字 ÷ 文字", self.html)
        self.assertIn('hintKind:"div"', self.html)

    def test_long_division_requires_missing_terms_and_three_phase_rounds(self):
        self.assertIn('makeStep("先補齊被除式的缺項"', self.html)
        self.assertIn("寫出商的一項", self.html)
        self.assertIn("乘回一列", self.html)
        self.assertIn("相減一列", self.html)
        self.assertIn("最後確認商式與餘式", self.html)
        self.assertIn('longKind:"quotient"', self.html)
        self.assertIn('longKind:"product"', self.html)
        self.assertIn('longKind:"difference"', self.html)
        self.assertIn("function longDivide(", self.html)
        self.assertIn("rounds.length>0&&qcoef.n>0", self.html)

    def test_long_division_limits_and_responsive_grid(self):
        self.assertIn("被除式最高三次、除式最高二次", self.html)
        self.assertIn("--poly-cols", self.html)
        self.assertIn("grid-template-columns:minmax(64px,.9fr)", self.html)
        self.assertIn("@media(max-width:590px)", self.html)
        self.assertIn(".step.future{display:none}", self.html)
        self.assertIn(
            "longArea.appendChild(renderFinalDivision(step,index))",
            self.html,
        )

    def test_fraction_and_touch_keyboard_support(self):
        self.assertIn("function parseRational(", self.html)
        self.assertIn("function answerMatches(", self.html)
        self.assertIn("rat(5,3)", self.html)
        self.assertIn("rat(1,3)", self.html)
        for key in ("slash", "plus", "minus", "x", "x2", "x3", "backspace"):
            self.assertIn(f'onclick="typeKey(\'{key}\')"', self.html)
        self.assertIn('window.matchMedia("(pointer: coarse)").matches', self.html)

    def test_correct_sound_matches_existing_exercises(self):
        for token in (
            'oscillator.type="sine"',
            "oscillator.frequency.setValueAtTime(659.25,now)",
            "oscillator.frequency.setValueAtTime(523.25,now+.3)",
            "oscillator.stop(now+1)",
        ):
            self.assertIn(token, self.html)

    def test_no_cloud_dependency_or_locked_zoom(self):
        lowered = self.html.lower()
        for forbidden in ("fetch(", "firebase", "gemini", "apikey", "generatecontent"):
            self.assertNotIn(forbidden, lowered)
        self.assertNotIn("user-scalable=no", lowered)


if __name__ == "__main__":
    unittest.main()
