// --- 網站設定區 ---
const siteConfig = {
    lastUpdated: "2026年5月5日" // 更新日期
};

// --- 課程資料區 ---
// category 對應首頁按鈕: 'english' (英文), 'math' (數學), 'game' (遊戲)
// tagClass 對應 CSS 顏色: 'tag-pink' (粉紅), 'tag-blue' (藍), 'tag-green' (綠)

const lessonData = [
    // === 英文 KK 音標區 ===
    {
        title: "無聲子音 (Voiceless)",
        category: "english",
        url: "english/kk_pronunciation/voiceless.html",
        tagClass: "tag-pink",
        tagName: "KK音標",
        desc: "學習聲帶不振動的發音，掌握氣音技巧 (p, t, k, f, s...)"
    },
    {
        title: "有聲子音 (Voiced)",
        category: "english",
        url: "english/kk_pronunciation/voiced.html",
        tagClass: "tag-pink",
        tagName: "KK音標",
        desc: "學習聲帶振動的發音，分辨清濁音差異 (b, d, g, v, z...)"
    },
    {
        title: "單母音 (Single Vowels)",
        category: "english",
        url: "english/kk_pronunciation/single_vowel.html",
        tagClass: "tag-pink",
        tagName: "KK音標",
        desc: "基礎母音發音練習，對照嘴型與舌位。"
    },
    {
        title: "雙母音 (Double Vowels)",
        category: "english",
        url: "english/kk_pronunciation/double_vowel.html",
        tagClass: "tag-pink",
        tagName: "KK音標",
        desc: "由兩個母音組成的滑音練習，掌握發音變化。"
    },
 

    // === 遊戲區 ===
    {
        title: "子音大挑戰-1",
        category: "game",
        url: "english/kk_pronunciation/single_practice-1.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對/p/、/t/、/k/、/f/、/s/、/θ/、/b/、/d/、/g/、/v/、/z/、/ð/選出正確首音。"
    },
    {
        title: "子音大挑戰-2",
        category: "game",
        url: "english/kk_pronunciation/single_practice-2.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對/ʃ/、/tʃ/、/dʒ/、/ʒ/！試著選出正確的單字。"
    },
    {
        title: "子音大挑戰-3",
        category: "game",
        url: "english/kk_pronunciation/single_practice-3.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對/m/、/n/、/l/、/r/進行聽音辨字大考驗！記得選要聽字首還是字尾喔！"
    },
    {
        title: "母音大挑戰-1",
        category: "game",
        url: "english/kk_pronunciation/single_practice_6.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對與a和e最有關的/æ/、/e/、/ɛ/的大考驗！試著選出正確的單字。"
    },
    {
        title: "母音大挑戰-2",
        category: "game",
        url: "english/kk_pronunciation/single_practice_7.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對與i還有ee最有關聯的/i/、/ɪ/做個加強練習吧！。"
    },
        {
        title: "母音大挑戰-3",
        category: "game",
        url: "english/kk_pronunciation/single_practice_8.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對與o最有關聯的兩個發音/o/、/ɔ/來個小測試吧。"
    },
        {
        title: "母音大挑戰-4",
        category: "game",
        url: "english/kk_pronunciation/single_practice_9.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對與u和oo最有關聯的/u/、/ʊ/來訓練一下吧！"
    },
        {
        title: "母音大挑戰-5",
        category: "game",
        url: "english/kk_pronunciation/single_practice_10.html",
        tagClass: "tag-green",
        tagName: "自我測驗",
        desc: "針對與/ʌ/、/ɑ/、/ə/、/ɚ/、/ɝ/搭配紅字來訓練一下吧！"
    },
    {
        title: "動物方城市：聽力大對決",
        category: "game",
        url: "english/kk_pronunciation/dual_game.html",
        tagClass: "tag-green",
        tagName: "雙人對戰",
        desc: "🦊 狐狸 vs 🐰 兔子！刺激的雙人搶答 PK 賽。"
    },


    // === 數學區 ===
    {
        title: "小數乘除法特訓",
        category: "math",
        url: "math/grade5-2/decimals_times_div.html", 
        tagClass: "tag-blue",
        tagName: "五年級數學",
        desc: "挑戰直式計算與小數點移位！限時 300 秒，看你能拿幾分？"
    },
    {
        title: "單位換算特訓",
        category: "math",
        url: "math/grade5-2/unit-practice.html", // 請依據您的實際路徑調整
        tagClass: "tag-blue",
        tagName: "五年級數學",
        desc: "挑戰長度、重量、面積、容積換算！用「小數點漂移」輕鬆破解單位大魔王。"
    }

];
