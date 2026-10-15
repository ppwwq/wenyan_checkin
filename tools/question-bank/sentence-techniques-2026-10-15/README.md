# 獨立修辭例句題修訂 · 2026-10-15

題庫版本：`2026.10.15.1`，共 2,161 題。按使用者澄清，只改獨立附錄中比喻、比擬、借代、排比等修辭辨識題，不改文言文及古詩篇章內的手法分析題。

- 改寫 30 題：附錄第 0–4 節的 24 道修辭題、第 5 節前 6 道易混修辭題。原先以定義為主，現在先提供具體例句，再辨識修辭或兩句的修辭關係。
- 其餘 2,131 題逐題雜湊不變，包括 121 道其他獨立附錄題、篇章題，以及 27 道 DSE 原題。
- 每道改寫題保留 `id`、`memoryId`、來源、原有知識補充，題目版本加一；自編題明確標記。已提交作答保留舊快照；尚未提交的舊選項草稿另存於 `archivedDrafts`，避免套用到新版選項。
- DSE 原題的題幹、引文、選項、答案、出處等完整物件均不變，練習端不打亂原題選項。

`examples.py` 保存逐題例句、提問、正解、干擾項及文本依據。定義仍可在答後知識補充查看。引入的文學例句在材料中註明出處，自編練習不標為 DSE 原題。本輪為作者自檢，未經教師或學生獨立驗收。

## 保存及核查

- `baseline-appendix.json`：修訂前全部 151 道獨立附錄題，保留舊題與舊審稿。
- `baseline-dse-originals.json`：修訂前 27 道 DSE 原題完整資料。
- `baseline.json`：`806c8f9` 題庫版本、檔案雜湊及 2,161 道題目的雜湊。
- `release-manifest.json`：本次 30 道題號、題庫與來源檔案雜湊。
- `audit.json`：逐題變更範圍、27 道原題及所附試卷／評分 PDF 檔案雜湊核對。這是原件及既有轉錄資料的完整性核對，沒有宣稱新增的逐字人工轉錄審核。

在倉庫根目錄重建及核查：

```sh
python tools/question-bank/sentence-techniques-2026-10-15/revise.py
python tools/question-bank/sentence-techniques-2026-10-15/audit.py /workspace/dse-chinese-knowledge-base
cd web-study
npm test
npm run build
```

重建腳本會拒絕覆寫本次範圍外已另行改動的題目；原來源 JSON 和 PDF 不改寫。應用修復及瀏覽器證據見 [驗證記錄](../../../web-study/verification/feedback-dedup-2026-10-15/README.md)。
