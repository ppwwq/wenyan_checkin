# Cloudflare 部署

新版公開倉庫包含完整部署程式；正式站點狀態以本目錄 `DEPLOYMENT.md` 為準。

Workers 提供同源網頁與 API，SQLite-backed Durable Object 保存帳號與學習事件。使用獨立 Worker `chinese-a-study`，不覆蓋舊 Flutter Pages 或 Supabase 專案。採免費方案，沒有自動付費升級。

## 佈署步驟

以下由倉庫根目錄執行，使用 Node 24 和 Wrangler 4.129.0。部署者需要對目標 Cloudflare 帳號有 Workers Scripts 編輯權限。`wrangler.jsonc` 內的 account_id 換成自己的帳號。

```powershell
node web-study/scripts/build.mjs
node --test web-study/tests/*.test.mjs web-study/backend/*.test.mjs web-study/cloudflare/*.test.mjs
npx --yes wrangler@4.129.0 deploy --config web-study/wrangler.jsonc --dry-run
node web-study/cloudflare/prepare-private.mjs
npx --yes wrangler@4.129.0 deploy --config web-study/wrangler.jsonc
npx --yes wrangler@4.129.0 secret bulk web-study/backend/data/cloud-secrets.json --config web-study/wrangler.jsonc
node web-study/cloudflare/import-private.mjs https://chinese-a-study.YOUR-SUBDOMAIN.workers.dev
npx --yes wrangler@4.129.0 secret delete MIGRATION_SECRET --config web-study/wrangler.jsonc --force
```

`prepare-private.mjs` 從唯讀 SQLite 交易建立一致快照，不讀出明文密碼。私密快照、邀請碼及迁移密鑰只保存在被忽略的 `backend/data/`；禁止上傳 GitHub。首次新安裝沒有本地資料時，先依後端說明初始化空資料庫，或自行配置兩個獨立隨機邀請密鑰。

遷移接口只在部署者明確設定 MIGRATION_SECRET 後開啟，強隨機 Bearer 密鑰驗證；只接受空的雲端資料庫，並整批提交或回滾。完成後立即刪除該秘密，接口恢復 404。不迁移舊登入憑據及舊邀請碼，已有帳號的 ID、密碼摘要、恢復碼摘要及學習紀錄保持。

新網址需要重新登入。同一帳號的新設備由伺服器還原紀錄；本機尚未上傳的資料先在舊網址同步或匯出。舊 localhost 資料庫保留作回退，之後兩個服務不會自動互相同步。

## 驗證

`npx --yes wrangler@4.129.0 dev --config web-study/wrangler.jsonc --port 8792 --local` 啟動本機真實 Workers 執行環境。將 `.dev.vars.example` 的本機測試值按 `smoke.mjs` 設定後執行 `node web-study/cloudflare/smoke.mjs`。該腳本拒絕雲端網址，避免測試污染真實帳號。

本機8項整合檢查包括 scrypt 登入、雙會話同步、帳號隔離、衝突批次回滾、維護者更正、修訂版本、恢復碼及 PDF Range。Node 回歸與遷移測試共26項。這不等於真iPad驗收。

## 維護

部署後保留同一 Worker 名稱、Durable Object 類名及 `study-v1` 實例名稱，避免切換到空資料庫。使用 Cloudflare SQLite Durable Objects Time Travel 進行服務端恢復，學生另可在帳號頁匯出個人備份。重新部署只更新程式和公開題庫，不刪除資料庫。

官方說明：[SQLite Durable Objects](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)、[免費方案限額](https://developers.cloudflare.com/durable-objects/platform/limits/)。
