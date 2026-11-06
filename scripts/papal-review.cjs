// Protect the previously published reader while validating the papal-source supplement.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {validateFinalReview} = require('./final-review.cjs');
const {isPapalWriting} = require('./source-policy.cjs');
const sha = text => createHash('sha256').update(text).digest('hex');
const anchor = ({book,chapter,verse,start,end,phrase}) => ({book,chapter,verse,start,end,phrase});
const connectionContent = ({summary, sources, ...immutable}) => immutable;

function validatePapalReview(root = path.resolve(__dirname, '..'), cache) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
  const baseline = read('drafts/papal-commentary/baseline.json');
  const changes = read('drafts/papal-commentary/changes.json');
  assert.equal(changes.baseCommit, baseline.baseCommit, 'Supplement baseline commit mismatch');
  const editorial = read('drafts/final-audit/editorial.json');
  const notes = read('data/notes.json'), study = read('data/study.json');
  assert.equal(sha(fs.readFileSync(path.join(root, 'data/bible.json'))), baseline.bibleSha256);
  assert.equal(sha(JSON.stringify(study.introductions)), baseline.introductionsSha256, 'Unlisted book introduction change');
  const revisions = new Map(changes.revisions.map(n => [n.noteId, n]));
  assert.equal(revisions.size, changes.revisions.length, 'Duplicate papal note revision');
  assert.equal(notes.length, baseline.notes.length + changes.newNoteIds.length, 'Unexpected supplement note count');
  for (const old of baseline.notes) {
    const current = notes[old.noteId - 1], revised = revisions.get(old.noteId);
    assert.deepEqual(anchor(current), anchor(old), `Shared note anchor changed: ${old.noteId}`);
    assert.equal(current.significance, old.significance, `Unreviewed priority change: ${old.noteId}`);
    if (!revised) assert.equal(sha(current.body), old.bodySha256, `Unlisted note revision: ${old.noteId}`);
    else assert(revised.reason?.trim(), `Missing revision reason: ${old.noteId}`);
  }
  for (const id of revisions.keys()) assert(baseline.notes.some(n => n.noteId === id), `Unknown revised note: ${id}`);
  assert.deepEqual(editorial.slice(baseline.notes.length).map(n => n.id), changes.newNoteIds, 'Unexpected appended note IDs');
  const affected = editorial.filter(n => revisions.has(n.noteId) || changes.newNoteIds.includes(n.id));
  for (const n of affected) assert(n.sources.some(s => s.type === 'papal' && isPapalWriting(new URL(s.url))), `Missing papal support: ${n.id}`);
  const revisedLinks = new Map(changes.connections.map(c => [c.id,c]));
  assert.equal(revisedLinks.size, changes.connections.length, 'Duplicate connection revision');
  assert.equal(study.connections.length, baseline.connections.length + changes.newConnectionIds.length, 'Unexpected connection count');
  for (const old of baseline.connections) {
    const current = study.connections.find(c => c.id === old.id);
    assert(current, `Lost connection: ${old.id}`);
    assert.equal(sha(JSON.stringify(connectionContent(current))), old.immutableSha256, `Immutable connection fields changed: ${old.id}`);
    if (!revisedLinks.has(old.id)) assert.equal(sha(JSON.stringify(current)), old.sha256, `Unlisted connection revision: ${old.id}`);
    else {
      assert(revisedLinks.get(old.id).reason?.trim(), `Missing connection revision reason: ${old.id}`);
      for (const p of old.passages) assert(current.passages.some(q => q.book===p.book && q.chapter===p.chapter && q.verse===p.verse && (q.endVerse??q.verse)===(p.endVerse??p.verse)), `Lost shared endpoint: ${old.id}`);
    }
  }
  for (const id of revisedLinks.keys()) assert(baseline.connections.some(c => c.id === id), `Unknown connection revision: ${id}`);
  assert.deepEqual(study.connections.slice(baseline.connections.length).map(c => c.id), changes.newConnectionIds);
  for (const c of study.connections.filter(c => revisedLinks.has(c.id) || changes.newConnectionIds.includes(c.id))) assert(c.sources.some(s => isPapalWriting(new URL(s.url))), `Missing papal connection support: ${c.id}`);
  const result = validateFinalReview(root, cache);
  return {...result, papalRevisions: revisions.size, papalNewNotes: changes.newNoteIds.length, papalNewConnections: changes.newConnectionIds.length};
}
if (require.main === module) {
  try { console.log(validatePapalReview(undefined, process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {validatePapalReview};
