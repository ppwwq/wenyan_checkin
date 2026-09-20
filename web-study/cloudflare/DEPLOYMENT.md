# 部署狀態（2026-09-20）

- 公開網址：https://chinese-a-study.philipwwq.workers.dev
- 公開 GitHub：https://github.com/ppwwq/wenyan_checkin
- 部署帳號：philipwwq@gmail.com。
- Worker：chinese-a-study，最新版本 70edb001-87b3-478f-8946-36933494c536。
- 網頁、API、持久儲存及註冊邀請配置均已部署。雲端只設定 ADMIN_INVITE 與 BOOTSTRAP_INVITE 兩項秘密。
- 依使用者要求，**不遷移本地帳號或學習紀錄**。原有本地資料保留；新網址需使用私下取得的邀請碼重新註冊。
- 未代建維護者帳號或設定密碼。使用者自行以 teacher 及維護者邀請碼註冊，並保存網站顯示的一次性恢復碼。
- 正式 HTTPS 檢查：首頁、健康檢查、題庫及 Service Worker 200；題庫 2,131 題逐位元符合本機；PDF Range 206；私密檔案及未啟用的遷移入口 404。
- 正式 Chromium 登入頁已顯示，無頁面腳本錯誤；未登入 /api/me 返回 401，無效邀請註冊返回 403。
- 本機 Workers 整合8項、可選遷移流程4項、Node回歸及遷移單元測試26項通過。
- 沒有在正式站點建立測試帳號，因此不宣稱已完成正式帳號登入或跨設備寫入驗收。真 iPad Safari 仍待實機驗收。
- 私密邀請碼、資料快照、原始資料庫不在 GitHub 內。未購買服務或升級付費方案。
