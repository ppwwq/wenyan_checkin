# 更新紀錄 (Changelog)

規約：每次可交付的改動都升版本號（`lib/app_info.dart` + `pubspec.yaml`）並在此記一筆。
  - 小功能：+0.0.1（如 1.1.0 → 1.1.1）
  - 大功能：+0.1.0（如 1.1.0 → 1.2.0）

## [1.1.1] - 2026-08-23
### 新增
- 範文閱讀頁新增「AfterSchool 精讀」卡片（amber），展示整篇 AfterSchool DSE 中文十二篇範文語譯系列精讀素材，可展開／收起，作為日後出題素材。
- `content_service` 新增 `getAfterSchoolReference(essayId)`，讀取 `assets/seed_data/afterschool_reference.json`（16 篇）。

### 修復
- 師說（id7）原文補回結尾段「李氏子蟠…作師說以貽之」（475→522 字），及對應分段／語譯錯位。

## [1.1.0] - 2026-08-23
### 新增
- 統計頁最下方顯示應用版本號（`app_info.dart`）。
- 新增「DSE 考點」範文學習卡（主旨 / 名句語譯），見《DSE 考點》卡樣本數據。
- 建立版本管理規約與本 CHANGELOG。

### 改進
- 答題出答案時顯示「原文翻譯」（quiz_screen）。
- 每日練習題數改為下拉選單（5/10/15/20/30/50），選取即時更新。

### 修復
- 核心：題目↔註釋綁定（annotation_id）、到期複習通道、新題篩選、真實正確率統計。
