const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {validatePapalReview} = require('../scripts/papal-review.cjs');
const {isPapalWriting} = require('../scripts/source-policy.cjs');
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const folder = 'drafts/papal-commentary/';

function fixture(t) {
  const source = path.resolve(__dirname, '..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spiritbible-papal-review-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['data', 'drafts/study', folder, 'drafts/final-audit']) fs.mkdirSync(path.join(root, dir), {recursive: true});
  for (const dir of [folder, 'drafts/final-audit']) fs.cpSync(path.join(source, dir), path.join(root, dir), {recursive: true});
  for (const file of ['data/bible.json', 'data/notes.json', 'data/study.json', 'drafts/study/review.json']) fs.copyFileSync(path.join(source, file), path.join(root, file));
  return {
    root,
    read: file => JSON.parse(fs.readFileSync(path.join(root, file))),
    write: (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n'),
  };
}

function writeStudy(f, study, review = f.read('drafts/study/review.json')) {
  for (const [id, item] of [...study.connections.map(c => [c.id, c]), ...study.introductions.map(i => ['intro:' + i.book, i])]) {
    review.items.find(r => r.id === id).itemSha256 = sha(item);
  }
  f.write('data/study.json', study);
  f.write('drafts/final-audit/study.json', study);
  f.write('drafts/study/review.json', review);
}

test('papal supplement preserves the immediate published baseline and validates the selected additions', () => {
  const result = validatePapalReview();
  const changes = require('../drafts/papal-commentary/changes.json');
  assert.equal(result.papalRevisions, changes.revisions.length);
  assert.equal(result.papalNewNotes, changes.newNoteIds.length);
  assert.equal(result.papalNewConnections, changes.newConnectionIds.length);
});

test('supplement rejects movement of a note appended in the preceding release', t => {
  const f = fixture(t), baseline = f.read(folder + 'baseline.json');
  const notes = f.read('data/notes.json'), old = baseline.notes.at(-1);
  notes[old.noteId - 1].start++;
  f.write('data/notes.json', notes);
  assert.throws(() => validatePapalReview(f.root), /Shared note anchor changed/);
});

test('supplement rejects a change manifest for a different published baseline', t => {
  const f = fixture(t), changes = f.read(folder + 'changes.json');
  changes.baseCommit = '0'.repeat(40);
  f.write(folder + 'changes.json', changes);
  assert.throws(() => validatePapalReview(f.root), /Supplement baseline commit mismatch/);
});

test('supplement rejects an unlisted note body revision', t => {
  const f = fixture(t), changes = f.read(folder + 'changes.json');
  const notes = f.read('data/notes.json');
  const old = f.read(folder + 'baseline.json').notes.find(n => !changes.revisions.some(r => r.noteId === n.noteId));
  notes[old.noteId - 1].body = notes[old.noteId - 1].body.replace('<p>', '<p>Unlisted change. ');
  f.write('data/notes.json', notes);
  assert.throws(() => validatePapalReview(f.root), /Unlisted note revision/);
});

test('supplement rejects an introduction change even when release copies and review hashes agree', t => {
  const f = fixture(t), study = f.read('data/study.json');
  study.introductions[0].summary += ' This is an unlisted change.';
  writeStudy(f, study);
  assert.throws(() => validatePapalReview(f.root), /Unlisted book introduction change/);
});

test('a selected connection revision cannot change its priority or title', t => {
  const f = fixture(t), changes = f.read(folder + 'changes.json');
  const old = f.read(folder + 'baseline.json').connections.at(-1);
  changes.connections.push({id: old.id, reason: 'Test the permitted summary/source-only revision path.'});
  f.write(folder + 'changes.json', changes);
  for (const field of ['significance', 'title']) {
    const study = f.read('data/study.json'), current = study.connections.find(c => c.id === old.id);
    const previous = current[field];
    current[field] = field === 'significance' ? (previous === 'interest' ? 'fundamental' : 'interest') : previous + ' changed';
    writeStudy(f, study);
    assert.throws(() => validatePapalReview(f.root), /Immutable connection fields changed/);
    current[field] = previous;
    writeStudy(f, study);
  }
});

test('new supplement commentary must have papal support', t => {
  const f = fixture(t), changes = f.read(folder + 'changes.json');
  const editorial = f.read('drafts/final-audit/editorial.json');
  const note = editorial.find(n => changes.newNoteIds.includes(n.id));
  assert(note, 'This release includes new commentary');
  note.sources = note.sources.filter(s => s.type !== 'papal');
  f.write('drafts/final-audit/editorial.json', editorial);
  assert.throws(() => validatePapalReview(f.root), /Missing papal support/);
});

test('a selected connection may change only its summary and sources with recorded papal evidence', t => {
  const f = fixture(t), changes = f.read(folder + 'changes.json'), study = f.read('data/study.json');
  const old = f.read(folder + 'baseline.json').connections.at(-1);
  const current = study.connections.find(c => c.id === old.id);
  const added = study.connections.find(c => changes.newConnectionIds.includes(c.id));
  const source = added.sources.find(s => isPapalWriting(new URL(s.url)));
  const review = f.read('drafts/study/review.json');
  const proof = review.items.find(r => r.id === added.id).evidence.filter(e => e.url === source.url);
  assert(proof.length);
  current.summary += ' These verses also invite prayerful reflection.';
  current.sources.push(source);
  review.items.find(r => r.id === current.id).evidence.push(...proof);
  changes.connections.push({id: old.id, reason: 'Exercise the permitted summary/source-only path in an isolated fixture.'});
  f.write(folder + 'changes.json', changes);
  writeStudy(f, study, review);
  assert.doesNotThrow(() => validatePapalReview(f.root));
});
