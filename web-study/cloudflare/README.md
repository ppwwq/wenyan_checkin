# Cloudflare 部署

新版公開倉庫包含完整部署程式；正式站點狀態以本目錄 `DEPLOYMENT.md` 為準。

Workers 提供同源網頁與 API，SQLite-backed Durable Object 保存帳號與學習事件。使用獨立 Worker `chinese-a-study`，不覆蓋舊 Flutter Pages 或 Supabase 專案。採免費方案，沒有自動付費升級。

## 新帳號部署（本次採用）

正式網址：https://chinese-a-study.philipwwq.workers.dev 。本次不遷移本地帳號或學習紀錄；使用者在新網址以邀請碼重新註冊，自訂密碼並自行保存一次性恢復碼。維護者使用帳號名稱 `teacher` 及獨立的維護者邀請碼。

以下由倉庫根目錄執行，使用 Node 24 和 Wrangler 4.129.0。部署者需要對目標 Cloudflare 帳號有 Workers Scripts 編輯權限。部署到其他帳號時，將 `wrangler.jsonc` 內的 account_id 換成自己的帳號。

```powershell
node web-study/scripts/build.mjs
node --test web-study/tests/*.test.mjs web-study/backend/*.test.mjs web-study/cloudflare/*.test.mjs
npx --yes wrangler@4.129.0 deploy --config web-study/wrangler.jsonc --dry-run
npx --yes wrangler@4.129.0 deploy --config web-study/wrangler.jsonc
npx --yes wrangler@4.129.0 secret put BOOTSTRAP_INVITE --config web-study/wrangler.jsonc
npx --yes wrangler@4.129.0 secret put ADMIN_INVITE --config web-study/wrangler.jsonc
```

首次部署時，兩個 secret 分別輸入獨立的強隨機邀請碼；已配置的站點更新程式時不用重新設定。邀請碼不可放進公開原始碼。本次已配置這兩個 secret，私密交接資料只保存在本機被忽略的 `backend/data/cloud-access.txt`。

同一個雲端帳號在不同設備登入後可同步學習紀錄；離線資料恢復連線後補傳。本地 localhost 資料保留，與正式網站互相獨立，不會自動遷移。

## 可選遷移工具（本次未使用）

`prepare-private.mjs` 和 `import-private.mjs` 僅供另行明確選擇遷移時使用，並非新安裝步驟。前者讀取本地 SQLite，產生私密快照及遷移密鑰；後者向指定站點上傳快照。兩者都不應在本次新帳號部署執行。

遷移接口只有設定 `MIGRATION_SECRET` 才會開啟，且只接受空雲端資料庫。本次沒有上傳該 secret 或任何資料快照，接口返回 404。

## 驗證

`npx --yes wrangler@4.129.0 dev --config web-study/wrangler.jsonc --port 8792 --local` 啟動本機真實 Workers 執行環境。將 `.dev.vars.example` 的本機測試值按 `smoke.mjs` 設定後執行 `node web-study/cloudflare/smoke.mjs`。該腳本拒絕雲端網址，避免測試污染真實帳號。

本機8項整合檢查包括 scrypt 登入、雙會話同步、帳號隔離、衝突批次回滾、維護者更正、修訂版本、恢復碼及 PDF Range。Node 回歸與遷移測試共26項。這不等於真iPad驗收。

## 維護

部署後保留同一 Worker 名稱、Durable Object 類名及 `study-v1` 實例名稱，避免切換到空資料庫。使用 Cloudflare SQLite Durable Objects Time Travel 進行服務端恢復，學生另可在帳號頁匯出個人備份。重新部署只更新程式和公開題庫，不刪除資料庫。

官方說明：[SQLite Durable Objects](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)、[免費方案限額](https://developers.cloudflare.com/durable-objects/platform/limits/)。
