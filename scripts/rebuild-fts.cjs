const Database = require('better-sqlite3');
const db = new Database('data/bible.sqlite');

db.exec('BEGIN;');
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS verse_fts USING fts5(
      text, book, chapter, verse,
      content='verse', content_rowid='id'
    );
  `);

  db.exec(`INSERT INTO verse_fts(verse_fts) VALUES('rebuild');`);
  db.exec(`INSERT INTO verse_fts(verse_fts) VALUES('optimize');`);
  db.exec('COMMIT;');
  console.log('FTS rebuilt/optimized ✅');
} catch (e) {
  db.exec('ROLLBACK;');
  console.error('FTS rebuild failed:', e.message);
  process.exit(1);
}
