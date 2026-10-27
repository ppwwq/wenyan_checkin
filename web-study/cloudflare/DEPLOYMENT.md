# 部署與推送均已完成

用戶明確回覆「允許」後，已將下方清單的25檔提交並推送至公開倉庫 ppwwq/wenyan_checkin 的 main。提交：`a779502b6f08597c0e7bdf573d4c54076fd68226`。git ls-remote獨立讀回遠端與本地HEAD一致；沒有混入既有README修改或瀏覽器腳本。正式網站仍為UI 2026.10.11.4／題庫2026.10.11.1，沿用本輪103項測試與41資產、7項線上核查。沒有待確認或未完成的本次發布操作。

以下是本次推送前的清單及審批歷程，原「待確認」狀態已被上述完成狀態取代。

---

# 當前發布：2026-10-11

正式站已發布 UI **2026.10.11.4**、題庫 **2026.10.11.1**（2,161題，含27道DSE原版選擇分題）。Worker：`6233aaea-3f42-424f-a5cc-0c837f70e243`。

https://chinese-a-study.philipwwq.workers.dev

103項本地及發布副本測試通過；41個公開資產逐檔SHA一致，7項線上只讀核查通過。現有資料庫、帳號及學習事件保留；未在正式帳號提交作答。原倒數保持，相關原文只在答後補充；提交不跳解析、答對收合、小型跳過／暫時不會按鈕位於底部。

## GitHub狀態

目的地：**https://github.com/ppwwq/wenyan_checkin 的 main**（公開倉庫）。下列25檔已同步及暫存，發布副本103項測試通過。自動審批拒絕建立提交及推送，尚無新提交；本地HEAD及最後核對的遠端main仍為 `ea9227895f5108a8521a827ad36b07d298902eae`。

拒絕理由：用戶「部署，推送」未具體確認公开目的地、25檔載荷及main分支。需要用戶明確確認後才可重試，不能繞過。

待公開內容：本轮應用程式、前端樣式、選擇題庫及來源索引、相關測試；不含帳號資料庫、密鑰、環境檔、本地截圖或原始PDF新增文件。公開後他人可查看／下載。

1. `web-study/src/app.mjs`
2. `web-study/src/domain/choice-progress.mjs`
3. `web-study/src/domain/queue.mjs`
4. `web-study/src/domain/replacement.mjs`
5. `web-study/src/domain/session.mjs`
6. `web-study/src/domain/training.mjs`
7. `web-study/src/features/learning-context.mjs`
8. `web-study/src/features/library.mjs`
9. `web-study/src/features/practice.mjs`
10. `web-study/src/features/training.mjs`
11. `web-study/src/storage/backup.mjs`
12. `web-study/tests/choice-update.test.mjs`
13. `web-study/tests/frontend-flow.test.mjs`
14. `web-study/tests/mistakes.test.mjs`
15. `web-study/tests/practice.test.mjs`
16. `web-study/tests/skip.test.mjs`
17. `web-study/index.html`
18. `web-study/manifest.webmanifest`
19. `web-study/styles.css`
20. `web-study/sw.js`
21. `web-study/scripts/build.mjs`
22. `web-study/cloudflare/verify-release.mjs`
23. `web-study/content/bank.json`
24. `web-study/content/coverage-report.json`
25. `web-study/content/quality-report.json`

其他既有README修改及browser-skip-feedback.mjs保持未暫存，未混入本次範圍。確定範圍後，沿用已核查資料執行commit、push，再獨立核對遠端SHA。

---

以下保留歷史發布紀錄。

# 部署狀態（2026-10-03）

## 當前正式站：跳過與對錯顏色 2026.10.03.1

