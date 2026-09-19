# 后端与前端接口验证

验证日期：2026-09-19。运行环境：Windows、Node.js v24.16.0。

执行：

```powershell
node --test web-study/backend/server.test.mjs web-study/backend/integration.test.mjs
```

结果：**9 项测试通过，0 失败**。所有测试启动真实 HTTP 服务，使用临时 SQLite 数据库，完成后关闭服务并清理各自测试目录，不触碰使用中的本机学习数据。

覆盖：

1. 邀请注册、密码认证、真实一次性恢复码轮换；恢复使原会话失效。
2. 每个用户独立事件流；同 ID 重试幂等、不同内容拒绝；文字首次占位与跨香港日自查、正确首次也占位。
3. 普通用户不能访问管理员功能；报错仅本人可见；修订和下架保持版本记录；后端文件无法通过编码路径绕过公开目录限制。
4. 管理员明确选择具体报错和作答后追加更正；本人首次有效结果修复，另一账号与原答案快照不改变。
5. 中文用户名允许，斜杠和反斜杠用户名拒绝。
6. 同一批次 assessment 先于 attempt 仍能正确补传；相同提交时刻以 ID 确定稳定首次。
7. PDF 来源支持 Range 206 与正确 MIME；无效范围拒绝；不可信 Origin 拒绝。
8. 真实 SyncClient 通过 HTTP 排空 107 条按 ID 顺序返回的待传事件，跨批 attempt/assessment 保持依赖，重复同步 ACK 不重计；切换另一账号读不到原记录，重新恢复原账号取回全部事件。
9. 真实 SyncClient 保存 corrections，真实 project 重建有效首次与复习状态，同时保留旧作答和题目快照。

界限：第 8–9 项用明确的内存存储适配器模拟 IndexedDB getAll 的 ID 顺序，并不声称验证了浏览器 IndexedDB 引擎。Safari 真实存储清理、PWA 生命周期、网络恢复、触屏与后台恢复仍须在真实 iPad 上验收。Docker、域名及 HTTPS 模板已经提供，没有构建镜像、购买主机或发布网站。
