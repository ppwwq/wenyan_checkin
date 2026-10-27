# GitHub推送範圍待確認

用戶已要求「部署推送」。網站已發布 `2026.10.03.1`，38個公開資產及7項線上只讀核查通過；GitHub暫存和推送尚未執行，沒有新提交。

目的地：既有公開倉庫 `https://github.com/ppwwq/wenyan_checkin` 的 `main`。本輪已核對遠端URL及公開GitHub API回傳，發布副本與遠端均為 `ea9227895f5108a8521a827ad36b07d298902eae`。

待確認的是公開以下10個功能／回歸測試檔。已與驗證源碼逐檔比對SHA-256，發布副本85項測試通過。

1. `web-study/src/app.mjs`
2. `web-study/src/domain/session.mjs`
3. `web-study/src/domain/training.mjs`
4. `web-study/src/features/practice.mjs`
5. `web-study/src/storage/backup.mjs`
6. `web-study/styles.css`
7. `web-study/sw.js`
8. `web-study/scripts/build.mjs`
9. `web-study/tests/practice.test.mjs`
10. `web-study/tests/skip.test.mjs`

不包含部署記錄、驗證JSON、截圖、README更新、瀏覽器合成帳號測試腳本、題庫或PDF、帳號資料庫、密鑰／環境檔或其他資料。上述檔案已準備於 `D:/wenyan_checkin/.publish/github/`；其他本地文件保留，沒有重設、清理或回退用戶工作。

自動審批兩次拒絕：第一次是包含部署記錄與驗證證據的同步／暫存；縮小至以上10個功能／測試檔仍被拒絕。第二次理由原文：「即使缩小范围，命令仍会把功能源代码和测试公开到未获明确授权的公共 GitHub 仓库；用户只授权部署推送，未具体授权该敏感载荷及公开目的地。」

下一步：用戶明確確認上述內容與公開目的地後，暫存僅這10檔，建立提交、推送main，再以 `git ls-remote`核對遠端提交。未改變的85項測試與線上核查證據可沿用。
