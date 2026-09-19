import http from 'node:http';
import { createApi } from './api.mjs';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
const here = path.dirname(fileURLToPath(import.meta.url));
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (condition, message, status = 400) => { if (!condition) throw new ApiError(status, message); };

export function createApp({ databasePath = process.env.DATABASE_PATH || path.join(here, 'data', 'study.sqlite'),
  bootstrapInvite = process.env.BOOTSTRAP_INVITE, adminUsername = process.env.ADMIN_USERNAME, adminInvite = process.env.ADMIN_INVITE,
  publicOrigin = process.env.PUBLIC_ORIGIN, staticRoot = path.resolve(here, '..'),
  sessionDays = 30 } = {}) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const handleApi = createApi({db,bootstrapInvite,adminUsername,adminInvite,publicOrigin,sessionDays,currentQuestion:id=>{const bankPath=path.join(staticRoot,'content','bank.json');if(!existsSync(bankPath))return null;return JSON.parse(readFileSync(bankPath,'utf8')).questions?.find(q=>q.id===id);}});
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      if (route.startsWith('/api/')) return await handleApi(route,req,res);
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
    } catch (error) { if (!error.status) console.error(error); json(res, error.status || 500, { error: error.status ? error.message : '服务暂时不可用。' }); }
  });
  server.requestTimeout = 30000;
  return { server, close: () => db.close() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp(); const port = Number(process.env.PORT || 8787); const host = process.env.HOST || '127.0.0.1';
  app.server.listen(port, host, () => console.log(`文言学习服务：http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.server.close(() => { app.close(); process.exit(0); }));
}
