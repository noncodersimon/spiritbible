// scripts/reset-fts.cjs
const Database = require('better-sqlite3');
const db = new Database('data/bible.sqlite');

// Detect whether the verse table uses an "id" PK or implicit rowid
const hasIdPk = !!db
  .prepare(`
    SELECT 1
    FROM pragma_table_info('verse')
    WHERE name='id' AND pk=1
  `)
  .get();

const contentRowid = hasIdPk ? 'id' : 'rowid';

db.exec('BEGIN IMMEDIATE;');

try {
  // Drop the FTS5 table and its shadow tables if they exist
  db.exec(`
    DROP TABLE IF EXISTS verse_fts;
    DROP TABLE IF EXISTS verse_fts_data;
    DROP TABLE IF EXISTS verse_fts_idx;
    DROP TABLE IF EXISTS verse_fts_docsize;
    DROP TABLE IF EXISTS verse_fts_config;
  `);

  // Recreate a content-synced FTS5 index
  db.exec(`
    CREATE VIRTUAL TABLE verse_fts USING fts5(
      text,
      book,
      chapter,
      verse,
      content='verse',
      content_rowid='${contentRowid}'
    );
  `);

  // Populate FTS from the canonical verse table
  if (hasIdPk) {
    db.exec(`
      INSERT INTO verse_fts(rowid, text, book, chapter, verse)
      SELECT id, text, book, chapter, verse FROM verse;
    `);
  } else {
    db.exec(`
      INSERT INTO verse_fts(rowid, text, book, chapter, verse)
      SELECT rowid, text, book, chapter, verse FROM verse;
    `);
  }

  // Optimize
  db.exec(`INSERT INTO verse_fts(verse_fts) VALUES('optimize');`);

  db.exec('COMMIT;');
  console.log('FTS index fully reset & optimized ✅');
} catch (e) {
  db.exec('ROLLBACK;');
  console.error('FTS reset failed:', e.message);
  process.exit(1);
}
