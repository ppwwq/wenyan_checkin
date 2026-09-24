"""Write completion documents only from an audited bank and browser evidence."""
import collections,json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
D=Path(__file__).parent;ROOT=D.parents[2]
V=Path('D:/DSE中文甲部知识库')
R=V/'11_審查報告/DSE甲部題庫研究_2026-09-20'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
bank=read(ROOT/'web-study/content/bank.json');audit=read(D/'release-audit.json')
quality=read(ROOT/'web-study/content/quality-report.json')
ui=read(ROOT/'web-study/verification/mcq-revision/result.json')
assert audit['status']==quality['result']==ui['result']=='PASS'
assert bank['version']==audit['version']==ui['bankVersion']=='2026.09.20.1'
changed=set(audit['changedIds']);n=audit['revised'];kept=audit['retainedDesignatedText']
rows=[]
for e in bank['essays']:
 qs=[q for q in bank['questions'] if q['essayIds'] and q['essayIds'][0]==e['id']]
 revised=sum(q['id'] in changed for q in qs)
 rows.append(f"| {e['title']} | {len(qs)} | {revised} | {len(qs)-revised} |")
before,after=audit['before'],audit['after']
sample_count=(R/'09_選擇題改題前後對照.html').read_text(encoding='utf-8').count('<article data-essay=')
report=f'''# App 指定篇章選擇題改写與核查

日期：2026-09-20。本地題庫版本：{bank['version']}。

依用戶要求，以四選一改善既有指定篇章題目。1,980 題逐題作修訂或保留處置：**{n:,} 題已修訂，{kept} 題審閱後保留**；原 151 道獨立附錄知識題保持原樣。全庫仍是 2,131 題、2,081 個記憶單元。本地題庫與靜態建置已生成，未部署正式網站。

[{sample_count}題改前改後對照](09_選擇題改題前後對照.html)直接由最終題庫及改前快照產生，可按篇章篩選、展開答案與逐項辨析。

## 與甲部的關係及本輪修正

前期以自擬陌生片段考通用手法的方向偏離本次甲部指定篇章需求；該 151 題改稿已撤出合併清單，僅保存為棄用工作稿。本輪學生題目以十六篇指定文本、其中的字詞句意、內容思想、體裁、寫法及篇章比較為依據；不是把陌生篇章閱讀移入甲部。

- 題幹直接要求判斷，不先送出「古體詩」「借代」「駢散結合」等要辨識的結論，再讓學生補分析句的字。
- 干擾項優先使用同一原文中容易混淆的主體、因果、時序、動機、論據與作用；逐項指出錯置或推論超出原文之處。
- 基礎體裁和詞義題保留直接問法；較深入的題要求分清局部與全篇、表面情感與深層心境，以及證據能支持到哪一步。
- 有實質異解的字詞和句意保留來源分歧，不把另一成立解讀強行列為錯項。

對照基準沿用 [歷屆逐分題命題藍圖](06_歷屆逐分題命題藍圖.md)及 [22類題型核查](05_題型覆蓋與問法補查.md)。**本輪未完成94個歷屆分題對全庫的逐題語義映射，不能聲稱真題題型已全部有效覆蓋。** 四選一可練習理解與辨析，但不能代替自行背寫、摘錄、完整解說或自舉例子的作答能力。

## 各篇處置

跨篇題按首個篇章歸組，避免重複計數；實際抽題仍要求所有涉及篇章都已選取。

| 篇章 | 本輪審閱 | 修訂 | 保留 |
|---|---:|---:|---:|
{chr(10).join(rows)}
| 合計 | 1980 | {n} | {kept} |

## 檢查結果與界線

- 全量題號、memoryId、答案位置、來源物件及附錄原樣比較通過；修訂题版本均遞增一次，舊作答與暫停題組沿用原快照。
- 2,131 題的來源區塊與 PDF 物理頁定位、四個不同選項及解析等結構檢查通過；2,854 條來源映射維持。來源映射數不代表真題能力覆蓋率。
- 30 項應用／後端／雲端資料快照測試、7 項合併保護測試通過。
- Chromium 瀏覽器檢查涵蓋實際修訂題的四選一、第三題不轉成打字題、無獨立引文的呈現、答案與來源，以及舊題組恢復；採独立記憶體帳號，未操作正式用戶資料。
- 題幹含分析填空符號：{before['blankInStem']} → {after['blankInStem']}；含「復習書／本書」：{before['editorBookInStem']} → {after['editorBookInStem']}；正解獨自最長：{before['uniquelyLongestCorrect']} → {after['uniquelyLongestCorrect']}；完全相同題幹、引文及選項的重複組：{len(before['exactDuplicateGroups'])} → {len(after['exactDuplicateGroups'])}。這些是形式風險探針，**不是難度或鑑別度證明**。
- 代理內容覆審已回修發現的歧義、題幹洩漏及不合理錯項；教師獨立終審與學生試做尚未完成。不可把 reviewed 欄位或自動檢查當作這兩項驗收。

## 成果位置與後續

- [App 最終題庫](D:/wenyan_checkin/web-study/content/bank.json)
- [改稿、原快照及合併說明](D:/wenyan_checkin/tools/question-bank/mcq-revision/README.md)
- [核准修訂清單](D:/wenyan_checkin/tools/question-bank/mcq-revision/release-manifest.json)
- [改前改後全量稽核](D:/wenyan_checkin/tools/question-bank/mcq-revision/release-audit.json)
- [來源及結構核查](D:/wenyan_checkin/web-study/content/quality-report.json)
- [瀏覽器檢查結果](D:/wenyan_checkin/web-study/verification/mcq-revision/result.json)
- [本地建置資訊](D:/wenyan_checkin/web-study/dist/build-info.json)

下一步以具體試答記錄校準：不讀原文即可排除哪些錯項、各選項被選比例、爭議答案及學生的原文依據，再針對失效題修訂。正式網站部署另行記錄。本輪沒有改寫十六課印本題答或重出260頁打印版。
'''
(R/'09_選擇題改寫與核查.md').write_text(report,encoding='utf-8')
print('Wrote report for',n,'revisions and',kept,'retained questions')
