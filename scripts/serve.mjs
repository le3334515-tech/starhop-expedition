import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const lan = process.argv.includes('--lan');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
const openBrowser = () => {
  if (process.argv.includes('--open') && process.platform === 'win32') execFile('rundll32.exe', ['url.dll,FileProtocolHandler', `http://localhost:${port}`], { windowsHide: true }, () => {});
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(p => p.startsWith('.'))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400).end('Unable to load file');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Open http://localhost:${port} or set PORT to another port.` : error.message);
  if (error.code === 'EADDRINUSE') openBrowser();
  process.exitCode = 1;
});
server.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`STARHOP: http://localhost:${port}\nKeep this window open while playing. Press Ctrl+C to stop.`);
  if (lan) for (const [name, addresses] of Object.entries(networkInterfaces())) for (const address of addresses || []) {
    if (!address.internal && address.family === 'IPv4') console.log(`${name}: http://${address.address}:${port} (phone on the same Wi-Fi)`);
  }
  openBrowser();
});
