# DSE文言练习 · 開發與維護

網頁應用位於 `web-study/`，包含篇章練習、個人學習紀錄、離線保存及帳號同步。產品概覽見[專案首頁](../README.md)。

[正式網站](https://chinese-a-study.philipwwq.workers.dev) · [題庫來源](CONTENT.md) · [覆蓋清單](CONTENT-COVERAGE.md) · [部署狀態](cloudflare/DEPLOYMENT.md)

## 環境需求

- Node.js 24.16或以上，用於本機服務、測試及建置。
- Python 3，用於題庫重建、來源核查及合併保護測試。
- Chromium及Playwright，用於瀏覽器驗證；不屬於應用執行依賴。
- Cloudflare Wrangler，用於雲端部署；目前部署流程使用4.129.0。

應用採用原生JavaScript模組與Node.js內建SQLite，啟動、單元測試及建置無需執行 `npm install`。

## 啟動本機服務

在Windows的專案根目錄執行：

```powershell
powershell -ExecutionPolicy Bypass -File web-study/backend/start-dev.ps1
```

瀏覽器開啟 `http://127.0.0.1:8787`。啟動工具會建立本機邀請設定與SQLite資料庫，並顯示學生及維護者邀請碼。維護者帳號名稱為 `teacher`。註冊後應保存一次性恢復碼。

其他環境可直接啟動 `backend/server.mjs`，並透過環境變數設定邀請碼、資料庫及服務位址；完整參數見[後端說明](backend/README.md)。本機資料與正式站點各自保存。

## 介面與閱讀偏好

介面版本 `2026.09.20.2` 使用「文＋√」圖標。主導航為首頁、練習、記錄、我的；復習工具集中在首頁下方。頂部「字號」統一調整全站文字，使用原有帳號 `fontSize` 偏好儲存及同步，調整時保留題組與草稿。SVG及PNG圖標位於 `assets/`；如修改SVG，可透過 `scripts/build-icons.mjs` 重新渲染應用圖標。

學生頁面不顯示來源定位及PDF入口；底層來源資料與歷史快照繼續保存。新一輪瀏覽器驗證使用獨立記憶體帳號，執行 `node web-study/scripts/browser-ui-refresh.mjs`。

## 主要行為

| 項目 | 行為 |
| --- | --- |
| 題組建立 | 支援16篇多選、能力篩選、1–100題及10／20／30題快選；跨篇題須涉及的全部篇章均被選中。 |
| 作答模式 | 修訂後的選擇辨析題固定四選一；支援文字自查的既有題目可依偏好加入打字模式。 |
| 歷史保留 | 題組保存建立時的完整快照，題庫更新不改寫進行中的練習與歷史答案。 |
| 複習計算 | 同帳號、記憶單元及香港日期只以首次提交更新記憶；提前答對不推遲既有安排。 |
| 離線同步 | IndexedDB按帳號保存作答、草稿、收藏及報錯；恢復連線後以冪等事件補傳。 |
| 備份 | 帳號頁可匯出及合併同帳號備份；介面區分本機保存與伺服器備份狀態。 |
| 內容維護 | 維護者可處理報錯、下架題目及追加修訂；評分更正保留原始答案並通知學生。 |

## 題庫維護

目前版本為 `2026.09.20.1`，共2,131題、2,081個記憶單元及11組詞義對照。指定篇章1,980題中，本輪修訂1,921題、保留59題；原151道通用附錄題維持獨立選用。

來源資料位於 `content/sources/`；發布清單與精確分包雜湊位於 `tools/question-bank/mcq-revision/`。重建流程只套用核准分包，並核對穩定題號、記憶單元及版本。操作方式與內容品質界線見[題庫說明](CONTENT.md)。

## 測試與建置

在專案根目錄執行：

```powershell
node --test web-study/tests/*.test.mjs web-study/backend/*.test.mjs web-study/cloudflare/*.test.mjs
python -m unittest discover -s tools/question-bank/mcq-revision -p test_apply_revision.py
python tools/question-bank/validate_bank.py
node web-study/scripts/build.mjs
```

建置會檢查主要JavaScript模組語法及題庫基本結構，輸出至 `web-study/dist/`。在 `web-study/` 內亦可使用 `npm test` 與 `npm run build`。

瀏覽器驗證腳本位於 `scripts/`，使用獨立測試環境。部分腳本的Chromium、Playwright及研究預覽位置為本機路徑，移至其他電腦時須按腳本設定調整。正式站點的唯讀檢查可執行 `node web-study/cloudflare/verify-release.mjs`；該腳本核對既定正式網址與本地 `dist/`。

## 部署

正式站點由Cloudflare Workers提供同源靜態資產與API，帳號及學習事件保存於SQLite-backed Durable Object。部署需沿用既有Worker、類別及實例名稱；詳細步驟見[Cloudflare部署文件](cloudflare/README.md)。

`dist/` 為靜態資產，完整帳號、備份及同步功能仍需要同源API。Node、Docker與Caddy方案見[後端部署說明](backend/README.md)。

本機私密資料位於 `backend/data/`，不納入公開倉庫或靜態發布包。更新正式程式與題庫時保留既有帳號及學習資料，無需重新註冊或重新設定邀請碼。

## 驗證狀態

本次發布通過30項應用測試、7項合併保護測試、題庫來源與版本核查，以及Chromium作答檢查。正式站點26個公開檔案與發布包完全一致，記錄見[驗證報告](VERIFICATION.md)。

本輪線上檢查採唯讀方式，未驗收正式帳號登入寫入；真iPad Safari的分屏、軟鍵盤、背景恢復及弱網仍需實機確認。題目難度及鑑別度須透過學生試答與教師覆核評估。
