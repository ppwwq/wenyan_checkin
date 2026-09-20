# 中文甲 · 文言學習書房

正式網址：[中文甲學習書房](https://chinese-a-study.philipwwq.workers.dev)。網頁、API及邀請註冊已啟用。本地帳號與學習紀錄未遷移，請以邀請碼重新註冊。詳見 [部署狀態](web-study/cloudflare/DEPLOYMENT.md)。

目前新版網頁應用位於 [`web-study/`](web-study/README.md)，包含 **2,131 道來源可追溯練習**、16 篇篇章混練、手法附錄、間隔複習、收藏，以及獨立帳號和同步服務。

- [題庫覆蓋清單](web-study/CONTENT-COVERAGE.md)
- [本機啟動與使用](web-study/README.md)
- [後端及部署說明](web-study/backend/README.md)
- [驗證記錄](web-study/VERIFICATION.md)

```sh
node web-study/backend/server.mjs
```

首次註冊需先設定學生及管理員邀請碼，詳見後端說明。帳號資料庫和部署密鑰不包含在公開倉庫。題目依提供之復習書編寫，非官方真題或教師獨立審定。

以下保留原 Flutter 版本說明及程式，未以新版覆蓋原有行動端。

---

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
