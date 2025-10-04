// scripts/seed-uk-patches.cjs
/* UK spelling normaliser for the verse table (no extra tables needed) */
const Database = require("better-sqlite3");
const path = require("path");

// 1) Open DB
const dbPath = path.join(process.cwd(), "data", "bible.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// 2) US→UK map (expand as needed)
const UK_MAP = {
  Savior: "Saviour", savior: "saviour",
  honor: "honour", honors: "honours", honored: "honoured", honoring: "honouring", honorable: "honourable",
  dishonor: "dishonour", dishonored: "dishonoured", dishonors: "dishonours", dishonoring: "dishonouring",
  fulfill: "fulfil", fulfills: "fulfils", fulfilled: "fulfilled", fulfilling: "fulfilling", fulfillment: "fulfilment",
  behavior: "behaviour",
  favor: "favour", favors: "favours", favored: "favoured", favoring: "favouring", favorite: "favourite", favorites: "favourites",
  labor: "labour", labors: "labours", labored: "laboured", laboring: "labouring",
  center: "centre", centers: "centres",
  meter: "metre", meters: "metres",

  // feel free to add more pairs here
};

// Helpers to preserve capitalization
const title = (s) => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
const upper = (s) => s.toUpperCase();

// Build case-aware regex patterns for each term
function buildPatterns(us, uk) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    [new RegExp(`\\b${esc(us)}\\b`, "g"), uk],
    [new RegExp(`\\b${esc(title(us))}\\b`, "g"), title(uk)],
    [new RegExp(`\\b${esc(upper(us))}\\b`, "g"), upper(uk)],
  ];
}

const PATTERNS = Object.entries(UK_MAP).map(([us, uk]) => buildPatterns(us, uk)).flat();

// Transform a single verse string
function applyUK(text) {
  let out = text;
  for (const [re, rep] of PATTERNS) {
    out = out.replace(re, rep);
  }
  return out;
}

// 3) Process all verses in a single transaction
const sel = db.prepare(`SELECT rowid, text FROM verse`);
const upd = db.prepare(`UPDATE verse SET text = ? WHERE rowid = ?`);

const run = db.transaction(() => {
  let changed = 0;
  for (const row of sel.iterate()) {
    const next = applyUK(row.text);
    if (next !== row.text) {
      upd.run(next, row.rowid);
      changed++;
    }
  }
  console.log(`UK patch complete: ${changed} verses updated.`);
});

run();
console.log("Done.");
