const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {validateFinalReview} = require('../scripts/final-review.cjs');

test('published editorial refinement has complete decisions, source evidence and stable shared targets', () => {
  const result = validateFinalReview();
  const coverage = require('../drafts/final-audit/coverage.json');
  assert.equal(result.notes, coverage.totalNotes);
  assert.equal(result.newNotes, coverage.newNotes);
  assert.equal(result.revisedNotes, coverage.revisedNotes);
  assert.equal(result.connections, coverage.totalConnections);
  assert.equal(result.newConnections, coverage.newConnections);
});

function fixture(t) {
  const source = path.resolve(__dirname, '..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spiritbible-final-review-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const folder of ['data', 'drafts/study', 'drafts/final-audit']) fs.mkdirSync(path.join(root, folder), { recursive: true });
  fs.cpSync(path.join(source, 'drafts/final-audit'), path.join(root, 'drafts/final-audit'), { recursive: true });
  for (const file of ['data/bible.json', 'data/notes.json', 'data/study.json', 'drafts/study/review.json']) fs.copyFileSync(path.join(source, file), path.join(root, file));
  return {
    root,
    read: file => JSON.parse(fs.readFileSync(path.join(root, file))),
    write: (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n'),
  };
}

test('final audit rejects losing the original note tail even when production and archive agree', t => {
  const f = fixture(t), folder = 'drafts/final-audit/';
  const count = f.read(folder + 'baseline.json').baseNoteCount - 1;
  const editorial = f.read(folder + 'editorial.json').slice(0, count);
  const ids = new Set(editorial.map(n => n.id));
  f.write(folder + 'editorial.json', editorial);
  for (const file of ['data/notes.json', folder + 'notes.json']) f.write(file, f.read(file).slice(0, count));
  f.write(folder + 'source-evidence.json', f.read(folder + 'source-evidence.json').filter(e => ids.has(e.noteId)));
  assert.throws(() => validateFinalReview(f.root), /Missing existing notes/);
});

test('final audit rejects an unknown connection decision', t => {
  const f = fixture(t), file = 'drafts/final-audit/decisions.json', decisions = f.read(file);
  decisions.connections[0].decision = 'unreviewed';
  f.write(file, decisions);
  assert.throws(() => validateFinalReview(f.root), /Invalid connection decision/);
});

test('a retained connection may be classified but its title cannot change', t => {
  const f = fixture(t), folder = 'drafts/final-audit/';
  const decisions = f.read(folder + 'decisions.json'), old = f.read(folder + 'baseline-study.json').connections[0];
  const study = f.read('data/study.json'), current = study.connections.find(c => c.id === old.id);
  const decision = decisions.connections.find(d => d.id === old.id);
  decision.decision = 'keep';
  Object.assign(current, old, { significance: decision.significance, title: old.title + ' (changed)' });
  f.write(folder + 'decisions.json', decisions);
  f.write('data/study.json', study);
  f.write(folder + 'study.json', study);
  assert.throws(() => validateFinalReview(f.root), /Unreviewed connection change/);
});

test('retaining connection content still permits its new significance classification', t => {
  const f = fixture(t), folder = 'drafts/final-audit/';
  const decisions = f.read(folder + 'decisions.json'), old = f.read(folder + 'baseline-study.json').connections[0];
  const study = f.read('data/study.json'), index = study.connections.findIndex(c => c.id === old.id);
  const decision = decisions.connections.find(d => d.id === old.id);
  decision.decision = 'keep';
  decision.significance = old.significance === 'interest' ? 'fundamental' : 'interest';
  study.connections[index] = { ...old, significance: decision.significance };
  const review = f.read('drafts/study/review.json');
  const originalRecord = f.read(folder + 'baseline-study-review.json').items.find(item => item.id === old.id);
  review.items[review.items.findIndex(item => item.id === old.id)] = {
    ...originalRecord,
    itemSha256: createHash('sha256').update(JSON.stringify(study.connections[index])).digest('hex'),
  };
  f.write(folder + 'decisions.json', decisions);
  f.write('data/study.json', study);
  f.write(folder + 'study.json', study);
  f.write('drafts/study/review.json', review);
  assert.doesNotThrow(() => validateFinalReview(f.root));
});
