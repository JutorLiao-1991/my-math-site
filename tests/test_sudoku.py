import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "games" / "sudoku.html").read_text(encoding="utf-8")


def run_node(body):
    js = (
        "const S = require('./games/sudoku_engine.js');\n"
        "const { SUDOKU_BANK: BANK, SUDOKU_TUTORIAL: TUT } = require('./games/sudoku_bank.js');\n"
        + body
    )
    out = subprocess.run(["node", "-"], input=js, capture_output=True, text=True, cwd=ROOT, timeout=120)
    if out.returncode:
        raise AssertionError(out.stderr)
    return json.loads(out.stdout)


class SudokuBankTests(unittest.TestCase):
    def test_every_bank_puzzle_is_unique_and_matches_its_level(self):
        r = run_node("""
          const rep = {};
          for (const lv of [1, 2, 3, 4]) {
            const list = BANK[lv]; let bad = [];
            list.forEach((p, k) => {
              const g = S.parse(p), gr = S.grade(g), n = g.filter(Boolean).length;
              const ok = S.isUnique(g) && gr.solved && (lv === 1 ? gr.maxLevel <= 2 && !gr.used.nakedSingle && n >= 36
                : lv === 2 ? gr.maxLevel === 2 && gr.used.nakedSingle : gr.maxLevel === lv);
              if (!ok) bad.push(k);
            });
            rep[lv] = { n: list.length, bad: bad.length, distinct: new Set(list).size };
          }
          console.log(JSON.stringify(rep));""")
        for lv in "1234":
            self.assertGreaterEqual(r[lv]["n"], 150, lv)
            self.assertEqual(r[lv]["bad"], 0, lv)
            self.assertEqual(r[lv]["distinct"], r[lv]["n"], lv)

    def test_seed_codes_round_trip_and_are_deterministic(self):
        r = run_node("""
          const rng = S.mulberry32(5); const out = [];
          for (let k = 0; k < 200; k++) {
            const lv = 1 + (k % 4), code = S.randomSeed(lv, rng), d = S.decodeSeed(code.toLowerCase().replace('-', ' '));
            const a = S.puzzleFromSeed(code, BANK), b = S.puzzleFromSeed(code, BANK);
            out.push(d && d.lv === lv && S.encodeSeed(d.lv, d.n) === code && S.format(a.puzzle) === S.format(b.puzzle) && a.lv === lv);
          }
          const bad = ['', '5-ABCDEF', '2-ABC', '2-ABCDE1', 'hello'].map(c => S.decodeSeed(c));
          console.log(JSON.stringify({ ok: out.every(Boolean), bad }));""")
        self.assertTrue(r["ok"])
        self.assertEqual(r["bad"], [None] * 5)

    def test_transforms_keep_validity_uniqueness_and_difficulty(self):
        r = run_node("""
          const rng = S.mulberry32(9); const out = [];
          for (let k = 0; k < 60; k++) {
            const lv = 1 + (k % 4), p = S.puzzleFromSeed(S.randomSeed(lv, rng), BANK);
            const base = S.grade(S.parse(BANK[lv][p.idx])), now = S.grade(p.puzzle);
            const solValid = S.conflicts(p.solution).size === 0 && !p.solution.includes(0) && p.puzzle.every((v, i) => !v || v === p.solution[i]);
            out.push(solValid && S.isUnique(p.puzzle) && base.maxLevel === now.maxLevel);
          }
          const daily = [S.dailySeed(2, '2026-11-21'), S.dailySeed(2, '2026-11-21'), S.dailySeed(2, '2026-11-22')];
          console.log(JSON.stringify({ ok: out.every(Boolean), daily }));""")
        self.assertTrue(r["ok"])
        self.assertEqual(r["daily"][0], r["daily"][1])
        self.assertNotEqual(r["daily"][0], r["daily"][2])

    def test_hints_always_point_to_the_real_answer(self):
        r = run_node("""
          const rng = S.mulberry32(3); let checks = 0, bad = 0, missing = 0;
          for (let k = 0; k < 40; k++) {
            const lv = 1 + (k % 4), p = S.puzzleFromSeed(S.randomSeed(lv, rng), BANK), g = p.puzzle.slice();
            /* 隨機填一些正確答案，模擬解到一半 */
            g.forEach((v, i) => { if (!v && rng() < .3) g[i] = p.solution[i]; });
            while (g.includes(0)) {
              const h = S.hint(g); if (!h.step) { missing++; break; }
              checks++; if (p.solution[h.step.place.i] !== h.step.place.d || !h.step.text) bad++;
              h.pre.forEach(s => s.elims.forEach(({ i, d }) => { if (p.solution[i] === d) bad++; }));
              g[h.step.place.i] = h.step.place.d;
            }
          }
          console.log(JSON.stringify({ checks, bad, missing }));""")
        self.assertGreater(r["checks"], 500)
        self.assertEqual(r["bad"], 0)
        self.assertEqual(r["missing"], 0)

    def test_tutorial_lessons_ask_for_the_correct_digit(self):
        r = run_node("""
          console.log(JSON.stringify(TUT.map(t => {
            const g = S.parse(t.grid), sol = S.solve(g);
            return { key: t.key, unique: S.isUnique(g), target: t.target ? sol[t.target.i] === t.target.d && !g[t.target.i] : null,
              elimsOk: t.elim ? t.elim.elims.every(({ i, d }) => sol[i] !== d) : null };
          })));""")
        self.assertEqual([x["key"] for x in r], ["rule", "hiddenBox", "hiddenLine", "nakedSingle", "pointing", "nakedPair", "practice"])
        for x in r:
            self.assertTrue(x["unique"], x)
            if x["target"] is not None:
                self.assertTrue(x["target"], x)
            if x["elimsOk"] is not None:
                self.assertTrue(x["elimsOk"], x)


class SudokuPageTests(unittest.TestCase):
    def test_page_wiring_and_listing(self):
        for needle in ['src="sudoku_engine.js"', 'src="sudoku_bank.js"', "page_views.js", 'id="board"', 'id="pad"', 'data-act="hint"',
                       "幼年鳩特", "青年鳩特", "成年鳩特", "鳩特大師", "function badName", "sdk_daily", "sdk_rank"]:
            self.assertIn(needle, HTML)
        data = (ROOT / "data.js").read_text(encoding="utf-8")
        self.assertIn('url: "games/sudoku.html"', data)
        self.assertTrue((ROOT / "games" / "thumbs" / "sudoku.svg").exists())
        for src in re.findall(r'<script src="([^"]+)"', HTML):
            self.assertTrue((ROOT / "games" / src).resolve().exists() or src.endswith("page_views.js"), src)

    def test_inline_script_parses(self):
        code = "\n".join(re.findall(r"<script>(.*?)</script>", HTML, re.S))
        out = subprocess.run(["node", "--check", "-"], input=code, capture_output=True, text=True, timeout=30)
        self.assertEqual(out.returncode, 0, out.stderr)


if __name__ == "__main__":
    unittest.main()
