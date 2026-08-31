# 文言打卡

一個以 DSE 文言篇目為核心的 Flutter 學習與複習應用，將閱讀、重點語譯、每日練習與複習進度放在同一個流程中。

## 主要功能

- 收錄 16 篇篇目，提供原文、字詞註釋與分段語譯。
- 閱讀頁提供 DSE 考點卡：主旨、作者與重點語譯一目了然。
- 內建 AfterSchool 精讀延伸資料，可在閱讀頁展開查看。
- 每日練習支援 5、10、15、20、30 或 50 題；作答後會顯示釋義與相應原文語譯。
- 透過錯題、到期複習與 SM-2／艾賓浩斯相關邏輯安排複習。
- 顯示連續打卡、學習紀錄、正確率與複習統計。
- 使用 SQLite 儲存本機學習資料，可在 Windows 與 Web 運行。

## 技術

- Flutter / Dart
- Provider
- SQLite（sqflite）
- Web、Windows、Android 平台工程

## 開始使用

```bash
flutter pub get
flutter run
```

執行測試：

```bash
flutter test
```

建置 Web 版本：

```bash
flutter build web
```

目前版本：`1.1.1+3`。詳細更新內容請見 [CHANGELOG.md](CHANGELOG.md)。
