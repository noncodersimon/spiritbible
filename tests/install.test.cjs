const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act}=React;
const {JSDOM}=Module.createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
function load(file){
 const filename=path.resolve(__dirname,file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const original=m.require.bind(m);
 m.require=id=>{if(id.startsWith('.'))for(const ext of ['.tsx','.ts']){const p=path.resolve(path.dirname(filename),id+ext);if(fs.existsSync(p))return load(p);}return original(id);};
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);return m.exports;
}
async function withDOM(options,run){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://spirit.digitelos.co.uk'}),keys=['window','document','navigator','localStorage','IS_REACT_ACT_ENVIRONMENT'];
 const saved=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(global,k)]));
 for(const k of keys.slice(0,4))Object.defineProperty(global,k,{value:k==='window'?dom.window:dom.window[k],writable:true,configurable:true});global.IS_REACT_ACT_ENVIRONMENT=true;
 for(const [key,value]of Object.entries({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36',platform:'Win32',maxTouchPoints:0,...options.navigator}))Object.defineProperty(navigator,key,{value,configurable:true});
 const listeners=new Set(),media={matches:options.standalone||false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};window.matchMedia=()=>media;
 if(options.remembered)localStorage.setItem('spiritbible:installed','1');
 if(options.blocked)Object.defineProperty(global,'localStorage',{get(){throw Error('Storage blocked');},configurable:true});
 const root=require('react-dom/client').createRoot(document.getElementById('root'));
 try{await act(async()=>root.render(React.createElement(load('../src/components/InstallButton.tsx').default)));await run({dom,root,media,listeners});}
 finally{await act(async()=>root.unmount());dom.window.close();for(const [k,d]of Object.entries(saved)){if(d)Object.defineProperty(global,k,d);else delete global[k];}}
}
const click=async e=>act(async()=>e.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
function offer(outcome='dismissed',fails=false){const event=new window.Event('beforeinstallprompt',{cancelable:true});let calls=0;event.prompt=async()=>{calls++;if(fails)throw Error('Unavailable');};event.userChoice=Promise.resolve({outcome});window.dispatchEvent(event);return{event,calls:()=>calls};}

test('Windows fallback provides a real shortcut, keeps the button until confirmed, and restores dialog focus',async()=>withDOM({},async()=>{
 const button=document.querySelector('.install-trigger');assert.match(button.textContent,/Add to Desktop/);button.focus();await click(button);
 assert.equal(document.activeElement,document.querySelector('[role="dialog"]'));const download=document.querySelector('.install-download');assert.equal(download.getAttribute('href'),'/SpiritBible.url');assert.equal(download.download,'SpiritBible.url');
 await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.equal(document.activeElement,button);assert(document.querySelector('.install-trigger'));
 await click(button);await click(document.querySelector('.install-confirm'));assert.equal(localStorage.getItem('spiritbible:installed'),'1');assert.equal(document.querySelector('.install-trigger'),null);
 const shortcut=fs.readFileSync(path.resolve(__dirname,'../public/SpiritBible.url'),'utf8');assert.equal(shortcut,'[InternetShortcut]\r\nURL=https://spirit.digitelos.co.uk/\r\n');
}));
test('native install is invoked only by the button; dismissal stays visible and completion is remembered',async()=>withDOM({},async()=>{
 const first=offer();assert(first.event.defaultPrevented);assert.equal(first.calls(),0);await click(document.querySelector('.install-trigger'));assert.equal(first.calls(),1);assert(document.querySelector('.install-trigger'));assert.equal(localStorage.getItem('spiritbible:installed'),null);
 const second=offer('accepted');await click(document.querySelector('.install-trigger'));assert.equal(second.calls(),1);await act(async()=>window.dispatchEvent(new window.Event('appinstalled')));assert.equal(document.querySelector('.install-trigger'),null);assert.equal(localStorage.getItem('spiritbible:installed'),'1');
}));
test('native prompt failures fall back to instructions without hiding or disabling the button',async()=>withDOM({},async()=>{
 offer('dismissed',true);await click(document.querySelector('.install-trigger'));assert(document.querySelector('[role="dialog"]'));assert.equal(document.querySelector('.install-trigger').disabled,false);assert.equal(localStorage.getItem('spiritbible:installed'),null);
}));
test('iPhone and desktop-UA iPad offer Safari Home Screen instructions rather than a false automatic install',async()=>{
 for(const nav of [{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1',platform:'iPhone'}, {userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1',platform:'MacIntel',maxTouchPoints:5}])await withDOM({navigator:nav},async()=>{
  assert.match(document.querySelector('.install-trigger').textContent,/Add to Home Screen/);await click(document.querySelector('.install-trigger'));assert.match(document.querySelector('[role="dialog"]').textContent,/Share/);assert.match(document.querySelector('[role="dialog"]').textContent,/Open as Web App/);assert.equal(document.querySelector('.install-download'),null);
 });
});
test('Android provides Home Screen guidance and blocked storage does not break confirmation',async()=>withDOM({blocked:true,navigator:{userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/130 Mobile Safari/537.36',platform:'Linux armv8l'}},async()=>{
 assert.match(document.querySelector('.install-trigger').textContent,/Add to Home Screen/);await click(document.querySelector('.install-trigger'));assert.match(document.querySelector('[role="dialog"]').textContent,/browser’s menu/);await click(document.querySelector('.install-confirm'));assert.equal(document.querySelector('.install-trigger'),null);
}));
test('remembered, standalone and iOS standalone installations hide the control',async()=>{
 for(const options of [{remembered:true},{standalone:true},{navigator:{standalone:true}}])await withDOM(options,async()=>assert.equal(document.querySelector('.install-trigger'),null));
 await withDOM({},async({media,listeners})=>{await act(async()=>{media.matches=true;listeners.forEach(fn=>fn());});assert.equal(document.querySelector('.install-trigger'),null);});
});
test('service worker caches only its offline explanation and leaves live content and APIs uncached',async()=>{
 const handlers={},added=[],deleted=[],online={body:'fresh chapter'},offline={body:'offline help'};let fail=false,claimed=0;
 const cache={add:async url=>added.push(url),match:async url=>url==='/offline.html'?offline:undefined};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../public/sw.js'),'utf8'),{self:{addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>claimed++}},caches:{open:async()=>cache,keys:async()=>['spiritbible-install-v0','other-cache'],delete:async key=>deleted.push(key)},fetch:async()=>{if(fail)throw Error('Offline');return online;},Response});
 let work;handlers.install({waitUntil:p=>work=p});await work;assert.deepEqual(added,['/offline.html']);handlers.activate({waitUntil:p=>work=p});await work;assert.deepEqual(deleted,['spiritbible-install-v0']);assert.equal(claimed,1);
 let response;handlers.fetch({request:{mode:'cors',url:'/api/notes'},respondWith:p=>response=p});assert.equal(response,undefined);
 handlers.fetch({request:{mode:'navigate'},respondWith:p=>response=p});assert.equal(await response,online);assert.deepEqual(added,['/offline.html']);
 fail=true;handlers.fetch({request:{mode:'navigate'},respondWith:p=>response=p});assert.equal(await response,offline);
});
