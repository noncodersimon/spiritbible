// scripts/migrate.cjs
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'bible.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// 1) Ensure tables exist
db.exec(`
CREATE TABLE IF NOT EXISTS verse (
  id INTEGER PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS verse_loc ON verse (book,chapter,verse);

CREATE TABLE IF NOT EXISTS note (
  id INTEGER PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  start INTEGER NOT NULL,
  end   INTEGER NOT NULL,
  body  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS note_loc ON note (book,chapter,verse);
`);

// 2) Remove any duplicate notes BEFORE adding the unique index
db.exec(`
DELETE FROM note
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM note
  GROUP BY book, chapter, verse, start, end
);
`);

// 3) Unique index (prevents future duplicates)
db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS note_unique
ON note (book, chapter, verse, start, end);
`);

db.pragma('journal_mode=DELETE');
console.log('Migration complete:', dbPath);

