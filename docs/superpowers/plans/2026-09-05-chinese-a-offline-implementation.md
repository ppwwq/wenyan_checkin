# 中文甲：Android 手机打卡、iPad 练习与离线题库实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. 本轮只编写和修订计划，所有开发任务均未执行；按任务顺序验收，不把演示题或模拟器检查当作真实学习内容与设备验收。

**Goal:** 先完成可接入学习资料的 App：Android 手机通过 APK 多选篇章混合短题打卡；iPad 通过主屏幕网页应用提供每篇独立练习入口、输入作答、自评改写和可暂停的全题库测试。真实学习资料由用户之后提供，本阶段不整理、出题、审核或导入现有知识库。

**Architecture:** 保留 Flutter、Provider 与 SQLite。Android 使用原生 App 和本地 SQLite，iPad 使用 PWA 和浏览器持久存储；共用题库格式、练习逻辑和界面组件。先完成通用内容包导入、版本管理、答案及进度保存，用合成测试题验证；不增加账号、同步服务器或在线 AI 服务。

**Tech Stack:** 当前工程记录为 Flutter 3.38.9 / Dart 3.10.8；Provider；sqflite / sqflite_common_ffi / sqflite_common_ffi_web；ZIP + JSON；自有 Service Worker。新增直接依赖 file_selector、archive、crypto、web；沿用当前 SDK，解析兼容版本并提交锁文件，不同时进行 SDK 大版本升级。

---

## 1. 已确认的产品决定

| 项目 | 实现要求 |
|---|---|
| 手机 | 优先 Android APK；仅日常打卡及相关记录、设置；可以多选篇章，再混合练字词、句意及简单选择题 |
| iPad | 每篇独立入口；按题型练习；长答用输入；保留草稿、首次答案、自评与改写 |
| 测试 | 「全题库测试」指覆盖当前已导入、可发布的全部题目，包含客观题与输入题；不是随机抽几题后称为全题库 |
| iPad 安装 | 「中文甲·练习」主屏幕网页入口；无需首版 App Store 工程；iPhone 和第二个打卡 PWA 不列为当前交付目标 |
| 内容分发 | 保留通用离线学习包入口；Android 安装包包含程序，iPad 网页首次联网加载、缓存完整后支持离线重开 |
| 学习资料 | 用户之后提供；当前只制作合成测试夹具，真实篇章整理、出题、答案核对和全量题库建设移出本阶段 |
| 学习记录 | 各设备独立保存，不承诺两设备互通；提供导出和恢复 |
| 评分 | 客观题按选项编号判分；输入题按本题要求自评，不做关键词机械判分或 AI 判分 |
| 视觉 | 繁体中文；沿用纸白、墨色、靛蓝及现有黑体；手机单列、iPad 宽屏双列 |
| 数据原则 | 题库与程序分离；保留来源和审核字段供未来资料使用；更新内容不删除学习历史；演示题不冒充学习资料 |

默认值：每天 5 题，设置可选 10 或 15 题；全库测试每批 20 题，可在任意题暂停；普通练习默认不计时。首版不实现手写识别、班级管理、排行榜、云同步及远程自动出题。最新范围调整日期：2026-09-05；本版取代此前「两篇真实样本包先行、全量资料交付」的安排。

## 2. 已核对的工程与内容基线

核对日期：2026-09-05。实施开始时再次检查工作区，保留全部既有修改。

- 用户当前工作区为 D:\wenyan_checkin，主目录 HEAD 为 ea27a8a1a1c778ad4eb772341c79dd3f8fd01a41，分支 master。本轮编写计划前未报告受版本控制文件的修改。
- 独立工作树 D:\wenyan_checkin\.worktrees\bug-audit-fixes 仍存在，其 HEAD 为 2fc12c2ab9ea2f578a121dc8c066d6fe88f8ef3e，分支 codex/bug-audit-fixes；与当前 HEAD 的共同祖先就是当前 HEAD。
- 该修复提交包含 v1→v2 数据迁移、题目与字词关联、答题事务、重复提交防护、异步统计状态及隔离数据库测试。可复用其代码，不能直接把历史测试通过当作本次通过。
- 当前主目录数据库仍为 v1，答题队列仅存内存，统计里的 accuracy 实为掌握记录占比，现有主目录测试还会打开文件数据库。不要先运行这些旧测试去接触真实学习数据。
- 主数据文件 D:\wenyan_checkin\assets\seed_data\all_essays.json 为 361,684 字节；含 16 个篇章条目、779 道 word_mc 题。它不是已审核的完整甲部多题型题库。
- web 目录已有 manifest 和图标，但没有发现 sqlite3.wasm、sqflite_sw.js。现有网页版能否持久保存尚未在本轮真机验证。
- android 工程已存在，applicationId 为 com.wenyan.wenyan_checkin；当前 release 配置仍指向 debug 签名。实施时需核对旧安装包的签名与升级兼容，构建成功不能视为可无损覆盖安装。
- 「中文甲」位置此前已确认是 D:\DSE中文甲部知识库，但按用户最新要求，其资料状态及整理工作不再是当前开发依赖。本阶段不读取、修改或抽取该知识库，待用户提供学习资料后另行接入。

