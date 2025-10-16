import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);

const DEFAULT_PORT = parseInt(process.env.PORT ?? '4173', 10);
const DEFAULT_HOST = process.env.HOST ?? '0.0.0.0';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
};

const normalizePath = (requestPath) => {
  const decodedPath = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decodedPath);
  if (normalized.startsWith('..')) {
    return '/';
  }
  return normalized;
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  let relativePath = normalizePath(req.url);
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/Pages/desktop/home/index.html';
  }

  let filePath = path.join(ROOT_DIR, relativePath);

  try {
    let fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fileStat = await stat(filePath);
    }

    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Content-Length': data.length
    });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    if (process.env.DEBUG) {
      console.error(`[404] ${filePath}:`, error.message);
    }
  }
});

server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
  console.log(`\nRed Remodels test server running on http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  console.log('Home page: /Pages/desktop/home/');
  console.log('Stop the server with CTRL+C.');
});
