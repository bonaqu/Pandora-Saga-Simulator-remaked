import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// These are the compiler OUTPUTS. modern/service-worker.js is the source
// template; the built, mutable worker lives at the site's root.
const generatedFiles = ['modern/locales.js', 'modern/game-terms.js', 'service-worker.js'];

export async function publishedLocaleFingerprints() {
  return Promise.all(generatedFiles.map(async file => createHash('sha256').update(await fs.readFile(path.resolve('_site', file))).digest('hex')));
}

export async function createPublishedFixture(testInfo) {
  const isolationRoot = path.resolve(testInfo.outputPath('published-fixtures'));
  await fs.mkdir(isolationRoot, { recursive: true });
  const directory = await fs.mkdtemp(path.join(isolationRoot, 'case-'));
  const site = path.join(directory, 'site'), source = path.resolve('_site'), files = [];
  async function cleanup() {
    if (path.dirname(path.resolve(directory)) !== isolationRoot || !path.basename(directory).startsWith('case-')) throw new Error('Unsafe fixture cleanup path');
    await fs.rm(directory, { recursive: true, force: true });
  }
  async function walk(relative) {
    await fs.mkdir(path.join(site, relative), { recursive: true });
    for (const entry of await fs.readdir(path.join(source, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) files.push(child);
      else throw new Error('Unexpected non-file in published fixture: ' + child);
    }
  }
  try {
    await walk('');
    // Only read-only static files are linked. The three compiler outputs must
    // be independent copies. Bounded concurrency avoids the serial cross-disk
    // copy bottleneck without increasing browser timeouts or skipping assets.
    for (let start = 0; start < files.length; start += 16) {
      await Promise.all(files.slice(start, start + 16).map(async relative => {
        const from = path.join(source, relative), to = path.join(site, relative);
        if (generatedFiles.includes(relative.split(path.sep).join('/'))) return fs.copyFile(from, to);
        try { await fs.link(from, to); }
        catch (error) { if (!['EXDEV', 'EPERM', 'ENOTSUP'].includes(error.code)) throw error; await fs.copyFile(from, to); }
      }));
    }
    return { directory, site, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
