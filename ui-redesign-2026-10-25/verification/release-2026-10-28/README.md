# 02暖灰琥珀 UI 正式發布 · 2026-10-28

目標：既有 chinese-a-study Worker；UI 2026.10.28.1，題庫沿用2026.10.27.1，2,253題。保留選擇題同日回練一次、可選字詞打字、分模式草稿、既有帳號與資料庫綁定。

- 發布前先逐檔核對實際正式站43項公開資源，與10月27日部署的本地dist一致。舊10月25日交接不可當作現況。
- 修正toast避讓及手機答題／選篇欄18px留白，保留02配色。skip-link五種視口鍵盤正常，保留原實作。
- 以UI副本合併現行正式功能，保留原2253題的精確內容及2252道可抽題數，舊題無editorial也按既有發布狀態可用；明確pending不放行。
- UI中的文字練習使用已公開於releases/self-study-2026.10.24.2的949項資料原件；未加入本地副本的後續17項或36道校內選擇題。build腳本繼續排除local-private。
- 保留舊式受考字位置解析、舊題管理員修訂相容性；已有editorial的題目仍不得藉刪除審查欄位繞過檢查。文字事件使用現有events資料表及API，無schema migration或帳號資料匯入。
- 135項自動測試：134通過、1原有跳過。構建及Wrangler dry-run通過。發布包隔離瀏覽器15組版面鍵盤、390/1440兩組答題／收藏／暫停／文字自查訂正／匯出匯入／刷新回歸通過。
- 差異審查未發現尚未解決的發布阻擋問題。未驗收實體裝置/Safari；正式線上只做公開資源、API權限與登入頁讀取，沒有正式帳號作答寫入。

正式發布成功：Worker `02a47223-de86-45bb-b4f0-b0eb1d424ed5`，100%流量；53個公開資源逐檔SHA一致，7項API／PDF Range／Chromium登入頁檢查通過。線上題庫仍為2026.10.27.1，SHA256 `112ec47f195245ca165add6dd9977bb45ebaafe1dc2d311769ae1559739239f7`。

本機證據：本目錄asset-manifest.json、preparation.json、live-baseline.json、tests.log、deployment.log、deployments.log及browser/；線上核查在web-study/verification/release-2026.10.27.1-ui-2026.10.28.1/。Git推送以本輪最後遠端main核對結果為準。
