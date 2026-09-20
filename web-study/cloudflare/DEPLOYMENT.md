# 部署狀態（2026-09-20）

- 公開網址：https://chinese-a-study.philipwwq.workers.dev
- GitHub：https://github.com/ppwwq/wenyan_checkin
- Worker：chinese-a-study，版本 11a8085f-b3d4-4df1-a5fc-bced6ddac790。
- 網頁、API 與持久儲存程式已部署；**註冊邀請配置和本地帳號遷移尚未完成**，等待私密配置與資料上傳授權。
- 正式 HTTPS 檢查：首頁、健康檢查、題庫及 Service Worker 200；題庫 2,131 題逐位元符合本機；PDF Range 206；私密檔案及未啟用的遷移入口 404。
- 正式 Chromium 登入頁已顯示，無頁面腳本錯誤。
- 本機 Workers 整合8項、遷移流程4項、Node回歸及遷移單元測試26項通過。
- 私密配置、資料快照、原始資料庫不在GitHub內。原有本地資料保留。

正式站點目前不接受新註冊，原本地帳號也要遷移後才能登入。請勿把程式發布等同於帳號服務全部啟用。
