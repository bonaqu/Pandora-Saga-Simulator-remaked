import path from 'node:path';
import process from 'node:process';
import { startStaticServer } from './lib/legacy-runtime.mjs';

const siteRoot = path.resolve(process.cwd(), process.argv[2] || '_site');
const port = Number(process.env.PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid PORT: ${process.env.PORT}`);

const server = await startStaticServer(siteRoot, { port });
process.stdout.write(`Serving ${siteRoot} at http://127.0.0.1:${port}\n`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
