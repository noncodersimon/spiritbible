const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(process.cwd(), "data", "bible.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// Your existing verse table creation stays here (if not present already)
// Example:
// db.exec(`CREATE TABLE IF NOT EXISTS verse (
//   id INTEGER PRIMARY KEY,
//   book TEXT NOT NULL,
//   chapter INTEGER NOT NULL,
//   verse INTEGER NOT NULL,
//   text TEXT NOT NULL
// );`);

// NOTES table (new)
db.exec(`
  CREATE TABLE IF NOT EXISTS note (
    id INTEGER PRIMARY KEY,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    start INTEGER NOT NULL,
    end INTEGER NOT NULL,
    body TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS note_loc ON note (book, chapter, verse);
  CREATE UNIQUE INDEX IF NOT EXISTS note_unique
ON note (book, chapter, verse, start, end);

`);

// Make sure production uses a single-file DB
db.pragma("journal_mode=DELETE");

console.log("Migration complete:", dbPath);