本轮基线来自文件、代码与 Git 只读检查；没有重新运行应用测试、打包或 Android/iPad 安装验收。

## 3. 模块职责和文件安排

以下路径均相对于已确认工作区 D:\wenyan_checkin；实施时只修改本次工作分支，不改写现存 bug-audit-fixes 工作树。

| 模块 | 主要文件 | 职责 |
|---|---|---|
| 数据升级 | lib/services/database_service.dart；lib/services/content_migration.dart | v1→v2→v3；保留旧 ID、旧记录；生成稳定内容标识 |
| 内容模型 | lib/models/content_package.dart；lib/models/study_session.dart | 类型、解析、题目版本和会话状态，替代新流程中四处传裸 Map |
| 学习包 | lib/services/content_package_service.dart；lib/services/file_transfer.dart；对应 web/native/stub 实现 | 校验、预览、事务导入、Android 与 Web 文件选择和导出 |
| 练习核心 | lib/services/question_selection_service.dart；lib/services/study_session_service.dart | 按篇章选题、固定队列、选项顺序、保存答案、恢复会话 |
| 复习与统计 | lib/services/review_schedule_service.dart；lib/services/study_stats_service.dart | 题目级复习状态、真实客观题正确率、本机历史 |
| 页面状态 | lib/providers/study_session_provider.dart | 当前题、保存中、失败重试；防止异步回写污染其他题 |
| 手机 | lib/screens/checkin/ 下的首页、篇章选择、答题、完成页面 | 多选篇章短题打卡 |
| iPad | lib/screens/practice/ 下的篇章目录、篇章页、答题、自评、测试、记录页面 | 专项练习、输入作答、全库覆盖测试 |
| 公共设置 | lib/screens/settings/ 下的学习资料、记录备份页面 | 导入包、版本、存储状态、备份恢复 |
| 入口与风格 | lib/main.dart；lib/app_entry.dart；lib/theme/app_theme.dart | Android 固定打卡、iPad 网页固定练习，公共字号与组件 |
| 内容接口与测试 | docs/content-package-format.md；tool/build_content_pack.dart；test/fixtures/content_packs/ | 定义通用 JSON→ZIP 格式，用合成题验证，不加工真实学习资料 |
| Android 交付 | android/app/build.gradle.kts；android/app/src/main/AndroidManifest.xml；android/app/src/main/kotlin/com/wenyan/wenyan_checkin/MainActivity.kt；同目录 DocumentTransfer.kt | APK、升级兼容、系统返回键与文档保存桥接 |
| 网页交付 | web/practice/index.html；web/manifest.json；web/sw.js；tool/prepare_web_release.dart | iPad 单一安装入口，共享构建文件，离线缓存及发布校验 |

继续使用 Provider，不为这次改造引入新的状态管理框架。旧页面在替代入口完成后退出主流程；旧数据读取与备份兼容代码保留。

## 4. 离线内容契约

### 4.1 文件形式

学习包为 .zip，包含 manifest.json、content.json 和可选的 media/ 图片。首版只接收 PNG、JPEG、WebP；正文使用结构化纯文字段落，不接收可执行 HTML。本阶段只定义接口，不要求用户现在转换材料或提供指定格式；未来收到资料时再确定适配办法。

manifest 必须包含：schemaVersion=1、packId、递增整数 version、标题、创建时间、篇章 UID 清单、content.json 的 SHA-256、每个媒体文件的路径和 SHA-256。

content.json 包含 sources、essays、questions 三组数据：

| 实体 | 必填内容 |
|---|---|
| source | sourceId、资料名称、来源性质、可定位的页码或标题；可选核对记录位置，不依赖本机知识库路径；资料性质不能仅凭文件名推定 |
| essay | 固定 essayUid、繁体标题、作者、段落列表；每段有 paragraphId、原文、译文及 sourceRefs |
| question | 固定 questionUid、递增 revision、主篇章 essayUid、可选相关篇章、kind、skill、difficulty、dailyEligible、题干、上下文、答案、解释、来源与审核状态 |
| choice 答案 | 2–4 个有固定 optionId 的不重复选项，correctOptionId；选择题必须有可判定的单一正确选项 |
| text 答案 | 参考答案、带固定 checkId 的自查项；有来源依据时才填写整题分数、原评分分项或整体等级描述 |
| context | 学生作答必需的原文片段、对应段落和出处；题目版本保存所使用的上下文快照 |
| review | releaseStatus 为 approved 才可进入发布包；记录核对者、核对时间及审核依据；这不等于声称来源是官方文件 |

