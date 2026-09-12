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
            "state.currentQuestionPoints=Math.max(0,state.currentQuestionPoints-1)",
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

    def test_two_step_term_workflow(self):
        self.assertIn('{label:"拆括號",answers:expandedTermAnswers(source,signs)}', self.html)
        self.assertIn('{label:"最後答案",answers:finalTermAnswers(result)}', self.html)
        self.assertIn('input.value!==row.answers[inputIndex]', self.html)
        self.assertIn('onclick="confirmCurrentTerm()"', self.html)
        self.assertNotIn("檢查本列", self.html)
        self.assertNotIn("checkCurrentRow", self.html)
        self.assertIn("state.practiceCompleted++", self.html)

    def test_nested_brackets_have_three_steps(self):
        self.assertIn('{label:"拆小括號"', self.html)
        self.assertIn('{label:"拆中括號"', self.html)
        self.assertIn("bracketStart:outside.length", self.html)
        self.assertIn('open.textContent="− ["', self.html)
        self.assertIn('close.textContent="]"', self.html)

    def test_each_step_starts_with_equals_sign(self):
        self.assertIn('equals.className="row-equals"', self.html)
        self.assertIn('equals.textContent="="', self.html)
        self.assertIn("line.appendChild(equals)", self.html)

    def test_touch_keypad_supports_complete_polynomial_terms(self):
        for key in ("plus", "minus", "x", "x2", "x3", "backspace"):
            self.assertIn(f'onclick="typeKey(\'{key}\')"', self.html)
        self.assertIn(">−</button>", self.html)
        self.assertIn(">x²</button>", self.html)
        self.assertIn(">x³</button>", self.html)
        self.assertIn('window.matchMedia("(pointer: coarse)").matches', self.html)
        self.assertIn('input.inputMode=touchOnly?"none":"text"', self.html)
        self.assertIn("input.readOnly=touchOnly", self.html)

    def test_standard_notation_is_required(self):
        self.assertIn("function canonicalTerm(", self.html)
        self.assertIn('degree>0&&absolute===1?"":String(absolute)', self.html)
        self.assertIn('position>0?"+":""', self.html)
        self.assertIn('input.value!==row.answers[inputIndex]', self.html)

    def test_mobile_keypad_is_fixed_during_play(self):
        self.assertIn("body.playing", self.html)
        self.assertIn(".mobile-dock{position:fixed", self.html)
        self.assertIn('document.body.classList.add("playing")', self.html)
        self.assertIn('document.body.classList.remove("playing")', self.html)

    def test_practice_highlight_and_cross_out_helpers(self):
        self.assertIn('id="highlight-btn"', self.html)
        self.assertIn('onclick="highlightCurrentDegree()"', self.html)
        self.assertIn("function updatePracticeHelper(", self.html)
        self.assertIn("function markDegreeDone(", self.html)
        self.assertIn(".degree-highlight", self.html)
        self.assertIn(".degree-done", self.html)
        for degree in ("3", "2", "1", "0"):
            self.assertIn(f'.helper[data-degree="{degree}"]', self.html)

    def test_correct_sound_matches_decimal_exercise(self):
        for sound_token in (
            'oscillator.type="sine"',
            "oscillator.frequency.setValueAtTime(659.25,now)",
            "oscillator.frequency.setValueAtTime(523.25,now+.3)",
            "oscillator.stop(now+1)",
        ):
            self.assertIn(sound_token, self.html)

    def test_runs_locally_without_cloud_calls(self):
        lowered = self.html.lower()
        for forbidden in ("fetch(", "firebase", "gemini", "apikey", "generatecontent"):
            self.assertNotIn(forbidden, lowered)
        self.assertNotIn("user-scalable=no", lowered)


if __name__ == "__main__":
    unittest.main()
