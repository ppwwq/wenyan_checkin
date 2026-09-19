import http from 'node:http';
import { syncApi } from './sync.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const publicUser = row => ({ id: row.id, username: row.username, role: row.role });
const passwordHash = password => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`; };
const passwordMatches = (password, stored) => {
  const [salt, key] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 32), Buffer.from(key, 'hex'));
};
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (condition, message, status = 400) => { if (!condition) throw new ApiError(status, message); };
const cleanUsername = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validPassword = value => typeof value === 'string' && value.length >= 10 && value.length <= 256;

export function createApp({ databasePath = process.env.DATABASE_PATH || path.join(here, 'data', 'study.sqlite'),
  bootstrapInvite = process.env.BOOTSTRAP_INVITE, adminUsername = process.env.ADMIN_USERNAME, adminInvite = process.env.ADMIN_INVITE,
  publicOrigin = process.env.PUBLIC_ORIGIN, staticRoot = path.resolve(here, '..'),
  sessionDays = 30 } = {}) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, recovery TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, remaining INTEGER NOT NULL, created_at TEXT NOT NULL);
  `);
  if (adminInvite) db.prepare('INSERT OR IGNORE INTO invites VALUES (?, ?, ?)').run(digest(adminInvite), 1, new Date().toISOString());
  if (bootstrapInvite) db.prepare('INSERT OR IGNORE INTO invites VALUES (?, ?, ?)').run(digest(bootstrapInvite), 100, new Date().toISOString());
  const query = (sql, ...args) => db.prepare(sql).get(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const limits = new Map();
  function authenticate(req) {
    const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1];
    need(token, '请先登录。', 401);
    const user = query('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?', digest(token), Date.now());
    need(user, '登录已过期，请重新登录。', 401); return user;
  }
  function session(user) {
    const token = secret();
    run('INSERT INTO sessions VALUES (?, ?, ?)', digest(token), user.id, Date.now() + sessionDays * 86400000);
    return { token, user: publicUser(user) };
  }
  async function body(req) {
    need(req.headers['content-type']?.split(';')[0] === 'application/json', '请求必须使用 JSON。', 415);
    let result = ''; for await (const chunk of req) { result += chunk; need(Buffer.byteLength(result) <= 8_000_000, '请求过大。', 413); }
    try { const value = JSON.parse(result); need(value && typeof value === 'object' && !Array.isArray(value), '无效的 JSON。'); return value; }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, '无效的 JSON。'); }
  }
  function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
  const handleSync = syncApi({ db, need, body, json, currentQuestion: id => { const bankPath = path.join(staticRoot, 'content', 'bank.json'); if (!existsSync(bankPath)) return null; return JSON.parse(readFileSync(bankPath, 'utf8')).questions?.find(q => q.id === id); } });
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      if (route.startsWith('/api/')) {
        if (req.headers.origin) {
          const expectedOrigin = publicOrigin || `http://${req.headers.host}`;
          need(req.headers.origin === expectedOrigin, '不允许跨站请求。', 403);
        }
        if (route === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
        if (route.startsWith('/api/auth/') && req.method === 'POST' && route !== '/api/auth/logout') {
          const address = req.socket.remoteAddress;
          const now = Date.now(); const limit = limits.get(address);
          if (!limit || limit.until < now) limits.set(address, { count: 1, until: now + 60000 });
          else { limit.count++; need(limit.count <= 20, '操作频繁，请稍后再试。', 429); }
          if (limits.size > 10000) for (const [key, value] of limits) if (value.until < now) limits.delete(key);
          const input = await body(req); const username = cleanUsername(input.username);
          need(/^[a-z0-9_\-\u3400-\u9fff]{2,40}$/.test(username), '账号需为 2–40 位文字、数字或下划线。');
          const existing = query('SELECT * FROM users WHERE username=?', username);
          if (route === '/api/auth/register') {
            need(validPassword(input.password), '密码需为 10–256 个字符。');
            need(typeof input.inviteCode === 'string', '请输入邀请码。', 403);
            const invite = query('SELECT * FROM invites WHERE hash=? AND remaining>0', digest(input.inviteCode));
            need(invite, '邀请码无效或已用完。', 403); need(!existing, '该账号已存在。', 409);
            need(!adminInvite || input.inviteCode !== adminInvite || username === cleanUsername(adminUsername), '管理员邀请码仅限指定账号。', 403);
            need(username !== cleanUsername(adminUsername) || (adminInvite && input.inviteCode === adminInvite), '此账号名称已保留。', 403);
            const recoveryCode = secret();
            const user = { id: randomUUID(), username, role: adminInvite && input.inviteCode === adminInvite && username === cleanUsername(adminUsername) ? 'admin' : 'student' };
            db.exec('BEGIN IMMEDIATE');
            try { run('INSERT INTO users VALUES (?, ?, ?, ?, ?)', user.id, username, passwordHash(input.password), digest(recoveryCode), user.role); run('UPDATE invites SET remaining=remaining-1 WHERE hash=?', invite.hash); db.exec('COMMIT'); }
            catch (error) { db.exec('ROLLBACK'); throw error; }
            return json(res, 201, { ...session(user), recoveryCode });
          }
          if (route === '/api/auth/login') {
            need(typeof input.password === 'string' && input.password.length <= 256, '账号或密码不正确。', 401);
            // Perform the same costly operation even if the username does not exist.
            const hash = existing?.password || `00000000000000000000000000000000:${'00'.repeat(32)}`;
            need(passwordMatches(input.password, hash) && existing, '账号或密码不正确。', 401);
            return json(res, 200, session(existing));
          }
          if (route === '/api/auth/recover') {
            need(validPassword(input.newPassword), '新密码需为 10–256 个字符。');
            need(typeof input.recoveryCode === 'string' && existing && digest(input.recoveryCode) === existing.recovery, '账号或恢复码不正确。', 401);
            const recoveryCode = secret();
            db.exec('BEGIN IMMEDIATE');
            try { run('UPDATE users SET password=?,recovery=? WHERE id=?', passwordHash(input.newPassword), digest(recoveryCode), existing.id); run('DELETE FROM sessions WHERE user_id=?', existing.id); db.exec('COMMIT'); }
            catch (error) { db.exec('ROLLBACK'); throw error; }
            return json(res, 200, { ...session(existing), recoveryCode });
          }
          throw new ApiError(404, '接口不存在。');
        }
        const user = authenticate(req);
        if (await handleSync(route, req, res, user)) return;
        if (route === '/api/me' && req.method === 'GET') return json(res, 200, { user: publicUser(user) });
        if (route === '/api/auth/logout' && req.method === 'POST') { run('DELETE FROM sessions WHERE token=?', digest(req.headers.authorization.slice(7))); return json(res, 200, { ok: true }); }
        throw new ApiError(404, '接口不存在。');
      }
      need(req.method === 'GET' || req.method === 'HEAD', '不支持此请求。', 405);
      const relative = path.posix.normalize(decodeURIComponent(route).replaceAll('\\', '/').replace(/^\/+/, '') || 'index.html');
      need(relative === 'index.html' || /^(src|content|assets)\//.test(relative) || ['manifest.webmanifest', 'sw.js', 'icon.svg', 'styles.css'].includes(relative), '文件不存在。', 404);
      const filename = path.resolve(staticRoot, relative);
      need(filename.startsWith(path.resolve(staticRoot) + path.sep) && existsSync(filename) && statSync(filename).isFile(), '文件不存在。', 404);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }[path.extname(filename)] || 'application/octet-stream';
      const size = statSync(filename).size;
      const headers = { 'Content-Type': /^(text\/|application\/(json|manifest\+json))/.test(mime) ? `${mime}; charset=utf-8` : mime, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
      let start = 0, end = size - 1, status = 200;
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        need(range && (range[1] || range[2]), '无效的文件范围。', 416);
        if (!range[1]) start = Math.max(0, size - Number(range[2]));
        else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
        need(start >= 0 && start <= end && start < size, '文件范围超出大小。', 416);
        headers['Content-Range'] = `bytes ${start}-${end}/${size}`; status = 206;
      }
      headers['Content-Length'] = Math.max(0, end - start + 1);
      res.writeHead(status, headers);
      if (req.method === 'HEAD' || !size) return res.end();
      const stream = createReadStream(filename, { start, end });
      stream.on('error', error => res.destroy(error)); stream.pipe(res);
      res.on('close', () => stream.destroy());
    } catch (error) { if (!(error instanceof ApiError)) console.error(error); json(res, error.status || 500, { error: error.status ? error.message : '服务暂时不可用。' }); }
  });
  server.requestTimeout = 30000;
  return { server, close: () => db.close() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp(); const port = Number(process.env.PORT || 8787); const host = process.env.HOST || '127.0.0.1';
  app.server.listen(port, host, () => console.log(`文言学习服务：http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.server.close(() => { app.close(); process.exit(0); }));
}
