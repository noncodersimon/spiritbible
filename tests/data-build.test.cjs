const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { buildData } = require('../scripts/build-data.cjs');
const { checkData } = require('../scripts/check-data.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spiritbible-data-'));
  fs.mkdirSync(path.join(root, 'data'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const verses = [
    { book: 'John', chapter: 1, verse: 1, text: 'The Word was with God.' },
    { book: 'John', chapter: 1, verse: 2, text: 'An obsolete passage.' },
  ];
  const notes = [{ book: 'John', chapter: 1, verse: 1, start: 4, end: 7, body: 'An editorial note.' }];
  const write = (file, value) => fs.writeFileSync(path.join(root, 'data', file), JSON.stringify(value));
  write('bible.json', verses);
  write('notes.json', notes);
  return { root, verses, notes, write, target: path.join(root, 'data', 'bible.sqlite') };
}

function inspect(target, callback) {
  const db = new Database(target, { readonly: true });
  try { callback(db); } finally { db.close(); }
}

test('repeated builds preserve source text and notes without duplicating rows', (t) => {
  const f = fixture(t);
  buildData(f.root);
  buildData(f.root);
  inspect(f.target, (db) => {
    assert.deepEqual(db.prepare('SELECT book,chapter,verse,text FROM verse ORDER BY id').all(), f.verses);
    assert.deepEqual(db.prepare('SELECT book,chapter,verse,start,end,body FROM note').all(), f.notes);
    assert.equal(db.prepare("SELECT count(*) n FROM verse_fts WHERE verse_fts MATCH 'Word'").get().n, 1);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'data/bible.json'))), f.verses);
});

test('replacement rebuild updates reading and search and removes deleted verses and notes', (t) => {
  const f = fixture(t);
  buildData(f.root);
  const changed = [{ ...f.verses[0], text: 'A newly revised passage.' }];
  f.write('bible.json', changed);
  f.write('notes.json', []);
  buildData(f.root);
  inspect(f.target, (db) => {
    assert.deepEqual(db.prepare('SELECT book,chapter,verse,text FROM verse').all(), changed);
    assert.equal(db.prepare('SELECT count(*) n FROM note').get().n, 0);
    assert.equal(db.prepare("SELECT count(*) n FROM verse_fts WHERE verse_fts MATCH 'obsolete OR Word'").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) n FROM verse_fts WHERE verse_fts MATCH 'revised'").get().n, 1);
  });
});

test('an invalid import leaves the previous database intact', (t) => {
  const f = fixture(t);
  buildData(f.root);
  const previous = fs.readFileSync(f.target);
  f.write('bible.json', [...f.verses, { ...f.verses[0], book: 'john' }]);
  assert.throws(() => buildData(f.root), /Duplicate verse/);
  assert.deepEqual(fs.readFileSync(f.target), previous);
  assert.deepEqual(fs.readdirSync(path.join(f.root, 'data')).sort(), ['bible.json', 'bible.sqlite', 'notes.json']);
});

test('notes referring to missing verses or duplicate anchors are rejected', (t) => {
  const f = fixture(t);
  f.write('notes.json', [{ ...f.notes[0], verse: 99 }]);
  assert.throws(() => buildData(f.root), /missing verse/);
  f.write('notes.json', [...f.notes, { ...f.notes[0], body: 'Conflicting note' }]);
  assert.throws(() => buildData(f.root), /Duplicate note anchor/);
});

test('missing or malformed sources fail instead of silently discarding content', (t) => {
  const f = fixture(t);
  f.write('bible.json', [{ ...f.verses[0], chapter: 0 }]);
  assert.throws(() => buildData(f.root), /Invalid verse/);
  f.write('bible.json', []);
  assert.throws(() => buildData(f.root), /nonempty array/);
  f.write('bible.json', f.verses);
  fs.unlinkSync(path.join(f.root, 'data/notes.json'));
  assert.throws(() => buildData(f.root), /ENOENT/);
});

test('startup detects changed Bible text or notes until a new snapshot is built', (t) => {
  const f = fixture(t);
  buildData(f.root);
  assert.doesNotThrow(() => checkData(f.root));
  f.write('notes.json', [{ ...f.notes[0], body: 'An updated explanation.' }]);
  assert.throws(() => checkData(f.root), /notes.json changed/);
  buildData(f.root);
  assert.doesNotThrow(() => checkData(f.root));
  f.write('bible.json', [{ ...f.verses[0], text: 'Edited wording.' }]);
  assert.throws(() => checkData(f.root), /bible.json changed/);
});

test('blank source verses are reported and preserved for editorial review', (t) => {
  const f = fixture(t);
  f.write('bible.json', [{ ...f.verses[0], text: '' }]);
  const result = buildData(f.root);
  assert.equal(result.blankVerses, 1);
  inspect(f.target, db => assert.equal(db.prepare('SELECT text FROM verse').get().text, ''));
});

test('build removes the obsolete public database while retaining other public files', (t) => {
  const f = fixture(t);
  const publicDir = path.join(f.root, 'public', 'data');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'bible.sqlite'), 'old generated database');
  fs.writeFileSync(path.join(publicDir, 'keep.txt'), 'keep');
  buildData(f.root);
  assert.deepEqual(fs.readdirSync(publicDir), ['keep.txt']);
});

test('active SQLite journal files prevent replacement', (t) => {
  const f = fixture(t);
  buildData(f.root);
  const previous = fs.readFileSync(f.target);
  fs.writeFileSync(f.target + '-wal', 'uncheckpointed data');
  assert.throws(() => buildData(f.root), /journal files/);
  assert.deepEqual(fs.readFileSync(f.target), previous);
});
