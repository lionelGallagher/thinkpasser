import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const allowed = new Map([
  ['/', ['browser/index.html', 'text/html; charset=utf-8']],
  ['/browser.mjs', ['browser/browser.mjs', 'text/javascript; charset=utf-8']],
  ['/protocol.mjs', ['protocol.mjs', 'text/javascript; charset=utf-8']],
  ['/fixtures/synthetic-video.rdtcp', ['fixtures/synthetic-video.rdtcp', 'application/octet-stream']],
]);
const port = Number(process.env.WEB_REMOTE_FIXTURE_PORT || 4187);
const server = createServer(async (request, response) => {
  const entry = allowed.get(request.url);
  if (request.method !== 'GET' || !entry) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(new URL(entry[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'",
      'Permissions-Policy': 'camera=(), microphone=(), display-capture=()' });
    response.end(body);
  } catch { response.writeHead(500).end('Fixture missing; see README.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Synthetic-only protocol harness: http://127.0.0.1:${port}`));
