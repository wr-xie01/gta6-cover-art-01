// Neon Coast Cover Studio — a tiny static server for trying the app locally:
//   node serve.ts            (serves app/ on http://localhost:8080)
//   node serve.ts --port 9000
// Development convenience only: it serves files under app/ and nothing else,
// and refuses any path that escapes the folder.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const wanted = portArg === -1 ? 8080 : Number(args[portArg + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const target = resolve(join(root, normalize(path).replace(/^(\.\.[/\\])+/, '')));
  if (!target.startsWith(root + sep) && target !== root) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const file = target === root ? join(root, 'index.html') : target;
  let info;
  try {
    info = statSync(file);
  } catch {
    info = null;
  }
  if (!info || !info.isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Content-Length': info.size,
  });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Neon Coast Cover Studio at http://localhost:${port} — open it and add a photo.`);
});
