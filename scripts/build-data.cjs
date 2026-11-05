const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');

const reference = (row) => JSON.stringify([row.book.toLowerCase(), row.chapter, row.verse]);
const positiveInteger = (n) => Number.isSafeInteger(n) && n > 0;

function validateSources(verses, notes) {
  if (!Array.isArray(verses) || !verses.length || !Array.isArray(notes)) {
    throw new Error('bible.json must be a nonempty array; notes.json must be an array.');
  }
  const references = new Set();
  const texts = new Map();
  for (const [i, row] of verses.entries()) {
    if (!row || typeof row.book !== 'string' || !row.book.trim() ||
        row.book !== row.book.trim() || !positiveInteger(row.chapter) ||
        !positiveInteger(row.verse) || typeof row.text !== 'string') {
      throw new Error(`Invalid verse at bible.json row ${i + 1}.`);
    }
    const key = reference(row);
    if (references.has(key)) throw new Error(`Duplicate verse: ${row.book} ${row.chapter}:${row.verse}.`);
    references.add(key);
    texts.set(key, row.text);
  }
  const anchors = new Set();
  for (const [i, row] of notes.entries()) {
    if (!row || typeof row.book !== 'string' || !row.book.trim() ||
        !positiveInteger(row.chapter) || !positiveInteger(row.verse) ||
        !Number.isSafeInteger(row.start) || row.start < 0 ||
        !Number.isSafeInteger(row.end) || row.end < row.start ||
        typeof row.body !== 'string' || !row.body.trim()) {
      throw new Error(`Invalid note at notes.json row ${i + 1}.`);
    }
    if (!references.has(reference(row))) {
      throw new Error(`Note references missing verse: ${row.book} ${row.chapter}:${row.verse}.`);
    }
    if (row.phrase != null && (typeof row.phrase !== 'string' || !row.phrase ||
        texts.get(reference(row)).slice(row.start, row.end + 1) !== row.phrase)) {
      throw new Error(`Note phrase does not match its verse: ${row.book} ${row.chapter}:${row.verse}.`);
    }
    const key = JSON.stringify([reference(row), row.start, row.end]);
    if (anchors.has(key)) throw new Error(`Duplicate note anchor: ${row.book} ${row.chapter}:${row.verse}.`);
    anchors.add(key);
  }
}

// JSON remains authoritative. Build a complete replacement before touching the
// previous database, so a failed import cannot leave a half-updated reader.
function buildData(root = path.resolve(__dirname, '..')) {
  const dataDir = path.join(root, 'data');
  const bibleSource = fs.readFileSync(path.join(dataDir, 'bible.json'));
  const notesSource = fs.readFileSync(path.join(dataDir, 'notes.json'));
  const verses = JSON.parse(bibleSource);
  const notes = JSON.parse(notesSource);
  validateSources(verses, notes);

  const target = path.join(dataDir, 'bible.sqlite');
  for (const suffix of ['-wal', '-shm', '-journal']) {
    if (fs.existsSync(target + suffix)) {
      throw new Error('Database journal files are present. Stop database writers and checkpoint/close SQLite before rebuilding.');
    }
  }
  const temporary = path.join(dataDir, `build-${randomUUID()}.sqlite`);
  let db;
  try {
    db = new Database(temporary);
    db.pragma('journal_mode = DELETE');
    db.exec(`
      CREATE TABLE verse (
        id INTEGER PRIMARY KEY,
        book TEXT NOT NULL COLLATE NOCASE,
        chapter INTEGER NOT NULL CHECK (chapter > 0),
        verse INTEGER NOT NULL CHECK (verse > 0),
        text TEXT NOT NULL,
        UNIQUE (book, chapter, verse)
      );
      CREATE TABLE note (
        id INTEGER PRIMARY KEY,
        book TEXT NOT NULL COLLATE NOCASE,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        start INTEGER NOT NULL,
        end INTEGER NOT NULL,
        body TEXT NOT NULL,
        phrase TEXT,
        UNIQUE (book, chapter, verse, start, end)
      );
      CREATE TABLE source_manifest (file TEXT PRIMARY KEY, sha256 TEXT NOT NULL);
      CREATE VIRTUAL TABLE verse_fts USING fts5(
        text, book, chapter, verse, content='verse', content_rowid='id'
      );
    `);
    const verseInsert = db.prepare('INSERT INTO verse (book, chapter, verse, text) VALUES (@book, @chapter, @verse, @text)');
    const noteInsert = db.prepare('INSERT INTO note (book, chapter, verse, start, end, body, phrase) VALUES (@book, @chapter, @verse, @start, @end, @body, @phrase)');
    const manifestInsert = db.prepare('INSERT INTO source_manifest VALUES (?, ?)');
    db.transaction(() => {
      for (const row of verses) verseInsert.run(row);
      for (const row of notes) noteInsert.run({ ...row, phrase: row.phrase ?? null });
      for (const [file, source] of [['bible.json', bibleSource], ['notes.json', notesSource]]) {
        manifestInsert.run(file, createHash('sha256').update(source).digest('hex'));
      }
      db.exec("INSERT INTO verse_fts(verse_fts) VALUES ('rebuild')");
      db.exec("INSERT INTO verse_fts(verse_fts, rank) VALUES ('integrity-check', 1)");
    })();
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') {
      throw new Error('Generated SQLite database failed its integrity check.');
    }
    db.close();
    db = undefined;
    fs.renameSync(temporary, target);
    // This was an output of the old pack command, never an editable source.
    // Next serves public files verbatim; the database belongs on the server only.
    fs.rmSync(path.join(root, 'public', 'data', 'bible.sqlite'), { force: true });
    return { verses: verses.length, notes: notes.length,
      blankVerses: verses.filter(row => !row.text.trim()).length, target };
  } finally {
    if (db?.open) db.close();
    fs.rmSync(temporary, { force: true });
    fs.rmSync(`${temporary}-journal`, { force: true });
  }
}

if (require.main === module) {
  const result = buildData();
  console.log(`Built ${result.verses} verses and ${result.notes} notes, including search index: ${result.target}`);
  if (result.blankVerses) console.warn(`Editorial review needed: ${result.blankVerses} blank verse records preserved from bible.json.`);
}

module.exports = { buildData, validateSources };
