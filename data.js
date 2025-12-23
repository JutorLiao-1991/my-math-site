// --- 網站設定區 ---
const siteConfig = {
    lastUpdated: "2025年12月22日 01:05" // 記得更新時間
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
        tagClass: "chem", // 使用物理（紫色）標籤
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
        title: "元素UNO！",
        category: "junior",
        url: "junior/science/element_uno.html",
        tagClass: "chem",
        tagName: "國中理化",
        desc: "來場元素UNO吧！"
    },
    // ↑↑↑ 請確保這裡有逗號，除非它是陣列中最後一個物件 ↑↑↑
];
