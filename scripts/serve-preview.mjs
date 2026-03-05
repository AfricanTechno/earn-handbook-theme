import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function safePath(target) {
  const resolved = normalize(target).replace(/^\/+/, '');
  if (!resolved || resolved.startsWith('..')) {
    return null;
  }
  return join(ROOT, resolved);
}

function resolveFile(urlPath) {
  if (urlPath === '/' || urlPath === '/preview' || urlPath === '/preview/') {
    return safePath('preview/index.html');
  }

  if (urlPath.startsWith('/theme/')) {
    return safePath(urlPath.slice('/theme/'.length));
  }

  if (urlPath.startsWith('/preview/')) {
    return safePath(urlPath.slice(1));
  }

  return null;
}

createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const filePath = resolveFile(url.pathname);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(filePath).pipe(response);
}).listen(PORT, '127.0.0.1', () => {
  console.log('Preview server running at http://127.0.0.1:' + PORT + '/preview/index.html');
});
