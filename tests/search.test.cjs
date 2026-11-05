const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const Database=require('better-sqlite3');
function load(relative){
 const filename=path.resolve(__dirname,relative);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const instance=new Module(filename,module);instance.filename=filename;instance.paths=Module._nodeModulePaths(path.dirname(filename));instance._compile(code,filename);return instance.exports;
}
const {parseRef,isReferenceQuery}=load('../src/lib/ref.ts');
const {buildTextQuery}=load('../src/lib/search-query.ts');
test('common Catholic references work with abbreviations, compact spacing and verse ranges',()=>{
 for(const [input,book,chapter,verse,endVerse]of [
  ['Jn3:16','John',3,16,undefined],['Mt 5:1–12','Matthew',5,1,12],['Mk1:1','Mark',1,1,undefined],
  ['Lk15:11','Luke',15,11,undefined],['1 Cor 13','1 Corinthians',13,undefined,undefined],
  ['1Cor13:4-7','1 Corinthians',13,4,7],['II Cor 5:17','2 Corinthians',5,17,undefined],
  ['2 Macc7','2 Maccabees',7,undefined,undefined],['Ecclus2:1','Sirach',2,1,undefined],
  ['Ps23','Psalms',23,undefined,undefined],['Jn. 3.16','John',3,16,undefined],
  ['Phlm10–12','Philemon',1,10,12],['Jude5','Jude',1,5,undefined],
  ['1Jn3:16','1 John',3,16,undefined],['Song of Songs 2:1','Song of Songs',2,1,undefined],
  ['Phil4:6','Philippians',4,6,undefined],
 ]) assert.deepEqual(parseRef(input),{book,chapter,verse,endVerse},input);
 for(const book of require('../src/lib/books.json'))assert.equal(parseRef(book.name+' 1:1')?.book,book.name);
});
test('invalid recognised references do not become keyword searches',()=>{
 for(const input of ['Jn99:1','Mt0:1','John3:0','John3:18–16','Esther16:1','John3–5']){
  assert.equal(parseRef(input),null,input);assert.equal(isReferenceQuery(input),true,input);
 }
 assert.equal(parseRef('love one another'),null);
 assert.equal(isReferenceQuery('love one another'),false);
});
test('text searches treat punctuation literally and honour quoted phrases',()=>{
 const db=new Database(':memory:');
 try{
  db.exec('CREATE VIRTUAL TABLE words USING fts5(text)');
  const insert=db.prepare('INSERT INTO words(text) VALUES (?)');
  for(const text of ['God’s love gives living water.','Living in hope, they drew water.','Love or mercy, neither is absent.'])insert.run(text);
  const search=q=>db.prepare('SELECT rowid FROM words WHERE words MATCH ? ORDER BY rowid').all(buildTextQuery(q)).map(r=>r.rowid);
  assert.deepEqual(search('“living water”'),[1]);
  assert.deepEqual(search('living water'),[1,2]);
  assert.deepEqual(search("God's love"),[1]);
  for(const q of ['faith:hope','love - mercy','"unfinished phrase','love OR mercy','word*'])assert.doesNotThrow(()=>search(q),q);
  assert.equal(buildTextQuery('!? ""'),null);
 }finally{db.close();}
});