kind 仅设 choice 和 text；字词、句意、结构、感情、手法、比较通过 skill 区分。dailyEligible 只允许简单 choice；iPad 读取两种 kind。选项编号不随显示顺序改变。

固定 UID 不根据数组位置或题干文字重新生成。编辑同一道题时保留 UID、增加 revision；实质不同的题使用新 UID。来源位置作为可回查元数据保存；源文件哈希可选，真实资料审核和变化追踪在接入资料阶段确定，不作为当前工具运行前提。

### 4.2 导入与更新

- 文件选择后先解析、校验，再显示「新增篇章／题目、更新题目、包大小和版本」；学生确认导入后才写数据库。
- 必查 schema、唯一 UID、引用存在、选项编号、正确答案、媒体哈希、发布状态。拒绝 ZIP 路径穿越、加密包及解压后超过 128 MiB 的包；压缩包上限 64 MiB。
- 同 packId 同 version 同哈希为无操作；同版本不同内容拒绝；低版本拒绝覆盖；高版本通过全部检查后在一个数据库事务中安装。
- 内容包是该 packId 的完整快照。新版移除的题只从新练习中停用，旧版本与会话记录继续保留；不同包不能无声明地占用同一 questionUid。
- 媒体按 SHA-256 去重保存到本地数据存储，与内容导入同事务；首版不自动删除历史仍可能使用的媒体。
- 哈希用于完整性检查，不冒充来源身份或数字签名验证。

### 4.3 数据库 v3

保留现有 8 张表及整数 ID。为篇章和题目增加稳定 UID；题目增加 currentRevision、publicationStatus、ownerPackId 和 dailyEligible，现有 type/dimension 对应 kind/skill。JSON 用 camelCase，数据库列用 snake_case，映射集中在模型/存储层。新增以下表，不再另外为手机、iPad、测试各复制一份题库：

| 表 | 保存内容 |
|---|---|
| content_packs | 已安装包、当前版本、哈希、manifest |
| question_versions | questionUid + revision 唯一；完整题目及上下文 JSON，用于固定历史 |
| study_sessions | sessionId、用户、daily/extra/chapter/test、所选篇章、创建日期、随机种子、状态、当前批次 |
| session_items | 会话内顺序、题目 UID/版本、选项显示顺序、草稿、首次答案、最新改写、自查、客观结果、提示/参考查看状态 |
| study_preferences | 用户在各入口的篇章选择、题量和字号 |
| question_review | 用户与题目对应的复习间隔、到期日、最后有效复习日与表现 |
| media_assets | 哈希、MIME、图片字节 |

session_items 设 UNIQUE(sessionId, questionUid)，会话内 position 唯一，并保存 submitted_at。每次重练创建新的 session/item；同一 item 首次提交只能成功一次。题目版本仅在新版本导入时存一份，不在每条学生答案里重复存题文。为 questions(essay_id, publication_status, daily_eligible)、session_items(question_uid, submitted_at) 建查询索引；目录只查询计数和当前显示行，使用懒加载列表，答题页只装载当前所需题目。

旧数据迁移：旧题标为 legacy，原题与学习记录完整保留在「原有记录」。不把旧的掌握状态反推出不存在的答题历史。旧打卡日历继续保留；新客观正确率明确从新答题记录开始统计。旧 legacy 题不自动进入已审核题库；完成核对后可以通过显式 UID 映射发布，禁止按相似题干猜配。

## 5. 行为与页面细节

### 手机：多选篇章混练

