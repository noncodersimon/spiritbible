const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const {JSDOM}=Module.createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
function load(filename){
 filename=path.resolve(__dirname,filename);
 const instance=new Module(filename,module);instance.filename=filename;instance.paths=Module._nodeModulePaths(path.dirname(filename));
 const original=instance.require.bind(instance);
 instance.require=id=>id.startsWith('.')&&fs.existsSync(path.resolve(path.dirname(filename),id+'.ts'))?load(path.resolve(path.dirname(filename),id+'.ts')):original(id);
 instance._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
 return instance.exports;
}
const {passageHref,readPassage,selectedPassage,copyText}=load('../src/lib/passage.ts');
test('share links round-trip Catholic references, precise selection offsets and study targets',()=>{
 const p={book:'2 Maccabees',chapter:7,verse:2,endVerse:4,start:10,end:25,connection:'resurrection-hope'};
 assert.deepEqual(readPassage(passageHref(p).slice(2)),p);
 assert.equal(readPassage('?ref=NotAbook+1'),null);
 assert.equal(readPassage('?ref=John+900'),null);
 assert.equal(readPassage('?ref=John+3%3A16&start=-1&end=3').start,undefined);
 assert.equal(readPassage('?ref=John+3%3A16&start=9&end=2').start,undefined);
 assert.equal(readPassage('?ref=John+3%3A16&connection=%3Cscript%3E').connection,undefined);
 const copied=copyText('For God so loved the world.',{book:'John',chapter:3,verse:16},'https://spirit.digitelos.co.uk');
 assert.ok(copied.startsWith('“For God so loved the world.”\n\nJohn 3:16'));
 assert.ok(!copied.includes('World English Bible'));
 assert.ok(copied.includes('https://spirit.digitelos.co.uk/?ref=John+3%3A16'));
});
test('copied passages reuse boundary quotes and distinguish speech within a longer quotation',()=>{
 const cases=[
  ['“He who is not with me is against me, and he who doesn’t gather with me, scatters.', '“He who is not with me is against me, and he who doesn’t gather with me, scatters.”'],
  ['For by your words you will be justified, and by your words you will be condemned.”','“For by your words you will be justified, and by your words you will be condemned.”'],
  ['“Already quoted.”','“Already quoted.”'],
  ['"Straight quotation','"Straight quotation"'],
  ['Straight quotation"','"Straight quotation"'],
  ['"Already quoted."','"Already quoted."'],
  ['Then they said, “Teacher, we want to see a sign.”','‘Then they said, “Teacher, we want to see a sign.”’'],
  ['“One.” He answered, “Two.”','‘“One.” He answered, “Two.”’'],
  ['He answered, “Come with me.','‘He answered, “Come with me.”’'],
  ['Come with me,” he answered.','‘“Come with me,” he answered.’'],
  ['‘Don’t be afraid.’','‘Don’t be afraid.’'],
  ['Jesus’ disciples','“Jesus’ disciples”'],
  ['  First line.\nSecond line.  ','“First line.\nSecond line.”'],
 ];
 for(const [input,expected] of cases) assert.equal(copyText(input,{book:'Matthew',chapter:12,verse:30},'https://spirit.digitelos.co.uk').split('\n\n')[0],expected);
});
test('copying across commentary markup and verse controls uses only selected Bible words',()=>{
 const dom=new JSDOM('<p id="outside">Elsewhere</p><div id="reader"><p><sup>1</sup> <span data-verse-text="1">In the <mark>beginning</mark> was the Word.</span><button>↔</button></p><p><sup>2</sup> <span data-verse-text="2">He was with God.</span></p></div>');
 const saved=global.document;global.document=dom.window.document;
 try{
  const doc=global.document,root=doc.getElementById('reader'),spans=root.querySelectorAll('[data-verse-text]'),sel=dom.window.getSelection();
  const range=doc.createRange();range.setStart(spans[0].querySelector('mark').firstChild,0);range.setEnd(spans[1].firstChild,6);sel.addRange(range);
  const copied=selectedPassage(root,sel,'John',1);
  assert.equal(copied.text,'beginning was the Word.\nHe was');
  assert.deepEqual(copied.target,{book:'John',chapter:1,verse:1,endVerse:2,start:7,end:6});
  assert.equal(spans[0].textContent.slice(copied.target.start),'beginning was the Word.');
  sel.removeAllRanges();range.selectNodeContents(doc.getElementById('outside'));sel.addRange(range);assert.equal(selectedPassage(root,sel,'John',1),null);
  sel.removeAllRanges();range.selectNodeContents(root.querySelector('button'));sel.addRange(range);assert.equal(selectedPassage(root,sel,'John',1),null);
  sel.removeAllRanges();range.selectNodeContents(root);sel.addRange(range);
  assert.equal(selectedPassage(root,sel,'John',1).text,'In the beginning was the Word.\nHe was with God.');
 }finally{global.document=saved;dom.window.close();}
});
