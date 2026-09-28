import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function startStaticServer(siteRoot) {
  const root = path.resolve(siteRoot);
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
      const target = path.resolve(root, relative);
      if (target !== root && !target.startsWith(root + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      const body = await fs.readFile(file);
      response.writeHead(200, { 'content-type': contentTypes[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

export async function withLegacyRuntime(siteRoot, callback) {
  const root = path.resolve(siteRoot);
  await fs.access(path.join(root, 'index.html'));
  const server = await startStaticServer(root);
  const address = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    return await callback(page);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