- 用戶明確要求「部署推送」。已發布介面 `2026.10.03.1`；新增未答題跳過及補答，移除可見對錯判語，以綠色正確選項及紅色所選錯項表示，原解析與讀屏資訊保留。
- 正式站：[DSE文言練習](https://chinese-a-study.philipwwq.workers.dev)；Worker版本 `57d276b9-443f-4c90-a86c-b8fb8d815d69`。
- 85項自動測試、建置、7組隔離瀏覽器流程及Wrangler預檢通過。[線上只讀核查](../verification/release-2026.09.23.22-ui-2026.10.03.1/public-result.json)：38個資產SHA-256逐檔一致，7項API權限／私有路徑／PDF Range／登入頁檢查通過。
- 沿用 `STUDY_DATABASE`／`StudyDatabase`／`study-v1`，沒有資料遷移或帳號／邀請碼修改。題庫仍 `2026.09.23.22`／2,134題，SHA-256 `4f3885fc61c78430eb790f4a2eb035d676c88296582cd5adc5947bfaec5feac5`。
- GitHub暫存／推送被自動審批拒絕，未建立本輪提交或執行推送；縮小為10個功能／回歸測試檔亦被拒絕，系統要求明確確認向 `ppwwq/wenyan_checkin` 公開這些檔案。發布副本已準備，本地及副本均通過85項測試；沒有新增題庫或來源PDF。[功能核查](../verification/skip-feedback-2026-10-03/README.md) · [發布記錄](../verification/release-2026.09.23.22-ui-2026.10.03.1/deployment.json)。未操作正式帳號作答，真iPad／Safari和學生試用尚未驗收。

以下為歷史發布記錄，本輪發布已取代先前未部署狀態。
# 部署狀態（2026-10-15）

## 最新發布嘗試：2026.10.15.1 已推送、部署受阻

- 使用者重新授權「部署推送」後，修改已推送至 `ppwwq/wenyan_checkin` 的 `main`，提交 `24d5f5db0031e3f6b290ac8da449216c44be40df`，已核對遠端引用。
- 介面及題庫版本均為 `2026.10.15.1`；119 項測試與 7 組隔離瀏覽器流程通過。題庫 SHA-256：`4cd7499eb37d7f6d962775388abcf77f9da1d75e651a4109454b5de85771104b`。
- Wrangler 4.129.0 dry-run 成功：讀取 51 個靜態檔案，Worker 34.56 KiB（gzip 9.50 KiB），沿用 `StudyDatabase`／`STUDY_DATABASE`／`study-v1`。
- 正式 deploy 在身份驗證階段失敗：目前雲端環境未配置 `CLOUDFLARE_API_TOKEN`，也沒有既有 Wrangler 登入。沒有執行臨時帳號部署、資料遷移或正式帳號操作。
- 公開站點版本請求被環境代理拒絕（HTTP CONNECT 403），未能重新確認目前正式版本。下方正式站紀錄是歷史資訊，不能當成這次的線上核驗結果。
- [修改與驗證記錄](../verification/feedback-dedup-2026-10-15/README.md)。下一步需配置安全的 Cloudflare 部署憑據及正式站點出站連線，然後重新部署及執行 `verify-release.mjs`。

## 以下保留 2026-09-24 及之前的歷史狀態

本次 GitHub 同步快照包含 `2026.09.24.7` 錯題入口、按實際錯題篩選及正確計數，以及題庫 `2026.09.23.22`、來源PDF與修訂記錄。發布副本77項測試及建置通過；[同步核查](../verification/github-sync-2026-09-24/README.md)。本次未部署，下列正式版本保持不變。歷史段落中的「未推送」及上傳範圍待確認已由本次用戶「推送最新」授權取代。

## 歷史正式站：前三階段改進 2026.09.24.6

- 用戶本輪確認按評審實施順序的前三階段修改，並授權發布部署。已由現有工作目錄構建及部署，沒有使用題庫較舊的 `.publish/github` 副本。
- 正式站：https://chinese-a-study.philipwwq.workers.dev
- Worker版本：`06bb875b-8130-4736-8186-f0e918b07819`。介面 `2026.09.24.6`／題庫 `2026.09.23.22`。
- 題庫SHA-256：`4f3885fc61c78430eb790f4a2eb035d676c88296582cd5adc5947bfaec5feac5`。沿用 `STUDY_DATABASE`／`StudyDatabase`／`study-v1`，沒有資料庫遷移、邀請碼修改或帳號清理。
- 73項自動測試、7項真實IndexedDB恢復檢查、手機／平板流程、360px特大字及獨立儲存會話接續驗證通過。Wrangler 4.129.0 dry-run及deploy成功。
- [線上核查](../verification/release-2026.09.23.22-ui-2026.09.24.6/public-result.json)：36個資產逐檔一致，6項健康／私有路徑／PDF Range檢查通過。[瀏覽器檢查](../verification/release-2026.09.23.22-ui-2026.09.24.6/public-ui-check.json)沿用已登入會話，只讀查看首頁，沒有提交正式答案或設定。
- [本輪完整記錄](../verification/three-stages-2026-09-24/README.md)。包括此前 `.4` 設定更新及 `.5` 閱讀標注。本輪沒有推送GitHub。
- 額度最後檢查剩約5%，未使用重置卡。真iPad／Safari、教師／學生驗收、超大備份與長期容量測試仍待進行。

以下均為歷史狀態；過往「本地待發布／先不部署」已由本輪用戶的新授權取代。

## 歷史本地待發布：解析標注 2026.09.24.5

- 保留原解析文字，增加高亮、題句底線及閱讀標籤；包含 `.4` 的設定即時更新修復。題庫仍 `2026.09.23.22`，雜湊不變。
- 66項測試、本地建置、8個手機／平板渲染案例及10,670段解析完整性檢查通過。[本地核查](../verification/explanation-annotations-2026-09-24/after/result.json)。標注屬閱讀輔助，非新增題庫內容審核。
- 按用戶指示先不推送、不部署；本地新檔未同步至發布倉庫，正式站保持 `.3`。

## 本地待發布：設定立即生效 2026.09.24.4

- 篇章、題類、每日題量與獨立手法附錄保存後，立即更新每日訓練／回練未答題；保留已提交答案及草稿。
- 本地65項測試、建置及17項瀏覽器流程通過。[設定修復核查](../verification/training-settings-2026-09-24/result.json) · [原流程回歸](../verification/training-settings-2026-09-24/daily-regression/result.json)。題庫SHA-256保持不變。
- 用戶明確要求「不要推送部署先」；本輪沒有推送或部署，亦未把修復複製至發布倉庫。收到新的發布指示前保持本地狀態。下方 `.3` 才是正式站版本。

## 歷史正式站：倒數日還原 2026.09.24.3

- 按用戶要求恢復首頁原有淺綠卡片與大字倒數，保留每日訓練、接續及錯題回練。
- Worker：`4d6e3bec-58dd-442e-9c29-bd570762eb5c`。題庫仍 `2026.09.23.22`／2,134題，原 SHA-256 不變，沿用原帳號資料庫。
- 61項測試、建置及9項本地瀏覽器流程通過；768px／390px首頁截圖已目視。33個線上公開資產一致、7項只讀核查通過。[本地證據](../verification/ui-2026.09.24.3/result.json) · [線上核查](../verification/release-2026.09.23.22-ui-2026.09.24.3/public-result.json)。真iPad驗收未做。
- 本地發布倉庫提交 `4cd0a03` 已保存，僅含4個介面與版本檔案；GitHub推送被自動審批拒絕（本輪未明確授權向該目的地公開程式碼），等待用戶確認。正式站已部署。

## 歷史正式站：每日訓練介面 2026.09.24.2

- 首次逐篇選類型並保存到帳號；首頁直接開始／接續每日訓練，每日題量在學習設定。只標錯題，回練無等待時間，每個知識點每日最多自動安排一次，回練另計。
- 題庫保持 `2026.09.23.22`、2,134題，本次沒有改題。Worker：`3df466a7-8f79-4cda-91d7-930e012453c0`；沿用原 StudyDatabase 及 study-v1，不遷移帳號或修改邀請碼。
- 61項自動測試、本地9項完整瀏覽器流程和發布預檢通過；手機及平板尺寸截圖已目視。33個公開檔案與發布包一致，7項線上只讀檢查通過。
- [本地瀏覽器記錄](../verification/daily-training-2026-09-24/result.json) · [線上核查](../verification/release-2026.09.23.22-ui-2026.09.24.2/public-result.json) · [部署記錄](../verification/release-2026.09.23.22-ui-2026.09.24.2/deployment.json)。真iPad與學生試用未做，未操作正式帳號寫入。


- 功能碼已推送至 `ppwwq/wenyan_checkin` 的 `main`，提交 `b4ab3b3`（含前一提交 `52bdf4f`）；發布目錄47項測試通過。題庫／PDF／內容報告的GitHub同步被自動審批拒絕，等待明確上傳範圍；本次只推送功能碼，GitHub原有題庫保持。

## 歷史正式站：題庫 2026.09.23.22／介面 2026.09.23.4

- 已按用戶要求部署十六篇修訂：1,983題主解析更新，288題658個選項文字調整；全庫2,134題。正式網址：https://chinese-a-study.philipwwq.workers.dev。
- Worker 版本 ID：`ca57c7d4-4d90-4fdb-8d50-2d062490f96e`；沿用既有 Worker、STUDY_DATABASE 及 study-v1，未遷移資料或更改帳號秘密。
- 重新建置、46項應用測試及 Wrangler dry-run 通過。[線上只讀驗證](../verification/release-2026.09.23.22-ui-2026.09.23.4/public-result.json)確認31個公開資產逐位元一致、7項接口／瀏覽器檢查通過；登入頁截圖已目視。題庫 SHA-256：`4f3885fc61c78430eb790f4a2eb035d676c88296582cd5adc5947bfaec5feac5`。
- 未操作正式帳號寫入；教師審定、學生試做及真iPad驗收仍待完成。分支未提交或推送。[本次發布記錄](../verification/release-2026.09.23.22-ui-2026.09.23.4/deployment.json)。下方為歷史記錄。

## 歷史解析介面：2026.09.23.3（題庫仍為 2026.09.23.6）

- 已更新現有正式站的答後解析：先顯示簡短答案，詞義題顯示原句關鍵片段；答錯時先顯示所選項原因，長解析保留在可展開區。舊式詞義模板用較直接的對照呈現，原有解析可展開查看。未改題庫文字、答案、題目 ID 或帳號資料。
- Worker 版本 ID：`55c7c1b1-f58d-4c19-a701-7947ef660dfb`。45項應用測試、本地375／768px答後頁檢查通過；[線上只讀核驗](../verification/release-2026.09.23.6-ui-2026.09.23.3/public-result.json)確認31個公開資產一致、API保護與登入頁正常。[本地答後頁檢查](../verification/ui-2026.09.23.3/browser-result.json)不代替學生理解度或真iPad驗收。
- 1,882題的原有語義審讀狀態未變；這次是解析**呈現**改善，不表示原題內容已獲教師重新審核。

## 歷史正式站：題庫 2026.09.23.6

- 正式網址：https://chinese-a-study.philipwwq.workers.dev；沿用 `chinese-a-study` Worker、`STUDY_DATABASE` Durable Object 及既有帳號資料，未執行遷移。Worker 版本 ID：`5464fe28-5fb1-4698-8068-16301666006a`。
- 線上題庫2,134題、2,084記憶單元、11組比較，SHA-256 `faefd5a52fa07c318a26623e0ed1f79741cf99ee7b0bbbb4a3fc09f2895163b4`，與本地發布包一致。252題有本輪逐題交叉審稿；其餘1,882題沿用舊題和舊記錄，**未重新逐題語義審讀**，詳見[去向摘要](../../tools/question-bank/quality-revision/fast-disposition.md)。
- 部署前44項應用測試、題庫合併核查與建置通過。部署後[只讀線上驗證](../verification/release-2026.09.23.6/public-result.json)通過：31個公開資產與本地逐位元一致，健康與權限端點、PDF Range、登入頁及題庫版本正常；沒有使用正式帳號寫入測試。真iPad、教師／學生驗收仍未做。
- 本節以下是2026-09-20舊版本歷史記錄，不代表最新線上題庫。

## 目前介面版本：2026.09.20.2

- 名稱：DSE文言练习；使用文＋√圖標、四項主導航及首頁集中復習入口。
- 全站字號即時調整、帳號保存與跨設備同步；學生介面移除PDF來源及版本定位，保留必要原文與答後解析。
- 32項應用測試及3組Chromium檢查通過，包括六種橫竪屏尺寸、選項和文字草稿、離線重開、字號同步與帳號隔離。
- 正式站點31個公開資產與發布包逐位元一致；題庫仍為2026.09.20.1／2,131題，SHA-256未變。
- [本轮界面验证](../verification/ui-2026.09.20.2/browser-result.json) · [線上驗證](../verification/ui-2026.09.20.2/public-result.json)。本輪未操作正式帳號資料；真iPad Safari仍待實機驗收。

## 部署資源及題庫發布記錄

- 公開網址：https://chinese-a-study.philipwwq.workers.dev
- 公開 GitHub：https://github.com/ppwwq/wenyan_checkin
- 部署帳號：philipwwq@gmail.com。
- Worker：chinese-a-study，最新版本 376c8fc7-e81b-41e3-9fd3-3fb854639ef1。
- 題庫版本：2026.09.20.1，共2,131題／2,081記憶單元；指定篇章1,921題修訂、59題審閱後保留，原151題附錄不變，自擬陌生片段改稿未發布。
- 前次題庫修訂部署核查：26個公開檔案與本地dist逐位元一致；題庫SHA-256為 `a807db87672d808899c3ed22ee55dbb2a5db4e1277df642eb9d33ca1350ae58a`。記錄見 [正式站點核查](../verification/release-2026.09.20.1/public-result.json)。
- 本輪30項應用測試及7項合併保護測試通過；題庫來源、精確核准分包雜湊、建置、Chromium四選一作答及舊題組快照檢查通過。既有Worker、Durable Object及study-v1實例保持，未執行資料遷移。
- 網頁、API、持久儲存及註冊邀請配置均已部署。雲端只設定 ADMIN_INVITE 與 BOOTSTRAP_INVITE 兩項秘密。
- 依使用者要求，**不遷移本地帳號或學習紀錄**。原有本地資料保留；新網址需使用私下取得的邀請碼重新註冊。
- 未代建維護者帳號或設定密碼。使用者自行以 teacher 及維護者邀請碼註冊，並保存網站顯示的一次性恢復碼。
- 正式 HTTPS 檢查：首頁、健康檢查、題庫及 Service Worker 200；題庫 2,131 題逐位元符合本機；PDF Range 206；私密檔案及未啟用的遷移入口 404。
- 正式 Chromium 登入頁已顯示，無頁面腳本錯誤；未登入 /api/me 返回 401，無效邀請註冊返回 403。
- 本機 Workers 整合8項、可選遷移流程4項、Node回歸及遷移單元測試26項通過。
- 沒有在正式站點建立測試帳號，因此不宣稱已完成正式帳號登入或跨設備寫入驗收。真 iPad Safari 仍待實機驗收。
- 私密邀請碼、資料快照、原始資料庫不在 GitHub 內。未購買服務或升級付費方案。
