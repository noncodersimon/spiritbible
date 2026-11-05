const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const Database = require('better-sqlite3');

function checkData(root = path.resolve(__dirname, '..')) {
  const db = new Database(path.join(root, 'data', 'bible.sqlite'), { readonly: true, fileMustExist: true });
  try {
    for (const file of ['bible.json', 'notes.json', 'study.json']) {
      const source = fs.readFileSync(path.join(root, 'data', file));
      const hash = createHash('sha256').update(source).digest('hex');
      const built = db.prepare('SELECT sha256 FROM source_manifest WHERE file = ?').get(file);
      if (built?.sha256 !== hash) throw new Error(`${file} changed since the database was built.`);
    }
  } finally { db.close(); }
}

if (require.main === module) {
  try {
    checkData();
    console.log('Database matches all JSON source files.');
  } catch (error) {
    console.error(`${error.message}\nRun npm run build before starting production (or restart npm run dev for development).`);
    process.exitCode = 1;
  }
}
module.exports = { checkData };
