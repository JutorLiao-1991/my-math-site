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

    def test_sentence_quiz_is_removed_but_word_examples_remain(self):
        source = (ROOT / "junior/english/vol_test.html").read_text(encoding="utf-8")
        self.assertNotIn('id="practiceType"', source)
        self.assertNotIn('sentenceListName', source)
        self.assertNotIn('r + " (句型)"', source)
        self.assertIn("單字考試（20 題）", source)
        self.assertIn("currentList = wordList.slice(0, 20)", source)
        self.assertIn("每題 5 分，共 100 分", source)
        self.assertIn("currentWordObj.sentence", source)

    def test_grammar_exam_is_ten_questions_and_one_hundred_points(self):
        source = (ROOT / "junior/english/basic_grammar.html").read_text(encoding="utf-8")
        self.assertIn("const SP_TOTAL_Q = 10", source)
        self.assertIn("const SP_EXAM_SECONDS = 10 * 60", source)
        self.assertIn("spQuestionsPool = shuffle([...currentTopicData.pool]).slice(0, totalQ)", source)
        self.assertIn("spScore += 10", source)
        self.assertNotIn("SP_TIME_LIMIT", source)
        self.assertNotIn("spStartTimer", source)
        self.assertIn("這個文法題庫尚未滿 10 題", source)

    def test_grammar_uses_each_questions_options_with_legacy_fallback(self):
        source = (ROOT / "junior/english/basic_grammar.html").read_text(encoding="utf-8")
        self.assertIn("function getQuestionOptions(question)", source)
        self.assertIn("Array.isArray(question.options) && question.options.length", source)
        self.assertIn("Array.isArray(currentTopicData.options) ? currentTopicData.options : []", source)
        self.assertIn("setupButtons(currentQ)", source)
        self.assertIn("setupButtons(pkCurrentQ)", source)
        self.assertIn("const options = getQuestionOptions(currentQ)", source)
        self.assertIn("const options = getQuestionOptions(pkCurrentQ)", source)
        self.assertEqual(source.count("currentTopicData.options"), 2)


if __name__ == "__main__":
    unittest.main()