- 首次显示篇章多选；仅有可用 dailyEligible 题的篇章可选。至少选择一篇；保存选择后首页显示「已选 N 篇」和题量。
- 生成新一轮时先过滤所选篇章及 dailyEligible，再在各篇候选池中优先安排到期/错题；同篇同优先级按保存的随机种子打乱。
- 用轮转方式从各篇抽题，避免题多的篇章占满整轮。篇章数大于题量时，优先覆盖近期较少练的已选篇章；覆盖统计来自真实 session_items。
- 同一轮不重复题号；候选不足时实际题量减少并显示数量，不补入未选篇章。当天目标可通过后续新一轮补足，允许再次练习，但同一天同题正确多次不扩大长期复习间隔。
- 创建会话时保存篇章、题序与选项序；修改篇章选择只影响下一轮。恢复已有会话不重新选题。
- 每题提交成功后才推进计数；答错同样计入完成题数。达标按首次成功提交事件计数，不按反复点击计数。
- 只有手机 daily/extra 会话增加 daily_logs；iPad chapter/test 会话不增加手机打卡计数。不同新一轮的同题作答可以计入练习次数，但复习间隔仍遵守同日限制。
- 当日目标第一次开始时锁定，改题量次日生效；额外练习仍可记录。跨午夜的提交按提交时本地日期计数，旧会话可继续，旧日期记录不被搬移。
- 选择后给出解释与可展开原文；完成页显示本轮客观结果、需重温内容及「再练一组」。

### iPad：每篇独立入口与输入作答

- 目录按已导入的篇章数据生成，每篇有独立入口，不把篇数或篇名写死。尚无发布题目的篇章显示「尚未导入练习」；全库为空时显示资料导入入口，不显示假进度。
- 篇章页提供「全部／字词句意／理解分析」筛选；这些只是同一题库的视图。
- 宽度 >=900 logical pixels 时，题目原文与输入区约按 45:55 并列；更窄时上下排布、原文可收起。模式不由宽度决定。
- 输入使用多行纯文字；支持中文输入法、选取、复制粘贴和外接键盘。字号可调，触控目标至少 48 logical pixels。
- 草稿停止输入约 600 ms 后保存，切题、失焦、完成前主动保存；仍有中文输入法 composing 文本时不破坏组合态。每次保存带递增序号，旧异步结果不得覆盖新草稿。
- 界面显示「保存中／已保存／保存失败，重试」。失败时保留输入，禁止显示已保存或自动离开。
- 「完成并核对」先保存首次答案并锁定，再展示参考、自查项。空答案可选择「暂不会，查看解析」，保留为空且标为跳过，不伪造成独立正确。
- 自查三态：met/partial/missing。可以从只读答案选择对应文字作为证据，保存原句及位置；不能只靠颜色传递状态。
- 修改保存为 latestRevisionAnswer，首次答案只读。改写后旧证据标记不直接沿用，重新自查；首版展示首次与最新改写两版对照。

### 全题库测试

- 测试首页明确「当前已导入 X 篇、共 Y 题」。按全库定义包含所有 active/approved 题，按 questionUid 去重。
- 创建时冻结所有题目版本、题序与选项序；题目版本在整个测试期间不随内容更新改变。测试不调用每日题量上限。
- 默认每批 20 题；尾批不足 20 题按实际数量。逐题草稿可保存、可返回修改；本批提交前不展示答案或提示。
- 提交本批时明确列出空白题，学生可返回作答或确认以「暂不会」提交；空白客观题按 0 计入本批客观结果，输入题标未作答。
- 本批提交后才解锁核对与长答自评。可暂停、跨日续做、重开仍回原批次，已提交批次不可改首次答案。
- 显示「全库已提交 X/Y」、客观题正确数/客观题总数、输入题已自查数及错因；不合并为虚假的统一考试分数。
- 当前测试未完成时，默认继续；创建新测试需明确结束本次，旧结果保留。题库更新只影响新测试。

### 复习指标

- 客观正确率来自已提交 session_items；自评、草稿和未提交选项不混入分母。
- 复习状态按题目记录，不因一道字词题答对而推进整篇文章掌握状态。
- 每题每天最多一次成功间隔增长；当天任何失败可将其安排次日复习，后续同日答对不撤销此次提醒。
- 已较稳定的题仍安排到期抽查；输入题只记录自查与重练意向，不用自评自动生成「已掌握」结论。

## 6. Android 安装、iPad 离线和备份

### Android APK

- Android 默认进入手机打卡模式，数据库走现有原生 sqflite；安装后程序本身不依赖网页缓存或首次联网。未导入题库时展示清晰的空状态。
- 延续现有 applicationId；在准备覆盖安装前核对设备已有安装的签名和版本。兼容时提高 versionCode 并验证升级后记录保留；签名不匹配时不卸载旧 App 来绕过问题。
- 当前 debug 签名仅用于开发试用。正式分发签名另行配置并保存在仓库外；不把试用 APK 标为上架发行包。没有正式签名不阻塞界面和功能开发。
- 验收 Android 系统返回键、字体缩放、后台恢复、杀进程重开及原生文件导入/导出。窗口宽度只改变排版，不自动切成 iPad 模式。

### iPad 网页入口

