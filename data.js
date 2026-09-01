// --- 網站設定區 ---
const siteConfig = {
    lastUpdated: "2026年5月5日 23:58" // 已更新為最新時間
};

// --- 課程資料區 ---
const lessonData = [
    {
        title: "文昌鐘",
        category: "language",
        url: "wen_chang_clock/wen_chang_clock.html",
        tagClass: "lang",
        tagName: "日文學習",
        desc: "文昌帝君顯靈中。"
    },
    {
        title: "日文假名特訓",
        category: "language",
        url: "language/japanese/jp_menu.html",
        tagClass: "lang",
        tagName: "日文學習",
        desc: "包含平假名、片假名以及濁音的完整練習，適合初學者入門。"
    },
    {
        title: "圓周運動與簡諧投影",
        category: "senior",    // 高中區
        url: "senior/physics/shm_circle.html",
        tagClass: "phys",      // 紫色標籤
        tagName: "高中物理",
        desc: "透過動態投影，理解等速圓周運動、正弦波與簡諧運動(SHM)的數學關聯。"
    },
    {
        title: "物質加熱曲線與三態變化",
        category: "junior", // 國中區
        url: "junior/science/heating_curve.html", // 新檔案的路徑
        tagClass: "phys", // 使用物理（紫色）標籤
        tagName: "國中理化",
        desc: "透過加熱曲線與巨觀、微觀畫面熟悉曲線意義。"
    },
    {
        title: "多項式函數圖形",
        category: "senior",
        url: "senior/math/poly_function_graphing.html",
        tagClass: "math", // 藍色標籤
        tagName: "高中數學",
        desc: "透過調整係數，即時觀察一次、二次、三次多項式函數圖形的變化。"
    },
    {
        title: "尺規作圖基本技巧",
        category: "junior",
        url: "junior/math/CAR.html",
        tagClass: "math", // 藍色標籤
        tagName: "國中數學",
        desc: "透過鳩特精心設計的步驟，一步一步領悟尺規作圖方式"
    },
    {
        title: "尺規作圖做三角形",
        category: "junior",
        url: "junior/math/CAR_Triangle.html",
        tagClass: "math", // 藍色標籤
        tagName: "國中數學",
        desc: "透過鳩特精心設計的步驟，一步一步用尺規作圖完成指定三角形"
    },
    {
        title: "平面族示意動畫",
        category: "senior",
        url: "senior/math/Family_of_planes.html",
        tagClass: "math", // 藍色標籤
        tagName: "高中數學",
        desc: "透過調整k，觀察平面族是什麼概念。"
    },
    {
        title: "光電效應實驗室",
        category: "senior",
        url: "senior/physics/photoelectric_effect.html",
        tagClass: "phys", // 藍色標籤
        tagName: "高中物理",
        desc: "經由調整光線的頻率、強度、金屬靶，觀察發射出來的電子。"
    },
    {
        title: "常見元素的週期表",
        category: "junior", // 國中區
        url: "junior/science/periodic_table.html", // 新檔案的路徑
        tagClass: "chem", // 使用化學標籤
        tagName: "國中理化",
        desc: "常見的元素週期表，讓我們邊玩邊學吧！"
    },
    {
        title: "高中光譜實驗",
        category: "senior",    // 高中區
        url: "senior/physics/spectrum.html",
        tagClass: "phys",      // 藍色標籤
        tagName: "高中物理",
        desc: "親手操作當年的光譜實驗，並以能階理解現象。"
    },
    {
        title: "元素JUNO！",
        category: "junior",
        url: "junior/science/element_uno.html",
        tagClass: "chem",
        tagName: "國中理化",
        desc: "來場元素JUNO吧！"
    },
    {
        title: "鳩特國中英文練習區",
        category: "language",
        url: "junior/english/index.html",
        tagClass: "lang",
        tagName: "國中英文",
        desc: "整合單字、句型與基礎文法練習，依年級學期與教材範圍開始挑戰。"
    },
    {
        title: "單位換算特訓",
        category: "elementary", // 設定為國小區類別
        url: "elementary/unit_convert.html", // 依照您截圖的路徑
        tagClass: "math",
        tagName: "國小數學",
        desc: "挑戰長度、重量、面積、容積換算！用「小數點漂移」輕鬆破解單位大魔王。"
    },
    {
        title: "小數乘法與除法",
        category: "elementary", // 設定為國小區類別
        url: "elementary/decimal_times_div.html", // 依照您截圖的路徑
        tagClass: "math",
        tagName: "國小數學",
        desc: "挑戰小數乘法與除法。"
    },
    {
        title: "時間乘法與除法",
        category: "elementary", // 設定為國小區類別
        url: "elementary/time_times_div.html", // 依照您截圖的路徑
        tagClass: "math",
        tagName: "國小數學",
        desc: "挑戰時間的乘法與除法。"
    },
    {
        title: "比率與百分率",
        category: "elementary", // 設定為國小區類別
        url: "elementary/rate_ratio_percentage.html", // 依照您截圖的路徑
        tagClass: "math",
        tagName: "國小數學",
        desc: "試著在此精熟比率與百分率吧！"
    },
    {
        title: "質數合數大挑戰",
        category: "elementary", // 設定為國小區類別
        url: "elementary/prime_test.html", // 依照您截圖的路徑
        tagClass: "math",
        tagName: "國小數學",
        desc: "質數？合數？都不是？"
    }
];
