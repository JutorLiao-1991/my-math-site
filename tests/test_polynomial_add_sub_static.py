from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "junior" / "math" / "polynomial_add_sub_grade8.html"
DATA = ROOT / "data.js"


class PolynomialAddSubStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.data = DATA.read_text(encoding="utf-8")

    def test_page_is_listed_in_junior_math(self):
        self.assertTrue(PAGE.exists())
        card = re.search(
            r'title:\s*"多項式的加減法（國二）"(?P<body>.*?)\n\s*\}',
            self.data,
            re.S,
        )
        self.assertIsNotNone(card)
        self.assertIn('category: "junior"', card.group("body"))
        self.assertIn(
            'url: "junior/math/polynomial_add_sub_grade8.html"',
            card.group("body"),
        )

    def test_modes_match_multiplication_formulas(self):
        self.assertIn('onclick="startPractice()"', self.html)
        self.assertIn('onclick="startExam()"', self.html)
        self.assertRegex(self.html, r"const EXAM_QUESTION_COUNT\s*=\s*10;")
        self.assertRegex(self.html, r"const EXAM_SECONDS\s*=\s*10\s*\*\s*60;")
        self.assertRegex(self.html, r"const POINTS_PER_QUESTION\s*=\s*10;")
        self.assertIn(
            "state.currentQuestionPoints=Math.max(0,state.currentQuestionPoints-wrongCount)",
            self.html,
        )
        self.assertIn(
            "state.earnedScore+=state.currentQuestionPoints",
            self.html,
        )

    def test_all_four_requested_topics_exist(self):
        for topic in (
            "多項式的加法",
            "有缺項的多項式加法",
            "多項式的減法",
            "多項式的加減混合運算",
        ):
            self.assertIn(topic, self.html)
        self.assertIn('value="addition"', self.html)
        self.assertIn('value="missing"', self.html)
        self.assertIn('value="subtraction"', self.html)
        self.assertIn('value="mixed"', self.html)

    def test_stepwise_coefficient_workflow(self):
        self.assertIn("去括號並對齊同類項（缺項填 0）", self.html)
        self.assertIn("合併 ", self.html)
        self.assertIn("依降冪排列填入最後答案的係數", self.html)
        self.assertIn('next.classList.remove("hidden")', self.html)
        self.assertIn("state.practiceCompleted++", self.html)

    def test_touch_keypad_supports_negative_coefficients(self):
        self.assertIn('onclick="typeKey(\'minus\')"', self.html)
        self.assertIn(">−</button>", self.html)
        self.assertIn('window.matchMedia("(pointer: coarse)").matches', self.html)
        self.assertIn('input.inputMode=touchOnly?"none":"numeric"', self.html)
        self.assertIn("input.readOnly=touchOnly", self.html)

    def test_runs_locally_without_cloud_calls(self):
        lowered = self.html.lower()
        for forbidden in ("fetch(", "firebase", "gemini", "apikey", "generatecontent"):
            self.assertNotIn(forbidden, lowered)
        self.assertNotIn("user-scalable=no", lowered)


if __name__ == "__main__":
    unittest.main()