- 使用 /practice/ 实体启动页、单一 manifest、名称、apple-touch-icon 和稳定 id/start_url；使用根目录的 Flutter 脚本与 assets。根入口引导至练习页面，不额外制作手机 PWA。
- 安装后固定进入练习模式，不根据 user agent 或窗口变化切换功能；保留横竖屏和分屏布局。
- 配置 Flutter assetBase、entrypointBaseUrl 和本地 CanvasKit 路径，避免子目录打开时资源相对路径失效。
- Android 与 iPad 各自独立保存记录；同一内容包可以分别导入，不承诺自动同步。

### 缓存

- 使用一个根作用域自有 Service Worker，禁用构建器的旧默认 SW 注册；现有旧 SW 若已安装，要执行受测的替换流程，不清除 IndexedDB。
- 采用 release-id 命名缓存。预缓存练习入口、共享程序、字体、SQLite WASM/worker、CanvasKit 及必要图标；所有运行时必需资源同源提供，不依赖首次离线时才发现的 CDN 资源。
- 仅在必需资源全部缓存且本地数据库读写检查成功后显示「可离线使用」。导入的题目和媒体由数据库保存，不把 Service Worker 缓存当作学生答案存储。
- 新 SW 安装后等待；有未保存草稿或进行中的提交时不强制刷新。新缓存完整后才切换，旧缓存随后清理；数据库和学习包不随缓存清理而删除。
- 静态网页发布包内生成 precache 清单，排除源码映射和未经选择的原始 PDF。最终域名在发布任务中确定，工程只要求根路径 HTTPS 静态托管。

### 备份

- 备份为带格式版本与数据库版本的 .zip，完整导出 8 张旧表及 7 张新表的用户数据，包括 legacy 题目、旧错题、安装内容、历史题目版本、媒体、设置和全部会话；不包含知识库全部原始 PDF。
- Web 导入使用 file_selector 的文件选择能力；导出使用浏览器 Blob 下载，不能调用 Web 不支持的目录选择/getSaveLocation。
- Android 导入使用系统文件选择；导出通过 MethodChannel 接入 ACTION_CREATE_DOCUMENT，将 ZIP 写入用户选定的 content URI，不假设可直接写 Downloads 路径。取消操作不显示成功，不修改记录；写入失败保留可重试状态。
- 恢复前完整校验并预览；第一版提供「替换本机学习资料与记录」，不做自动合并。替换前要求先完成本机备份导出，并由用户明确确认替换。
- 恢复在事务中完成；失败保留原数据。记录备份 schemaVersion，不将内容包误当成学习记录备份。
- 申请浏览器持久存储、显示实际估算用量；未获持久化不阻止使用，但仍保留备份入口，不承诺系统永不回收数据。

## 7. 按顺序执行的开发任务

每项完成后先运行对应有行为意义的测试，再进入下一项。Flutter 命令串行执行，避免工具锁争抢。一个任务一个可审核的提交；不要提交私人备份或无关文件。当前 11 项任务都不依赖用户提供真实学习资料。

### Task 1 — 纳入可复用修复，建立隔离测试基线

Files: 当前 lib/main.dart、lib/services/、lib/providers/ 与 test/；参考现存 2fc12c2 修复提交。

- [ ] 检查当前工作区及分支；建立 codex/chinese-a-offline 工作分支，不丢弃用户修改。
- [ ] 核对 2fc12c2 是否已经包含；未包含时在工作分支纳入此已确认提交，不操作另一工作树。
- [ ] 确认数据库测试使用内存或测试专用临时路径，不能打开用户 wenyan.db；从修复提交沿用测试注入方式。
- [ ] 顺序运行 flutter test、flutter analyze；记录实际结果，修复引入冲突后才继续。
- [ ] 验收重复提交仅记一次、事务失败不部分记账、启动失败有恢复界面；保留旧日历数据。

### Task 2 — 明确内容模型与 v3 数据迁移

Files: lib/models/content_package.dart、lib/models/study_session.dart、lib/services/content_migration.dart、lib/services/database_service.dart；test/services/content_migration_test.dart。

- [ ] 按第 4 节建立模型、序列化与数据表；以 fixture 构造 v1 和 v2 数据库。
- [ ] 先添加迁移测试：旧主键/日历/用户/错题保留；v1 可跨级升级；重复打开不重复生成 UID；legacy 不伪造历史。
- [ ] 实现 v3 迁移及必要唯一约束、查询索引；旧 ID 与新 UID 的对应持久保存。
- [ ] 添加题目版本冻结测试：更新当前版本后，旧会话仍读旧题干、旧上下文及旧选项。
- [ ] 运行 flutter test test/services/content_migration_test.dart，确认全部通过。

