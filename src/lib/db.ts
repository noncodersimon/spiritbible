import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function resolveDbPath() {
  const candidates = [
    path.join(process.cwd(), "data", "bible.sqlite"),
    path.join(process.cwd(), "public", "data", "bible.sqlite"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const dbPath = resolveDbPath();

export const db = (() => {
  try {
    return new Database(dbPath, {
      readonly: process.env.NODE_ENV === "production",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to open SQLite at ${dbPath}. (${msg})\n` +
      `Tips: ensure the file exists at 'data/bible.sqlite' and that next.config.ts includes "./data/**" for all server routes.`
    );
  }
})();
