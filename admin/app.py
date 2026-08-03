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
st.write("雲端金鑰讀取正常，準備好可以開始設計「新增題目」的表單了！")