### Task 3 — 离线包构建器、校验器和导入

Files: tool/build_content_pack.dart、docs/content-package-format.md、lib/services/content_package_service.dart、lib/services/file_transfer.dart 及 web/native/stub 实现；test/services/content_package_service_test.dart；test/fixtures/content_packs/。

- [ ] 加入兼容 SDK 的依赖并锁定；实现纯 Dart 的包模型/校验供构建器与 App 共用。
- [ ] 创建两篇合成测试篇章的小包，包含 choice/text/图片；fixture 明确为开发数据，不进入学生发布包。
- [ ] 添加有效导入、重复导入、版本冲突、悬空引用、坏哈希、解压超限和写入失败回滚测试。
- [ ] 实现包预览与事务安装；旧版本停用仅影响新会话。
- [ ] 写出输入 JSON、必填字段、选项和自查项、版本更新及错误提示的格式说明；打包器只处理显式提供的 JSON 和媒体，不扫描知识库或自动生成题目。
- [ ] 运行 flutter test test/services/content_package_service_test.dart，确认导入失败后旧库查询结果完全一致。

### Task 4 — 合成测试包与无资料状态

Files: test/fixtures/content_packs/demo_a.json、demo_b.json、demo_update.json、invalid/；test/services/content_fixture_test.dart；docs/content-package-format.md；输出 build/test-content-packs/。

- [ ] 建立「测试篇章 A」「测试篇章 B」，题号统一使用 demo- 前缀，题干及来源明确写「开发测试，非学习资料」。两篇合计 45 题，包含可混练 choice、text、自查项和图片上下文。
- [ ] 建立同包高版本 fixture，包含修改题目、增加题目及停用题目；另建坏哈希、错误引用及不支持版本的无效包。
- [ ] 测试两篇可分别导入、UID 与题型正确、版本升级保留历史；所有检查使用隔离数据库，不接触用户原有记录。
- [ ] 确定无资料界面：引导导入资料；无候选题时禁用开始按钮并解释原因；不为了填满界面自动导入旧 seed_data 或编造学习统计。旧记录仍按迁移规则保留。
- [ ] 开发及真机验收在专用测试数据环境中手动导入演示包；正式 APK/Web 产物不内置、不自动导入这些夹具，也不读取真实知识库。

### Task 5 — 持久会话、选题和复习状态

Files: lib/services/question_selection_service.dart、lib/services/study_session_service.dart、lib/services/review_schedule_service.dart、lib/services/study_stats_service.dart、lib/providers/study_session_provider.dart；对应 test/services/ 与 test/providers/。

- [ ] 写多篇选题、固定随机种子、无重复题、题量不足、跨篇题去重、测试不受 daily_target 限制的测试。
- [ ] 实现第 5 节的轮转抽题及 session_items 持久化；提交用唯一 item 身份实现幂等。
- [ ] 写数据库故障、连续点击、切题后的旧异步响应、日期跨越和同日复习的行为测试。
- [ ] 实现原子提交、锁定首次答案、草稿递增版本、按题目的复习调度及真实统计。
- [ ] 用 10,000 道合成文字题做本地容量检查，记录导入用时、峰值占用、生成短队列与全题号清单的耗时；确认选题不解析全库长答案、列表不一次构建全部题目控件。
- [ ] 运行这些服务与 Provider 的指定测试，重新打开数据库验证会话不变。

### Task 6 — 手机多选篇章与打卡界面

Files: lib/screens/checkin/、lib/app_entry.dart、lib/theme/app_theme.dart；test/screens/checkin_flow_test.dart。

- [ ] 实现篇章多选、保存选择、每日题量与空题库状态。
- [ ] 实现首页→答题→完成三屏，连接真实会话服务；解释和原文仅在提交后显示。
- [ ] 测试刷新续答、提交失败保留选项、长选项换行、大字号、达标后再练。
- [ ] 在 360×800、390×844 与 430×932 视口检查布局；Android 模拟器检查返回键、后台恢复和字体缩放，真机验收在 Task 10 完成。

### Task 7 — iPad 篇章练习、草稿和自评改写

Files: lib/screens/practice/、lib/providers/study_session_provider.dart；test/screens/practice_flow_test.dart。

- [ ] 实现按已导入篇章生成的独立卡片、题型筛选、可用题量与未导入状态；用两篇演示题验证，不硬编码 16 篇。
- [ ] 实现双栏/窄屏布局、多行输入、保存状态、参考折叠及可选计时。
- [ ] 实现首次答案锁定、自查三态、文本证据标注和首次/最新改写对照。
- [ ] 测试中文组合输入不被打断、快速切题不串稿、保存失败可重试、看参考不算独立正确。
- [ ] 检查 820×1180、1180×820 及 600 宽分屏；记录真实设备键盘验收待办。

