// Direct database edits made the reader and JSON sources disagree.
console.error('Database-only spelling patches are retired. Review spelling changes in data/bible.json, then run npm run build (production) or restart npm run dev.');
process.exitCode = 1;
