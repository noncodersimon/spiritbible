import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "bible.sqlite");

export const db = (() => {
  try {
    return new Database(dbPath, {
      readonly: true,
      fileMustExist: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to open SQLite at ${dbPath}. (${msg})\n` +
      `Run 'npm run data:build' before starting the app. Restart the server after rebuilding data.`
    );
  }
})();
