# 題庫發布包 2026.10.24.2

這是本次正式站使用的完整可部署快照，包含 Worker 相依來源及已建置資產。正式站原有 2,253 題、92 道新增題、949 項文字練習及 UI `2026.10.21.formal.4` 保留；整合本輪十二篇全檢，實際修訂 639 題。沒有改後端、資料庫綁定、secret、學生作答或文字題內容。

GitHub 根目錄 `web-study/` 與正式站存在版本分歧：前者仍是 10 月 15 日來源，正式站已由另一份 10 月 21 日發布包更新。本輪將完整合併版另存於本目錄，避免將正式功能覆蓋為舊版，也避免拿不完整來源冒充完整原始開發倉庫。**部署本版本請使用本目錄，不要從根目錄舊 web-study 重建。** 此發布包沒有原始開發環境全部測試與建置腳本；包含的 dist 可直接部署。

## 核查與部署

在本目錄執行 `node verify.mjs`，再執行 `npx wrangler@4.129.0 deploy --dry-run --config web-study/wrangler.jsonc`。確認目標為既有 `chinese-a-study` 及帳戶後，按明確發布授權執行 `npx wrangler@4.129.0 deploy --config web-study/wrangler.jsonc`。不要執行資料庫 import／migration 或重設 secret。

`release-manifest.json` 鎖定所有來源與公開資產 SHA-256；`review-delta.json` 記錄 642 個候選修訂，其中 639 題合入、3 題保留已更完整的正式稿。`production-baseline.json.gz` 保存本次發布前的公開題庫；`local-review-pack.json.gz` 保存 2,010 題原審查記錄。兩組 resolutions 與 drift 記錄 47 題欄位衝突和 45 題跨欄位題意檢查。25 個精確材料雜湊按已審合併結果更新，合約邏輯未放寬；題目 editorial 沿用已核來源並註明本輪修訂。

全部 2,253 題發布合約、題池資格不變、新增題與附錄保留、原卷題面／選項不變均已檢查；8 組隔離 Chromium 組件顯示通過。這些是技術與內容檢查，未執行教師審定、學生試用或真機 Safari 驗收。舊版題庫的 117 項網站測試不冒充本正式包完整測試套件。

UI 保持正式版的題池與文字練習流程；本機10月23日的可選打字模式仍屬另一條未合併開發線。本次只發布題庫修訂。
