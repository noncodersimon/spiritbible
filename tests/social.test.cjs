const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const loaded = new Map();
function load(filename) {
  filename = path.resolve(__dirname, filename);
  if (loaded.has(filename)) return loaded.get(filename).exports;
  const m = new Module(filename, module);
  m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename)); loaded.set(filename, m);
  const original = m.require.bind(m);
  m.require = id => {
    const local = id.startsWith('@/') ? path.resolve(__dirname, '../src', id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    return local && fs.existsSync(local + '.ts') ? load(local + '.ts') : original(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
  return m.exports;
}
const { socialPassage, socialMetadata, siteOrigin } = load('../src/lib/social.ts');

test('shared ranges use canonical references and preserve the exact return link', async () => {
  const p = await socialPassage(new URLSearchParams({ ref: 'Jn 1:1-15', start: '3', end: '12', note: '42' }));
  const meta = socialMetadata(p);
  assert.equal(meta.title, 'John 1:1–15 | SpiritBible');
  const image = new URL(meta.openGraph.images[0].url);
  assert.equal(image.origin, siteOrigin);
  assert.equal(image.searchParams.get('ref'), 'John 1:1–15');
  assert.equal(image.searchParams.has('start'), false);
  const link = new URL(meta.openGraph.url);
  assert.equal(link.searchParams.get('start'), '3');
  assert.equal(link.searchParams.get('end'), '12');
  assert.equal(link.searchParams.get('note'), '42');
  assert.equal(meta.twitter.card, 'summary_large_image');
  assert.equal(meta.twitter.images[0].url, image.toString());
});

test('all 73 books, including the deuterocanon, can produce chapter previews', async () => {
  for (const book of require('../src/lib/books.json')) {
    const p = await socialPassage(new URLSearchParams({ ref: `${book.name} 1` }));
    assert.equal(p?.book, book.name);
    assert.equal(socialMetadata(p).title, `${book.name} 1 | SpiritBible`);
  }
});

test('invalid, missing and untrusted references fall back to the general card', async () => {
  for (const ref of ['', '<script>alert(1)</script>', 'John 99', 'John 1:999', 'John 1:1-999', 'John 1:15-1', 'X'.repeat(121)]) {
    const p = await socialPassage(new URLSearchParams({ ref }));
    assert.equal(p, null);
    const meta = socialMetadata(p);
    assert.equal(meta.title, 'SpiritBible');
    assert.equal(meta.openGraph.images[0].url, `${siteOrigin}/share-image?v=3`);
    assert.equal(meta.openGraph.url, `${siteOrigin}/`);
  }
});
