from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
ELEMENTARY = ROOT / "elementary"
PAGES = sorted(ELEMENTARY.glob("*.html"))
THEME = (ELEMENTARY / "elementary_theme.css").read_text(encoding="utf-8")


class ElementaryThemeStaticTests(unittest.TestCase):
    def test_every_elementary_page_loads_shared_theme(self):
        self.assertEqual(len(PAGES), 8)
        for page in PAGES:
            html = page.read_text(encoding="utf-8")
            self.assertIn(
                '<link rel="stylesheet" href="elementary_theme.css">',
                html,
                page.name,
            )

    def test_shared_theme_matches_unit_convert_blue_gray_palette(self):
        self.assertIn("--primary-color: #4a90e2", THEME)
        self.assertIn("--bg-color: #f4f7f6", THEME)
        self.assertIn("--nav-bg: rgba(30, 41, 59, .96)", THEME)
        self.assertIn("--accent: #38bdf8", THEME)
        self.assertIn("--pink: #4a90e2", THEME)
        self.assertIn("rgba(74, 144, 226, .07)", THEME)

    def test_elementary_page_identity_uses_hedgehog(self):
        expected = {
            "unit_convert.html": "🦔 鳩特數理：單位換算特訓",
            "decimal_times_div.html": "🦔 小數乘法與除法（五年級）",
            "decimal_division_grade6.html": "🦔 小數的除法（六年級）",
            "time_times_div.html": "🦔 鳩特數理｜時間特訓基地",
            "rate_ratio_percentage.html": "🦔 鳩特數理｜比率與百分率特訓",
            "five_digit_add_sub.html": "🦔 五位數加減法（四年級）",
            "multiplication_upto_three_digits.html": "🦔 三位數以內的乘法（四年級）",
            "prime_test.html": "🦔 1~100",
        }
        for filename, title in expected.items():
            html = (ELEMENTARY / filename).read_text(encoding="utf-8")
            self.assertIn(title, html, filename)

    def test_shared_theme_keeps_prime_pk_players_distinguishable(self):
        self.assertIn(".btn-sp", THEME)
        self.assertIn("#4a90e2", THEME)
        self.assertIn(".btn-pk", THEME)
        self.assertIn("#0891b2", THEME)


if __name__ == "__main__":
    unittest.main()
