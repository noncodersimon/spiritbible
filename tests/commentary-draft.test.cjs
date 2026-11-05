const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const Module=require('node:module');
const ts=require('typescript');
const Database=require('better-sqlite3');
const {JSDOM}=Module.createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const React=require('react');
const {act}=React;
const {validateDraft}=require('../scripts/commentary-draft.cjs');
const {buildData}=require('../scripts/build-data.cjs');
const dir=path.resolve(__dirname,'../drafts/commentary');
const available=fs.existsSync(path.join(dir,'editorial.json'));
const bible=require('../data/bible.json');
const editorial=available?JSON.parse(fs.readFileSync(path.join(dir,'editorial.json'),'utf8')):[];
const notes=available?JSON.parse(fs.readFileSync(path.join(dir,'notes.json'),'utf8')):[];

test('complete commentary draft has valid coverage, citations, anchors and matching import payload',{skip:!available},()=>{
 const checked=validateDraft(editorial);
 assert.equal(new Set(checked.map(n=>n.book)).size,73);
 assert.deepEqual(notes,checked.map(({book,chapter,verse,start,end,phrase,body})=>({book,chapter,verse,start,end,phrase,body})));
});

test('candidate commentary builds a separate database without touching live data',{skip:!available},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'spiritbible-commentary-'));
 const livePath=path.resolve(__dirname,'../data/notes.json'),live=fs.readFileSync(livePath);
 try{
  fs.mkdirSync(path.join(temp,'data'));
  fs.copyFileSync(path.resolve(__dirname,'../data/bible.json'),path.join(temp,'data/bible.json'));
  fs.writeFileSync(path.join(temp,'data/notes.json'),JSON.stringify(notes));
  const result=buildData(temp);assert.equal(result.notes,notes.length);assert.equal(result.verses,bible.length);
  const db=new Database(result.target,{readonly:true});
  try{
   assert.equal(db.pragma('integrity_check',{simple:true}),'ok');
   assert.equal(db.prepare('SELECT count(*) AS n FROM note').get().n,notes.length);
   assert.equal(db.prepare('SELECT count(DISTINCT book) AS n FROM note').get().n,73);
   assert(db.prepare("SELECT count(*) AS n FROM verse_fts WHERE verse_fts MATCH 'resurrection'").get().n>0);
  }finally{db.close();}
  assert.deepEqual(fs.readFileSync(livePath),live);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

function loadTS(relative){
 const filename=path.resolve(__dirname,relative);
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const instance=new Module(filename,module);instance.filename=filename;instance.paths=Module._nodeModulePaths(path.dirname(filename));
 const originalRequire=instance.require.bind(instance);
 instance.require=id=>id==='@/lib/canon'?loadTS('../src/lib/canon.ts'):originalRequire(id);
 instance._compile(compiled,filename);return instance.exports;
}

test('every proposed highlight preserves Bible text and opens its own full note',{skip:!available},async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const globals=['window','document','navigator','fetch','IS_REACT_ACT_ENVIRONMENT'];
 const saved=Object.fromEntries(globals.map(k=>[k,Object.getOwnPropertyDescriptor(global,k)]));
 global.window=dom.window;global.document=dom.window.document;
 Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});global.IS_REACT_ACT_ENVIRONMENT=true;
 const perChapter=new Map();
 for(const [i,n]of notes.entries()){const k=n.book+'|'+n.chapter;if(!perChapter.has(k))perChapter.set(k,[]);perChapter.get(k).push({...n,id:i+1});}
 const verseChapters=new Map();
 for(const v of bible){const k=v.book+'|'+v.chapter;if(!verseChapters.has(k))verseChapters.set(k,[]);verseChapters.get(k).push(v);}
 global.fetch=async url=>{const p=new URL(url,'http://localhost').searchParams;return{json:async()=>({notes:perChapter.get(p.get('book')+'|'+p.get('chapter'))||[]})};};
 const {createRoot}=require('react-dom/client');
 const ChapterClient=loadTS('../src/components/ChapterClient.tsx').default;
 const root=createRoot(document.getElementById('root'));
 let opened=0;
 try{
  for(const [key,expected]of perChapter){
   const {book,chapter}=expected[0],verses=verseChapters.get(key);
   await act(async()=>root.render(React.createElement(ChapterClient,{book,chapter,verses})));
   for(const verse of verses)assert.equal(document.getElementById('v'+verse.verse).textContent,`${verse.verse} ${verse.text}`,`${key}:${verse.verse}`);
   const marks=[...document.querySelectorAll('mark')];
   assert.deepEqual(marks.map(m=>m.textContent),expected.map(n=>n.phrase),key);
   for(const [i,mark]of marks.entries()){
    await act(async()=>mark.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    const popup=document.querySelector('.note-popup');assert(popup,`${key}: missing popup`);
    const want=JSDOM.fragment(expected[i].body);
    assert.equal(popup.textContent,want.textContent,`${key}: wrong note body`);
    assert.deepEqual([...popup.querySelectorAll('a')].map(a=>a.href),[...want.querySelectorAll('a')].map(a=>a.href));
    for(const a of popup.querySelectorAll('a')){assert.equal(a.target,'_blank');assert(a.rel.includes('noopener'));}
    await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})));
    assert.equal(document.querySelector('[role="dialog"]'),null);opened++;
   }
  }
  assert.equal(opened,notes.length);
 }finally{
  await act(async()=>root.unmount());dom.window.close();
  for(const [k,d]of Object.entries(saved)){if(d)Object.defineProperty(global,k,d);else delete global[k];}
 }
});