### Task 8 — 全题库测试

Files: lib/screens/practice/test_setup_screen.dart、test_session_screen.dart、test_results_screen.dart；lib/services/study_session_service.dart；test/services/full_test_service_test.dart。

- [ ] 用 45 题 fixture 测试分为 20/20/5 三批，固定队列，跨篇重复 UID 只计一题。
- [ ] 实现暂停续做、本批提交、空题确认、提交后核对，以及 objective/selfReview 分开统计。
- [ ] 测试离线重开后仍在原题、题库更新不改变进行中测试、新测试才使用新版。
- [ ] 验收全题覆盖进度真实，题库为空不能开始；没有把长答自评拼成自动总分。

### Task 9 — 学习资料管理与完整备份

Files: lib/screens/settings/、lib/services/backup_service.dart、lib/services/file_transfer.dart 及 web/native/stub 实现；android/app/src/main/kotlin/com/wenyan/wenyan_checkin/MainActivity.kt、DocumentTransfer.kt；test/services/backup_service_test.dart。

- [ ] 实现导入预览、版本清单、实际存储用量、导出和恢复入口。
- [ ] 编写备份往返测试：安装包→做题→保存草稿→更新题库→导出→恢复→逐项对比。
- [ ] 验证旧题目版本、旧媒体、首次/改写答案和老日历都可回看；损坏备份不更改本机数据。
- [ ] 验证恢复明确说明替换，不实现没有定义的自动合并。
- [ ] 实现 Android 系统文档导出桥接，验证用户取消、URI 写入失败与成功写入的不同结果；Web 保留 Blob 下载。两端使用同一备份格式，测试往返兼容，不把手动恢复称为同步。

### Task 10 — Android APK 与 iPad 离线交付

Files: lib/main.dart、lib/app_entry.dart、android/app/build.gradle.kts、android/app/src/main/AndroidManifest.xml、web/practice/index.html、web/manifest.json、web/sw.js、tool/prepare_web_release.dart；test/web/；docs/releases/device-acceptance.md。

- [ ] 固定入口：Android 为打卡，/practice/ 网页为练习；数据库按平台初始化，Android 不加载 Web 的 WASM/worker。通过编译检查确保 Web 不误用原生文件接口。
- [ ] 构建 Android 开发试用 APK，记录包名、版本与签名指纹；在专用测试安装中验证导入、断网作答、杀进程重开、备份导出及系统返回键。已有用户安装先核对签名，不以卸载清数据处理升级问题。
- [ ] 补齐与已锁定 sqflite/sqlite3 版本匹配的 WASM 和 worker；执行对应 setup 后核对实际网页资源可加载。
- [ ] 建立 iPad 单一练习启动页与安装身份，修正共享资源路径；不锁定竖屏。
- [ ] 按第 6 节生成预缓存清单，实现完整缓存后再激活、更新等待及旧 SW 兼容。
- [ ] 对 release 构建逐个检查资源 200、文件哈希、数据库读写、离线重开及更新时草稿保留。
- [ ] 在实际 iPad 上验收从「文件」导入、Blob 导出、主屏幕启动和断网练习；Android 与 iPad 分别记录结果，模拟器/桌面浏览器不能替代真机验收。

### Task 11 — 功能回归与程序交付

Files: docs/releases/、docs/content-package-format.md、README.md、pubspec.yaml；最终输出 build/app/outputs/flutter-apk/、build/web/；开发夹具单独放 build/test-content-packs/。

- [ ] 使用演示包完成完整功能回归，覆盖空题库、两篇混练、长答草稿、自评改写、全库测试、内容版本更新和备份恢复。
- [ ] 构建 APK 与网页产物，核对版本、文件哈希、APK 签名类型与夹具未被自动打包；保留旧记录迁移的检查结果。
- [ ] 执行第 8 节验收表，逐项记录通过、失败或尚未执行；交付标为「功能试用版，真实学习资料待用户提供」，不声称教学效果或题库建设完成。
- [ ] 更新使用说明：Android 安装与升级、iPad 添加主屏幕、导入包、记录独立保存、备份恢复和全库测试范围。
- [ ] 输出试用 APK、可部署的静态目录、题库格式说明及验收记录。公开托管、应用商店发布和账号同步另行安排；真实资料接入不阻塞本阶段程序交付。

## 8. 检查命令与完成标准

以下是实施阶段应运行的命令，不是本轮已经运行的结果。Flutter 检查必须串行；先完成 Task 1 的测试隔离。

