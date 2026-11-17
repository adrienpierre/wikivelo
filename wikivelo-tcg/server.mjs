import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { buildBundle } from './build.mjs';

const ROOT_DIR = path.resolve(import.meta.dirname || '.');
const PORT = Number(process.env.PORT || 5173);

buildBundle();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://upload.wikimedia.org https://thumb.wikimedia.org; connect-src 'self' https://fr.wikipedia.org https://commons.wikimedia.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Method Not Allowed');
    return;
  }

  let decodedPath = '/';
  try {
    decodedPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }

  const normalizedRel = decodedPath.replace(/^\/+/, '').replace(/\\/g, '/');
  let filePath =
    decodedPath === '/'
      ? path.resolve(ROOT_DIR, 'index.html')
      : path.resolve(ROOT_DIR, normalizedRel);

  if (filePath !== ROOT_DIR && !filePath.startsWith(ROOT_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Forbidden');
    return;
  }

  if (
    normalizedRel.startsWith('src/') ||
    normalizedRel.startsWith('scripts/') ||
    normalizedRel === 'server.mjs' ||
    normalizedRel === 'build.mjs' ||
    normalizedRel === 'package.json' ||
    normalizedRel === 'tsconfig.json' ||
    normalizedRel === 'vercel.json' ||
    normalizedRel === 'netlify.toml'
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
      ...SECURITY_HEADERS
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`VeloLegends TCG server running at http://localhost:${PORT}`);
});
