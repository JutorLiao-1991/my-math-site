// --- 網站設定區 ---
const siteConfig = {
    lastUpdated: "2025年12月13日 18:00" // 記得更新時間
};

// --- 課程資料區 ---
const lessonData = [
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
    }
    // ↑↑↑ 請確保這裡有逗號，除非它是陣列中最後一個物件 ↑↑↑
];
