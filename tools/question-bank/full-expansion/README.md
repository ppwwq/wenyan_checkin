# 全書題庫擴充與覆蓋核對

本目錄根據應用內保存的復習書 PDF、`student-content.json` 及 `appendix-content.json` 編寫固定練習，沒有執行時即席生成題目。

## 檔案分工

- `base-bank.json`：擴充前 218 題的原樣快照，用來防止重新編號或悄悄重寫既有記憶單元。
- `revisions.json`：已知歧義舊題的明確版本修訂；保留題號及記憶單元，寫明前後版本與原因。
- `group-a.json`：魚我所欲也、勸學、逍遙遊、廉頗藺相如列傳。
- `group-b.json`：出師表、師說、始得西山宴遊記、六國論。
- `group-c.json`：論仁論孝論君子、岳陽樓記及六篇詩詞。
- `group-d.json`：全部 151 個手法附錄概念條目，以及末頁六項自查的對應記錄。
- 各組作者工具和選項底稿保存逐條編寫的來源及干擾項；中間預覽不作正式題庫。
- `build_full_bank.py`：合併與獨立結構／定位／覆蓋檢查。只有必要檢查通過才寫入應用題庫。

## 覆蓋口徑

每條詞解、每個原文區塊、分析表資料行，以及正文說明／註釋／總結／考查提示都有來源路徑。`covered` 必須指向實際題號；同一知識點的重述可共用題目，不另創記憶單元。標題和表頭另列，不當成知識點湊數。

`disputed` 保存實質異解，不把另一成立的解釋當錯項。`excluded` 須給出具體理由，例如作者年代背景、重述頁面導引，或只有題號而沒有題幹的歷年考查提示；不能把提示冒充真題。未映射的源條目會令合併失敗。

詞解題校驗原書詞義與 PDF 物理頁，分析題保留指定原書分析的證據。跨篇題列出所有涉及篇章，並保留各側來源。新題四個選項均有辨析；自動檢查只能驗證選項形式與來源定位，語義唯一性仍需內容覆核。

## 重建與驗證

在專案根目錄以 UTF-8 Python 執行各組作者工具，然後：

```powershell
python tools/question-bank/full-expansion/build_full_bank.py
python tools/question-bank/validate_bank.py
node --test web-study/tests/*.test.mjs web-study/backend/*.test.mjs
node web-study/scripts/build.mjs
node web-study/scripts/browser-content.mjs
```

瀏覽器驗收使用獨立記憶體資料庫，不會建立或修改正式使用者資料。Playwright 模組及 Chrome 路徑可透過 `PLAYWRIGHT_MODULE`、`CHROME_PATH` 指定。

合併報告為 `validation-report.json`；正式應用另有 `content/coverage-report.json` 與 `content/source-coverage.json`。原始來源雜湊保持在 `content/sources/manifest.json`。

## 學習記錄與發布

既有題目 ID 與 memoryId 保持；除明列於 `revisions.json` 的版本修訂外，舊題內容維持原樣。此次「兵」題從 v1 修至 v2，原書容許的借代義不再作錯項；本機正式資料庫該題作答數核對為 0。新增題目使用獨立穩定 ID；既有作答快照、收藏及復習日程繼續有效。學生須刷新應用才會載入新題庫；暫停中的原題組仍使用原快照。

附錄的通用定義題不強行掛在某篇文章下。只有明確開啟「手法附錄專項」才參與抽題；可清空篇章只練附錄。原先依篇章原文編寫的八道附錄應用題仍遵守篇章範圍。

本輪為依指定復習書的代理內容核對，不代表官方真題、教師獨立審定，或替原書所有學術分歧作最終裁定。
