# 可运行的账号、同步与报错服务

运行环境：Node.js 24.16+，使用自带 `node:sqlite`，不需要 npm 包或远程账号。SQLite 文件只在服务器本地 `backend/data/`；此目录已忽略，禁止发布或提交。

从仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File web-study/backend/start-dev.ps1
```

脚本生成独立学生邀请码和维护者单次邀请码，首次启动显示在终端并保存到已忽略的 `backend/data/local-config.json`。访问 `http://127.0.0.1:8787`，学生账号用学生邀请码注册；维护者以 `teacher` 和维护者邀请码注册。密码至少 10 字符。该脚本只监听本机，不会发布网站。不要把包含真实数据的 data 目录发给同学。

自动检查：

```powershell
node --test web-study/backend/server.test.mjs web-study/backend/integration.test.mjs
```

## 账号与数据语义

- 密码采用独立盐的 scrypt；会话 token、邀请码与恢复码只保存 SHA-256 摘要。Bearer token 有效期 30 天，退出立即失效。
- 注册给出一次性恢复码；账号恢复要输入用户名、该恢复码与新密码。恢复会注销所有旧会话，并生成替换恢复码。没有邮件发送；丢失密码和恢复码后无法自动找回。
- 管理员角色需要指定用户名和单独单次管理员邀请码。仅输入 `teacher` 不会得到权限。学生邀请初始限 100 次，管理员可创建 1–100 次新邀请。
- 所有事件都由服务端绑定当前会话用户。客户端传入的 userId 不决定归属。每个用户的事件 ID 唯一；重复请求无副作用；修改同一事件内容会返回 409；同步批次全部成功或全部回滚。
- 每日首次按 `memoryId + 提交时间转换为香港日期` 确定，首次正确也保留；打字提交先占位，自查事件只能确定一次，跨日自查仍归原提交日。离线更早的提交后到达时，服务端返回更新后的 `firstObservations` 裁决。
- 历史题目快照和作答事件不可被题库修订覆盖。内容下架／修订使用追加的 overrides；学生端在新建队列时应用，正在练习的快照不变。修订操作返回影响作答数。维护者可由报错选择具体作答、明确复核结果及原因；更正以追加 corrections 通知本人并修复当前投影，旧答案和题目快照保持原样。
- 浏览、收藏、草稿和设置作为独立事件保存；不会被后端转换成答题。答题正确性与客户端时钟为学习用途客户端数据，不适用于考试防作弊。

## API

JSON 请求，同站调用；认证接口之外使用 `Authorization: Bearer token`。无 cookie 认证，跨站 Origin 请求拒绝。每个 IP 的账号操作每分钟最多 20 次。每个请求最多 8 MB、每次同步最多 500 个事件。

| 路由 | 内容 |
| --- | --- |
| POST `/api/auth/register` | `{username,password,inviteCode}` → `{token,user,recoveryCode}` |
| POST `/api/auth/login` | `{username,password}` → `{token,user}` |
| POST `/api/auth/recover` | `{username,recoveryCode,newPassword}` → `{token,user,recoveryCode}` |
| POST `/api/auth/logout` | 注销当前会话 |
| GET `/api/me` | `{user:{id,username,role}}` |
| POST `/api/sync` | `{events:[{id,type,payload,createdAt}]}` → 本用户全部 `events,reports,corrections,firstObservations,serverTime` |
| GET `/api/reports` | 本用户报错及真实处理状态 |
| GET `/api/content/overrides` | 按顺序应用的 `overrides` |
| GET `/api/admin/reports` | 维护者报错列表 |
| PATCH `/api/admin/reports/:id` | `{status:'processing'或'corrected'或'replied',reply}` |
| POST `/api/admin/questions/:id` | `{status:'withdrawn'或'reviewed',reason,revision?}`；revision 是 bank.json 同格式完整新版本 |
| POST `/api/admin/corrections` | `{reportId,attemptId,correct,reason}`；只修复明确选择的报错者作答，并通知该用户 |
| POST `/api/admin/invites` | `{uses:1..100}` → `{inviteCode,uses}` |

请求错误返回 `{error}`；401 需要重新登录；409 表示不可覆盖的首次记录／版本冲突。同步使用全量返回，适合首版小规模使用；大量长期记录部署前应增加分页。账户导出不应包含 token 或密码。

## 正式部署准备（没有自动发布）

1. 选择自己控制的主机与域名，安装 Node 24.16+，复制整个 `web-study`。使用进程管理器启动 `node web-study/backend/server.mjs`；数据库放持久磁盘。`.env.example` 为变量清单，服务不会隐式加载该文件，可用 Node `--env-file` 或由管理器注入。
2. 配置 `PUBLIC_ORIGIN=https://实际域名`、随机 `BOOTSTRAP_INVITE`、独立随机 `ADMIN_INVITE`、`ADMIN_USERNAME` 和 `DATABASE_PATH`。服务通过反向代理提供同一个 origin 的网页和 API，不能将前端与此服务拆到不同来源。
3. Caddyfile 给出 HTTPS 反向代理模板。Node 默认仅监听 localhost；防火墙只开放 HTTPS。主屏幕/PWA、真实 iPad 访问需要受信任 HTTPS，localhost 演示不等于手机上线。
4. Docker 可从仓库根目录 `docker build -f web-study/backend/Dockerfile -t wenyan-study .`；`Dockerfile.dockerignore` 已用允许清单排除 data、.env、local-config 和其他仓库文件。容器挂载 `/data` 持久卷，环境变量由运行平台注入。
5. SQLite 使用 WAL。简单可靠备份是停止服务后复制整个 data 目录（包含 SQLite 文件），妥善限制备份访问；恢复前停止服务，保留现有目录再恢复备份。不要只复制正在写入的主 .sqlite 文件。用户也可使用应用内 JSON 导出。
6. 本地自动测试不替代真 iPad 横竖屏／分屏／软键盘／后台恢复／弱网验收。首次公开运行前验证 HTTPS、恢复码、两个账号隔离、管理员处理报错及服务器备份恢复。
