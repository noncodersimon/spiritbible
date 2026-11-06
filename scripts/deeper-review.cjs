// Validate the supplementary editorial archive, optionally against fetched source HTML.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {validateDraft} = require('./commentary-draft.cjs');
const {validateStudyReview} = require('./study-review.cjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const normal = value => value.replace(/\s+/gu, ' ').trim();
const payload = rows => rows.map(({book,chapter,verse,start,end,phrase,body}) => ({book,chapter,verse,start,end,phrase,body}));

function validateDeeperReview(root = path.resolve(__dirname, '..'), cache) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
  const dir = 'drafts/deeper-commentary/';
  const baseline = read(dir+'baseline.json');
  const editorial = read(dir+'editorial.json');
  const evidence = read(dir+'source-evidence.json');
  const original = read('drafts/commentary/editorial.json');
  const notes = read('data/notes.json');
  assert.equal(sha(fs.readFileSync(path.join(root, 'data/bible.json'))), baseline['bible.json'], 'Bible text changed');
  assert.equal(sha(JSON.stringify(notes.slice(0, baseline.baseNoteCount), null, 2)+'\n'), baseline['notes.json'], 'Original commentary changed');
  const evidenced = editorial.map(n => ({...n, sources:n.sources.map(s => {
    const matches = evidence.filter(e => e.noteId === n.id && e.url === s.url && e.label === s.label && e.locator === s.locator);
    assert.equal(matches.length, 1, `Missing or duplicate source evidence: ${n.id}`);
    const e = matches[0];
    assert.equal(sha(normal(e.excerpt)), s.excerptHash, `Changed source excerpt: ${n.id}`);
    assert.equal(e.sha256, s.retrievalSha256, `Changed source retrieval: ${n.id}`);
    return {...s, excerpt:e.excerpt};
  })}));
  assert.equal(evidence.length, editorial.reduce((sum,n)=>sum+n.sources.length,0));
  const checked = validateDraft(cache ? evidenced : editorial, {complete:false, cache});
  validateDraft([...original, ...checked], {complete:false});
  assert.deepEqual(read(dir+'notes.json'), payload(checked));
  // Existing shared note URLs use array-derived IDs: preserve the original prefix.
  assert.deepEqual(notes, [...read('drafts/commentary/notes.json'), ...payload(checked)]);
  const study = read('data/study.json');
  const originalStudy = {...study, connections:study.connections.slice(0, baseline.baseConnectionCount)};
  assert.equal(sha(JSON.stringify(originalStudy, null, 2)+'\n'), baseline['study.json'], 'Original connections or introductions changed');
  assert.deepEqual(study.connections.slice(baseline.baseConnectionCount), read(dir+'connections.json'));
  const reviewed = validateStudyReview(study, read('drafts/study/review.json'), cache);
  return {newNotes:checked.length, totalNotes:notes.length, ...reviewed};
}

if (require.main === module) {
  try { console.log(validateDeeperReview(undefined, process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {validateDeeperReview};
