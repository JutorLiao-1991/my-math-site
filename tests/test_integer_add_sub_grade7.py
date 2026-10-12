from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'junior/math/integer_add_sub_grade7.html'


class IntegerAddSubGrade7Tests(unittest.TestCase):
    def test_question_generator_session_and_ui_events(self):
        result = subprocess.run(['node', '--test', 'tests/test_integer_add_sub_grade7.cjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_local_assets_and_script_element_references(self):
        html = PAGE.read_text(encoding='utf-8')
        ids = re.findall(r'\bid="([^"]+)"', html)
        self.assertEqual(len(ids), len(set(ids)))
        for source in re.findall(r'(?:src|href)="([^"]+\.(?:js|css))"', html):
            self.assertTrue((PAGE.parent / source).is_file(), source)
        script = (PAGE.parent / 'integer_add_sub_grade7.js').read_text(encoding='utf-8')
        references = set(re.findall(r"\$\('([^']+)'\)", script))
        self.assertTrue(references <= set(ids), references - set(ids))


if __name__ == '__main__':
    unittest.main()
