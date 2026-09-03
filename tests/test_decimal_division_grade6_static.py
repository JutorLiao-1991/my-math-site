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

    def test_remainder_and_rounding_modes_are_present(self):
        self.assertIn("startGame('remainder-whole')", self.page)
        self.assertIn("startGame('remainder-tenth')", self.page)
        self.assertIn("startGame('rounding')", self.page)
        self.assertIn("商取到整數", self.page)
        self.assertIn("商取到小數第一位", self.page)
        self.assertIn("我要取概數了！", self.page)

    def test_remainder_requires_decimal_point_placement(self):
        self.assertIn("function startRemainderPlacement", self.page)
        self.assertIn("function selectRemainderPosition", self.page)
        self.assertIn("餘數還要回到原題的小數位值", self.page)
        self.assertIn("remainderScale: 2", self.page)

    def test_rounding_requires_guard_digit_and_final_answer(self):
        self.assertIn("function requestRounding", self.page)
        self.assertIn("function roundingReady", self.page)
        self.assertIn("if (!roundingReady())", self.page)
        self.assertIn("判斷用的", self.page)
        self.assertIn("function renderFinalAnswer", self.page)
        self.assertIn("roundedAnswer", self.page)

    def test_decimal_move_is_required_before_long_division(self):
        self.assertIn("state.phase = 'shift-decimals'", self.page)
        self.assertIn("function moveDecimalsRight()", self.page)
        self.assertIn("state.decimalShiftCount++", self.page)
        self.assertIn("shiftDecimalString(state.problem.originalDivisor, state.decimalShiftCount)", self.page)
        self.assertIn("shiftDecimalString(state.problem.originalDividend, state.decimalShiftCount)", self.page)
        self.assertIn("if (shiftedDivisor.includes('.'))", self.page)
        self.assertIn("除數、被除數同時移動", self.page)

    def test_quotient_decimal_point_is_checked_before_digit_entry(self):
        self.assertIn("function prepareQuotientPointPlacement()", self.page)
        self.assertIn("function renderInlineQuotientPointSelector(row, digitCells, dotCell)", self.page)
        self.assertIn("function selectQuotientPosition(selectedIndex, button)", self.page)
        self.assertIn("const targetIndex = quotient.includes('.') ? quotient.indexOf('.') : -1", self.page)
        self.assertIn("state.phase = 'ready-digits'", self.page)
        self.assertIn("if (state.phase !== 'ready-digits') return", self.page)
        self.assertIn("商是整數", self.page)
        self.assertIn("state.hasErroredThisQuestion = true", self.page)

    def test_quotient_point_choices_are_embedded_in_long_division(self):
        self.assertIn("className = 'quotient-inline-row'", self.page)
        self.assertIn("className = 'inline-decimal-choice'", self.page)
        self.assertIn("digitCells[index].appendChild(choice)", self.page)
        self.assertIn("dotCell.appendChild(choice)", self.page)
        self.assertNotIn('id="quotient-point-panel"', self.page)
        self.assertNotIn('id="quotient-point-selector"', self.page)

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
    function runLongDivision(p) {
        const dividendDigits = p.dividend.replace('.', '');
        const quotientDigits = p.answer.replace('.', '');
        const offset = dividendDigits.length - quotientDigits.length;
        if (offset < 0) throw new Error('negative long-division offset');
        let current = Number(dividendDigits.substring(0, offset + 1));
        for (let index = 0; index < quotientDigits.length; index++) {
            const digit = Number(quotientDigits[index]);
            if (Math.floor(current / Number(p.divisor)) !== digit) throw new Error('invalid quotient step');
            current -= digit * Number(p.divisor);
            if (index < quotientDigits.length - 1) current = Number(String(current) + dividendDigits[offset + index + 1]);
        }
        return current;
    }

    const summary = {};
    for (const [mode, problems] of Object.entries(PROBLEM_BANKS)) {
        if (problems.length < 40) throw new Error(mode + ': too few problems');
        const roundDirections = new Set();
        const roundTargets = new Set();
        for (const p of problems) {
            const original = Number(p.originalDividend) / Number(p.originalDivisor);
            const transformed = Number(p.shiftedDividend) / Number(p.divisor);
            if (Math.abs(original - transformed) > 1e-9) throw new Error(mode + ': shift mismatch');
            if (!Number.isInteger(Number(p.divisor))) throw new Error(mode + ': divisor not integer');

            const finalRawRemainder = runLongDivision(p);
            if (p.kind === 'exact') {
                if (Math.abs(original - Number(p.answer)) > 1e-9) throw new Error(mode + ': exact answer mismatch');
                if ((mode.startsWith('int-')) !== !p.originalDividend.includes('.')) throw new Error(mode + ': dividend type');
                if (finalRawRemainder !== 0) throw new Error(mode + ': non-zero exact remainder');
            } else if (p.kind === 'remainder') {
                const quotientFactor = 10 ** p.quotientPlaces;
                const expectedQuotient = Math.floor((original + 1e-10) * quotientFactor) / quotientFactor;
                if (Math.abs(expectedQuotient - Number(p.answer)) > 1e-9) throw new Error(mode + ': truncated quotient mismatch');
                if (Math.abs(Number(p.originalDividend) - (Number(p.originalDivisor) * Number(p.answer) + Number(p.remainderAnswer))) > 1e-9) throw new Error(mode + ': remainder equation mismatch');
                if (!(Number(p.remainderAnswer) > 0 && Number(p.remainderAnswer) < Number(p.originalDivisor))) throw new Error(mode + ': remainder range');
                if (finalRawRemainder !== Number(p.rawRemainder)) throw new Error(mode + ': raw remainder mismatch');
                if (p.answer.replace('.', '').length > 3) throw new Error(mode + ': quotient over three digits');
                if (p.rawRemainder.length > 2 || p.remainderScale > 2) throw new Error(mode + ': remainder over two places');
            } else if (p.kind === 'rounding') {
                const guardFactor = 10 ** (p.targetPlaces + 1);
                const guardScaled = Number(p.answer.replace('.', ''));
                if (guardScaled !== Math.floor((original + 1e-10) * guardFactor)) throw new Error(mode + ': guard quotient mismatch');
                const expectedRoundedScaled = Math.floor((guardScaled + 5) / 10);
                const actualRoundedScaled = Math.round(Number(p.roundedAnswer) * (10 ** p.targetPlaces));
                if (expectedRoundedScaled !== actualRoundedScaled) throw new Error(mode + ': rounded answer mismatch');
                if (p.targetPlaces > 0 && p.roundedAnswer.split('.')[1]?.length !== p.targetPlaces) throw new Error(mode + ': missing trailing place');
                if (finalRawRemainder === 0) throw new Error(mode + ': rounding should exercise a non-terminating step');
                roundTargets.add(p.targetPlaces);
                roundDirections.add(Number(p.answer.slice(-1)) >= 5 ? 'up' : 'down');
            } else {
                throw new Error(mode + ': unknown kind');
            }
        }
        if (mode === 'rounding' && (roundTargets.size !== 3 || roundDirections.size !== 2)) throw new Error('rounding coverage incomplete');
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
        self.assertEqual(
            set(counts),
            {"int-one", "int-two", "decimal-one", "decimal-two", "remainder-whole", "remainder-tenth", "rounding"},
        )


if __name__ == "__main__":
    unittest.main()
