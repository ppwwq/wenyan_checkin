# 題庫來源與覆蓋

本版依使用者提供之《文言詩詞_十六篇復習書_附修辭與寫作手法》逐項編寫固定練習，非官方真題。

- 2,131 題／2,081 個記憶單元；目前版本 2026.09.20.1。指定篇章1,980題中，1,921題經本輪四選一修訂，59題審閱後保留；原151附錄知識題不變。早期擴充新增1,913題為上一輪成果，本輪未增加題數。
- 11 組詞義對照；151 道獨立附錄定義題須主動開啟，原有 8 道附錄應用題仍遵守篇章範圍。
- 全部 2,854 個來源條目有對應紀錄：2,697 已覆蓋，16 保留異解，141 為考查索引等不直接判分內容。詳細各篇題量及異解見 [全書覆蓋清單](CONTENT-COVERAGE.md)。

本輪撤出自擬陌生片段草稿，題目扣指定文本。改寫及合併清單見 [選擇題修訂說明](../tools/question-bank/mcq-revision/README.md)。30項應用測試、7項合併保護測試及本地瀏覽器驗證通過；2026-09-20已重新部署，26個線上公開檔案與本地發布包完全一致，詳見 [部署狀態](cloudflare/DEPLOYMENT.md)。

## 來源與品質界線

`content/sources/` 保存原 PDF、student-content.json、appendix-content.json 與 manifest.json；原件未修改。每題保存穩定題號、記憶單元、版本、原句、選項理由、正解及來源。pdfPage 是實際 PDF 頁，printedPage 是印刷頁，blockPath 是底稿位置；兩者不可混用。

`reviewed` 代表代理按提供之書核對，不表示官方或教師獨立審定。來源有多解時保留分歧；不同成立角度不得互作錯項。維護者可處理報錯與追加修訂，歷史快照仍保留。原「非兵不利」題以明確 v2 修訂處理直接詞解與借代的差別，未重寫歷史答案。

`content/quality-report.json` 核對逐題結構與定位；`content/coverage-report.json` 與 `source-coverage.json` 記錄全書覆蓋與例外。

## 重建

專案根目錄執行；完整作者底稿及各組生成器位於 `tools/question-bank/full-expansion/`，以不變的 base-bank.json 作擴充前快照。

```powershell
python tools/question-bank/full-expansion/build_full_bank.py
python tools/question-bank/validate_bank.py
node web-study/scripts/build.mjs
```

不要再用舊首版 build_bank.py 覆蓋完整題庫。學生端只需已生成的 content/，不需要作者工具。刷新可載入新題庫，已暫停題組仍沿用開始時的快照。
