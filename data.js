// 這裡放您的所有課程資料
// 以後要新增課程，就複製一個 { ... }, 區塊並修改內容即可

const lessonData = [
    {
        title: "微積分：極限的概念",
        category: "senior",     // 分類：senior(高中), junior(國中), language(語言)
        url: "senior/math/calculus-01.html", // 連結路徑
        tagClass: "math",       // 標籤顏色：math(藍), phys(紫), chem(綠), lang(橘)
        tagName: "高中數學",    // 標籤文字
        desc: "透過動態圖形理解 limit 的收斂過程。"
    },
    {
        title: "三角形的全等性質",
        category: "junior",
        url: "junior/math/geometry.html",
        tagClass: "math",
        tagName: "國中數學",
        desc: "拖曳頂點，觀察 SAS 與 SSS 的變化關係。"
    },
    {
        title: "斜拋運動模擬",
        category: "senior",
        url: "senior/physics/projectile.html",
        tagClass: "phys",
        tagName: "高中物理",
        desc: "調整初速與角度，預測落地點與最大高度。"
    },
    {
        title: "原子結構視覺化",
        category: "junior",
        url: "#", // 暫無連結
        tagClass: "chem",
        tagName: "國中理化",
        desc: "電子軌域與質子中子的 3D 模型展示。"
    },
    {
        title: "多益單字聽力測驗",
        category: "language",
        url: "language/english/vocab-01.html",
        tagClass: "lang",
        tagName: "語言學習",
        desc: "點擊單字播放發音，並進行即時聽寫練習。"
    },
    {
        title: "日文假名特訓",
        category: "language",
        url: "language/japanese/jp_menu.html",
        tagClass: "lang",
        tagName: "日文學習",
        desc: "包含平假名、片假名以及濁音的完整練習，適合初學者入門。"
    }
];
