const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
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
  instance.require = id => {
   if (id.startsWith('@/')) { const p = '../src/' + id.slice(2); return loadTS(p + (fs.existsSync(path.resolve(__dirname,p+'.tsx')) ? '.tsx' : '.ts')); }
   if (id.startsWith('.') && fs.existsSync(path.resolve(path.dirname(filename),id+'.ts'))) return loadTS(path.relative(__dirname,path.resolve(path.dirname(filename),id+'.ts')));
   return originalRequire(id);
 };
  instance._compile(compiled, filename);
  return instance.exports;
}

test('all note highlights preserve verse text and popups open and close', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const saved = Object.fromEntries(['window','document','navigator','fetch','IS_REACT_ACT_ENVIRONMENT'].map(k => [k,Object.getOwnPropertyDescriptor(global,k)]));
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
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
      for (const [i, mark] of marks.entries()) {
        await act(async () => { mark.dispatchEvent(new window.MouseEvent('click',{bubbles:true})); });
        assert(document.querySelector('[role="dialog"]'));
        const popup = document.querySelector('.note-popup');
        const expectedBody = JSDOM.fragment(expected[i].body);
        assert.equal(popup.textContent,expectedBody.textContent);
        assert.deepEqual([...popup.querySelectorAll('a')].map(a=>a.href),[...expectedBody.querySelectorAll('a')].map(a=>a.href));
        await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})); });
        assert.equal(document.querySelector('[role="dialog"]'),null);
        count++;
      }
    }
    assert.equal(count,notes.length);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(global,key,descriptor);
      else delete global[key];
    }
  }
});
