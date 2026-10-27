# UI/UX 重設計本地草稿 · 2026-10-25

使用者要求 aesthetic_reviewer 參與、保留所有功能。後續指示「改配色先」，再要求 10 版參考圖，並明確選定 02「暖灰琥珀」。已套用到本地 UI；其他佈局細修仍暫停。原始正式包及舊開發目錄未覆蓋，未部署或 Git 推送。

## 02 配色完成 · 2026-10-25

- 本地 UI `2026.10.25.design.2`：暖灰側欄 #393632、暖紙底 #F6F3ED、淺琥珀 #F5E8CB、主色 #986316。CSS、SVG 圖標、頁面/manifest 主題色已更新；原有 PNG 安裝圖標未重製。
- 只更改呈現配色與主題版本，未改佈局、內容、選題、作答、儲存或同步。原配色檔備份於 verification/before-palette-02/。
- verification/palette-02/result.json：28 項檢查通過，含 6 組文字對比度（4.80–9.57:1）、1440/390 寬 9 種頁面/狀態、320 寬大字號首頁/選篇、正確綠/錯誤紅及答對解析預設收合。31 個受保護內容與邏輯檔 SHA 仍一致；無瀏覽器錯誤。
- 首次驗證腳本因切題尚未完成即讀舊題而超時，改以題目 ID 並等待新選項可用後通過；應用行為無需修改。審美 agent 實看 02 參考圖、桌面首頁及登入，確認配色方向一致；主代理另看手機首頁/錯答畫面。未冒稱真機或完整功能驗收。
- 實際截圖在 verification/palette-02/，主要首頁為 1440-home.png、390-home.png。應用預覽 http://127.0.0.1:43135/ 。
- 待保存摘要：用戶選定02，暖灰琥珀已套用到本地新版，28項配色/顯示核查通過，未部署。Graphiti 先前 scope_busy，尚無新的就緒證據，未重試、未確認保存。

## 開啟

`node serve.mjs` → http://127.0.0.1:43135 。配色圖集： http://127.0.0.1:43135/assets/palettes/index.html 。預覽使用記憶體資料庫，重啟即清空測試帳號；邀請碼 `local-design-preview` 僅供此本地預覽。不要在此輸入正式帳號。

## 基線與修改

基線為知識庫 11_審查報告/十二篇全檢修訂_2026-10-23/release/repository/releases/self-study-2026.10.24.2/web-study/dist 完整副本。題庫 2253 題、文字練習與全部 domain/storage/sync 模組保留。app/ 是可運行前端；backend/ 採用正式包 API/sync/transaction，server.mjs 從舊開發線複用作本地伺服器；src/ 是後端依賴的原版模組副本，不是新 UI 編輯位置。

新增 app/assets/design.css，修改 app/src/app.mjs、features/records.mjs、features/training.mjs、features/library.mjs 的呈現結構，以及 index.html、sw.js、build-info.json。倒數與題庫邏輯保持，首頁重新分層、統一各功能頁與登入頁。UI版本 2026.10.25.design.1 是本地草稿標識。

## 已核查

- verification/result.json：57 項核查；31 個 content/domain/storage/sync 檔案與基線 SHA 一致。
- 1440/768/390 寬 Chromium：隔離本地註冊、學習設定、大字號、選擇題答對且解析收合、收藏、回報、暫停、文字翻譯提交/自查/訂正、歷史、錯題/薄弱/快速回顧/對照入口、匯出/匯入與刷新；另 320 寬大字號首頁/選篇無水平溢出。
- 這不代表每個邊界案例或正式站驗收；尚未核查真機/Safari、完整管理員操作、離線 SW 與全套錯答/跳過/恢復流程。
- 審美 agent 已看 11 張初版截圖。桌面首頁初圖截在動畫中途，不作驗收；palette-reference.png 為等待穩定後的新底圖。skip-link 的整頁截圖偏移尚待以視口截圖復核。待修 toast 遮底部操作，以及手機操作欄水平內距。

## 十版配色

app/assets/palettes/01.png 至 10.png；index.html 為圖集。均使用內建 imagegen 編輯同一張本地首頁底圖；02 已由真實 CSS 實作，其餘仍為參考。提示詞在 verification/palette-prompts.json，檔案映射在 verification/palette-files.json。06 的生成圖未帶編號，圖集標題補足；不冒稱生成文字逐字準確。

待保存摘要：2026-10-25 UI/UX 本地草稿與57項核查完成；使用者先選配色，10版參考圖已出，待選定後套色、修正細節及補核。Graphiti scope_busy，另一項目占用，沒有重試或停止其服務；未確認保存。
