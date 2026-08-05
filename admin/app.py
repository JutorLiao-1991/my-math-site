import streamlit as st
import firebase_admin
from firebase_admin import credentials, firestore

# 1. 確保 Firebase 不會重複初始化
if not firebase_admin._apps:
    # ⚡ 從 Streamlit 雲端的 Secrets 保險箱讀取金鑰，而不是讀取實體檔案
    firebase_secrets = dict(st.secrets["firebase"])
    cred = credentials.Certificate(firebase_secrets)
    firebase_admin.initialize_app(cred)

# 2. 連線到名為 basic-grammar 的資料庫
db = firestore.client(database_id="basic-grammar")

# === UI 介面設計 ===
st.set_page_config(page_title="題庫管理後台", page_icon="📝")

st.title("鳩特英文：題庫管理後台 📝")
st.success("Firebase 管理員雲端連線成功！")

st.markdown("---")
st.subheader("新增文法題目")

# 使用 st.form 建立表單，clear_on_submit=True 可以在送出後自動清空輸入框
with st.form("add_question_form", clear_on_submit=True):
    question_text = st.text_area("題目 (Question)", placeholder="例如：He ___ to the store yesterday.")
    
    # 利用 columns 讓四個選項排版更緊湊
    col1, col2 = st.columns(2)
    with col1:
        option_a = st.text_input("選項 A", placeholder="go")
        option_c = st.text_input("選項 C", placeholder="gone")
    with col2:
        option_b = st.text_input("選項 B", placeholder="went")
        option_d = st.text_input("選項 D", placeholder="going")
        
    correct_answer = st.selectbox("正確答案", ["A", "B", "C", "D"])
    explanation = st.text_area("詳解 (Explanation)", placeholder="簡單解釋為什麼選這個答案...")
    
    # 表單的送出按鈕
    submitted = st.form_submit_button("新增至資料庫")
    
    if submitted:
        # 1. 簡單的防呆機制：確保最重要的欄位有填寫
        if not question_text or not option_a or not option_b:
            st.error("⚠️ 請至少填寫「題目」與「選項 A、B」！")
        else:
            # 2. 將收集到的資料打包成字典 (Dictionary)
            new_question_data = {
                "question": question_text,
                "options": {
                    "A": option_a,
                    "B": option_b,
                    "C": option_c,
                    "D": option_d
                },
                "answer": correct_answer,
                "explanation": explanation,
                # 自動加入伺服器時間，方便未來排序或篩選
                "created_at": firestore.SERVER_TIMESTAMP 
            }
            
            # 3. 將資料寫入 Firestore 中名為 'questions' 的集合 (Collection)
            try:
                db.collection("questions").add(new_question_data)
                st.success("✅ 題目新增成功！前台網頁已經可以抓到這題囉。")
            except Exception as e:
                st.error(f"❌ 發生錯誤：{e}")
