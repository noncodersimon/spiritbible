const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateDraft,reviewFingerprint}=require('../scripts/commentary-draft.cjs');
const {isPapalWriting}=require('../scripts/source-policy.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function fixture(){
 const sentence='This fixture supplies enough words to exercise validation without serving as real commentary.';
 return {id:'GEN-fixture',book:'Genesis',chapter:1,verse:1,phrase:'In the beginning',title:'Validator fixture',theme:'test',interpretation:'spiritual',languageNote:false,
 body:`<p>${Array(9).fill(sentence).join(' ')}</p><p class="sources">Sources: <a href="https://www.vatican.va/archive/ENG0015/__P19.HTM" target="_blank" rel="noopener noreferrer">CCC 290</a>.</p>`,
 sources:[{url:'https://www.vatican.va/archive/ENG0015/__P19.HTM',label:'CCC 290',locator:'paragraph 290',supports:'Fixture support',type:'catechism',retrievalSha256:'a'.repeat(64),excerptHash:'b'.repeat(64),evidenceVerified:true}]};
}
test('draft validation rejects misleading anchors and overlapping highlights',()=>{
 const good=fixture();assert.equal(validateDraft([good],{complete:false})[0].start,0);
 assert.throws(()=>validateDraft([{...good,phrase:'In the beginnings'}],{complete:false}),/exact and unique/);
 assert.throws(()=>validateDraft([good,{...good,id:'GEN-fixture2',phrase:'the beginning',body:good.body.replace('This fixture','Another fixture')}],{complete:false}),/Overlapping/);
 assert.throws(()=>validateDraft([{...good,start:5}],{complete:false}),/offsets disagree/);
});
test('draft validation enforces substantive length and rejects unsafe or untraceable HTML',()=>{
 const good=fixture();
 assert.throws(()=>validateDraft([{...good,body:good.body.replace(/<p>.*?<\/p>/,'<p>Too short.</p>')}],{complete:false}),/Prose length/);
 assert.throws(()=>validateDraft([{...good,body:good.body+'<script>alert(1)</script>'}],{complete:false}),/Unexpected HTML/);
 assert.throws(()=>validateDraft([{...good,body:good.body.replace('www.vatican.va','example.com')}],{complete:false}),/Unexpected source URL/);
 assert.throws(()=>validateDraft([{...good,sources:[]}],{complete:false}),/Missing source/);
});
test('source provenance requires the exact evidence excerpt in a hash-verified cached page',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'commentary-source-'));
 try{
  const n=fixture(),source=n.sources[0],stem=path.join(dir,sha(source.url).slice(0,20));
  source.excerpt='This is the actual short supporting evidence in our fixture.';
  const html='<p>'+source.excerpt+'</p>';
  fs.writeFileSync(stem+'.html',html);fs.writeFileSync(stem+'.txt',source.excerpt);
  fs.writeFileSync(stem+'.json',JSON.stringify({url:source.url,sha256:sha(html)}));
  const checked=validateDraft([n],{complete:false,cache:dir})[0];
  assert.equal(checked.sources[0].evidenceVerified,true);assert.equal(checked.sources[0].excerpt,undefined);
  assert.equal(checked.sources[0].retrievalSha256,sha(html));
  source.excerpt='This plausible evidence is not actually present in the source.';
  assert.throws(()=>validateDraft([n],{complete:false,cache:dir}),/not found verbatim/);
  fs.writeFileSync(stem+'.txt',source.excerpt);
  assert.throws(()=>validateDraft([n],{complete:false,cache:dir}),/not found in the hash-verified HTML/);
  source.excerpt='This is the actual short supporting evidence in our fixture.';
  fs.writeFileSync(stem+'.txt',source.excerpt);
  fs.appendFileSync(stem+'.html','changed');
  assert.throws(()=>validateDraft([n],{complete:false,cache:dir}),/hash mismatch/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('review marks are invalidated by source, anchor, passage and context changes',()=>{
 const n=fixture(),context=[{book:n.book,chapter:1,verse:1,text:'In the beginning God created the heavens and the earth.'}];
 const original=reviewFingerprint(n,context);
 assert.equal(reviewFingerprint(JSON.parse(JSON.stringify(n)),context),original);
 assert.notEqual(reviewFingerprint({...n,sources:n.sources.map(s=>({...s,locator:'corrected source section'}))},context),original);
 assert.notEqual(reviewFingerprint({...n,phrase:'God created'},context),original);
 assert.notEqual(reviewFingerprint({...n,verse:2},context),original);
 assert.notEqual(reviewFingerprint(n,[{...context[0],text:'Revised surrounding verse text.'}]),original);
});

test('spiritual classics are limited to the approved primary CCEL works',()=>{
 const note=fixture();
 const url='https://ccel.org/ccel/teresa/castle2/castle2.v.i.html';
 note.body=note.body.replace(note.sources[0].url,url);
 note.sources[0]={...note.sources[0],url,type:'spiritual-classic',label:'Teresa, Interior Castle I.1',locator:'First Mansions, chapter 1'};
 assert.doesNotThrow(()=>validateDraft([note],{complete:false}));
 const bad={...note,body:note.body.replace(url,'https://ccel.org/fiction.html'),sources:[{...note.sources[0],url:'https://ccel.org/fiction.html'}]};
 assert.throws(()=>validateDraft([bad],{complete:false}),/source URL|collection/);
});

test('papal citations accept the two authorised Vatican collections and keep their source type distinct',()=>{
 const urls=[
  'https://www.vatican.va/content/john-paul-ii/en/encyclicals/documents/hf_jp-ii_enc_14091998_fides-et-ratio.html',
  'https://www.vatican.va/content/benedict-xvi/en/encyclicals/documents/hf_ben-xvi_enc_20071130_spe-salvi.html',
 ];
 const noteFor=url=>{const n=fixture();n.body=n.body.replace(n.sources[0].url,url);n.sources[0]={...n.sources[0],url,type:'papal'};return n;};
 for(const url of urls) assert.doesNotThrow(()=>validateDraft([noteFor(url)],{complete:false}));
 const wrongType=noteFor(urls[0]);wrongType.sources[0].type='catechism';
 assert.throws(()=>validateDraft([wrongType],{complete:false}),/collection/);
 for(const url of [urls[0].replace('john-paul-ii','francesco'),urls[0].replace('www.vatican.va','www.vatican.va.example.com'),urls[0].replace('https:','http:'),urls[0].replace('https://','https://reader:secret@'),urls[0].replace('www.vatican.va/','www.vatican.va:8443/'),'https://www.vatican.va/news.html']) {
  assert.equal(isPapalWriting(new URL(url)),false,'The papal predicate must reject unsafe origins independently');
  assert.throws(()=>validateDraft([noteFor(url)],{complete:false}),/source URL|collection/);
 }
 assert.equal(isPapalWriting(new URL(urls[0].replace('www.vatican.va/','www.vatican.va:443/'))),true);
});
