const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = Module.createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const React = require('react');
const { act } = React;

function loadTS(relative) {
  const filename = path.resolve(__dirname, relative);
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = instance.require.bind(instance);
  instance.require = id => {
    if (id.startsWith('@/')) {
      const candidate = '../src/' + id.slice(2);
      return loadTS(candidate + (fs.existsSync(path.resolve(__dirname, candidate + '.tsx')) ? '.tsx' : '.ts'));
    }
    if (id.startsWith('.') && fs.existsSync(path.resolve(path.dirname(filename), id + '.ts'))) return loadTS(path.relative(__dirname, path.resolve(path.dirname(filename), id + '.ts')));
    return originalRequire(id);
  };
  instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return instance.exports;
}

async function withDOM(run) {
  const dom = new JSDOM('<div id="root"></div><button id="after">After</button>', { url: 'http://localhost' });
  const keys = ['window', 'document', 'navigator', 'localStorage', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(global, key)]));
  for (const key of ['window', 'document', 'navigator', 'localStorage']) Object.defineProperty(global, key, { value: key === 'window' ? dom.window : dom.window[key], configurable: true, writable: true });
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const root = require('react-dom/client').createRoot(document.getElementById('root'));
  try { await run({ root, dom }); }
  finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(global, key, descriptor);
      else delete global[key];
    }
  }
}
const click = async element => { await act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
const key = async (element, value) => { await act(async () => element.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true }))); };

test('early theme script resolves overrides before hydration, including blocked storage', () => {
  const layout = fs.readFileSync(path.resolve(__dirname, '../src/app/layout.tsx'), 'utf8');
  const script = layout.match(/__html: `([^`]+)`/)[1];
  for (const [stored, systemDark, expected, blocked] of [
    ['light', true, 'light'], ['dark', false, 'dark'], ['system', true, 'dark'], ['invalid', false, 'light'], [null, true, 'dark', true],
  ]) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(script, {
      document, window: { matchMedia: () => ({ matches: systemDark }) },
      localStorage: { getItem() { if (blocked) throw Error('Blocked'); return stored; } },
    });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
});

test('theme menu persists choices, follows system only in System mode, and restores keyboard focus', async () => withDOM(async ({ root }) => {
  const listeners = new Set();
  const media = { matches: true, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) };
  window.matchMedia = () => media;
  const ThemeToggle = loadTS('../src/components/ThemeToggle.tsx').default;
  await act(async () => root.render(React.createElement(ThemeToggle)));
  assert.equal(document.documentElement.dataset.theme, 'dark');
  const trigger = document.querySelector('.theme-trigger');
  await key(trigger, 'ArrowDown');
  assert.equal(document.activeElement.textContent, 'System✓');
  await key(document.activeElement, 'ArrowDown');
  assert.equal(document.activeElement.textContent, 'Light');
  await click(document.activeElement);
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(localStorage.getItem('spiritbible-theme'), 'light');
  assert.equal(document.activeElement, trigger);
  await act(async () => { media.matches = true; listeners.forEach(listener => listener()); });
  assert.equal(document.documentElement.dataset.theme, 'light');
  await click(trigger);
  await key(document.activeElement, 'End');
  assert.equal(document.activeElement.textContent, 'Dark');
  await key(document.activeElement, 'Escape');
  assert.equal(document.activeElement, trigger);
  assert.equal(document.querySelector('[role="menu"]'), null);
  await click(trigger);
  await key(document.activeElement, 'Home');
  await click(document.activeElement);
  assert.equal(document.documentElement.dataset.theme, 'dark');
  await act(async () => { media.matches = false; listeners.forEach(listener => listener()); });
  assert.equal(document.documentElement.dataset.theme, 'light');
  await click(trigger);
  await key(document.activeElement, 'End');
  Object.defineProperty(global, 'localStorage', { get() { throw Error('Storage blocked'); }, configurable: true });
  await click(document.activeElement);
  assert.equal(document.documentElement.dataset.theme, 'dark');
  await act(async () => root.unmount());
  assert.equal(listeners.size, 0);
  const secondRoot = require('react-dom/client').createRoot(document.getElementById('root'));
  await act(async () => secondRoot.render(React.createElement(ThemeToggle)));
  assert.equal(document.documentElement.dataset.theme, 'dark', 'blocked storage preserves the early preference');
  await act(async () => secondRoot.unmount());
}));

test('note and connection importance preserves verse text and mixed markers prioritise fundamental', async () => withDOM(async ({ root }) => {
  const verses = [{ book: 'John', chapter: 1, verse: 1, text: 'In the beginning was the Word.' }];
  const notes = [
    { id: 1, book: 'John', chapter: 1, verse: 1, phrase: 'beginning', start: 7, end: 15, body: '<p>First note.</p>', significance: 'interest' },
    { id: 2, book: 'John', chapter: 1, verse: 1, phrase: 'Word', start: 25, end: 28, body: '<p>Second note.</p>' },
  ];
  const connections = ['interest', 'fundamental'].map((significance, index) => ({ id: 'c' + index, significance, title: 'Connection ' + index, kind: 'theme', summary: 'Summary', passages: [{ book: 'John', chapter: 1, verse: 1, label: 'Opening' }], sources: [] }));
  global.fetch = async url => ({ ok: true, json: async () => url.startsWith('/api/notes') ? { notes } : { connections } });
  const ChapterClient = loadTS('../src/components/ChapterClient.tsx').default;
  await act(async () => root.render(React.createElement(ChapterClient, { book: 'John', chapter: 1, verses })));
  assert.equal(document.querySelector('[data-verse-text]').textContent, verses[0].text);
  const marks = [...document.querySelectorAll('mark')];
  assert(marks[0].classList.contains('significance-interest'));
  assert(marks[1].classList.contains('significance-fundamental'), 'old notes default to fundamental');
  assert.match(marks[0].getAttribute('aria-label'), /Of interest commentary/);
  marks[0].focus();
  await click(marks[0]);
  assert.equal(document.activeElement, document.querySelector('[role="dialog"]'));
  assert.equal(document.querySelector('.note-significance').textContent, 'Of interest commentary');
  assert.equal(document.querySelector('.note-popup').textContent, 'First note.');
  await key(window, 'Escape');
  assert.equal(document.activeElement, marks[0], 'closing commentary restores the invoking marker');
  const marker = document.querySelector('.connection-marker');
  assert(marker.classList.contains('significance-fundamental'));
  assert.match(marker.getAttribute('aria-label'), /includes fundamental/);
  marker.focus();
  await click(marker);
  assert.equal(document.activeElement, document.querySelector('[role="dialog"]'));
  assert.equal(document.querySelectorAll('.connection-card').length, 2);
  assert.match(document.querySelector('.connection-card.significance-interest .connection-kind').textContent, /Of interest/);
  assert.match(document.querySelector('.connection-card.significance-fundamental .connection-kind').textContent, /Fundamental/);
  assert.equal(document.querySelector('.passage-links a').getAttribute('href'), '/?ref=John+1%3A1');
  await key(window, 'Escape');
  assert.equal(document.activeElement, marker, 'closing related passages restores the invoking marker');
}));
