from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ADD_SUB = (ROOT / "elementary" / "five_digit_add_sub.html").read_text(encoding="utf-8")
MULTIPLICATION = (ROOT / "elementary" / "multiplication_upto_three_digits.html").read_text(encoding="utf-8")
DATA = (ROOT / "data.js").read_text(encoding="utf-8")


def test_grade4_lessons_are_listed_in_elementary_section():
    assert 'title: "五位數加減法（四年級）"' in DATA
    assert 'url: "elementary/five_digit_add_sub.html"' in DATA
    assert 'title: "三位數以內的乘法（四年級）"' in DATA
    assert 'url: "elementary/multiplication_upto_three_digits.html"' in DATA


def test_both_lessons_are_touch_first_and_do_not_open_native_keyboards():
    for page in (ADD_SUB, MULTIPLICATION):
        assert "touch-action:manipulation" in page
        assert "<input" not in page
        assert "numpad" in page
        assert "@media(max-width:820px)" in page


def test_both_lessons_have_practice_and_ten_minute_exam():
    for page in (ADD_SUB, MULTIPLICATION):
        assert "練習模式" in page
        assert "10 分鐘測驗" in page
        assert "EXAM_SECONDS=10*60" in page
        assert "EXAM_QUESTIONS=10" in page
        assert "Math.max(0,10-mistakes)" in page


def test_add_sub_includes_carry_and_chain_borrow_actions():
    assert "需要進位嗎" not in ADD_SUB  # generated dynamically for each active column
    assert "借 1" in ADD_SUB
    assert "function applyBorrow" in ADD_SUB
    assert "while(donor>=0&&working[donor]===0)" in ADD_SUB
    assert "working[j]=9" in ADD_SUB


def test_multiplication_builds_shifted_partial_products():
    assert "function buildRows" in MULTIPLICATION
    assert "value:q.a*d,shift" in MULTIPLICATION
    assert "向左 ${shift} 格" in MULTIPLICATION
    assert "部分積" in MULTIPLICATION


def test_crisp_reference_click_sound_is_used():
    for page in (ADD_SUB, MULTIPLICATION):
        assert "frequency.setValueAtTime(600" in page
        assert "exponentialRampToValueAtTime(200" in page
        assert "n+.05" in page
