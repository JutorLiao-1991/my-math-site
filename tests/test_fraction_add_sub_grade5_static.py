from pathlib import Path
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "elementary" / "fraction_add_sub_grade5.html"
HTML = PAGE.read_text(encoding="utf-8")
DATA = (ROOT / "data.js").read_text(encoding="utf-8")


class FractionAddSubGrade5StaticTests(unittest.TestCase):
    def test_lesson_is_listed_in_elementary_section(self):
        self.assertIn('title: "分數的加減法（五年級）"', DATA)
        self.assertIn('url: "elementary/fraction_add_sub_grade5.html"', DATA)
        self.assertIn('category: "elementary"', DATA)

    def test_page_has_confirmed_modes_and_topics(self):
        for text in (
            "基礎", "進階", "同分母加減法", "異分母加減法",
            "帶分數加減法", "兩個分數", "三個分數",
            "練習模式", "10 分鐘測驗",
        ):
            self.assertIn(text, HTML)
        self.assertIn("body[data-level=\"advanced\"]", HTML)
        self.assertIn("--level:#202020", HTML)
        self.assertIn("--level:#4f8b70", HTML)

    def test_touch_keypad_replaces_native_keyboard(self):
        self.assertNotIn("<input", HTML)
        self.assertIn("touch-action:manipulation", HTML)
        self.assertIn('class="numpad"', HTML)
        self.assertIn("function inputDigit", HTML)
        self.assertIn("function submitEntry", HTML)

    def test_exam_matches_ten_question_ten_minute_scoring(self):
        self.assertIn("EXAM_SECONDS=10*60", HTML)
        self.assertIn("EXAM_QUESTIONS=10", HTML)
        self.assertIn("Math.max(0,10-mistakes)", HTML)
        self.assertIn("每次填錯或判斷錯誤扣 1 分", HTML)

    def test_fraction_generation_avoids_negative_intermediate_results(self):
        self.assertIn("if(current<=0){valid=false;break}", HTML)
        self.assertIn("if(whole<0||num<=0){valid=false;break}", HTML)
        self.assertIn("[['+','+'],['+','-'],['-','+'],['-','-']]", HTML)

    def test_unlike_fraction_flow_uses_lcm_then_expansion(self):
        self.assertIn("function lcmAll", HTML)
        self.assertIn("先找共同分母", HTML)
        self.assertIn("把每個分數擴成相同分母", HTML)
        self.assertLess(HTML.index("先找共同分母"), HTML.index("把每個分數擴成相同分母"))
        self.assertIn("return`${join(originals)}", HTML)
        self.assertIn("${join(expanded)}`", HTML)

    def test_mixed_number_flow_keeps_mixed_form_and_supports_borrowing(self):
        self.assertIn("加減法不需要把帶分數換成假分數", HTML)
        self.assertIn("先判斷是否借 1，再填答案", HTML)
        self.assertIn("向整數借 1</button>", HTML)
        self.assertIn("function pressBorrow", HTML)
        self.assertIn("這一步不需要借 1", HTML)
        self.assertIn("borrowed={whole:current.whole-1,num:current.num+common}", HTML)
        self.assertIn("先填整數，再填分數", HTML)
        self.assertNotIn('class="step-card borrow-card locked"', HTML)

    def test_mixed_addition_carries_a_whole_when_fraction_reaches_one(self):
        self.assertIn("carried={whole,num}", HTML)
        self.assertIn("result={whole:whole+1,num:num-common}", HTML)
        self.assertIn("分數滿 1，向整數進 1", HTML)
        self.assertIn('class="step-card carry-card locked"', HTML)

    def test_advanced_flow_repeats_until_irreducible(self):
        self.assertIn("這個分數還能約分嗎？", HTML)
        self.assertIn("function answerReducible", HTML)
        self.assertIn("function appendReductionRow", HTML)
        self.assertIn("setTimeout(askReducible,350)", HTML)
        self.assertIn("分子、分母要同除以一個大於 1 的整數", HTML)
        self.assertIn("先填分母，再填分子", HTML)
        self.assertIn("reduction.stage='den'", HTML)
        self.assertIn("請填：約分後的分母", HTML)

    def test_inline_javascript_parses(self):
        scripts = re.findall(r"<script>(.*?)</script>", HTML, re.DOTALL)
        self.assertEqual(len(scripts), 1)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write(scripts[0])
            script_path = Path(handle.name)
        try:
            result = subprocess.run(
                ["node", "--check", str(script_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
        finally:
            script_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
