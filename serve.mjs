import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

try {
  execSync('git pull --rebase --quiet', { cwd: __dirname, stdio: 'pipe' });
  console.log('✅ git pull — מסונכרן עם remote');
} catch {
  console.warn('⚠️  git pull נכשל — ממשיך ללא עדכון');
}

const BOT_PATTERNS = [
  /python-requests/i, /python-urllib/i, /urllib/i,
  /curl\//i, /wget\//i, /scrapy/i, /scraperapi/i,
  /BlogBot/i, /Go-http-client/i, /Java\//i, /libwww-perl/i,
  /Axios\//i, /node-fetch/i, /\bgot\b/i, /undici/i,
  /feedfetcher/i, /FeedBurner/i, /facebookexternalhit/i,
  /ia_archiver/i, /HTTrack/i, /MJ12bot/i, /DotBot/i,
  /SemrushBot/i, /AhrefsBot/i, /MajesticSEO/i, /rogerbot/i,
  /SiteAuditBot/i, /YandexBot/i, /Baiduspider/i,
];

function isBot(req) {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  if (!ua || !accept) return true;
  return BOT_PATTERNS.some(p => p.test(ua));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function serve500(res) {
  const page500 = path.join(__dirname, '500.html');
  fs.readFile(page500, (err, data) => {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(err ? 'Internal Server Error' : data);
  });
}

http.createServer((req, res) => {
  try {
    if (isBot(req)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(__dirname, urlPath);
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) {
        const page404 = path.join(__dirname, '404.html');
        fs.readFile(page404, (err2, data2) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(err2 ? 'Not found' : data2);
        });
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  } catch (e) {
    serve500(res);
  }
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
