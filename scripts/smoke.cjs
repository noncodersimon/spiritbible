const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium, request } = require('playwright');

const live = Boolean(process.env.SMOKE_BASE_URL);
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3107';
const directory = path.join('.maintenance', live ? 'live-smoke' : 'candidate-smoke');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  fs.mkdirSync(directory, { recursive: true });
  let server, log, browser, api, page;
  const errors = [], checks = [];
  try {
    if (!live) {
      log = fs.openSync(path.join(directory, 'server.log'), 'w');
      server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3107'], { stdio: ['ignore', log, log] });
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (server.exitCode !== null) throw new Error('The production server exited before becoming ready.');
        try { const response = await fetch(base, { signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break; } } catch {}
        await pause(1000);
      }
      assert(ready, 'The production server did not become ready.');
    }
    api = await request.newContext({ timeout: 30000, ...(live && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    page = await desktop.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?ref=John+1%3A1-3`, { waitUntil: 'networkidle' });
    await page.locator('#v3 .passage-highlight').first().waitFor();
    await page.getByRole('heading', { name: 'John 1', exact: true }).waitFor();
    checks.push('Passage links and range highlighting');

    await page.getByRole('button', { name: 'Copy chapter + link', exact: true }).click();
    const copy = await page.evaluate(() => navigator.clipboard.readText());
    assert(copy.includes('John 1:1–51'));
    assert(copy.includes(`${base}/?ref=`));
    assert(!copy.includes('World English Bible'));
    checks.push('Copy chapter and return link');

    await page.locator('.commentary-mark').first().click();
    await page.getByRole('dialog').waitFor();
    assert((await page.locator('.note-popup').innerText()).length > 30);
    assert(await page.locator('.note-popup a[href^="https://"]').count());
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('.connection-marker').first().click();
    await page.getByRole('dialog', { name: 'Related passages' }).waitFor();
    assert(await page.locator('.passage-links a').count());
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    checks.push('Commentary and related-passage popups');

    const search = page.getByRole('searchbox', { name: 'Search the Bible' });
    await search.fill('Mt12:30'); await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.locator('#v30 .passage-highlight').first().waitFor();
    await search.fill('resurrection'); await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('heading', { name: /^Results/ }).waitFor();
    await page.getByRole('button', { name: /^Open / }).first().click();
    await page.locator('[data-verse-text]').first().waitFor();
    checks.push('Abbreviated references and word-search results');

    const booksResponse = await api.get(`${base}/api/books`); assert.equal(booksResponse.status(), 200);
    const books = await booksResponse.json(); assert.equal(books.ot.length + books.nt.length, 73);
    const notesSearch = await api.get(`${base}/api/search?scope=commentary&q=resurrection`); assert.equal(notesSearch.status(), 200);
    assert((await notesSearch.json()).results.length > 0);
    checks.push('Catholic canon and commentary search');

    const response = await api.get(`${base}/?ref=Matthew+12%3A30&start=0&end=82`, { headers: { 'User-Agent': 'Twitterbot/1.0' } });
    assert.equal(response.status(), 200);
    const html = await response.text(), head = html.split('</head>')[0];
    assert(head.includes('name="twitter:card" content="summary_large_image"'));
    const imageSource = head.match(/property="og:image" content="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    assert(imageSource, 'The crawler did not receive an image URL.');
    const imageURL = new URL(imageSource);
    assert.equal(imageURL.searchParams.get('ref'), 'Matthew 12:30');
    const image = await api.get(base + imageURL.pathname + imageURL.search); assert.equal(image.status(), 200);
    const png = await image.body(); assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
    const manifestResponse = await api.get(`${base}/manifest.webmanifest`); assert.equal(manifestResponse.status(), 200);
    assert.equal((await manifestResponse.json()).display, 'standalone');
    checks.push('Crawler-visible social card, PNG proportions and install manifest');

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page = await mobile.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?ref=John1`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'John 1', exact: true }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const theme = page.locator('.theme-trigger'), menu = page.getByRole('menu', { name: 'Colour theme' });
    for (let i = 0; i < 2; i++) { await theme.tap(); await menu.waitFor(); await theme.tap(); await menu.waitFor({ state: 'detached' }); }
    await theme.tap(); await page.getByRole('menuitemradio', { name: 'Dark' }).tap();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.deepEqual(errors, []);
    checks.push('Phone layout, repeated theme taps, saved preference and no browser errors');
    fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ base, ok: true, checks }, null, 2));
    console.log(checks.map(check => `✓ ${check}`).join('\n'));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(directory, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ base, ok: false, checks, error: error.message, browserErrors: errors }, null, 2));
    throw error;
  } finally {
    await browser?.close(); await api?.dispose();
    if (server) server.kill('SIGTERM');
    if (log !== undefined) fs.closeSync(log);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