~~~powershell
flutter test -r expanded --timeout 30s
flutter analyze
flutter build apk --debug
flutter build web --release --pwa-strategy=none --no-web-resources-cdn --no-wasm-dry-run
dart run tool/prepare_web_release.dart
git diff --check
~~~

以下构建器只处理合成测试 JSON，不要求知识库路径或真实学习资料：

~~~powershell
dart run tool/build_content_pack.dart --input test/fixtures/content_packs/demo_a.json --output build/test-content-packs/demo_a.zip
dart run tool/build_content_pack.dart --input test/fixtures/content_packs/demo_b.json --output build/test-content-packs/demo_b.zip
~~~

期望：测试全部通过；analyze 无问题；开发试用 APK 与静态网页构建成功；发布准备脚本列出的必需资源全部存在；合成包校验通过；差异检查无空白错误。未运行或没有设备验证的项目必须写明。优化后的 release APK 需另行确认签名后构建并验收，不能将 debug 构建结果当作 release 结果。

| 阶段 | 必须看到的实际证据 |
|---|---|
| 数据可用 | v1/v2 升级、导入回滚、恢复备份、旧记录不丢的测试结果 |
| 手机功能 | Android 用两个合成篇章多选混练；题目不越出所选范围；重开续答；计数不重复；无资料状态可理解 |
| iPad 功能 | 每篇入口、输入草稿、自评改写、宽窄布局和键盘操作 |
| 全库测试 | 45 题测试夹具全部覆盖；20/20/5 分批；暂停与版本冻结；客观/自评分开 |
| Android 交付 | APK 实际安装、原生导入导出、断网和杀进程恢复；记录签名及兼容升级结果 |
| iPad 离线 | 主屏幕模式断网重开、导入后作答保存、再次重开仍有记录；实际文件导入导出 |
| 题库接口 | 合成包导入、版本更新、坏包回滚、字段格式说明；程序不绑定篇名或真实知识库路径 |
| 范围边界 | 合成题明确标记，正式程序不自动导入演示资料；真实内容与教学效果不列为本阶段完成条件 |

## 9. 里程碑与先后关系

1. **M0 稳定基线：**Task 1。复用既有修复并得到本轮测试结果。
2. **M1 题库接口和记录：**Task 2–5。导入、题目版本、两个合成测试包、选题与会话恢复完整。
3. **M2 手机功能可试用：**Task 6，使用 Task 4 的合成题验证多选篇章混练和无资料状态。
4. **M3 iPad 功能可试用：**Task 7–8，使用合成 choice/text 题。按篇练习和全库测试都能保存、恢复、自评。
5. **M4 两端离线试用：**Task 9–10。完成备份与 Android/iPad 实际设备验收，产出 APK 与可部署目录。
6. **M5 程序交付：**Task 11。完整回归、安装包/网页、使用说明及题库格式说明；没有真实资料也能完成这一里程碑。

后续资料接入是独立阶段：用户提供材料后，再确定整理范围、来源核对、题型与学习包制作。本阶段不提前选篇、出题或承诺全量题库。当前任务只修订本计划，不开始功能实现，也不改写知识库或其他任务成果。

## 10. 实施参考

- 现有修复提交：2fc12c2ab9ea2f578a121dc8c066d6fe88f8ef3e；本轮已确认对象与工作树存在。
- [Flutter Android 构建与签名](https://docs.flutter.dev/deployment/android)：APK、包身份、签名和升级检查。
- [Android 系统文档选择与保存](https://developer.android.com/training/data-storage/shared/documents-files)：用户指定文件、URI 和 ACTION_CREATE_DOCUMENT。
- [Flutter Web 部署](https://docs.flutter.dev/deployment/web) 与 [初始化配置](https://docs.flutter.dev/platform-integration/web/initialization)：共享资源和本地 CanvasKit 配置。
- [Flutter Web FAQ](https://docs.flutter.dev/platform-integration/web/faq)：离线能力需明确维护；本计划选择自有 SW。
- [sqflite_common_ffi_web](https://pub.dev/packages/sqflite_common_ffi_web)：浏览器数据库持久化及 WASM/worker 资源。
- [file_selector](https://pub.dev/packages/file_selector)：Web 可选文件，不支持选择保存目录；[archive](https://pub.dev/packages/archive) 用于 ZIP；[crypto](https://pub.dev/packages/crypto) 用于哈希。
- [Apple 主屏幕网页应用](https://support.apple.com/zh-tw/guide/ipad/ipad8f1f7a29/ipados)；[WebKit 存储策略](https://webkit.org/blog/14403/updates-to-storage-policy/)：持久化和恢复需实机验证。
