const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = Module.createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const React = require('react');
const { act } = React;
const bible = require('../data/bible.json');
const notes = require('../data/notes.json');

function loadTS(relative) {
  const filename = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = instance.require.bind(instance);
  instance.require = id => id === '@/lib/canon' ? loadTS('../src/lib/canon.ts') : originalRequire(id);
  instance._compile(compiled, filename);
  return instance.exports;
}

test('all note highlights preserve verse text and popups open and close', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const saved = Object.fromEntries(['window','document','navigator','fetch','IS_REACT_ACT_ENVIRONMENT'].map(k => [k,global[k]]));
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = async url => {
    const params = new URL(url, 'http://localhost').searchParams;
    return { json: async () => ({notes: notes.filter(n => n.book === params.get('book') && n.chapter === Number(params.get('chapter'))).map((n,id) => ({...n,id}))}) };
  };
  const { createRoot } = require('react-dom/client');
  const ChapterClient = loadTS('../src/components/ChapterClient.tsx').default;
  const root = createRoot(document.getElementById('root'));
  try {
    const chapters = new Map(notes.map(n => [n.book+':'+n.chapter,n]));
    let count = 0;
    for (const {book,chapter} of chapters.values()) {
      const verses = bible.filter(v => v.book === book && v.chapter === chapter);
      await act(async () => { root.render(React.createElement(ChapterClient,{book,chapter,verses})); });
      for (const verse of verses) assert.equal(document.getElementById('v'+verse.verse).textContent, `${verse.verse} ${verse.text}`);
      const marks = [...document.querySelectorAll('mark')];
      const expected = notes.filter(n => n.book === book && n.chapter === chapter).sort((a,b)=>a.verse-b.verse||a.start-b.start);
      assert.deepEqual(marks.map(m=>m.textContent),expected.map(n=>n.phrase));
      for (const mark of marks) {
        await act(async () => { mark.dispatchEvent(new window.MouseEvent('click',{bubbles:true})); });
        assert(document.querySelector('[role="dialog"]'));
        assert(document.querySelector('.note-popup a[href^="https://www.vatican.va/"]'));
        await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})); });
        assert.equal(document.querySelector('[role="dialog"]'),null);
        count++;
      }
    }
    assert.equal(count,11);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(global,saved);
  }
});
