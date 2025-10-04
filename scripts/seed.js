const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "bible.sqlite");
const jsonPath = path.join(process.cwd(), "data", "bible.json");
const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const db = new Database(dbPath);
const insert = db.prepare(
  "INSERT OR IGNORE INTO verse (book, chapter, verse, text) VALUES (@book, @chapter, @verse, @text)"
);

const tx = db.transaction((items) => { for (const r of items) insert.run(r); });
tx(rows);

console.log(`Seeded ${rows.length} verses into ${dbPath}`);
