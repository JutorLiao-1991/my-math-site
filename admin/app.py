import streamlit as st
import firebase_admin
from firebase_admin import credentials, firestore

# 1. 確保 Firebase 不會重複初始化
if not firebase_admin._apps:
    # 這裡先使用本機端的 json 檔案連線 (未來推上雲端時，我們會改用 Streamlit Secrets 來處理)
    cred = credentials.Certificate('firebase-key.json')
    firebase_admin.initialize_app(cred)

# 2. ⚡ 關鍵設定：連線到名為 basic-grammar 的資料庫
db = firestore.client(database_id="basic-grammar")

# === UI 介面設計 ===
st.set_page_config(page_title="題庫管理後台", page_icon="📝")

st.title("鳩特英文：題庫管理後台 📝")
st.success("Firebase 管理員連線成功！")

st.markdown("---")
st.write("目前的資料夾結構與金鑰讀取皆運作正常，準備好可以開始設計「新增題目」的表單了！")
