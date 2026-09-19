import { atomic } from './transaction.mjs';
import { randomBytes, createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const hongKongDay = value => new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 10);
const text = (value, max = 200) => typeof value === 'string' && value.length > 0 && value.length <= max;
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function syncApi({ db, need, body, json, currentQuestion = () => null }) {
  db.exec(`CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), id TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, received_at TEXT NOT NULL, UNIQUE(user_id,id));
    CREATE TABLE IF NOT EXISTS assessments (user_id TEXT NOT NULL REFERENCES users(id), attempt_id TEXT NOT NULL, event_id TEXT NOT NULL, correct INTEGER NOT NULL, PRIMARY KEY(user_id,attempt_id));
    CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), event_id TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, reply TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,event_id));
    CREATE TABLE IF NOT EXISTS revisions (seq INTEGER PRIMARY KEY AUTOINCREMENT, question_id TEXT NOT NULL, status TEXT NOT NULL, revision TEXT, reason TEXT NOT NULL, admin_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS corrections (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), attempt_id TEXT NOT NULL, correct INTEGER NOT NULL, reason TEXT NOT NULL, report_id TEXT NOT NULL, admin_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, admin_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);`);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const correctionRows = user => all('SELECT * FROM corrections WHERE user_id=? ORDER BY seq', user.id).map(row => ({ id: row.id, attemptId: row.attempt_id, correct: !!row.correct, reason: row.reason, createdAt: row.created_at }));
  const reportRows = user => all(`SELECT reports.*, users.username FROM reports JOIN users ON users.id=reports.user_id ${user ? 'WHERE user_id=?' : ''} ORDER BY updated_at DESC`, ...(user ? [user.id] : [])).map(row => {
    const p = JSON.parse(row.payload);
    return { questionId: p.questionId, questionVersion: p.questionVersion, essayIds: p.essayIds, source: p.source, category: p.category, detail: p.detail, answer: p.answer, id: row.id, eventId: row.event_id,
      ...(user ? {} : { username: row.username, attempts: all("SELECT id,payload FROM events WHERE user_id=? AND type='attempt' ORDER BY seq", row.user_id).map(a => ({ id: a.id, ...JSON.parse(a.payload) })).filter(a => a.questionId === p.questionId) }), status: row.status, reply: row.reply, updatedAt: row.updated_at };
  });
  function firstObservations(events, user) {
    const assessments = new Map(all('SELECT * FROM assessments WHERE user_id=?', user.id).map(row => [row.attempt_id, !!row.correct]));
    const corrections = new Map(correctionRows(user).map(c => [c.attemptId, c.correct]));
    const first = new Map();
    for (const event of events.filter(e => e.type === 'attempt').sort((a, b) => Date.parse(a.payload.submittedAt) - Date.parse(b.payload.submittedAt) || a.id.localeCompare(b.id))) {
      const p = event.payload; const day = hongKongDay(p.submittedAt); const key = `${p.memoryId}/${day}`;
      if (!first.has(key)) first.set(key, { memoryId: p.memoryId, day, attemptId: event.id, submittedAt: p.submittedAt, mode: p.mode, correct: corrections.has(event.id) ? corrections.get(event.id) : p.mode === 'typing' ? assessments.get(event.id) ?? null : p.correct });
    }
    return [...first.values()];
  }
  function validate(event) {
    need(event && text(event.id, 300) && date(event.createdAt), '学习事件缺少有效编号或时间。');
    const p = event.payload;
    need(p && typeof p === 'object' && !Array.isArray(p), '事件内容无效。');
    need(['attempt', 'assessment', 'favorite', 'report', 'browse', 'session', 'settings'].includes(event.type), '事件类型无效。');
    if (event.type === 'attempt') {
      need(text(p.memoryId) && text(p.questionId) && p.questionVersion != null && p.question && typeof p.question === 'object' && date(p.submittedAt), '作答缺少题目快照或提交时间。');
      need(['choice', 'typing'].includes(p.mode) && typeof p.answer === 'string' && p.answer.length <= 20000, '作答格式无效。');
      need(p.mode === 'typing' ? p.correct === null : typeof p.correct === 'boolean', '文字自查须单独提交。');
      need(!p.day || p.day === hongKongDay(p.submittedAt), '作答日期须与香港提交日期一致。');
    }
    if (event.type === 'assessment') need(text(p.attemptId, 300) && typeof p.correct === 'boolean', '文字自查格式无效。');
    if (event.type === 'favorite') need(text(p.questionId) && typeof p.saved === 'boolean', '收藏格式无效。');
    if (event.type === 'report') need(text(p.questionId) && p.questionVersion != null && text(p.category, 100) && typeof p.detail === 'string' && p.detail.length <= 5000, '报错缺少题目版本、分类或说明。');
    if (event.type === 'browse') need(text(p.questionId), '浏览记录格式无效。');
    if (event.type === 'session') need(p.session && text(p.session.id) && Array.isArray(p.session.questions) && p.session.questions.length <= 100, '练习草稿格式无效。');
  }
  return async function handle(route, req, res, user) {
    if (route === '/api/sync' && req.method === 'POST') {
      const input = await body(req); need(Array.isArray(input.events) && input.events.length <= 500, '每次最多同步 500 个事件。');
      input.events.forEach(validate);
      const ordered = [...input.events].sort((a, b) => Number(a.type === 'assessment') - Number(b.type === 'assessment') || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
      atomic(db, () => {
        for (const event of ordered) {
          validate(event);
          const payload = canonical(event.payload);
          const existing = get('SELECT * FROM events WHERE user_id=? AND id=?', user.id, event.id);
          if (existing) { need(existing.type === event.type && existing.payload === payload && existing.created_at === event.createdAt, '同一事件编号不能覆盖已保存的记录。', 409); continue; }
          if (event.type === 'assessment') {
            const attempt = get('SELECT * FROM events WHERE user_id=? AND id=? AND type=?', user.id, event.payload.attemptId, 'attempt');
            need(attempt && JSON.parse(attempt.payload).mode === 'typing', '找不到此账号的文字作答。');
            need(!get('SELECT 1 FROM assessments WHERE user_id=? AND attempt_id=?', user.id, event.payload.attemptId), '首次自查已锁定。', 409);
            run('INSERT INTO assessments VALUES (?, ?, ?, ?)', user.id, event.payload.attemptId, event.id, Number(event.payload.correct));
          }
          const now = new Date().toISOString();
          run('INSERT INTO events(user_id,id,type,payload,created_at,received_at) VALUES (?, ?, ?, ?, ?, ?)', user.id, event.id, event.type, payload, event.createdAt, now);
          if (event.type === 'report') run('INSERT INTO reports VALUES (?, ?, ?, ?, ?, ?, ?)', randomBytes(18).toString('base64url'), user.id, event.id, payload, 'received', '', now);
        }
      });
      const events = all('SELECT * FROM events WHERE user_id=? ORDER BY seq', user.id).map(row => ({ id: row.id, type: row.type, payload: JSON.parse(row.payload), createdAt: row.created_at, receivedAt: row.received_at }));
      json(res, 200, { events, reports: reportRows(user), corrections: correctionRows(user), firstObservations: firstObservations(events, user), serverTime: new Date().toISOString() }); return true;
    }
    if (route === '/api/reports' && req.method === 'GET') { json(res, 200, { reports: reportRows(user) }); return true; }
    if (route === '/api/content/overrides' && req.method === 'GET') {
      const overrides = all('SELECT * FROM revisions ORDER BY seq').map(row => ({ questionId: row.question_id, status: row.status, revision: row.revision ? JSON.parse(row.revision) : null, reason: row.reason, createdAt: row.created_at }));
      json(res, 200, { overrides }); return true;
    }
    if (!route.startsWith('/api/admin/')) return false;
    need(user.role === 'admin', '需要维护者权限。', 403);
    if (route === '/api/admin/corrections' && req.method === 'POST') {
      const input = await body(req);
      need(text(input.reportId) && text(input.attemptId, 300) && typeof input.correct === 'boolean' && text(input.reason, 5000), '请明确选择报错、作答、复核结果和更正原因。');
      const report = get('SELECT * FROM reports WHERE id=?', input.reportId);
      need(report, '找不到报错。', 404);
      const attempt = get("SELECT * FROM events WHERE user_id=? AND id=? AND type='attempt'", report.user_id, input.attemptId);
      need(attempt && JSON.parse(attempt.payload).questionId === JSON.parse(report.payload).questionId, '该作答不属于报错者及对应题目。');
      const id = randomBytes(18).toString('base64url'); const createdAt = new Date().toISOString();
      const existing = get('SELECT * FROM corrections WHERE report_id=? AND attempt_id=? ORDER BY seq DESC LIMIT 1', input.reportId, input.attemptId);
      if (existing && !!existing.correct === input.correct && existing.reason === input.reason) { json(res, 200, { ok: true, id: existing.id }); return true; }
      atomic(db, () => {
        run('INSERT INTO corrections(id,user_id,attempt_id,correct,reason,report_id,admin_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, report.user_id, input.attemptId, Number(input.correct), input.reason, input.reportId, user.id, createdAt);
        run('UPDATE reports SET status=?,reply=?,updated_at=? WHERE id=?', 'corrected', input.reason, createdAt, input.reportId);
      });
      json(res, 201, { ok: true, id }); return true;
    }
    if (route === '/api/admin/reports' && req.method === 'GET') { json(res, 200, { reports: reportRows() }); return true; }
    if (route.startsWith('/api/admin/reports/') && req.method === 'PATCH') {
      const id = decodeURIComponent(route.slice('/api/admin/reports/'.length)); const input = await body(req);
      need(['processing', 'corrected', 'replied'].includes(input.status) && typeof input.reply === 'string' && input.reply.length <= 5000, '处理状态或回复无效。');
      need(get('SELECT 1 FROM reports WHERE id=?', id), '找不到报错。', 404);
      const now = new Date().toISOString();
      run('UPDATE reports SET status=?,reply=?,updated_at=? WHERE id=?', input.status, input.reply, now, id);
      run('INSERT INTO admin_audit(admin_id,action,payload,created_at) VALUES (?, ?, ?, ?)', user.id, 'report', canonical({ id, ...input }), now);
      json(res, 200, { ok: true }); return true;
    }
    if (route.startsWith('/api/admin/questions/') && req.method === 'POST') {
      const questionId = decodeURIComponent(route.slice('/api/admin/questions/'.length)); const input = await body(req);
      need(text(questionId) && ['withdrawn', 'reviewed'].includes(input.status) && text(input.reason, 5000), '请填写有效的题目状态及修订原因。');
      if (input.revision) need(input.revision.id === questionId && Number.isInteger(input.revision.version) && input.revision.version > 0 && input.revision.source && input.revision.stem && Array.isArray(input.revision.choices) && input.revision.choices.length >= 2 && input.revision.choices.filter(c => c.id === input.revision.answerId).length === 1 && new Set(input.revision.choices.map(c => c.id)).size === input.revision.choices.length && input.revision.choices.every(c => text(c.id) && text(c.text, 5000) && text(c.explanation, 10000)) && text(input.revision.memoryId) && Array.isArray(input.revision.essayIds) && input.revision.essayIds.length > 0 && input.revision.quote && input.revision.explanation && input.revision.status === 'reviewed' && input.revision.active === true, '修订必须提交完整题目与来源快照。');
      if (input.revision) {
        const prior = all('SELECT revision FROM revisions WHERE question_id=? AND revision IS NOT NULL', questionId).map(row => JSON.parse(row.revision).version);
        need(input.revision.version > Math.max((await currentQuestion(questionId))?.version || 0, ...prior), '新版本必须高于当前及历史版本。', 409);
      }
      run('INSERT INTO revisions(question_id,status,revision,reason,admin_id,created_at) VALUES (?, ?, ?, ?, ?, ?)', questionId, input.status, input.revision ? canonical(input.revision) : null, input.reason, user.id, new Date().toISOString());
      const affected = all("SELECT user_id,id,payload FROM events WHERE type='attempt'").filter(row => JSON.parse(row.payload).questionId === questionId).length;
      json(res, 200, { ok: true, affectedAttempts: affected, message: '已保存内容状态；历史答案和评分保持原样，评分修复须另行核对。' }); return true;
    }
    if (route === '/api/admin/invites' && req.method === 'POST') {
      const input = await body(req); need(Number.isInteger(input.uses) && input.uses >= 1 && input.uses <= 100, '邀请次数需为 1–100。');
      const inviteCode = randomBytes(18).toString('base64url');
      run('INSERT INTO invites VALUES (?, ?, ?)', hash(inviteCode), input.uses, new Date().toISOString());
      json(res, 201, { inviteCode, uses: input.uses }); return true;
    }
    return false;
  };
}
