const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "bible.sqlite");
const jsonPath = path.join(process.cwd(), "data", "notes.json");

if (!fs.existsSync(jsonPath)) {
  console.error("Missing data/notes.json");
  process.exit(0); // not fatal if you don't have notes yet
}

const items = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const db = new Database(dbPath);

const insert = db.prepare(`
  INSERT INTO note (book, chapter, verse, start, end, body)
  VALUES (@book, @chapter, @verse, @start, @end, @body)
  ON CONFLICT(book, chapter, verse, start, end)
  DO UPDATE SET body = excluded.body
`);

const tx = db.transaction((rows) => { for (const r of rows) insert.run(r); });
tx(items);

console.log(`Seeded ${items.length} notes into ${dbPath}`);
