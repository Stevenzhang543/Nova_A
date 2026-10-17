// Local preview only. Production deployment consists of ordinary static files.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.argv[2] ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Usage: node preview.mjs [port between 1 and 65535]');
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/nova') {
      res.writeHead(308, { Location: '/nova/' + url.search }).end();
      return;
    }
    // Expose the same package at / and /nova/ to verify both hosting layouts.
    const relative = decodeURIComponent(url.pathname.startsWith('/nova/')
      ? url.pathname.slice('/nova/'.length) : url.pathname.slice(1));
    if (relative.includes('\\') || relative.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(404).end('Not found');
      return;
    }
    let target = resolve(root, relative);
    if (target !== resolve(root) && !target.startsWith(resolve(root) + sep)) {
      res.writeHead(404).end('Not found');
      return;
    }
    const info = await stat(target);
    if (info.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(308, { Location: url.pathname + '/' + url.search }).end();
        return;
      }
      target = resolve(target, 'index.html');
    }
    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': mime[extname(target)] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500;
    res.writeHead(status).end(status === 404 ? 'Not found' : 'Unable to serve file');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Choose another port: node preview.mjs 4174`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Nova page: http://127.0.0.1:${port}/nova/`);
  console.log(`Online editor: http://127.0.0.1:${port}/nova/online/`);
  console.log(`Root hosting preview: http://127.0.0.1:${port}/`);
  console.log('Press Ctrl+C to stop.');
});
