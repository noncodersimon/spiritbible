const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(process.cwd(), "data", "bible.sqlite"));
const verses = db.prepare("SELECT count(*) c FROM verse").get().c;
const notes  = db.prepare("SELECT count(*) c FROM note").get().c;

console.log({ verses, notes });
