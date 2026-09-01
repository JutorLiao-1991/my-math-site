import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class EnglishStaticSecurityTests(unittest.TestCase):
    def test_public_admin_has_no_credential_inputs_or_api_calls(self):
        source = (ROOT / "junior/english/admin.html").read_text(encoding="utf-8")
        forbidden = ["githubToken", "geminiKey", "localStorage", "generateContent", "api.github.com"]
        for marker in forbidden:
            self.assertNotIn(marker, source)

    def test_homepage_uses_one_english_hub(self):
        source = (ROOT / "data.js").read_text(encoding="utf-8")
        self.assertIn('url: "junior/english/index.html"', source)
        hub_start = source.index('title: "鳩特國中英文練習區"')
        hub_block = source[hub_start:source.index("}", hub_start)]
        self.assertIn('category: "language"', hub_block)
        self.assertNotIn('url: "junior/english/vol_test.html"', source)
        self.assertNotIn('url: "junior/english/basic_grammar.html"', source)

    def test_vocabulary_ui_has_school_term_names(self):
        source = (ROOT / "junior/english/vol_test.html").read_text(encoding="utf-8")
        for term in ["國一上", "國一下", "國二上", "國二下", "國三上", "國三下"]:
            self.assertIn(term, source)

    def test_vocabulary_self_study_uses_local_browser_progress(self):
        source = (ROOT / "junior/english/vol_test.html").read_text(encoding="utf-8")
        for marker in [
            'id="study-screen"',
            "開始單字自習",
            "只複習還不熟",
            "播放單字",
            "🐇 一般朗讀",
            "🐢 分段慢讀",
            "speakStudySentenceChunked()",
            "const SLOW_PHRASE_PAUSE_MS = 450",
            "const SLOW_PHRASE_WORDS = 2",
            "還不熟，稍後再來",
            "✅ 會了",
            'const STUDY_STORAGE_KEY = "jutor_vocab_study_v1"',
            "localStorage.setItem",
        ]:
            self.assertIn(marker, source)

    def test_existing_practice_and_exam_entries_remain_available(self):
        source = (ROOT / "junior/english/vol_test.html").read_text(encoding="utf-8")
        self.assertIn("startQuiz('practice')", source)
        self.assertIn("startQuiz('exam')", source)


if __name__ == "__main__":
    unittest.main()
