// Validate the current editorial release while retaining the historical source archives.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { validateDraft, inspectBody } = require('./commentary-draft.cjs');
const { validateStudy } = require('./study-data.cjs');
const { validateStudyReview } = require('./study-review.cjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const normal = value => value.replace(/\s+/gu, ' ').trim();
const anchor = ({ book, chapter, verse, start, end, phrase }) => ({ book, chapter, verse, start, end, phrase });
const payload = ({ book, chapter, verse, start, end, phrase, body, significance }) => ({ book, chapter, verse, start, end, phrase, body, significance });
const endpoint = p => JSON.stringify([p.book, p.chapter, p.verse, p.endVerse ?? p.verse]);

function validateFinalReview(root = path.resolve(__dirname, '..'), cache) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
  const folder = 'drafts/final-audit/';
  const baseline = read(folder + 'baseline.json');
  const originalNotes = read(folder + 'baseline-notes.json');
  const originalEditorial = read(folder + 'baseline-editorial.json');
  const originalStudy = read(folder + 'baseline-study.json');
  const editorial = read(folder + 'editorial.json');
  const decisions = read(folder + 'decisions.json');
  const evidence = read(folder + 'source-evidence.json');
  const notes = read('data/notes.json');
  const study = read('data/study.json');
  assert.equal(sha(fs.readFileSync(path.join(root, 'data/bible.json'))), baseline['bible.json'], 'Bible text changed during commentary audit');
  assert.equal(sha(fs.readFileSync(path.join(root, folder + 'baseline-notes.json'))), baseline['notes.json'], 'Note baseline changed');
  assert.equal(sha(fs.readFileSync(path.join(root, folder + 'baseline-study.json'))), baseline['study.json'], 'Study baseline changed');
  assert.equal(originalNotes.length, baseline.baseNoteCount);
  assert.equal(originalEditorial.length, originalNotes.length, 'Incomplete original editorial baseline');
  assert(editorial.length >= originalNotes.length, 'Missing existing notes from editorial release');
  assert.equal(originalStudy.connections.length, baseline.baseConnectionCount);
  const noteDecisions = new Map(decisions.notes.map(d => [d.noteId, d]));
  const linkDecisions = new Map(decisions.connections.map(d => [d.id, d]));
  assert.equal(noteDecisions.size, baseline.baseNoteCount, 'Incomplete note audit');
  assert.equal(noteDecisions.size, decisions.notes.length, 'Duplicate note decisions');
  assert.equal(linkDecisions.size, baseline.baseConnectionCount, 'Incomplete connection audit');
  assert.equal(linkDecisions.size, decisions.connections.length, 'Duplicate connection decisions');
  const checkedIds = new Set();
  for (const [index, n] of editorial.entries()) {
    assert.equal(n.noteId, index + 1, 'Stable numeric note ID changed');
    assert(['fundamental', 'interest'].includes(n.significance), `Missing significance: ${n.id}`);
    if (index < originalNotes.length) {
      assert.equal(n.id, originalEditorial[index].id, 'Editorial note ID changed');
      assert.deepEqual(anchor(n), anchor(originalNotes[index]), `Existing shared note anchor changed: ${n.id}`);
      const d = noteDecisions.get(n.noteId);
      assert(d && ['keep', 'revise'].includes(d.decision) && d.reason?.trim(), `Incomplete decision: ${n.id}`);
      assert.equal(n.significance, d.significance, `Classification differs from review: ${n.id}`);
      if (d.decision === 'keep') {
        assert.equal(n.body, originalNotes[index].body, `Unreviewed body change: ${n.id}`);
        assert.deepEqual(n.sources, originalEditorial[index].sources, `Unreviewed source change: ${n.id}`);
      } else {
        assert.notEqual(n.body, originalNotes[index].body, `Revision did not change prose: ${n.id}`);
        checkedIds.add(n.id);
      }
    } else checkedIds.add(n.id);
  }
  const revised = editorial.filter(n => checkedIds.has(n.id)).map(n => ({ ...n, sources: n.sources.map(s => {
    const matches = evidence.filter(e => e.noteId === n.id && e.url === s.url && e.label === s.label && e.locator === s.locator);
    assert.equal(matches.length, 1, `Missing or duplicate evidence: ${n.id} ${s.locator}`);
    const e = matches[0];
    assert.equal(sha(normal(e.excerpt)), s.excerptHash, `Changed supporting excerpt: ${n.id}`);
    assert.equal(e.sha256, s.retrievalSha256, `Changed retrieval hash: ${n.id}`);
    return { ...s, excerpt: e.excerpt };
  }) }));
  assert.equal(evidence.length, revised.reduce((sum, n) => sum + n.sources.length, 0), 'Unused or missing evidence');
  validateDraft(cache ? revised : editorial, { complete: false, minWords: 25, cache });
  validateDraft(editorial, { complete: false, minWords: 25 });
  assert.deepEqual(notes, editorial.map(payload), 'Production notes differ from reviewed editorial payload');
  assert.deepEqual(notes, read(folder + 'notes.json'), 'Archived release differs from production');
  assert.equal(new Set(notes.map(n => n.book)).size, 73, 'Missing canonical book coverage');
  assert.deepEqual(study, read(folder + 'study.json'), 'Study release differs from reviewed payload');
  for (const c of study.connections) assert(['fundamental', 'interest'].includes(c.significance), `Missing link significance: ${c.id}`);
  for (const old of originalStudy.connections) {
    const current = study.connections.find(c => c.id === old.id), d = linkDecisions.get(old.id);
    assert(current && d?.reason?.trim(), `Missing connection review: ${old.id}`);
    assert(['keep', 'revise'].includes(d.decision), `Invalid connection decision: ${old.id}`);
    assert.equal(current.significance, d.significance);
    for (const p of old.passages) assert(current.passages.some(q => endpoint(q) === endpoint(p)), `Lost existing passage target: ${old.id}`);
    if (d.decision === 'keep') {
      const { significance: oldSignificance, ...originalContent } = old;
      const { significance: currentSignificance, ...currentContent } = current;
      assert.deepEqual(currentContent, originalContent, `Unreviewed connection change: ${old.id}`);
    }
  }
  validateStudy(study, read('data/bible.json'));
  const studyResult = validateStudyReview(study, read('drafts/study/review.json'), cache);
  const words = editorial.map(n => inspectBody(n.body).words);
  return { notes: notes.length, revisedNotes: checkedIds.size - (notes.length - originalNotes.length), newNotes: notes.length - originalNotes.length,
    newConnections: study.connections.length - originalStudy.connections.length, minimumWords: Math.min(...words), maximumWords: Math.max(...words), ...studyResult };
}

if (require.main === module) {
  try { console.log(validateFinalReview(undefined, process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateFinalReview };
