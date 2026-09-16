/**
 * Render every social page from the built dist/ output and save
 * deterministic PNGs to social/output/, each at its own exact viewport
 * (Instagram posts: 1080x1350; X posts: 1600x900). Serves dist/ over a plain
 * local static server (not vite preview) so the export never depends on a
 * dev-server transform pipeline, then drives each page with Playwright,
 * waits for fonts + data + render to finish, and takes one full-viewport
 * screenshot per page. Run `npm run build` first (or via `npm run export`,
 * which does so automatically). An optional CLI arg ("instagram" or "x")
 * restricts the run to output filenames starting with that prefix - see
 * the export/export:instagram/export:x scripts in package.json.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const outputDir = fileURLToPath(new URL('../output/', import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

// Vite's multi-page build preserves each HTML input's original path under
// dist/ (the rollupOptions.input keys only name build chunks), so these
// match instagram/post-*/index.html and x/post-*/index.html exactly.
const INSTAGRAM_VIEWPORT = { width: 1080, height: 1350 };
const X_VIEWPORT = { width: 1600, height: 900 };

const POSTS = [
  { path: '/instagram/post-01-temporal/index.html', output: 'instagram-01-temporal.png', viewport: INSTAGRAM_VIEWPORT },
  { path: '/instagram/post-02-actors/index.html', output: 'instagram-02-actors.png', viewport: INSTAGRAM_VIEWPORT },
  { path: '/x/post-01-before-after/index.html', output: 'x-01-before-after.png', viewport: X_VIEWPORT },
  { path: '/x/post-02-geography/index.html', output: 'x-02-geography.png', viewport: X_VIEWPORT },
];

function serveDist() {
  return new Promise((resolveReady, rejectReady) => {
    const server = createServer(async (req, res) => {
      try {
        const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
        const filePath = join(distDir, safePath);
        const info = await stat(filePath);
        if (!info.isFile()) throw new Error('not a file');
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });
    server.on('error', rejectReady);
    server.listen(0, '127.0.0.1', () => resolveReady(server));
  });
}

async function exportPost(browser, baseUrl, post) {
  const page = await browser.newPage({ viewport: post.viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => console.error(`[${post.path}] page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[${post.path}] console error: ${message.text()}`);
  });

  await page.goto(`${baseUrl}${post.path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('body[data-render-state]', { timeout: 20000 });

  const state = await page.getAttribute('body', 'data-render-state');
  if (state !== 'ready') {
    throw new Error(`${post.path} failed to render (data-render-state="${state}")`);
  }

  const outputPath = join(outputDir, post.output);
  await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, ...post.viewport } });
  await page.close();
  console.log(`Exported ${post.output}`);
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error(`Missing build output at ${distDir} - run "npm run build" first`);
  }
  const prefix = process.argv[2];
  const posts = prefix ? POSTS.filter((post) => post.output.startsWith(prefix)) : POSTS;
  if (posts.length === 0) {
    throw new Error(`No registered posts match prefix "${prefix}"`);
  }
  await mkdir(outputDir, { recursive: true });

  const server = await serveDist();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  try {
    for (const post of posts) {
      await exportPost(browser, baseUrl, post);
    }
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }

  console.log(`Exported ${posts.length} social graphic(s) to ${outputDir}`);
}

try {
  await main();
} catch (error) {
  console.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
