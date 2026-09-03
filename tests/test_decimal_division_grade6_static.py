import json
import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "elementary" / "decimal_division_grade6.html"
DATA = ROOT / "data.js"


class DecimalDivisionGrade6StaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = PAGE.read_text(encoding="utf-8")
        cls.data = DATA.read_text(encoding="utf-8")

    def test_home_lists_both_grade_levels(self):
        self.assertIn('title: "小數乘法與除法（五年級）"', self.data)
        self.assertIn('title: "小數的除法（六年級）"', self.data)
        self.assertIn('url: "elementary/decimal_division_grade6.html"', self.data)
        grade_five = (ROOT / "elementary" / "decimal_times_div.html").read_text(encoding="utf-8")
        self.assertIn("小數乘法與除法（五年級）", grade_five)

    def test_four_requested_modes_are_present(self):
        for mode in ("int-one", "int-two", "decimal-one", "decimal-two"):
            self.assertIn(f"startGame('{mode}')", self.page)
        self.assertIn("整數 ÷ 小數", self.page)
        self.assertIn("小數 ÷ 小數", self.page)

    def test_decimal_move_is_required_before_long_division(self):
        self.assertIn("state.phase = 'move-divisor'", self.page)
        self.assertIn("state.phase = 'move-dividend'", self.page)
        self.assertIn("state.phase = 'ready'", self.page)
        self.assertIn("function selectDecimalPosition", self.page)
        self.assertIn("const targetIndex = startIndex + shift", self.page)
        self.assertIn("讓被除數也向右移", self.page)

    def test_keeps_existing_challenge_rules_and_touch_numpad(self):
        self.assertIn("state.qIndex >= 10", self.page)
        self.assertIn("timer: 300", self.page)
        self.assertIn("state.score += 10", self.page)
        self.assertIn("shuffled(PROBLEM_BANKS[mode]).slice(0, 10)", self.page)
        self.assertNotRegex(self.page, r"<input\b")
        self.assertEqual(self.page.count('class="num-btn"'), 10)

    def test_generated_banks_have_valid_division_relationships(self):
        scripts = re.findall(r"<script>(.*?)</script>", self.page, re.S)
        self.assertEqual(len(scripts), 1)
        verification = "const SOURCE = " + json.dumps(scripts[0]) + ";\n" + r"""
global.window = global;
eval(SOURCE + `
    const summary = {};
    for (const [mode, problems] of Object.entries(PROBLEM_BANKS)) {
        if (problems.length < 40) throw new Error(mode + ': too few problems');
        for (const p of problems) {
            const original = Number(p.originalDividend) / Number(p.originalDivisor);
            const transformed = Number(p.shiftedDividend) / Number(p.divisor);
            if (Math.abs(original - Number(p.answer)) > 1e-9) throw new Error(mode + ': original mismatch');
            if (Math.abs(transformed - Number(p.answer)) > 1e-9) throw new Error(mode + ': shifted mismatch');
            if (!Number.isInteger(Number(p.divisor))) throw new Error(mode + ': divisor not integer');
            if ((mode.startsWith('int-')) !== !p.originalDividend.includes('.')) throw new Error(mode + ': dividend type');

            const dividendDigits = p.dividend.replace('.', '');
            const quotientDigits = p.answer.replace('.', '');
            const offset = dividendDigits.length - quotientDigits.length;
            if (offset < 0) throw new Error(mode + ': negative long-division offset');
            let current = Number(dividendDigits.substring(0, offset + 1));
            for (let index = 0; index < quotientDigits.length; index++) {
                const digit = Number(quotientDigits[index]);
                if (Math.floor(current / Number(p.divisor)) !== digit) throw new Error(mode + ': invalid quotient step');
                current -= digit * Number(p.divisor);
                if (index < quotientDigits.length - 1) current = Number(String(current) + dividendDigits[offset + index + 1]);
            }
            if (current !== 0) throw new Error(mode + ': non-zero final remainder');
        }
        summary[mode] = problems.length;
    }
    process.stdout.write(JSON.stringify(summary));
`);
"""
        completed = subprocess.run(
            ["node", "-e", verification],
            text=True,
            capture_output=True,
            cwd=ROOT,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        counts = json.loads(completed.stdout)
        self.assertEqual(set(counts), {"int-one", "int-two", "decimal-one", "decimal-two"})


if __name__ == "__main__":
    unittest.main()
