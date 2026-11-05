const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const Database=require('better-sqlite3');
const {validateStudy}=require('../scripts/study-data.cjs');
const {buildData}=require('../scripts/build-data.cjs');
const {checkData}=require('../scripts/check-data.cjs');
const bible=require('../data/bible.json');
const study=require('../data/study.json');

test('linked commentary has valid canonical passages, plain prose and approved source links',()=>{
 assert.doesNotThrow(()=>validateStudy(study,bible));
 assert.ok(study.connections.some(c=>c.id==='mary-ark-of-the-covenant'));
 assert.ok(study.connections.some(c=>c.id==='isaac-carries-the-wood'));
 const bad=structuredClone(study);bad.connections[0].passages[0].verse=999;
 assert.throws(()=>validateStudy(bad,bible),/range|verse/);
 const unsafe=structuredClone(study);unsafe.connections[0].sources[0].url='https://example.com/unsupported';
 assert.throws(()=>validateStudy(unsafe,bible),/source/);
 const duplicate=structuredClone(study);duplicate.connections.push(duplicate.connections[0]);
 assert.throws(()=>validateStudy(duplicate,bible),/connection/);
});
test('one generated snapshot serves both endpoints, searches notes and connections, and detects stale study data',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'spiritbible-study-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'data'));
 const c=study.connections.find(c=>c.id==='isaac-carries-the-wood');
 fs.writeFileSync(path.join(root,'data/bible.json'),JSON.stringify(bible));
 const n={book:'John',chapter:1,verse:1,start:0,end:0,body:'<p>A distinctive explanation of the Incarnation.</p>'};
 fs.writeFileSync(path.join(root,'data/notes.json'),JSON.stringify([n]));
 const write=connections=>fs.writeFileSync(path.join(root,'data/study.json'),JSON.stringify({version:1,connections,introductions:[]}));
 write([c]);const built=buildData(root);let db=new Database(built.target,{readonly:true});
 try{
  assert.equal(db.prepare('SELECT count(*) n FROM connection_passage WHERE connection_id=?').get(c.id).n,c.passages.length);
  for(const p of c.passages)assert.equal(db.prepare('SELECT connection_id FROM connection_passage WHERE book=? AND chapter=? AND verse=?').get(p.book,p.chapter,p.verse).connection_id,c.id);
  assert.ok(db.prepare("SELECT count(*) n FROM commentary_fts WHERE commentary_fts MATCH 'wood'").get().n>0);
  assert.equal(db.prepare("SELECT note_id FROM commentary_fts WHERE commentary_fts MATCH 'Incarnation'").get().note_id,1);
 }finally{db.close();}
 assert.doesNotThrow(()=>checkData(root));
 write([]);assert.throws(()=>checkData(root),/study.json changed/);buildData(root);
 db=new Database(built.target,{readonly:true});try{assert.equal(db.prepare('SELECT count(*) n FROM study_connection').get().n,0);assert.equal(db.prepare("SELECT count(*) n FROM commentary_fts WHERE commentary_fts MATCH 'wood'").get().n,0);}finally{db.close();}
});

test('all 73 introductions and every connection have current source-review records',()=>{
 const books=require('../src/lib/books.json');
 assert.deepEqual(study.introductions.map(i=>i.book),books.map(b=>b.name));
 const {validateStudyReview}=require('../scripts/study-review.cjs');
 const review=require('../drafts/study/review.json');
 assert.doesNotThrow(()=>validateStudyReview(study,review));
 const changed=structuredClone(study);changed.connections[0].summary+=' A changed interpretation.';
 assert.throws(()=>validateStudyReview(changed,review),/stale/);
});
