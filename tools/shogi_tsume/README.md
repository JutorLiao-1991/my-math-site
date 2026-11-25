# 將棋詰將棋題庫產生方式

來源：やねうら王作者公開的實戰詰將棋（mate3／mate5／mate7.sfen，作者聲明不主張著作權）。

1. 各取前 20,000 行：`head -n 20000 mate3.sfen > 資料夾/mate3_20k.sfen`（5、7 同理）
2. `node build.cjs 120 資料夾`：用 games/shogi.html 的引擎篩選先手攻、每步王手、首手唯一、手數精確，並排除在手機上計算太久的題目；一手詰取自三手詰實戰局面走一步、玉方應一步後的局面
3. `node pack.cjs 資料夾`：輸出 tsume_src.js，貼進 shogi.html 的 `const TSUME_SRC=` 那一行
