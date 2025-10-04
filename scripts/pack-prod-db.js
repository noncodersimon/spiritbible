const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const src = path.join(process.cwd(), "data", "bible.sqlite");
const destDir = path.join(process.cwd(), "public", "data");
const dest = path.join(destDir, "bible.sqlite");

// Compact DB
const db = new Database(src);
db.pragma("wal_checkpoint(FULL)");
db.pragma("journal_mode=DELETE");
db.exec("VACUUM");
db.close();

// Copy to public
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("Packed DB →", dest);
