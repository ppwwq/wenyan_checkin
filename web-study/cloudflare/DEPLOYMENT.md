# 部署狀態（2026-09-20）

- 公開網址：https://chinese-a-study.philipwwq.workers.dev
- 公開 GitHub：https://github.com/ppwwq/wenyan_checkin
- 部署帳號：philipwwq@gmail.com。
- Worker：chinese-a-study，最新版本 9e944381-0ded-45dc-9a67-f6055ebf0a7a。
- 題庫版本：2026.09.20.1，共2,131題／2,081記憶單元；指定篇章1,921題修訂、59題審閱後保留，原151題附錄不變，自擬陌生片段改稿未發布。
- 本輪重新部署核查：26個公開檔案與本地dist逐位元一致；題庫SHA-256為 `a807db87672d808899c3ed22ee55dbb2a5db4e1277df642eb9d33ca1350ae58a`。記錄見 [正式站點核查](../verification/release-2026.09.20.1/public-result.json)。
- 本輪30項應用測試及7項合併保護測試通過；題庫來源、精確核准分包雜湊、建置、Chromium四選一作答及舊題組快照檢查通過。既有Worker、Durable Object及study-v1實例保持，未執行資料遷移。
- 網頁、API、持久儲存及註冊邀請配置均已部署。雲端只設定 ADMIN_INVITE 與 BOOTSTRAP_INVITE 兩項秘密。
- 依使用者要求，**不遷移本地帳號或學習紀錄**。原有本地資料保留；新網址需使用私下取得的邀請碼重新註冊。
- 未代建維護者帳號或設定密碼。使用者自行以 teacher 及維護者邀請碼註冊，並保存網站顯示的一次性恢復碼。
- 正式 HTTPS 檢查：首頁、健康檢查、題庫及 Service Worker 200；題庫 2,131 題逐位元符合本機；PDF Range 206；私密檔案及未啟用的遷移入口 404。
- 正式 Chromium 登入頁已顯示，無頁面腳本錯誤；未登入 /api/me 返回 401，無效邀請註冊返回 403。
- 本機 Workers 整合8項、可選遷移流程4項、Node回歸及遷移單元測試26項通過。
- 沒有在正式站點建立測試帳號，因此不宣稱已完成正式帳號登入或跨設備寫入驗收。真 iPad Safari 仍待實機驗收。
- 私密邀請碼、資料快照、原始資料庫不在 GitHub 內。未購買服務或升級付費方案。