test('standalone review filters notes and saves content-specific revision comments',{skip:!available},()=>{
 const html=fs.readFileSync(path.join(dir,'review.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://review.invalid/',runScripts:'dangerously'});
 try{
  const d=dom.window.document;
  assert.equal(d.getElementById('title').textContent,editorial[0].title);
  const search=d.getElementById('search');search.value='unlikelywordthatmatchesnothing';search.dispatchEvent(new dom.window.Event('input'));
  assert.equal(d.getElementById('count').textContent,'0 matching notes');assert(d.getElementById('article').classList.contains('hidden'));
  search.value='';search.dispatchEvent(new dom.window.Event('input'));
  const book=d.getElementById('book');book.value='John';book.dispatchEvent(new dom.window.Event('change'));
  assert(d.getElementById('reference').textContent.startsWith('John '));
  const firstJohn=editorial.find(n=>n.book==='John');
  const comment=d.getElementById('comment');comment.value='Check the source wording here.';comment.dispatchEvent(new dom.window.Event('input'));
  d.querySelector('[data-decision="revise"]').click();
  const decisions=JSON.parse(dom.window.localStorage.getItem('spiritbible-commentary-review-v1'));
  assert.equal(decisions[firstJohn.id].decision,'revise');assert.equal(decisions[firstJohn.id].comment,comment.value);assert.match(decisions[firstJohn.id].fingerprint,/^[a-f0-9]{64}$/);
  d.getElementById('next').click();assert.notEqual(d.getElementById('title').textContent,firstJohn.title);
  d.getElementById('prev').click();assert.equal(d.getElementById('comment').value,'Check the source wording here.');
  const kind=d.getElementById('kind');kind.value='revise';kind.dispatchEvent(new dom.window.Event('change'));
  assert.equal(d.getElementById('count').textContent,'1 matching notes');
  d.querySelector('[data-decision="unreviewed"]').click();
  assert.equal(d.getElementById('count').textContent,'0 matching notes');
  assert(d.getElementById('article').classList.contains('hidden'));
  kind.value='unreviewed';kind.dispatchEvent(new dom.window.Event('change'));
  const johnCount=editorial.filter(n=>n.book==='John').length;
  assert.equal(d.getElementById('count').textContent,johnCount+' matching notes');
  d.querySelector('[data-decision="reviewed"]').click();
  assert.equal(d.getElementById('count').textContent,(johnCount-1)+' matching notes');
  assert(!d.getElementById('reference').textContent.includes(firstJohn.id));

 }finally{dom.window.close();}
});
