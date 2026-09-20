# DSE文言练习

面向 HKDSE 中國語文指定文言篇章的學習應用，整合篇章練習、來源查閱、間隔複習與個人學習紀錄。網頁版以 iPad 閱讀及作答體驗為主要設計方向，支援離線使用與連線後同步。

[開啟DSE文言练习](https://chinese-a-study.philipwwq.workers.dev) · [本機運行](web-study/README.md) · [題庫說明](web-study/CONTENT.md) · [部署文件](web-study/cloudflare/README.md)

## 功能概覽

| 功能 | 說明 |
| --- | --- |
| 篇章練習 | 涵蓋16篇指定文本，可按篇章與能力篩選，建立1–100題練習。 |
| 作答與解析 | 四選一作答與逐項解析，提交後鎖定答案；學生介面隱藏來源定位，底稿保留核查資料。 |
| 複習安排 | 結合到期複習、錯題重練與間隔安排；同日重做不重複計入首次表現。 |
| 個人整理 | 提供收藏、薄弱知識點、詞義對照與快速回顧。 |
| 離線與同步 | 本機保存作答、草稿及收藏，恢復連線後補傳；同帳號可同步學習紀錄。 |
| 內容維護 | 支援題目報錯、版本修訂及明確的評分更正，保留原始作答快照。 |

## 介面更新

介面版本 `2026.09.20.2` 採用「文＋√」圖標，主導航統一為首頁、練習、記錄、我的。首頁優先顯示開始與繼續練習，收藏、錯題及快速回顧集中於下方。右上角「字號」提供全站即時調整，偏好按帳號保存並同步；學生頁面移除PDF及來源版本展示，必要原文與解析保留。

## 開始使用

開啟[正式網站](https://chinese-a-study.philipwwq.workers.dev)，使用維護者提供的邀請碼註冊帳號，並保存首次註冊顯示的恢復碼。已有正式站點帳號的使用者可直接登入。

新版題庫可在連網刷新後使用。新建練習會讀取目前題庫；已開始或暫停的練習保留建立時的題目及作答快照。

## 題庫與版本

目前題庫版本為 **2026.09.20.1**，共 **2,131題、2,081個記憶單元、11組詞義對照**。

| 範圍 | 題數 | 本版處理 |
| --- | ---: | --- |
| 指定篇章練習 | 1,980 | 修訂1,921題，59題審閱後保留。 |
| 通用手法附錄 | 151 | 保留既有題目，須主動開啟附錄專項。 |

本版修訂聚焦指定文本的詞義、文意、思想、寫法及篇章比較，改善題幹提示與干擾選項。自擬陌生片段改稿未納入發布。

題目依提供的復習書編寫，每題保留來源位置、選項解析及版本資訊，屬學習練習而非官方真題。四選一練習用於概念辨識與理解鞏固；完整書面作答及逐題部分分訓練仍需另行安排。內容審校範圍與來源分歧見[題庫說明](web-study/CONTENT.md)及[覆蓋清單](web-study/CONTENT-COVERAGE.md)。

## 本機開發

網頁版需要 **Node.js 24.16或以上**。在Windows的專案根目錄執行：

```powershell
powershell -ExecutionPolicy Bypass -File web-study/backend/start-dev.ps1
```

開啟 `http://127.0.0.1:8787`。啟動工具會建立本機設定，並在終端顯示學生與維護者邀請碼。本機帳號及資料庫與正式站點分開保存。

應用執行與單元測試使用Node.js內建功能，無需安裝第三方執行套件。瀏覽器驗證與雲端部署工具另有環境需求，詳見[開發說明](web-study/README.md)。

```powershell
# 應用測試
node --test web-study/tests/*.test.mjs web-study/backend/*.test.mjs web-study/cloudflare/*.test.mjs

# 產生靜態發布資產
node web-study/scripts/build.mjs

# 題庫合併保護測試（需Python 3）
python -m unittest discover -s tools/question-bank/mcq-revision -p test_apply_revision.py
```

## 架構與目錄

網頁前端使用原生JavaScript模組、IndexedDB及Service Worker。本機服務採用Node.js與SQLite；正式站點以Cloudflare Workers提供同源網頁與API，透過SQLite-backed Durable Object保存帳號及學習事件。

```text
web-study/
  src/                 前端介面、抽題、複習與同步
  content/             發布題庫、來源資料與覆蓋報告
  backend/             本機API、SQLite及帳號服務
  cloudflare/          Workers部署與線上驗證
  scripts/             建置與瀏覽器檢查
  tests/               前端邏輯測試
  verification/        已保存的驗證證據
tools/question-bank/   題庫生成、修訂清單與來源核查
lib/                  原Flutter應用
```

建置輸出位於 `web-study/dist/`。帳號、備份及同步功能需要同源API，完整部署方式見[Cloudflare部署文件](web-study/cloudflare/README.md)；其他主機可參閱[Node後端文件](web-study/backend/README.md)。

## 發布與驗證

版本 `2026.09.20.1` 已部署至正式站點。本次發布通過30項應用測試、7項題庫合併保護測試、來源與版本核查，以及Chromium作答流程檢查。線上26個公開檔案與本地發布包逐位元一致。

[驗證記錄](web-study/VERIFICATION.md) · [正式部署狀態](web-study/cloudflare/DEPLOYMENT.md) · [線上檔案核查](web-study/verification/release-2026.09.20.1/public-result.json)

真iPad Safari的分屏、軟鍵盤、背景恢復及弱網體驗仍待實機驗收；題目難度與鑑別度仍需學生試答及教師覆核。

## 資料管理

本機資料保存於 `web-study/backend/data/`；正式站點資料保存於既有Durable Object。使用者可在帳號頁匯出個人備份。邀請碼、部署憑據及原始帳號資料庫不納入公開倉庫。部署更新沿用既有儲存實例，題目修訂保留歷史作答快照。

## 原Flutter應用

倉庫保留原Flutter/Dart應用及Android、Windows、Web平台工程，提供篇章閱讀、每日練習與本機學習紀錄。該應用與目前 `web-study/` 網頁版各自維護；本次題庫發布對應網頁版。

```sh
flutter pub get
flutter run
```
